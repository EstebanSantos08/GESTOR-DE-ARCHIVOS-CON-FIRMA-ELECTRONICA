# Guía de instalación y configuración

## Requisitos previos

Instalar en la PC antes de comenzar:

- [Node.js v18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/download/)

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/EstebanSantos08/GESTOR-DE-ARCHIVOS-CON-FIRMA-ELECTRONICA.git
```

---

## 2. Configurar la base de datos

Abre **pgAdmin** o **psql** y crea la base de datos:

```sql
CREATE DATABASE "Gestion_Archivos";
```

> El servidor crea las tablas automáticamente al iniciar por primera vez (Sequelize sync).

---

## 3. Configurar el Backend

```bash
cd back-end
npm install
```

Crea el archivo `.env`:

```bash
# Windows PowerShell
copy .env.example .env

# Linux / Mac
cp .env.example .env
```

Edita `.env` con los siguientes valores:

```env
# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5433
DB_NAME=Gestion_Archivos
DB_USER=postgres
DB_PASSWORD=admin

# JWT
JWT_SECRET=gestion_archivos_jwt_secret_2026
JWT_EXPIRES_IN=8h

# Servidor
PORT=3000
NODE_ENV=development

# Archivos
UPLOADS_DIR=./uploads
CERTS_DIR=./certs
MAX_FILE_SIZE_MB=10

# Certificado institucional (firma PAdES)
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=password_del_certificado
```

> **Nota:** Si tu PostgreSQL usa el puerto `5432` (por defecto), cambia `DB_PORT=5432`.

---

## 4. Configurar el Frontend

```bash
cd ../front-end
npm install
```

---

## 5. Ejecutar el proyecto

Abre **dos terminales** desde la raíz del proyecto:

**Terminal 1 — Backend:**

```bash
cd back-end
npm run dev
```

Deberías ver:
```
Conexión a PostgreSQL establecida
Modelos sincronizados con la base de datos
Servidor corriendo en http://localhost:3000
```

**Terminal 2 — Frontend:**

```bash
cd front-end
npm run dev
```

Deberías ver:
```
VITE ready in XXXX ms
Local: http://localhost:5173/
```

---

## 6. Abrir la aplicación

Abre el navegador en:

```
http://localhost:5173
```

---

## 7. Certificado de firma digital (opcional)

Si vas a usar la firma PAdES, copia el archivo `.p12` manualmente:

```
back-end/certs/firma_institucional.p12
```

Luego actualiza en `.env`:

```env
CERT_P12_PATH=./certs/firma_institucional.p12
CERT_P12_PASSWORD=tu_password_real
```

---

## Estructura del proyecto

```
├── back-end/          # API REST (Node.js + Express + Sequelize)
│   ├── Controller/
│   ├── Model/
│   ├── Routes/
│   ├── Services/
│   ├── uploads/       # Archivos subidos (se crea automáticamente)
│   ├── certs/         # Certificados para firma digital
│   └── server.js
└── front-end/         # Interfaz (React + Vite + Tailwind CSS)
    └── src/
        ├── components/
        ├── context/
        └── views/
```

---

## Jerarquía de carpetas

El explorador de archivos organiza los documentos en cuatro niveles:

```
Universidad
  └── Facultad
        └── Criterio
              └── Actividad  ← aquí se suben los documentos
```

Cada **Actividad** puede tener un **período académico** (ej. `2026-I`, `2026-II`) que se configura desde el panel de parametrización (solo Decano / Rector).

---

## Roles y permisos

| Rol | Puede hacer |
|-----|-------------|
| `DOCENTE` | Subir documentos PDF |
| `DECANO` | Firmar o rechazar documentos en estado `PENDIENTE`; gestionar parametrización |
| `RECTOR` | Firmar o rechazar documentos en estado `FIRMADO_DECANO`; gestionar parametrización |
