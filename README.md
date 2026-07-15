# Gestor de Archivos con Firma Electrónica

Sistema web para la gestión documental institucional con firma digital PAdES. Permite a docentes subir documentos PDF que recorren un flujo de aprobación por firma secuencial: Decano → Rector. Desarrollado como proyecto de titulación.

## Características

- Jerarquía de carpetas: **Universidad → Facultad → Criterio → Actividad** (con período académico)
- Subida de documentos PDF con arrastrar y soltar
- Flujo de firma digital PAdES en dos niveles (Decano y Rector)
- Control de acceso por roles: `DOCENTE`, `DECANO`, `RECTOR`
- Autenticación con JWT (sesión de 8 horas)
- Hash SHA-256 por documento para verificación de integridad
- Panel de auditoría de acciones

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js · Express · Sequelize |
| Base de datos | PostgreSQL |
| Frontend | React · Vite · Tailwind CSS |
| Firma digital | pdf-lib (PAdES) |
| Autenticación | JWT · bcryptjs |

## Inicio rápido

Consulta [SETUP.md](SETUP.md) para la guía completa de instalación.

```bash
# Backend
cd back-end && npm install && npm run dev

# Frontend (otra terminal)
cd front-end && npm install && npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

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

En cualquier etapa el Decano o Rector puede rechazar el documento.

## Estructura del proyecto

```
├── back-end/
│   ├── Controller/        # Lógica de negocio
│   ├── Middleware/        # Autenticación y RBAC
│   ├── Model/             # Modelos Sequelize (PostgreSQL)
│   ├── Routes/            # Rutas API REST
│   ├── Services/          # Firma PAdES
│   ├── certs/             # Certificados .p12
│   └── uploads/           # Archivos subidos
└── front-end/
    └── src/
        ├── components/    # Componentes reutilizables
        ├── context/       # Estado global (AppContext)
        └── views/         # Páginas de la aplicación
```

## Variables de entorno

Crea `back-end/.env` basándote en `.env.example`. Las variables principales son:

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
