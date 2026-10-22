# 📋 Plan de Arquitectura, Reorganización y Mejora de Usabilidad (Entorno de Pruebas `test`)

## 🎯 Estado Actual (Fases 1 a 4 — Completadas)

1. **Eliminación del nivel `Actividad` (Subida directa en `Subcriterio`):** ✅ Completado
2. **Jerarquía Documental Simplificada (`Universidad → Facultad → Período → Carrera → Criterio → Subcriterio → PDF`):** ✅ Completado
3. **Tablas Estructuradas para `Criterios` y `Subcriterios` en `ParametrizacionAdmin.jsx`:** ✅ Completado

---

## 🚀 Fase 5: Plan de Mejora de Usabilidad (UX) — "De 6 Clics a 1 Solo Paso"

### 🔍 Diagnóstico: ¿Por qué hoy se sienten muchos pasos?

1. **En el Explorador de Archivos ([`ExploradorDeArchivos.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ExploradorDeArchivos.jsx)):**
   - **Problema actual (6 pantallas separadas):** Para subir un solo PDF, el usuario tiene que hacer **6 clics secuenciales**:
     `1. Clic en Universidad → 2. Clic en Facultad → 3. Clic en Período → 4. Clic en Carrera → 5. Clic en Criterio → 6. Clic en Subcriterio → Subir PDF`.
   - Si el usuario necesita subir evidencias en 10 subcriterios distintos de una misma carrera, tiene que **entrar y salir por los breadcrumbs una y otra vez**.
   - Además, casi siempre hay **1 sola Universidad** (y muchas veces 1 Facultad o Período activo), por lo que pedir clic en esos niveles es innecesario.

2. **En Parametrización ([`ParametrizacionAdmin.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ParametrizacionAdmin.jsx)):**
   - **Contexto desconectado entre pestañas:** Al cambiar entre `Período`, `Carrera`, `Criterio` y `Subcriterio`, el usuario tiene que volver a elegir `Universidad → Facultad → Período → Carrera` en cada pestaña.
   - **Formularios grandes siempre abiertos arriba de las tablas:** Como al crear una Carrera/Período ya se autogeneran los **5 Criterios y 31 Subcriterios**, el 95% de las veces el administrador entra a **consultar, filtrar o editar en la tabla**, pero el formulario de "Nuevo Criterio / Nuevo Subcriterio" ocupa la mitad superior de la pantalla.
   - **Falta de puente directo con el Explorador:** Desde la tabla de Subcriterios en Parametrización no hay un botón para saltar directo a subir/ver los PDFs de ese subcriterio.

---

### 💡 Propuesta de Mejoras (Reducción de 6 pasos a 1–2 clics)

#### Mejora 1: Barra Superior de Contexto Rápido + Auto-selección Inteligente en el Explorador
En [`ExploradorDeArchivos.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ExploradorDeArchivos.jsx):
- **Auto-salto de niveles únicos y memoria de sesión (`localStorage`):**
  - Si solo existe **1 Universidad**, se selecciona automáticamente al entrar (ahorra 1 paso siempre).
  - Si la universidad tiene **1 sola Facultad** o **1 solo Período**, se preselecciona automáticamente.
  - Se guarda en `localStorage` la última `Facultad + Período + Carrera` usada por el usuario para que al volver al Explorador aterrice directamente en su Carrera de trabajo.
- **Selectores Rápidos en la Cabecera (`Facultad ▾` | `Período ▾` | `Carrera ▾`):**
  - El usuario puede cambiar de Carrera o Período desde cualquier pantalla con **1 solo clic en el selector superior**, sin tener que retroceder a `Inicio`.

#### Mejora 2: Vista Matriz / Tabla Interactiva de Carrera en el Explorador (Subir PDF en 1 Clic)
En [`ExploradorDeArchivos.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ExploradorDeArchivos.jsx):
- Cuando el usuario está dentro de una **Carrera** (ej. *Software — 2026-I*), en lugar de obligarlo a abrir carpetas de Criterios y luego carpetas de Subcriterios una por una:
  - Mostrar los **5 Criterios como secciones/acordeones o pestañas filtro (`Todos | 1. Currículo | 2. Academia...`)** con la **Tabla directa de los 31 Subcriterios**.
  - **Indicador de Progreso de la Carrera:** Barra superior que muestre cuántos de los 31 subcriterios ya tienen documentos cargados (ej. `14 / 31 subcriterios con evidencia (45%)`).
  - **Acción rápida en cada fila de Subcriterio:**
    - Botón **`[+ Subir PDF]` directo en la fila** (abre el selector de archivo o permite soltar el PDF sobre la fila sin cambiar de pantalla).
    - Botón **`[Ver documentos (N)]`** que despliega los PDFs de ese subcriterio ahí mismo (o abre su vista detalle), permitiendo ver, descargar o firmar sin perder de vista los demás subcriterios.

#### Mejora 3: Contexto Persistente y Formularios Colapsables en `ParametrizacionAdmin.jsx`
En [`ParametrizacionAdmin.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ParametrizacionAdmin.jsx):
- **Barra de Contexto Compartida:** Si seleccionas una `Universidad`, `Facultad`, `Período` o `Carrera` en una pestaña, esa selección se mantiene activa al pasar a `Criterio` o `Subcriterio` (y se autoselecciona la primera Universidad/Facultad por defecto).
- **Tabla como protagonista en `Criterio` y `Subcriterio`:**
  - Mostrar primero la **Barra de Filtros + Tabla Estructurada** para trabajar de inmediato.
  - Convertir el formulario de "Agregar Criterio / Subcriterio manual" en un panel desplegable con un botón **`+ Nuevo Subcriterio`** (ya que los 31 subcriterios se crean automáticamente con el período/carrera).
- **Botón de Salto Directo `[📂 Documentos]` en la tabla de Subcriterios:**
  - En cada fila de la tabla de Subcriterios en Parametrización, incluir un botón que lleve directamente a ese Subcriterio en el Explorador de Archivos.

---

### 📊 Comparativa de Pasos (Antes vs. Después)

| Tarea Frecuente | Antes | Con este Plan UX |
| :--- | :--- | :--- |
| **Entrar al sistema y llegar a los 31 Subcriterios de una Carrera** | **5 clics** (`Universidad → Facultad → Período → Carrera → Criterio`) | **0 a 1 clic** (Auto-selección inteligente + Vista Matriz de Carrera) |
| **Subir PDFs en 5 subcriterios distintos de la misma carrera** | **15+ clics** (Entrar a Criterio → Entrar a Subcriterio → Subir → Volver atrás → Repetir) | **5 clics** (Botón `[+ Subir PDF]` directo en cada fila de la tabla de la Carrera) |
| **Saber qué subcriterios de una carrera están vacíos (sin PDFs)** | Entrar criterio por criterio revisando tarjetas | **De un vistazo** (Semáforo `Con evidencia / Sin archivos` + filtro `Solo pendientes` + barra de progreso `X/31`) |
| **Filtrar Subcriterios en Parametrización** | Elegir 5 dropdowns cada vez que cambias de pestaña | **Instantáneo** (Contexto compartido y preseleccionado) |

---

### 📁 Archivos a Modificar en la Fase 5

1. **[`front-end/src/views/ExploradorDeArchivos.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ExploradorDeArchivos.jsx):**
   - Auto-selección de Universidad/Facultad/Período/Carrera (con persistencia en `localStorage` y soporte de `navParams` para salto directo).
   - Barra superior de selectores rápidos (`Facultad ▾`, `Período ▾`, `Carrera ▾`).
   - Vista unificada de Carrera: filtro rápido por Criterio (`Todos`, `1..5`), barra de avance (`X/31 subcriterios con documentos`), filtro de estado (`Todos / Con documentos / Sin documentos`), subida directa `[+ Subir PDF]` desde la fila del subcriterio y despliegue inline o modal de sus documentos.
2. **[`front-end/src/views/ParametrizacionAdmin.jsx`](file:///c:/Users/User/Desktop/PROYECTOS%20PERSONALES/Gestion%20de%20Archivos/front-end/src/views/ParametrizacionAdmin.jsx):**
   - Auto-preselección de Universidad/Facultad/Período/Carrera y sincronización del contexto entre pestañas.
   - Formulario de creación manual colapsable (`+ Nuevo Criterio` / `+ Nuevo Subcriterio`) para dar prioridad visual a las tablas.
   - Botón de acceso directo desde cada fila de Subcriterio hacia sus documentos en el Explorador.
