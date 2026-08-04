# Gestor de Archivos con Firma Electrónica

Sistema web para la gestión documental institucional con firma digital PAdES. Permite a docentes y responsables de área subir evidencias y documentos PDF que recorren un flujo de aprobación por firma secuencial multi-nivel: **Director de Carrera → Subdecano → Decano → Rector**. Desarrollado como proyecto de titulación para el proceso de acreditación universitaria.

## Características

- Jerarquía de 7 niveles: **Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad**
- Incorpora los **5 Criterios de acreditación** y **31 Indicadores oficiales** con responsables asignados
- Subida de documentos PDF con arrastrar y soltar
- Flujo de firma digital PAdES en 4 niveles jerárquicos (`DIRECTOR_CARRERA` → `SUBDECANO` → `DECANO` → `RECTOR`)
- Control de acceso basado en roles (`RBAC`) con 7 niveles de privilegios
- Autenticación con JWT (sesión de 8 horas) y hash SHA-256 por documento para integridad
- Menús desplegables inteligentes para selección de Criterios, Indicadores y Responsables predefinidos
- Dashboard con métricas y gráficos de estado en tiempo real
- Historial completo de auditoría y gestión de certificados digitales `.p12`

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js · Express · Sequelize |
| Base de datos | PostgreSQL |
| Frontend | React · Vite · Tailwind CSS |
| Firma digital | pdf-lib · node-forge (PAdES) |
| Autenticación | JWT · bcryptjs |

## Inicio rápido

Consulta [SETUP.md](SETUP.md) para la guía completa de instalación paso a paso.

```bash
# 1. Instalar dependencias
cd back-end && npm install
cd ../front-end && npm install

# 2. Configurar .env en back-end (ver SETUP.md)

# 3. Poblar la base de datos con usuarios y criterios de acreditación
cd back-end
node seed.js
node seed-criterios.js

# 4. Ejecutar (dos terminales)
cd back-end && npm run dev       # http://localhost:3000
cd front-end && npm run dev      # http://localhost:5173
```

## Flujo de aprobación y firma digital

```
DOCENTE / RESPONSABLE DE ÁREA sube PDF
                 ↓
           Estado: PENDIENTE
                 ↓ (DIRECTOR_CARRERA firma)
      Estado: FIRMADO_DIRECTOR
                 ↓ (SUBDECANO firma)
      Estado: FIRMADO_SUBDECANO
                 ↓ (DECANO firma)
      Estado: FIRMADO_DECANO
                 ↓ (RECTOR firma)
          Estado: COMPLETADO
```

En cualquier etapa, las autoridades revisoras pueden rechazar el documento (estado: `RECHAZADO`).

Consulta [FLUJO.md](FLUJO.md) para la descripción detallada de todos los flujos del sistema.

## Estructura del proyecto

```
├── back-end/
│   ├── Controller/        # Lógica de negocio (auth, documento, parametrizacion)
│   ├── Middleware/        # Autenticación JWT y control de roles (RBAC)
│   ├── Model/             # Modelos Sequelize (PostgreSQL)
│   ├── Routes/            # Rutas API REST
│   ├── Services/          # Servicio de firma PAdES
│   ├── certs/             # Certificados .p12 para firma digital
│   ├── uploads/           # Archivos subidos
│   ├── seed.js            # Script principal para datos iniciales y usuarios
│   ├── seed-criterios.js  # Script standalone para 5 Criterios y 31 Indicadores
│   └── server.js          # Punto de entrada del backend
└── front-end/
    └── src/
        ├── components/    # Componentes reutilizables (Badge, modales, etc.)
        ├── context/       # Estado global (AppContext)
        └── views/         # Páginas (Login, Dashboard, Explorador, ParametrizacionAdmin, etc.)
```

## Usuarios de prueba principales (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| `ADMINISTRADOR` | `admin@universidad.edu` | `Admin123!` |
| `RECTOR` | `rector@universidad.edu` | `Rector123!` |
| `DECANO` | `decano@universidad.edu` | `Decano123!` |
| `SUBDECANO` | `subdecano@universidad.edu` | `Subdecano123!` |
| `DIRECTOR_CARRERA` | `director@universidad.edu` | `Director123!` |
| `DOCENTE` | `docente@universidad.edu` | `Docente123!` |
| `RESPONSABLE_AREA` | `agalarza@universidad.edu` | `Galarza123!` |

