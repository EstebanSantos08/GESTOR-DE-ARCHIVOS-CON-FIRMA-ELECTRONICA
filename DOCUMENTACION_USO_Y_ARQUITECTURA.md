# Manual de Uso y Documentación Técnica — Sistema de Gestión de Archivos con Firma Electrónica

Este documento detalla el funcionamiento integral, la arquitectura, los roles de usuario y la guía paso a paso de uso del **Sistema de Gestión Documental y Acreditación Universitaria con Firma Electrónica (PAdES-BES + Código QR)**.

---

## 1. Propósito General del Sistema

La plataforma centraliza la recolección, revisión y firma electrónica secuencial de evidencias académicas (documentos PDF) organizadas bajo el modelo de acreditación universitaria (**Criterios**, **Subcriterios** y **Carpetas de Evidencia**).

Todos los documentos PDF subidos al sistema pasan por un **flujo de firma digital jerárquico** configurable. Cada firma estampa progresivamente en el PDF un sello visual con **código QR de verificación**, metadatos criptográficos y hash **SHA-256** que garantiza la integridad del archivo.

---

## 2. Arquitectura y Estructura Jerárquica

### 2.1 Jerarquía Institucional de Archivos

El almacenamiento y navegación dentro del sistema sigue una estructura de **8 niveles**:

1. **Universidad** (ej. UCACUE)
2. **Facultad**
3. **Carrera**
4. **Período Académico** (ej. `2026-I`)
5. **Criterio de Acreditación**
6. **Subcriterio / Indicador**
7. **Carpeta** (creada y administrada por el rol `ADMINISTRADOR`)
8. **Documento PDF** (evidencia cargada dentro de la carpeta y sujeta al flujo de firmas)

> **Herencia Automática entre Períodos:** Cuando se crea un nuevo **Período Académico**, el sistema clona automáticamente todos los **Criterios**, **Subcriterios** y **Carpetas** activos de la carrera (junto con el catálogo base de acreditación) mediante `back-end/Utils/catalogoAcreditacion.js`. Asimismo, todo nuevo Criterio, Subcriterio o Carpeta creado por el Administrador se propaga a los períodos activos de la carrera.

### 2.2 Componentes Técnicos del Proyecto

| Capa | Tecnologías Principales | Archivo Principal / Directorio |
| :--- | :--- | :--- |
| **Front-End (SPA)** | React 18, Vite, Tailwind CSS, Lucide Icons, `pdfjs-dist` | `front-end/src/App.jsx`, `front-end/src/context/AppContext.jsx` |
| **Back-End (API REST)** | Node.js, Express, Sequelize ORM, JWT, Multer | `back-end/server.js`, `back-end/app.js` |
| **Motor de Firma PDF** | `pdf-lib`, `node-forge` (PKCS#12 / `.p12`), `qrcode`, SHA-256 | `back-end/Service/firmaService.js`, `back-end/Service/workflowService.js` |
| **Base de Datos y Storage** | PostgreSQL + Cloudflare R2 (con respaldo en disco local) | `back-end/Model/index.js`, `back-end/Service/r2Service.js` |

---

## 3. Roles y Permisos de Usuario

El sistema maneja **7 roles jerárquicos** con permisos diferenciados:

| Rol | Nivel | Responsabilidades Principales en el Sistema |
| :--- | :---: | :--- |
| **ADMINISTRADOR** | 7 | Parametriza toda la estructura (Universidad, Facultad, Carrera, Período, Criterio, Subcriterio), **crea/edita/elimina Carpetas**, configura **Flujos de Firma**, gestiona usuarios y docentes. |
| **RECTOR** | 6 | Autoridad máxima de firma electrónica en el último eslabón del flujo institucional. |
| **DECANO** | 5 | Revisa, firma o rechaza documentos correspondientes a su facultad según el paso del flujo. |
| **SUBDECANO** | 4 | Revisa, firma o rechaza documentos escalados desde las direcciones de carrera. |
| **DIRECTOR_CARRERA** | 3 | Revisa, firma o rechaza evidencias de su carrera; supervisa el avance de subcriterios. |
| **RESPONSABLE_AREA** | 2 | Valida y firma documentos de los subcriterios bajo su responsabilidad académica. |
| **DOCENTE** | 1 | Ingresa a las **Carpetas** habilitadas dentro de los Subcriterios asignados, **sube evidencias PDF** y realiza la primera firma o envío a revisión. |

---

## 4. Guía de Uso Módulo por Módulo

### 4.1 Inicio de Sesión y Recuperación de Contraseña (`front-end/src/views/Login.jsx`)
1. Ingresa tu correo institucional y contraseña.
2. En caso de olvido, haz clic en **«¿Olvidaste tu contraseña?»** para recibir un enlace con token de restablecimiento temporal por correo electrónico.

### 4.2 Dashboard Analítico (`front-end/src/views/Dashboard.jsx`)
Al iniciar sesión, la pantalla principal presenta:
- **4 Tarjetas de Métricas en Tiempo Real**: *Total Documentos*, *Pendientes de Firma*, *Firmados Exitosamente* y *Rechazados*.
- **Accesos Rápidos**: Botones directos para *Subir Documento*, *Mis Firmas Pendientes*, *Gestión de Docentes* y *Configurar Flujos*.
- **Alertas Urgentes**: Muestra los documentos que requieren **tu firma inmediata** o que han sido **rechazados**. Al hacer clic sobre cualquier alerta, se abre el panel lateral con el documento PDF.
- **Actividades Recientes**: Lista los últimos eventos de **Carga**, **Firma**, **Rechazo** o **Completado**. Haciendo clic en cualquier fila (tanto en *Carga* como en *Firma*), se abre directamente el visor del documento PDF.

### 4.3 Parametrización Institucional — Exclusivo Administrador (`front-end/src/views/ParametrizacionAdmin.jsx`)
El módulo de **Parametrización** está organizado en **8 pestañas**:
1. **Universidad / Facultad / Carrera**: Creación, edición y eliminación lógica de las unidades académicas.
2. **Período**: Al crear un período (ej. `2026-I`), el sistema genera automáticamente para las carreras de la facultad los **Criterios**, **Subcriterios** y **Carpetas** predefinidos o previamente creados en la carrera.
3. **Criterio**: Permite filtrar por Universidad, Facultad, Carrera y Período. Al crear un nuevo Criterio, este se registra en todos los períodos activos de la carrera y queda como plantilla por defecto para futuros períodos.
4. **Subcriterio**: Permite crear nuevos Subcriterios (N°, nombre, instrucciones de ayuda, flujo de firma específico y usuarios responsables). Incluye en cada fila el botón **«Carpetas (+ Crear)»** para crear o administrar las carpetas de ese subcriterio sin salir de la tabla, y el botón **«PDFs →»** para saltar directamente al Explorador.
5. **Docentes**: Alta, edición y asignación de docentes a una Facultad y múltiples Carreras.
6. **Flujos Firma**: Permite diseñar secuencias de firma paso a paso (**Paso 1 → Paso 2 → Paso 3...**), asignando en cada paso un **Rol** o un **Usuario específico**, y marcar un flujo como **Global por defecto**.

### 4.4 Explorador de Archivos y Carpetas (`front-end/src/views/ExploradorDeArchivos.jsx`)
1. **Selección de Contexto**: Elige Universidad → Facultad → Carrera → Período → Criterio → Subcriterio.
2. **Nivel de Carpetas (dentro del Subcriterio)**:
   - Al entrar a un Subcriterio, primero se visualizan sus **Carpetas**.
   - **Rol Administrador**: Ve el botón **«+ Crear Carpeta»** (además de los iconos para renombrar o eliminar carpetas).
   - **Rol Docente / Autoridades**: Seleccionan la carpeta correspondiente haciendo clic sobre ella para abrirla.
3. **Carga de Documentos PDF (dentro de la Carpeta)**:
   - Una vez dentro de una carpeta, se habilita el botón **«Subir PDF»** (o arrastrar y soltar el archivo PDF en la zona punteada).
   - Al subir el archivo PDF, el backend calcula su hash **SHA-256**, lo almacena y asigna automáticamente el **Firmante Inicial (Paso 1)** según el flujo configurado.

### 4.5 Flujo de Firma Electrónica y Selector de Posición (`front-end/src/components/modals/ModalFirma.jsx`)
1. Haz clic sobre el documento (desde el **Explorador**, **Alertas Urgentes** o **Actividades Recientes**).
2. Se abrirá el **Panel Lateral de Auditoría** (`front-end/src/views/PanelLateralAuditoria.jsx`) mostrando la vista previa del PDF, su Hash SHA-256 y la línea de tiempo de pasos completados y pendientes.
3. Si es tu turno de firmar, haz clic en el botón **«Firmar / Rechazar Documento»**.
4. En la ventana amplia de firma (`ModalFirma.jsx`):
   - **Opción A — Elegir en la hoja (Manual)**:
     - En el visor derecho puedes desplazarte libremente con la rueda del ratón o la barra lateral por todas las páginas del documento, o usar los botones **«Anterior»**, **«Siguiente»**, **«Última»** y **Zoom (`-` / `+`)**.
     - Haz **clic sobre cualquier página** o **arrastra el recuadro `FIRMA DIGITAL`** al lugar exacto donde deseas estampar tu código QR.
     - También dispones de botones rápidos (**Inf. Izq.**, **Inf. Centro**, **Inf. Der.**).
   - **Opción B — Automático (por rol)**:
     - Coloca automáticamente tu sello QR en la franja inferior de la última página según tu cargo jerárquico, sin superponerse con otras firmas.
5. Pulsa **«Firmar en Página X»** (o **«Rechazar documento»** indicando el motivo si el archivo requiere correcciones).

### 4.6 Mi Perfil y Certificado Digital `.p12` (`front-end/src/views/PerfilCertificado.jsx`)
Cada usuario firmante puede cargar su archivo de certificado electrónico **`.p12` / `.pfx`** junto con su contraseña para validar sus datos criptográficos (titular, entidad emisora, vigencia) y cambiar su contraseña de acceso al sistema.

### 4.7 Historial de Auditoría (`front-end/src/views/HistorialAuditoria.jsx`)
Registra de forma trazable cada acción (**CARGA**, **FIRMA**, **RECHAZO**, **COMPLETADO**) con fecha, hora, usuario ejecutor y **Hash SHA-256**, permitiendo filtrar por tipo de evento, buscar por nombre/hash y abrir cualquier documento con un clic.
