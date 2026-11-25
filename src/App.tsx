import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  api,
  datasetChartHtmlUrl,
  downloadUrl,
  process3dModelUrl,
  processUrl,
  resolveApiUrl,
  type Dataset,
  type DatasetAnalysisResponse,
  type DatasetChartItem,
  type DatasetGroup,
  type DatasetResource,
  type DatasetResponse,
  type JsonRecord,
  type MapIndicator,
  type PreviewResponse,
  type SummaryResponse,
  type WorkbookResponse,
} from './api';
import { AnalyticsSection } from './AnalyticsSection';
import { IndicatorsSection } from './IndicatorsSection';
import { VisualizationsSection } from './VisualizationsSection';

type Section = 'catalog' | 'workbench' | 'indicators' | 'analytics' | 'visualizations';
type Notice = { kind: 'error' | 'success'; message: string };

const SECTION_BREADCRUMBS: Record<Section, string> = {
  catalog: 'CATÁLOGO DE DATOS',
  workbench: 'PROCESAMIENTO',
  indicators: 'INDICADORES SOCIOECONÓMICOS',
  analytics: 'CIENCIA DE DATOS',
  visualizations: 'VISUALIZACIONES Y 3D',
};

const emptyCatalog: DatasetResponse = { total: 0, inicio: 0, filas: 12, conjuntos: [] };
const fallbackMapIndicators: MapIndicator[] = [{
  id: 'tasa_victimas_viales_por_100k-2024',
  tema: 'Movilidad',
  indicador: 'Tasa de víctimas en accidentes de tránsito PNC por 100k hab.',
  periodo: 2024,
  ruta_parquet: 'indicadores/indicadores_consolidados_departamentales_2024.parquet',
  columna_codigo_parquet: 'depto_codigo',
  columna_valor: 'tasa_victimas_viales_por_100k',
  unidad: 'Víctimas / 100k hab',
  titulo_mapa: 'Tasa de víctimas en accidentes de tránsito PNC por 100k hab. por departamento · 2024',
}];

const fallbackGroups: DatasetGroup[] = [
  ['accidentes-de-transito', 'Accidentes de Transito'],
  ['agropecuario', 'Agropecuario'],
  ['canasta-basica-alimentaria-y-ampliada', 'Canasta básica alimentaria y ampliada'],
  ['comercio-exterior', 'Comercio Exterior'],
  ['condiciones-de-vida', 'Condiciones de vida'],
  ['educacion', 'Educación'],
  ['empleo', 'Empleo'],
  ['genero', 'Género'],
  ['gestion-municipal', 'Gestión Municipal'],
  ['ipc', 'IPC'],
  ['medio-ambiente', 'Medio Ambiente'],
  ['migracion', 'Migración'],
  ['poblacion', 'Población'],
  ['precios', 'Precios'],
  ['pueblos', 'Pueblos'],
  ['recurso-humano', 'Recurso Humano'],
  ['salud', 'Salud'],
  ['servicios-publicos-basicos', 'Servicios Públicos Básicos'],
  ['transporte-y-servicios', 'Transporte y Servicios'],
  ['violencia', 'Violencia'],
  ['vitales', 'Vitales'],
].map(([slug, title]) => ({ id: slug, nombre: slug, titulo: title }));

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(date);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [section, setSection] = useState<Section>('catalog');
  const [catalog, setCatalog] = useState<DatasetResponse>(emptyCatalog);
  const [groups, setGroups] = useState<DatasetGroup[]>(fallbackGroups);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [offset, setOffset] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [resources, setResources] = useState<DatasetResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [curatedVizUrl, setCuratedVizUrl] = useState('');
  const [datastoreMode, setDatastoreMode] = useState<'search' | 'sql'>('search');
  const [datastoreQuery, setDatastoreQuery] = useState('');
  const [datastoreSqlText, setDatastoreSqlText] = useState('');
  const [datastoreRows, setDatastoreRows] = useState<JsonRecord[] | null>(null);
  const [datastoreColumns, setDatastoreColumns] = useState<string[]>([]);
  const [datastoreTotal, setDatastoreTotal] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState('');
  const detailRef = useRef<HTMLElement | null>(null);
  const [processTab, setProcessTab] = useState<'summary' | 'maps' | 'exports'>('summary');
  const [mapIndicators, setMapIndicators] = useState(fallbackMapIndicators);
  const [mapIndicatorsLoading, setMapIndicatorsLoading] = useState(false);
  const [mapIndicatorsError, setMapIndicatorsError] = useState('');
  const [selectedMapIndicatorId, setSelectedMapIndicatorId] = useState(fallbackMapIndicators[0].id);
  const [map3dStyle, setMap3dStyle] = useState<'multicolor' | 'negro' | 'calor'>('multicolor');
  const [map3dBaseShape, setMap3dBaseShape] = useState<'silueta' | 'caja' | 'ninguna'>('silueta');
  const [vizFocusIndicator, setVizFocusIndicator] = useState<string | undefined>(undefined);
  const [parquet, setParquet] = useState('');
  const [groupColumn, setGroupColumn] = useState('depto_ocu');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [outputPath, setOutputPath] = useState('');
  const [excelPath, setExcelPath] = useState('');
  const [workbook, setWorkbook] = useState<WorkbookResponse | null>(null);
  const [sheetId, setSheetId] = useState(1);
  const [mapUrl, setMapUrl] = useState('');
  const selectedMapIndicator = mapIndicators.find((indicator) => indicator.id === selectedMapIndicatorId);
  const mapThemes = useMemo(() => [...new Set(mapIndicators.map((indicator) => indicator.tema))], [mapIndicators]);
  const selectedMapTheme = selectedMapIndicator?.tema || '';
  const mapIndicatorsForTheme = useMemo(
    () => mapIndicators.filter((indicator) => indicator.tema === selectedMapTheme),
    [mapIndicators, selectedMapTheme],
  );
  const mapIndicatorNames = useMemo(
    () => [...new Set(mapIndicatorsForTheme.map((indicator) => indicator.indicador))],
    [mapIndicatorsForTheme],
  );
  const selectedMapMetric = selectedMapIndicator?.indicador || mapIndicatorNames[0] || '';
  const mapPeriods = useMemo(
    () => [...new Set(mapIndicatorsForTheme
      .filter((indicator) => indicator.indicador === selectedMapMetric)
      .map((indicator) => String(indicator.periodo)))],
    [mapIndicatorsForTheme, selectedMapMetric],
  );

  const loadCatalog = useCallback(async (start: number, term: string, selectedGroup: string) => {
    setCatalogLoading(true);
    setCatalogError(false);
    setNotice(null);
    try {
      const params = new URLSearchParams({ filas: '12', inicio: String(start) });
      if (term.trim()) params.set('consulta', term.trim());
      if (selectedGroup) params.set('grupo', selectedGroup);
      setCatalog(await api.datasets(params));
      setOffset(start);
    } catch (error) {
      console.error('No se pudo cargar el catálogo:', error);
      setCatalog(emptyCatalog);
      setOffset(0);
      setCatalogError(true);
      setNotice({
        kind: 'error',
        message: 'No pudimos cargar los conjuntos. El servicio de datos no respondió; intenta de nuevo en unos momentos.',
      });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadMapIndicators = useCallback(async () => {
    setMapIndicatorsLoading(true);
    setMapIndicatorsError('');
    try {
      const response = await api.mapIndicators();
      if (!Array.isArray(response.indicadores)) {
        throw new Error('El servicio no devolvió una lista de indicadores.');
      }
      setMapIndicators(response.indicadores);
      setSelectedMapIndicatorId((current) => response.indicadores.some((indicator) => indicator.id === current)
        ? current
        : response.indicadores[0]?.id || '');
    } catch (error) {
      console.error('No se pudieron cargar los indicadores para mapas:', error);
      setMapIndicators(fallbackMapIndicators);
      setSelectedMapIndicatorId(fallbackMapIndicators[0].id);
      setMapIndicatorsError('No se pudo cargar el catálogo completo de mapas desde el backend; mostrando indicador de respaldo.');
    } finally {
      setMapIndicatorsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog(0, '', '');
  }, [loadCatalog]);

  useEffect(() => {
    void loadMapIndicators();
  }, [loadMapIndicators]);

  useEffect(() => {
    let active = true;
    api.groups()
      .then((response) => {
        if (active && Array.isArray(response.grupos) && response.grupos.length > 0) {
          setGroups(response.grupos);
        }
      })
      .catch(() => {
        // Conserva los grupos temáticos base si el servicio CKAN no responde.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapUrl.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(mapUrl);
  }, [mapUrl]);

  const analyzeDatasetResource = useCallback(async (
    slug: string,
    opts: {
      recursoId?: string;
      hojaId?: number;
      agruparPor?: string;
      columnaValor?: string;
      forzarDescarga?: boolean;
      regenerar?: boolean;
    } = {},
  ) => {
    setBusy(`analyze:${opts.recursoId || 'auto'}`);
    setNotice(null);
    setCuratedVizUrl('');
    try {
      const result = await api.analyzeDataset(slug, opts);
      setAnalysis(result);
      setSelectedResourceId(result.recurso_id);
      // Refresca el estado local del recurso en la lista tras verificar o descargar.
      const refreshed = await api.resources(slug).catch(() => null);
      if (refreshed?.recursos) {
        setResources(refreshed.recursos);
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: `No se pudo procesar el recurso para graficar. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
      setBusy('');
    }
  }, []);

  const notify = useCallback((kind: 'error' | 'success', message: string) => {
    setNotice({ kind, message });
  }, []);

  const openIndicatorInVisualizations = useCallback((indicatorCode: string) => {
    setVizFocusIndicator(indicatorCode);
    setSection('visualizations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const selectDataset = async (dataset: Dataset) => {
    setSelected(dataset);
    setResources(dataset.recursos || []);
    setSelectedResourceId('');
    setPreview(null);
    setAnalysis(null);
    setCuratedVizUrl('');
    setDatastoreRows(null);
    setDatastoreColumns([]);
    setDatastoreTotal(null);
    setDatastoreQuery('');
    setNotice(null);
    setBusy('resources');

    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    try {
      const response = await api.resources(dataset.id);
      const fetched = response.recursos || [];
      setResources(fetched);
      if (fetched.length > 0) {
        const tabularFormats = new Set(['parquet', 'xlsx', 'csv', 'xls', 'zip']);
        const primary = fetched.find((item) => tabularFormats.has((item.formato || '').toLowerCase())) || fetched[0];
        setDatastoreSqlText(`SELECT * FROM "${primary.id}" LIMIT 10`);
        await analyzeDatasetResource(dataset.id, { recursoId: primary.id });
      }
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudieron cargar los recursos. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const submitDatastoreQuery = async (event: FormEvent) => {
    event.preventDefault();
    const activeResourceId = selectedResourceId || resources[0]?.id || '';
    if (!activeResourceId && datastoreMode === 'search') {
      setNotice({ kind: 'error', message: 'Selecciona primero un recurso del conjunto para consultar su Datastore.' });
      return;
    }
    setBusy('datastore');
    setNotice(null);
    try {
      if (datastoreMode === 'search') {
        const res = await api.datastoreSearch({
          recurso_id: activeResourceId,
          limite: 15,
          desplazamiento: 0,
          ...(datastoreQuery.trim() ? { consulta: datastoreQuery.trim() } : {}),
        });
        const cols = (res.campos || []).map((c) => c.id).filter(Boolean);
        setDatastoreColumns(cols.length > 0 ? cols : Object.keys(res.registros[0] || {}));
        setDatastoreRows(res.registros || []);
        setDatastoreTotal(res.total);
      } else {
        const sql = datastoreSqlText.trim() || `SELECT * FROM "${activeResourceId}" LIMIT 10`;
        const res = await api.datastoreSql(sql);
        const cols = (res.campos || []).map((c) => c.id).filter(Boolean);
        setDatastoreColumns(cols.length > 0 ? cols : Object.keys(res.registros[0] || {}));
        setDatastoreRows(res.registros || []);
        setDatastoreTotal(res.registros?.length ?? 0);
      }
    } catch (error) {
      setDatastoreRows(null);
      setNotice({
        kind: 'error',
        message: `El recurso no está indexado en Datastore CKAN o falló la consulta. ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
      setBusy('');
    }
  };

  const loadPreview = async (resourceId?: string) => {
    if (!selected) return;
    setBusy(`preview:${resourceId || ''}`);
    setNotice(null);
    try {
      setPreview(await api.preview(selected.id, resourceId));
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo generar la vista previa. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const verifyResource = async (resource: DatasetResource) => {
    if (!selected) return;
    setBusy(`verify:${resource.id}`);
    setNotice(null);
    try {
      const result = await api.checkResource(selected.id, resource.id);
      setNotice({
        kind: 'success',
        message: result.cambio_remoto
          ? `El archivo cambió en el origen${result.ultima_modificacion_remota ? ` · ${formatDate(result.ultima_modificacion_remota)}` : ''}.`
          : `El archivo está actualizado${result.ultima_modificacion_remota ? ` · ${formatDate(result.ultima_modificacion_remota)}` : ''}.`,
      });
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo verificar el recurso. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const inspectWorkbook = async () => {
    if (!excelPath.trim()) {
      setNotice({ kind: 'error', message: 'Selecciona un archivo Excel para inspeccionar sus hojas.' });
      return;
    }
    setBusy('inspect');
    setNotice(null);
    try {
      const result = await api.inspectWorkbook(excelPath.trim());
      setWorkbook(result);
      setSheetId(result.hoja_actual || 1);
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo inspeccionar el Excel. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const submitSummary = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('summary');
    setNotice(null);
    try {
      const result = await api.summary({
        ruta_parquet: parquet.trim(),
        agrupar_por: groupColumn.trim(),
        limite: 20,
        ...(filterColumn.trim() && filterValue.trim()
          ? { columna_filtro: filterColumn.trim(), valor_filtro: filterValue.trim() }
          : {}),
      });
      setSummary(result);
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo calcular el resumen. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const submitConversion = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('convert');
    setNotice(null);
    try {
      const result = await api.convert({
        ruta_excel: excelPath.trim(),
        hoja_id: sheetId,
        ruta_salida_parquet: outputPath.trim(),
        compresion: 'zstd',
      });
      if (typeof result.nombre_archivo !== 'string') {
        throw new Error('El servicio no indicó el nombre del archivo convertido.');
      }
      const output = result.nombre_archivo;
      setParquet(output);
      setNotice({ kind: 'success', message: `Conversión completada: ${output}` });
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo convertir el archivo. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const createMap = async (endpoint: string, extra: Record<string, string> = {}) => {
    if (!selectedMapIndicator) {
      setNotice({ kind: 'error', message: 'Selecciona un tema, indicador y periodo disponibles para generar el mapa.' });
      return;
    }
    const params = new URLSearchParams({
      ruta_parquet: selectedMapIndicator.ruta_parquet,
      ruta_geo: 'geo/departamentos_gt.geojson',
      columna_codigo_geo: 'COD_COLUMNA',
      columna_codigo_parquet: selectedMapIndicator.columna_codigo_parquet || 'cod',
      columna_valor: selectedMapIndicator.columna_valor || 'valor',
      columna_nombre: 'nombre',
      titulo_estadistica: selectedMapIndicator.titulo_mapa,
      ...extra,
    });
    setBusy('map');
    setMapUrl('');
    setNotice(null);
    try {
      const response = await fetch(processUrl(endpoint, params));
      const html = await response.text();
      if (!response.ok) {
        let message = html;
        try {
          const error = JSON.parse(html) as { detail?: string; message?: string };
          message = error.detail || error.message || html;
        } catch {
          // Keep the response body when the API returns a non-JSON error.
        }
        throw new Error(message || `Error ${response.status}: ${response.statusText}`);
      }
      if (!response.headers.get('content-type')?.includes('text/html') || !html.trim()) {
        throw new Error('La API no devolvió una página HTML de mapa.');
      }
      setMapUrl(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
      setNotice({ kind: 'success', message: 'Mapa generado correctamente.' });
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo generar el mapa. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setBusy('');
    }
  };

  const createExport = (endpoint: string, extra: Record<string, string>) => {
    if (!selectedMapIndicator) {
      setNotice({ kind: 'error', message: 'Selecciona un tema, indicador y periodo disponibles para la exportación.' });
      return;
    }
    const params = new URLSearchParams({
      ruta_parquet: selectedMapIndicator.ruta_parquet,
      ruta_geo: 'geo/departamentos_gt.geojson',
      columna_codigo_geo: 'COD_COLUMNA',
      columna_codigo_parquet: selectedMapIndicator.columna_codigo_parquet || 'cod',
      columna_valor: selectedMapIndicator.columna_valor || 'valor',
      columna_nombre: 'nombre',
      ...extra,
    });
    window.open(processUrl(endpoint, params), '_blank', 'noopener,noreferrer');
  };

  const catalogPages = Math.ceil(catalog.total / (catalog.filas || 12));
  const chartMax = useMemo(() => Math.max(1, ...(summary?.datos || []).map((row) => Number(row.conteo) || 0)), [summary]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="/ine.png" alt="Logo del INE" /></div>
          <div className="brand-name"><strong>Instituto Nacional<br />de Estadística</strong><span>GUATEMALA</span></div>
        </div>
        <div className="workspace-label">PLATAFORMA ESTADÍSTICA</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <button className={section === 'catalog' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('catalog')}>
            <span className="nav-icon">⌕</span><span>Explorar datos</span>
          </button>
          <button className={section === 'workbench' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('workbench')}>
            <span className="nav-icon">▥</span><span>Procesamiento</span>
          </button>
          <button className={section === 'indicators' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('indicators')}>
            <span className="nav-icon">◈</span><span>Indicadores socioeconómicos</span>
          </button>
          <button className={section === 'analytics' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('analytics')}>
            <span className="nav-icon">◎</span><span>Ciencia de datos</span>
          </button>
          <button className={section === 'visualizations' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('visualizations')}>
            <span className="nav-icon">◩</span><span>Visualizaciones</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon">✳</span><div><strong>Datos para decidir</strong><p>Información estadística oficial de Guatemala.</p></div></div>
          <div className="sidebar-footer"><span>ESTADÍSTICA OFICIAL · GUATEMALA</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span className="breadcrumb-brand">INE</span><span>/</span> {SECTION_BREADCRUMBS[section]}</div>
        </header>

        <div className="page-wrap">
          {notice && <div className={`notice ${notice.kind}`} role="status"><span>{notice.kind === 'error' ? '!' : '✓'}</span><p>{notice.message}</p><button aria-label="Cerrar notificación" onClick={() => setNotice(null)}>×</button></div>}

          {section === 'catalog' && (
            <>
              <section className="page-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" /> DATOS ABIERTOS · INE GUATEMALA</div><h1>Explora los datos<br /><em>que mueven al país.</em></h1>
                  <p className="intro">Encuentra conjuntos estadísticos oficiales y lleva la información a tu análisis.</p></div>
                <div className="heading-stamp"><img src="/ine.png" alt="INE Guatemala" /><span>INSTITUTO NACIONAL<br />DE ESTADÍSTICA</span></div>
              </section>

              <section className="catalog-toolbar">
                <form className="search-form" onSubmit={(event) => { event.preventDefault(); setSelected(null); void loadCatalog(0, search, group); }}>
                  <span className="search-icon">⌕</span>
                  <input aria-label="Buscar conjuntos de datos" placeholder="Busca un tema, palabra clave o conjunto..." value={search} onChange={(event) => setSearch(event.target.value)} />
                  <button className="button button-dark" type="submit" disabled={catalogLoading}>{catalogLoading ? 'Buscando…' : 'Buscar'}</button>
                </form>
                <label className="select-wrap"><span>ÁREA TEMÁTICA</span><select value={group} onChange={(event) => { setGroup(event.target.value); setSelected(null); void loadCatalog(0, search, event.target.value); }}><option value="">Todas las áreas</option>{groups.map((item) => <option key={item.id} value={item.nombre}>{item.titulo || item.nombre.replace(/-/g, ' ')}</option>)}</select><b>⌄</b></label>
              </section>

              <section className="catalog-section">
                <div className="section-title-row"><div><div className="section-kicker">REPOSITORIO INE</div><h2>Conjuntos de datos <span className="result-count">{catalog.total.toLocaleString('es-GT')}</span></h2></div>                <div className="updated-note"><span className="live-dot" /> Catálogo INE</div></div>
                {catalogLoading ? <div className="loading-state"><span className="spinner" />Cargando conjuntos de datos…</div> : catalogError ? <div className="empty-state"><span>!</span><strong>No pudimos cargar los conjuntos</strong><p>El servicio de datos no respondió. Comprueba tu conexión e inténtalo de nuevo.</p><button className="button button-outline" onClick={() => void loadCatalog(0, search, group)}>Reintentar</button></div> : catalog.conjuntos.length ? (
                  <>
                    <div className="dataset-grid">{catalog.conjuntos.map((dataset, index) => <article className={`dataset-card ${selected?.id === dataset.id ? 'selected' : ''}`} key={dataset.id} style={{ animationDelay: `${index * 35}ms` }}>
                      <div className="card-topline"><span className="dataset-type"><i /> DATASET</span><span className="dataset-date">{formatDate(dataset.modificado)}</span></div>
                      <button className="dataset-title" onClick={() => void selectDataset(dataset)}>{dataset.nombre}</button>
                      <p className="dataset-description">{dataset.descripcion || 'Conjunto de datos estadísticos publicado por el Instituto Nacional de Estadística.'}</p>
                      <div className="card-footer"><span>{dataset.recursos_total ?? dataset.recursos?.length ?? 0} recursos</span><button aria-label={`Ver recursos de ${dataset.nombre}`} onClick={() => void selectDataset(dataset)}>Ver conjunto <span>↗</span></button></div>
                    </article>)}</div>
                    <div className="pagination"><span>Mostrando {catalog.conjuntos.length ? offset + 1 : 0}–{Math.min(offset + catalog.filas, catalog.total)} de {catalog.total.toLocaleString('es-GT')}</span><div><button disabled={offset <= 0 || catalogLoading} onClick={() => { setSelected(null); void loadCatalog(Math.max(0, offset - catalog.filas), search, group); }}>← Anterior</button><span className="page-number">{catalogPages ? Math.floor(offset / catalog.filas) + 1 : 0}<i>/</i>{catalogPages}</span><button disabled={offset + catalog.filas >= catalog.total || catalogLoading} onClick={() => { setSelected(null); void loadCatalog(offset + catalog.filas, search, group); }}>Siguiente →</button></div></div>
                  </>
                ) : <div className="empty-state"><span>⌕</span><strong>No encontramos conjuntos</strong><p>Prueba con otros términos o cambia el área temática.</p><button className="button button-outline" onClick={() => { setSearch(''); setGroup(''); void loadCatalog(0, '', ''); }}>Limpiar filtros</button></div>}
              </section>

              {selected && <section className="detail-panel" ref={detailRef}>
                <div className="detail-heading"><div><div className="section-kicker">DETALLE DEL CONJUNTO</div><h2>{selected.nombre}</h2><p>{selected.descripcion || 'Verifica el estado local de cada recurso, procesa a Parquet y explora sus gráficas.'}</p></div><button className="icon-button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}>×</button></div>
                <div className="resource-list"><div className="resource-list-heading"><span>RECURSO</span><span>FORMATO Y ESTADO</span><span>MODIFICADO</span><span>ACCIONES</span></div>
                  {busy === 'resources' && resources.length === 0 ? <div className="inline-loading"><span className="spinner" />Verificando recursos del conjunto…</div> : resources.length ? resources.map((resource) => {
                    const isActive = selectedResourceId === resource.id;
                    const sizeLabel = formatBytes(resource.tamano_bytes);
                    return (
                      <div className={`resource-row ${isActive ? 'active-resource' : ''}`} key={resource.id}>
                        <div className="resource-name"><span className="file-icon">▤</span><strong>{resource.nombre}</strong></div>
                        <div className="resource-badges">
                          <span className="format-badge">{resource.formato || 'Archivo'}</span>
                          <span className={`status-chip ${resource.descargado_local ? 'local' : 'remote'}`}>
                            {resource.descargado_local ? `✓ En disco${sizeLabel ? ` · ${sizeLabel}` : ''}` : '☁ Remoto'}
                          </span>
                          {resource.parquet_disponible ? <span className="status-chip processed">✦ Procesado</span> : null}
                        </div>
                        <span className="resource-date">{formatDate(resource.modificado || resource.last_modified)}</span>
                        <div className="resource-actions">
                          <button
                            className={isActive ? 'action-primary active' : 'action-primary'}
                            onClick={() => void analyzeDatasetResource(selected.id, { recursoId: resource.id })}
                            disabled={busy.startsWith('analyze')}
                          >
                            {busy === `analyze:${resource.id}` ? 'Procesando…' : 'Ver gráficas'}
                          </button>
                          <button onClick={() => void loadPreview(resource.id)} disabled={busy.startsWith('preview')}>{busy === `preview:${resource.id}` ? 'Cargando…' : 'Vista previa'}</button>
                          <button onClick={() => void verifyResource(resource)} disabled={busy.startsWith('verify')}>{busy === `verify:${resource.id}` ? 'Verificando…' : 'Verificar'}</button>
                          <a href={downloadUrl(selected.id, resource.id)} className="download-link" title={resource.descargado_local ? 'Descargar desde caché local' : 'Descargar recurso'}>↓</a>
                        </div>
                      </div>
                    );
                  }) : <div className="no-resources">Este conjunto no tiene recursos disponibles.</div>}
                </div>

                {busy.startsWith('analyze') && (
                  <div className="inline-loading analysis-loading">
                    <span className="spinner" />Verificando descarga en disco, procesando Parquet y generando gráficas…
                  </div>
                )}

                {analysis && (
                  <DatasetAnalysisPanel
                    analysis={analysis}
                    busy={busy}
                    curatedVizUrl={curatedVizUrl}
                    onSelectCuratedViz={(endpoint) => setCuratedVizUrl(endpoint)}
                    onUseInWorkbench={() => {
                      setParquet(analysis.ruta_parquet);
                      if (analysis.agrupado_por) setGroupColumn(analysis.agrupado_por);
                      setSection('workbench');
                      setProcessTab('summary');
                    }}
                    onReanalyze={(overrides) => void analyzeDatasetResource(selected.id, {
                      recursoId: analysis.recurso_id,
                      hojaId: overrides.hojaId ?? analysis.hoja_actual ?? 1,
                      agruparPor: overrides.agruparPor ?? analysis.agrupado_por ?? undefined,
                      columnaValor: overrides.columnaValor !== undefined ? overrides.columnaValor : (analysis.metrica_activa ?? undefined),
                      regenerar: overrides.regenerar,
                    })}
                  />
                )}

                {preview && <PreviewTable preview={preview} />}

                {resources.length > 0 && (
                  <div className="datastore-box">
                    <div className="datastore-box-head">
                      <div>
                        <div className="section-kicker">API CKAN DATASTORE</div>
                        <strong>Consulta tabular en línea sin descarga completa</strong>
                        <span>Recurso activo: <code>{selectedResourceId || resources[0]?.id}</code></span>
                      </div>
                      <div className="datastore-mode-switch">
                        <button
                          type="button"
                          className={datastoreMode === 'search' ? 'button button-dark' : 'button button-outline'}
                          onClick={() => setDatastoreMode('search')}
                        >
                          Filtro rápido
                        </button>
                        <button
                          type="button"
                          className={datastoreMode === 'sql' ? 'button button-dark' : 'button button-outline'}
                          onClick={() => {
                            const id = selectedResourceId || resources[0]?.id || '';
                            if (!datastoreSqlText.includes(id)) {
                              setDatastoreSqlText(`SELECT * FROM "${id}" LIMIT 10`);
                            }
                            setDatastoreMode('sql');
                          }}
                        >
                          Consulta SQL
                        </button>
                      </div>
                    </div>

                    <form className="datastore-form" onSubmit={(e) => void submitDatastoreQuery(e)}>
                      <div>
                        <strong>{datastoreMode === 'search' ? 'Buscar texto en registros' : 'Sentencia SQL sobre recurso'}</strong>
                        <span>{datastoreMode === 'search' ? 'Ejecuta datastore/consulta en CKAN.' : 'Ejecuta datastore/consulta-sql en CKAN.'}</span>
                      </div>
                      {datastoreMode === 'search' ? (
                        <input
                          value={datastoreQuery}
                          onChange={(e) => setDatastoreQuery(e.target.value)}
                          placeholder="Término opcional (dejar vacío para listar filas)..."
                          aria-label="Texto de búsqueda en Datastore"
                        />
                      ) : (
                        <input
                          value={datastoreSqlText}
                          onChange={(e) => setDatastoreSqlText(e.target.value)}
                          placeholder='SELECT * FROM "<resource_id>" LIMIT 10'
                          aria-label="Sentencia SQL para Datastore"
                        />
                      )}
                      <button type="submit" className="button button-outline" disabled={busy === 'datastore'}>
                        {busy === 'datastore' ? 'Consultando…' : 'Consultar'}
                      </button>
                    </form>

                    {datastoreRows && (
                      <div className="preview-wrap">
                        <div className="preview-title">
                          <div>
                            <strong>Resultados Datastore CKAN</strong>
                            <span>{datastoreRows.length} filas mostradas{datastoreTotal !== null ? ` de ${datastoreTotal.toLocaleString('es-GT')} totales` : ''}</span>
                          </div>
                          <span className="format-badge">DATASTORE</span>
                        </div>
                        {datastoreRows.length > 0 ? (
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>{datastoreColumns.map((col) => <th key={col}>{col}</th>)}</tr>
                              </thead>
                              <tbody>
                                {datastoreRows.map((row, idx) => (
                                  <tr key={idx}>
                                    {datastoreColumns.map((col) => <td key={col}>{displayValue(row[col])}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="no-resources">No se encontraron registros para esta consulta en Datastore.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>}
            </>
          )}
          {section === 'workbench' && (
            <>
              <section className="page-heading workbench-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> HERRAMIENTAS DE ANÁLISIS</div><h1>De los datos a<br /><em>nuevas perspectivas.</em></h1><p className="intro">Procesa archivos, crea resúmenes y genera visualizaciones con los datos del INE.</p></div><div className="process-orbit"><div className="orbit-ring"><span>DATOS</span><b>→</b><span>HALLAZGOS</span></div><i>✳</i></div></section>
              <div className="workbench-tabs" role="tablist" aria-label="Herramientas de procesamiento">
                <button id="process-tab-summary" className={processTab === 'summary' ? 'active' : ''} type="button" role="tab" aria-selected={processTab === 'summary'} aria-controls="process-content" onClick={() => { setProcessTab('summary'); setMapUrl(''); }}>Resumen</button>
                <button id="process-tab-maps" className={processTab === 'maps' ? 'active' : ''} type="button" role="tab" aria-selected={processTab === 'maps'} aria-controls="process-content" onClick={() => { setProcessTab('maps'); setMapUrl(''); }}>Mapas</button>
                <button id="process-tab-exports" className={processTab === 'exports' ? 'active' : ''} type="button" role="tab" aria-selected={processTab === 'exports'} aria-controls="process-content" onClick={() => { setProcessTab('exports'); setMapUrl(''); }}>Exportaciones</button>
              </div>
              <div id="process-content" className="processing-content" role="tabpanel" aria-labelledby={`process-tab-${processTab}`} tabIndex={0}>
                {processTab === 'summary' && <>
                  <div className="file-path-card"><div className="file-path-icon">▧</div><div><strong>Parquet para resumen estadístico</strong><span>Usa aquí el archivo detallado que quieres agrupar.</span></div><input value={parquet} onChange={(event) => setParquet(event.target.value)} placeholder="Ej. movilidad/accidentes_fallecidos_lesionados_2024.parquet" aria-label="Ruta del archivo Parquet" /></div>
                  <div className="workbench-grid">
                    <section className="tool-card"><div className="tool-card-head"><span className="tool-number">01</span><div><div className="section-kicker">ANÁLISIS DE DATOS</div><h2>Resumen estadístico</h2></div></div><p>Agrupa y cuenta registros del conjunto seleccionado.</p>
                      <form className="tool-form" onSubmit={(event) => void submitSummary(event)}><label>AGRUPAR POR<input required value={groupColumn} onChange={(event) => setGroupColumn(event.target.value)} placeholder="depto_ocu" /></label><div className="form-pair"><label>COLUMNA DE FILTRO<input value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)} placeholder="año_ocu" /></label><label>VALOR<input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="2024" /></label></div><button className="button button-dark" disabled={busy === 'summary' || !parquet.trim()}>{busy === 'summary' ? 'Calculando…' : 'Generar resumen'} <span>→</span></button></form>
                    </section>
                    <section className="tool-card conversion-card"><div className="tool-card-head"><span className="tool-number coral">02</span><div><div className="section-kicker">PREPARACIÓN</div><h2>Convertir a Parquet</h2></div></div><p>Convierte una hoja de cálculo disponible para analizarla con mayor rapidez.</p>
                      <form className="tool-form" onSubmit={(event) => void submitConversion(event)}><label>RUTA DEL ARCHIVO EXCEL<input required value={excelPath} onChange={(event) => { setExcelPath(event.target.value); setWorkbook(null); }} placeholder="carpeta/datos.xlsx" /></label><button type="button" className="button button-outline" disabled={!excelPath.trim() || busy === 'inspect'} onClick={() => void inspectWorkbook()}>{busy === 'inspect' ? 'Inspeccionando…' : 'Inspeccionar hojas'}</button>{workbook?.hojas?.length ? <label>HOJA DEL ARCHIVO<select value={sheetId} onChange={(event) => setSheetId(Number(event.target.value))}>{workbook.hojas.map((sheet, index) => <option key={`${sheet}-${index}`} value={index + 1}>{index + 1}. {sheet}</option>)}</select></label> : null}<label>NOMBRE DE SALIDA<input required value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="resumen_datos.parquet" /></label><button className="button button-outline" disabled={busy === 'convert'}>{busy === 'convert' ? 'Convirtiendo…' : 'Convertir archivo'} <span>↗</span></button></form>
                    </section>
                  </div>
                  {summary && <SummaryChart summary={summary} max={chartMax} />}
                </>}
                {processTab === 'maps' && <section className="tool-card maps-card">
                  <div className="tool-card-head"><span className="tool-number">03</span><div><div className="section-kicker">VISUALIZACIÓN GEOGRÁFICA</div><h2>Mapas de Guatemala</h2></div></div>
                  <p>Genera mapas interactivos con datos estadísticos por departamento.</p>
                  <div className="map-source map-filters">
                    <div className="map-filters-grid">
                      <label><span>TEMA</span><select aria-label="Tema del mapa" value={selectedMapTheme} onChange={(event) => { const next = mapIndicators.find((indicator) => indicator.tema === event.target.value); setSelectedMapIndicatorId(next?.id || ''); setMapUrl(''); }} disabled={mapIndicatorsLoading || mapThemes.length === 0}><option value="">Selecciona un tema</option>{mapThemes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}</select></label>
                      <label><span>INDICADOR</span><select aria-label="Indicador del mapa" value={selectedMapMetric} onChange={(event) => { const next = mapIndicatorsForTheme.find((indicator) => indicator.indicador === event.target.value); setSelectedMapIndicatorId(next?.id || ''); setMapUrl(''); }} disabled={mapIndicatorsLoading || mapIndicatorNames.length === 0}><option value="">Selecciona un indicador</option>{mapIndicatorNames.map((indicator) => <option key={indicator} value={indicator}>{indicator}</option>)}</select></label>
                      <label><span>AÑO</span><select aria-label="Año del mapa" value={selectedMapIndicator ? String(selectedMapIndicator.periodo) : ''} onChange={(event) => { const next = mapIndicatorsForTheme.find((indicator) => indicator.indicador === selectedMapMetric && String(indicator.periodo) === event.target.value); setSelectedMapIndicatorId(next?.id || ''); setMapUrl(''); }} disabled={mapIndicatorsLoading || mapPeriods.length === 0}><option value="">Selecciona un año</option>{mapPeriods.map((period) => <option key={period} value={period}>{period}</option>)}</select></label>
                    </div>
                    <small>{selectedMapIndicator ? `${selectedMapIndicator.titulo_mapa}${selectedMapIndicator.unidad ? ` · Unidad: ${selectedMapIndicator.unidad}` : ''}` : 'El mapa mostrará los valores por departamento para el año elegido.'}</small>
                  </div>
                  {mapIndicatorsError && <div className="map-indicator-warning" role="status"><span>{mapIndicatorsError}</span><button type="button" onClick={() => void loadMapIndicators()} disabled={mapIndicatorsLoading}>{mapIndicatorsLoading ? 'Cargando…' : 'Reintentar'}</button></div>}
                  <div className="map-options">
                    <button className="map-option" disabled={busy === 'map' || !selectedMapIndicator} onClick={() => void createMap('mapa-html', { esquema_color: 'YlOrRd', capa_base: 'Esri.WorldGrayCanvas' })}><span className="map-preview warm">▧</span><strong>Mapa coroplético</strong><small>{busy === 'map' ? 'Generando…' : 'Folium · mapa interactivo'}</small><span className="option-arrow">↗</span></button>
                    <button className="map-option" disabled={busy === 'map' || !selectedMapIndicator} onClick={() => void createMap('mapa-plotly', { formato: 'html' })}><span className="map-preview cool">▧</span><strong>Mapa de análisis</strong><small>{busy === 'map' ? 'Generando…' : 'Plotly · panel interactivo'}</small><span className="option-arrow">↗</span></button>
                    <button className="map-option" disabled={busy === 'map' || !selectedMapIndicator} onClick={() => void createMap('mapa-3d-relieve', { estilo_color: map3dStyle, altura_max_m: '60000' })}><span className="map-preview terrain">▧</span><strong>Relieve 3D</strong><small>{busy === 'map' ? 'Generando…' : 'Deck.gl · visualización WebGL'}</small><span className="option-arrow">↗</span></button>
                  </div>

                  {selectedMapIndicator && (
                    <div className="model-3d-download-bar">
                      <div className="model-3d-download-info">
                        <strong>Archivo 3D imprimible del mapa ({selectedMapIndicator.indicador})</strong>
                        <span>Descarga la maqueta tridimensional extruida con el relieve del indicador actual en STL, OBJ o GLB.</span>
                      </div>
                      <div className="model-3d-download-controls">
                        <select aria-label="Estilo de color 3D" value={map3dStyle} onChange={(e) => setMap3dStyle(e.target.value as 'multicolor' | 'negro' | 'calor')}>
                          <option value="multicolor">Color por departamento</option>
                          <option value="calor">Gradiente de calor</option>
                          <option value="negro">Relieve negro</option>
                        </select>
                        <select aria-label="Forma base del modelo 3D" value={map3dBaseShape} onChange={(e) => setMap3dBaseShape(e.target.value as 'silueta' | 'caja' | 'ninguna')}>
                          <option value="silueta">Base silueta</option>
                          <option value="caja">Base rectangular</option>
                          <option value="ninguna">Sin base</option>
                        </select>
                        <a
                          className="button button-dark model-dl-btn"
                          href={process3dModelUrl(selectedMapIndicator, 'stl', { estiloColor: map3dStyle, formaBase: map3dBaseShape })}
                          download
                        >
                          ↓ Descargar .STL
                        </a>
                        <a
                          className="button button-outline model-dl-btn"
                          href={process3dModelUrl(selectedMapIndicator, 'obj', { estiloColor: map3dStyle, formaBase: map3dBaseShape })}
                          download
                        >
                          ↓ Descargar .OBJ
                        </a>
                        <a
                          className="button button-outline model-dl-btn"
                          href={process3dModelUrl(selectedMapIndicator, 'glb', { estiloColor: map3dStyle, formaBase: map3dBaseShape })}
                          download
                        >
                          ↓ .GLB
                        </a>
                        <a
                          className="button button-outline model-dl-btn"
                          href={process3dModelUrl(selectedMapIndicator, 'zip', { estiloColor: map3dStyle, formaBase: map3dBaseShape })}
                          download
                        >
                          ↓ Pack STLs (.ZIP)
                        </a>
                      </div>
                    </div>
                  )}

                  {busy === 'map' && <div className="map-loading"><span className="spinner" />Generando mapa con el backend…</div>}
                  {mapUrl && (
                    <div className="map-frame-wrap">
                      <div className="frame-toolbar">
                        <span><i className="live-dot" /> VISTA GENERADA</span>
                        <div className="toolbar-links-group">
                          {selectedMapIndicator && (
                            <>
                              <a href={process3dModelUrl(selectedMapIndicator, 'stl', { estiloColor: map3dStyle, formaBase: map3dBaseShape })} download>Descargar .STL ↓</a>
                              <a href={process3dModelUrl(selectedMapIndicator, 'obj', { estiloColor: map3dStyle, formaBase: map3dBaseShape })} download>Descargar .OBJ ↓</a>
                            </>
                          )}
                          <a href={mapUrl} target="_blank" rel="noreferrer">Abrir en una pestaña ↗</a>
                        </div>
                      </div>
                      <iframe title="Mapa de datos de Guatemala" src={mapUrl} />
                    </div>
                  )}
                </section>}
                {processTab === 'exports' && <section className="tool-card maps-card">
                  <div className="tool-card-head"><span className="tool-number coral">04</span><div><div className="section-kicker">EXPORTACIÓN AVANZADA</div><h2>Modelos y renders</h2></div></div>
                  <p>Descarga modelos 3D listos para impresión o genera un render de presentación.</p>
                  <div className="map-source export-dataset"><span>DATOS SELECCIONADOS EN MAPAS</span><strong>{selectedMapIndicator?.titulo_mapa || 'Selecciona primero un tema en la pestaña Mapas.'}</strong><small>Los modelos y renders usarán los datos y el año seleccionados.</small></div>
                  <div className="export-grid">
                    <div className="export-option"><span className="export-symbol">◈</span><div><strong>Modelo 3D imprimible</strong><small>GLB para visor · STL, OBJ o ZIP por departamento</small></div><div className="export-actions"><button disabled={!selectedMapIndicator} onClick={() => createExport('modelo-3d-impresion', { formato: 'glb', estilo_color: map3dStyle, ancho_mm: '150', altura_max_mm: '60', forma_base: map3dBaseShape })}>GLB</button><button disabled={!selectedMapIndicator} onClick={() => createExport('modelo-3d-impresion', { formato: 'stl', estilo_color: map3dStyle, ancho_mm: '150', altura_max_mm: '60', forma_base: map3dBaseShape })}>STL</button><button disabled={!selectedMapIndicator} onClick={() => createExport('modelo-3d-impresion', { formato: 'obj', estilo_color: map3dStyle, ancho_mm: '150', altura_max_mm: '60', forma_base: map3dBaseShape })}>OBJ</button><button disabled={!selectedMapIndicator} onClick={() => createExport('modelo-3d-impresion', { formato: 'zip', estilo_color: map3dStyle, ancho_mm: '150', altura_max_mm: '60', forma_base: map3dBaseShape })}>ZIP</button></div></div>
                    <div className="export-option"><span className="export-symbol coral">▧</span><div><strong>Render de presentación</strong><small>Imagen PNG generada con Blender</small></div><button className="button button-outline" disabled={!selectedMapIndicator} onClick={() => createExport('render-3d-blender', { ancho_px: '1280', alto_px: '720', estilo_color: 'multicolor' })}>Generar PNG ↗</button></div>
                  </div>
                </section>}
              </div>
            </>
          )}
          {section === 'indicators' && <IndicatorsSection onNotify={notify} onOpenVizForIndicator={openIndicatorInVisualizations} />}
          {section === 'analytics' && <AnalyticsSection onNotify={notify} onOpenVizForIndicator={openIndicatorInVisualizations} />}
          {section === 'visualizations' && <VisualizationsSection initialIndicator={vizFocusIndicator} onNotify={notify} />}
          <footer className="page-footer"><span>Instituto Nacional de Estadística · Guatemala</span><span>Información estadística oficial</span><a href="https://www.ine.gob.gt/" target="_blank" rel="noreferrer">ine.gob.gt ↗</a></footer>
        </div>
      </main>
    </div>
  );
}

const CHART_PALETTE = ['#004080', '#0068c8', '#267fdb', '#4ca1ff', '#1f6250', '#ca7057', '#6c7a89', '#88a8c7'];

function DatasetAnalysisPanel({
  analysis,
  busy,
  curatedVizUrl,
  onSelectCuratedViz,
  onUseInWorkbench,
  onReanalyze,
}: {
  analysis: DatasetAnalysisResponse;
  busy: string;
  curatedVizUrl: string;
  onSelectCuratedViz: (endpoint: string) => void;
  onUseInWorkbench: () => void;
  onReanalyze: (overrides: { hojaId?: number; agruparPor?: string; columnaValor?: string; regenerar?: boolean }) => void;
}) {
  return (
    <div className="analysis-panel">
      <div className="analysis-status-bar">
        <div className="analysis-status-badges">
          <span className={`status-chip ${analysis.ya_estaba_descargado ? 'local' : 'downloaded'}`}>
            {analysis.ya_estaba_descargado
              ? '✓ Verificado en disco (sin volver a descargar)'
              : '↓ Descargado por primera vez y guardado en caché'}
          </span>
          <span className={`status-chip ${analysis.ya_estaba_procesado ? 'processed' : 'fresh'}`}>
            {analysis.ya_estaba_procesado
              ? '⚡ Parquet reutilizado de caché'
              : '⚙ Procesado y convertido a Parquet'}
          </span>
        </div>
        <div className="analysis-toolbar-actions">
          <button
            type="button"
            className="button button-outline"
            disabled={busy.startsWith('analyze')}
            onClick={() => onReanalyze({ regenerar: true })}
          >
            Reprocesar
          </button>
          <button type="button" className="button button-dark" onClick={onUseInWorkbench}>
            Usar en Procesamiento →
          </button>
        </div>
      </div>

      <div className="analysis-kpis">
        <div className="kpi-card">
          <span>REGISTROS PROCESADOS</span>
          <strong>{analysis.total_filas.toLocaleString('es-GT')}</strong>
        </div>
        <div className="kpi-card">
          <span>COLUMNAS</span>
          <strong>{analysis.total_columnas}</strong>
        </div>
        <div className="kpi-card">
          <span>COMPLETITUD</span>
          <strong>{analysis.completitud_pct}%</strong>
        </div>
        <div className="kpi-card kpi-path">
          <span>PARQUET PROCESADO</span>
          <strong title={analysis.ruta_parquet}>{analysis.ruta_parquet}</strong>
        </div>
      </div>

      {(analysis.hojas.length > 1 || analysis.columnas_categoricas.length > 0) && (
        <div className="analysis-controls">
          {analysis.hojas.length > 1 && (
            <label>
              <span>HOJA DEL LIBRO</span>
              <select
                value={analysis.hoja_actual || 1}
                disabled={busy.startsWith('analyze')}
                onChange={(event) => onReanalyze({ hojaId: Number(event.target.value), agruparPor: '', columnaValor: '' })}
              >
                {analysis.hojas.map((sheet, index) => (
                  <option key={`${sheet}-${index}`} value={index + 1}>
                    {index + 1}. {sheet}
                  </option>
                ))}
              </select>
            </label>
          )}
          {analysis.columnas_categoricas.length > 0 && (
            <label>
              <span>AGRUPAR GRÁFICAS POR</span>
              <select
                value={analysis.agrupado_por || ''}
                disabled={busy.startsWith('analyze')}
                onChange={(event) => onReanalyze({ agruparPor: event.target.value })}
              >
                {analysis.columnas_categoricas.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </label>
          )}
          {analysis.columnas_numericas.length > 0 && (
            <label>
              <span>MÉTRICA A GRAFICAR</span>
              <select
                value={analysis.metrica_activa || ''}
                disabled={busy.startsWith('analyze')}
                onChange={(event) => onReanalyze({ columnaValor: event.target.value })}
              >
                <option value="">Conteo de registros</option>
                {analysis.columnas_numericas.map((col) => (
                  <option key={col} value={col}>Suma de {col}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {analysis.graficas.length > 0 && (
        <div className="charts-grid">
          {analysis.graficas.map((chart, index) => (
            <DatasetChartCard
              key={chart.id}
              chart={chart}
              plotlyUrl={datasetChartHtmlUrl(analysis.dataset, {
                recursoId: analysis.recurso_id,
                hojaId: analysis.hoja_actual || 1,
                agruparPor: analysis.agrupado_por || undefined,
                columnaValor: analysis.metrica_activa || undefined,
                indiceGrafica: index,
              })}
            />
          ))}
        </div>
      )}

      {analysis.visualizaciones_curadas.length > 0 && (
        <div className="curated-viz-box">
          <div className="curated-viz-head">
            <div>
              <div className="section-kicker">ANALÍTICA AVANZADA INE</div>
              <strong>Visualizaciones interactivas del sistema para este conjunto</strong>
            </div>
          </div>
          <div className="curated-links">
            {analysis.visualizaciones_curadas.map((viz) => {
              const targetUrl = resolveApiUrl(viz.endpoint);
              return (
                <button
                  key={viz.endpoint}
                  type="button"
                  className={curatedVizUrl === targetUrl ? 'button button-dark' : 'button button-outline'}
                  onClick={() => onSelectCuratedViz(curatedVizUrl === targetUrl ? '' : targetUrl)}
                >
                  {viz.titulo}
                </button>
              );
            })}
          </div>
          {curatedVizUrl && (
            <div className="map-frame-wrap">
              <div className="frame-toolbar">
                <span><i className="live-dot" /> VISUALIZACIÓN INTERACTIVA INE</span>
                <a href={curatedVizUrl} target="_blank" rel="noreferrer">Abrir en pestaña ↗</a>
              </div>
              <iframe title="Visualización interactiva INE" src={curatedVizUrl} />
            </div>
          )}
        </div>
      )}

      {analysis.estadisticas_numericas.length > 0 && (
        <div className="preview-wrap">
          <div className="preview-title">
            <div>
              <strong>Resumen estadístico de variables numéricas</strong>
              <span>{analysis.estadisticas_numericas.length} variables cuantitativas procesadas</span>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Registros</th>
                  <th>Mínimo</th>
                  <th>Promedio</th>
                  <th>Mediana</th>
                  <th>Máximo</th>
                  <th>Suma total</th>
                </tr>
              </thead>
              <tbody>
                {analysis.estadisticas_numericas.map((stat) => (
                  <tr key={stat.columna}>
                    <td><strong>{stat.columna}</strong></td>
                    <td>{stat.conteo.toLocaleString('es-GT')}</td>
                    <td>{displayValue(stat.minimo)}</td>
                    <td>{displayValue(stat.promedio)}</td>
                    <td>{displayValue(stat.mediana)}</td>
                    <td>{displayValue(stat.maximo)}</td>
                    <td>{displayValue(stat.suma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analysis.filas_muestra.length > 0 && (
        <div className="preview-wrap">
          <div className="preview-title">
            <div>
              <strong>Datos procesados ({analysis.nombre_recurso})</strong>
              <span>Muestra de {analysis.filas_muestra.length} de {analysis.total_filas.toLocaleString('es-GT')} filas en Parquet</span>
            </div>
            <span className="format-badge">PARQUET</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {analysis.columnas.map((col) => <th key={col}>{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {analysis.filas_muestra.map((row, idx) => (
                  <tr key={idx}>
                    {analysis.columnas.map((col) => <td key={col}>{displayValue(row[col])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DatasetChartCard({ chart, plotlyUrl }: { chart: DatasetChartItem; plotlyUrl: string }) {
  const maxVal = Math.max(1, ...chart.datos.map((d) => d.valor));
  const totalVal = Math.max(1e-9, chart.datos.reduce((acc, item) => acc + item.valor, 0));

  return (
    <article className="chart-card">
      <div className="chart-card-head">
        <div>
          <div className="section-kicker">{chart.eje_y.toUpperCase()}</div>
          <h3>{chart.titulo}</h3>
          <p>{chart.subtitulo}</p>
        </div>
        <a href={plotlyUrl} target="_blank" rel="noreferrer" className="chart-expand-link" title="Abrir gráfica interactiva en Plotly">
          Plotly ↗
        </a>
      </div>

      {chart.tipo === 'donut' ? (
        <div className="donut-layout">
          <svg viewBox="0 0 120 120" className="donut-svg" role="img" aria-label={chart.titulo}>
            <circle cx="60" cy="60" r="42" fill="none" stroke="#e9f1fa" strokeWidth="18" />
            {(() => {
              const radius = 42;
              const circumference = 2 * Math.PI * radius;
              let accumulated = 0;
              return chart.datos.map((item, idx) => {
                const fraction = item.valor / totalVal;
                const dash = fraction * circumference;
                const offset = -accumulated * circumference;
                accumulated += fraction;
                return (
                  <circle
                    key={item.etiqueta}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 60 60)"
                  >
                    <title>{`${item.etiqueta}: ${item.valor.toLocaleString('es-GT')} (${item.porcentaje}%)`}</title>
                  </circle>
                );
              });
            })()}
          </svg>
          <ul className="donut-legend">
            {chart.datos.map((item, idx) => (
              <li key={item.etiqueta}>
                <i style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }} />
                <span>{item.etiqueta}</span>
                <strong>{item.porcentaje}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : chart.tipo === 'line' ? (
        <div className="line-chart-wrap">
          <svg viewBox="0 0 360 150" className="line-chart-svg" role="img" aria-label={chart.titulo}>
            <line x1="20" y1="125" x2="345" y2="125" stroke="#d9e7f5" strokeWidth="1" />
            {(() => {
              const pts = chart.datos;
              const width = 310;
              const height = 95;
              const step = pts.length > 1 ? width / (pts.length - 1) : 0;
              const coords = pts.map((p, idx) => ({
                x: 25 + idx * step,
                y: 120 - (p.valor / maxVal) * height,
                item: p,
              }));
              const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
              const area = `25,125 ${polyline} ${coords[coords.length - 1].x},125`;
              return (
                <>
                  <polygon points={area} fill="rgba(0, 128, 255, 0.12)" />
                  <polyline fill="none" stroke="#0068c8" strokeWidth="2.5" points={polyline} />
                  {coords.map((c) => (
                    <circle key={c.item.etiqueta} cx={c.x} cy={c.y} r="4" fill="#004080">
                      <title>{`${c.item.etiqueta}: ${c.item.valor.toLocaleString('es-GT')}`}</title>
                    </circle>
                  ))}
                </>
              );
            })()}
          </svg>
          <div className="line-chart-labels">
            <span>{chart.datos[0]?.etiqueta}</span>
            <span>{chart.datos[Math.floor(chart.datos.length / 2)]?.etiqueta}</span>
            <span>{chart.datos[chart.datos.length - 1]?.etiqueta}</span>
          </div>
        </div>
      ) : (
        <div className="summary-bars">
          {chart.datos.map((item) => (
            <div className="bar-row" key={item.etiqueta}>
              <span className="bar-label" title={item.etiqueta}>{item.etiqueta}</span>
              <div className="bar-track">
                <i style={{ width: `${Math.max(2, (item.valor / maxVal) * 100)}%` }} />
              </div>
              <strong>{item.valor.toLocaleString('es-GT')}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function PreviewTable({ preview }: { preview: PreviewResponse }) {
  return <div className="preview-wrap"><div className="preview-title"><div><strong>Vista previa</strong><span>{preview.nombre || preview.dataset} · {preview.total_filas_muestra} filas de muestra</span></div>{preview.hojas?.length ? <span className="format-badge">{preview.hojas[preview.hoja_actual ? preview.hoja_actual - 1 : 0]}</span> : null}</div><div className="table-scroll"><table><thead><tr>{preview.columnas.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{preview.filas_muestra.map((row, index) => <tr key={index}>{preview.columnas.map((column) => <td key={column}>{displayValue(row[column])}</td>)}</tr>)}</tbody></table></div></div>;
}

function SummaryChart({ summary, max }: { summary: SummaryResponse; max: number }) {
  return <section className="summary-result"><div className="summary-heading"><div><div className="section-kicker">RESULTADO DEL ANÁLISIS</div><h2>Registros por {summary.agrupado_por}</h2></div><span>{summary.total_grupos} grupos</span></div><div className="summary-bars">{summary.datos.map((row, index) => { const count = Number(row.conteo) || 0; return <div className="bar-row" key={`${displayValue(row[summary.agrupado_por])}-${index}`}><span className="bar-label">{displayValue(row[summary.agrupado_por])}</span><div className="bar-track"><i style={{ width: `${Math.max(1, (count / max) * 100)}%` }} /></div><strong>{count.toLocaleString('es-GT')}</strong></div>; })}</div></section>;
}

export default App;
