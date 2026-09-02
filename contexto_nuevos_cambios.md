# 📁 Contexto del Proyecto: Gestor de Archivos con Firma Electrónica

> **Última actualización:** 2026-08-27  
> **Estado:** En desarrollo activo — servidores corriendo (`npm run dev`)  
> **Repositorio:** `EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA`

---

## 🎯 Propósito del Sistema

Sistema web de **gestión documental con firma electrónica PAdES-BES** diseñado para el proceso de **acreditación universitaria** de la Universidad de Cuenca. Permite:

- Organizar documentos en una jerarquía: Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad
- Gestionar un flujo de firmas digitales configurable por el Administrador
- Firmar PDFs con certificados `.p12` reales (estándar PAdES-BES compatible con Adobe Acrobat)
- Controlar acceso mediante roles jerárquicos (RBAC)

---

## 🏗️ Arquitectura General

```
Gestion de Archivos/
├── back-end/          → API REST (Node.js + Express + Sequelize + PostgreSQL)
├── front-end/         → SPA (React 18 + Vite + TailwindCSS)
├── DOCUMENTACION_TESIS.md
├── FLUJO.md
├── README.md
├── SETUP.md
└── contexto_nuevos_cambios.md
```

- **Back-end:** `http://localhost:3000`
- **Front-end:** `http://localhost:5173` (Vite dev server)

---

## ⚙️ Back-End

### Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | — | Runtime |
| Express | ^4.18.2 | Framework HTTP |
| Sequelize | ^6.37.3 | ORM |
| PostgreSQL | — | Base de datos (dialect: `postgres`) |
| jsonwebtoken | ^9.0.2 | Autenticación JWT (8h expiración) |
| bcryptjs | ^2.4.3 | Hash de contraseñas (12 salt rounds) |
| multer | ^1.4.5-lts.1 | Upload de archivos PDF |
| pdf-lib | ^1.17.1 | Manipulación de PDFs (sello visual QR) |
| node-forge | ^1.3.1 | Criptografía PKCS#7 / PKCS#12 |
| @signpdf/signpdf | ^3.3.0 | Firma PAdES con ByteRange real |
| @signpdf/placeholder-plain | ^3.3.0 | Inserción de placeholder AcroForm /Sig |
| qrcode | ^1.5.4 | Generación de QR para sellos visuales |
| helmet | ^7.1.0 | Seguridad HTTP headers |
| express-validator | ^7.0.1 | Validación de inputs |
| jest + supertest | ^30.4.2 | Testing |
| nodemon | ^3.0.3 | Hot reload en desarrollo |

### Variables de Entorno (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestion_archivos
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=...
JWT_EXPIRES_IN=8h

PORT=3000
NODE_ENV=development

UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

### Estructura de Carpetas (Back-End)

```
back-end/
├── server.js                    → Entrada principal, monta rutas y sincroniza BD
├── config/
│   └── database.js              → Instancia Sequelize con pool de conexiones
├── Model/
│   ├── index.js                 → Importa todos los modelos y declara asociaciones
│   ├── Rol.js
│   ├── Usuario.js
│   ├── UsuarioRol.js            → Tabla pivote M:N Usuario ↔ Rol
│   ├── Universidad.js
│   ├── Facultad.js
│   ├── Carrera.js
│   ├── Periodo.js
│   ├── Criterio.js
│   ├── Indicador.js
│   ├── Actividad.js
│   ├── Documento.js
│   ├── FlujoFirma.js
│   └── PasoFirma.js
├── Controller/
│   ├── auth.controller.js       → Login, registro, perfil, gestión usuarios, passwords
│   ├── documento.controller.js  → Subida, listado, firma, rechazo, descarga de PDFs
│   ├── flujos.controller.js     → CRUD de flujos de firma (solo ADMIN)
│   └── parametrizacion.controller.js → CRUD de jerarquía institucional
├── Services/
│   ├── auth.service.js          → JWT + bcrypt, registro y login
│   ├── firma.service.js         → Pipeline de firma PAdES-BES completo
│   └── workflow.service.js      → Motor de estados del flujo de firma
├── Middleware/
│   ├── auth.middleware.js       → Valida JWT del header Authorization: Bearer
│   └── rbac.middleware.js       → Control de acceso por roles y niveles
├── Routes/
│   ├── auth.routes.js           → /api/auth/*
│   ├── documento.routes.js      → /api/documentos/*
│   ├── flujos.routes.js         → /api/flujos/*
│   └── parametrizacion.routes.js → /api/parametrizacion/*
├── tests/
│   ├── unit/                    → auth.service, firma.service, workflow.service
│   ├── integration/             → auth, documento, parametrizacion
│   └── test_completo.js
├── uploads/                     → PDFs subidos y firmados
├── certs/                       → Certificados .p12
└── seed.js / seed-criterios.js  → Scripts de datos iniciales
```

---

## 🗄️ Modelos de Base de Datos

### Jerarquía Principal

```
Universidad
  └── Facultad (universidad_id)
        └── Carrera (facultad_id)
              └── Periodo (carrera_id)
                    └── Criterio (periodo_id, flujo_id?)
                          └── Indicador (criterio_id)
                                └── Actividad (indicador_id)
                                      └── Documento (actividad_id)
```

### Modelos Clave

#### `Rol`
```
id | nombre (ENUM) | nivel | descripcion
ENUM: RESPONSABLE_AREA(1) < DOCENTE(2) < DIRECTOR_CARRERA(3) < SUBDECANO(4) < DECANO(5) < RECTOR(6) < ADMINISTRADOR(7)
```

#### `Usuario`
```
id | nombre | email (unique) | password_hash | facultad_id | carrera_id | activo | reset_token | reset_token_exp
```
- Relación M:N con `Rol` a través de `UsuarioRol`
- Relación M:N con `Actividad` a través de `actividades_usuarios`
- Relación M:N con `Indicador` a través de `indicadores_responsables`

#### `Documento`
```
id | nombre_original | ruta_archivo | estado | subido_por_id | firmante_actual_id
   | facultad_id | actividad_id | flujo_id | paso_actual | observaciones | hash_sha256
   | firmado_director_en | firmado_subdecano_en | firmado_decano_en | firmado_rector_en
```
**Estados:** `PENDIENTE → EN_REVISION → FIRMADO_DIRECTOR → FIRMADO_SUBDECANO → FIRMADO_DECANO → COMPLETADO | RECHAZADO`

#### `FlujoFirma`
```
id | nombre | es_global
```
- Si `es_global = true`, se usa como flujo por defecto cuando el Criterio no tiene flujo propio
- Solo puede haber un flujo global activo a la vez

#### `PasoFirma`
```
id | flujo_id | orden | rol_id
```
- Define los pasos ordenados del flujo: qué rol debe firmar en cada posición

#### `Indicador`
```
id | numero (1-31) | nombre | descripcion | criterio_id | responsable_id | responsable_nombre | activo
```

---

## 🔐 Autenticación y Autorización

### JWT
- **Header:** `Authorization: Bearer <token>`
- **Payload:** `{ id, email, roles: string[], nivel: number }`
- **Expiración:** 8 horas

### RBAC (Middleware)

```javascript
autorizar('RECTOR', 'DECANO')     // Por nombre de rol
autorizarNivel(3)                 // Nivel >= 3 (DIRECTOR_CARRERA en adelante)
autorizarAdmin()                  // Solo ADMINISTRADOR (nivel 7)
```

### Endpoints de Autenticación (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/login` | Público | Login, devuelve JWT |
| POST | `/registro` | Público | Registro con rol DOCENTE por defecto |
| POST | `/registrar` | ADMIN | Crea usuario con rol específico |
| GET | `/perfil` | Autenticado | Datos del usuario actual |
| GET | `/roles` | Autenticado | Lista de roles disponibles |
| POST | `/cambiar-password` | Autenticado | Cambio de contraseña propio |
| POST | `/recuperar-password` | Público | Solicita token de reset |
| POST | `/reset-password` | Público | Aplica reset con token |
| GET | `/usuarios` | ADMIN | Listar todos los usuarios |
| PUT | `/usuarios/:id/rol` | ADMIN | Cambiar rol de usuario |
| PUT | `/usuarios/:id` | Autenticado | Actualizar perfil |
| PUT | `/usuarios/:id/password` | ADMIN | Reset password por admin |
| DELETE | `/usuarios/:id` | ADMIN | Eliminar usuario |

---

## 📄 Documentos y Firma (`/api/documentos`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/subir` | Autenticado | Sube PDF (multipart/form-data, campo `archivo`) |
| GET | `/` | Autenticado | Lista documentos |
| GET | `/resumen` | Autenticado | Estadísticas/resumen |
| GET | `/:id` | Autenticado | Obtener documento por ID |
| GET | `/:id/descargar` | Autenticado | Descarga el archivo PDF |
| DELETE | `/:id` | Autenticado | Eliminar documento |
| POST | `/:id/firmar` | Autenticado | Firma (valida que sea el firmante asignado) |
| POST | `/:id/rechazar` | Autenticado | Rechaza el documento |

---

## ✍️ Pipeline de Firma PAdES-BES (`firma.service.js`)

Implementación conforme a ISO 32000-1:

```
PDF original (en disco)
  ↓  agregarSelloVisual()    → pdf-lib estampa sello QR en esquina según rol
  ↓  plainAddPlaceholder()   → @signpdf inserta campo /Sig con /ByteRange y /Contents vacíos
  ↓  signpdf.sign()          → Calcula ByteRange real → extrae bytes → ForgeSigner.sign()
  ↓  ForgeSigner.sign()      → node-forge genera PKCS#7 detached sobre los bytes exactos
  ↓  Resultado: PDF firmado verificable en Adobe Acrobat
```

**Posición del sello QR por rol:**
- `RECTOR` → esquina inferior izquierda
- `DECANO` → esquina inferior derecha
- Cualquier otro → centrado

**`SIGNATURE_LENGTH = 16384`** bytes hex para placeholder /Contents (RSA-2048).

---

## 🔄 Motor de Workflow (`workflow.service.js`)

```
Al subir:     asignarFirmanteInicial()
              → Busca flujo: Actividad.flujo_id || Criterio.flujo_id || FlujoGlobal
              → paso_actual = 1, firmante_actual_id = rol del PasoFirma[1]

Al firmar:    procesarFirma()
              → Valida usuarioFirmante.id === documento.firmante_actual_id
              → paso_actual++, busca siguiente firmante (rol + facultad)
              → Si no hay más pasos: estado = 'COMPLETADO'

Al rechazar:  rechazar()
              → Valida firmante → estado = 'RECHAZADO'
```

**Prioridad de búsqueda de firmante:**
1. Mismo rol + misma facultad que el documento
2. Mismo rol sin filtro de facultad

---

## 🏛️ Parametrización (`/api/parametrizacion`)

CRUD completo para la jerarquía institucional (solo ADMINISTRADOR):

| Recurso | Ruta base |
|---|---|
| Universidades | `/api/parametrizacion/universidades` |
| Facultades | `/api/parametrizacion/facultades` |
| Carreras | `/api/parametrizacion/carreras` |
| Periodos | `/api/parametrizacion/periodos` |
| Criterios | `/api/parametrizacion/criterios` |
| Indicadores | `/api/parametrizacion/indicadores` |
| Actividades | `/api/parametrizacion/actividades` |
| Árbol completo | `GET /api/parametrizacion/estructura` |
| Responsables de indicador | `POST /api/parametrizacion/indicadores/:id/responsables` |
| Usuarios de actividad | `POST /api/parametrizacion/actividades/:id/usuarios` |

---

## 🔧 Flujos de Firma (`/api/flujos`)

Solo `ADMINISTRADOR`. Diseño de workflows de firma:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/flujos` | Lista flujos con sus pasos |
| POST | `/api/flujos` | Crea: `{ nombre, es_global, pasos: [rol_id, ...] }` |
| PUT | `/api/flujos/:id` | Actualiza flujo y reemplaza pasos |
| DELETE | `/api/flujos/:id` | Elimina (no el único global) |

---

## 🖥️ Front-End

### Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | ^18.2.0 | UI framework |
| Vite | ^4.4.9 | Build tool / dev server |
| TailwindCSS | ^3.3.5 | Estilos utilitarios |
| lucide-react | ^0.263.1 | Iconografía |

### Estructura de Carpetas (Front-End)

```
front-end/src/
├── main.jsx
├── App.jsx                       → ErrorBoundary + AppProvider + Router condicional
├── index.css
├── context/
│   ├── AppContext.jsx            → Estado global + llamadas API (~43KB)
│   ├── AppContextObject.js
│   └── useApp.js                → Hook: useContext(AppContext)
├── views/
│   ├── Login.jsx
│   ├── RecuperarPassword.jsx
│   ├── ResetPassword.jsx
│   ├── Dashboard.jsx            → Estadísticas generales
│   ├── ExploradorDeArchivos.jsx → Vista principal de documentos (~33KB)
│   ├── GestionUsuarios.jsx      → CRUD usuarios solo ADMIN (~24KB)
│   ├── HistorialAuditoria.jsx
│   ├── PanelLateralAuditoria.jsx
│   ├── ParametrizacionAdmin.jsx → Jerarquía + flujos de firma (~60KB)
│   └── PerfilCertificado.jsx    → Perfil y certificado (~16KB)
├── components/
│   ├── common/
│   │   ├── Badge.jsx
│   │   └── Breadcrumbs.jsx
│   ├── layout/
│   │   ├── Layout.jsx           → Shell autenticado con Sidebar
│   │   └── Sidebar.jsx
│   └── modals/
│       └── ModalFirma.jsx       → Modal firma/rechazo (~11KB)
└── data/
```

### Routing (sin react-router)

Navegación controlada por `AppContext` vía campo `vistaActual`:

```javascript
if (!isAutenticado) {
  'recuperar' → <RecuperarPassword />
  'reset'     → <ResetPassword />
  default     → <Login />
}
autenticado → <Layout /> (muestra vista según vistaActual)
```

**localStorage keys:** `gestdoc_token`, `gestdoc_usuario`

---

## 🧪 Testing

```
back-end/tests/
├── unit/
│   ├── auth.service.test.js
│   ├── firma.service.test.js
│   └── workflow.service.test.js
├── integration/
│   ├── auth.test.js
│   ├── documento.test.js
│   └── parametrizacion.test.js
└── test_completo.js
```

```bash
cd back-end
npm test                   # Ejecutar todos
npm run test:verbose       # Con salida detallada
npm run test:coverage      # Con reporte de cobertura
```

---

## 🚀 Scripts de Migración / Seed

```bash
node seed.js                              # Datos base completos
node seed-criterios.js                    # Criterios e indicadores de acreditación
node migrate.js                           # Migración base
node migrate-roles.js                     # Migración de roles
node migrate-multiple-roles.js            # Soporte multi-rol por usuario
node migrate-indicadores-responsables.js  # Tabla indicadores_responsables
node migrate-session2.js                  # Migración sesión 2
node migrate-session3.js                  # Migración sesión 3
node migrate-session4.js                  # Migración sesión 4
```

---

## 📐 Relaciones entre Modelos

```
Universidad 1──n Facultad 1──n Carrera 1──n Periodo
                                              │
                                          1──n Criterio ──── flujo_id ──► FlujoFirma
                                              │                                │
                                          1──n Indicador                   1──n PasoFirma
                                              │                                │
Usuario n──M Rol (UsuarioRol)             1──n Actividad                    rol_id
    │                                         │
    │                                     1──n Documento
    │                                         │
    └──────────── firmante_actual_id ─────────┘
    └──── M:n Indicador (indicadores_responsables)
    └──── M:n Actividad (actividades_usuarios)
```

---

## 📋 Decisiones Técnicas Importantes

| # | Decisión | Detalle |
|---|---|---|
| 1 | `sequelize.sync({ alter: true })` | El servidor altera la BD al arrancar. Cuidado en producción |
| 2 | Un solo flujo global | Marcar uno como global quita el flag de los demás automáticamente |
| 3 | Certificados `.p12` institucionales | Un solo cert por instancia, en `certs/`. No hay certs por usuario |
| 4 | Sin react-router | Navegación 100% controlada por `AppContext.vistaActual` |
| 5 | CORS abierto | `app.use(cors())` sin restricciones. Restringir en producción |
| 6 | Multi-rol por usuario | Tabla pivote `UsuarioRol`. JWT lleva array `roles[]` + nivel máximo |
| 7 | Responsables múltiples por indicador | Tabla `indicadores_responsables` (M:N) |
| 8 | Usuarios asignados por actividad | Tabla `actividades_usuarios` (M:N), controla visibilidad de carpetas |
| 9 | `SIGNATURE_LENGTH = 16384` | Bytes hex del placeholder /Contents para PKCS#7 RSA-2048 |
| 10 | Hash SHA-256 en BD | Se guarda el hash del PDF firmado para auditoría |
