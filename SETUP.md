# Guía de instalación y configuración

## Requisitos previos

Instalar en la PC antes de comenzar:

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| Node.js | v18+ | https://nodejs.org/ |
| PostgreSQL | v14+ | https://www.postgresql.org/download/ |

> Git no es necesario si recibes el proyecto como `.zip`.

---

## 1. Descomprimir el proyecto

Si recibiste el proyecto en `.zip`, extráelo en una carpeta de tu preferencia, por ejemplo:

```
C:\proyectos\Gestion de Archivos\
```

Verifica que la estructura quede así:

```
Gestion de Archivos/
├── back-end/
├── front-end/
├── README.md
├── SETUP.md
└── FLUJO.md
```

---

## 2. Configurar la base de datos

Abre **pgAdmin** o **psql** y ejecuta:

```sql
CREATE DATABASE "Gestion_Archivos";
```

> Las tablas se crean automáticamente al iniciar el servidor por primera vez (Sequelize sync con `alter: true`).

---

## 3. Configurar el Backend

### 3.1 Instalar dependencias

Abre una terminal en la carpeta `back-end` y ejecuta:

```bash
cd back-end
npm install
```

### 3.2 Crear el archivo `.env`

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / Mac:**
```bash
cp .env.example .env
```

### 3.3 Editar `.env`

Abre el archivo `.env` con cualquier editor de texto y completa los valores:

```env
# ── Base de datos PostgreSQL ──────────────────────────────
DB_HOST=localhost
DB_PORT=5432          # Cambia a 5433 si tu PostgreSQL usa ese puerto
DB_NAME=Gestion_Archivos
DB_USER=postgres
DB_PASSWORD=admin     # La contraseña que pusiste al instalar PostgreSQL

# ── JWT ──────────────────────────────────────────────────
JWT_SECRET=gestion_archivos_jwt_secret_2026
JWT_EXPIRES_IN=8h

# ── Servidor ─────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Archivos ─────────────────────────────────────────────
UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

# ── Certificado institucional (firma PAdES) ───────────────
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

> **Nota sobre el puerto PostgreSQL:** Durante la instalación de PostgreSQL en Windows, el instalador permite elegir el puerto. El valor por defecto es `5432`. Si instalaste una segunda instancia, podría ser `5433`. Puedes verificarlo en pgAdmin → Servers → Properties.

---

## 4. Poblar la base de datos con datos de prueba

Desde la carpeta `back-end`, ejecuta el seed para crear los usuarios iniciales:

```bash
node seed.js
```

Verás en consola los usuarios creados:

```
[CREADO] Juan Docente <docente@universidad.edu> — rol: DOCENTE
[CREADO] María Decano <decano@universidad.edu>  — rol: DECANO
[CREADO] Carlos Rector <rector@universidad.edu> — rol: RECTOR
```

---

## 5. Configurar el Frontend

Abre otra terminal en la carpeta `front-end` y ejecuta:

```bash
cd front-end
npm install
```

---

## 6. Ejecutar el proyecto

Necesitas **dos terminales abiertas** al mismo tiempo.

**Terminal 1 — Backend:**

```bash
cd back-end
npm run dev
```

Salida esperada:
```
Conexión a PostgreSQL establecida
Modelos sincronizados con la base de datos
Servidor corriendo en http://localhost:3000
Entorno: development
```

**Terminal 2 — Frontend:**

```bash
cd front-end
npm run dev
```

Salida esperada:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 7. Abrir la aplicación

Abre el navegador en:

```
http://localhost:5173
```

Inicia sesión con uno de los usuarios de prueba:

| Rol | Email | Contraseña |
|-----|-------|------------|
| DOCENTE | docente@universidad.edu | Docente123! |
| DECANO | decano@universidad.edu | Decano123! |
| RECTOR | rector@universidad.edu | Rector123! |

---

## 8. Certificado de firma digital

El proyecto incluye un certificado de prueba en `back-end/certs/`. Para usar un certificado real:

1. Copia tu archivo `.p12` a `back-end/certs/`
2. Actualiza el `.env`:

```env
CERT_P12_PATH=./certs/tu_certificado.p12
CERT_P12_PASSWORD=tu_password_real
```

3. Reinicia el backend.

---

## Solución de problemas frecuentes

### Error: `connect ECONNREFUSED 127.0.0.1:5432`
PostgreSQL no está corriendo. Abre el panel de servicios de Windows (Win + R → `services.msc`) y verifica que el servicio `postgresql-x64-XX` esté iniciado.

### Error: `database "Gestion_Archivos" does not exist`
Ejecuta el paso 2 para crear la base de datos.

### Error: `Cannot find module` al iniciar el backend
Olvidaste ejecutar `npm install` en la carpeta `back-end`. Repite el paso 3.1.

### El frontend carga pero las peticiones fallan (CORS / Network Error)
Verifica que el backend esté corriendo en el puerto `3000`. Revisa la consola del backend buscando errores de conexión a PostgreSQL.

### Puerto en uso (`EADDRINUSE`)
Otro proceso está usando el puerto `3000` o `5173`. Cambia el puerto en `.env` (`PORT=3001`) o cierra el proceso que lo ocupa.

---

## Estructura del proyecto

```
├── back-end/               # API REST (Node.js + Express + Sequelize)
│   ├── Controller/         # Lógica: auth, documento, parametrizacion
│   ├── Middleware/         # JWT auth y RBAC (roles)
│   ├── Model/              # Entidades: Usuario, Documento, Facultad, etc.
│   ├── Routes/             # Endpoints REST
│   ├── Services/           # Servicio de firma PAdES
│   ├── certs/              # Certificados .p12
│   ├── uploads/            # PDFs subidos (se crea al iniciar)
│   ├── seed.js             # Datos de prueba
│   └── server.js           # Punto de entrada
└── front-end/              # Interfaz (React + Vite + Tailwind CSS)
    └── src/
        ├── components/     # Componentes reutilizables
        ├── context/        # Estado global (AppContext)
        └── views/          # Páginas de la aplicación
```
