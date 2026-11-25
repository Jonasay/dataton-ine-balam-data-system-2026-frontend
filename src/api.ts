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

export interface SummaryResponse {
  archivo: string;
  agrupado_por: string;
  total_grupos: number;
  datos: Array<Record<string, string | number | null>>;
}

interface SummaryApiResponse {
  archivo?: string;
  agrupado_por?: string;
  total_grupos?: number;
  datos?: Array<Record<string, string | number | null>>;
  total_registros_retornados?: number;
  filas?: Array<Record<string, string | number | null>>;
}

export interface WorkbookResponse {
  hojas?: string[];
  hoja_actual?: number;
  columnas?: string[];
  filas_muestra?: JsonRecord[];
  total_filas_muestra?: number;
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
        // Keep the response body when the API returns a non-JSON error.
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
  checkResource(slug: string, resourceId: string) {
    return request<{ cambio_remoto: boolean; ultima_modificacion_remota?: string }>(
      `/ine/${encodeURIComponent(slug)}/verificar-cambio/${encodeURIComponent(resourceId)}`,
    );
  },
  inspectWorkbook(path: string) {
    const params = new URLSearchParams({ ruta_excel: path, limite: '10' });
    return request<WorkbookResponse>(`/proceso/hojas-excel?${params}`);
  },
  convert(payload: JsonRecord) {
    return request<JsonRecord>('/proceso/convertir', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  summary(payload: JsonRecord) {
    return request<SummaryApiResponse>('/proceso/resumen', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((result) => {
      const datos = result.datos || result.filas || [];
      return {
        archivo: result.archivo || String(payload.ruta_parquet || ''),
        agrupado_por: result.agrupado_por || String(payload.agrupar_por || ''),
        total_grupos: result.total_grupos ?? result.total_registros_retornados ?? datos.length,
        datos,
      };
    });
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
