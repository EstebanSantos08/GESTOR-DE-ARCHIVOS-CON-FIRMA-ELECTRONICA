# Flujo de la Aplicación

Este documento describe detalladamente la arquitectura de negocio, la jerarquía de acreditación, el flujo de aprobación por firma electrónica PAdES y las funcionalidades del sistema.

---

## 🎭 Roles del Sistema (7 Niveles Jerárquicos)

El sistema implementa un control de acceso basado en roles (`RBAC`) jerárquico de 7 niveles:

| Nivel | Rol | Descripción | Permisos y Capacidades |
|:---:|-----|-------------|-----------------------|
| **1** | `RESPONSABLE_AREA` | Responsable de área | Sube evidencias/documentos PDF asignados en los indicadores de acreditación. |
| **2** | `DOCENTE` | Docente universitario | Sube documentos académicos (sílabos, entregables). |
| **3** | `DIRECTOR_CARRERA` | Director de carrera | Primera firma electrónica en el flujo de aprobación de su carrera. |
| **4** | `SUBDECANO` | Subdecano | Segunda firma electrónica en el flujo de aprobación de la facultad. |
| **5** | `DECANO` | Decano de facultad | Tercera firma electrónica en el flujo de aprobación de la facultad. |
| **6** | `RECTOR` | Rector de la universidad | Firma electrónica final (cuarta firma) y aprobación institucional definitiva. |
| **7** | `ADMINISTRADOR` | Administrador del sistema | Gestión total del sistema (usuarios, estructura, auditoría). No firma documentos. |

---

## 🏛️ Jerarquía de Carpetas y Acreditación (7 Niveles)

La estructura documental del sistema sigue la parametrización institucional de acreditación universitaria:

```
Universidad
  └── Facultad
        └── Carrera
              └── Período Académico (ej: 2026-I)
                    └── Criterio de Acreditación (5 Criterios)
                          └── Indicador de Acreditación (31 Indicadores)
                                └── Actividad (Contenedor de documentos PDF)
```

### 📋 Los 5 Criterios Oficiales de Acreditación

1. **1. CURRÍCULO** (Indicadores 1 al 7)
2. **2. DOCENCIA** (Indicadores 8 al 17)
3. **3. INVESTIGACIÓN E INNOVACIÓN** (Indicadores 18 al 20)
4. **4. VINCULACIÓN CON LA SOCIEDAD** (Indicadores 21 al 23)
5. **5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE** (Indicadores 24 al 31)

---

## ✍️ Flujo de Firma Digital PAdES (4 Niveles)

El ciclo de vida de aprobación de un documento sigue la siguiente secuencia jerárquica:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   1. DOCENTE / RESPONSABLE DE ÁREA                      │
│                                                                          │
│  - Navega en el Explorador por Universidad → Facultad → Carrera → etc.    │
│  - Selecciona la Actividad e ingresa un documento PDF.                   │
│  - El documento ingresa en estado: PENDIENTE                             │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   2. DIRECTOR DE CARRERA (Paso 1/4)                      │
│                                                                          │
│  - Revisa el documento PENDIENTE.                                        │
│  - Acciones posibles:                                                    │
│    ✅ Firmar: Aplica firma PAdES → Estado: FIRMADO_DIRECTOR             │
│    ❌ Rechazar: Estado: RECHAZADO (permite re-subida)                   │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   3. SUBDECANO (Paso 2/4)                                │
│                                                                          │
│  - Revisa documento en estado FIRMADO_DIRECTOR.                          │
│  - Acciones posibles:                                                    │
│    ✅ Firmar: Aplica firma PAdES → Estado: FIRMADO_SUBDECANO            │
│    ❌ Rechazar: Estado: RECHAZADO                                       │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   4. DECANO (Paso 3/4)                                   │
│                                                                          │
│  - Revisa documento en estado FIRMADO_SUBDECANO.                         │
│  - Acciones posibles:                                                    │
│    ✅ Firmar: Aplica firma PAdES → Estado: FIRMADO_DECANO                │
│    ❌ Rechazar: Estado: RECHAZADO                                       │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   5. RECTOR (Paso 4/4 - Firma Final)                     │
│                                                                          │
│  - Revisa documento en estado FIRMADO_DECANO.                            │
│  - Acciones posibles:                                                    │
│    ✅ Firmar: Aplica firma PAdES final → Estado: COMPLETADO              │
│    ❌ Rechazar: Estado: RECHAZADO                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 📊 Estados del Documento

| Estado | Significado | Siguiente Acción / Rol |
|--------|-------------|------------------------|
| `PENDIENTE` | Recién cargado por Docente / Responsable | Pendiente firma de `DIRECTOR_CARRERA` |
| `FIRMADO_DIRECTOR` | Firmado por Director de Carrera | Pendiente firma de `SUBDECANO` |
| `FIRMADO_SUBDECANO` | Firmado por Subdecano | Pendiente firma de `DECANO` |
| `FIRMADO_DECANO` | Firmado por Decano | Pendiente firma final de `RECTOR` |
| `COMPLETADO` | Firmado por las 4 autoridades secuencialmente | Proceso finalizado exitosamente |
| `RECHAZADO` | Rechazado en cualquier etapa del flujo | Habilitado para re-subida |

---

## 🔏 Proceso Técnico de Firma PAdES

Al firmar un PDF:
1. Se verifica el archivo original y su validez de formato PDF.
2. Se carga el certificado `.p12` mediante `node-forge`.
3. Con `pdf-lib` se estampa el **sello visual de firma** indicando el nombre del firmante, cargo, fecha, hora e identificador de verificación.
4. Se genera la firma digital PKCS#7 encriptada y se incrusta en el documento.
5. Se calcula el **hash de integridad SHA-256** actualizado y se registra en la auditoría.

---

## 🖥️ Módulos de la Aplicación

1. **Dashboard**: Panel estadístico interactivo con gráficos de estado, desglose por criterio, alertas de flujo y auditoría reciente.
2. **Explorador de Archivos**: Navegación en árbol de las 7 capas (Universidad a Actividad) con gestor de subida y visor de documentos.
3. **Parametrización Admin**: Gestión jerárquica con menú desplegable para la selección directa de Criterios (5), Indicadores (31) y Usuarios Responsables.
4. **Gestión de Usuarios**: Administración de cuentas, cambio de roles, asignación de facultades/carreras y reajuste administrativo de contraseñas.
5. **Historial de Auditoría**: Bitácora inmutable de eventos (Cargas, Firmas, Rechazos, Creación de Estructura, Autenticaciones).
azar un documento | DECANO, RECTOR |
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
