# Guía de Instalación y Configuración — Gestor de Archivos con Firma Electrónica

> Sistema de Gestión Documental y Acreditación Universitaria con Firma Electrónica **PAdES-BES** (ETSI EN 319 142 / ISO 32000-1) para la **Universidad Católica de Cuenca (UCACUE)**.

---

## 📋 Índice

1. [Prerrequisitos del Sistema](#prerrequisitos-del-sistema)
2. [Paso 1 — Clonar el Repositorio](#paso-1--clonar-el-repositorio)
3. [Paso 2 — Configurar la Base de Datos (PostgreSQL) y Almacenamiento](#paso-2--configurar-la-base-de-datos-postgresql-y-almacenamiento)
4. [Paso 3 — Configurar el Backend (API REST)](#paso-3--configurar-el-backend-api-rest)
5. [Paso 4 — Configurar el Frontend (React + Vite)](#paso-4--configurar-el-frontend-react--vite)
6. [Paso 5 — Inicializar la Base de Datos (Seeds y Migraciones)](#paso-5--inicializar-la-base-de-datos-seeds-y-migraciones)
7. [Paso 6 — Scripts de Prueba y Verificación (Firma 4 Niveles y Tests)](#paso-6--scripts-de-prueba-y-verificación)
8. [Paso 7 — Ejecutar la Aplicación](#paso-7--ejecutar-la-aplicación)
9. [Paso 8 — Credenciales de Prueba y Roles](#paso-8--credenciales-de-prueba-y-roles)
10. [Paso 9 — Solución de Problemas Frecuentes](#paso-9--solución-de-problemas-frecuentes)

---

## Prerrequisitos del Sistema

Antes de iniciar, asegúrate de tener instaladas las siguientes herramientas en tu entorno:

| Herramienta | Versión mínima | Propósito | Enlace de descarga |
|---|---|---|---|
| **Node.js** | v18 LTS (v20+ recomendado) | Runtime de JavaScript | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ *(incluido con Node.js)* | Gestor de paquetes | — |
| **PostgreSQL** | v14+ (v15/v16 recomendado) | Base de datos relacional | [postgresql.org/download](https://www.postgresql.org/download/) |
| **Git** | v2.30+ | Control de versiones | [git-scm.com](https://git-scm.com/) |

### Verificación de versiones instaladas:
```bash
node --version    # Debe mostrar v18.x.x o superior
npm --version     # Debe mostrar 9.x.x o superior
psql --version    # Debe mostrar PostgreSQL 14.x o superior
git --version     # Debe mostrar git version 2.x o superior
```

---

## Paso 1 — Clonar el Repositorio

Abre tu terminal y clona el repositorio del proyecto:

```bash
git clone https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA.git
cd "GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA"
```

### Estructura del Proyecto

```
GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA/
├── back-end/                              → Servidor API REST (Express + Sequelize)
│   ├── config/
│   │   └── database.js                    → Conexión a PostgreSQL (Sequelize Pool)
│   ├── Model/                             → Modelos ORM y asociaciones relacionales
│   │   ├── Actividad.js
│   │   ├── Carrera.js
│   │   ├── Criterio.js
│   │   ├── Documento.js
│   │   ├── Facultad.js
│   │   ├── FlujoFirma.js
│   │   ├── Indicador.js
│   │   ├── PasoFirma.js                   → Pasos con asignación por Rol o Usuario
│   │   ├── Periodo.js
│   │   ├── Rol.js
│   │   ├── Universidad.js
│   │   ├── Usuario.js
│   │   ├── UsuarioActividad.js            → Pivote M:N Usuario ↔ Actividad (visibilidad)
│   │   ├── UsuarioCarrera.js              → Pivote M:N Usuario ↔ Carrera (multicarrera)
│   │   ├── UsuarioFacultad.js             → Pivote N:M Usuario ↔ Facultad
│   │   ├── UsuarioRol.js                  → Pivote M:N Usuario ↔ Rol (multirrol)
│   │   └── index.js                       → Declaración centralizada de asociaciones
│   ├── Controller/
│   │   ├── auth.controller.js             → Autenticación, usuarios, roles, passwords
│   │   ├── documento.controller.js        → Subida, firma, rechazo y descarga de PDFs
│   │   ├── flujos.controller.js           → Configuración de flujos y pasos de firma
│   │   └── parametrizacion.controller.js  → CRUD de la jerarquía universitaria
│   ├── Middleware/
│   │   ├── auth.middleware.js             → Validación de tokens JWT
│   │   └── rbac.middleware.js             → Control de acceso por roles y niveles
│   ├── Routes/
│   │   ├── auth.routes.js                 → /api/auth/*
│   │   ├── documento.routes.js            → /api/documentos/*
│   │   ├── flujos.routes.js               → /api/flujos/*
│   │   └── parametrizacion.routes.js      → /api/parametrizacion/*
│   ├── Services/
│   │   ├── auth.service.js                → Lógica de autenticación y tokens
│   │   ├── firma.service.js               → Motor PAdES-BES, sellos visuales QR y PKCS#7
│   │   └── workflow.service.js            → Motor de transiciones de estados de firma
│   ├── tests/                             → Suite de pruebas unitarias y de integración
│   │   ├── fixtures/
│   │   ├── integration/
│   │   ├── middleware/
│   │   ├── unit/
│   │   ├── docente-relaciones.test.js
│   │   ├── firma-pades.test.js
│   │   ├── flujo-4firmantes-e2e.test.js
│   │   ├── flujo-firmantes-elegibles.test.js
│   │   └── setup.js
│   ├── certs/                             → Almacén de certificados digitales (.p12/.pfx)
│   ├── uploads/                           → Almacén de documentos PDFs originales y firmados
│   ├── generar-documento-4firmas.js       → Demostración autónoma de firma de 4 niveles
│   ├── migrate-relaciones.js              → Migración segura de esquemas y tablas pivote
│   ├── seed.js                            → Seed base (Roles, Universidad, Usuarios, Criterios)
│   ├── seed-criterios.js                  → Seed detallado de 5 Criterios y 31 Indicadores
│   ├── seed-carreras-demo.js              → Seed de carreras de prueba
│   ├── server.js                          → Punto de entrada del servidor Express
│   ├── package.json
│   └── .env.example
├── front-end/                             → Aplicación Web SPA (React 18 + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                    → Badges, Breadcrumbs, loaders
│   │   │   ├── flujos/
│   │   │   │   └── PasoFirmaItem.jsx      → Configuración de pasos por Rol o Usuario
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx             → Shell principal con barra lateral
│   │   │   │   └── Sidebar.jsx            → Menú adaptativo por roles
│   │   │   └── modals/
│   │   │       ├── ModalDocenteForm.jsx   → Formulario multirrol, multicarrera y actividades
│   │   │       └── ModalFirma.jsx         → Modal de visualización, firma y rechazo
│   │   ├── context/
│   │   │   ├── AppContext.jsx             → Estado global y cliente API
│   │   │   ├── AppContextObject.js
│   │   │   └── useApp.js                  → Hook de acceso al contexto
│   │   ├── views/
│   │   │   ├── Dashboard.jsx              → Estadísticas y métricas generales
│   │   │   ├── ExploradorDeArchivos.jsx   → Árbol de carpetas y gestión de documentos
│   │   │   ├── GestionUsuarios.jsx        → Administración completa de usuarios
│   │   │   ├── HistorialAuditoria.jsx     → Registro de auditoría del sistema
│   │   │   ├── Login.jsx                  → Inicio de sesión
│   │   │   ├── PanelLateralAuditoria.jsx  → Detalle y trazabilidad de documentos
│   │   │   ├── ParametrizacionAdmin.jsx   → Gestión de jerarquía y flujos de firma
│   │   │   ├── PerfilCertificado.jsx      → Perfil de usuario y firma digital
│   │   │   ├── RecuperarPassword.jsx      → Solicitud de recuperación de clave
│   │   │   └── ResetPassword.jsx          → Restablecimiento de clave con token
│   │   ├── App.jsx                        → Router condicional y ErrorBoundary
│   │   ├── index.css                      → TailwindCSS y estilos globales
│   │   └── main.jsx                       → Entrada de React DOM
│   ├── package.json
│   └── vite.config.js
├── package.json                           → Scripts globales con concurrently
├── SETUP.md                               → Esta guía de instalación
├── README.md                              → Resumen general del repositorio
├── FLUJO.md                               → Flujo detallado del pipeline de firmas
└── contexto_nuevos_cambios.md             → Documento de arquitectura técnica
```

---

## Paso 2 — Configurar la Base de Datos (PostgreSQL) y Almacenamiento

### 2.1 Crear la Base de Datos

Abre **pgAdmin** o tu terminal interactiva de `psql` y crea la base de datos:

```sql
CREATE DATABASE gestion_archivos;
```

> **Nota:** Las tablas se crean y actualizan de forma automática cuando el servidor Express arranca por primera vez gracias a `sequelize.sync({ alter: true })`. No es necesario ejecutar scripts SQL manuales.

### 2.2 Crear las Carpetas de Almacenamiento

El servidor requiere directorios locales para almacenar los PDFs originales, los PDFs firmados en cada etapa y los certificados digitales `.p12`.

Ejecuta desde la raíz del proyecto:

**En Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "back-end\uploads"
New-Item -ItemType Directory -Force -Path "back-end\certs"
```

**En Linux / macOS:**
```bash
mkdir -p back-end/uploads back-end/certs
```

---

## Paso 3 — Configurar el Backend (API REST)

### 3.1 Instalar Dependencias del Backend

Navega al directorio `back-end` e instala los paquetes:

```bash
cd back-end
npm install
```

### 3.2 Crear y Configurar el Archivo `.env`

Copia el archivo de plantilla `.env.example` a `.env`:

**En Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**En Linux / macOS:**
```bash
cp .env.example .env
```

Abre `back-end/.env` en tu editor de código y ajusta los valores según tu configuración local:

```env
# ─── BASE DE DATOS (PostgreSQL) ───────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_archivos
DB_USER=postgres
DB_PASSWORD=tu_password_de_postgresql

# ─── AUTENTICACIÓN (JWT) ──────────────────────────────────────────────────────
JWT_SECRET=tu_clave_secreta_super_segura_y_aleatoria_para_los_tokens
JWT_EXPIRES_IN=8h

# ─── SERVIDOR EXPRESS ─────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ─── ALMACENAMIENTO DE ARCHIVOS ───────────────────────────────────────────────
UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

# ─── FIRMA ELECTRÓNICA INSTITUCIONAL (PAdES-BES Fallback) ─────────────────────
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

---

## Paso 4 — Configurar el Frontend (React + Vite)

Abre otra terminal o navega a la carpeta `front-end` desde la raíz del proyecto e instala sus dependencias:

```bash
cd front-end
npm install
```

> **Atajo desde la raíz:** Puedes instalar dependencias de ambos proyectos ejecutando desde la raíz: `npm run install:all`.

---

## Paso 5 — Inicializar la Base de Datos (Seeds y Migraciones)

### ⚡ Inicialización Rápida (Recomendada)

Puedes inicializar todos los datos de prueba y estructura con un único comando:

**Desde la raíz del proyecto:**
```bash
npm run seed
```

**O desde la carpeta `back-end/`:**
```bash
cd back-end
npm run seed:all
```

---

### 🔍 Detalle de los Scripts de Inicialización

Si deseas ejecutar o comprender los seeds paso a paso, ejecútalos en el siguiente orden estricto dentro de `back-end/`:

```bash
cd back-end
```

#### 1. Seed Base — Estructura Institucional y Usuarios (`seed.js`)
Crea los **7 roles jerárquicos**, la Universidad Católica de Cuenca, la Facultad de Ingeniería, 5 carreras iniciales, el período académico `2026-I`, los 5 criterios CACES, 31 indicadores con responsables asignados, actividades con carpetas y **22 usuarios de prueba** con credenciales predeterminadas.

```bash
node seed.js
# o: npm run seed:base
```

#### 2. Seed de Criterios e Indicadores (`seed-criterios.js`)
Inserta y sincroniza detalladamente los **5 Criterios** y los **31 Indicadores** oficiales del modelo de evaluación y acreditación universitaria CEAACES/CACES con sus respectivos responsables asignados. Es idempotente (usa `findOrCreate`).

```bash
node seed-criterios.js
# o: npm run seed:criterios
```

#### 3. Seed de Carreras de Demostración (`seed-carreras-demo.js`)
Registra carreras adicionales bajo la Facultad de Ingeniería (Software, TI, TDN, Sistemas Biomédicos, Robótica, Realidad Virtual) para pruebas multicarrera.

```bash
node seed-carreras-demo.js
# o: npm run seed:carreras
```

#### 4. Script de Migración Segura de Relaciones (`migrate-relaciones.js`)
Si estás actualizando una base de datos existente o modificando esquemas de tablas pivote (`UsuarioCarrera`, `UsuarioFacultad`, `UsuarioActividad` o pasos con `usuario_id`), ejecuta este script para asegurar las columnas y tablas intermedias sin perder los datos ya guardados:

```bash
node migrate-relaciones.js
```

---

## Paso 6 — Scripts de Prueba y Verificación

### 🧪 Demostración Autónoma de Firma en 4 Niveles (`generar-documento-4firmas.js`)

El proyecto incluye un script demostrativo que valida de forma autónoma el pipeline criptográfico **PAdES-BES**:
1. Genera un documento PDF formal con membrete y tipografías normalizadas.
2. Genera 4 certificados digitales PKCS#12 (`.p12`) de prueba con RSA-2048 en memoria.
3. Pre-estampa visualmente los sellos QR con coordenadas calculadas para cada autoridad.
4. Aplica consecutivamente las 4 firmas digitales con cálculo de `ByteRange` real y contenedores PKCS#7:
   - **Firma 1:** Director de Carrera
   - **Firma 2:** Subdecana de Facultad
   - **Firma 3:** Decano de Facultad
   - **Firma 4:** Rector
5. Genera el archivo firmado final en `back-end/uploads/documento_4_firmas_completo.pdf` verificable en **Adobe Acrobat Reader**.

Ejecución:
```bash
cd back-end
node generar-documento-4firmas.js
```

### 🧪 Ejecutar la Suite de Pruebas Automatizadas (Jest)

Para verificar el correcto funcionamiento de los controladores, servicios de firma, modelos y reglas de negocio:

```bash
cd back-end

# Ejecutar todas las pruebas
npm test

# Ejecutar con salida detallada
npm run test:verbose

# Ejecutar con reporte de cobertura de código
npm run test:coverage
```

---

## Paso 7 — Ejecutar la Aplicación

### Opción A — Comando Único desde la Raíz *(Recomendado)*

Desde la raíz del proyecto, `concurrently` levanta tanto el backend como el frontend en una sola terminal con prefijos de color:

```bash
npm run dev
```

Salida esperada en consola:
```
[BACKEND]  Conexión a PostgreSQL establecida
[BACKEND]  Modelos sincronizados con la base de datos
[BACKEND]  Servidor corriendo en http://localhost:3000
[FRONTEND] VITE v4.x.x  ready in xxx ms
[FRONTEND] ➜  Local:   http://localhost:5173/
```

- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)

---

### Opción B — Terminales Separadas

**Terminal 1 — Backend (Express con Nodemon):**
```bash
cd back-end
npm run dev
```

**Terminal 2 — Frontend (Vite Dev Server):**
```bash
cd front-end
npm run dev
```

---

## Paso 8 — Credenciales de Prueba y Roles

El sistema implementa control de acceso basado en roles jerárquicos (**RBAC** de 7 niveles) con soporte multirrol, multicarrera y visibilidad granular por actividad:

### 👤 Usuarios Principales por Nivel Jerárquico

| Nivel | Rol | Correo Electrónico | Contraseña | Alcance y Funciones |
|:---:|---|---|---|---|
| **7** | `ADMINISTRADOR` | `admin@universidad.edu` | `Admin123!` | Gestión total del sistema, parametrización institucional, flujos de firma dinámicos, usuarios. *(No firma documentos)* |
| **6** | `RECTOR` | `rector@universidad.edu` | `Rector123!` | Máxima autoridad institucional. Firma final y aprobación definitiva de expedientes de acreditación. |
| **5** | `DECANO` | `decano@universidad.edu` | `Decano123!` | Autoridad de Facultad. Firma de tercera etapa y validación académica de la facultad. |
| **4** | `SUBDECANO` | `subdecano@universidad.edu` | `Subdecano123!` | Gestión académica de facultad. Firma de segunda etapa y supervisión curricular. |
| **3** | `DIRECTOR_CARRERA` | `director@universidad.edu` | `Director123!` | Director de Carrera. Primera firma técnica, revisión y aprobación de evidencias por carrera. |
| **2** | `DOCENTE` | `docente@universidad.edu` | `Docente123!` | Carga de evidencias documentales (PDFs) en las actividades y carpetas asignadas. |
| **1** | `RESPONSABLE_AREA` | `responsable@universidad.edu` | `Responsable123!` | Carga y gestión de evidencias en los indicadores de acreditación institucionales asignados. |

---

### 📑 Responsables de Área Asignados por Indicador CACES

Los siguientes usuarios fueron creados con indicadores específicos para la simulación del proceso de evaluación:

| Responsable | Correo Electrónico | Contraseña | Indicadores / Área Asignada |
|---|---|---|---|
| **Ing. Andrés Galarza** | `agalarza@universidad.edu` | `Galarza123!` | Indicador 11 (Tutorías), Indicador 27 (Movilidad e Internacionalización) |
| **Ing. Antonio Cajamarca** | `acajamarca@universidad.edu` | `Cajamarca123!` | Indicadores 13, 16, 17 (Seguimiento y Resultados de Aprendizaje) |
| **PhD. Orlando Álvarez** | `oalvarez@universidad.edu` | `Alvarez123!` | Indicadores 18, 19 (Investigación, Innovación y Producción Académica) |
| **Eco. Jorge Cárdenas** | `jcardenas@universidad.edu` | `Cardenas123!` | Indicador 20 (Interdisciplinariedad y Funciones Sustantivas) |
| **Ing. Jeyson Gaona** | `jgaona@universidad.edu` | `Gaona123!` | Indicador 20 (Interdisciplinariedad y Articulación) |
| **Ing. Jenny Vizñay** | `jviznay@universidad.edu` | `Viznay123!` | Indicadores 21, 22 (Vinculación con la Sociedad y Transferencia) |
| **Ing. Juan Pablo Pazmiño** | `jpazmino@universidad.edu` | `Pazmino123!` | Indicadores 21, 22 (Vinculación y Transferencia Tecnológica) |
| **Ing. Xavier González** | `xgonzalez@universidad.edu` | `Gonzalez123!` | Indicador 23 (Prácticas Preprofesionales - Software / RV) |
| **Ing. Pablo Buestán** | `pbuestan@universidad.edu` | `Buestan123!` | Indicador 23 (Prácticas Preprofesionales - Robótica) |
| **Ing. Sandro Ortiz** | `sortiz@universidad.edu` | `Ortiz123!` | Indicador 23 (Prácticas Preprofesionales - Sistemas Biomédicos) |
| **Ing. José Carrillo** | `jcarrillo@universidad.edu` | `Carrillo123!` | Indicador 15 (Titulación), Indicador 25 (Calidad de Carrera) |
| **Ing. David Calderón** | `dcalderon@universidad.edu` | `Calderon123!` | Indicadores 28, 29, 30 (Infraestructura, Ambientes y Pedagogía) |
| **Bienestar Estudiantil** | `bienestar@universidad.edu` | `Bienestar123!` | Indicador 14 (Tasa de Retención y Deserción Estudiantil) |
| **Biblioteca UCACUE** | `biblioteca@universidad.edu` | `Biblioteca123!` | Indicador 31 (Acervo Bibliográfico y Recursos de Aprendizaje) |

---

## Paso 9 — Solución de Problemas Frecuentes

### ❌ `connect ECONNREFUSED 127.0.0.1:5432`
El servicio de PostgreSQL no está ejecutándose en tu máquina.
- **Windows:** Presiona `Win + R` → escribe `services.msc` → busca **PostgreSQL** → Clic derecho → **Iniciar**.
- **Linux:** `sudo systemctl start postgresql` o `sudo service postgresql start`.
- **macOS:** `brew services start postgresql`.

---

### ❌ `database "gestion_archivos" does not exist`
La base de datos relacional no fue creada en PostgreSQL.
- Abre tu terminal o cliente SQL y ejecuta:
  ```sql
  CREATE DATABASE gestion_archivos;
  ```

---

### ❌ `password authentication failed for user "postgres"`
La contraseña configurada en la variable `DB_PASSWORD` de tu archivo `back-end/.env` no coincide con la contraseña configurada durante la instalación de PostgreSQL. Corrige el valor en `.env`.

---

### ❌ `ENOENT: no such file or directory, mkdir './uploads'` o `./certs`
Las carpetas de almacenamiento local no existen. Crea los directorios ejecutando:
- **Windows (PowerShell):** `New-Item -ItemType Directory -Force -Path "back-end\uploads", "back-end\certs"`
- **Linux / macOS:** `mkdir -p back-end/uploads back-end/certs`

---

### ❌ Error al ejecutar seeds: `relation "roles" does not exist`
La base de datos aún no ha sincronizado las tablas. Para solucionarlo:
1. Asegúrate de que `back-end/.env` esté configurado.
2. Inicia el backend una vez con `cd back-end && npm run dev`.
3. Cuando veas el mensaje `Modelos sincronizados con la base de datos`, detén el servidor con `Ctrl + C`.
4. Vuelve a ejecutar `npm run seed:all` o `node seed.js`.

---

### ❌ Error de columnas en tablas pivote o pasos de firma (`usuario_id`, `UsuarioCarrera`, etc.)
Si actualizaste el código del proyecto y tu base de datos ya tenía datos previos, ejecuta la migración segura:
```bash
cd back-end
node migrate-relaciones.js
```

---

### ❌ Error al firmar: `Error al cargar certificado` o `Contraseña inválida`
El archivo de certificado `.p12` no existe en la ruta configurada en `CERT_P12_PATH` o la contraseña en `CERT_P12_PASSWORD` es incorrecta.
- Coloca un certificado `.p12` válido en `back-end/certs/` o genera certificados de prueba con `node generar-documento-4firmas.js`.

---

### ❌ Puerto 3000 o 5173 ocupado (`EADDRINUSE` / `Port already in use`)
Otro proceso está utilizando el puerto del backend o del frontend.
- **Windows (PowerShell):**
  ```powershell
  # Para el puerto 3000:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  # Para el puerto 5173:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
  ```
- **Linux / macOS:**
  ```bash
  npx kill-port 3000 5173
  ```

---

## 📚 Resumen de Comandos Principales

| Acción | Comando | Ubicación |
|---|---|---|
| **Instalar todas las dependencias** | `npm run install:all` | Raíz |
| **Inicializar todos los seeds** | `npm run seed` | Raíz |
| **Ejecutar Frontend y Backend** | `npm run dev` | Raíz |
| **Ejecutar Suite de Tests** | `npm test` | Raíz o `back-end/` |
| **Migración segura de relaciones** | `node migrate-relaciones.js` | `back-end/` |
| **Demostración de 4 Firmas PAdES-BES** | `node generar-documento-4firmas.js` | `back-end/` |
