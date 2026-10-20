El plan de arquitectura y ejecución para el entorno de pruebas queda definido con los dos cambios estructurales confirmados:

1. **Renombrado / Equivalencia (`Indicador` → `Subcriterio`):** Los 5 Criterios oficiales agruparán los **31 Subcriterios** (antes llamados Indicadores), y de cada Subcriterio colgarán sus **Actividades**.


2. **Nuevo Orden Jerárquico y Auto-Generación por Carrera (`Universidad → Facultad → Período → Carrera → Criterio → Subcriterio → Actividad`):** Al seleccionar **Universidad + Facultad** y crear un **Período** (ej. `2026-I`), el sistema generará automáticamente dentro de ese período las carpetas separadas para **cada carrera activa de esa facultad** (ej. *Software*, *RVV*, *Robótica*, *TI*, *BM*) con todo su árbol independiente de `Criterio → Subcriterio → Actividad`.



---

## 🏛️ Nueva Jerarquía Documental (7 Niveles)

```text
Universidad (ej. UCACUE)
 └── Facultad (ej. Facultad de Ingeniería)
      └── Período Académico (ej. 2026-I — se crea a nivel Facultad)
           ├── 📁 Carrera: Software
           │    └── Criterio (1 al 5)
           │         └── — Subcriterio (1 al 31)
           │              └── — Actividad (Informe de Evidencias / Matriz...)
           │                   └── 📄 Documentos PDF (aislados para Software)
           │
           └── 📁 Carrera: RVV (Realidad Virtual)
                └── Criterio (1 al 5)
                     └── — Subcriterio (1 al 31)
                          └── — Actividad (Informe de Evidencias / Matriz...)
                               └── 📄 Documentos PDF (aislados para RVV)

```

---

## 🛠️ Plan de Trabajo Paso a Paso (Entorno de Pruebas)

### Paso 1: Modelos Sequelize y Relaciones (`back-end/Model/`)

Para que el cambio sea limpio, cumpla con el requerimiento de "crear tablas para criterio, subcriterio y actividades" y no rompa ninguna prueba existente:

| Modelo / Archivo | Cambios Exactos |
| --- | --- |
| **`Model/Periodo.js`** | Cambiar pertenencia a Facultad (`facultad_id` obligatorio) y conservar `carrera_id` (`allowNull: true`) por retrocompatibilidad. Así un Período pertenece a la Facultad escogida.

 |
| **`Model/Criterio.js`** | Agregar `carrera_id` (`allowNull: true`) además de `periodo_id`. De esta forma, dentro de un mismo `periodo_id`, las carpetas de Criterios de **Software** (`carrera_id = 1`) quedan físicamente separadas de las de **RVV** (`carrera_id = 2`).

 |
| **`Model/Subcriterio.js`** *(Nuevo)* | Crear el modelo `Subcriterio` (`tableName: 'subcriterios'`) con `id`, `numero` (1-31), `nombre`, `descripcion`, `criterio_id`, `responsable_id`, `responsable_nombre`, `activo` (estructura idéntica a `Indicador.js`) y tabla pivote `subcriterios_responsables`.

 |
| **`Model/Actividad.js`** | Agregar la FK `subcriterio_id` (`allowNull: true`) mantendo `indicador_id` (`allowNull: true`) sincronizado para que cualquier código legacy siga funcionando.

 |
| **`Model/index.js`** | Declarar asociaciones:<br>

<br>• `Facultad.hasMany(Periodo, { foreignKey: 'facultad_id', as: 'periodos' })`<br><br>

<br>• `Criterio.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' })`<br><br>

<br>• `Criterio.hasMany(Subcriterio, { foreignKey: 'criterio_id', as: 'subcriterios' })`<br><br>

<br>• `Subcriterio.hasMany(Actividad, { foreignKey: 'subcriterio_id', as: 'actividades' })`<br><br>

<br>• Exportar `Subcriterio` junto a los demás modelos.

 |

---

### Paso 2: Servicio y Controlador de Auto-Generación (`back-end/Controller/` y `Services/`)

1. **Catálogo Base de los 5 Criterios y 31 Subcriterios (`back-end/Utils/catalogoAcreditacion.js`):**
* Centralizar los 5 Criterios oficiales y los 31 Subcriterios (con sus actividades base: *"Informe de Evidencias - [Subcriterio]"* y *"Matriz Consolidada - [Subcriterio]"*) en un módulo reutilizable tanto por el `seed.js` como por el endpoint de creación de Período.




2. **Generación Automática al crear Período (`POST /api/parametrizacion/periodos`):**
* Cuando el usuario envíe `{ nombre: "2026-I", facultad_id: X, generar_estructura: true }` (o por defecto al crear período en una facultad):


1. Inicia una transacción `sequelize.transaction()`.


2. Crea el `Periodo` vinculado a `facultad_id`.


3. Busca todas las carreras activas de esa facultad (`Carrera.findAll({ where: { facultad_id, activo: true } })`, ej. *Software*, *RVV*, etc.).


4. Por cada carrera encontrada, inserta sus **5 Criterios** (`periodo_id`, `carrera_id`), sus **31 Subcriterios** (`criterio_id`) y sus **Actividades** (`subcriterio_id`).


5. Si luego se agrega una nueva carrera a la facultad, también tendrá un helper para generarle sus carpetas en el período activo.




3.  Árbol `GET /api/parametrizacion/estructura`:
* Actualizar el árbol JSON para que devuelva la jerarquía en el nuevo orden exacto:
`Universidad → facultades[] → periodos[] → carreras[] → criterios[] → subcriterios[] (con alias indicadores[]) → actividades[]`.




4. **Endpoints CRUD `/api/parametrizacion/subcriterios`:**
* Crear rutas `GET`, `POST`, `PUT`, `DELETE` y `POST /subcriterios/:id/responsables` en `parametrizacion.routes.js` (manteniendo `/indicadores` apuntando al mismo controlador por compatibilidad).




5. **`workflow.service.js`:**
* En `asignarFirmanteInicial`, permitir resolver el `flujo_id` subiendo por `Actividad → Subcriterio → Criterio` (además del fallback a `FlujoGlobal`).





---

### Paso 3: Suite de Pruebas en Jest + Supertest (`back-end/tests/`)

Crearemos un archivo de prueba dedicado `back-end/tests/estructura-facultad-periodo-carrera.test.js` que validará en el entorno de pruebas:

1. Creación de las tablas `criterios`, `subcriterios` y `actividades`.
2. Creación de una Universidad, una Facultad y dos carreras: **`Software`** y **`RVV`**.
3. Llamada a `POST /api/parametrizacion/periodos` escogiendo Universidad y Facultad:
* Verifica que el período se cree para la Facultad.
* Verifica que dentro del período existan carpetas separadas para **`Software`** y para **`RVV`**.
* Verifica que tanto `Software` como `RVV` tengan sus propios Criterios → Subcriterios (1 al 31) → Actividades con IDs independientes en base de datos.


4. Verificación de que `GET /api/parametrizacion/estructura` devuelva el árbol en el orden `Universidad → Facultad → Período → Carrera → Criterio → Subcriterio → Actividad`.

---

### Paso 4: Actualización del Front-End (`front-end/src/`)

1. **`ExploradorDeArchivos.jsx`:**
* Cambiar el orden de navegación de niveles:
`universidades` → `facultades` → **`periodos`** → **`carreras`** (*Software*, *RVV*...) → `criterios` → **`subcriterios`** → `actividades` → `documentos`.


* Actualizar `Breadcrumbs` para mostrar: `Inicio > UCACUE > Facultad de Ingeniería > 2026-I > Software > 1. CURRÍCULO > [1] Perfil de egreso > Informe de Evidencias`.




2. **`ParametrizacionAdmin.jsx` y `AppContext.jsx`:**
* Reordenar las pestañas a: `Universidad | Facultad | Período | Carrera | Criterio | Subcriterio | Actividad | Docentes | Flujos Firma`.


* En la pestaña **Período**, pedir únicamente **Universidad** + **Facultad** + **Nombre del Período** y mostrar un mensaje informativo: *"Al crear el período se generarán automáticamente las carpetas de Criterios, Subcriterios y Actividades por separado para cada carrera de la facultad escogida"*.


* Cambiar todas las etiquetas visuales de "Indicador / Indicadores" a **"Subcriterio / Subcriterios"** en formularios y selectores.




