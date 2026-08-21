# Documentación Técnica — Sistema de Gestión de Archivos con Firma Electrónica PAdES

> **Proyecto de Titulación** · Universidad de Cuenca  
> **Autor:**   
> **Repositorio:** [GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA](https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA)  
> **Fecha de documentación:** Agosto 2026

---

## Tabla de Contenidos

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Problemática y Justificación](#2-problemática-y-justificación)
3. [Objetivos](#3-objetivos)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Arquitectura del Sistema](#5-arquitectura-del-sistema)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [API REST — Referencia de Endpoints](#7-api-rest--referencia-de-endpoints)
8. [Sistema de Roles y Control de Acceso (RBAC)](#8-sistema-de-roles-y-control-de-acceso-rbac)
9. [Flujo de Firma Electrónica PAdES](#9-flujo-de-firma-electrónica-pades)
10. [Proceso Técnico de Firma Criptográfica](#10-proceso-técnico-de-firma-criptográfica)
11. [Jerarquía de Acreditación Universitaria](#11-jerarquía-de-acreditación-universitaria)
12. [Módulos del Frontend](#12-módulos-del-frontend)
13. [Servicios del Backend](#13-servicios-del-backend)
14. [Seguridad](#14-seguridad)
15. [Estructura de Directorios del Proyecto](#15-estructura-de-directorios-del-proyecto)
16. [Instalación y Configuración](#16-instalación-y-configuración)
17. [Variables de Entorno](#17-variables-de-entorno)
18. [Scripts de Inicialización de Datos](#18-scripts-de-inicialización-de-datos)
19. [Pruebas](#19-pruebas)
20. [Guía de Usuarios del Sistema](#20-guía-de-usuarios-del-sistema)
21. [Glosario Técnico](#21-glosario-técnico)

---

## 1. Resumen del Proyecto

El **Sistema de Gestión de Archivos con Firma Electrónica** es una aplicación web institucional diseñada para centralizar, organizar y validar la documentación del proceso de acreditación universitaria mediante un flujo de aprobación secuencial multi-nivel basado en firmas digitales **PAdES-BES** (PDF Advanced Electronic Signatures).

La plataforma permite a docentes y responsables de área subir evidencias en formato PDF, las cuales recorren un flujo de aprobación firmado de forma criptográfica por cuatro niveles jerárquicos de autoridad institucional:

```
Docente / Responsable de Área  →  Director de Carrera  →  Subdecano  →  Decano  →  Rector
         (Sube documento)              (Firma 1/4)          (Firma 2/4)   (Firma 3/4)   (Firma 4/4)
```

El sistema fue construido específicamente para soportar los **5 Criterios** y **31 Indicadores oficiales** de acreditación universitaria, organizados dentro de una jerarquía documental de 7 niveles.

---

## 2. Problemática y Justificación

Los procesos de acreditación universitaria requieren la recolección, organización y aprobación formal de grandes volúmenes de documentos PDF. Sin una plataforma centralizada, las instituciones enfrentan:

- **Falta de trazabilidad**: Los documentos circulan por correo o carpetas compartidas sin registro de quién aprobó qué y cuándo.
- **Ausencia de validación criptográfica**: No existe garantía de que los documentos no fueron alterados tras su aprobación.
- **Desorganización jerárquica**: Las evidencias no se vinculan explícitamente a los criterios e indicadores oficiales de acreditación.
- **Procesos manuales de firma**: Las firmas físicas o escaneadas no tienen valor legal equiparable a la firma electrónica.

Este sistema soluciona estos problemas mediante:

- Una **jerarquía documental estructurada** alineada con los criterios oficiales de acreditación.
- Un **workflow de firma secuencial** con validación de roles en cada etapa.
- **Sellos criptográficos PAdES-BES** que garantizan la integridad y autenticidad de los documentos.
- Un **registro de auditoría inmutable** de todas las acciones del sistema.

---

## 3. Objetivos

### Objetivo General
Desarrollar un sistema web de gestión documental que implemente un flujo de firma electrónica PAdES multi-nivel para la validación de evidencias del proceso de acreditación universitaria.

### Objetivos Específicos

1. Implementar una jerarquía documental de 7 niveles (Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad) alineada con los 5 criterios y 31 indicadores oficiales.
2. Diseñar e implementar un sistema de Control de Acceso Basado en Roles (RBAC) con 7 niveles de privilegio.
3. Desarrollar el servicio de firma digital PAdES-BES que estampa sellos visuales con código QR verificable en los documentos PDF.
4. Garantizar la integridad documental mediante hashes SHA-256 calculados en cada etapa del flujo de aprobación.
5. Proveer un historial de auditoría completo e inmutable de todas las operaciones del sistema.
6. Implementar autenticación segura mediante JSON Web Tokens (JWT) con sesiones de 8 horas.

---

## 4. Stack Tecnológico

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| **Runtime** | Node.js | v18+ | Entorno de ejecución del servidor |
| **Framework Backend** | Express.js | ^4.18.2 | API REST, routing y middlewares |
| **ORM** | Sequelize | ^6.37.3 | Mapeo objeto-relacional con PostgreSQL |
| **Base de Datos** | PostgreSQL | v14+ | Persistencia de datos relacional |
| **Framework Frontend** | React | ^18.2.0 | Interfaz de usuario reactiva (SPA) |
| **Bundler Frontend** | Vite | ^4.4.9 | Compilación y servidor de desarrollo |
| **Estilos** | Tailwind CSS | ^3.3.5 | Framework de utilidades CSS |
| **Iconografía** | Lucide React | ^0.263.1 | Librería de íconos SVG |
| **Firma Digital** | pdf-lib + node-forge | ^1.17.1 / ^1.3.1 | Estampado PAdES-BES en PDF |
| **Generación QR** | qrcode | ^1.5.4 | Código QR de verificación en sello |
| **Autenticación** | jsonwebtoken | ^9.0.2 | Tokens JWT para sesiones |
| **Hash de contraseñas** | bcryptjs | ^2.4.3 | Almacenamiento seguro de passwords |
| **Carga de archivos** | Multer | ^1.4.5-lts.1 | Manejo de uploads multipart/form-data |
| **Validación** | express-validator | ^7.0.1 | Validación de inputs en endpoints |
| **Seguridad HTTP** | Helmet | ^7.1.0 | Headers HTTP de seguridad |
| **Testing** | Jest + Supertest | ^30.4.2 / ^7.2.2 | Pruebas unitarias e integración |
| **Dev Server** | Nodemon | ^3.0.3 | Hot-reload en desarrollo |

---

## 5. Arquitectura del Sistema

El sistema sigue una **arquitectura cliente-servidor desacoplada** en dos capas independientes:

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                           │
│                                                                    │
│   React 18 SPA (Vite)  ·  Tailwind CSS  ·  AppContext (estado)    │
│   Puerto: http://localhost:5173                                     │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ HTTP/REST (JSON)
                              │ Authorization: Bearer <JWT>
┌─────────────────────────────▼──────────────────────────────────────┐
│                      SERVIDOR (Node.js)                            │
│                                                                    │
│   Express.js API  ·  Middlewares JWT/RBAC  ·  Multer uploads       │
│   Puerto: http://localhost:3000                                     │
│                                                                    │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│   │  Routes    │  │Controllers │  │  Services  │  │  Models    │  │
│   │ /api/auth  │→ │auth.ctrl   │  │FirmaService│  │Sequelize   │  │
│   │ /api/docs  │→ │doc.ctrl    │  │Workflow    │  │ORM         │  │
│   │ /api/param │→ │param.ctrl  │  │AuthService │  │            │  │
│   │ /api/flujos│→ │flujos.ctrl │  │            │  │            │  │
│   └────────────┘  └────────────┘  └────────────┘  └─────┬──────┘  │
└──────────────────────────────────────────────────────────┼─────────┘
                                                           │ Sequelize ORM
┌──────────────────────────────────────────────────────────▼─────────┐
│                    BASE DE DATOS (PostgreSQL)                       │
│                                                                     │
│   Tablas: usuarios, roles, documentos, actividades, criterios,      │
│   indicadores, facultades, carreras, periodos, universidades,       │
│   flujo_firmas, paso_firmas, indicadores_responsables,              │
│   actividades_usuarios                                              │
└─────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────────┐
│                     SISTEMA DE ARCHIVOS                             │
│   back-end/uploads/    ← PDFs subidos y firmados                   │
│   back-end/certs/      ← Certificados .p12 institucionales         │
└─────────────────────────────────────────────────────────────────────┘
```

### Patrón MVC en el Backend

El backend implementa el patrón **MVC (Modelo-Vista-Controlador)** adaptado a API REST:

| Capa | Directorio | Responsabilidad |
|------|-----------|----------------|
| **Modelo** | `back-end/Model/` | Definición de entidades Sequelize y sus relaciones |
| **Vista** | `back-end/Views/` | Plantillas HTML para emails (recuperación de contraseña) |
| **Controlador** | `back-end/Controller/` | Lógica de negocio y respuesta HTTP |
| **Rutas** | `back-end/Routes/` | Definición de endpoints y aplicación de middlewares |
| **Servicios** | `back-end/Services/` | Lógica compleja reutilizable (firma, workflow, auth) |
| **Middlewares** | `back-end/Middleware/` | Autenticación JWT y autorización RBAC |

---

## 6. Modelo de Datos

### Diagrama Entidad-Relación (Conceptual)

```
Universidad (1) ──────── (N) Facultad (1) ──────── (N) Carrera
                                │                         │
                            (N) Usuario              (N) Periodo
                                │                         │
                            (N) Rol               (N) Criterio ──── FlujoFirma
                                                          │
                                                   (N) Indicador
                                                          │
                                                   (N) Actividad ──── (N) Usuario
                                                          │             [actividades_usuarios]
                                                   (N) Documento
```

### Tablas del Sistema

#### `usuarios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador único |
| `nombre` | VARCHAR(150) | Nombre completo del usuario |
| `email` | VARCHAR(255) UNIQUE | Correo electrónico (login) |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |
| `facultad_id` | INTEGER FK | Facultad asignada (null para RECTOR/ADMIN) |
| `carrera_id` | INTEGER FK | Carrera asignada (para DIRECTOR y DOCENTE) |
| `activo` | BOOLEAN | Estado de la cuenta (por defecto: true) |
| `reset_token` | VARCHAR(255) | Token temporal para recuperación de contraseña |
| `reset_token_exp` | TIMESTAMP | Expiración del token de recuperación |
| `creado_en` | TIMESTAMP | Fecha de creación |
| `actualizado_en` | TIMESTAMP | Última modificación |

#### `roles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador del rol |
| `nombre` | VARCHAR | Nombre del rol (ej: `DIRECTOR_CARRERA`) |
| `nivel` | INTEGER | Nivel jerárquico (1=más bajo, 7=admin) |
| `descripcion` | TEXT | Descripción del rol |

#### `documentos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador único |
| `nombre_original` | VARCHAR(255) | Nombre del archivo PDF original |
| `ruta_archivo` | VARCHAR(500) | Ruta física en el servidor |
| `estado` | ENUM | Estado actual del documento en el flujo |
| `subido_por_id` | INTEGER FK | Usuario que subió el documento |
| `firmante_actual_id` | INTEGER FK | Usuario que debe firmar en la etapa actual |
| `facultad_id` | INTEGER FK | Facultad a la que pertenece el documento |
| `actividad_id` | INTEGER FK | Actividad a la que pertenece el documento |
| `flujo_id` | INTEGER FK | Flujo de firma asignado |
| `paso_actual` | INTEGER | Número del paso actual en el flujo (1-4) |
| `observaciones` | TEXT | Comentarios del revisor |
| `hash_sha256` | VARCHAR(64) | Hash de integridad del archivo |
| `firmado_director_en` | TIMESTAMP | Fecha/hora de firma del Director |
| `firmado_subdecano_en` | TIMESTAMP | Fecha/hora de firma del Subdecano |
| `firmado_decano_en` | TIMESTAMP | Fecha/hora de firma del Decano |
| `firmado_rector_en` | TIMESTAMP | Fecha/hora de firma del Rector |
| `creado_en` | TIMESTAMP | Fecha de subida |
| `actualizado_en` | TIMESTAMP | Última actualización |

#### Estados posibles del campo `estado` en `documentos`

| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Recién subido, esperando revisión del Director de Carrera |
| `EN_REVISION` | En proceso de revisión por el firmante actual |
| `FIRMADO_DIRECTOR` | Firmado por Director de Carrera |
| `FIRMADO_SUBDECANO` | Firmado por Subdecano |
| `FIRMADO_DECANO` | Firmado por Decano |
| `COMPLETADO` | Proceso completado con las 4 firmas institucionales |
| `RECHAZADO` | Rechazado en alguna etapa (habilitado para re-subida) |

#### `universidades`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre de la universidad |

#### `facultades`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre de la facultad |
| `universidad_id` | INTEGER FK | Universidad a la que pertenece |

#### `carreras`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre de la carrera |
| `facultad_id` | INTEGER FK | Facultad a la que pertenece |

#### `periodos`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre del período (ej: 2026-I) |
| `carrera_id` | INTEGER FK | Carrera a la que pertenece |

#### `criterios`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre del criterio de acreditación |
| `periodo_id` | INTEGER FK | Período al que pertenece |
| `flujo_id` | INTEGER FK | Flujo de firma asignado (opcional) |

#### `indicadores`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `numero` | INTEGER | Número oficial del indicador (1-31) |
| `nombre` | VARCHAR | Nombre del indicador |
| `criterio_id` | INTEGER FK | Criterio al que pertenece |

#### `actividades`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre de la actividad (contenedor de PDFs) |
| `indicador_id` | INTEGER FK | Indicador al que pertenece |

#### `flujo_firmas`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `nombre` | VARCHAR | Nombre del flujo (ej: "Flujo Estándar") |
| `es_global` | BOOLEAN | Si es el flujo por defecto del sistema |

#### `paso_firmas`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador |
| `flujo_id` | INTEGER FK | Flujo al que pertenece este paso |
| `orden` | INTEGER | Posición en el flujo (1, 2, 3, 4) |
| `rol_id` | INTEGER FK | Rol requerido para firmar este paso |

#### Tablas de Unión (Many-to-Many)

| Tabla | Entidades | Propósito |
|-------|-----------|-----------|
| `usuario_roles` | Usuario ↔ Rol | Asignación de roles a usuarios |
| `indicadores_responsables` | Indicador ↔ Usuario | Responsables asignados por indicador |
| `actividades_usuarios` | Actividad ↔ Usuario | Usuarios con acceso a subir en esa actividad |

### Relaciones Sequelize (Asociaciones)

```javascript
// Jerarquía documental
Universidad.hasMany(Facultad)
Facultad.hasMany(Carrera)
Carrera.hasMany(Periodo)
Periodo.hasMany(Criterio)
Criterio.hasMany(Indicador)
Indicador.hasMany(Actividad)
Actividad.hasMany(Documento)  // (a través de actividad_id en Documento)

// Usuarios
Usuario.belongsToMany(Rol, { through: UsuarioRol })
Usuario.belongsTo(Facultad)
Usuario.belongsTo(Carrera)

// Responsables de Indicadores
Indicador.belongsToMany(Usuario, { through: 'indicadores_responsables' })

// Actividades asignadas a usuarios
Actividad.belongsToMany(Usuario, { through: 'actividades_usuarios' })

// Documento y firma
Documento.belongsTo(Usuario, { as: 'subidoPor' })
Documento.belongsTo(Usuario, { as: 'firmanteActual' })
Documento.belongsTo(FlujoFirma)

// Flujo dinámico
FlujoFirma.hasMany(PasoFirma)
PasoFirma.belongsTo(Rol)
```

---

## 7. API REST — Referencia de Endpoints

**URL Base:** `http://localhost:3000/api`  
**Autenticación:** Header `Authorization: Bearer <token_jwt>` en todos los endpoints protegidos.

### 7.1 Autenticación (`/api/auth`)

| Método | Endpoint | Acceso | Descripción |
|--------|---------|--------|-------------|
| `POST` | `/auth/login` | Público | Inicia sesión. Devuelve JWT + datos del usuario |
| `POST` | `/auth/registro` | Público | Registro público (asigna rol DOCENTE por defecto) |
| `POST` | `/auth/registrar` | ADMINISTRADOR | Crea usuario con rol específico |
| `GET` | `/auth/perfil` | Autenticado | Devuelve datos del usuario de la sesión actual |
| `GET` | `/auth/roles` | Autenticado | Lista todos los roles disponibles |
| `POST` | `/auth/cambiar-password` | Autenticado | Cambia la propia contraseña |
| `POST` | `/auth/recuperar-password` | Público | Solicita token de recuperación por email |
| `POST` | `/auth/reset-password` | Público | Restablece contraseña con token |
| `GET` | `/auth/usuarios` | ADMINISTRADOR | Lista todos los usuarios del sistema |
| `PUT` | `/auth/usuarios/:id/rol` | ADMINISTRADOR | Actualiza el rol de un usuario |
| `PUT` | `/auth/usuarios/:id` | Autenticado | Actualiza datos del propio perfil |
| `PUT` | `/auth/usuarios/:id/password` | ADMINISTRADOR | Restablece contraseña de cualquier usuario |
| `DELETE` | `/auth/usuarios/:id` | ADMINISTRADOR | Elimina un usuario |

**Ejemplo — Login:**
```json
// POST /api/auth/login
// Body:
{
  "email": "director@universidad.edu",
  "password": "Director123!"
}

// Respuesta 200 OK:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 5,
    "nombre": "Director de Carrera",
    "email": "director@universidad.edu",
    "roles": [{ "id": 3, "nombre": "DIRECTOR_CARRERA", "nivel": 3 }]
  }
}
```

---

### 7.2 Documentos (`/api/documentos`)

| Método | Endpoint | Acceso | Descripción |
|--------|---------|--------|-------------|
| `POST` | `/documentos/subir` | Autenticado | Sube un nuevo PDF (multipart/form-data). Campo: `archivo` |
| `GET` | `/documentos` | Autenticado | Lista documentos (filtrados por rol y facultad) |
| `GET` | `/documentos/resumen` | Autenticado | Estadísticas agregadas para el Dashboard |
| `GET` | `/documentos/:id` | Autenticado | Obtiene metadatos de un documento específico |
| `GET` | `/documentos/:id/descargar` | Autenticado | Descarga el PDF (con todos los sellos de firma) |
| `POST` | `/documentos/:id/firmar` | Firmante asignado | Aplica firma PAdES al documento |
| `POST` | `/documentos/:id/rechazar` | Firmante asignado | Rechaza el documento (con motivo) |
| `DELETE` | `/documentos/:id` | Autenticado | Elimina un documento |

**Ejemplo — Subir documento:**
```
POST /api/documentos/subir
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form fields:
  - archivo: [archivo.pdf]
  - actividad_id: 12
```

**Ejemplo — Firmar documento:**
```json
// POST /api/documentos/42/firmar
// Body:
{
  "observaciones": "Documento revisado y aprobado."
}

// Respuesta 200 OK:
{
  "mensaje": "Documento firmado correctamente",
  "estado": "EN_REVISION",
  "siguienteFirmante": {
    "id": 4,
    "nombre": "Subdecano",
    "email": "subdecano@universidad.edu"
  }
}
```

---

### 7.3 Parametrización (`/api/parametrizacion`)

Todos los endpoints de escritura (POST, PUT, DELETE) requieren rol **ADMINISTRADOR**.

| Recurso | Endpoints disponibles |
|---------|----------------------|
| **Universidades** | `GET /universidades` · `GET /universidades/:id` · `POST /universidades` · `PUT /universidades/:id` · `DELETE /universidades/:id` |
| **Facultades** | `GET /facultades` · `GET /facultades/:id` · `POST /facultades` · `PUT /facultades/:id` · `DELETE /facultades/:id` |
| **Carreras** | `GET /carreras` · `GET /carreras/:id` · `POST /carreras` · `PUT /carreras/:id` · `DELETE /carreras/:id` |
| **Períodos** | `GET /periodos` · `GET /periodos/:id` · `POST /periodos` · `PUT /periodos/:id` · `DELETE /periodos/:id` |
| **Criterios** | `GET /criterios` · `GET /criterios/:id` · `POST /criterios` · `PUT /criterios/:id` · `DELETE /criterios/:id` |
| **Indicadores** | `GET /indicadores` · `GET /indicadores/:id` · `POST /indicadores` · `PUT /indicadores/:id` · `DELETE /indicadores/:id` · `POST /indicadores/:id/responsables` |
| **Actividades** | `GET /actividades` · `GET /actividades/:id` · `POST /actividades` · `PUT /actividades/:id` · `DELETE /actividades/:id` · `POST /actividades/:id/usuarios` |
| **Árbol completo** | `GET /estructura` (todos los autenticados) |

---

### 7.4 Flujos de Firma (`/api/flujos`)

| Método | Endpoint | Acceso | Descripción |
|--------|---------|--------|-------------|
| `GET` | `/flujos` | Autenticado | Lista los flujos de firma configurados |
| `GET` | `/flujos/:id` | Autenticado | Detalle de un flujo con sus pasos |

---

## 8. Sistema de Roles y Control de Acceso (RBAC)

El sistema implementa **Role-Based Access Control (RBAC)** con 7 niveles jerárquicos estrictos.

### Jerarquía de Roles

| Nivel | Identificador del Rol | Nombre | Alcance |
|:---:|----------------------|--------|---------|
| 1 | `RESPONSABLE_AREA` | Responsable de Área | Sube evidencias/documentos PDF en los indicadores asignados |
| 2 | `DOCENTE` | Docente Universitario | Sube documentos académicos (sílabos, entregables) |
| 3 | `DIRECTOR_CARRERA` | Director de Carrera | **Primera firma** en el flujo de aprobación de su carrera |
| 4 | `SUBDECANO` | Subdecano | **Segunda firma** en el flujo de aprobación |
| 5 | `DECANO` | Decano de Facultad | **Tercera firma** en el flujo de aprobación |
| 6 | `RECTOR` | Rector | **Firma final** (4/4) y aprobación institucional definitiva |
| 7 | `ADMINISTRADOR` | Administrador del Sistema | Gestión total: usuarios, estructura, auditoría. No firma |

### Implementación del RBAC

El control de acceso se implementa mediante dos middlewares en `back-end/Middleware/`:

- **`auth.middleware.js`** — `autenticar`: Verifica y decodifica el JWT de la sesión.
- **`rbac.middleware.js`** — `autorizar(roles[])` y `autorizarAdmin()`: Verifica que el usuario tenga el rol requerido para el endpoint.

```javascript
// Ejemplo de uso en rutas:
router.post('/registrar',
  autenticar,          // 1. Verifica JWT válido
  autorizarAdmin(),    // 2. Verifica que sea ADMINISTRADOR
  ctrl.registrar       // 3. Ejecuta el controlador
);
```

### Permisos por Módulo

| Módulo | RESPONSABLE_AREA | DOCENTE | DIRECTOR | SUBDECANO | DECANO | RECTOR | ADMIN |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Subir documentos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Firmar documentos | ❌ | ❌ | ✅ (paso 1) | ✅ (paso 2) | ✅ (paso 3) | ✅ (paso 4) | ❌ |
| Rechazar documentos | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gestión de usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Parametrización | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Explorador | ✅* | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ |

> *RESPONSABLE_AREA y DOCENTE solo ven las actividades a las que han sido asignados explícitamente.

---

## 9. Flujo de Firma Electrónica PAdES

### Estados y Transiciones

```
                    ┌─────────────────────────────────────────────┐
                    │              DOCENTE / RESPONSABLE           │
                    │          Sube el documento PDF               │
                    └──────────────────┬──────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │    PENDIENTE     │ ← Estado inicial
                              └────────┬────────┘
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │         DIRECTOR DE CARRERA  (Paso 1/4)      │
                    │  Revisa el documento en estado PENDIENTE     │
                    └─────────┬──────────────────────┬────────────┘
                              │ ✅ Firma             │ ❌ Rechaza
                              ▼                      ▼
                   ┌──────────────────┐    ┌──────────────────┐
                   │ FIRMADO_DIRECTOR │    │    RECHAZADO     │
                   └────────┬─────────┘    └──────────────────┘
                            │
                    ┌───────▼─────────────────────────────────────┐
                    │              SUBDECANO  (Paso 2/4)           │
                    │  Revisa el documento firmado por Director    │
                    └─────────┬──────────────────────┬────────────┘
                              │ ✅ Firma             │ ❌ Rechaza
                              ▼                      ▼
                  ┌───────────────────────┐  ┌──────────────────┐
                  │  FIRMADO_SUBDECANO    │  │    RECHAZADO     │
                  └──────────┬────────────┘  └──────────────────┘
                             │
                    ┌────────▼────────────────────────────────────┐
                    │               DECANO  (Paso 3/4)            │
                    │  Revisa el documento firmado por Subdecano  │
                    └─────────┬──────────────────────┬────────────┘
                              │ ✅ Firma             │ ❌ Rechaza
                              ▼                      ▼
                   ┌──────────────────────┐ ┌──────────────────┐
                   │   FIRMADO_DECANO     │ │    RECHAZADO     │
                   └────────────┬─────────┘ └──────────────────┘
                                │
                    ┌───────────▼─────────────────────────────────┐
                    │              RECTOR  (Paso 4/4)              │
                    │   Firma final — aprobación institucional     │
                    └─────────┬──────────────────────┬────────────┘
                              │ ✅ Firma             │ ❌ Rechaza
                              ▼                      ▼
                   ┌──────────────────────┐ ┌──────────────────┐
                   │      COMPLETADO      │ │    RECHAZADO     │
                   └──────────────────────┘ └──────────────────┘
```

### Enrutamiento Dinámico del Workflow

El servicio `WorkflowService` (`back-end/Services/workflow.service.js`) es el responsable de:

1. **Determinar el siguiente firmante** según el `paso_actual` del documento y el `FlujoFirma` configurado.
2. **Buscar al firmante correcto** priorizando primero al usuario con el rol correcto en la misma facultad del documento; si no existe, busca en toda la institución.
3. **Actualizar el estado** del documento y asignar el nuevo `firmante_actual_id`.

```javascript
// Lógica de búsqueda de firmante (workflow.service.js)
async _buscarFirmante(rol_id, facultad_id) {
  // 1. Prioridad: mismo rol + misma facultad
  if (facultad_id) {
    const conFacultad = await Usuario.findOne({
      where: { facultad_id, activo: true },
      include: [{ model: Rol, as: 'roles', where: { id: rol_id } }],
    });
    if (conFacultad) return conFacultad;
  }
  // 2. Fallback: mismo rol en cualquier facultad
  return await Usuario.findOne({
    where: { activo: true },
    include: [{ model: Rol, as: 'roles', where: { id: rol_id } }],
  });
}
```

---

## 10. Proceso Técnico de Firma Criptográfica

El servicio `FirmaService` (`back-end/Services/firma.service.js`) implementa el pipeline completo de firma digital PAdES-BES en 4 etapas:

### Pipeline de Firma

```
PDF Original en disco
        │
        ▼
1. Cargar Certificado .p12
   └── node-forge extrae clave privada + certificado público del PKCS#12
        │
        ▼
2. Calcular hash SHA-256 del PDF entrante
   └── Se incluye en el QR para verificación de integridad pre-firma
        │
        ▼
3. Estampar Sello Visual QR en la última página del PDF
   ├── Genera PNG del código QR (qrcode library)
   │   └── Contenido: nombre firmante, cargo, fecha, hash SHA-256 (primeros 32 chars)
   ├── Dibuja rectángulo de fondo con borde azul institucional
   ├── Embebe imagen QR en el PDF (pdf-lib)
   ├── Agrega texto: nombre firmante, cargo, fecha, estándar "PAdES-BES · Verif. QR"
   └── Posición del sello según rol:
       ├── RECTOR  → esquina inferior izquierda
       ├── DECANO  → esquina inferior derecha
       └── Otros   → centrado en la parte inferior
        │
        ▼
4. Construir Firma Criptográfica PKCS#7 CMS
   ├── node-forge genera estructura pkcs7.createSignedData()
   ├── Algoritmo de digest: SHA-256
   ├── Atributos autenticados: contentType, messageDigest, signingTime
   ├── Firma detached: true (no embebe el contenido en la firma)
   └── Serializa a DER (Distinguished Encoding Rules)
        │
        ▼
5. Calcular hash SHA-256 final del PDF sellado
   └── Se guarda en la tabla documentos.hash_sha256 para auditoría
        │
        ▼
PDF firmado (con sello visual + capa PKCS#7) guardado en disco
```

### Ubicación de Sellos por Rol

Dado que el documento acumula las 4 firmas en el mismo PDF, cada firmante coloca su sello en una posición diferente para que todas sean visibles:

| Firmante | Posición del Sello |
|---------|-------------------|
| Director de Carrera | Centro inferior |
| Subdecano | Centro inferior (se apila si el paso anterior ya lo ocupó) |
| Decano | Esquina inferior **derecha** |
| Rector | Esquina inferior **izquierda** |

---

## 11. Jerarquía de Acreditación Universitaria

### Árbol de Estructura Documental

```
Universidad
  └── Facultad
        └── Carrera
              └── Período Académico (ej: 2026-I)
                    └── Criterio de Acreditación (5 Criterios oficiales)
                          └── Indicador de Acreditación (31 Indicadores oficiales)
                                └── Actividad (contenedor de documentos PDF)
                                      └── Documento.pdf
```

### Los 5 Criterios Oficiales de Acreditación

| # | Criterio | Descripción | Indicadores |
|---|---------|-------------|-------------|
| 1 | **CURRÍCULO** | Currículo y plan de estudios | 1 al 7 (7 indicadores) |
| 2 | **DOCENCIA** | Personal académico y enseñanza | 8 al 17 (10 indicadores) |
| 3 | **INVESTIGACIÓN E INNOVACIÓN** | Gestión de investigación y producción académica | 18 al 20 (3 indicadores) |
| 4 | **VINCULACIÓN CON LA SOCIEDAD** | Vinculación, transferencia y prácticas preprofesionales | 21 al 23 (3 indicadores) |
| 5 | **FUNCIONES ESTRATÉGICAS Y DE SOPORTE** | Planificación, calidad, infraestructura y gestión | 24 al 31 (8 indicadores) |
| | **Total** | | **31 indicadores** |

---

### Criterio 1 — CURRÍCULO (Indicadores 1–7)

| N° | Indicador | Responsable |
|:--:|-----------|------------|
| 1 | Perfil de egreso | Directores de Carrera |
| 2 | Proyecto curricular | Directores de Carrera |
| 3 | Malla curricular | Directores de Carrera |
| 4 | Syllabus | Directores de Carrera |
| 5 | Metodología y recursos de aprendizaje | Directores de Carrera |
| 6 | Escenarios de prácticas formativas | Directores de Carrera |
| 7 | Tecnologías para el Aprendizaje y Conocimiento (TAC) | Directores de Carrera |

### Criterio 2 — DOCENCIA (Indicadores 8–17)

| N° | Indicador | Responsable |
|:--:|-----------|------------|
| 8 | Afinidad del personal académico | Directores de Carrera |
| 9 | Personal académico titular permanente | Directores de Carrera |
| 10 | Evaluación integral del desempeño del personal académico | Directores de Carrera |
| 11 | Sistema de tutorías académicas | Ing. Andrés Galarza |
| 12 | Habilidades blandas | Directores de Carrera |
| 13 | Seguimiento al cumplimiento de los resultados de aprendizaje | Ing. Antonio Cajamarca |
| 14 | Tasa de deserción | Bienestar Estudiantil |
| 15 | Tasa de titulación de grado | Ing. José Carrillo |
| 16 | Seguimiento a graduados | Ing. Antonio Cajamarca |
| 17 | Éxito de los graduados | Ing. Antonio Cajamarca |

### Criterio 3 — INVESTIGACIÓN E INNOVACIÓN (Indicadores 18–20)

| N° | Indicador | Responsable |
|:--:|-----------|------------|
| 18 | Gestión de la investigación e innovación | PhD. Orlando Álvarez |
| 19 | Producción académica | PhD. Orlando Álvarez |
| 20 | Interdisciplinariedad para la articulación de las funciones sustantivas | Eco. Jorge Cárdenas / Ing. Jeyson Gaona |

### Criterio 4 — VINCULACIÓN CON LA SOCIEDAD (Indicadores 21–23)

| N° | Indicador | Responsable |
|:--:|-----------|------------|
| 21 | Planificación y gestión de la vinculación con la sociedad | Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño |
| 22 | Mecanismos de transferencia de tecnología y conocimiento | Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño |
| 23 | Prácticas preprofesionales | Software - Cuenca: Ing. Xavier González · Sistemas Computacionales: PhD. Orlando Álvarez · Realidad Virtual: Ing. Xavier González · Robótica: Ing. Pablo Buestán · Sistemas Biomédicos: Ing. Sandro Ortiz |

### Criterio 5 — FUNCIONES ESTRATÉGICAS Y DE SOPORTE (Indicadores 24–31)

| N° | Indicador | Responsable |
|:--:|-----------|------------|
| 24 | Planificación académica y administrativa de la carrera | Directores de Carrera |
| 25 | Aseguramiento de la calidad de la carrera | Ing. José Carrillo |
| 26 | Ética, transparencia e integridad | Directores de Carrera |
| 27 | Internacionalización y movilidad | Ing. Andrés Galarza |
| 28 | Gestión de la infraestructura física y tecnológica | Ing. David Calderón |
| 29 | Ambientes de aprendizaje | Ing. David Calderón |
| 30 | Herramientas pedagógicas | Ing. David Calderón |
| 31 | Gestión del acervo y recursos bibliográficos | Biblioteca UCACUE / Directores de Carrera |

---

### Tabla Resumen Completa — Los 31 Indicadores

| N° | Indicador | Criterio | Responsable |
|:--:|-----------|---------|------------|
| 1 | Perfil de egreso | CURRÍCULO | Directores de Carrera |
| 2 | Proyecto curricular | CURRÍCULO | Directores de Carrera |
| 3 | Malla curricular | CURRÍCULO | Directores de Carrera |
| 4 | Syllabus | CURRÍCULO | Directores de Carrera |
| 5 | Metodología y recursos de aprendizaje | CURRÍCULO | Directores de Carrera |
| 6 | Escenarios de prácticas formativas | CURRÍCULO | Directores de Carrera |
| 7 | Tecnologías para el Aprendizaje y Conocimiento (TAC) | CURRÍCULO | Directores de Carrera |
| 8 | Afinidad del personal académico | DOCENCIA | Directores de Carrera |
| 9 | Personal académico titular permanente | DOCENCIA | Directores de Carrera |
| 10 | Evaluación integral del desempeño del personal académico | DOCENCIA | Directores de Carrera |
| 11 | Sistema de tutorías académicas | DOCENCIA | Ing. Andrés Galarza |
| 12 | Habilidades blandas | DOCENCIA | Directores de Carrera |
| 13 | Seguimiento al cumplimiento de los resultados de aprendizaje | DOCENCIA | Ing. Antonio Cajamarca |
| 14 | Tasa de deserción | DOCENCIA | Bienestar Estudiantil |
| 15 | Tasa de titulación de grado | DOCENCIA | Ing. José Carrillo |
| 16 | Seguimiento a graduados | DOCENCIA | Ing. Antonio Cajamarca |
| 17 | Éxito de los graduados | DOCENCIA | Ing. Antonio Cajamarca |
| 18 | Gestión de la investigación e innovación | INVESTIGACIÓN E INNOVACIÓN | PhD. Orlando Álvarez |
| 19 | Producción académica | INVESTIGACIÓN E INNOVACIÓN | PhD. Orlando Álvarez |
| 20 | Interdisciplinariedad para la articulación de las funciones sustantivas | INVESTIGACIÓN E INNOVACIÓN | Eco. Jorge Cárdenas / Ing. Jeyson Gaona |
| 21 | Planificación y gestión de la vinculación con la sociedad | VINCULACIÓN CON LA SOCIEDAD | Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño |
| 22 | Mecanismos de transferencia de tecnología y conocimiento | VINCULACIÓN CON LA SOCIEDAD | Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño |
| 23 | Prácticas preprofesionales | VINCULACIÓN CON LA SOCIEDAD | Ing. Xavier González / PhD. Orlando Álvarez / Ing. Pablo Buestán / Ing. Sandro Ortiz |
| 24 | Planificación académica y administrativa de la carrera | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Directores de Carrera |
| 25 | Aseguramiento de la calidad de la carrera | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Ing. José Carrillo |
| 26 | Ética, transparencia e integridad | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Directores de Carrera |
| 27 | Internacionalización y movilidad | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Ing. Andrés Galarza |
| 28 | Gestión de la infraestructura física y tecnológica | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Ing. David Calderón |
| 29 | Ambientes de aprendizaje | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Ing. David Calderón |
| 30 | Herramientas pedagógicas | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Ing. David Calderón |
| 31 | Gestión del acervo y recursos bibliográficos | FUNCIONES ESTRATÉGICAS Y DE SOPORTE | Biblioteca UCACUE / Directores de Carrera |

### Asignación de Responsables por Indicador

Cada indicador tiene uno o más **Responsables de Área** asignados mediante la tabla `indicadores_responsables`. Estos responsables son los únicos usuarios habilitados para subir documentos en las actividades de ese indicador. La asignación se realiza desde el módulo de **Parametrización Admin** por parte del Administrador del sistema.

---

## 12. Módulos del Frontend

La aplicación frontend es una **SPA (Single Page Application)** construida con React 18 y Vite, usando `AppContext` como gestor de estado global.

### Vistas Principales (`front-end/src/views/`)

| Vista | Archivo | Descripción |
|-------|---------|-------------|
| **Login** | `Login.jsx` | Formulario de autenticación con validación y manejo de errores |
| **Dashboard** | `Dashboard.jsx` | Panel estadístico con gráficos de estado, desglose por criterio y alertas de flujo |
| **Explorador de Archivos** | `ExploradorDeArchivos.jsx` | Árbol navegable de 7 capas con gestor de subida y visor de documentos |
| **Gestión de Usuarios** | `GestionUsuarios.jsx` | Administración de cuentas, cambio de roles y asignación de facultades/carreras |
| **Parametrización Admin** | `ParametrizacionAdmin.jsx` | CRUD jerárquico con menú desplegable para Criterios, Indicadores y Responsables |
| **Historial de Auditoría** | `HistorialAuditoria.jsx` | Bitácora inmutable de todos los eventos del sistema |
| **Perfil y Certificado** | `PerfilCertificado.jsx` | Datos del perfil del usuario y gestión de certificados digitales .p12 |
| **Recuperar Contraseña** | `RecuperarPassword.jsx` | Formulario de solicitud de recuperación por email |
| **Resetear Contraseña** | `ResetPassword.jsx` | Formulario para establecer nueva contraseña con token |

### Componentes Reutilizables (`front-end/src/components/`)

- **`layout/Layout.jsx`**: Estructura principal con sidebar de navegación, topbar y área de contenido. Renderiza la vista activa según el estado del contexto.
- Componentes de UI: Badge de estado, modales de confirmación, cargadores, etc.

### Gestión de Estado Global (`front-end/src/context/`)

El estado global se maneja con `AppContext` usando la Context API de React:

```javascript
// Estado principal del contexto
{
  usuario: null,           // Datos del usuario autenticado
  token: null,             // JWT de la sesión
  isAutenticado: false,    // Estado de autenticación
  vistaActual: 'login',    // Vista activa en la SPA
  navParams: null,         // Parámetros de navegación entre vistas
}
```

El token JWT se persiste en `localStorage` bajo la clave `gestdoc_token` para mantener la sesión al recargar la página.

---

## 13. Servicios del Backend

### `FirmaService` (`Services/firma.service.js`)

Servicio singleton que encapsula toda la lógica criptográfica:

| Método | Descripción |
|--------|-------------|
| `cargarCertificado(rutaP12, password)` | Lee un archivo `.p12` y extrae clave privada y certificado con node-forge |
| `generarQRPng(firmante, fechaFirma, hashDocumento)` | Genera un PNG de código QR con datos de verificación |
| `agregarSelloVisual(pdfBuffer, firmante, fechaFirma, hash)` | Estampa el sello QR visual en la última página del PDF |
| `construirFirmaPKCS7(contenidoPdf, clavePrivada, certificado)` | Genera la firma criptográfica PKCS#7 CMS detached |
| `firmarDocumento({ rutaPdf, rutaCertP12, passwordCert, firmante })` | **Pipeline completo**: sello visual + firma PKCS#7 + hash final |
| `calcularHash(buffer)` | Calcula el hash SHA-256 de un buffer de datos |

### `WorkflowService` (`Services/workflow.service.js`)

Servicio singleton que gestiona el ciclo de vida del flujo de firmas:

| Método | Descripción |
|--------|-------------|
| `enrutar(documento)` | Determina el siguiente firmante y estado según el paso actual |
| `procesarFirma(documentoId, usuarioFirmante, observaciones)` | Avanza el flujo tras una firma exitosa |
| `rechazar(documentoId, usuarioFirmante, motivo)` | Rechaza un documento con motivo |
| `asignarFirmanteInicial(documento)` | Asigna el primer firmante al subir un nuevo documento |
| `_buscarFirmante(rol_id, facultad_id)` | Busca el usuario firmante (prioriza misma facultad) |

### `AuthService` (`Services/auth.service.js`)

Servicio de autenticación:

| Método | Descripción |
|--------|-------------|
| Generación de JWT | Crea token firmado con `JWT_SECRET`, expira en `JWT_EXPIRES_IN` |
| Hash de contraseñas | Usa bcryptjs con salt rounds = 12 |
| Tokens de recuperación | Genera tokens temporales para reset de contraseña |

---

## 14. Seguridad

### Autenticación

- **JWT (JSON Web Tokens)**: Sesiones de 8 horas firmadas con clave secreta.
- El token se incluye en el header `Authorization: Bearer <token>` en cada petición.
- El payload del JWT incluye: `id`, `nombre`, `email`, `roles[]`.

### Protección de Contraseñas

- Las contraseñas nunca se almacenan en texto plano.
- Se usa **bcryptjs** con 12 rondas de salt para el hash.
- Flujo de recuperación de contraseña mediante tokens de un solo uso con expiración.

### Integridad Documental

- Cada documento tiene un `hash_sha256` calculado al momento de subida.
- El hash se recalcula tras cada firma y se registra en la auditoría.
- El código QR del sello visual incluye el hash previo a la firma para verificación.

### Cabeceras HTTP de Seguridad

El middleware **Helmet.js** aplica automáticamente:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-XSS-Protection`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`

### Validación de Inputs

Todos los endpoints de escritura usan **express-validator** para validar y sanitizar los datos de entrada antes de procesarlos.

### Control de Acceso a Documentos

- Solo el usuario asignado como `firmante_actual_id` puede firmar o rechazar un documento.
- Los usuarios con rol `RESPONSABLE_AREA` y `DOCENTE` solo pueden ver/subir en las actividades a las que fueron explícitamente asignados.

### Almacenamiento de Certificados

- Los certificados `.p12` se almacenan en `back-end/certs/` (directorio excluido del repositorio Git mediante `.gitignore`).
- La contraseña del certificado se configura exclusivamente en la variable de entorno `CERT_P12_PASSWORD`.

---

## 15. Estructura de Directorios del Proyecto

```
Gestion de Archivos/
├── back-end/
│   ├── Controller/
│   │   ├── auth.controller.js         # Autenticación, registro, gestión de usuarios
│   │   ├── documento.controller.js    # Subida, firma, rechazo y descarga de PDFs
│   │   ├── flujos.controller.js       # Gestión de flujos de firma
│   │   └── parametrizacion.controller.js  # CRUD de toda la jerarquía documental
│   ├── Middleware/
│   │   ├── auth.middleware.js         # Verificación de JWT
│   │   └── rbac.middleware.js         # Control de acceso por rol
│   ├── Model/
│   │   ├── index.js                   # Asociaciones entre modelos Sequelize
│   │   ├── Usuario.js
│   │   ├── Rol.js
│   │   ├── UsuarioRol.js
│   │   ├── Universidad.js
│   │   ├── Facultad.js
│   │   ├── Carrera.js
│   │   ├── Periodo.js
│   │   ├── Criterio.js
│   │   ├── Indicador.js
│   │   ├── Actividad.js
│   │   ├── Documento.js
│   │   ├── FlujoFirma.js
│   │   └── PasoFirma.js
│   ├── Routes/
│   │   ├── auth.routes.js
│   │   ├── documento.routes.js
│   │   ├── flujos.routes.js
│   │   └── parametrizacion.routes.js
│   ├── Services/
│   │   ├── auth.service.js            # Generación JWT, hash de contraseñas
│   │   ├── firma.service.js           # Pipeline completo firma PAdES-BES
│   │   └── workflow.service.js        # Motor del flujo de firmas secuencial
│   ├── Views/                         # Plantillas HTML para emails
│   ├── certs/                         # Certificados .p12 (excluidos del repositorio)
│   ├── config/
│   │   └── database.js               # Configuración Sequelize + PostgreSQL
│   ├── uploads/                       # PDFs subidos y firmados
│   ├── tests/                         # Pruebas unitarias Jest
│   ├── postman/                       # Colección Postman de la API
│   ├── seed.js                        # Datos iniciales: roles, universidad, usuarios
│   ├── seed-criterios.js              # 5 Criterios y 31 Indicadores oficiales
│   ├── server.js                      # Punto de entrada del backend
│   ├── package.json
│   └── .env.example
├── front-end/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── Layout.jsx         # Shell principal de la aplicación
│   │   ├── context/
│   │   │   ├── AppContext.jsx         # Provider del estado global
│   │   │   └── useApp.js              # Hook de acceso al contexto
│   │   ├── data/                      # Datos estáticos (criterios, indicadores)
│   │   ├── views/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ExploradorDeArchivos.jsx
│   │   │   ├── GestionUsuarios.jsx
│   │   │   ├── ParametrizacionAdmin.jsx
│   │   │   ├── HistorialAuditoria.jsx
│   │   │   ├── PanelLateralAuditoria.jsx
│   │   │   ├── PerfilCertificado.jsx
│   │   │   ├── RecuperarPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── App.jsx                    # Componente raíz + ErrorBoundary + Router
│   │   ├── main.jsx                   # Punto de entrada React
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── README.md                          # Vista rápida del proyecto
├── SETUP.md                           # Guía de instalación paso a paso
├── FLUJO.md                           # Descripción detallada del flujo de negocio
└── DOCUMENTACION_TESIS.md             # Este documento
```

---

## 16. Instalación y Configuración

### Requisitos Previos

| Herramienta | Versión mínima | Enlace |
|-------------|---------------|--------|
| **Node.js** | v18+ | https://nodejs.org/ |
| **PostgreSQL** | v14+ | https://www.postgresql.org/download/ |
| **Git** | v2.30+ | https://git-scm.com/ |

### Paso 1 — Clonar el Repositorio

```bash
git clone https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA.git
cd "GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA"
```

### Paso 2 — Crear la Base de Datos

```sql
-- En pgAdmin o psql:
CREATE DATABASE "Gestion_Archivos";
```

> Las tablas se crean automáticamente al iniciar el servidor (`sync({ alter: true })`).

### Paso 3 — Configurar el Backend

```bash
cd back-end
npm install
cp .env.example .env
# Editar .env con tus credenciales (ver sección 17)
```

### Paso 4 — Poblar la Base de Datos

```bash
# Desde la carpeta back-end:
node seed.js           # Roles, universidad, facultad, carrera, usuarios base
node seed-criterios.js # 5 Criterios y 31 Indicadores oficiales
```

### Paso 5 — Configurar el Frontend

```bash
cd ../front-end
npm install
```

### Paso 6 — Ejecutar la Aplicación

**Terminal 1 — Backend:**
```bash
cd back-end
npm run dev
# → Servidor en http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd front-end
npm run dev
# → Aplicación en http://localhost:5173
```

---

## 17. Variables de Entorno

Archivo: `back-end/.env`

```env
# ── Base de Datos PostgreSQL ──────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432           # Cambiar a 5433 si PostgreSQL usa ese puerto
DB_NAME=Gestion_Archivos
DB_USER=postgres
DB_PASSWORD=tu_contraseña_postgres

# ── Autenticación JWT ─────────────────────────────────────────────
JWT_SECRET=gestion_archivos_jwt_secret_2026
JWT_EXPIRES_IN=8h

# ── Servidor ──────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Archivos y Certificados ───────────────────────────────────────
UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

# ── Certificado Institucional para Firma PAdES ────────────────────
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `DB_HOST` | String | Host de PostgreSQL |
| `DB_PORT` | Integer | Puerto de PostgreSQL (default: 5432) |
| `DB_NAME` | String | Nombre de la base de datos |
| `DB_USER` | String | Usuario de PostgreSQL |
| `DB_PASSWORD` | String | Contraseña de PostgreSQL |
| `JWT_SECRET` | String | Clave secreta para firmar los JWT (mín. 32 chars) |
| `JWT_EXPIRES_IN` | String | Duración de la sesión JWT (ej: `8h`, `1d`) |
| `PORT` | Integer | Puerto del servidor Express |
| `NODE_ENV` | String | Entorno: `development` o `production` |
| `UPLOADS_DIR` | Path | Directorio para guardar los PDFs subidos |
| `CERTS_DIR` | Path | Directorio de certificados .p12 |
| `MAX_FILE_SIZE_MB` | Integer | Tamaño máximo de archivo en MB |
| `CERT_P12_PATH` | Path | Ruta al certificado .p12 institucional |
| `CERT_P12_PASSWORD` | String | Contraseña del archivo .p12 |

---

## 18. Scripts de Inicialización de Datos

### `seed.js` — Datos Base del Sistema

Crea los datos fundamentales para el funcionamiento del sistema:

1. **7 Roles** del sistema con sus niveles jerárquicos
2. **1 Universidad** (Universidad de Cuenca)
3. **1 Facultad** (Ingeniería)
4. **1 Carrera** (Ingeniería de Sistemas)
5. **8 Usuarios base** con contraseñas hasheadas y roles asignados
6. **FlujoFirma global** con sus 4 PasoFirma (Director → Subdecano → Decano → Rector)

### `seed-criterios.js` — Estructura de Acreditación

Crea la estructura documental oficial:

1. **1 Período Académico** (2026-I)
2. **5 Criterios** de acreditación
3. **31 Indicadores** oficiales distribuidos en los 5 criterios
4. **Asignación de responsables** predefinidos a cada indicador

---

## 19. Pruebas

### Ejecución de Pruebas

```bash
cd back-end

# Todas las pruebas
npm test

# Con salida detallada
npm run test:verbose

# Con reporte de cobertura de código
npm run test:coverage
```

### Configuración de Jest

```javascript
// back-end/jest.config.js
module.exports = {
  testEnvironment: 'node',
  // Utiliza Supertest para pruebas de integración de la API
};
```

### Tipos de Pruebas

| Tipo | Herramienta | Descripción |
|------|-----------|-------------|
| **Unitarias** | Jest | Pruebas de servicios y lógica de negocio aislada |
| **Integración** | Jest + Supertest | Pruebas de endpoints HTTP completos |

Las pruebas se ubican en `back-end/tests/`.

---

## 20. Guía de Usuarios del Sistema

### Usuarios de Prueba (Generados por seed.js)

| Rol | Correo Electrónico | Contraseña |
|-----|-------------------|-----------|
| `ADMINISTRADOR` | `admin@universidad.edu` | `Admin123!` |
| `RECTOR` | `rector@universidad.edu` | `Rector123!` |
| `DECANO` | `decano@universidad.edu` | `Decano123!` |
| `SUBDECANO` | `subdecano@universidad.edu` | `Subdecano123!` |
| `DIRECTOR_CARRERA` | `director@universidad.edu` | `Director123!` |
| `DOCENTE` | `docente@universidad.edu` | `Docente123!` |
| `RESPONSABLE_AREA` | `agalarza@universidad.edu` | `Galarza123!` |
| `RESPONSABLE_AREA` | `oalvarez@universidad.edu` | `Alvarez123!` |

### Guía por Rol

#### Responsable de Área / Docente
1. Iniciar sesión con sus credenciales.
2. Ir al **Explorador de Archivos**.
3. Navegar: Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad.
4. Seleccionar la actividad asignada y hacer clic en **Subir Documento**.
5. Arrastrar y soltar el PDF o seleccionarlo desde el explorador de archivos.
6. El documento queda en estado `PENDIENTE` y el Director de Carrera es notificado.

#### Director de Carrera
1. Iniciar sesión → acceder al **Explorador de Archivos**.
2. Los documentos en estado `PENDIENTE` asignados a su carrera aparecen destacados.
3. Revisar el documento (visor PDF integrado).
4. Seleccionar **Firmar** (✅) o **Rechazar** (❌) con un motivo opcional.

#### Subdecano / Decano
1. Mismo proceso que el Director de Carrera.
2. Solo ven los documentos en el estado correspondiente a su paso del flujo.
3. Cada firma estampa un sello visual QR en la esquina asignada del PDF.

#### Rector
1. Accede a los documentos en estado `FIRMADO_DECANO`.
2. Su firma es la **firma final** → el documento pasa a estado `COMPLETADO`.
3. El PDF completado contiene 4 sellos visuales QR verificables.

#### Administrador
1. Gestionar la **estructura institucional** (Parametrización Admin).
2. Administrar **usuarios**: crear, asignar roles, cambiar facultad/carrera, resetear contraseñas.
3. Consultar el **Historial de Auditoría** para revisar cualquier acción del sistema.
4. Gestionar el **Perfil y Certificado** institucional (.p12) para habilitar las firmas.

---

## 21. Glosario Técnico

| Término | Definición |
|---------|-----------|
| **PAdES** | PDF Advanced Electronic Signatures. Estándar ETSI para firmas digitales embebidas en documentos PDF. |
| **PAdES-BES** | Baseline Electronic Signature. Perfil básico de PAdES que garantiza integridad y autenticidad sin necesidad de sellado de tiempo externo. |
| **PKCS#7 / CMS** | Cryptographic Message Syntax. Estándar para mensajes criptográficos. Usado para la firma digital del PDF. |
| **PKCS#12 (.p12)** | Estándar para almacenar una clave privada y su certificado público en un único archivo protegido por contraseña. |
| **JWT** | JSON Web Token. Token compacto y autocontenido para transmitir información de autenticación de forma segura. |
| **RBAC** | Role-Based Access Control. Sistema de control de acceso donde los permisos se asignan a roles, no a usuarios individuales. |
| **ORM** | Object-Relational Mapper. Herramienta que mapea objetos de código a tablas de base de datos. Sequelize es el ORM usado. |
| **Sequelize** | ORM para Node.js compatible con PostgreSQL, MySQL, SQLite y MS SQL. |
| **SHA-256** | Secure Hash Algorithm 256-bit. Función de hash criptográfico usada para calcular la huella digital de los documentos. |
| **SPA** | Single Page Application. Aplicación web que carga una sola página HTML y actualiza el contenido dinámicamente. |
| **API REST** | Architectural style for distributed hypermedia systems. Interfaz de programación que usa verbos HTTP (GET, POST, PUT, DELETE). |
| **QR** | Quick Response Code. Código de barras bidimensional que codifica información legible por escáner. Usado en los sellos de firma para verificación. |
| **bcrypt** | Función de hash de contraseñas con salting y work factor configurable. |
| **node-forge** | Biblioteca JavaScript de criptografía para manejo de PKI, PKCS#12, PKCS#7 y X.509. |
| **pdf-lib** | Biblioteca JavaScript para crear y modificar documentos PDF programáticamente. |
| **Multer** | Middleware de Node.js para el manejo de `multipart/form-data` (subida de archivos). |
| **Helmet** | Middleware de Express que configura cabeceras HTTP de seguridad. |
| **Criterio** | Categoría principal de evaluación en el proceso de acreditación universitaria (5 en total). |
| **Indicador** | Métrica específica dentro de un criterio de acreditación (31 en total). |
| **Actividad** | Contenedor de documentos PDF dentro de un Indicador. Equivale a una "carpeta" de evidencias. |
| **Flujo de Firma** | Configuración dinámica de los pasos y roles requeridos para aprobar un documento. |
| **PasoFirma** | Cada etapa individual dentro de un FlujoFirma (orden + rol requerido). |
| **Hash de Integridad** | Valor SHA-256 calculado sobre el contenido del archivo que detecta cualquier modificación posterior. |

---

*Documentación generada el 18 de agosto de 2026 · Proyecto de Titulación — Universidad de Cuenca*
