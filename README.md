# INE Guatemala · Plataforma estadística

Frontend en React, TypeScript y Vite para explorar el catálogo estadístico del Instituto Nacional de Estadística de Guatemala y procesar sus datos.

## Requisitos

- Node.js 20 o posterior
- npm
- API FastAPI disponible en `http://localhost:8000`

## Inicio rápido

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite reenvía `/api` a `http://localhost:8000` para evitar problemas de CORS durante el desarrollo. Para usar otro servidor, define `VITE_API_PROXY_TARGET` antes de iniciar Vite.

## Funcionalidades

- Buscar y filtrar conjuntos del INE; consultar recursos, vista previa, cambios remotos y descargar archivos.
- Consultar recursos tabulares en CKAN Datastore.
- Convertir Excel a Parquet y solicitar resúmenes agrupados.
- Generar mapas Folium, Plotly y Deck.gl; exportar modelos 3D o renders de Blender.

Los mapas, la conversión y las exportaciones utilizan los paths y nombres de parámetros del contrato de API entregado. Los paths geográficos iniciales son `geo/departamentos_gt.geojson`; ajústalos en la API o en `src/App.tsx` si el backend utiliza otra ubicación.
