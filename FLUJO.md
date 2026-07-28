# Flujo de la aplicación

Este documento describe cómo funciona el sistema de gestión documental con firma digital, desde el inicio de sesión hasta la firma final de un documento.

---
## Nuevos Cambios a implementar y corregir 


## Roles del sistema

El sistema tiene tres roles con permisos distintos:

| Rol | Descripción | Puede hacer |
|-----|-------------|-------------|
| `DOCENTE` | Docente universitario | Subir documentos PDF, ver sus documentos |
| `DECANO` | Decano de facultad | Firmar/rechazar documentos en estado `PENDIENTE`; gestionar parametrización |
| `RECTOR` | Rector de la universidad | Firmar/rechazar documentos en estado 
`ADMINISTRADOR` | Administrador de todo el sistema es superadmin y tiene acceso a todas las funciones del sistema
`FIRMADO_DECANO`; gestionar parametrización; crear usuarios |

---

## 1. Autenticación

```
┌─────────────────────────────────────────────────────┐
│                    LOGIN                            │
│                                                     │
│  Usuario ingresa email + contraseña                 │
│           ↓                                         │
│  Backend valida credenciales con bcrypt             │
│           ↓                                         │
│  Se genera un token JWT (válido 8 horas)            │
│           ↓                                         │
│  Frontend guarda el token y redirige al Dashboard   │
└─────────────────────────────────────────────────────┘
```

El token JWT se envía en cada petición como cabecera `Authorization: Bearer <token>`. Si el token vence, el usuario es redirigido al login.

---

## 2. Jerarquía de carpetas (parametrización)

Los documentos se organizan en cuatro niveles jerárquicos. Solo `DECANO` y `RECTOR` pueden crear y editar esta estructura desde el panel de **Parametrización**.

```
Universidad
  └── Facultad
        └── Período académico  (ej: 2026-I)
              └── Criterio     (ej: Investigación)
                    └── Actividad  ← aquí se suben los documentos
```

**Ejemplo real:**

```
Universidad Central del Ecuador
  └── Facultad de Ingeniería
        └── 2026-I
              └── Investigación
                    └── Publicación de artículos  ← Docente sube su PDF aquí
```

---

## 3. Flujo de firma de documentos

Este es el flujo principal del sistema:

```
┌──────────────────────────────────────────────────────────────────┐
│                    DOCENTE                                       │
│                                                                  │
│  1. Navega por el Explorador de Archivos                        │
│  2. Abre una Actividad                                          │
│  3. Arrastra un PDF o hace clic en "Subir documento"            │
│  4. El documento queda en estado: PENDIENTE                     │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                    DECANO                                        │
│                                                                  │
│  5. Ve los documentos PENDIENTES en su panel                    │
│  6. Puede:                                                      │
│     ✅ Firmar → estado cambia a: FIRMADO_DECANO                 │
│        (se incrusta firma digital PAdES en el PDF)              │
│     ❌ Rechazar → estado cambia a: RECHAZADO                    │
│        (el docente puede volver a subir el documento)           │
└──────────────────────────────────────────────────────────────────┘
                            ↓ (si fue firmado)
┌──────────────────────────────────────────────────────────────────┐
│                    RECTOR                                        │
│                                                                  │
│  7. Ve los documentos FIRMADO_DECANO en su panel                │
│  8. Puede:                                                      │
│     ✅ Firmar → estado cambia a: COMPLETADO                     │
│        (se incrusta segunda firma PAdES en el PDF)              │
│     ❌ Rechazar → estado cambia a: RECHAZADO                    │
└──────────────────────────────────────────────────────────────────┘
```

### Estados posibles de un documento

| Estado | Significado | Quién puede actuar |
|--------|-------------|-------------------|
| `PENDIENTE` | Recién subido, esperando firma del Decano | DECANO |
| `FIRMADO_DECANO` | Firmado por el Decano, esperando firma del Rector | RECTOR |
| `COMPLETADO` | Firmado por ambos, proceso terminado | — |
| `RECHAZADO` | Rechazado en algún paso | DOCENTE (puede volver a subir) |

---

## 4. Firma digital PAdES

Cuando un Decano o Rector firma un documento:

1. El backend recupera el PDF del disco.
2. Carga el certificado `.p12` configurado en `.env`.
3. Con `pdf-lib` y `node-forge` incrusta la firma digital directamente en el PDF.
4. Calcula un nuevo hash SHA-256 del PDF firmado.
5. Guarda el PDF firmado sobreescribiendo el original.
6. Registra la acción en el log de auditoría.

El PDF firmado puede descargarse y la firma puede verificarse con Adobe Acrobat u otros lectores compatibles con PAdES.

---

## 5. Vistas de la aplicación

### Dashboard
Pantalla principal tras iniciar sesión. Muestra:
- Métricas globales: total de documentos, pendientes, firmados, rechazados.
- Gráfico de documentos por criterio.
- Últimas acciones de auditoría.
- Alertas activas.

### Explorador de Archivos
Navegador de la jerarquía de carpetas (Universidad → Facultad → Período → Criterio → Actividad). Desde aquí el Docente sube documentos y cualquier rol puede ver y descargar los PDF.

### Parametrización (solo DECANO / RECTOR)
Panel para crear y editar la estructura jerárquica: universidades, facultades, períodos, criterios y actividades.

### Gestión de Usuarios (solo DECANO / RECTOR)
Lista de usuarios registrados. Permite cambiar el rol de un usuario, editar sus datos o eliminarlo. Solo el RECTOR puede crear usuarios con rol específico.

### Perfil de Certificado (solo DECANO / RECTOR)
Muestra información del certificado digital institucional activo (vigencia, titular, emisor).

### Historial de Auditoría (solo DECANO / RECTOR)
Registro completo de todas las acciones realizadas en el sistema: subidas, firmas, rechazos, inicios de sesión, cambios de roles.

---

## 6. API REST — Resumen de endpoints

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/login` | Iniciar sesión | Público |
| POST | `/registro` | Registrarse (rol DOCENTE por defecto) | Público |
| POST | `/registrar` | Crear usuario con rol específico | RECTOR |
| GET | `/perfil` | Ver perfil del usuario autenticado | Todos |
| GET | `/roles` | Listar roles disponibles | Todos |
| GET | `/usuarios` | Listar todos los usuarios | DECANO, RECTOR |
| PUT | `/usuarios/:id` | Editar datos de un usuario | DECANO, RECTOR |
| PUT | `/usuarios/:id/rol` | Cambiar rol de un usuario | DECANO, RECTOR |
| DELETE | `/usuarios/:id` | Eliminar usuario | DECANO, RECTOR |

### Documentos (`/api/documentos`)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/subir` | Subir un PDF | Todos |
| GET | `/` | Listar documentos | Todos |
| GET | `/resumen` | Métricas de documentos | Todos |
| GET | `/:id` | Ver detalle de un documento | Todos |
| GET | `/:id/descargar` | Descargar el PDF | Todos |
| POST | `/:id/firmar` | Firmar digitalmente | DECANO, RECTOR |
| POST | `/:id/rechazar` | Rechazar un documento | DECANO, RECTOR |
| DELETE | `/:id` | Eliminar documento | Todos |

### Parametrización (`/api/parametrizacion`)

Endpoints para CRUD de universidades, facultades, períodos, criterios y actividades. Solo accesibles para `DECANO` y `RECTOR`.

---

## 7. Modelo de datos

```
Rol ──────────────────────────────────── Usuario
                                           │
                              ┌────────────┤
                              │            │
                           Facultad    Documento
                              │            │
                         Universidad   Actividad
                                           │
                                        Criterio
                                           │
                                         Periodo
                                           │
                                        Facultad
```

### Relaciones principales

- Un `Usuario` tiene un `Rol` (DOCENTE / DECANO / RECTOR).
- Un `Usuario` pertenece a una `Facultad` (DOCENTE y DECANO) o es global (RECTOR).
- Un `Documento` fue subido por un `Usuario`, pertenece a una `Actividad` y tiene un firmante actual.
- Las `Actividades` se agrupan en `Criterios` → `Períodos` → `Facultades` → `Universidades`.
