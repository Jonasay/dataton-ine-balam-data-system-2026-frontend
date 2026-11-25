# Tecnologías y Licencias Open Source — Frontend

Este documento describe la pila tecnológica del frontend web de **Balam Data Systems**, las versiones definidas en [`package.json`](../package.json), la infraestructura de compilación y servidor estático, y el detalle de sus licencias Open Source.

---

## Índice

1. [Resumen del Stack Tecnológico](#1-resumen-del-stack-tecnológico)
2. [Librerías de Producción](#2-librerías-de-producción)
3. [Herramientas de Desarrollo y Compilación](#3-herramientas-de-desarrollo-y-compilación)
4. [Estilos, Visualización Embebida y Tipografía](#4-estilos-visualización-embebida-y-tipografía)
5. [Entorno de Contenedores y Servidor Web](#5-entorno-de-contenedores-y-servidor-web)
6. [Entorno de Desarrollo e Inteligencia Artificial](#6-entorno-de-desarrollo-e-inteligencia-artificial)
7. [Cumplimiento de Licencias Open Source](#7-cumplimiento-de-licencias-open-source)

---

## 1. Resumen del Stack Tecnológico

El frontend está construido como una aplicación SPA ligera sin dependencias de UI pesadas ni librerías externas de enrutamiento o gráficos en el bundle JavaScript. Las gráficas SVG de análisis rápido se renderizan de forma nativa en React, mientras que las visualizaciones interactivas complejas (Plotly 2D/3D, Deck.gl WebGL, Folium y Blender PNG) se consumen directamente desde el backend mediante `<iframe>` e `<img>` seguros.

---

## 2. Librerías de Producción

| Tecnología | Versión declarada / resuelta | Propósito en el proyecto | Licencia Open Source |
| :--- | :--- | :--- | :--- |
| **React** | `^18.3.1` (`18.3.1`) | Librería principal de interfaz basada en componentes funcionales y hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) | MIT |
| **React DOM** | `^18.3.1` (`18.3.1`) | Renderizado declarativo en el DOM del navegador mediante `createRoot` | MIT |

---

## 3. Herramientas de Desarrollo y Compilación

| Tecnología | Versión declarada / resuelta | Propósito en el proyecto | Licencia Open Source |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `~5.7.2` (`5.7.3`) | Verificación estática de tipos estricta (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) para contratos REST y componentes | Apache-2.0 |
| **Vite** | `^6.0.5` (`6.4.6`) | Empaquetador ESM ultrarrápido, servidor de desarrollo con HMR en el puerto `5173` y proxy inverso `/api` | MIT |
| **@vitejs/plugin-react** | `^4.3.4` (`4.7.0`) | Integración oficial de Fast Refresh y JSX (`react-jsx`) en Vite | MIT |
| **@types/react / @types/react-dom** | `^18.3.18` / `^18.3.5` | Definiciones de tipos TypeScript para React 18 | MIT |
| **pnpm / npm** | Gestores Node | Gestión reproducible de dependencias (`pnpm-lock.yaml` y `package-lock.json`) | MIT / Artistic-2.0 |

---

## 4. Estilos, Visualización Embebida y Tipografía

| Recurso / Tecnología | Ubicación / Carga | Propósito en el proyecto | Licencia Open Source |
| :--- | :--- | :--- | :--- |
| **CSS3 Modular Nativo** | `styles.css`, `forms.css`, `branding.css`, `responsive.css` | Sistema de diseño institucional sin frameworks CSS externos, con rejillas CSS Grid/Flexbox y breakpoints (`1100px`, `900px`, `760px`, `600px`, `480px`, `360px`) | Proyecto / Estándar W3C |
| **SVG Nativo en React** | `src/App.tsx` (`DatasetChartCard`) | Gráficas vectoriales de donas, barras horizontales y líneas temporales para exploración inmediata de datasets | Estándar W3C |
| **Public Sans** | Google Fonts CDN (`styles.css`) | Tipografía principal de lectura e interfaz diseñada originalmente para portales gubernamentales/estadísticos | SIL Open Font License 1.1 (OFL-1.1) |
| **IBM Plex Mono** | Google Fonts CDN (`styles.css`) | Tipografía monoespaciada para códigos INE, rutas Parquet, fórmulas, badges y cifras tabulares | SIL Open Font License 1.1 (OFL-1.1) |

---

## 5. Entorno de Contenedores y Servidor Web

| Componente | Versión en `Dockerfile` | Propósito en el proyecto | Licencia Open Source |
| :--- | :--- | :--- | :--- |
| **Node.js** | `node:22-alpine` | Entorno de compilación para ejecutar `npm ci` y `npm run build` | MIT |
| **Nginx** | `nginx:1.27-alpine` | Servidor HTTP estático de producción para `/usr/share/nginx/html` y proxy inverso `/api/` hacia el backend FastAPI | BSD-2-Clause |

---

## 6. Entorno de Desarrollo e Inteligencia Artificial

El desarrollo del frontend contó con herramientas de ingeniería asistida por inteligencia artificial, claramente separadas de las librerías Open Source compiladas en el paquete estático `dist/`:

| Herramienta / Agente | Rol en el proyecto | Alcance y buenas prácticas | Naturaleza / Licencia |
| :--- | :--- | :--- | :--- |
| **Antigravity** | Entorno de desarrollo integrado (IDE) agéntico | Utilizado para la estructuración de componentes React/TypeScript, integración con la API FastAPI, verificación visual y documentación | Herramienta propietaria de desarrollo (Google Deepmind); no se empaqueta en el bundle final |
| **Gemini** | Agente de inteligencia artificial | Empleado como agente de IA para asistencia en diseño de interfaces, tipado estricto en TypeScript, exportación de modelos 3D e integración de gráficas | Modelo y servicio propietario de Google; no requiere exponer ni quemar claves API en el código fuente del cliente |

---

## 7. Cumplimiento de Licencias Open Source

Todas las librerías, herramientas de compilación, tipografías y servidores empleados en el frontend utilizan licencias Open Source permisivas compatibles entre sí (**MIT**, **Apache-2.0**, **BSD-2-Clause** y **SIL OFL 1.1**), lo que permite su compilación, redistribución y despliegue institucional sin restricciones copyleft sobre el código de la aplicación.
