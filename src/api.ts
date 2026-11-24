export const API_BASE = '/api/v1';
const BACKEND_REQUEST_TIMEOUT_MS = 70_000;

export type JsonRecord = Record<string, unknown>;

export interface DatasetResource {
  id: string;
  nombre: string;
  formato?: string;
  url?: string;
  modificado?: string;
  last_modified?: string;
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
  titulo_mapa: string;
}

export interface MapIndicatorsResponse {
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
        const parsed = JSON.parse(body) as { detail?: string; message?: string };
        message = parsed.detail || parsed.message || body;
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
};

export function downloadUrl(slug: string, resourceId: string) {
  return `${API_BASE}/ine/${encodeURIComponent(slug)}/descargar/${encodeURIComponent(resourceId)}`;
}

export function processUrl(endpoint: string, params: URLSearchParams) {
  return `${API_BASE}/proceso/${endpoint}?${params.toString()}`;
}
