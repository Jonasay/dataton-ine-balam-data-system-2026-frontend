import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  DEPARTMENTS_LIST,
  visualization3dModelUrl,
  visualizationUrl,
  type IndicatorCatalogOption,
  type VisualizationMetadataItem,
} from './api';

type VizTab = '3d' | 'bars' | 'pies' | 'trends' | 'maps3d';

interface VisualizationsSectionProps {
  initialIndicator?: string;
  onNotify: (kind: 'error' | 'success', message: string) => void;
}

const FALLBACK_INDICATORS: IndicatorCatalogOption[] = [
  { codigo: 'indice_vulnerabilidad_ivst', titulo: 'Índice de Vulnerabilidad Socioeconómica Territorial (IVST)', unidad: 'Puntos (0-100)', dominio: 'Vulnerabilidad' },
  { codigo: 'tasa_retorno_migratorio_por_10k', titulo: 'Tasa de Retorno Migratorio por 10,000 Habitantes', unidad: 'Retornados / 10k hab', dominio: 'Migración' },
  { codigo: 'tasa_necropsias_por_100k', titulo: 'Tasa de Necropsias Médico-Legales INACIF por 100k Hab', unidad: 'Necropsias / 100k hab', dominio: 'Seguridad' },
  { codigo: 'tasa_victimas_viales_por_100k', titulo: 'Tasa de Víctimas Viales PNC por 100k Habitantes', unidad: 'Víctimas / 100k hab', dominio: 'Movilidad' },
  { codigo: 'tasa_matricula_superior_por_10k', titulo: 'Tasa de Matrícula en Educación Superior por 10k Hab', unidad: 'Estudiantes / 10k hab', dominio: 'Educación' },
  { codigo: 'tasa_natalidad_por_1000', titulo: 'Tasa Bruta de Natalidad (TBN)', unidad: 'Nacidos / 1,000 hab', dominio: 'Demografía' },
  { codigo: 'inflacion_regional_interanual', titulo: 'Inflación Regional Interanual del IPC', unidad: 'Variación %', dominio: 'Economía' },
];

export function VisualizationsSection({ initialIndicator, onNotify }: VisualizationsSectionProps) {
  const [tab, setTab] = useState<VizTab>(initialIndicator ? 'maps3d' : '3d');
  const [indicators, setIndicators] = useState<IndicatorCatalogOption[]>(FALLBACK_INDICATORS);
  const [catalogItems, setCatalogItems] = useState<VisualizationMetadataItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Gráficas 3D
  const [chart3dKind, setChart3dKind] = useState<'traj-demo' | 'clusters-pca' | 'riesgo-cube' | 'traj-cba'>('traj-demo');
  const [trajColorBy, setTrajColorBy] = useState<'region_nombre' | 'cluster_nombre' | 'nivel_vulnerabilidad'>('region_nombre');
  const [cubeX, setCubeX] = useState('tasa_retorno_migratorio_por_10k');
  const [cubeY, setCubeY] = useState('tasa_matricula_superior_por_10k');
  const [cubeZ, setCubeZ] = useState('tasa_necropsias_por_100k');

  // Barras y rankings
  const [barKind, setBarKind] = useState<'ranking-dept' | 'ranking-muni' | 'estructura-demo' | 'retornados'>('ranking-dept');
  const [barIndicator, setBarIndicator] = useState(initialIndicator || 'tasa_retorno_migratorio_por_10k');
  const [barTopN, setBarTopN] = useState(22);
  const [barOrder, setBarOrder] = useState<'desc' | 'asc'>('desc');
  const [barDepto, setBarDepto] = useState<string>('');

  // Pastel y jerarquía
  const [pieType, setPieType] = useState<'clusters' | 'retornados_edad' | 'retornados_genero' | 'educacion_genero' | 'victimas_viales' | 'estructura_etaria' | 'jerarquia_territorial'>('clusters');
  const [pieDepto, setPieDepto] = useState<string>('');
  const [pieMetric, setPieMetric] = useState<string>('poblacion_total');

  // Tendencias y radar
  const [trendKind, setTrendKind] = useState<'cba' | 'ipc' | 'demo' | 'heatmap' | 'boxplot' | 'radar'>('cba');
  const [ipcView, setIpcView] = useState<'regiones' | 'divisiones' | 'poder_adquisitivo'>('regiones');
  const [heatmapMethod, setHeatmapMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [radarMainDepto, setRadarMainDepto] = useState<number>(13);
  const [radarCompareDepto, setRadarCompareDepto] = useState<string>('1');

  // Cartografía, Deck.gl, Blender PNG y modelos 3D
  const [mapIndicator, setMapIndicator] = useState<string>(initialIndicator || 'indice_vulnerabilidad_ivst');
  const [mapKind, setMapKind] = useState<'3d-relieve' | '2d-plotly' | '2d-folium' | 'blender'>('3d-relieve');
  const [map3dColor, setMap3dColor] = useState<'multicolor' | 'negro' | 'calor'>('multicolor');
  const [blenderColor, setBlenderColor] = useState<'multicolor' | 'negro' | 'azul'>('multicolor');
  const [modelBaseShape, setModelBaseShape] = useState<'silueta' | 'caja' | 'ninguna'>('silueta');
  const [blenderStatus, setBlenderStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [blenderNonce, setBlenderNonce] = useState(0);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const response = await api.visualizationsCatalog();
      if (response.indicadores_disponibles.length > 0) {
        setIndicators(response.indicadores_disponibles);
      }
      setCatalogItems(response.visualizaciones);
    } catch (error) {
      onNotify('error', `No se pudo cargar el catálogo maestro de visualizaciones. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setCatalogLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (initialIndicator) {
      setMapIndicator(initialIndicator);
      setBarIndicator(initialIndicator);
      setTab('maps3d');
    }
  }, [initialIndicator]);

  const activeIframeUrl = useMemo(() => {
    if (tab === '3d') {
      if (chart3dKind === 'traj-demo') {
        return visualizationUrl('/visualizaciones/3d/trayectoria-demografica', { color_por: trajColorBy });
      }
      if (chart3dKind === 'clusters-pca') {
        return visualizationUrl('/visualizaciones/3d/clusters-pca');
      }
      if (chart3dKind === 'riesgo-cube') {
        return visualizationUrl('/visualizaciones/3d/riesgo-multidimensional', {
          eje_x: cubeX,
          eje_y: cubeY,
          eje_z: cubeZ,
        });
      }
      return visualizationUrl('/visualizaciones/3d/trayectoria-costo-vida');
    }
    if (tab === 'bars') {
      if (barKind === 'ranking-dept') {
        return visualizationUrl('/visualizaciones/barras/ranking-departamental', {
          indicador: barIndicator,
          top_n: barTopN,
          orden: barOrder,
        });
      }
      if (barKind === 'ranking-muni') {
        const muniEligible = ['tasa_necropsias_por_100k', 'tasa_victimas_viales_por_100k', 'tasa_mortalidad_vial_por_100k', 'tasa_matricula_superior_por_10k', 'tasa_natalidad_por_1000', 'tasa_mortalidad_por_1000'].includes(barIndicator)
          ? barIndicator
          : 'tasa_necropsias_por_100k';
        return visualizationUrl('/visualizaciones/barras/ranking-municipal', {
          indicador: muniEligible,
          depto_codigo: barDepto || undefined,
          top_n: Math.min(barTopN, 50),
        });
      }
      if (barKind === 'estructura-demo') {
        return visualizationUrl('/visualizaciones/barras/estructura-demografica');
      }
      return visualizationUrl('/visualizaciones/barras/composicion-retornados', { top_n: Math.min(barTopN, 22) });
    }
    if (tab === 'pies') {
      return visualizationUrl('/visualizaciones/pastel/distribucion', {
        tipo: pieType,
        depto_codigo: pieDepto || undefined,
        metrica: pieMetric,
      });
    }
    if (tab === 'trends') {
      if (trendKind === 'cba') return visualizationUrl('/visualizaciones/tendencias/costo-vida');
      if (trendKind === 'ipc') return visualizationUrl('/visualizaciones/tendencias/ipc', { vista: ipcView });
      if (trendKind === 'demo') return visualizationUrl('/visualizaciones/tendencias/crecimiento-demografico', { top_n: 8 });
      if (trendKind === 'heatmap') return visualizationUrl('/visualizaciones/correlaciones/heatmap', { metodo: heatmapMethod });
      if (trendKind === 'boxplot') return visualizationUrl('/visualizaciones/outliers/boxplot');
      return visualizationUrl('/visualizaciones/perfil/radar', {
        depto_codigo: radarMainDepto,
        comparar_con: radarCompareDepto || undefined,
      });
    }
    if (mapKind === '3d-relieve') {
      return visualizationUrl('/visualizaciones/mapa/3d-relieve', {
        indicador: mapIndicator,
        estilo_color: map3dColor,
      });
    }
    if (mapKind === '2d-plotly') {
      return visualizationUrl('/visualizaciones/mapa/2d-plotly', {
        indicador: mapIndicator,
        formato: 'html',
      });
    }
    if (mapKind === '2d-folium') {
      return visualizationUrl('/visualizaciones/mapa/2d-folium', {
        indicador: mapIndicator,
      });
    }
    return '';
  }, [
    tab, chart3dKind, trajColorBy, cubeX, cubeY, cubeZ,
    barKind, barIndicator, barTopN, barOrder, barDepto,
    pieType, pieDepto, pieMetric,
    trendKind, ipcView, heatmapMethod, radarMainDepto, radarCompareDepto,
    mapKind, mapIndicator, map3dColor,
  ]);

  const blenderImageUrl = useMemo(
    () => visualizationUrl('/visualizaciones/mapa/render-blender', {
      indicador: mapIndicator,
      estilo_color: blenderColor,
      t: blenderNonce || undefined,
    }),
    [blenderColor, blenderNonce, mapIndicator],
  );

  useEffect(() => {
    if (tab === 'maps3d' && mapKind === 'blender') {
      setBlenderStatus('loading');
    }
  }, [blenderImageUrl, mapKind, tab]);

  const stlDownloadUrl = visualization3dModelUrl(mapIndicator, 'stl', { estiloColor: map3dColor, formaBase: modelBaseShape });
  const objDownloadUrl = visualization3dModelUrl(mapIndicator, 'obj', { estiloColor: map3dColor, formaBase: modelBaseShape });
  const glbDownloadUrl = visualization3dModelUrl(mapIndicator, 'glb', { estiloColor: map3dColor, formaBase: modelBaseShape });
  const zipDownloadUrl = visualization3dModelUrl(mapIndicator, 'zip', { estiloColor: map3dColor, formaBase: modelBaseShape });

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> STUDIO VISUALIZACIÓN · {catalogItems.length || 20} VISUALIZACIONES</div>
          <h1>Visualizaciones<br /><em>interactivas y 3D.</em></h1>
          <p className="intro">Explora gráficas 3D animadas, rankings, distribuciones, mapas en relieve Deck.gl, renders con Blender y descarga modelos 3D STL u OBJ.</p>
        </div>
        <div className="heading-stamp"><img src="/ine.png" alt="INE Guatemala" /><span>CATÁLOGO VISUAL<br />2D · 3D · BLENDER</span></div>
      </section>

      <div className="workbench-tabs" role="tablist" aria-label="Categorías de visualización">
        <button type="button" role="tab" aria-selected={tab === '3d'} className={tab === '3d' ? 'active' : ''} onClick={() => setTab('3d')}>Gráficas 3D</button>
        <button type="button" role="tab" aria-selected={tab === 'bars'} className={tab === 'bars' ? 'active' : ''} onClick={() => setTab('bars')}>Barras y rankings</button>
        <button type="button" role="tab" aria-selected={tab === 'pies'} className={tab === 'pies' ? 'active' : ''} onClick={() => setTab('pies')}>Pastel y jerarquía</button>
        <button type="button" role="tab" aria-selected={tab === 'trends'} className={tab === 'trends' ? 'active' : ''} onClick={() => setTab('trends')}>Tendencias y radar</button>
        <button type="button" role="tab" aria-selected={tab === 'maps3d'} className={tab === 'maps3d' ? 'active' : ''} onClick={() => setTab('maps3d')}>Cartografía y modelos 3D</button>
      </div>

      {catalogLoading && indicators.length === 0 ? (
        <div className="loading-state"><span className="spinner" />Cargando catálogo visual…</div>
      ) : (
        <div className="module-stack">
          {tab === '3d' && (
            <div className="map-source">
              <div className="map-filters-grid">
                <label>
                  <span>VISUALIZACIÓN 3D</span>
                  <select value={chart3dKind} onChange={(e) => setChart3dKind(e.target.value as 'traj-demo' | 'clusters-pca' | 'riesgo-cube' | 'traj-cba')}>
                    <option value="traj-demo">Trayectoria demográfica animada (2015–2030)</option>
                    <option value="clusters-pca">Espacio 3D PCA y clústeres K-Means</option>
                    <option value="riesgo-cube">Cubo 3D personalizable de indicadores</option>
                    <option value="traj-cba">Trayectoria 3D animada Canasta Básica (CBA)</option>
                  </select>
                </label>
                {chart3dKind === 'traj-demo' && (
                  <label>
                    <span>COLOREAR POR</span>
                    <select value={trajColorBy} onChange={(e) => setTrajColorBy(e.target.value as 'region_nombre' | 'cluster_nombre' | 'nivel_vulnerabilidad')}>
                      <option value="region_nombre">Región SEGEPLAN</option>
                      <option value="cluster_nombre">Conglomerado K-Means</option>
                      <option value="nivel_vulnerabilidad">Nivel de vulnerabilidad (IVST)</option>
                    </select>
                  </label>
                )}
                {chart3dKind === 'riesgo-cube' && (
                  <>
                    <label>
                      <span>EJE X</span>
                      <select value={cubeX} onChange={(e) => setCubeX(e.target.value)}>
                        {indicators.filter((i) => i.codigo !== 'indice_vulnerabilidad_ivst').map((i) => <option key={i.codigo} value={i.codigo}>{i.titulo}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>EJE Y</span>
                      <select value={cubeY} onChange={(e) => setCubeY(e.target.value)}>
                        {indicators.filter((i) => i.codigo !== 'indice_vulnerabilidad_ivst').map((i) => <option key={i.codigo} value={i.codigo}>{i.titulo}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              {chart3dKind === 'riesgo-cube' && (
                <div className="map-filters-grid">
                  <label>
                    <span>EJE Z</span>
                    <select value={cubeZ} onChange={(e) => setCubeZ(e.target.value)}>
                      {indicators.filter((i) => i.codigo !== 'indice_vulnerabilidad_ivst').map((i) => <option key={i.codigo} value={i.codigo}>{i.titulo}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          {tab === 'bars' && (
            <div className="map-source">
              <div className="map-filters-grid">
                <label>
                  <span>TIPO DE GRÁFICA DE BARRAS</span>
                  <select value={barKind} onChange={(e) => setBarKind(e.target.value as 'ranking-dept' | 'ranking-muni' | 'estructura-demo' | 'retornados')}>
                    <option value="ranking-dept">Ranking departamental comparativo</option>
                    <option value="ranking-muni">Ranking municipal de puntos críticos (340)</option>
                    <option value="estructura-demo">Estructura etaria poblacional apilada</option>
                    <option value="retornados">Composición población migrante retornada</option>
                  </select>
                </label>
                {(barKind === 'ranking-dept' || barKind === 'ranking-muni') && (
                  <label>
                    <span>INDICADOR</span>
                    <select value={barIndicator} onChange={(e) => setBarIndicator(e.target.value)}>
                      {indicators.map((i) => <option key={i.codigo} value={i.codigo}>{i.titulo}</option>)}
                    </select>
                  </label>
                )}
                {barKind === 'ranking-dept' && (
                  <label>
                    <span>ORDEN</span>
                    <select value={barOrder} onChange={(e) => setBarOrder(e.target.value as 'desc' | 'asc')}>
                      <option value="desc">Descendente (mayor arriba)</option>
                      <option value="asc">Ascendente</option>
                    </select>
                  </label>
                )}
                {barKind === 'ranking-muni' && (
                  <label>
                    <span>FILTRAR POR DEPARTAMENTO</span>
                    <select value={barDepto} onChange={(e) => setBarDepto(e.target.value)}>
                      <option value="">Toda la República</option>
                      {DEPARTMENTS_LIST.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                    </select>
                  </label>
                )}
                {(barKind === 'ranking-dept' || barKind === 'ranking-muni' || barKind === 'retornados') && (
                  <label>
                    <span>CANTIDAD (TOP N)</span>
                    <select value={String(barTopN)} onChange={(e) => setBarTopN(Number(e.target.value))}>
                      <option value="10">Top 10</option>
                      <option value="15">Top 15</option>
                      <option value="22">22 departamentos / Top 22</option>
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}

          {tab === 'pies' && (
            <div className="map-source">
              <div className="map-filters-grid">
                <label>
                  <span>COMPOSICIÓN O JERARQUÍA</span>
                  <select value={pieType} onChange={(e) => setPieType(e.target.value as typeof pieType)}>
                    <option value="clusters">Distribución por clúster socioeconómico</option>
                    <option value="jerarquia_territorial">Sunburst jerárquico (Región → Clúster → Depto)</option>
                    <option value="retornados_edad">Proporción de niñez migrante retornada</option>
                    <option value="retornados_genero">Distribución por sexo en retornados</option>
                    <option value="educacion_genero">Paridad de género en educación superior</option>
                    <option value="victimas_viales">Severidad de víctimas viales (fallecidos vs lesionados)</option>
                    <option value="estructura_etaria">Pirámide resumida por grandes grupos de edad</option>
                  </select>
                </label>
                {(pieType === 'clusters' || pieType === 'jerarquia_territorial') ? (
                  <label>
                    <span>MÉTRICA CUANTITATIVA</span>
                    <select value={pieMetric} onChange={(e) => setPieMetric(e.target.value)}>
                      <option value="poblacion_total">Población total</option>
                      <option value="retornados_total">Personas retornadas</option>
                      <option value="matriculados_superior_total">Matrícula universitaria</option>
                      <option value="necropsias_total">Necropsias INACIF</option>
                      <option value="victimas_viales_total">Víctimas viales PNC</option>
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>ÁMBITO TERRITORIAL</span>
                    <select value={pieDepto} onChange={(e) => setPieDepto(e.target.value)}>
                      <option value="">República completa</option>
                      {DEPARTMENTS_LIST.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}

          {tab === 'trends' && (
            <div className="map-source">
              <div className="map-filters-grid">
                <label>
                  <span>ANÁLISIS TEMPORAL / COMPARATIVO</span>
                  <select value={trendKind} onChange={(e) => setTrendKind(e.target.value as typeof trendKind)}>
                    <option value="cba">Evolución y pronóstico Canasta Básica (CBA)</option>
                    <option value="ipc">Tendencias del IPC y poder adquisitivo</option>
                    <option value="demo">Curvas de crecimiento demográfico (2015–2030)</option>
                    <option value="heatmap">Mapa de calor de correlaciones</option>
                    <option value="boxplot">Detección visual de outliers (Boxplot Z-Score)</option>
                    <option value="radar">Perfil radar multidimensional por departamento</option>
                  </select>
                </label>
                {trendKind === 'ipc' && (
                  <label>
                    <span>DESAGREGACIÓN IPC</span>
                    <select value={ipcView} onChange={(e) => setIpcView(e.target.value as typeof ipcView)}>
                      <option value="regiones">8 Regiones SEGEPLAN</option>
                      <option value="divisiones">13 Divisiones de gasto (CCIF)</option>
                      <option value="poder_adquisitivo">Pérdida del poder adquisitivo del quetzal</option>
                    </select>
                  </label>
                )}
                {trendKind === 'heatmap' && (
                  <label>
                    <span>MÉTODO DE CORRELACIÓN</span>
                    <select value={heatmapMethod} onChange={(e) => setHeatmapMethod(e.target.value as 'pearson' | 'spearman')}>
                      <option value="pearson">Pearson (r)</option>
                      <option value="spearman">Spearman (ρ)</option>
                    </select>
                  </label>
                )}
                {trendKind === 'radar' && (
                  <>
                    <label>
                      <span>DEPARTAMENTO PRINCIPAL</span>
                      <select value={String(radarMainDepto)} onChange={(e) => setRadarMainDepto(Number(e.target.value))}>
                        {DEPARTMENTS_LIST.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>COMPARAR CONTRA</span>
                      <select value={radarCompareDepto} onChange={(e) => setRadarCompareDepto(e.target.value)}>
                        <option value="">Media nacional</option>
                        {DEPARTMENTS_LIST.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'maps3d' && (
            <div className="map-source">
              <div className="map-filters-grid">
                <label>
                  <span>INDICADOR TERRITORIAL</span>
                  <select value={mapIndicator} onChange={(e) => setMapIndicator(e.target.value)}>
                    {indicators.map((ind) => <option key={ind.codigo} value={ind.codigo}>{ind.dominio}: {ind.titulo}</option>)}
                  </select>
                </label>
                <label>
                  <span>MODALIDAD VISUAL</span>
                  <select value={mapKind} onChange={(e) => setMapKind(e.target.value as typeof mapKind)}>
                    <option value="3d-relieve">Relieve 3D volumétrico (Deck.gl)</option>
                    <option value="2d-plotly">Mapa coroplético 2D (Plotly + panel KPI)</option>
                    <option value="2d-folium">Mapa geográfico multicapa (Folium)</option>
                    <option value="blender">Render 3D de estudio con Blender (PNG)</option>
                  </select>
                </label>
                {mapKind === 'blender' ? (
                  <label>
                    <span>ESTILO BLENDER</span>
                    <select value={blenderColor} onChange={(e) => setBlenderColor(e.target.value as typeof blenderColor)}>
                      <option value="multicolor">Multicolor (22 departamentos)</option>
                      <option value="negro">Relieve negro escultórico</option>
                      <option value="azul">Azul petróleo</option>
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>ESQUEMA DE COLOR Y BASE 3D</span>
                    <select value={map3dColor} onChange={(e) => setMap3dColor(e.target.value as typeof map3dColor)}>
                      <option value="multicolor">Multicolor (22 departamentos)</option>
                      <option value="calor">Gradiente de calor</option>
                      <option value="negro">Relieve negro de alto contraste</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="model-3d-download-bar">
                <div className="model-3d-download-info">
                  <strong>Descargar modelo 3D del mapa ({mapIndicator})</strong>
                  <span>Exporta la geometría extruida lista para impresión 3D o software CAD/Blender.</span>
                </div>
                <div className="model-3d-download-controls">
                  <select aria-label="Forma base 3D" value={modelBaseShape} onChange={(e) => setModelBaseShape(e.target.value as typeof modelBaseShape)}>
                    <option value="silueta">Base silueta</option>
                    <option value="caja">Base rectangular</option>
                    <option value="ninguna">Sin base</option>
                  </select>
                  <a className="button button-dark model-dl-btn" href={stlDownloadUrl} download>↓ Descargar .STL</a>
                  <a className="button button-outline model-dl-btn" href={objDownloadUrl} download>↓ Descargar .OBJ</a>
                  <a className="button button-outline model-dl-btn" href={glbDownloadUrl} download>↓ .GLB</a>
                  <a className="button button-outline model-dl-btn" href={zipDownloadUrl} download>↓ Pack STLs (.ZIP)</a>
                </div>
              </div>
            </div>
          )}

          {tab === 'maps3d' && mapKind === 'blender' ? (
            <div className="map-frame-wrap">
              <div className="frame-toolbar">
                <span><i className="live-dot" /> RENDERIZADO DE ESTUDIO BLENDER (PNG)</span>
                <div className="toolbar-links-group">
                  <button type="button" className="table-link-btn" onClick={() => setBlenderNonce((n) => n + 1)}>Regenerar vista</button>
                  <a href={visualizationUrl('/visualizaciones/mapa/render-blender', { indicador: mapIndicator, estilo_color: blenderColor, descargar: true })} download>
                    Descargar PNG ↓
                  </a>
                </div>
              </div>
              {blenderStatus === 'loading' && <div className="inline-loading"><span className="spinner" />Cargando render Blender desde el servidor…</div>}
              {blenderStatus === 'error' && (
                <div className="inline-loading">No se pudo cargar el render Blender para este indicador. Prueba otro estilo o descarga los modelos STL/OBJ arriba.</div>
              )}
              <img
                className={blenderStatus === 'error' ? 'hidden-media' : 'blender-render-img'}
                src={blenderImageUrl}
                alt={`Render Blender de ${mapIndicator}`}
                onLoad={() => setBlenderStatus('loaded')}
                onError={() => setBlenderStatus('error')}
              />
            </div>
          ) : (
            <div className="map-frame-wrap">
              <div className="frame-toolbar">
                <span><i className="live-dot" /> VISUALIZACIÓN INTERACTIVA INE</span>
                <div className="toolbar-links-group">
                  {tab === 'maps3d' && (
                    <>
                      <a href={stlDownloadUrl} download>Descargar .STL ↓</a>
                      <a href={objDownloadUrl} download>Descargar .OBJ ↓</a>
                    </>
                  )}
                  <a href={activeIframeUrl} target="_blank" rel="noreferrer">Abrir en una pestaña ↗</a>
                </div>
              </div>
              <iframe title="Visualización interactiva INE" src={activeIframeUrl} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
