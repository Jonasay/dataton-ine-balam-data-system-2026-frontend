# Balam Data Systems — Frontend Web (Datatón INE Guatemala 2026)

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat-square)](#5-requisitos-previos)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat-square)](./docs/TECNOLOGIAS.md)
[![Vite](https://img.shields.io/badge/Vite-6.4.6-646CFF.svg?style=flat-square)](./docs/TECNOLOGIAS.md)
[![Nginx](https://img.shields.io/badge/Nginx-1.27-009639.svg?style=flat-square)](#64-despliegue-con-docker-y-nginx)

Aplicación web SPA desarrollada en **React**, **TypeScript** y **Vite** para explorar el catálogo estadístico del **Instituto Nacional de Estadística (INE)** de Guatemala, procesar conjuntos en Apache Parquet, consultar indicadores departamentales y municipales, analizar modelos de ciencia de datos y generar visualizaciones 2D, relieves 3D, renders Blender y modelos imprimibles `.STL` / `.OBJ`.

---

## Tabla de Contenidos

1. [Índice de Documentación Especializada](#1-índice-de-documentación-especializada)
2. [Descripción del Proyecto](#2-descripción-del-proyecto)
3. [Arquitectura Resumida y Comunicación con el Servidor](#3-arquitectura-resumida-y-comunicación-con-el-servidor)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Requisitos Previos](#5-requisitos-previos)
6. [Instalación y Levantamiento Paso a Paso](#6-instalación-y-levantamiento-paso-a-paso)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Compilación y Verificación](#8-compilación-y-verificación)
9. [Integración con el Backend](#9-integración-con-el-backend)

---

## 1. Índice de Documentación Especializada

Para mantener esta guía enfocada en la puesta en marcha de la aplicación web, los detalles técnicos específicos están organizados en los siguientes documentos:

| Documento | Alcance | Enlace |
| :--- | :--- | :--- |
| **Tecnologías y Licencias Open Source** | Stack completo de dependencias de React, TypeScript, Vite, Nginx, tipografías, entorno Antigravity / Gemini y licencias. | [docs/TECNOLOGIAS.md](./docs/TECNOLOGIAS.md) |
| **Arquitectura y Consumo de Servicios** | Diseño modular de la SPA, cliente API centralizado (`src/api.ts`), flujo de proxy en desarrollo/producción y mapa completo de módulos con endpoints consumidos. | [docs/ARQUITECTURA_Y_SERVICIOS.md](./docs/ARQUITECTURA_Y_SERVICIOS.md) |
| **Guía de Errores y Soluciones** | Diagnóstico y resolución de problemas frecuentes al levantar Vite, conectar con FastAPI, compilar TypeScript o ejecutar en Docker/Nginx. | [docs/ERRORES_Y_SOLUCIONES.md](./docs/ERRORES_Y_SOLUCIONES.md) |

---

## 2. Descripción del Proyecto

**Balam Data Systems — Frontend** ofrece una interfaz institucional unificada dividida en cinco áreas de navegación principal:

- **Explorar datos**: búsqueda y filtrado de conjuntos oficiales del INE, verificación de caché en disco (`En disco` / `Procesado`), vista previa tabular, consulta directa por texto en CKAN Datastore y generación automática de gráficas sobre Parquet.
- **Procesamiento**: conversión de libros Excel a Parquet, resúmenes agrupados sin SQL, generación de mapas coropléticos 2D (Folium/Plotly) y relieves 3D (Deck.gl), renders con Blender y botones directos de descarga de mallas tridimensionales (`.STL`, `.OBJ`, `.GLB`, `.ZIP`).
- **Indicadores socioeconómicos**: tablas ordenables y fichas enriquecidas de los 22 departamentos (39 variables + clúster/PCA + radar), consulta paginada de los 340 municipios (24 variables) y catálogo de las 18 fichas metodológicas oficiales.
- **Ciencia de datos**: tablero de análisis inferencial con ranking del Índice de Vulnerabilidad Socioeconómica Territorial (IVST), detección de valores atípicos (`Z-score`/`IQR`), estadísticas descriptivas de 34 variables, matriz de correlaciones filtrable (Pearson/Spearman), cargas PCA, conglomerados K-Means y proyecciones de Canasta Básica y demografía 2024–2030.
- **Visualizaciones**: estudio interactivo organizado en `Gráficas 3D`, `Barras y rankings`, `Pastel y jerarquía`, `Tendencias y radar` y `Cartografía y modelos 3D` (con render PNG en Blender y exportación directa `.STL`, `.OBJ`, `.GLB` y `.ZIP`).

---

## 3. Arquitectura Resumida y Comunicación con el Servidor

```text
+-------------------------------------------------------------------------+
|                NAVEGADOR WEB (React 18 + TypeScript SPA)                |
|  - App.tsx (Navegación lateral, Explorar datos, Procesamiento)          |
|  - IndicatorsSection / AnalyticsSection / VisualizationsSection         |
|  - api.ts (Cliente Fetch tipado y constructores de URLs 2D/3D/Blender)  |
+------------------------------------+------------------------------------+
                                     | Peticiones a /api/v1/*
        +----------------------------+----------------------------+
        | Desarrollo (Vite :5173)                                 | Producción (Nginx :80)
        v                                                         v
+------------------------------+                         +------------------------------+
| Vite Dev Proxy               |                         | Nginx Reverse Proxy          |
| /api -> VITE_API_PROXY_TARGET|                         | /api/ -> http://api:8000/api/|
+--------------+---------------+                         +--------------+---------------+
               |                                                        |
               +----------------------------+---------------------------+
                                            v
+-------------------------------------------------------------------------+
|                    BACKEND FASTAPI (Puerto 8000)                        |
|        Catálogo INE · ETL Parquet · Indicadores · Ciencia de Datos      |
+-------------------------------------------------------------------------+
```

Para la arquitectura interna de módulos, proxy de servidores y matriz de consumo de endpoints, consulta [docs/ARQUITECTURA_Y_SERVICIOS.md](./docs/ARQUITECTURA_Y_SERVICIOS.md).

---

## 4. Estructura del Proyecto

```text
dataton-ine-balam-data-system-2026-frontend/
├── index.html                        # Documento HTML base y metadatos institucionales
├── package.json                      # Manifiesto de scripts y dependencias Node
├── package-lock.json                 # Lockfile para npm (usado por Dockerfile)
├── pnpm-lock.yaml                    # Lockfile para pnpm en desarrollo local
├── pnpm-workspace.yaml               # Configuración de workspace pnpm
├── tsconfig.json                     # Referencias de configuración TypeScript
├── tsconfig.app.json                 # Compilador estricto para src/
├── tsconfig.node.json                # Compilador para vite.config.ts
├── vite.config.ts                    # Servidor Vite (:5173) y proxy /api -> FastAPI
├── .env.example                      # Plantilla de variables de entorno
├── Dockerfile                        # Build multietapa Node 22 + servidor Nginx 1.27
├── nginx.conf                        # Reglas SPA y proxy inverso /api/ -> api:8000
├── docs/                             # Documentación modular del frontend
│   ├── TECNOLOGIAS.md                # Stack técnico y licencias Open Source
│   ├── ARQUITECTURA_Y_SERVICIOS.md   # Arquitectura SPA y mapa de endpoints consumidos
│   ├── EQUIPO.md                     # Equipo de desarrollo y roles
│   └── ERRORES_Y_SOLUCIONES.md       # Solución de fallos comunes al levantar el frontend
├── public/
│   ├── favicon.ico                   # Icono del navegador
│   └── ine.png                       # Logotipo institucional INE Guatemala
└── src/
    ├── main.tsx                      # Montaje React e importación de hojas de estilo
    ├── api.ts                        # Interfaces TypeScript, cliente fetch y helpers URL
    ├── App.tsx                       # Shell principal, Explorar datos y Procesamiento
    ├── IndicatorsSection.tsx         # Sección Indicadores socioeconómicos
    ├── AnalyticsSection.tsx          # Sección Ciencia de datos
    ├── VisualizationsSection.tsx     # Sección Visualizaciones interactivas y 3D
    ├── styles.css                    # Maquetación base
    ├── forms.css                     # Estilos de formularios
    ├── branding.css                  # Paleta cromática institucional INE
    ├── responsive.css                # Tipografía escalada, módulos nuevos y diseño adaptable
    └── vite-env.d.ts                 # Declaraciones de variables import.meta.env
```

---

## 5. Requisitos Previos

- **Node.js**: versión **20** o superior (en contenedor Docker se utiliza **Node 22 Alpine**).
- **Gestor de paquetes**: [`npm`](https://pnpm.io/) o [`pnpm`](https://pnpm.io/).
- **API Backend FastAPI** ejecutándose en `http://localhost:8000` (o URL definida en `.env`).
- **Opcional para despliegue en contenedor**: Docker Engine.

---

## 6. Instalación y Levantamiento Paso a Paso

### 6.1. Clonar el repositorio

```bash
git clone https://github.com/Jonasay/dataton-ine-balam-data-system-2026-frontend.git
cd dataton-ine-balam-data-system-2026-frontend
```

### 6.2. Configurar variables de entorno

Copia la plantilla `.env.example` hacia `.env`:

```bash
cp .env.example .env
```

Para desarrollo local estándar con backend en `http://localhost:8000`:

```env
VITE_API_PROXY_TARGET=http://localhost:8000
VITE_API_BASE_URL=/api/v1
```

> Nota: si dejas `.env` con las variables vacías, Vite usará igualmente `http://localhost:8000` como destino de proxy y `src/api.ts` usará `/api/v1` por defecto.

### 6.3. Instalar dependencias y levantar en desarrollo
Con **npm**:
```bash
npm install
npm run dev
```

Con **pnpm**:
```bash
pnpm install
pnpm run dev
```

La aplicación quedará disponible en **`http://localhost:5173`**. Asegúrate de haber iniciado previamente el backend FastAPI en el puerto `8000`.

### 6.4. Despliegue con Docker y Nginx

El `Dockerfile` realiza una compilación estática en Node 22 y sirve los activos desde **Nginx 1.27 Alpine** en el puerto `80`:

```bash
docker build -t balam-data-frontend .
docker run -d --name balam-frontend -p 8080:80 balam-data-frontend
```

> Importante: `nginx.conf` redirige `/api/` hacia `http://api:8000/api/`. Si levantas frontend y backend juntos en Docker Compose, ambos servicios deben compartir la misma red Docker y el servicio backend debe llamarse `api` (tal como figura en el `docker-compose.yml` del backend). Si despliegas en servidores separados sin proxy Nginx compartiendo red, compila pasando `--build-arg VITE_API_BASE_URL=https://tu-backend.ejemplo/api/v1`.

---

## 7. Variables de Entorno

| Variable | Uso | Obligatoria | Valor por defecto |
| :--- | :--- | :--- | :--- |
| `VITE_API_PROXY_TARGET` | Destino del proxy `/api` durante `vite dev` en `vite.config.ts` | No | `http://localhost:8000` |
| `VITE_API_BASE_URL` | Prefijo base de peticiones en `src/api.ts` (útil cuando se consume un backend externo sin proxy) | No | `/api/v1` |

---

## 8. Compilación y Verificación

Para validar el tipado estricto de TypeScript (`tsc -b`) y generar el paquete de producción optimizado en `dist/`:

```bash
npm run build
```

O con `pnpm`:

```bash
pnpm run build
```

Para previsualizar localmente la carpeta `dist/` compilada:

```bash
npm run preview
```

---

## 9. Integración con el Backend

Este frontend consume exclusivamente la API versionada de **`dataton-ine-balam-data-system-2026-backend`**. Para aprovechar todas las secciones (`Indicadores socioeconómicos`, `Ciencia de datos` y `Visualizaciones`), el backend debe haber ejecutado previamente sus pipelines `scripts/run_etl_indicators.py` y `scripts/run_data_science.py`.
