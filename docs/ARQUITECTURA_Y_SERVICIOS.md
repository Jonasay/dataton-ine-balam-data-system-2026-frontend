# Arquitectura del Sistema y Consumo de Servicios — Frontend

Este documento describe la arquitectura de la aplicación web en React/TypeScript, el diseño del cliente de servicios HTTP, el esquema de servidores en desarrollo frente a producción y el mapeo exacto de cada vista con los endpoints REST del backend.

---

## Índice

1. [Arquitectura Modular de la Aplicación SPA](#1-arquitectura-modular-de-la-aplicación-spa)
2. [Capa de Cliente API y Manejo de Errores (`src/api.ts`)](#2-capa-de-cliente-api-y-manejo-de-errores-srcapits)
3. [Arquitectura de Servidores y Proxy](#3-arquitectura-de-servidores-y-proxy)
4. [Módulos Funcionales y Mapeo de Endpoints](#4-módulos-funcionales-y-mapeo-de-endpoints)
5. [Sistema de Estilos y Diseño Responsivo](#5-sistema-de-estilos-y-diseño-responsivo)

---

## 1. Arquitectura Modular de la Aplicación SPA

El frontend sigue una arquitectura plana y modular dentro de `src/` sin enrutadores externos complejos, controlando las secciones desde el estado principal de `App.tsx`:

```text
src/main.tsx
  ├── Carga secuencial CSS: styles.css -> forms.css -> branding.css -> responsive.css
  └── Renderiza <App /> (src/App.tsx)
        ├── Shell global: barra lateral fija (.sidebar), barra superior (.topbar), notificaciones (.notice)
        ├── Sección 'catalog'        -> Explorar datos + Datastore CKAN + DatasetAnalysisPanel (App.tsx)
        ├── Sección 'workbench'      -> Procesamiento: Resumen, Mapas (+ descarga STL/OBJ/GLB/ZIP) y Exportaciones
        ├── Sección 'indicators'     -> <IndicatorsSection /> (src/IndicatorsSection.tsx)
        ├── Sección 'analytics'      -> <AnalyticsSection />  (src/AnalyticsSection.tsx)
        └── Sección 'visualizations' -> <VisualizationsSection /> (src/VisualizationsSection.tsx)
```

### Decisiones clave de diseño

- **Sin estado global externo**: el estado reside localmente por sección y se comunica mediante props tipadas (`onNotify`, `onOpenVizForIndicator`), evitando dependencias innecesarias.
- **Navegación cruzada fluida**: desde *Explorar datos* un recurso procesado en Parquet puede enviarse directamente a *Procesamiento -> Resumen*; desde *Indicadores socioeconómicos* y *Ciencia de datos* un indicador puede abrirse directamente en *Visualizaciones -> Cartografía y modelos 3D*.
- **Cero datos simulados**: ante fallos de red con CKAN o endpoints remotos se notifica al usuario mediante `.notice` con opción de reintento, conservando únicamente listas de respaldo mínimas donde corresponde (`fallbackGroups`, `fallbackMapIndicators`).

---

## 2. Capa de Cliente API y Manejo de Errores (`src/api.ts`)

Todas las peticiones HTTP están centralizadas en `src/api.ts`:

1. **Base configurable**: resuelve `API_BASE` desde `import.meta.env.VITE_API_BASE_URL` con respaldo en `/api/v1`.
2. **Helper `request<T>` con `AbortController`**:
   - Aplica timeout de `70s` para catálogo/mapas y `120s` para conversión y análisis completo de datasets (`/proceso/dataset/{slug}/analizar`).
   - Parsea respuestas de error JSON de FastAPI (`detail` en texto o arreglo de errores de validación 422) y lanza mensajes descriptivos en español.
3. **Constructores de URLs multimedia/binarias (`resolveApiUrl`, `process3dModelUrl`, `visualizationUrl`, `visualization3dModelUrl`)**:
   - Garantizan que tanto `<iframe>` (Plotly, Deck.gl, Folium), `<img>` (Blender PNG) como enlaces de descarga (`<a download>` para `.STL`, `.OBJ`, `.GLB`, `.ZIP` y archivos originales) funcionen tanto tras proxy relativo (`/api/v1`) como ante URL externa absoluta.

---

## 3. Arquitectura de Servidores y Proxy

### Entorno de Desarrollo

- **Frontend**: `vite dev` escucha en `http://localhost:5173`.
- **Proxy Vite (`vite.config.ts`)**: intercepta cualquier solicitud `/api/*` del navegador y la reenvía al backend (`VITE_API_PROXY_TARGET`, por defecto `http://localhost:8000`) con `changeOrigin: true`, eliminando problemas de CORS durante el desarrollo.

### Entorno de Producción (Docker + Nginx)

- **Etapa Build (`node:22-alpine`)**: compila TypeScript y empaqueta estáticos en `/app/dist`.
- **Servidor HTTP (`nginx:1.27-alpine`)**:
  - Sirve `/` con fallback SPA (`try_files $uri $uri/ /index.html`).
  - Enruta `/api/` hacia `http://api:8000/api/` con `proxy_read_timeout 180s` (suficiente para descargas CKAN iniciales y renderizados Blender complejos).

---

## 4. Módulos Funcionales y Mapeo de Endpoints

### 4.1 Explorar datos (`catalog` en `App.tsx`)

| Funcionalidad en UI | Endpoint Backend | Descripción |
| :--- | :--- | :--- |
| Listado y paginación de conjuntos | `GET /api/v1/ine/conjuntos` | Búsqueda por palabra clave, grupo y paginación (`filas`, `inicio`). |
| Filtro por área temática | `GET /api/v1/ine/grupos` | Carga de áreas temáticas del catálogo INE. |
| Estado de recursos en disco | `GET /api/v1/ine/{slug}/recursos` | Muestra etiquetas de estado (`En disco`, `Remoto` y `Procesado`). |
| Análisis automático y gráficas | `GET /api/v1/proceso/dataset/{slug}/analizar` | Verifica si ya está descargado/procesado, convierte a Parquet, calcula KPIs, estadísticas y series gráficas. |
| Gráfica Plotly externa | `GET /api/v1/proceso/dataset/{slug}/grafica` | Abre la versión interactiva Plotly completa en nueva pestaña. |
| Vista previa rápida | `GET /api/v1/ine/{slug}/vista-previa` | Muestra tabla de las primeras 10 filas del recurso. |
| Verificación remota | `GET /api/v1/ine/{slug}/verificar-cambio/{resource_id}` | Comprueba si el recurso cambió en `datos.ine.gob.gt`. |
| Descarga de recurso | `GET /api/v1/ine/{slug}/descargar/{resource_id}` | Descarga el archivo desde caché local o portal INE. |
| Consulta CKAN Datastore | `POST /api/v1/ine/datastore/consulta` y `consulta-sql` | Búsqueda en línea por texto libre o SQL sin bajar el archivo completo. |

### 4.2 Procesamiento (`workbench` en `App.tsx`)

| Pestaña / Acción | Endpoint Backend | Descripción |
| :--- | :--- | :--- |
| Resumen estadístico Parquet | `POST /api/v1/proceso/resumen` | Agrupa, filtra y grafica frecuencias de archivos `.parquet`. |
| Inspeccionar hojas Excel | `GET /api/v1/proceso/hojas-excel` | Lista hojas disponibles en libros de `data/raw/`. |
| Convertir Excel a Parquet | `POST /api/v1/proceso/convertir` | Transforma hoja Excel a Parquet con compresión `zstd`. |
| Selector de mapas e indicadores | `GET /api/v1/proceso/indicadores-mapa` | Filtra por tema, indicador y año (2024/2025). |
| Generación de mapas | `GET /api/v1/proceso/mapa-html`, `mapa-plotly`, `mapa-3d-relieve` | Visor embebido Folium, Plotly o relieve 3D Deck.gl. |
| Descarga 3D en Mapas y Exportaciones | `GET /api/v1/proceso/modelo-3d-impresion` | Descarga directa del modelo 3D del mapa activo en `.STL`, `.OBJ`, `.GLB` o `.ZIP` con selector de color y base. |
| Renderizado Blender PNG | `GET /api/v1/proceso/render-3d-blender` | Generación de imagen de estudio desde Blender. |

### 4.3 Indicadores socioeconómicos (`src/IndicatorsSection.tsx`)

| Pestaña / Acción | Endpoint Backend | Descripción |
| :--- | :--- | :--- |
| Tabla departamental (22) | `GET /api/v1/indicadores/departamentales` | Filtro por región SEGEPLAN, ordenamiento por cualquiera de los indicadores y dirección asc/desc. |
| Ficha departamental enriquecida | `GET /api/v1/indicadores/departamentales/{codigo_o_nombre}` | Búsqueda por nombre/ISO/código con las 39 variables por dominio, clúster K-Means, coordenadas PCA y perfil radar embebido. |
| Tabla municipal (340) | `GET /api/v1/indicadores/municipales` | Filtro por departamento, ordenamiento y paginación servidor-cliente. |
| Consulta puntual municipal | `GET /api/v1/indicadores/municipales/{muni_code}` | Búsqueda directa por código INE de 4 dígitos (ej. `0101`). |
| Catálogo metodológico | `GET /api/v1/indicadores/fichas-metodologicas` | 18 fichas técnicas filtrables por dominio y término de búsqueda. |

### 4.4 Ciencia de datos (`src/AnalyticsSection.tsx`)

| Pestaña / Acción | Endpoint Backend | Descripción |
| :--- | :--- | :--- |
| Vulnerabilidad territorial | `GET /api/v1/analisis/vulnerabilidad` | Ranking IVST 1–22 con conteos por nivel y gráfica comparativa embebida. |
| Descriptivo y atípicos | `GET /api/v1/analisis/descriptivo`, `analisis/outliers` | Valores atípicos (`Z-score`/`IQR`), boxplot interactivo y tabla de 34 variables filtrable. |
| Correlaciones bivariadas | `GET /api/v1/analisis/correlaciones` | Controles de significancia ($p < 0.05$), magnitud mínima $\|r\|$, criterio de orden y heatmap Pearson/Spearman. |
| PCA y conglomerados | `GET /api/v1/analisis/pca`, `analisis/clusters` | Varianza explicada, matriz de cargas, espacio 3D PCA y tarjetas de los 4 clústeres K-Means. |
| Proyecciones econométricas | `GET /api/v1/analisis/proyecciones/costo-vida`, `demograficas` | Modelos MCO CBA Urbana/Rural (3, 6, 12 meses), crecimiento 2024–2030 y curvas interactivas. |

### 4.5 Visualizaciones (`src/VisualizationsSection.tsx`)

Consume `GET /api/v1/visualizaciones/catalogo` para poblar dinámicamente selectores e integra las cinco categorías del servidor:
- **Gráficas 3D**: `/visualizaciones/3d/trayectoria-demografica`, `clusters-pca`, `riesgo-multidimensional`, `trayectoria-costo-vida`.
- **Barras y rankings**: `/visualizaciones/barras/ranking-departamental`, `ranking-municipal`, `estructura-demografica`, `composicion-retornados`.
- **Pastel y jerarquía**: `/visualizaciones/pastel/distribucion` (clústeres, sunburst jerárquico, retornados por edad/sexo, educación y víctimas viales).
- **Tendencias y radar**: `/visualizaciones/tendencias/costo-vida`, `ipc`, `crecimiento-demografico`, `correlaciones/heatmap`, `outliers/boxplot`, `perfil/radar`.
- **Cartografía y modelos 3D**: `/visualizaciones/mapa/3d-relieve`, `2d-plotly`, `2d-folium`, `render-blender` (previsualización `<img>` + descarga PNG) y `modelo-3d` (descarga directa `.STL`, `.OBJ`, `.GLB`, `.ZIP`).

---

## 5. Sistema de Estilos y Diseño Responsivo

Las hojas de estilo mantienen separación progresiva sin conflictos:
- `styles.css`: estructura base de rejilla, barra lateral, tarjetas y tablas.
- `forms.css`: selectores e inputs de herramientas.
- `branding.css`: paleta azul institucional INE (`#004080`, `#0080ff`, `#173a5e`, `#f3f8fd`, `#dce8f3`).
- `responsive.css`: escalado tipográfico legible, estilos de paneles de análisis, tablas extensas, fichas metodológicas, barras IVST, barra de descarga 3D, panel Datastore y adaptación móvil (`<= 900px`, `<= 760px`, `<= 480px`, `<= 360px`).
