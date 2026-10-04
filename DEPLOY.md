# 🚀 Guía de Despliegue

## Stack de producción

| Componente | Plataforma | URL de ejemplo |
|---|---|---|
| **Backend** (Node.js/Express) | [Render](https://render.com) | `https://gestor-archivos-api.onrender.com` |
| **Base de datos** (PostgreSQL) | Render Managed PostgreSQL | *(interna, enlazada automáticamente)* |
| **Frontend** (React/Vite) | [Cloudflare Pages](https://pages.cloudflare.com) | `https://gestor-archivos.pages.dev` |

---

## 1 · Backend en Render

### Opción A — Blueprint automático (recomendado)

Render puede leer el archivo `render.yaml` y crear todos los servicios
(API + base de datos) con un solo clic.

1. Ve a **<https://dashboard.render.com/blueprints>**
2. Haz clic en **"New Blueprint Instance"**
3. Conecta tu repositorio de GitHub/GitLab
4. Render detectará el `render.yaml` automáticamente
5. Configura las **variables de entorno secretas** (ver sección de variables abajo)
6. Haz clic en **"Apply"**

---

### Opción B — Creación manual

#### 1.1 Crear la base de datos

1. Dashboard → **New** → **PostgreSQL**
2. Nombre: `gestor-archivos-db`
3. Región: Oregon (o Frankfurt)
4. Plan: Free (desarrollo) / Starter (producción)
5. Copia la **"Internal Database URL"** que se genera

#### 1.2 Crear el servicio web

1. Dashboard → **New** → **Web Service**
2. Conecta tu repositorio
3. Configura:
   - **Root Directory**: `back-end`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Region**: la misma que la BD
   - **Plan**: Free (desarrollo) / Starter (producción)

#### 1.3 Variables de entorno del backend

En **Environment** del servicio web, añade:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(pega la "Internal Database URL" de la BD)* |
| `JWT_SECRET` | *(cadena aleatoria larga — usa "Generate Value")* |
| `JWT_EXPIRES_IN` | `8h` |
| `FRONTEND_URL` | `https://tu-app.pages.dev` *(tu URL de Cloudflare Pages)* |
| `UPLOADS_DIR` | `./uploads` |
| `CERTS_DIR` | `./certs` |
| `MAX_FILE_SIZE_MB` | `10` |
| `CERT_P12_PATH` | *(opcional, si usas firma institucional)* |
| `CERT_P12_PASSWORD` | *(opcional, si usas firma institucional)* |

> [!WARNING]
> El plan **Free** de Render **no tiene disco persistente**. Los archivos subidos
> (PDFs) se perderán al reiniciar el servicio. Para producción real, usa el plan
> **Starter** y activa el disco, o migra el almacenamiento a Cloudflare R2 / AWS S3.

> [!NOTE]
> El servicio Free de Render **hiberna** tras 15 minutos de inactividad. La primera
> petición después de la hibernación puede tardar ~30 s. Para evitarlo, usa el plan
> Starter o configura un uptime monitor.

---

## 2 · Frontend en Cloudflare Pages

### 2.1 Conectar el repositorio

1. Ve a **<https://dash.cloudflare.com>** → **Pages** → **Create a project**
2. Selecciona **"Connect to Git"** y autoriza tu repositorio
3. Configura el build:

| Campo | Valor |
|---|---|
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `front-end` |

### 2.2 Variables de entorno del frontend

En **Settings → Environment Variables** de tu proyecto de Pages, añade:

| Variable | Valor (Production) |
|---|---|
| `VITE_API_URL` | `https://gestor-archivos-api.onrender.com/api` |

> [!IMPORTANT]
> El prefijo `VITE_` es obligatorio para que Vite exponga la variable al código
> del navegador. Variables sin ese prefijo serán ignoradas en el build.

### 2.3 Volver a desplegar

Después de añadir la variable de entorno, haz **"Retry deployment"** en el último
deploy para que el build recoja la nueva variable.

---

## 3 · Orden de despliegue recomendado

```
1. Desplegar backend en Render  →  copia la URL (ej: https://gestor-archivos-api.onrender.com)
2. Configurar VITE_API_URL en Cloudflare Pages con esa URL
3. Desplegar frontend en Cloudflare Pages  →  copia la URL (ej: https://gestor-archivos.pages.dev)
4. Volver a Render  →  actualizar FRONTEND_URL con la URL de Cloudflare Pages
5. Render redesplegará automáticamente (o haz "Manual Deploy")
```

---

## 4 · Inicialización de la base de datos

Render ejecuta solo `npm start`. Para correr los seeds en producción, usa la
**Shell** de Render (pestaña "Shell" del servicio) después del primer despliegue:

```bash
# Desde la Shell de Render
npm run seed:base       # Datos base (roles, permisos)
npm run seed:criterios  # Criterios de evaluación
npm run seed:carreras   # Carreras de demo (opcional)

# O todo de una vez:
npm run seed:all
```

---

## 5 · Verificar el despliegue

```bash
# Health check del backend
curl https://gestor-archivos-api.onrender.com/api/health
# Respuesta esperada: {"estado":"OK","timestamp":"..."}
```

El frontend estará disponible en tu URL de Cloudflare Pages. Verifica que puedas
hacer login y que las llamadas a la API no den errores de CORS.

---

## 6 · Actualizaciones futuras

- **Backend**: cada `git push` a la rama principal redesplegará Render automáticamente.
- **Frontend**: cada `git push` redesplegará Cloudflare Pages automáticamente.
- No es necesario hacer nada manual en despliegues de rutina.

---

## 7 · URLs y Accesos del Sistema Desplegado

| Servicio | URL Pública | Estado |
| :--- | :--- | :--- |
| **Frontend (Cloudflare Pages)** | [https://gestor-archivos-ahx.pages.dev](https://gestor-archivos-ahx.pages.dev) | 🟢 Activo |
| **Backend API (Render)** | [https://gestor-archivos-api.onrender.com](https://gestor-archivos-api.onrender.com) | 🟢 Activo |
| **Health Check API** | [https://gestor-archivos-api.onrender.com/api/health](https://gestor-archivos-api.onrender.com/api/health) | 🟢 Activo |

### Credenciales de acceso de prueba:
- **Administrador**: `admin@universidad.edu` / `Admin123!`
- **Rector**: `rector@universidad.edu` / `Rector123!`
- **Decano**: `decano@universidad.edu` / `Decano123!`
- **Subdecano**: `subdecano@universidad.edu` / `Subdecano123!`
- **Director de Carrera**: `director@universidad.edu` / `Director123!`
- **Docente**: `docente@universidad.edu` / `Docente123!`
- **Responsable de Área**: `responsable@universidad.edu` / `Responsable123!`

