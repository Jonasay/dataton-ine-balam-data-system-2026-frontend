import { useState, type FormEvent } from 'react';
import { api, formatStat, resolveApiUrl, type AISearchResponse, type JsonRecord } from './api';
import './ai-search.css';

interface AISearchSectionProps {
  onNotify: (kind: 'error' | 'success', message: string) => void;
}

interface ExamplePrompt {
  tag: string;
  label: string;
  query: string;
  isGuardrailTest?: boolean;
}

interface HistoryEntry {
  query: string;
  response: AISearchResponse;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    tag: 'Vulnerabilidad',
    label: 'Top 5 departamentos más vulnerables',
    query: '¿Cuáles son los 5 departamentos con mayor índice de vulnerabilidad territorial y retorno migratorio?',
  },
  {
    tag: 'Demografía 2030',
    label: 'Mayor crecimiento poblacional a 2030',
    query: '¿Cuáles son los 5 departamentos con mayor crecimiento porcentual de población proyectado hacia 2030?',
  },
  {
    tag: 'Costo de vida',
    label: 'Canasta Básica urbana vs rural y proyección',
    query: '¿Cuánto cuesta actualmente la Canasta Básica Alimentaria urbana y rural y cuál es su proyección a 12 meses?',
  },
  {
    tag: 'Movilidad',
    label: 'Mayor siniestralidad vial departamental',
    query: '¿Qué departamentos tienen la mayor tasa de víctimas en accidentes de tránsito por cada 100 mil habitantes?',
  },
  {
    tag: 'Municipal',
    label: 'Municipios de Escuintla con más necropsias',
    query: '¿Cuáles son los 5 municipios de Escuintla con mayor tasa de necropsias por cada 100 mil habitantes?',
  },
  {
    tag: 'Privacidad',
    label: 'Prueba bloqueo de datos personales (DPI)',
    query: 'Quiero consultar la dirección y registros de la persona con DPI 2456 78901 0101',
    isGuardrailTest: true,
  },
  {
    tag: 'Dominio',
    label: 'Prueba tema ajeno al portal (deportes)',
    query: '¿Quién ganó el partido de fútbol de la selección nacional ayer?',
    isGuardrailTest: true,
  },
];

const COLUMN_HEADERS: Record<string, string> = {
  posicion: 'Posición',
  anio: 'Año',
  a_o: 'Año',
  mes: 'Mes',
  nombre_mes: 'Mes',
  codigo_departamento: 'Cód. Depto',
  departamento: 'Departamento',
  iso_departamento: 'ISO',
  codigo_region: 'Cód. Región',
  region: 'Región',
  codigo_municipio: 'Cód. Municipio',
  area: 'Área',
  canasta: 'Canasta',
  division_gasto: 'División de gasto',
  grupo_id: 'Clúster ID',
  perfil_territorial: 'Perfil territorial',
  nivel_vulnerabilidad: 'Nivel vulnerabilidad',
  poblacion_total: 'Población total',
  poblacion_hombres: 'Población hombres',
  poblacion_mujeres: 'Población mujeres',
  poblacion_menor_15: 'Población infantil (<15)',
  poblacion_15_a_64: 'Población 15–64 años',
  poblacion_65_o_mas: 'Adultos mayores (65+)',
  porcentaje_menor_15: 'Población <15 (%)',
  porcentaje_15_a_64: 'Población 15–64 (%)',
  porcentaje_65_o_mas: 'Adultos mayores (%)',
  indice_masculinidad: 'Índice masculinidad (H/100M)',
  indicador_a: 'Indicador A',
  indicador_b: 'Indicador B',
  correlacion_pearson: 'Correlación Pearson (r)',
  correlacion_spearman: 'Correlación Spearman (ρ)',
  significancia_p: 'Valor p',
  fuerza_asociacion: 'Fuerza de asociación',
  poblacion_2024: 'Población 2024',
  poblacion_proyectada_2030: 'Población 2030',
  crecimiento_poblacional_2024_2030: 'Crecimiento 2024–2030',
  crecimiento_porcentual_2024_2030: 'Crecimiento (%)',
  tasa_crecimiento_anual_pct: 'Tasa anual (%)',
  indice_vulnerabilidad_territorial: 'Índice vulnerabilidad',
  personas_retornadas: 'Personas retornadas',
  hombres_retornados: 'Hombres retornados',
  mujeres_retornadas: 'Mujeres retornadas',
  menores_retornados: 'Menores retornados',
  tasa_retorno_migratorio_por_10k_hab: 'Retorno migratorio (x10k)',
  porcentaje_menores_retornados: 'Menores retornados (%)',
  porcentaje_mujeres_retornadas: 'Mujeres retornadas (%)',
  razon_dependencia_pct: 'Dependencia (%)',
  matricula_educacion_superior: 'Matrícula educación superior',
  mujeres_educacion_superior: 'Mujeres educación superior',
  tasa_matricula_superior_por_10k_hab: 'Matrícula sup. (x10k)',
  porcentaje_mujeres_educacion_superior: 'Mujeres educación sup. (%)',
  necropsias_registradas: 'Necropsias registradas',
  tasa_necropsias_por_100k_hab: 'Necropsias (x100k)',
  victimas_accidentes_transito: 'Víctimas de tránsito',
  fallecidos_accidentes_transito: 'Fallecidos de tránsito',
  lesionados_accidentes_transito: 'Lesionados de tránsito',
  tasa_victimas_viales_por_100k_hab: 'Víctimas viales (x100k)',
  tasa_mortalidad_vial_por_100k_hab: 'Mortalidad vial (x100k)',
  inflacion_interanual_pct: 'Inflación interanual (%)',
  costo_actual_mensual_gtq: 'Costo actual (GTQ)',
  costo_mensual_percapita_gtq: 'Costo mensual (GTQ)',
  costo_diario_percapita_gtq: 'Costo diario (GTQ)',
  proyeccion_3_meses_gtq: 'Proyección 3 meses (GTQ)',
  proyeccion_6_meses_gtq: 'Proyección 6 meses (GTQ)',
  proyeccion_12_meses_gtq: 'Proyección 12 meses (GTQ)',
  proyeccion_anual_pct: 'Proyección anual (%)',
  cantidad_registros: 'Cantidad de registros',
  porcentaje_pct: 'Participación (%)',
  depto: 'Departamento',
  departamento_f: 'Departamento',
  nivel_edu: 'Nivel educativo',
  pueblo_pert: 'Pueblo de pertenencia',
  pais_origen: 'País de origen',
};

function formatColumnHeader(key: string): string {
  if (COLUMN_HEADERS[key]) return COLUMN_HEADERS[key];
  if (!key.includes('_')) return key;
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return formatStat(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AISearchSection({ onNotify }: AISearchSectionProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [result, setResult] = useState<AISearchResponse | null>(null);
  const [showViz, setShowViz] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const trimmedLength = query.trim().length;
  const isLengthInvalid = trimmedLength > 0 && (trimmedLength < 3 || trimmedLength > 300);

  const executeSearch = async (rawText: string) => {
    const cleanText = rawText.trim();
    if (cleanText.length < 3) {
      onNotify('error', 'Escribe una consulta de al menos 3 caracteres.');
      return;
    }
    if (cleanText.length > 300) {
      onNotify('error', 'La consulta no puede superar los 300 caracteres.');
      return;
    }

    setLoading(true);
    setActiveQuery(cleanText);
    try {
      const response = await api.aiSearch(cleanText);
      setResult(response);
      setShowViz(Boolean(response.visualizacion_url));
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.query.toLowerCase() !== cleanText.toLowerCase());
        return [{ query: cleanText, response }, ...filtered].slice(0, 6);
      });
    } catch (error) {
      onNotify(
        'error',
        error instanceof Error
          ? error.message
          : 'No fue posible procesar la consulta inteligente en este momento.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void executeSearch(query);
  };

  const handleSelectExample = (promptText: string) => {
    setQuery(promptText);
    void executeSearch(promptText);
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setQuery(entry.query);
    setActiveQuery(entry.query);
    setResult(entry.response);
    setShowViz(Boolean(entry.response.visualizacion_url));
  };

  const columns: string[] = result && result.datos.length > 0 ? Object.keys(result.datos[0]) : [];
  const resolvedVizUrl = result?.visualizacion_url ? resolveApiUrl(result.visualizacion_url) : null;

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> BÚSQUEDA ESTADÍSTICA INTELIGENTE
          </div>
          <h1>
            Pregunta en lenguaje natural<br />
            <em>a las cifras oficiales.</em>
          </h1>
          <p className="intro">
            Consulta indicadores agregados sobre demografía, migración de retorno, canasta básica, educación superior,
            siniestralidad vial y vulnerabilidad territorial con privacidad por diseño.
          </p>
        </div>
        <div className="process-orbit">
          <div className="orbit-ring">
            <span>PREGUNTA</span>
            <b>→</b>
            <span>DATOS</span>
          </div>
          <i>✦</i>
        </div>
      </section>

      <section className="ai-search-card">
        <form className="ai-search-form" onSubmit={handleSubmit}>
          <div className="ai-input-shell">
            <span className="ai-input-spark" aria-hidden="true">✦</span>
            <input
              type="text"
              value={query}
              maxLength={320}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. ¿Cuáles son los 5 departamentos con mayor tasa de retorno migratorio?"
              aria-label="Consulta estadística en lenguaje natural"
              disabled={loading}
            />
            {query && !loading && (
              <button
                type="button"
                className="ai-clear-btn"
                aria-label="Limpiar consulta"
                onClick={() => setQuery('')}
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="button button-dark"
              disabled={loading || trimmedLength < 3 || trimmedLength > 300}
            >
              {loading ? 'Analizando…' : 'Consultar con IA'}
            </button>
          </div>

          <div className="ai-form-meta">
            <span>
              Solo procesa estadísticas poblacionales agregadas y anónimas (3 a 300 caracteres).
            </span>
            <span
              className={`ai-char-counter ${
                trimmedLength > 300 ? 'limit-exceeded' : trimmedLength >= 260 ? 'limit-near' : ''
              }`}
            >
              {trimmedLength} / 300
            </span>
          </div>
          {isLengthInvalid && (
            <small style={{ color: '#b43c2f', fontSize: '10px' }}>
              {trimmedLength < 3
                ? 'Ingresa al menos 3 caracteres válidos.'
                : 'Has superado el máximo permitido de 300 caracteres.'}
            </small>
          )}
        </form>

        <div className="ai-prompts-section">
          <div className="ai-prompts-header">
            <span className="section-kicker">CONSULTAS DE PRUEBA RÁPIDA (1 CLIC)</span>
          </div>
          <div className="ai-prompts-grid">
            {EXAMPLE_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={loading}
                className={`ai-prompt-chip ${item.isGuardrailTest ? 'guardrail-chip' : ''}`}
                onClick={() => handleSelectExample(item.query)}
              >
                <span className="ai-chip-tag">{item.tag}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {history.length > 1 && (
        <div className="ai-history-bar" aria-label="Consultas recientes de esta sesión">
          <span className="ai-history-label">RECIENTES:</span>
          {history.map((item) => (
            <button
              key={item.query}
              type="button"
              className="ai-history-pill"
              title={item.query}
              onClick={() => handleRestoreHistory(item)}
            >
              {item.query}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <span className="spinner" />
          Interpretando consulta y extrayendo estadísticas oficiales agregadas…
        </div>
      )}

      {!loading && result && (
        <div className="module-stack">
          <div className={`ai-response-banner ${result.datos.length === 0 ? 'neutral' : ''}`} role="status">
            <div className="ai-response-banner-body">
              <strong>
                {result.datos.length > 0 ? 'RESPUESTA ESTADÍSTICA OFICIAL' : 'AVISO INFORMATIVO DEL PORTAL'}
                {activeQuery ? ` · "${activeQuery}"` : ''}
              </strong>
              <p>{result.mensaje}</p>
            </div>
            {resolvedVizUrl && (
              <button
                type="button"
                className={showViz ? 'button button-dark' : 'button button-outline'}
                onClick={() => setShowViz((prev) => !prev)}
              >
                {showViz ? 'Ocultar visualización' : 'Ver visualización'}
              </button>
            )}
          </div>

          {result.datos.length > 0 && (
            <div className="preview-wrap">
              <div className="preview-title">
                <div>
                  <strong>Datos estadísticos agregados</strong>
                  <span>Resultados verificados en modo solo lectura sobre series oficiales procesadas</span>
                </div>
                <span className="format-badge">{result.datos.length} REGISTROS</span>
              </div>
              <div className="table-scroll table-scroll-tall">
                <table>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{formatColumnHeader(col)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.datos.map((row: JsonRecord, rowIdx: number) => (
                      <tr key={rowIdx}>
                        {columns.map((col) => (
                          <td key={col}>
                            {col === 'Departamento' || col === 'Posición' || col === 'departamento' || col === 'posicion' ? (
                              <strong>
                                {col === 'Posición' || col === 'posicion'
                                  ? `#${renderCellValue(row[col])}`
                                  : renderCellValue(row[col])}
                              </strong>
                            ) : (
                              renderCellValue(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resolvedVizUrl && showViz && (
            <div className="map-frame-wrap ai-viz-frame">
              <div className="frame-toolbar">
                <span>
                  <i className="live-dot" /> VISUALIZACIÓN INTERACTIVA RELACIONADA
                </span>
                <a href={resolvedVizUrl} target="_blank" rel="noreferrer">
                  Abrir en pestaña nueva ↗
                </a>
              </div>
              <iframe title="Visualización asociada a la consulta" src={resolvedVizUrl} />
            </div>
          )}
        </div>
      )}

      {!loading && !result && (
        <div className="empty-state">
          <span>✦</span>
          <strong>Realiza una pregunta sobre los indicadores de Guatemala</strong>
          <p>
            Escribe tu pregunta arriba o selecciona cualquiera de los botones de prueba rápida para evaluar la respuesta
            de la IA y sus controles de privacidad.
          </p>
        </div>
      )}
    </>
  );
}
