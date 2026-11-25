import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  api,
  DEPARTMENTS_LIST,
  formatStat,
  SEGEPLAN_REGIONS,
  visualizationUrl,
  type DepartmentDetailItem,
  type DepartmentIndicatorItem,
  type IndicatorMethodologyCard,
  type MunicipalIndicatorItem,
} from './api';

type IndicatorTab = 'dept' | 'muni' | 'cards';

const DEPT_SORT_OPTIONS = [
  { value: 'depto_codigo', label: 'Código oficial (01–22)' },
  { value: 'poblacion_total', label: 'Población total 2024' },
  { value: 'tasa_natalidad_por_1000', label: 'Tasa Bruta de Natalidad (x1,000)' },
  { value: 'tasa_mortalidad_por_1000', label: 'Tasa Bruta de Mortalidad (x1,000)' },
  { value: 'tasa_crecimiento_natural_por_1000', label: 'Crecimiento natural (x1,000)' },
  { value: 'razon_dependencia_demografica', label: 'Razón de dependencia (%)' },
  { value: 'indice_masculinidad', label: 'Índice de masculinidad (H/100M)' },
  { value: 'tasa_necropsias_por_100k', label: 'Tasa de necropsias INACIF (x100k)' },
  { value: 'tasa_victimas_viales_por_100k', label: 'Tasa de víctimas viales PNC (x100k)' },
  { value: 'tasa_mortalidad_vial_por_100k', label: 'Tasa de mortalidad vial (x100k)' },
  { value: 'tasa_retorno_migratorio_por_10k', label: 'Tasa de retorno migratorio (x10k)' },
  { value: 'pct_retornados_menores', label: '% Niñez migrante retornada' },
  { value: 'pct_retornadas_mujeres', label: '% Mujeres retornadas' },
  { value: 'tasa_matricula_superior_por_10k', label: 'Matrícula educación superior (x10k)' },
  { value: 'pct_mujeres_superior', label: '% Mujeres en educación superior' },
  { value: 'inflacion_regional_interanual', label: 'Inflación regional interanual (%)' },
];

const MUNI_SORT_OPTIONS = [
  { value: '', label: 'Código oficial (depto + municipio)' },
  { value: 'poblacion_total', label: 'Población total 2024' },
  { value: 'tasa_natalidad_por_1000', label: 'Tasa Bruta de Natalidad (x1,000)' },
  { value: 'tasa_mortalidad_por_1000', label: 'Tasa Bruta de Mortalidad (x1,000)' },
  { value: 'tasa_necropsias_por_100k', label: 'Tasa de necropsias INACIF (x100k)' },
  { value: 'tasa_victimas_viales_por_100k', label: 'Tasa de víctimas viales (x100k)' },
  { value: 'tasa_mortalidad_vial_por_100k', label: 'Tasa de mortalidad vial (x100k)' },
  { value: 'tasa_matricula_superior_por_10k', label: 'Matrícula superior (x10k)' },
  { value: 'pct_mujeres_superior', label: '% Mujeres en educación superior' },
];

const CARD_DOMAINS = [
  { value: '', label: 'Todos los dominios' },
  { value: 'Demografía', label: 'Demografía' },
  { value: 'Seguridad', label: 'Seguridad y Violencia' },
  { value: 'Movilidad', label: 'Movilidad y Transporte' },
  { value: 'Migración', label: 'Migración' },
  { value: 'Educación', label: 'Educación' },
  { value: 'Economía', label: 'Economía' },
];

interface IndicatorsSectionProps {
  onNotify: (kind: 'error' | 'success', message: string) => void;
  onOpenVizForIndicator?: (indicador: string) => void;
}

export function IndicatorsSection({ onNotify, onOpenVizForIndicator }: IndicatorsSectionProps) {
  const [tab, setTab] = useState<IndicatorTab>('dept');

  // Estado para indicadores departamentales
  const [regionId, setRegionId] = useState<string>('');
  const [deptSortBy, setDeptSortBy] = useState<string>('depto_codigo');
  const [deptOrder, setDeptOrder] = useState<'asc' | 'desc'>('asc');
  const [deptSearch, setDeptSearch] = useState('');
  const [deptRows, setDeptRows] = useState<DepartmentIndicatorItem[]>([]);
  const [deptTotal, setDeptTotal] = useState(0);
  const [deptLoading, setDeptLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentDetailItem | null>(null);
  const [deptDetailLoading, setDeptDetailLoading] = useState(false);
  const [showRadarFrame, setShowRadarFrame] = useState(false);

  // Estado para indicadores municipales (340 municipios)
  const [muniDepto, setMuniDepto] = useState<string>('');
  const [muniSortBy, setMuniSortBy] = useState<string>('poblacion_total');
  const [muniOrder, setMuniOrder] = useState<'asc' | 'desc'>('desc');
  const [muniOffset, setMuniOffset] = useState(0);
  const [muniCodeQuery, setMuniCodeQuery] = useState('');
  const [muniRows, setMuniRows] = useState<MunicipalIndicatorItem[]>([]);
  const [muniTotal, setMuniTotal] = useState(0);
  const [muniLoading, setMuniLoading] = useState(false);
  const [selectedMuni, setSelectedMuni] = useState<MunicipalIndicatorItem | null>(null);
  const muniLimit = 25;

  // Estado para fichas metodológicas
  const [cardDomain, setCardDomain] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [cards, setCards] = useState<IndicatorMethodologyCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    setDeptLoading(true);
    try {
      const response = await api.departmentIndicators({
        region_id: regionId ? Number(regionId) : undefined,
        sort_by: deptSortBy || undefined,
        order: deptOrder,
        limit: 50,
      });
      setDeptRows(response.datos);
      setDeptTotal(response.total_departamentos);
    } catch (error) {
      onNotify('error', `No se pudieron cargar los indicadores departamentales. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setDeptLoading(false);
    }
  }, [deptOrder, deptSortBy, onNotify, regionId]);

  const loadDepartmentDetail = useCallback(async (identifier: string | number) => {
    setDeptDetailLoading(true);
    setShowRadarFrame(false);
    try {
      const detail = await api.departmentDetail(identifier);
      setSelectedDept(detail);
    } catch (error) {
      onNotify('error', `No se pudo consultar el departamento "${identifier}". ${error instanceof Error ? error.message : ''}`);
    } finally {
      setDeptDetailLoading(false);
    }
  }, [onNotify]);

  const loadMunicipalities = useCallback(async (startOffset: number) => {
    setMuniLoading(true);
    try {
      const response = await api.municipalIndicators({
        depto_codigo: muniDepto ? Number(muniDepto) : undefined,
        sort_by: muniSortBy || undefined,
        order: muniOrder,
        limit: muniLimit,
        offset: startOffset,
      });
      setMuniRows(response.datos);
      setMuniTotal(response.total_municipios);
      setMuniOffset(response.offset);
    } catch (error) {
      onNotify('error', `No se pudieron cargar los indicadores municipales. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setMuniLoading(false);
    }
  }, [muniDepto, muniOrder, muniSortBy, onNotify]);

  const loadMethodology = useCallback(async () => {
    setCardsLoading(true);
    try {
      const response = await api.methodologyCards(cardDomain || undefined);
      setCards(response.fichas);
    } catch (error) {
      onNotify('error', `No se pudieron cargar las fichas metodológicas. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setCardsLoading(false);
    }
  }, [cardDomain, onNotify]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (tab === 'muni') {
      void loadMunicipalities(0);
    }
  }, [loadMunicipalities, tab]);

  useEffect(() => {
    if (tab === 'cards') {
      void loadMethodology();
    }
  }, [loadMethodology, tab]);

  const submitDeptSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!deptSearch.trim()) return;
    void loadDepartmentDetail(deptSearch.trim());
  };

  const submitMuniLookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!muniCodeQuery.trim()) return;
    setMuniLoading(true);
    try {
      const item = await api.municipalDetail(muniCodeQuery.trim());
      setSelectedMuni(item);
    } catch (error) {
      onNotify('error', `No se encontró el municipio "${muniCodeQuery.trim()}". ${error instanceof Error ? error.message : ''}`);
    } finally {
      setMuniLoading(false);
    }
  };

  const deptPopTotal = deptRows.reduce((acc, row) => acc + row.poblacion_total, 0);
  const deptReturneesTotal = deptRows.reduce((acc, row) => acc + row.retornados_total, 0);
  const deptUniTotal = deptRows.reduce((acc, row) => acc + row.matriculados_superior_total, 0);
  const muniPages = Math.ceil(muniTotal / muniLimit);

  const filteredCards = cards.filter((card) => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      card.id_indicador.toLowerCase().includes(q)
      || card.nombre.toLowerCase().includes(q)
      || card.objetivo.toLowerCase().includes(q)
      || card.dominio.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> SISTEMA OFICIAL · INDICADORES SOCIOECONÓMICOS</div>
          <h1>Indicadores<br /><em>socioeconómicos.</em></h1>
          <p className="intro">Consulta las tasas estandarizadas de los 22 departamentos, el desglose de los 340 municipios y el catálogo de fichas metodológicas.</p>
        </div>
        <div className="heading-stamp"><img src="/ine.png" alt="INE Guatemala" /><span>BASE CONSOLIDADA<br />2024 · GUATEMALA</span></div>
      </section>

      <div className="workbench-tabs" role="tablist" aria-label="Vistas de indicadores socioeconómicos">
        <button id="ind-tab-dept" type="button" role="tab" aria-selected={tab === 'dept'} className={tab === 'dept' ? 'active' : ''} onClick={() => setTab('dept')}>Departamentales (22)</button>
        <button id="ind-tab-muni" type="button" role="tab" aria-selected={tab === 'muni'} className={tab === 'muni' ? 'active' : ''} onClick={() => setTab('muni')}>Municipales (340)</button>
        <button id="ind-tab-cards" type="button" role="tab" aria-selected={tab === 'cards'} className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Fichas metodológicas</button>
      </div>

      {tab === 'dept' && (
        <div className="module-stack">
          <div className="map-source">
            <div className="map-filters-grid">
              <label>
                <span>REGIÓN SEGEPLAN</span>
                <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                  <option value="">Todas las regiones (8)</option>
                  {SEGEPLAN_REGIONS.map((reg) => <option key={reg.id} value={reg.id}>{reg.nombre}</option>)}
                </select>
              </label>
              <label>
                <span>ORDENAR POR INDICADOR</span>
                <select value={deptSortBy} onChange={(e) => setDeptSortBy(e.target.value)}>
                  {DEPT_SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>
                <span>DIRECCIÓN</span>
                <select value={deptOrder} onChange={(e) => setDeptOrder(e.target.value as 'asc' | 'desc')}>
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </label>
            </div>

            <form className="inline-lookup-form" onSubmit={submitDeptSearch}>
              <input
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Buscar ficha por código (1–22), ISO (GT-HU) o nombre (ej. Petén, Quiché)..."
                aria-label="Consultar departamento específico"
              />
              <button type="submit" className="button button-outline" disabled={deptDetailLoading || !deptSearch.trim()}>
                {deptDetailLoading ? 'Buscando…' : 'Consultar ficha'}
              </button>
              {deptSortBy !== 'depto_codigo' && onOpenVizForIndicator && (
                <button type="button" className="button button-dark" onClick={() => onOpenVizForIndicator(deptSortBy)}>
                  Ver en mapa 3D →
                </button>
              )}
            </form>
          </div>

          <div className="analysis-kpis">
            <div className="kpi-card">
              <span>DEPARTAMENTOS FILTRADOS</span>
              <strong>{deptTotal}</strong>
            </div>
            <div className="kpi-card">
              <span>POBLACIÓN PROYECTADA</span>
              <strong>{deptPopTotal.toLocaleString('es-GT')}</strong>
            </div>
            <div className="kpi-card">
              <span>MIGRANTES RETORNADOS</span>
              <strong>{deptReturneesTotal.toLocaleString('es-GT')}</strong>
            </div>
            <div className="kpi-card">
              <span>MATRÍCULA UNIVERSITARIA</span>
              <strong>{deptUniTotal.toLocaleString('es-GT')}</strong>
            </div>
          </div>

          {deptLoading ? (
            <div className="loading-state"><span className="spinner" />Cargando indicadores departamentales…</div>
          ) : (
            <div className="preview-wrap">
              <div className="preview-title">
                <div>
                  <strong>Matriz consolidada departamental (2024)</strong>
                  <span>Haz clic en cualquier departamento para ver sus 39 variables y su asignación de clúster/PCA.</span>
                </div>
                <span className="format-badge">{deptRows.length} REGISTROS</span>
              </div>
              <div className="table-scroll table-scroll-tall">
                <table>
                  <thead>
                    <tr>
                      <th>Departamento</th>
                      <th>Región</th>
                      <th>Población</th>
                      <th>TBN (x1k)</th>
                      <th>TBM (x1k)</th>
                      <th>Dependencia</th>
                      <th>Necropsias (x100k)</th>
                      <th>Víct. Viales (x100k)</th>
                      <th>Retorno (x10k)</th>
                      <th>Ed. Sup. (x10k)</th>
                      <th>Inflación Reg.</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptRows.map((row) => (
                      <tr
                        key={row.depto_codigo}
                        className={selectedDept?.depto_codigo === row.depto_codigo ? 'selected-row' : 'clickable-row'}
                        onClick={() => void loadDepartmentDetail(row.depto_codigo)}
                      >
                        <td><strong>{String(row.depto_codigo).padStart(2, '0')} · {row.depto_nombre}</strong></td>
                        <td>{row.region_nombre}</td>
                        <td>{row.poblacion_total.toLocaleString('es-GT')}</td>
                        <td>{formatStat(row.tasa_natalidad_por_1000)}</td>
                        <td>{formatStat(row.tasa_mortalidad_por_1000)}</td>
                        <td>{formatStat(row.razon_dependencia_demografica)}%</td>
                        <td>{formatStat(row.tasa_necropsias_por_100k)}</td>
                        <td>{formatStat(row.tasa_victimas_viales_por_100k)}</td>
                        <td>{formatStat(row.tasa_retorno_migratorio_por_10k)}</td>
                        <td>{formatStat(row.tasa_matricula_superior_por_10k)}</td>
                        <td>{formatStat(row.inflacion_regional_interanual)}%</td>
                        <td>
                          <button
                            type="button"
                            className="table-link-btn"
                            onClick={(e) => { e.stopPropagation(); void loadDepartmentDetail(row.depto_codigo); }}
                          >
                            Ver ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {deptDetailLoading && <div className="inline-loading"><span className="spinner" />Cargando perfil enriquecido del departamento…</div>}

          {selectedDept && !deptDetailLoading && (
            <section className="detail-panel">
              <div className="detail-heading">
                <div>
                  <div className="section-kicker">PERFIL TERRITORIAL ENRIQUECIDO · {selectedDept.depto_iso}</div>
                  <h2>{selectedDept.depto_nombre}</h2>
                  <p>Región {selectedDept.region_nombre} · Código INE {String(selectedDept.depto_codigo).padStart(2, '0')}</p>
                  <div className="detail-chips-row">
                    {selectedDept.cluster_nombre && <span className="status-chip downloaded">{selectedDept.cluster_nombre}</span>}
                    {selectedDept.pca_1 !== undefined && (
                      <span className="status-chip processed">PCA: ({formatStat(selectedDept.pca_1, 3)}, {formatStat(selectedDept.pca_2, 3)})</span>
                    )}
                  </div>
                </div>
                <div className="detail-head-actions">
                  <button type="button" className="button button-outline" onClick={() => setShowRadarFrame((prev) => !prev)}>
                    {showRadarFrame ? 'Ocultar radar' : 'Ver perfil radar'}
                  </button>
                  <button type="button" className="icon-button" aria-label="Cerrar detalle departamental" onClick={() => setSelectedDept(null)}>×</button>
                </div>
              </div>

              {showRadarFrame && (
                <div className="map-frame-wrap viz-frame-compact">
                  <div className="frame-toolbar">
                    <span><i className="live-dot" /> PERFIL RADAR COMPARATIVO VS GUATEMALA</span>
                    <a
                      href={visualizationUrl('/visualizaciones/perfil/radar', { depto_codigo: selectedDept.depto_codigo, comparar_con: 1 })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en pestaña ↗
                    </a>
                  </div>
                  <iframe
                    title={`Perfil radar de ${selectedDept.depto_nombre}`}
                    src={visualizationUrl('/visualizaciones/perfil/radar', { depto_codigo: selectedDept.depto_codigo, comparar_con: 1 })}
                  />
                </div>
              )}

              <div className="domain-cards-grid">
                <article className="domain-stat-card">
                  <div className="section-kicker">DEMOGRAFÍA Y VITALES</div>
                  <ul>
                    <li><span>Población total</span><strong>{selectedDept.poblacion_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Nacimientos / TBN</span><strong>{selectedDept.nacimientos_total.toLocaleString('es-GT')} ({formatStat(selectedDept.tasa_natalidad_por_1000)}‰)</strong></li>
                    <li><span>Defunciones / TBM</span><strong>{selectedDept.defunciones_total.toLocaleString('es-GT')} ({formatStat(selectedDept.tasa_mortalidad_por_1000)}‰)</strong></li>
                    <li><span>Crecimiento natural</span><strong>{formatStat(selectedDept.tasa_crecimiento_natural_por_1000)}‰</strong></li>
                    <li><span>Razón de dependencia</span><strong>{formatStat(selectedDept.razon_dependencia_demografica)}%</strong></li>
                    <li><span>Índice masculinidad</span><strong>{formatStat(selectedDept.indice_masculinidad)} H/100M</strong></li>
                    <li><span>Grupos (&lt;15 / 15-64 / 65+)</span><strong>{formatStat(selectedDept.pct_poblacion_menor_15, 1)}% / {formatStat(selectedDept.pct_poblacion_15_64, 1)}% / {formatStat(selectedDept.pct_poblacion_65_mas, 1)}%</strong></li>
                  </ul>
                </article>

                <article className="domain-stat-card">
                  <div className="section-kicker">SEGURIDAD Y MOVILIDAD VIAL</div>
                  <ul>
                    <li><span>Necropsias INACIF</span><strong>{selectedDept.necropsias_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Tasa necropsias (x100k)</span><strong>{formatStat(selectedDept.tasa_necropsias_por_100k)}</strong></li>
                    <li><span>Víctimas viales PNC</span><strong>{selectedDept.victimas_viales_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Fallecidos / Lesionados</span><strong>{selectedDept.fallecidos_viales_total.toLocaleString('es-GT')} / {selectedDept.lesionados_viales_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Tasa víctimas viales (x100k)</span><strong>{formatStat(selectedDept.tasa_victimas_viales_por_100k)}</strong></li>
                    <li><span>Tasa mortalidad vial (x100k)</span><strong>{formatStat(selectedDept.tasa_mortalidad_vial_por_100k)}</strong></li>
                  </ul>
                </article>

                <article className="domain-stat-card">
                  <div className="section-kicker">MIGRACIÓN Y EDUCACIÓN SUPERIOR</div>
                  <ul>
                    <li><span>Total retornados (IGM)</span><strong>{selectedDept.retornados_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Tasa retorno (x10k)</span><strong>{formatStat(selectedDept.tasa_retorno_migratorio_por_10k)}</strong></li>
                    <li><span>Hombres / Mujeres / Menores</span><strong>{selectedDept.retornados_hombres.toLocaleString('es-GT')} / {selectedDept.retornados_mujeres.toLocaleString('es-GT')} / {selectedDept.retornados_menores.toLocaleString('es-GT')}</strong></li>
                    <li><span>% Niñez migrante (&lt;18)</span><strong>{formatStat(selectedDept.pct_retornados_menores)}%</strong></li>
                    <li><span>Matriculados superior</span><strong>{selectedDept.matriculados_superior_total.toLocaleString('es-GT')}</strong></li>
                    <li><span>Tasa matrícula sup. (x10k)</span><strong>{formatStat(selectedDept.tasa_matricula_superior_por_10k)}</strong></li>
                    <li><span>Participación femenina univ.</span><strong>{formatStat(selectedDept.pct_mujeres_superior)}%</strong></li>
                  </ul>
                </article>

                <article className="domain-stat-card">
                  <div className="section-kicker">ECONOMÍA Y COSTO DE VIDA</div>
                  <ul>
                    <li><span>Índice IPC Regional</span><strong>{formatStat(selectedDept.indice_ipc_regional)}</strong></li>
                    <li><span>Inflación regional interanual</span><strong>{formatStat(selectedDept.inflacion_regional_interanual)}%</strong></li>
                    <li><span>Pérdida poder adquisitivo GTQ</span><strong>Q {formatStat(selectedDept.perdida_poder_adquisitivo_quetzal, 4)}</strong></li>
                    <li><span>Brecha urbano-rural CBA (Q)</span><strong>Q {formatStat(selectedDept.brecha_urbano_rural_cba_gtq)}</strong></li>
                    <li><span>Brecha urbano-rural CBA (%)</span><strong>+{formatStat(selectedDept.brecha_urbano_rural_cba_pct)}%</strong></li>
                  </ul>
                </article>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'muni' && (
        <div className="module-stack">
          <div className="map-source">
            <div className="map-filters-grid">
              <label>
                <span>DEPARTAMENTO</span>
                <select value={muniDepto} onChange={(e) => setMuniDepto(e.target.value)}>
                  <option value="">Todos los municipios (340)</option>
                  {DEPARTMENTS_LIST.map((d) => <option key={d.codigo} value={d.codigo}>{String(d.codigo).padStart(2, '0')} · {d.nombre}</option>)}
                </select>
              </label>
              <label>
                <span>ORDENAR POR</span>
                <select value={muniSortBy} onChange={(e) => setMuniSortBy(e.target.value)}>
                  {MUNI_SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>
                <span>DIRECCIÓN</span>
                <select value={muniOrder} onChange={(e) => setMuniOrder(e.target.value as 'asc' | 'desc')}>
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </label>
            </div>

            <form className="inline-lookup-form" onSubmit={(e) => void submitMuniLookup(e)}>
              <input
                value={muniCodeQuery}
                onChange={(e) => setMuniCodeQuery(e.target.value)}
                placeholder="Buscar municipio por código INE de 4 dígitos (ej. 0101, 0901, 1601)..."
                aria-label="Código INE de municipio"
              />
              <button type="submit" className="button button-outline" disabled={!muniCodeQuery.trim() || muniLoading}>Consultar código</button>
            </form>
          </div>

          {selectedMuni && (
            <section className="detail-panel">
              <div className="detail-heading">
                <div>
                  <div className="section-kicker">FICHA MUNICIPAL · CÓDIGO INE {selectedMuni.mupio_codigo_str}</div>
                  <h2>Municipio {selectedMuni.mupio_codigo_str} · {selectedMuni.depto_nombre}</h2>
                  <p>Región {selectedMuni.region_nombre} ({selectedMuni.depto_iso})</p>
                </div>
                <button type="button" className="icon-button" aria-label="Cerrar ficha municipal" onClick={() => setSelectedMuni(null)}>×</button>
              </div>
              <div className="analysis-kpis">
                <div className="kpi-card"><span>POBLACIÓN 2024</span><strong>{selectedMuni.poblacion_total.toLocaleString('es-GT')}</strong></div>
                <div className="kpi-card"><span>TBN / TBM (x1,000)</span><strong>{formatStat(selectedMuni.tasa_natalidad_por_1000)} / {formatStat(selectedMuni.tasa_mortalidad_por_1000)}</strong></div>
                <div className="kpi-card"><span>NECROPSIAS / VÍCT. VIALES (x100k)</span><strong>{formatStat(selectedMuni.tasa_necropsias_por_100k)} / {formatStat(selectedMuni.tasa_victimas_viales_por_100k)}</strong></div>
                <div className="kpi-card"><span>ED. SUPERIOR (x10k) · % MUJ.</span><strong>{formatStat(selectedMuni.tasa_matricula_superior_por_10k)} · {formatStat(selectedMuni.pct_mujeres_superior)}%</strong></div>
              </div>
            </section>
          )}

          {muniLoading ? (
            <div className="loading-state"><span className="spinner" />Cargando indicadores municipales…</div>
          ) : (
            <>
              <div className="preview-wrap">
                <div className="preview-title">
                  <div>
                    <strong>Indicadores consolidados municipales (2024)</strong>
                    <span>Mostrando {muniRows.length} de {muniTotal} municipios · Haz clic en una fila para ver el detalle.</span>
                  </div>
                  <span className="format-badge">24 VARIABLES</span>
                </div>
                <div className="table-scroll table-scroll-tall">
                  <table>
                    <thead>
                      <tr>
                        <th>Cód. Muni</th>
                        <th>Departamento</th>
                        <th>Región</th>
                        <th>Población</th>
                        <th>Nacimientos</th>
                        <th>Defunciones</th>
                        <th>TBN (x1k)</th>
                        <th>Necropsias (x100k)</th>
                        <th>Víct. Viales (x100k)</th>
                        <th>Ed. Sup. (x10k)</th>
                        <th>% Muj. Univ.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {muniRows.map((row) => (
                        <tr
                          key={row.mupio_codigo_str}
                          className={selectedMuni?.mupio_codigo_str === row.mupio_codigo_str ? 'selected-row' : 'clickable-row'}
                          onClick={() => setSelectedMuni(row)}
                        >
                          <td><strong>{row.mupio_codigo_str}</strong></td>
                          <td>{row.depto_nombre}</td>
                          <td>{row.region_nombre}</td>
                          <td>{row.poblacion_total.toLocaleString('es-GT')}</td>
                          <td>{row.nacimientos_total.toLocaleString('es-GT')}</td>
                          <td>{row.defunciones_total.toLocaleString('es-GT')}</td>
                          <td>{formatStat(row.tasa_natalidad_por_1000)}</td>
                          <td>{formatStat(row.tasa_necropsias_por_100k)}</td>
                          <td>{formatStat(row.tasa_victimas_viales_por_100k)}</td>
                          <td>{formatStat(row.tasa_matricula_superior_por_10k)}</td>
                          <td>{formatStat(row.pct_mujeres_superior)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="pagination">
                <span>Mostrando {muniRows.length ? muniOffset + 1 : 0}–{Math.min(muniOffset + muniLimit, muniTotal)} de {muniTotal} municipios</span>
                <div>
                  <button disabled={muniOffset <= 0 || muniLoading} onClick={() => void loadMunicipalities(Math.max(0, muniOffset - muniLimit))}>← Anterior</button>
                  <span className="page-number">{muniPages ? Math.floor(muniOffset / muniLimit) + 1 : 0}<i>/</i>{muniPages}</span>
                  <button disabled={muniOffset + muniLimit >= muniTotal || muniLoading} onClick={() => void loadMunicipalities(muniOffset + muniLimit)}>Siguiente →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'cards' && (
        <div className="module-stack">
          <section className="catalog-toolbar">
            <div className="search-form">
              <span className="search-icon">⌕</span>
              <input
                aria-label="Filtrar fichas metodológicas"
                placeholder="Filtrar por código, indicador o concepto metodológico..."
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
              />
            </div>
            <label className="select-wrap">
              <span>DOMINIO TEMÁTICO</span>
              <select value={cardDomain} onChange={(e) => setCardDomain(e.target.value)}>
                {CARD_DOMAINS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <b>⌄</b>
            </label>
          </section>

          {cardsLoading ? (
            <div className="loading-state"><span className="spinner" />Cargando fichas metodológicas…</div>
          ) : (
            <div className="methodology-grid">
              {filteredCards.map((card) => (
                <article className="methodology-card" key={card.id_indicador}>
                  <div className="card-topline">
                    <span className="dataset-type"><i /> {card.id_indicador}</span>
                    <span className="format-badge">{card.dominio}</span>
                  </div>
                  <h3>{card.nombre}</h3>
                  <p className="methodology-obj">{card.objetivo}</p>
                  <div className="formula-box">
                    <span>FÓRMULA</span>
                    <code>{card.formula}</code>
                  </div>
                  <div className="methodology-meta">
                    <div><span>UNIDAD DE MEDIDA</span><strong>{card.unidad_medida}</strong></div>
                    <div><span>AGREGACIÓN</span><strong>{card.nivel_agregacion}</strong></div>
                    <div><span>PERIODICIDAD</span><strong>{card.periodicidad}</strong></div>
                    <div><span>FUENTE OFICIAL</span><strong>{card.fuente}</strong></div>
                  </div>
                  <div className="methodology-vars">
                    {card.variables_requeridas.map((varName) => <code key={varName}>{varName}</code>)}
                  </div>
                  <p className="methodology-note"><strong>Interpretación:</strong> {card.interpretacion}</p>
                  <p className="methodology-note muted-note"><strong>Limitaciones:</strong> {card.limitaciones}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
