# Guía de Instalación — Gestor de Archivos con Firma Electrónica

> Sigue los pasos en el orden exacto indicado. Cada sección depende de la anterior.

---

## Prerrequisitos

Instala las siguientes herramientas antes de comenzar:

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| **Node.js** | v18 LTS | https://nodejs.org/ |
| **npm** | v9+ *(incluido con Node.js)* | — |
| **PostgreSQL** | v14+ | https://www.postgresql.org/download/ |
| **Git** | v2.30+ | https://git-scm.com/ |

**Verifica las versiones instaladas:**
```bash
node --version    # debe mostrar v18.x.x o superior
npm --version     # debe mostrar 9.x.x o superior
psql --version    # debe mostrar PostgreSQL 14.x o superior
```

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA.git
cd "GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA"
```

Estructura esperada tras clonar:
```
Gestion de Archivos/
├── back-end/
│   ├── Controller/
│   ├── Middleware/
│   ├── Model/
│   ├── Routes/
│   ├── Services/
│   ├── config/
│   ├── seed.js
│   ├── seed-criterios.js
│   ├── seed-carreras-demo.js
│   ├── server.js
│   └── .env.example
├── front-end/
│   └── src/
├── .gitignore
├── SETUP.md
├── README.md
└── FLUJO.md
```

---

## Paso 2 — Configurar la Base de Datos (PostgreSQL)

### 2.1 Crear la base de datos

Abre **pgAdmin** o una terminal `psql` y ejecuta:

```sql
CREATE DATABASE gestion_archivos;
```

> Las tablas se crean automáticamente cuando el servidor arranca por primera vez
> gracias a `sequelize.sync({ alter: true })`. **No ejecutes scripts SQL manuales.**

### 2.2 Crear las carpetas de almacenamiento

El servidor necesita estas carpetas para guardar PDFs y certificados.
Créalas desde la raíz del proyecto:

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "back-end\uploads"
New-Item -ItemType Directory -Force -Path "back-end\certs"
```

**Linux / macOS:**
```bash
mkdir -p back-end/uploads back-end/certs
```

---

## Paso 3 — Configurar el Backend

### 3.1 Instalar dependencias

```bash
cd back-end
npm install
```

### 3.2 Crear el archivo `.env`

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

Edita `back-end/.env` con los valores de tu entorno local.
Los campos que **debes ajustar** son:

| Variable | Descripción | Ejemplo típico |
|---|---|---|
| `DB_PORT` | Puerto de PostgreSQL | `5432` (por defecto) o `5433` |
| `DB_NAME` | Nombre de la BD creada en el Paso 2 | `gestion_archivos` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña del usuario | `tu_contraseña` |
| `JWT_SECRET` | Clave secreta para tokens JWT | Cadena larga y aleatoria |

> Consulta `back-end/.env.example` para la documentación completa de cada variable.

---

## Paso 4 — Instalar dependencias del Frontend

Abre **una segunda terminal** en la raíz del proyecto:

```bash
cd front-end
npm install
```

---

## Paso 5 — Inicializar la Base de Datos (Seeds)

> ⚠️ **Orden obligatorio.** Cada script depende de los datos creados por el anterior.
> Ejecuta todos desde la carpeta `back-end/`.

```bash
cd back-end
```

### Seed 1 — Estructura base

Crea: **7 roles jerárquicos**, la Universidad Católica de Cuenca, la Facultad de Ingeniería,
5 carreras iniciales, 1 período académico (`2026-I`), 5 criterios de acreditación,
31 indicadores con sus responsables, actividades por indicador y **22 usuarios de prueba**.

```bash
node seed.js
```

Salida esperada:
```
Conectado a PostgreSQL
Roles creados: [1] RESPONSABLE_AREA ... [7] ADMINISTRADOR
Universidad: Universidad Católica de Cuenca (id: 1)
Facultad: Facultad de Ingeniería (id: 1)
...
══════════════════════════════════════════
Seed completado exitosamente con 7 niveles.
══════════════════════════════════════════
```

---

### Seed 2 — Criterios e Indicadores de acreditación

Inserta (o actualiza) los **5 Criterios** y **31 Indicadores** CEAACES/CACES
con sus responsables. Usa `findOrCreate` — es seguro ejecutarlo varias veces.

> **Requisito:** el Seed 1 debe haberse ejecutado primero (necesita al menos 1 Período en la BD).

```bash
node seed-criterios.js
```

Salida esperada:
```
✅ Conectado a PostgreSQL
✅ [1] Perfil de egreso → DIRECTOR_CARRERA
✅ [2] Proyecto curricular → DIRECTOR_CARRERA
...
✅ [31] Gestión del acervo y recursos bibliográficos → DIRECTOR_CARRERA
🎉 Seed de Criterios e Indicadores completado exitosamente (5 Criterios, 31 Indicadores).
```

---

### Seed 3 — Carreras de demo

Inserta **6 carreras de demostración** (Software, TI, TDN, BM, Robótica, Realidad Virtual)
bajo la Facultad de Ingeniería. Idempotente — no duplica registros si ya existen.

> **Requisito:** el Seed 1 debe haberse ejecutado primero (necesita la Facultad en la BD).

```bash
node seed-carreras-demo.js
```

Salida esperada:
```
✅ Conectado a PostgreSQL
🏛️  Universidad: Universidad Católica de Cuenca (id: 1)
🏫  Facultad: Facultad de Ingeniería (id: 1)
✅ CREADA      | id: 6    | Software
✅ CREADA      | id: 7    | TI
...
📊 Resumen: 6 carrera(s) creadas, 0 ya existían.
seed-carreras-demo.js completado exitosamente.
```

---

## Paso 6 — Ejecutar la Aplicación

### Opción A — Comando único desde la raíz *(recomendado)*

Desde la carpeta raíz del proyecto, un solo comando levanta backend y frontend simultáneamente:

```bash
npm run dev
```

Verás las dos salidas con prefijos de color diferenciados:
```
[BACKEND]  Conexión a PostgreSQL establecida
[BACKEND]  Modelos sincronizados con la base de datos
[BACKEND]  Servidor corriendo en http://localhost:3000
[FRONTEND] VITE v4.x  ready in xxx ms
[FRONTEND] ➜  Local:   http://localhost:5173/
```

> Si alguno de los dos procesos falla, `--kill-others-on-fail` detiene el otro automáticamente.

---

### Opción B — Terminales separadas *(alternativa)*

**Terminal 1 — Backend (Express):**
```bash
cd back-end
npm run dev
```
Servidor disponible en: `http://localhost:3000`

**Terminal 2 — Frontend (Vite):**
```bash
cd front-end
npm run dev
```
Aplicación disponible en: `http://localhost:5173`

---

## Paso 7 — Credenciales de Prueba

Todos los usuarios se crean con el Seed 1. Usa cualquiera de estos para iniciar sesión:

### Usuarios principales por rol

| Rol | Correo electrónico | Contraseña |
|---|---|---|
| `ADMINISTRADOR` | `admin@universidad.edu` | `Admin123!` |
| `RECTOR` | `rector@universidad.edu` | `Rector123!` |
| `DECANO` | `decano@universidad.edu` | `Decano123!` |
| `SUBDECANO` | `subdecano@universidad.edu` | `Subdecano123!` |
| `DIRECTOR_CARRERA` | `director@universidad.edu` | `Director123!` |
| `DOCENTE` | `docente@universidad.edu` | `Docente123!` |
| `RESPONSABLE_AREA` | `responsable@universidad.edu` | `Responsable123!` |

### Responsables de área (indicadores de acreditación)

| Nombre | Correo electrónico | Contraseña |
|---|---|---|
| Ing. Andrés Galarza | `agalarza@universidad.edu` | `Galarza123!` |
| Ing. Antonio Cajamarca | `acajamarca@universidad.edu` | `Cajamarca123!` |
| PhD. Orlando Álvarez | `oalvarez@universidad.edu` | `Alvarez123!` |
| Eco. Jorge Cárdenas | `jcardenas@universidad.edu` | `Cardenas123!` |
| Ing. Jeyson Gaona | `jgaona@universidad.edu` | `Gaona123!` |
| Ing. Jenny Vizñay | `jviznay@universidad.edu` | `Viznay123!` |
| Ing. Juan Pablo Pazmiño | `jpazmino@universidad.edu` | `Pazmino123!` |
| Ing. Xavier González | `xgonzalez@universidad.edu` | `Gonzalez123!` |
| Ing. Pablo Buestán | `pbuestan@universidad.edu` | `Buestan123!` |
| Ing. Sandro Ortiz | `sortiz@universidad.edu` | `Ortiz123!` |
| Ing. David Calderón | `dcalderon@universidad.edu` | `Calderon123!` |
| Ing. José Carrillo | `jcarrillo@universidad.edu` | `Carrillo123!` |
| Biblioteca UCACUE | `biblioteca@universidad.edu` | `Biblioteca123!` |
| Bienestar Estudiantil | `bienestar@universidad.edu` | `Bienestar123!` |

---

## Solución de Problemas Frecuentes

### ❌ `connect ECONNREFUSED 127.0.0.1:5432`
PostgreSQL no está en ejecución.
- **Windows:** Abre `services.msc` → busca *PostgreSQL* → clic en *Iniciar*.
- **Linux:** `sudo service postgresql start`
- **macOS:** `brew services start postgresql`

### ❌ `database "gestion_archivos" does not exist`
La base de datos no fue creada. Vuelve al **Paso 2.1** y crea la BD en psql/pgAdmin.

### ❌ `password authentication failed for user "postgres"`
La contraseña en `DB_PASSWORD` del `.env` no coincide con la de tu instalación de PostgreSQL.
Revisa el valor en tu cliente psql o pgAdmin.

### ❌ `ENOENT: no such file or directory, mkdir './uploads'`
La carpeta `uploads/` no existe. Ejecuta los comandos del **Paso 2.2**.

### ❌ Error en seed: `relation "roles" does not exist`
El servidor nunca arrancó para crear las tablas. Antes de correr los seeds:
1. Configura correctamente el `.env`
2. Ejecuta `npm run dev` en `back-end/` y espera a ver `Modelos sincronizados`
3. Detén el servidor (`Ctrl+C`)
4. Ahora ejecuta los seeds en orden

### ❌ `Error al cargar certificado` al firmar documentos
El archivo `.p12` referenciado en `CERT_P12_PATH` no existe o la contraseña
en `CERT_P12_PASSWORD` es incorrecta. Verifica que el certificado esté en
`back-end/certs/` y que la extensión sea `.p12` o `.pfx`.

### ❌ `Port 3000 is already in use`
Otro proceso ocupa el puerto 3000.
- **Windows:** `netstat -ano | findstr :3000` → anota el PID → `taskkill /PID <pid> /F`
- **Linux/macOS:** `lsof -ti:3000 | xargs kill`
