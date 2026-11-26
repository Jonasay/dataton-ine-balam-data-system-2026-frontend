import { useCallback, useEffect, useState } from 'react';
import {
  api,
  formatStat,
  visualizationUrl,
  type ClusterProfileItem,
  type CorrelationPairItem,
  type CostOfLivingForecastItem,
  type DemographicGrowthItem,
  type DescriptiveMetricItem,
  type OutlierItem,
  type PcaResponse,
  type VulnerabilityIndexItem,
} from './api';
import { useTranslation } from './i18n/LanguageContext';

type AnalyticsTab = 'vuln' | 'stats' | 'corr' | 'pca' | 'forecast';

interface AnalyticsSectionProps {
  onNotify: (kind: 'error' | 'success', message: string) => void;
  onOpenVizForIndicator?: (indicador: string) => void;
}

function vulnChipClass(level: string): string {
  const norm = level.toLowerCase();
  if (norm.includes('cr')) return 'vuln-critical';
  if (norm.includes('alt')) return 'vuln-high';
  if (norm.includes('mod')) return 'vuln-moderate';
  return 'vuln-low';
}

export function AnalyticsSection({ onNotify, onOpenVizForIndicator }: AnalyticsSectionProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AnalyticsTab>('vuln');
  const [busyTab, setBusyTab] = useState('');

  // Vulnerabilidad IVST
  const [vulnRows, setVulnRows] = useState<VulnerabilityIndexItem[]>([]);
  const [vulnMethod, setVulnMethod] = useState('');
  const [showVulnChart, setShowVulnChart] = useState(false);

  // Estadísticas descriptivas + outliers
  const [descRows, setDescRows] = useState<DescriptiveMetricItem[]>([]);
  const [outlierRows, setOutlierRows] = useState<OutlierItem[]>([]);
  const [descFilter, setDescFilter] = useState('');
  const [showOutlierPlot, setShowOutlierPlot] = useState(false);

  // Correlaciones
  const [onlySignificant, setOnlySignificant] = useState(true);
  const [minAbsR, setMinAbsR] = useState<number>(0);
  const [corrSortBy, setCorrSortBy] = useState<'pvalue' | 'pearson' | 'spearman'>('pearson');
  const [corrPairs, setCorrPairs] = useState<CorrelationPairItem[]>([]);
  const [showHeatmap, setShowHeatmap] = useState<'none' | 'pearson' | 'spearman'>('none');

  // PCA y Clústeres
  const [pca, setPca] = useState<PcaResponse | null>(null);
  const [clusters, setClusters] = useState<ClusterProfileItem[]>([]);
  const [showPca3d, setShowPca3d] = useState(false);

  // Proyecciones
  const [cbaForecasts, setCbaForecasts] = useState<CostOfLivingForecastItem[]>([]);
  const [demoForecasts, setDemoForecasts] = useState<DemographicGrowthItem[]>([]);
  const [showForecastChart, setShowForecastChart] = useState<'none' | 'cba' | 'cba3d' | 'demo'>('none');

  const loadVulnerability = useCallback(async () => {
    setBusyTab('vuln');
    try {
      const res = await api.vulnerabilityIndex();
      setVulnRows(res.indicadores);
      setVulnMethod(res.metodo);
    } catch (error) {
      onNotify('error', `No se pudo cargar el índice IVST. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusyTab('');
    }
  }, [onNotify]);

  const loadStatsAndOutliers = useCallback(async () => {
    setBusyTab('stats');
    try {
      const [descRes, outRes] = await Promise.all([api.descriptiveStats(), api.outliers()]);
      setDescRows(descRes.estadisticas);
      setOutlierRows(outRes.outliers);
    } catch (error) {
      onNotify('error', `No se pudieron cargar las estadísticas descriptivas. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusyTab('');
    }
  }, [onNotify]);

  const loadCorrelations = useCallback(async () => {
    setBusyTab('corr');
    try {
      const res = await api.correlations({
        only_significant: onlySignificant,
        min_abs_r: minAbsR,
        sort_by: corrSortBy,
      });
      setCorrPairs(res.pares);
    } catch (error) {
      onNotify('error', `No se pudieron cargar las correlaciones. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusyTab('');
    }
  }, [corrSortBy, minAbsR, onNotify, onlySignificant]);

  const loadPcaAndClusters = useCallback(async () => {
    setBusyTab('pca');
    try {
      const [pcaRes, clusterRes] = await Promise.all([api.pca(), api.clusters()]);
      setPca(pcaRes);
      setClusters(clusterRes.clusters);
    } catch (error) {
      onNotify('error', `No se pudo cargar el análisis PCA y de clústeres. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusyTab('');
    }
  }, [onNotify]);

  const loadForecasts = useCallback(async () => {
    setBusyTab('forecast');
    try {
      const [cbaRes, demoRes] = await Promise.all([api.costOfLivingForecasts(), api.demographicForecasts()]);
      setCbaForecasts(cbaRes);
      setDemoForecasts(demoRes);
    } catch (error) {
      onNotify('error', `No se pudieron cargar las proyecciones econométricas. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusyTab('');
    }
  }, [onNotify]);

  useEffect(() => {
    if (tab === 'vuln') void loadVulnerability();
    else if (tab === 'stats') void loadStatsAndOutliers();
    else if (tab === 'corr') void loadCorrelations();
    else if (tab === 'pca') void loadPcaAndClusters();
    else if (tab === 'forecast') void loadForecasts();
  }, [tab, loadVulnerability, loadStatsAndOutliers, loadCorrelations, loadPcaAndClusters, loadForecasts]);

  const vulnCounts = vulnRows.reduce(
    (acc, item) => {
      const lvl = item.nivel_vulnerabilidad.toLowerCase();
      if (lvl.includes('cr')) acc.critica += 1;
      else if (lvl.includes('alt')) acc.alta += 1;
      else if (lvl.includes('mod')) acc.moderada += 1;
      else acc.baja += 1;
      return acc;
    },
    { critica: 0, alta: 0, moderada: 0, baja: 0 },
  );

  const filteredDesc = descRows.filter((row) =>
    row.variable.toLowerCase().includes(descFilter.trim().toLowerCase()),
  );

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {t('data_science.hero_tag')}</div>
          <h1>{t('data_science.hero_title')}</h1>
          <p className="intro">{t('data_science.hero_subtitle')}</p>
        </div>
        <div className="process-orbit"><div className="orbit-ring"><span>MODELOS</span><b>→</b><span>EVIDENCIA</span></div><i>✳</i></div>
      </section>

      <div className="workbench-tabs" role="tablist" aria-label="Módulos de ciencia de datos">
        <button type="button" role="tab" aria-selected={tab === 'vuln'} className={tab === 'vuln' ? 'active' : ''} onClick={() => setTab('vuln')}>{t('data_science.tabs.ivst')}</button>
        <button type="button" role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>{t('data_science.tabs.outliers')}</button>
        <button type="button" role="tab" aria-selected={tab === 'corr'} className={tab === 'corr' ? 'active' : ''} onClick={() => setTab('corr')}>{t('data_science.tabs.correlations')}</button>
        <button type="button" role="tab" aria-selected={tab === 'pca'} className={tab === 'pca' ? 'active' : ''} onClick={() => setTab('pca')}>{t('data_science.tabs.pca')}</button>
        <button type="button" role="tab" aria-selected={tab === 'forecast'} className={tab === 'forecast' ? 'active' : ''} onClick={() => setTab('forecast')}>{t('data_science.tabs.projections')}</button>
      </div>

      {tab === 'vuln' && (
        <div className="module-stack">
          <div className="map-source">
            <span>{t('data_science.methodology.title')}</span>
            <p className="inline-method-note">{vulnMethod || t('data_science.methodology.description')}</p>
            <div className="curated-links">
              <button type="button" className={showVulnChart ? 'button button-dark' : 'button button-outline'} onClick={() => setShowVulnChart((p) => !p)}>
                {showVulnChart ? t('data_science.methodology.hide_ivst') : t('data_science.methodology.btn_ivst')}
              </button>
              {onOpenVizForIndicator && (
                <button type="button" className="button button-outline" onClick={() => onOpenVizForIndicator('indice_vulnerabilidad_ivst')}>
                  {t('data_science.methodology.btn_3d')}
                </button>
              )}
            </div>
          </div>

          <div className="analysis-kpis">
            <div className="kpi-card"><span>{t('data_science.vulnerability_levels.critical.label')}</span><strong>{vulnCounts.critica} {t('data_science.vulnerability_levels.critical.count_suffix')}</strong></div>
            <div className="kpi-card"><span>{t('data_science.vulnerability_levels.high.label')}</span><strong>{vulnCounts.alta} {t('data_science.vulnerability_levels.high.count_suffix')}</strong></div>
            <div className="kpi-card"><span>{t('data_science.vulnerability_levels.moderate.label')}</span><strong>{vulnCounts.moderada} {t('data_science.vulnerability_levels.moderate.count_suffix')}</strong></div>
            <div className="kpi-card"><span>{t('data_science.vulnerability_levels.low.label')}</span><strong>{vulnCounts.baja} {t('data_science.vulnerability_levels.low.count_suffix')}</strong></div>
          </div>

          {showVulnChart && (
            <div className="map-frame-wrap viz-frame-compact">
              <div className="frame-toolbar">
                <span><i className="live-dot" /> RANKING IVST INTERACTIVO</span>
                <a href={visualizationUrl('/visualizaciones/barras/ranking-departamental', { indicador: 'indice_vulnerabilidad_ivst' })} target="_blank" rel="noreferrer">Abrir en pestaña ↗</a>
              </div>
              <iframe title="Ranking IVST" src={visualizationUrl('/visualizaciones/barras/ranking-departamental', { indicador: 'indice_vulnerabilidad_ivst' })} />
            </div>
          )}

          {busyTab === 'vuln' ? (
            <div className="loading-state"><span className="spinner" />Calculando ranking de vulnerabilidad IVST…</div>
          ) : (
            <div className="preview-wrap">
              <div className="preview-title">
                <div>
                  <strong>{t('data_science.ranking.title')}</strong>
                  <span>{t('data_science.ranking.subtitle')}</span>
                </div>
                <span className="format-badge">{t('data_science.ranking.badge_count').replace('0', String(vulnRows.length))}</span>
              </div>
              <div className="table-scroll table-scroll-tall">
                <table>
                  <thead>
                    <tr>
                      <th>{t('data_science.ranking.columns.0')}</th>
                      <th>{t('data_science.ranking.columns.1')}</th>
                      <th>{t('data_science.ranking.columns.2')}</th>
                      <th>{t('data_science.ranking.columns.3')}</th>
                      <th>{t('data_science.ranking.columns.4')}</th>
                      <th>{t('data_science.ranking.columns.5')}</th>
                      <th>{t('data_science.ranking.columns.6')}</th>
                      <th>{t('data_science.ranking.columns.7')}</th>
                      <th>{t('data_science.ranking.columns.8')}</th>
                      <th>{t('data_science.ranking.columns.9')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vulnRows.map((item) => (
                      <tr key={item.depto_codigo}>
                        <td><strong>#{item.ranking}</strong></td>
                        <td><strong>{item.depto_nombre}</strong></td>
                        <td>{item.region_nombre}</td>
                        <td>
                          <div className="score-bar-cell">
                            <span>{formatStat(item.indice_vulnerabilidad_ivst)}</span>
                            <div className="mini-track"><i style={{ width: `${Math.min(100, item.indice_vulnerabilidad_ivst)}%` }} /></div>
                          </div>
                        </td>
                        <td><span className={`status-chip ${vulnChipClass(item.nivel_vulnerabilidad)}`}>{item.nivel_vulnerabilidad}</span></td>
                        <td>{item.cluster_nombre}</td>
                        <td>{formatStat(item.tasa_retorno_migratorio_por_10k)}</td>
                        <td>{formatStat(item.razon_dependencia_demografica)}%</td>
                        <td>{formatStat(item.tasa_matricula_superior_por_10k)}</td>
                        <td>{formatStat(item.inflacion_regional_interanual)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="module-stack">
          <section className="tool-card">
            <div className="tool-card-head">
              <span className="tool-number coral">Z</span>
              <div>
                <div className="section-kicker">DETECCIÓN DE ANOMALÍAS · |Z| ≥ 2.0 E IQR</div>
                <h2>Valores atípicos territoriales ({outlierRows.length})</h2>
              </div>
            </div>
            <p>Departamentos con desviaciones estadísticamente extremas respecto al patrón nacional.</p>
            <div className="curated-links">
              <button type="button" className={showOutlierPlot ? 'button button-dark' : 'button button-outline'} onClick={() => setShowOutlierPlot((p) => !p)}>
                {showOutlierPlot ? 'Ocultar boxplot Z-Score' : 'Ver boxplot interactivo Z-Score'}
              </button>
            </div>
            {showOutlierPlot && (
              <div className="map-frame-wrap viz-frame-compact">
                <div className="frame-toolbar">
                  <span><i className="live-dot" /> BOXPLOTS ESTANDARIZADOS (Z-SCORE)</span>
                  <a href={visualizationUrl('/visualizaciones/outliers/boxplot')} target="_blank" rel="noreferrer">Abrir en pestaña ↗</a>
                </div>
                <iframe title="Boxplot de valores atípicos" src={visualizationUrl('/visualizaciones/outliers/boxplot')} />
              </div>
            )}
            {busyTab === 'stats' ? (
              <div className="inline-loading"><span className="spinner" />Analizando anomalías territoriales…</div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Departamento</th>
                      <th>Valor</th>
                      <th>Media nacional</th>
                      <th>Z-Score</th>
                      <th>Método detección</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlierRows.map((item, idx) => (
                      <tr key={`${item.variable}-${item.depto_codigo}-${idx}`}>
                        <td><code>{item.variable}</code></td>
                        <td><strong>{item.depto_nombre}</strong></td>
                        <td>{formatStat(item.valor)}</td>
                        <td>{formatStat(item.media_nacional)}</td>
                        <td>
                          <span className={`status-chip ${Math.abs(item.z_score) >= 2 ? 'vuln-critical' : 'vuln-high'}`}>
                            {item.z_score > 0 ? `+${item.z_score}` : item.z_score} σ
                          </span>
                        </td>
                        <td>{item.metodo_deteccion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="preview-wrap">
            <div className="preview-title">
              <div>
                <strong>Estadísticas descriptivas consolidadas ({descRows.length} variables)</strong>
                <span>Medidas de tendencia central, dispersión, cuartiles, asimetría y coeficiente de variación</span>
              </div>
              <input
                className="compact-search-input"
                value={descFilter}
                onChange={(e) => setDescFilter(e.target.value)}
                placeholder="Filtrar variable..."
                aria-label="Filtrar variable descriptiva"
              />
            </div>
            <div className="table-scroll table-scroll-tall">
              <table>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>n</th>
                    <th>Media</th>
                    <th>Desv. Est.</th>
                    <th>Mediana</th>
                    <th>Q25</th>
                    <th>Q75</th>
                    <th>IQR</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                    <th>Asimetría</th>
                    <th>CV %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesc.map((row) => (
                    <tr key={row.variable}>
                      <td><code>{row.variable}</code></td>
                      <td>{row.n_observaciones}</td>
                      <td>{formatStat(row.media)}</td>
                      <td>{formatStat(row.desviacion_estandar)}</td>
                      <td>{formatStat(row.mediana)}</td>
                      <td>{formatStat(row.q25)}</td>
                      <td>{formatStat(row.q75)}</td>
                      <td>{formatStat(row.rango_intercuartil)}</td>
                      <td>{formatStat(row.minimo)}</td>
                      <td>{formatStat(row.maximo)}</td>
                      <td>{formatStat(row.asimetria_skewness, 3)}</td>
                      <td>{formatStat(row.coeficiente_variacion_pct)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'corr' && (
        <div className="module-stack">
          <div className="map-source">
            <div className="map-filters-grid">
              <label>
                <span>ORDENAR POR MAGNITUD</span>
                <select value={corrSortBy} onChange={(e) => setCorrSortBy(e.target.value as 'pvalue' | 'pearson' | 'spearman')}>
                  <option value="pearson">Pearson |r| (mayor magnitud)</option>
                  <option value="spearman">Spearman |ρ| (mayor magnitud)</option>
                  <option value="pvalue">Valor p (más significativo)</option>
                </select>
              </label>
              <label>
                <span>CORRELACIÓN MÍNIMA |r|</span>
                <select value={String(minAbsR)} onChange={(e) => setMinAbsR(Number(e.target.value))}>
                  <option value="0">Todas (|r| ≥ 0.0)</option>
                  <option value="0.3">Moderadas o superiores (|r| ≥ 0.3)</option>
                  <option value="0.5">Fuertes (|r| ≥ 0.5)</option>
                  <option value="0.7">Muy fuertes (|r| ≥ 0.7)</option>
                </select>
              </label>
              <label className="checkbox-filter-label">
                <span>SIGNIFICANCIA ESTADÍSTICA</span>
                <div className="checkbox-row">
                  <input
                    id="only-sig-check"
                    type="checkbox"
                    checked={onlySignificant}
                    onChange={(e) => setOnlySignificant(e.target.checked)}
                  />
                  <label htmlFor="only-sig-check">Solo significativas (p &lt; 0.05)</label>
                </div>
              </label>
            </div>
            <div className="curated-links">
              <button type="button" className={showHeatmap === 'pearson' ? 'button button-dark' : 'button button-outline'} onClick={() => setShowHeatmap((p) => (p === 'pearson' ? 'none' : 'pearson'))}>
                Heatmap Pearson
              </button>
              <button type="button" className={showHeatmap === 'spearman' ? 'button button-dark' : 'button button-outline'} onClick={() => setShowHeatmap((p) => (p === 'spearman' ? 'none' : 'spearman'))}>
                Heatmap Spearman
              </button>
            </div>
          </div>

          {showHeatmap !== 'none' && (
            <div className="map-frame-wrap viz-frame-compact">
              <div className="frame-toolbar">
                <span><i className="live-dot" /> MATRIZ DE CORRELACIONES ({showHeatmap.toUpperCase()})</span>
                <a href={visualizationUrl('/visualizaciones/correlaciones/heatmap', { metodo: showHeatmap })} target="_blank" rel="noreferrer">Abrir en pestaña ↗</a>
              </div>
              <iframe title={`Heatmap de correlación ${showHeatmap}`} src={visualizationUrl('/visualizaciones/correlaciones/heatmap', { metodo: showHeatmap })} />
            </div>
          )}

          {busyTab === 'corr' ? (
            <div className="loading-state"><span className="spinner" />Evaluando pares de correlación…</div>
          ) : (
            <div className="preview-wrap">
              <div className="preview-title">
                <div>
                  <strong>Matriz de correlaciones bivariadas</strong>
                  <span>{corrPairs.length} pares mostrados · Pruebas de hipótesis Pearson r y Spearman ρ</span>
                </div>
                <span className="format-badge">p &lt; 0.05 (*) · p &lt; 0.01 (**)</span>
              </div>
              <div className="table-scroll table-scroll-tall">
                <table>
                  <thead>
                    <tr>
                      <th>Variable 1</th>
                      <th>Variable 2</th>
                      <th>Pearson r</th>
                      <th>Valor p (Pearson)</th>
                      <th>Spearman ρ</th>
                      <th>Fuerza de asociación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrPairs.map((pair, idx) => (
                      <tr key={`${pair.variable_1}-${pair.variable_2}-${idx}`}>
                        <td><code>{pair.variable_1}</code></td>
                        <td><code>{pair.variable_2}</code></td>
                        <td>
                          <span className={`status-chip ${pair.pearson_r >= 0 ? 'downloaded' : 'vuln-critical'}`}>
                            {pair.pearson_r >= 0 ? `+${pair.pearson_r.toFixed(4)}` : pair.pearson_r.toFixed(4)}
                          </span>
                        </td>
                        <td>
                          {pair.pearson_pvalue.toFixed(4)}
                          {pair.pearson_significativo_01 ? ' **' : pair.pearson_significativo_05 ? ' *' : ''}
                        </td>
                        <td>{pair.spearman_rho.toFixed(4)}</td>
                        <td>{pair.fuerza_asociacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="epistemic-note">
            <strong>Rigor metodológico: correlación no implica causalidad.</strong> Las asociaciones observadas a nivel departamental (n = 22) pueden estar mediadas por variables de confusión como urbanización hospitalaria o rezagos temporales entre fenómenos económicos y flujos migratorios.
          </div>
        </div>
      )}

      {tab === 'pca' && (
        <div className="module-stack">
          {busyTab === 'pca' ? (
            <div className="loading-state"><span className="spinner" />Cargando componentes principales y conglomerados K-Means…</div>
          ) : (
            <>
              {pca && (
                <>
                  <div className="analysis-kpis">
                    <div className="kpi-card"><span>PC1 · URBANIZACIÓN Y VIALIDAD</span><strong>{formatStat(pca.varianza_explicada_pc1 * 100)}%</strong></div>
                    <div className="kpi-card"><span>PC2 · EXPULSIÓN VS EDUCACIÓN</span><strong>{formatStat(pca.varianza_explicada_pc2 * 100)}%</strong></div>
                    <div className="kpi-card"><span>PC3 · FECUNDIDAD VS INFLACIÓN</span><strong>{formatStat(pca.varianza_explicada_pc3 * 100)}%</strong></div>
                    <div className="kpi-card"><span>VARIANZA ACUMULADA (3 COMP.)</span><strong>{formatStat(pca.varianza_acumulada_3_componentes * 100)}%</strong></div>
                  </div>

                  <div className="preview-wrap">
                    <div className="preview-title">
                      <div>
                        <strong>Cargas factoriales de Componentes Principales (PCA)</strong>
                        <span>Contribución ortogonal estandarizada por indicador</span>
                      </div>
                      <button type="button" className={showPca3d ? 'button button-dark' : 'button button-outline'} onClick={() => setShowPca3d((p) => !p)}>
                        {showPca3d ? 'Ocultar cubo 3D PCA' : 'Ver espacio 3D PCA y Clústeres'}
                      </button>
                    </div>
                    {showPca3d && (
                      <div className="map-frame-wrap viz-frame-compact">
                        <div className="frame-toolbar">
                          <span><i className="live-dot" /> ESPACIO 3D PCA Y CENTROIDES K-MEANS</span>
                          <a href={visualizationUrl('/visualizaciones/3d/clusters-pca')} target="_blank" rel="noreferrer">Abrir en pestaña ↗</a>
                        </div>
                        <iframe title="PCA 3D y Clusters" src={visualizationUrl('/visualizaciones/3d/clusters-pca')} />
                      </div>
                    )}
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Indicador</th>
                            <th>PC1 ({formatStat(pca.varianza_explicada_pc1 * 100)}%)</th>
                            <th>PC2 ({formatStat(pca.varianza_explicada_pc2 * 100)}%)</th>
                            <th>PC3 ({formatStat(pca.varianza_explicada_pc3 * 100)}%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(pca.cargas_componentes).map(([indicator, loads]) => (
                            <tr key={indicator}>
                              <td><code>{indicator}</code></td>
                              <td className={Math.abs(loads.PC1) >= 0.35 ? 'strong-loading' : ''}>{loads.PC1.toFixed(3)}</td>
                              <td className={Math.abs(loads.PC2) >= 0.35 ? 'strong-loading' : ''}>{loads.PC2.toFixed(3)}</td>
                              <td className={Math.abs(loads.PC3) >= 0.35 ? 'strong-loading' : ''}>{loads.PC3.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="clusters-grid">
                {clusters.map((cluster) => (
                  <article className="tool-card cluster-card" key={cluster.cluster_id}>
                    <div className="tool-card-head">
                      <span className="tool-number">C{cluster.cluster_id}</span>
                      <div>
                        <div className="section-kicker">{cluster.n_departamentos} DEPARTAMENTOS</div>
                        <h2>{cluster.cluster_nombre}</h2>
                      </div>
                    </div>
                    <div className="cluster-dept-chips">
                      {cluster.departamentos.map((name) => <span key={name} className="format-badge">{name}</span>)}
                    </div>
                    <div className="cluster-metrics-list">
                      <div><span>Retorno migratorio medio</span><strong>{formatStat(cluster.media_retorno_migratorio)} / 10k</strong></div>
                      <div><span>Necropsias INACIF medias</span><strong>{formatStat(cluster.media_necropsias)} / 100k</strong></div>
                      <div><span>Víctimas viales medias</span><strong>{formatStat(cluster.media_victimas_viales)} / 100k</strong></div>
                      <div><span>Matrícula superior media</span><strong>{formatStat(cluster.media_matricula_superior)} / 10k</strong></div>
                      <div><span>Dependencia demográfica</span><strong>{formatStat(cluster.media_dependencia)}%</strong></div>
                      <div><span>Inflación regional media</span><strong>{formatStat(cluster.media_inflacion)}%</strong></div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'forecast' && (
        <div className="module-stack">
          <div className="map-source">
            <span>VISUALIZACIONES INTERACTIVAS DE SERIES Y PRONÓSTICOS</span>
            <div className="curated-links">
              <button type="button" className={showForecastChart === 'cba' ? 'button button-dark' : 'button button-outline'} onClick={() => setShowForecastChart((p) => (p === 'cba' ? 'none' : 'cba'))}>
                Gráfica pronóstico CBA (2D)
              </button>
              <button type="button" className={showForecastChart === 'cba3d' ? 'button button-dark' : 'button button-outline'} onClick={() => setShowForecastChart((p) => (p === 'cba3d' ? 'none' : 'cba3d'))}>
                Trayectoria CBA animada (3D)
              </button>
              <button type="button" className={showForecastChart === 'demo' ? 'button button-dark' : 'button button-outline'} onClick={() => setShowForecastChart((p) => (p === 'demo' ? 'none' : 'demo'))}>
                Curvas crecimiento demográfico 2015–2030
              </button>
            </div>
          </div>

          {showForecastChart !== 'none' && (
            <div className="map-frame-wrap viz-frame-compact">
              <div className="frame-toolbar">
                <span>
                  <i className="live-dot" />
                  {showForecastChart === 'cba'
                    ? ' MODELO ECONOMÉTRICO CBA URBANA VS RURAL'
                    : showForecastChart === 'cba3d'
                      ? ' TRAYECTORIA 3D CANASTA BÁSICA'
                      : ' CURVAS DEMOGRÁFICAS 2015–2030'}
                </span>
                <a
                  href={visualizationUrl(
                    showForecastChart === 'cba'
                      ? '/visualizaciones/tendencias/costo-vida'
                      : showForecastChart === 'cba3d'
                        ? '/visualizaciones/3d/trayectoria-costo-vida'
                        : '/visualizaciones/tendencias/crecimiento-demografico',
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en pestaña ↗
                </a>
              </div>
              <iframe
                title="Visualización de proyecciones INE"
                src={visualizationUrl(
                  showForecastChart === 'cba'
                    ? '/visualizaciones/tendencias/costo-vida'
                    : showForecastChart === 'cba3d'
                      ? '/visualizaciones/3d/trayectoria-costo-vida'
                      : '/visualizaciones/tendencias/crecimiento-demografico',
                )}
              />
            </div>
          )}

          {busyTab === 'forecast' ? (
            <div className="loading-state"><span className="spinner" />Cargando modelos econométricos y proyecciones demográficas…</div>
          ) : (
            <>
              <div className="workbench-grid">
                {cbaForecasts.map((item) => (
                  <section className="tool-card" key={item.dominio}>
                    <div className="tool-card-head">
                      <span className={item.dominio === 'Urbana' ? 'tool-number' : 'tool-number coral'}>{item.dominio.slice(0, 3).toUpperCase()}</span>
                      <div>
                        <div className="section-kicker">MODELO MCO · R² = {item.coeficiente_determinacion_r2.toFixed(4)}</div>
                        <h2>CBA {item.dominio} Per Cápita</h2>
                      </div>
                    </div>
                    <div className="cluster-metrics-list">
                      <div><span>Costo actual observado</span><strong>Q {formatStat(item.costo_actual_percapita)} / mes</strong></div>
                      <div><span>Tendencia lineal mensual</span><strong>+Q {formatStat(item.tendencia_mensual_gtq, 3)} / mes ({formatStat(item.crecimiento_mensual_pct, 3)}%)</strong></div>
                      <div><span>Proyección tasa anual</span><strong>+{formatStat(item.proyeccion_tasa_anual_pct)}% anual</strong></div>
                      <div><span>Error estándar modelo</span><strong>{formatStat(item.error_estandar_modelo, 4)}</strong></div>
                      <div><span>Pronóstico 3 meses</span><strong>Q {formatStat(item.proyeccion_3_meses_gtq)}</strong></div>
                      <div><span>Pronóstico 6 meses</span><strong>Q {formatStat(item.proyeccion_6_meses_gtq)}</strong></div>
                      <div><span>Pronóstico 12 meses</span><strong>Q {formatStat(item.proyeccion_12_meses_gtq)}</strong></div>
                    </div>
                  </section>
                ))}
              </div>

              <div className="preview-wrap">
                <div className="preview-title">
                  <div>
                    <strong>Proyecciones de crecimiento demográfico departamental (2024–2030)</strong>
                    <span>Tasa geométrica anualizada de crecimiento por departamento</span>
                  </div>
                  <span className="format-badge">{demoForecasts.length} DEPARTAMENTOS</span>
                </div>
                <div className="table-scroll table-scroll-tall">
                  <table>
                    <thead>
                      <tr>
                        <th>Departamento</th>
                        <th>Región</th>
                        <th>Población 2024</th>
                        <th>Población 2030</th>
                        <th>Aumento absoluto</th>
                        <th>Crecimiento 2024–2030</th>
                        <th>Tasa anual geométrica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoForecasts.map((row) => (
                        <tr key={row.depto_codigo}>
                          <td><strong>{row.depto_nombre}</strong></td>
                          <td>{row.region_nombre}</td>
                          <td>{row.poblacion_2024.toLocaleString('es-GT')}</td>
                          <td>{row.poblacion_2030.toLocaleString('es-GT')}</td>
                          <td>+{row.crecimiento_absoluto_2024_2030.toLocaleString('es-GT')}</td>
                          <td>+{formatStat(row.crecimiento_porcentual_total)}%</td>
                          <td><strong>+{formatStat(row.tasa_anual_crecimiento_geometrico_pct)}% / año</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
