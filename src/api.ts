const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = (rawApiBase || '/api/v1').replace(/\/+$/, '');
const BACKEND_REQUEST_TIMEOUT_MS = 70_000;
const DATASET_ANALYSIS_TIMEOUT_MS = 120_000;

export type JsonRecord = Record<string, unknown>;

export interface DatasetResource {
  id: string;
  nombre: string;
  formato?: string;
  url?: string;
  modificado?: string;
  last_modified?: string;
  descargado_local?: boolean;
  tamano_bytes?: number | null;
  ruta_local?: string | null;
  cambio_remoto?: boolean;
  parquet_disponible?: boolean;
  ruta_parquet?: string | null;
}

export interface DatasetChartPoint {
  etiqueta: string;
  valor: number;
  porcentaje: number;
}

export interface DatasetChartItem {
  id: string;
  titulo: string;
  subtitulo: string;
  tipo: string;
  eje_x: string;
  eje_y: string;
  datos: DatasetChartPoint[];
}

export interface DatasetColumnStat {
  columna: string;
  conteo: number;
  minimo?: number | null;
  maximo?: number | null;
  promedio?: number | null;
  mediana?: number | null;
  suma?: number | null;
}

export interface CuratedVisualizationLink {
  titulo: string;
  endpoint: string;
}

export interface DatasetAnalysisResponse {
  dataset: string;
  recurso_id: string;
  nombre_recurso: string;
  formato: string;
  ya_estaba_descargado: boolean;
  ya_estaba_procesado: boolean;
  ruta_parquet: string;
  hojas: string[];
  hoja_actual?: number | null;
  total_filas: number;
  total_columnas: number;
  completitud_pct: number;
  columnas: string[];
  columnas_numericas: string[];
  columnas_categoricas: string[];
  agrupado_por?: string | null;
  metrica_activa?: string | null;
  estadisticas_numericas: DatasetColumnStat[];
  graficas: DatasetChartItem[];
  visualizaciones_curadas: CuratedVisualizationLink[];
  filas_muestra: JsonRecord[];
}

export interface Dataset {
  id: string;
  nombre: string;
  descripcion?: string;
  autor?: string;
  organizacion?: string;
  modificado?: string;
  recursos_total?: number;
  recursos?: DatasetResource[];
}

export interface DatasetResponse {
  total: number;
  inicio: number;
  filas: number;
  conjuntos: Dataset[];
}

export interface DatasetGroup {
  id: string;
  nombre: string;
  titulo?: string;
  total_paquetes?: number;
}

export interface PreviewResponse {
  dataset: string;
  recurso_id?: string;
  nombre?: string;
  formato?: string;
  hojas?: string[];
  hoja_actual?: number;
  columnas: string[];
  filas_muestra: JsonRecord[];
  total_filas_muestra: number;
}

export interface DatastoreField {
  id: string;
  type?: string;
}

export interface DatastoreSearchResponse {
  resource_id: string;
  total: number;
  campos: DatastoreField[];
  registros: JsonRecord[];
  limite: number;
  desplazamiento: number;
}

export interface MapIndicator {
  id: string;
  tema: string;
  indicador: string;
  periodo: number | string;
  ruta_parquet: string;
  columna_codigo_parquet?: string;
  columna_valor?: string;
  unidad?: string;
  titulo_mapa: string;
}

export interface MapIndicatorsResponse {
  total?: number;
  indicadores: MapIndicator[];
}

export interface DepartmentIndicatorItem {
  depto_codigo: number;
  depto_nombre: string;
  depto_iso: string;
  region_id: number;
  region_nombre: string;
  poblacion_total: number;
  defunciones_total: number;
  nacimientos_total: number;
  tasa_mortalidad_por_1000: number;
  tasa_natalidad_por_1000: number;
  crecimiento_natural_absoluto: number;
  tasa_crecimiento_natural_por_1000: number;
  indice_masculinidad: number;
  razon_dependencia_demografica: number;
  pct_poblacion_menor_15: number;
  pct_poblacion_15_64: number;
  pct_poblacion_65_mas: number;
  necropsias_total: number;
  tasa_necropsias_por_100k: number;
  victimas_viales_total: number;
  fallecidos_viales_total: number;
  lesionados_viales_total: number;
  tasa_victimas_viales_por_100k: number;
  tasa_mortalidad_vial_por_100k: number;
  retornados_total: number;
  retornados_hombres: number;
  retornados_mujeres: number;
  retornados_menores: number;
  tasa_retorno_migratorio_por_10k: number;
  pct_retornados_menores: number;
  pct_retornadas_mujeres: number;
  matriculados_superior_total: number;
  tasa_matricula_superior_por_10k: number;
  pct_mujeres_superior: number;
  indice_ipc_regional: number;
  inflacion_regional_interanual: number;
  perdida_poder_adquisitivo_quetzal: number;
  brecha_urbano_rural_cba_gtq: number;
  brecha_urbano_rural_cba_pct: number;
}

export interface DepartmentDetailItem extends DepartmentIndicatorItem {
  cluster_id?: number;
  cluster_nombre?: string;
  pca_1?: number;
  pca_2?: number;
}

export interface DepartmentIndicatorsResponse {
  total_departamentos: number;
  anio: number;
  datos: DepartmentIndicatorItem[];
}

export interface MunicipalIndicatorItem {
  depto_codigo: number;
  depto_nombre: string;
  depto_iso: string;
  region_id: number;
  region_nombre: string;
  mupio_codigo_str: string;
  poblacion_total: number;
  defunciones_total: number;
  nacimientos_total: number;
  necropsias_total: number;
  victimas_viales_total: number;
  fallecidos_viales_total: number;
  lesionados_viales_total: number;
  matriculados_superior_total: number;
  mujeres_matriculadas_superior: number;
  tasa_mortalidad_por_1000: number;
  tasa_natalidad_por_1000: number;
  crecimiento_natural_absoluto: number;
  tasa_crecimiento_natural_por_1000: number;
  tasa_necropsias_por_100k: number;
  tasa_victimas_viales_por_100k: number;
  tasa_mortalidad_vial_por_100k: number;
  tasa_matricula_superior_por_10k: number;
  pct_mujeres_superior: number;
}

export interface MunicipalIndicatorsResponse {
  total_municipios: number;
  offset: number;
  limit: number;
  anio: number;
  datos: MunicipalIndicatorItem[];
}

export interface IndicatorMethodologyCard {
  id_indicador: string;
  nombre: string;
  dominio: string;
  objetivo: string;
  formula: string;
  variables_requeridas: string[];
  fuente: string;
  unidad_medida: string;
  nivel_agregacion: string;
  periodicidad: string;
  interpretacion: string;
  limitaciones: string;
}

export interface MethodologyCatalogResponse {
  total_fichas: number;
  fichas: IndicatorMethodologyCard[];
}

export interface DescriptiveMetricItem {
  variable: string;
  n_observaciones: number;
  media: number;
  desviacion_estandar: number;
  mediana: number;
  q25: number;
  q75: number;
  rango_intercuartil: number;
  minimo: number;
  maximo: number;
  asimetria_skewness: number;
  coeficiente_variacion_pct: number;
}

export interface DescriptiveResponse {
  total_variables: number;
  estadisticas: DescriptiveMetricItem[];
}

export interface OutlierItem {
  variable: string;
  depto_codigo: number;
  depto_nombre: string;
  valor: number;
  media_nacional: number;
  z_score: number;
  metodo_deteccion: string;
}

export interface OutliersResponse {
  total_outliers: number;
  outliers: OutlierItem[];
}

export interface CorrelationPairItem {
  variable_1: string;
  variable_2: string;
  pearson_r: number;
  pearson_pvalue: number;
  pearson_significativo_05: boolean;
  pearson_significativo_01: boolean;
  spearman_rho: number;
  spearman_pvalue: number;
  spearman_significativo_05: boolean;
  fuerza_asociacion: string;
}

export interface CorrelationsResponse {
  total_pares: number;
  pares: CorrelationPairItem[];
}

export interface PcaComponentLoadings {
  PC1: number;
  PC2: number;
  PC3: number;
}

export interface PcaResponse {
  varianza_explicada_pc1: number;
  varianza_explicada_pc2: number;
  varianza_explicada_pc3: number;
  varianza_acumulada_3_componentes: number;
  cargas_componentes: Record<string, PcaComponentLoadings>;
}

export interface ClusterProfileItem {
  cluster_id: number;
  cluster_nombre: string;
  n_departamentos: number;
  departamentos: string[];
  media_retorno_migratorio: number;
  media_necropsias: number;
  media_victimas_viales: number;
  media_matricula_superior: number;
  media_dependencia: number;
  media_inflacion: number;
}

export interface ClustersResponse {
  total_clusters: number;
  clusters: ClusterProfileItem[];
}

export interface CostOfLivingForecastItem {
  dominio: string;
  costo_actual_percapita: number;
  tendencia_mensual_gtq: number;
  crecimiento_mensual_pct: number;
  proyeccion_tasa_anual_pct: number;
  coeficiente_determinacion_r2: number;
  error_estandar_modelo: number;
  proyeccion_3_meses_gtq: number;
  proyeccion_6_meses_gtq: number;
  proyeccion_12_meses_gtq: number;
}

export interface DemographicGrowthItem {
  depto_codigo: number;
  depto_nombre: string;
  region_nombre: string;
  poblacion_2024: number;
  poblacion_2030: number;
  crecimiento_absoluto_2024_2030: number;
  crecimiento_porcentual_total: number;
  tasa_anual_crecimiento_geometrico_pct: number;
}

export interface VulnerabilityIndexItem {
  ranking: number;
  depto_codigo: number;
  depto_nombre: string;
  region_nombre: string;
  indice_vulnerabilidad_ivst: number;
  nivel_vulnerabilidad: string;
  cluster_nombre: string;
  tasa_retorno_migratorio_por_10k: number;
  razon_dependencia_demografica: number;
  tasa_matricula_superior_por_10k: number;
  inflacion_regional_interanual: number;
}

export interface VulnerabilityResponse {
  total_departamentos: number;
  metodo: string;
  indicadores: VulnerabilityIndexItem[];
}

export interface VisualizationMetadataItem {
  id_visualizacion: string;
  titulo: string;
  categoria: string;
  tipo_grafica: string;
  descripcion: string;
  soporta_3d: boolean;
  soporta_animacion: boolean;
  endpoint_json: string;
  endpoint_html?: string | null;
  parametros_principales: string[];
}

export interface IndicatorCatalogOption {
  codigo: string;
  titulo: string;
  unidad: string;
  dominio: string;
}

export interface VisualizationCatalogResponse {
  total_visualizaciones: number;
  total_indicadores: number;
  indicadores_disponibles: IndicatorCatalogOption[];
  visualizaciones: VisualizationMetadataItem[];
}

export interface AISearchResponse {
  mensaje: string;
  datos: JsonRecord[];
  visualizacion_url: string | null;
}

export const SEGEPLAN_REGIONS = [
  { id: 1, nombre: 'I · Metropolitana' },
  { id: 2, nombre: 'II · Norte' },
  { id: 3, nombre: 'III · Nororiente' },
  { id: 4, nombre: 'IV · Suroriente' },
  { id: 5, nombre: 'V · Central' },
  { id: 6, nombre: 'VI · Suroccidente' },
  { id: 7, nombre: 'VII · Noroccidente' },
  { id: 8, nombre: 'VIII · Petén' },
];

export const DEPARTMENTS_LIST = [
  { codigo: 1, nombre: 'Guatemala' },
  { codigo: 2, nombre: 'El Progreso' },
  { codigo: 3, nombre: 'Sacatepéquez' },
  { codigo: 4, nombre: 'Chimaltenango' },
  { codigo: 5, nombre: 'Escuintla' },
  { codigo: 6, nombre: 'Santa Rosa' },
  { codigo: 7, nombre: 'Sololá' },
  { codigo: 8, nombre: 'Totonicapán' },
  { codigo: 9, nombre: 'Quetzaltenango' },
  { codigo: 10, nombre: 'Suchitepéquez' },
  { codigo: 11, nombre: 'Retalhuleu' },
  { codigo: 12, nombre: 'San Marcos' },
  { codigo: 13, nombre: 'Huehuetenango' },
  { codigo: 14, nombre: 'Quiché' },
  { codigo: 15, nombre: 'Baja Verapaz' },
  { codigo: 16, nombre: 'Alta Verapaz' },
  { codigo: 17, nombre: 'Petén' },
  { codigo: 18, nombre: 'Izabal' },
  { codigo: 19, nombre: 'Zacapa' },
  { codigo: 20, nombre: 'Chiquimula' },
  { codigo: 21, nombre: 'Jalapa' },
  { codigo: 22, nombre: 'Jutiapa' },
];

export function formatStat(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString('es-GT');
  return value.toLocaleString('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function resolveApiUrl(pathOrEndpoint: string): string {
  const clean = pathOrEndpoint.trim();
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith('/api/v1/')) {
    return `${API_BASE}${clean.slice('/api/v1'.length)}`;
  }
  return clean.startsWith('/') ? `${API_BASE}${clean}` : `${API_BASE}/${clean}`;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const controller = timeoutMs ? new AbortController() : undefined;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        const parsed = JSON.parse(body) as {
          detail?: string | Array<{ msg?: string }>;
          message?: string;
        };
        if (Array.isArray(parsed.detail)) {
          message = parsed.detail.map((item) => item.msg || JSON.stringify(item)).join('; ');
        } else {
          message = parsed.detail || parsed.message || body;
        }
      } catch {
        // Conserva el cuerpo original si la API no devolvió un JSON de error.
      }
      throw new Error(message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error('El servicio de datos tardó demasiado en responder. Intenta nuevamente.');
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export const api = {
  datasets(params: URLSearchParams) {
    return request<DatasetResponse>(`/ine/conjuntos?${params.toString()}`, undefined, BACKEND_REQUEST_TIMEOUT_MS);
  },
  groups() {
    return request<{ total?: number; grupos: DatasetGroup[] }>('/ine/grupos', undefined, BACKEND_REQUEST_TIMEOUT_MS);
  },
  resources(slug: string) {
    return request<{ recursos: DatasetResource[] }>(`/ine/${encodeURIComponent(slug)}/recursos`, undefined, BACKEND_REQUEST_TIMEOUT_MS);
  },
  mapIndicators() {
    return request<MapIndicatorsResponse>('/proceso/indicadores-mapa', undefined, BACKEND_REQUEST_TIMEOUT_MS);
  },
  preview(slug: string, resourceId?: string) {
    const params = new URLSearchParams({ limite: '10' });
    if (resourceId) params.set('recurso_id', resourceId);
    return request<PreviewResponse>(`/ine/${encodeURIComponent(slug)}/vista-previa?${params}`);
  },
  datastoreSearch(payload: { recurso_id: string; limite?: number; desplazamiento?: number; consulta?: string }) {
    return request<DatastoreSearchResponse>('/ine/datastore/consulta', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  checkResource(slug: string, resourceId: string) {
    return request<{ cambio_remoto: boolean; ultima_modificacion_remota?: string }>(
      `/ine/${encodeURIComponent(slug)}/verificar-cambio/${encodeURIComponent(resourceId)}`,
    );
  },
  analyzeDataset(
    slug: string,
    opts: {
      recursoId?: string;
      hojaId?: number;
      agruparPor?: string;
      columnaValor?: string;
      forzarDescarga?: boolean;
      regenerar?: boolean;
    } = {},
  ) {
    const params = new URLSearchParams({ limite_muestra: '25' });
    if (opts.recursoId) params.set('recurso_id', opts.recursoId);
    if (opts.hojaId && opts.hojaId >= 1) params.set('hoja_id', String(opts.hojaId));
    if (opts.agruparPor) params.set('agrupar_por', opts.agruparPor);
    if (opts.columnaValor) params.set('columna_valor', opts.columnaValor);
    if (opts.forzarDescarga) params.set('forzar_descarga', 'true');
    if (opts.regenerar) params.set('regenerar', 'true');
    return request<DatasetAnalysisResponse>(
      `/proceso/dataset/${encodeURIComponent(slug)}/analizar?${params.toString()}`,
      undefined,
      DATASET_ANALYSIS_TIMEOUT_MS,
    );
  },
  departmentIndicators(opts: {
    region_id?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (opts.region_id) params.set('region_id', String(opts.region_id));
    if (opts.sort_by) params.set('sort_by', opts.sort_by);
    if (opts.order) params.set('order', opts.order);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return request<DepartmentIndicatorsResponse>(`/indicadores/departamentales${qs ? `?${qs}` : ''}`);
  },
  departmentDetail(codigoONombre: string | number) {
    return request<DepartmentDetailItem>(`/indicadores/departamentales/${encodeURIComponent(String(codigoONombre))}`);
  },
  municipalIndicators(opts: {
    depto_codigo?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (opts.depto_codigo) params.set('depto_codigo', String(opts.depto_codigo));
    if (opts.sort_by) params.set('sort_by', opts.sort_by);
    if (opts.order) params.set('order', opts.order);
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return request<MunicipalIndicatorsResponse>(`/indicadores/municipales${qs ? `?${qs}` : ''}`);
  },
  municipalDetail(muniCode: string) {
    return request<MunicipalIndicatorItem>(`/indicadores/municipales/${encodeURIComponent(muniCode.trim())}`);
  },
  methodologyCards(dominio?: string) {
    const params = new URLSearchParams();
    if (dominio) params.set('dominio', dominio);
    const qs = params.toString();
    return request<MethodologyCatalogResponse>(`/indicadores/fichas-metodologicas${qs ? `?${qs}` : ''}`);
  },
  descriptiveStats() {
    return request<DescriptiveResponse>('/analisis/descriptivo');
  },
  outliers() {
    return request<OutliersResponse>('/analisis/outliers');
  },
  correlations(opts: { only_significant?: boolean; min_abs_r?: number; sort_by?: 'pvalue' | 'pearson' | 'spearman' } = {}) {
    const params = new URLSearchParams();
    if (opts.only_significant) params.set('only_significant', 'true');
    if (opts.min_abs_r && opts.min_abs_r > 0) params.set('min_abs_r', String(opts.min_abs_r));
    if (opts.sort_by) params.set('sort_by', opts.sort_by);
    const qs = params.toString();
    return request<CorrelationsResponse>(`/analisis/correlaciones${qs ? `?${qs}` : ''}`);
  },
  pca() {
    return request<PcaResponse>('/analisis/pca');
  },
  clusters() {
    return request<ClustersResponse>('/analisis/clusters');
  },
  costOfLivingForecasts() {
    return request<CostOfLivingForecastItem[]>('/analisis/proyecciones/costo-vida');
  },
  demographicForecasts() {
    return request<DemographicGrowthItem[]>('/analisis/proyecciones/demograficas');
  },
  vulnerabilityIndex() {
    return request<VulnerabilityResponse>('/analisis/vulnerabilidad');
  },
  visualizationsCatalog() {
    return request<VisualizationCatalogResponse>('/visualizaciones/catalogo');
  },
  aiSearch(consulta: string) {
    return request<AISearchResponse>(
      '/busqueda-ia',
      {
        method: 'POST',
        body: JSON.stringify({ consulta }),
      },
      BACKEND_REQUEST_TIMEOUT_MS,
    );
  },
};

export function datasetChartHtmlUrl(
  slug: string,
  opts: {
    recursoId?: string;
    hojaId?: number;
    agruparPor?: string;
    columnaValor?: string;
    indiceGrafica?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (opts.recursoId) params.set('recurso_id', opts.recursoId);
  if (opts.hojaId && opts.hojaId >= 1) params.set('hoja_id', String(opts.hojaId));
  if (opts.agruparPor) params.set('agrupar_por', opts.agruparPor);
  if (opts.columnaValor) params.set('columna_valor', opts.columnaValor);
  if (opts.indiceGrafica !== undefined) params.set('indice_grafica', String(opts.indiceGrafica));
  return `${API_BASE}/proceso/dataset/${encodeURIComponent(slug)}/grafica?${params.toString()}`;
}

export function downloadUrl(slug: string, resourceId: string) {
  return `${API_BASE}/ine/${encodeURIComponent(slug)}/descargar/${encodeURIComponent(resourceId)}`;
}

export function processUrl(endpoint: string, params: URLSearchParams) {
  return `${API_BASE}/proceso/${endpoint}?${params.toString()}`;
}

export function process3dModelUrl(
  indicator: MapIndicator,
  formato: 'stl' | 'obj' | 'glb' | 'zip',
  opts: {
    estiloColor?: 'multicolor' | 'negro' | 'calor';
    formaBase?: 'silueta' | 'caja' | 'ninguna';
    anchoMm?: number;
    alturaMaxMm?: number;
    grosorBaseMm?: number;
  } = {},
) {
  const params = new URLSearchParams({
    ruta_parquet: indicator.ruta_parquet,
    ruta_geo: 'geo/departamentos_gt.geojson',
    columna_codigo_geo: 'COD_COLUMNA',
    columna_codigo_parquet: indicator.columna_codigo_parquet || 'cod',
    columna_valor: indicator.columna_valor || 'valor',
    columna_nombre: 'nombre',
    formato,
    estilo_color: opts.estiloColor || 'multicolor',
    forma_base: opts.formaBase || (formato === 'stl' ? 'silueta' : 'silueta'),
    ancho_mm: String(opts.anchoMm ?? 150),
    altura_max_mm: String(opts.alturaMaxMm ?? 60),
    grosor_base_mm: String(opts.grosorBaseMm ?? 0.6),
  });
  return processUrl('modelo-3d-impresion', params);
}

export function visualizationUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const cleanPath = path.startsWith('/visualizaciones/') ? path : `/visualizaciones/${path.replace(/^\/+/, '')}`;
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') search.set(key, String(val));
    });
  }
  const qs = search.toString();
  return `${API_BASE}${cleanPath}${qs ? `?${qs}` : ''}`;
}

export function visualization3dModelUrl(
  indicador: string,
  formato: 'stl' | 'obj' | 'glb' | 'zip',
  opts: { estiloColor?: 'multicolor' | 'negro' | 'calor'; formaBase?: 'silueta' | 'caja' | 'ninguna' } = {},
) {
  return visualizationUrl('/visualizaciones/mapa/modelo-3d', {
    indicador,
    formato,
    estilo_color: opts.estiloColor || 'multicolor',
    forma_base: opts.formaBase || 'silueta',
  });
}
