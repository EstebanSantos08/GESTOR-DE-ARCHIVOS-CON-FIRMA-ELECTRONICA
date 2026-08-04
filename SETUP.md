# Guía de Instalación y Configuración

## Requisitos Previos

Instalar en el equipo antes de comenzar:

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| **Node.js** | v18+ | https://nodejs.org/ |
| **PostgreSQL** | v14+ | https://www.postgresql.org/download/ |
| **Git** | v2.30+ | https://git-scm.com/ |

---

## 1. Clonar o Descomprimir el Proyecto

Si utilizas Git:

```bash
git clone https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA.git
cd GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA
```

Verifica la estructura de archivos:

```
Gestion de Archivos/
├── back-end/
├── front-end/
├── README.md
├── SETUP.md
└── FLUJO.md
```

---

## 2. Configurar la Base de Datos (PostgreSQL)

1. Abre **pgAdmin** o la consola `psql`.
2. Crea una base de datos vacía llamada `"Gestion_Archivos"`:

```sql
CREATE DATABASE "Gestion_Archivos";
```

> Las tablas de Sequelize se crean automáticamente en la base de datos al iniciar el servidor backend por primera vez (`alter: true`).

---

## 3. Configurar el Backend (`back-end`)

### 3.1 Instalar dependencias

Abre una terminal en la carpeta `back-end` y ejecuta:

```bash
cd back-end
npm install
```

### 3.2 Crear y editar el archivo `.env`

Crea el archivo `.env` dentro de la carpeta `back-end/`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / Mac:**
```bash
cp .env.example .env
```

Contenido de `back-end/.env`:

```env
# ── Base de datos PostgreSQL ──────────────────────────────
DB_HOST=localhost
DB_PORT=5432          # Cambiar a 5433 si PostgreSQL usa ese puerto
DB_NAME=Gestion_Archivos
DB_USER=postgres
DB_PASSWORD=tu_contraseña_postgres

# ── Autenticación JWT ─────────────────────────────────────
JWT_SECRET=gestion_archivos_jwt_secret_2026
JWT_EXPIRES_IN=8h

# ── Servidor ─────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Archivos y Certificados ───────────────────────────────
UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

---

## 4. Poblar la Base de Datos con Criterios e Indicadores

Ejecuta los dos scripts de inicialización de datos en el orden indicado:

```bash
cd back-end

# 1. Crear roles, universidad inicial, facultad, carrera y usuarios base
node seed.js

# 2. Insertar los 5 Criterios y 31 Indicadores de acreditación con sus responsables
node seed-criterios.js
```

**Salida esperada en consola**:
```
✅ Conectado a PostgreSQL
🎉 Seed completado exitosamente con 7 niveles.
🎉 Seed de Criterios e Indicadores completado exitosamente (5 Criterios, 31 Indicadores).
```

---

## 5. Configurar el Frontend (`front-end`)

Abre otra terminal en la carpeta `front-end` y ejecuta:

```bash
cd front-end
npm install
```

---

## 6. Ejecutar la Aplicación

Debes mantener **dos terminales abiertas**:

**Terminal 1 — Backend:**
```bash
cd back-end
npm run dev
```
*Servidor corriendo en `http://localhost:3000`*

**Terminal 2 — Frontend:**
```bash
cd front-end
npm run dev
```
*Frontend disponible en `http://localhost:5173`*

---

## 7. Usuarios y Credenciales de Prueba

| Rol | Correo electrónico | Contraseña |
|-----|-------------------|------------|
| `ADMINISTRADOR` | `admin@universidad.edu` | `Admin123!` |
| `RECTOR` | `rector@universidad.edu` | `Rector123!` |
| `DECANO` | `decano@universidad.edu` | `Decano123!` |
| `SUBDECANO` | `subdecano@universidad.edu` | `Subdecano123!` |
| `DIRECTOR_CARRERA` | `director@universidad.edu` | `Director123!` |
| `DOCENTE` | `docente@universidad.edu` | `Docente123!` |
| `RESPONSABLE_AREA` | `agalarza@universidad.edu` | `Galarza123!` |
| `RESPONSABLE_AREA` | `oalvarez@universidad.edu` | `Alvarez123!` |

---

## 🛠️ Solución de Problemas Frecuentes

### 1. Error: `connect ECONNREFUSED 127.0.0.1:5432`
PostgreSQL no está en ejecución. Inicia el servicio de PostgreSQL desde Servicios de Windows (`services.msc`) o con `sudo service postgresql start` en Linux.

### 2. Error: `database "Gestion_Archivos" does not exist`
Asegúrate de haber creado la base de datos vacía en PostgreSQL antes de ejecutar el servidor (Paso 2).

### 3. Error al firmar documentos: `Error al cargar certificado`
Verifica que exista un certificado `.p12` válido en `back-end/certs/` y que la contraseña en `CERT_P12_PASSWORD` sea la correcta.

