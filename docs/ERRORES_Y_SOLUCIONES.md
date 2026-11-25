# Guía de Errores Frecuentes y Soluciones — Frontend

Este documento detalla los inconvenientes más comunes al instalar dependencias, levantar el servidor Vite, compilar el proyecto o conectar el frontend con la API FastAPI del backend, junto con su solución recomendada.

---

## Índice

1. [Error `ECONNREFUSED localhost:8000` o fallos 500 en `/api/v1/*` durante desarrollo](#1-error-econnrefused-localhost8000-o-fallos-500-en-apiv1-durante-desarrollo)
2. [Error `503` al abrir `Indicadores socioeconómicos` o `Ciencia de datos`](#2-error-503-al-abrir-indicadores-socioeconómicos-o-ciencia-de-datos)
3. [Error en Nginx `502 Bad Gateway` dentro de Docker](#3-error-en-nginx-502-bad-gateway-dentro-de-docker)
4. [Problemas de CORS al usar `VITE_API_BASE_URL` directo](#4-problemas-de-cors-al-usar-vite_api_base_url-directo)
5. [Conflictos con el puerto `5173` ocupado](#5-conflictos-con-el-puerto-5173-ocupado)
6. [Diferencias entre `pnpm install` y `npm ci` en Dockerfile](#6-diferencias-entre-pnpm-install-y-npm-ci-en-dockerfile)
7. [Timeouts al analizar un conjunto grande o consultar CKAN](#7-timeouts-al-analizar-un-conjunto-grande-o-consultar-ckan)
8. [Error al cargar imágenes de Blender PNG o descargar `.STL`/`.OBJ`](#8-error-al-cargar-imágenes-de-blender-png-o-descargar-stlobj)

---

## 1. Error `ECONNREFUSED localhost:8000` o fallos 500 en `/api/v1/*` durante desarrollo

- **Síntoma**: en la consola de Vite aparece `[vite] http proxy error: ... ECONNREFUSED 127.0.0.1:8000` y en la pantalla del navegador se muestra un aviso rojo de error al cargar conjuntos o mapas.
- **Causa**: el servidor backend FastAPI no está levantado en el puerto `8000` o corre en otro puerto distinto al configurado en `VITE_API_PROXY_TARGET`.
- **Solución**:
  1. Inicia el backend desde `dataton-ine-balam-data-system-2026-backend`:
     ```bash
     fastapi dev main.py --port 8000
     ```
  2. Si el backend corre en otro puerto (ej. `8080`), define en `.env` del frontend:
     ```env
     VITE_API_PROXY_TARGET=http://localhost:8080
     ```
  3. Reinicia `pnpm run dev` tras modificar `.env`.

---

## 2. Error `503` al abrir `Indicadores socioeconómicos` o `Ciencia de datos`

- **Síntoma**: las tablas departamentales, municipales o de IVST muestran un mensaje de error indicando que faltan matrices calculadas.
- **Causa**: el backend está en ejecución, pero aún no se han generado los archivos Parquet procesados en `data/processed/indicadores/` y `data/processed/analisis/`.
- **Solución**:
  En la terminal del **backend**, ejecuta una sola vez los dos scripts de generación:
  ```bash
  python scripts/run_etl_indicators.py
  python scripts/run_data_science.py
  ```
  Luego recarga la pestaña en el navegador.

---

## 3. Error en Nginx `502 Bad Gateway` dentro de Docker

- **Síntoma**: al servir la imagen construida con `Dockerfile`, las vistas estáticas cargan pero las peticiones a `/api/v1/...` devuelven `502`.
- **Causa**: `nginx.conf` apunta a `proxy_pass http://api:8000/api/;`, lo que requiere que el contenedor del frontend esté en la misma red Docker que un contenedor llamado `api` escuchando en el puerto `8000`.
- **Solución**:
  - Une ambos contenedores bajo una misma red Docker con el nombre de servicio `api` para el backend.
  - O bien reconstruye el frontend apuntando directamente al endpoint público del backend:
    ```bash
    docker build --build-arg VITE_API_BASE_URL=https://api.tudominio.com/api/v1 -t balam-data-frontend .
    ```

---

## 4. Problemas de CORS al usar `VITE_API_BASE_URL` directo

- **Síntoma**: el navegador bloquea peticiones cuando `VITE_API_BASE_URL` apunta a un dominio o puerto diferente sin pasar por proxy.
- **Causa**: configuración de proxy omitida o backend ejecutando una versión previa sin `CORSMiddleware`.
- **Solución**:
  En desarrollo local mantén `VITE_API_BASE_URL=/api/v1` (valor recomendado) para usar el proxy nativo de Vite en `/api` y evitar tráfico cross-origin innecesario. Verifica que el backend tenga habilitado CORS en `main.py`.

---

## 5. Conflictos con el puerto `5173` ocupado

- **Síntoma**: Vite indica que el puerto `5173` está ocupado o abre la aplicación en `5174`.
- **Causa**: ya existe una instancia previa de `vite` corriendo en segundo plano.
- **Solución**:
  Cierra la instancia anterior o especifica un puerto distinto al iniciar:
  ```bash
  pnpm run dev -- --port 5174
  ```

---

## 6. Diferencias entre `pnpm install` y `npm ci` en Dockerfile

- **Síntoma**: la construcción Docker (`npm ci`) falla después de agregar o actualizar un paquete usando `pnpm`.
- **Causa**: el `Dockerfile` copia `package.json` y `package-lock.json` para ejecutar `npm ci`, mientras que en desarrollo local se utiliza `pnpm-lock.yaml`.
- **Solución**:
  Siempre que modifiques dependencias en `package.json` con `pnpm`, actualiza también `package-lock.json` antes de construir la imagen Docker:
  ```bash
  npm install --package-lock-only
  ```

---

## 7. Timeouts al analizar un conjunto grande o consultar CKAN

- **Síntoma**: aparece el mensaje `"El servicio de datos tardó demasiado en responder. Intenta nuevamente."` al abrir un conjunto por primera vez o usar Datastore CKAN.
- **Causa**: la primera descarga de archivos Excel voluminosos (ej. Nacimientos 2025 ~39 MB) desde `datos.ine.gob.gt` o una caída momentánea de la API CKAN supera la ventana de espera inicial.
- **Solución**:
  - Vuelve a intentar pasados unos segundos; si el archivo ya quedó guardado parcialmente o en caché local (`En disco`), las siguientes consultas no vuelven a descargarlo.
  - Si un recurso retorna error al usar **Consulta directa en Datastore CKAN**, significa que el archivo en el portal del INE no está indexado en Datastore; utiliza **Ver gráficas** o **Vista previa**, que leen directamente el archivo XLSX/CSV descargado.

---

## 8. Error al cargar imágenes de Blender PNG o descargar `.STL`/`.OBJ`

- **Síntoma**: el bloque **Render Blender PNG** muestra aviso de error al cargar imagen, o falla la generación de mapas/modelos 3D.
- **Causa**:
  - Para **Render Blender PNG**, el servidor backend necesita tener instalado **Blender** en el entorno o ejecutarse vía Docker (`Dockerfile` del backend).
  - Para **`.STL` / `.OBJ` / `.GLB`**, el backend requiere que existan los archivos Parquet del indicador y `data/raw/geo/departamentos_gt.geojson`.
- **Solución**:
  1. Si necesitas renders PNG, verifica que Blender esté disponible en el backend (`blender --version`) o utiliza el contenedor Docker del backend.
  2. Descarga modelos `.STL` u `.OBJ` desde la pestaña **Mapas** o **Visualizaciones -> Cartografía y modelos 3D**; estos no dependen de Blender y se generan directamente con Trimesh en Python.
