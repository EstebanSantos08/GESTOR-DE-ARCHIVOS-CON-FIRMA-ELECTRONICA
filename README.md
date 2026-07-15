# Gestor de Archivos con Firma Electrónica

Sistema web para la gestión documental institucional con firma digital PAdES. Permite a docentes subir documentos PDF que recorren un flujo de aprobación por firma secuencial: **Decano → Rector**. Desarrollado como proyecto de titulación.

## Características

- Jerarquía de carpetas: **Universidad → Facultad → Período → Criterio → Actividad**
- Subida de documentos PDF con arrastrar y soltar
- Flujo de firma digital PAdES en dos niveles (Decano y Rector)
- Control de acceso por roles: `DOCENTE`, `DECANO`, `RECTOR`
- Autenticación con JWT (sesión de 8 horas)
- Hash SHA-256 por documento para verificación de integridad
- Dashboard con métricas y gráficos de estado
- Panel de auditoría de acciones
- Gestión de usuarios y certificados de firma

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

# 2. Configurar .env (ver SETUP.md)

# 3. Poblar la base de datos con usuarios de prueba
cd back-end && node seed.js

# 4. Ejecutar (dos terminales)
cd back-end && npm run dev       # http://localhost:3000
cd front-end && npm run dev      # http://localhost:5173
```

## Flujo de firma

```
DOCENTE sube PDF
      ↓
 Estado: PENDIENTE
      ↓ (DECANO firma)
 Estado: FIRMADO_DECANO
      ↓ (RECTOR firma)
 Estado: COMPLETADO
```

En cualquier etapa el Decano o Rector puede rechazar el documento (estado: `RECHAZADO`).

Consulta [FLUJO.md](FLUJO.md) para la descripción detallada de todos los flujos de la aplicación.

## Estructura del proyecto

```
├── back-end/
│   ├── Controller/        # Lógica de negocio (auth, documento, parametrizacion)
│   ├── Middleware/        # Autenticación JWT y control de roles (RBAC)
│   ├── Model/             # Modelos Sequelize (PostgreSQL)
│   ├── Routes/            # Rutas API REST
│   ├── Services/          # Servicio de firma PAdES
│   ├── certs/             # Certificados .p12 para firma digital
│   ├── uploads/           # Archivos subidos (se crea automáticamente)
│   ├── seed.js            # Script para poblar BD con datos de prueba
│   └── server.js          # Punto de entrada del backend
└── front-end/
    └── src/
        ├── components/    # Componentes reutilizables (Badge, modales, etc.)
        ├── context/       # Estado global (AppContext)
        └── views/         # Páginas (Login, Dashboard, Explorador, etc.)
```

## Variables de entorno

Crea `back-end/.env` copiando `.env.example`. Variables principales:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Gestion_Archivos
DB_USER=postgres
DB_PASSWORD=admin
JWT_SECRET=gestion_archivos_jwt_secret_2026
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=tu_password
```

## Usuarios de prueba (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| DOCENTE | docente@universidad.edu | Docente123! |
| DECANO | decano@universidad.edu | Decano123! |
| RECTOR | rector@universidad.edu | Rector123! |
