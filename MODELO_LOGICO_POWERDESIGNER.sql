-- =============================================================================
--  SCRIPT DDL — INGENIERÍA INVERSA PARA POWERDESIGNER
--  Sistema de Gestión de Archivos con Firma Electrónica PAdES
--  Base de datos: PostgreSQL 14+
--  Proyecto de Titulación — Universidad de Cuenca
-- =============================================================================
--
--  INSTRUCCIONES PARA POWERDESIGNER (Ingeniería Inversa):
--  1. Abrir PowerDesigner → File → New Model → Physical Data Model
--  2. Seleccionar DBMS: "PostgreSQL"
--  3. Ir a Database → Reverse Engineer Database...
--  4. Seleccionar "Using a script file" y cargar este archivo .sql
--  5. El modelo físico se generará automáticamente.
--  6. Para obtener el Modelo Lógico: selecciona el modelo físico
--     y ve a Tools → Generate Logical Data Model
-- =============================================================================

-- Limpiar objetos previos (ejecutar en orden inverso de dependencias)
DROP TABLE IF EXISTS "actividades_usuarios"       CASCADE;
DROP TABLE IF EXISTS "indicadores_responsables"   CASCADE;
DROP TABLE IF EXISTS "usuario_roles"              CASCADE;
DROP TABLE IF EXISTS "documentos"                 CASCADE;
DROP TABLE IF EXISTS "pasos_firma"                CASCADE;
DROP TABLE IF EXISTS "actividades"                CASCADE;
DROP TABLE IF EXISTS "indicadores"                CASCADE;
DROP TABLE IF EXISTS "criterios"                  CASCADE;
DROP TABLE IF EXISTS "flujos_firma"               CASCADE;
DROP TABLE IF EXISTS "periodos"                   CASCADE;
DROP TABLE IF EXISTS "carreras"                   CASCADE;
DROP TABLE IF EXISTS "usuarios"                   CASCADE;
DROP TABLE IF EXISTS "facultades"                 CASCADE;
DROP TABLE IF EXISTS "universidades"              CASCADE;
DROP TABLE IF EXISTS "roles"                      CASCADE;

-- Eliminar tipos ENUM previos
DROP TYPE IF EXISTS "enum_roles_nombre"       CASCADE;
DROP TYPE IF EXISTS "enum_documentos_estado"  CASCADE;

-- =============================================================================
--  TIPOS ENUM
-- =============================================================================

CREATE TYPE "enum_roles_nombre" AS ENUM (
    'RESPONSABLE_AREA',
    'DOCENTE',
    'DIRECTOR_CARRERA',
    'SUBDECANO',
    'DECANO',
    'RECTOR',
    'ADMINISTRADOR'
);

CREATE TYPE "enum_documentos_estado" AS ENUM (
    'PENDIENTE',
    'EN_REVISION',
    'FIRMADO_DIRECTOR',
    'FIRMADO_SUBDECANO',
    'FIRMADO_DECANO',
    'COMPLETADO',
    'RECHAZADO'
);

-- =============================================================================
--  TABLA: roles
--  Descripción: Roles jerárquicos del sistema (7 niveles).
--  nivel: 1=RESPONSABLE_AREA, 2=DOCENTE, 3=DIRECTOR_CARRERA,
--         4=SUBDECANO, 5=DECANO, 6=RECTOR, 7=ADMINISTRADOR
-- =============================================================================
CREATE TABLE "roles" (
    "id"          SERIAL          NOT NULL,
    "nombre"      "enum_roles_nombre" NOT NULL,
    "nivel"       INTEGER         NOT NULL,
    "descripcion" VARCHAR(255),
    CONSTRAINT "pk_roles" PRIMARY KEY ("id"),
    CONSTRAINT "uq_roles_nombre" UNIQUE ("nombre")
);

COMMENT ON TABLE  "roles"             IS 'Roles jerárquicos del sistema de gestión documental';
COMMENT ON COLUMN "roles"."nivel"     IS '1=RESPONSABLE_AREA, 2=DOCENTE, 3=DIRECTOR_CARRERA, 4=SUBDECANO, 5=DECANO, 6=RECTOR, 7=ADMINISTRADOR';

-- =============================================================================
--  TABLA: universidades
--  Descripción: Nivel 1 de la jerarquía documental.
-- =============================================================================
CREATE TABLE "universidades" (
    "id"     SERIAL       NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    CONSTRAINT "pk_universidades" PRIMARY KEY ("id")
);

COMMENT ON TABLE "universidades" IS 'Nivel 1 de la jerarquía: Universidad';

-- =============================================================================
--  TABLA: facultades
--  Descripción: Nivel 2 de la jerarquía documental.
-- =============================================================================
CREATE TABLE "facultades" (
    "id"              SERIAL       NOT NULL,
    "nombre"          VARCHAR(255) NOT NULL,
    "universidad_id"  INTEGER      NOT NULL,
    CONSTRAINT "pk_facultades"           PRIMARY KEY ("id"),
    CONSTRAINT "fk_facultades_univ"      FOREIGN KEY ("universidad_id")
        REFERENCES "universidades" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE "facultades" IS 'Nivel 2 de la jerarquía: Facultad';

-- =============================================================================
--  TABLA: carreras
--  Descripción: Nivel 3 de la jerarquía documental.
-- =============================================================================
CREATE TABLE "carreras" (
    "id"          SERIAL       NOT NULL,
    "nombre"      VARCHAR(255) NOT NULL,
    "facultad_id" INTEGER      NOT NULL,
    CONSTRAINT "pk_carreras"           PRIMARY KEY ("id"),
    CONSTRAINT "fk_carreras_facultad"  FOREIGN KEY ("facultad_id")
        REFERENCES "facultades" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE "carreras" IS 'Nivel 3 de la jerarquía: Carrera';

-- =============================================================================
--  TABLA: usuarios
--  Descripción: Usuarios autenticables del sistema.
--               password_hash almacena el hash bcrypt de la contraseña.
-- =============================================================================
CREATE TABLE "usuarios" (
    "id"               SERIAL       NOT NULL,
    "nombre"           VARCHAR(150) NOT NULL,
    "email"            VARCHAR(255) NOT NULL,
    "password_hash"    VARCHAR(255) NOT NULL,
    "facultad_id"      INTEGER,
    "carrera_id"       INTEGER,
    "activo"           BOOLEAN      NOT NULL DEFAULT TRUE,
    "reset_token"      VARCHAR(255),
    "reset_token_exp"  TIMESTAMP WITH TIME ZONE,
    "creado_en"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_usuarios"          PRIMARY KEY ("id"),
    CONSTRAINT "uq_usuarios_email"    UNIQUE ("email"),
    CONSTRAINT "fk_usuarios_facultad" FOREIGN KEY ("facultad_id")
        REFERENCES "facultades" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_usuarios_carrera"  FOREIGN KEY ("carrera_id")
        REFERENCES "carreras" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE  "usuarios"                   IS 'Usuarios autenticables del sistema';
COMMENT ON COLUMN "usuarios"."password_hash"   IS 'Hash bcrypt (12 rounds) de la contraseña del usuario';
COMMENT ON COLUMN "usuarios"."facultad_id"     IS 'Facultad asignada (NULL para RECTOR y ADMINISTRADOR)';
COMMENT ON COLUMN "usuarios"."carrera_id"      IS 'Carrera asignada (para DIRECTOR_CARRERA y DOCENTE)';
COMMENT ON COLUMN "usuarios"."reset_token"     IS 'Token temporal para recuperación de contraseña (uso único)';
COMMENT ON COLUMN "usuarios"."reset_token_exp" IS 'Fecha/hora de expiración del token de recuperación';

-- =============================================================================
--  TABLA: usuario_roles  (relación N:M entre usuarios y roles)
--  Descripción: Tabla de unión para la asignación de roles a usuarios.
-- =============================================================================
CREATE TABLE "usuario_roles" (
    "usuario_id" INTEGER NOT NULL,
    "rol_id"     INTEGER NOT NULL,
    "createdAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_usuario_roles"     PRIMARY KEY ("usuario_id", "rol_id"),
    CONSTRAINT "fk_ur_usuario"        FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_ur_rol"            FOREIGN KEY ("rol_id")
        REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "usuario_roles" IS 'Asignación N:M de roles a usuarios';

-- =============================================================================
--  TABLA: periodos
--  Descripción: Nivel 4 de la jerarquía. Período académico (ej: 2026-I).
-- =============================================================================
CREATE TABLE "periodos" (
    "id"         SERIAL       NOT NULL,
    "nombre"     VARCHAR(255) NOT NULL,
    "carrera_id" INTEGER      NOT NULL,
    "creado_en"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_periodos"          PRIMARY KEY ("id"),
    CONSTRAINT "fk_periodos_carrera"  FOREIGN KEY ("carrera_id")
        REFERENCES "carreras" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE "periodos" IS 'Nivel 4 de la jerarquía: Período académico (ej: 2026-I)';

-- =============================================================================
--  TABLA: flujos_firma
--  Descripción: Configuración de flujos de firma secuencial.
--               es_global = TRUE indica el flujo por defecto del sistema.
-- =============================================================================
CREATE TABLE "flujos_firma" (
    "id"        SERIAL       NOT NULL,
    "nombre"    VARCHAR(255) NOT NULL,
    "es_global" BOOLEAN      NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_flujos_firma" PRIMARY KEY ("id")
);

COMMENT ON TABLE  "flujos_firma"            IS 'Configuración de flujos de firma secuencial PAdES';
COMMENT ON COLUMN "flujos_firma"."es_global" IS 'TRUE = flujo por defecto para documentos sin flujo específico';

-- =============================================================================
--  TABLA: pasos_firma
--  Descripción: Pasos secuenciales dentro de un flujo de firma.
--               orden = 1 (Director) → 2 (Subdecano) → 3 (Decano) → 4 (Rector)
-- =============================================================================
CREATE TABLE "pasos_firma" (
    "id"        SERIAL  NOT NULL,
    "flujo_id"  INTEGER NOT NULL,
    "orden"     INTEGER NOT NULL,
    "rol_id"    INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_pasos_firma"       PRIMARY KEY ("id"),
    CONSTRAINT "fk_pasos_flujo"       FOREIGN KEY ("flujo_id")
        REFERENCES "flujos_firma" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_pasos_rol"         FOREIGN KEY ("rol_id")
        REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_pasos_flujo_orden" UNIQUE ("flujo_id", "orden")
);

COMMENT ON TABLE  "pasos_firma"         IS 'Pasos secuenciales dentro de un flujo de firma';
COMMENT ON COLUMN "pasos_firma"."orden" IS 'Posición en el flujo: 1=Director, 2=Subdecano, 3=Decano, 4=Rector';

-- =============================================================================
--  TABLA: criterios
--  Descripción: Nivel 5. Criterios oficiales de acreditación (5 en total).
-- =============================================================================
CREATE TABLE "criterios" (
    "id"             SERIAL       NOT NULL,
    "nombre"         VARCHAR(200) NOT NULL,
    "descripcion"    TEXT,
    "periodo_id"     INTEGER,
    "requiere_firma" BOOLEAN      NOT NULL DEFAULT TRUE,
    "flujo_id"       INTEGER,
    "activo"         BOOLEAN      NOT NULL DEFAULT TRUE,
    "creado_en"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_criterios"         PRIMARY KEY ("id"),
    CONSTRAINT "fk_criterios_periodo" FOREIGN KEY ("periodo_id")
        REFERENCES "periodos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_criterios_flujo"   FOREIGN KEY ("flujo_id")
        REFERENCES "flujos_firma" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE  "criterios"                  IS 'Nivel 5: Criterios oficiales de acreditación (5 en total)';
COMMENT ON COLUMN "criterios"."requiere_firma" IS 'Indica si los documentos de este criterio requieren flujo de firma';

-- =============================================================================
--  TABLA: indicadores
--  Descripción: Nivel 6. Indicadores oficiales de acreditación (31 en total).
-- =============================================================================
CREATE TABLE "indicadores" (
    "id"                 SERIAL       NOT NULL,
    "numero"             INTEGER      NOT NULL,
    "nombre"             VARCHAR(300) NOT NULL,
    "descripcion"        TEXT,
    "criterio_id"        INTEGER      NOT NULL,
    "responsable_id"     INTEGER,
    "responsable_nombre" VARCHAR(300),
    "activo"             BOOLEAN      NOT NULL DEFAULT TRUE,
    "creado_en"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_indicadores"          PRIMARY KEY ("id"),
    CONSTRAINT "uq_indicadores_num_crit" UNIQUE ("numero", "criterio_id"),
    CONSTRAINT "fk_indicadores_criterio" FOREIGN KEY ("criterio_id")
        REFERENCES "criterios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_indicadores_resp"     FOREIGN KEY ("responsable_id")
        REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE  "indicadores"                    IS 'Nivel 6: Indicadores oficiales de acreditación (31 en total)';
COMMENT ON COLUMN "indicadores"."numero"           IS 'Número oficial del indicador (1 al 31)';
COMMENT ON COLUMN "indicadores"."responsable_id"   IS 'FK al usuario responsable principal del indicador';
COMMENT ON COLUMN "indicadores"."responsable_nombre" IS 'Texto libre con nombre/cargo del responsable (ej: "Directores de Carrera")';

-- =============================================================================
--  TABLA: indicadores_responsables  (relación N:M indicador ↔ usuario)
--  Descripción: Usuarios responsables asignados a cada indicador.
--               Un indicador puede tener varios responsables.
-- =============================================================================
CREATE TABLE "indicadores_responsables" (
    "indicador_id" INTEGER NOT NULL,
    "usuario_id"   INTEGER NOT NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_indicadores_resp"       PRIMARY KEY ("indicador_id", "usuario_id"),
    CONSTRAINT "fk_ir_indicador"           FOREIGN KEY ("indicador_id")
        REFERENCES "indicadores" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_ir_usuario"             FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "indicadores_responsables" IS 'Asignación N:M de usuarios responsables a indicadores de acreditación';

-- =============================================================================
--  TABLA: actividades
--  Descripción: Nivel 7. Contenedores de documentos PDF dentro de un Indicador.
-- =============================================================================
CREATE TABLE "actividades" (
    "id"             SERIAL       NOT NULL,
    "nombre"         VARCHAR(200) NOT NULL,
    "descripcion"    TEXT,
    "indicador_id"   INTEGER      NOT NULL,
    "flujo_id"       INTEGER,
    "activo"         BOOLEAN      NOT NULL DEFAULT TRUE,
    "creado_en"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_actividades"           PRIMARY KEY ("id"),
    CONSTRAINT "fk_actividades_indicador" FOREIGN KEY ("indicador_id")
        REFERENCES "indicadores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_actividades_flujo"     FOREIGN KEY ("flujo_id")
        REFERENCES "flujos_firma" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE "actividades" IS 'Nivel 7: Contenedores de documentos PDF (carpetas) dentro de un Indicador';

-- =============================================================================
--  TABLA: actividades_usuarios  (relación N:M actividad ↔ usuario)
--  Descripción: Usuarios autorizados para subir documentos en una actividad.
-- =============================================================================
CREATE TABLE "actividades_usuarios" (
    "actividad_id" INTEGER NOT NULL,
    "usuario_id"   INTEGER NOT NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_actividades_usuarios" PRIMARY KEY ("actividad_id", "usuario_id"),
    CONSTRAINT "fk_au_actividad"         FOREIGN KEY ("actividad_id")
        REFERENCES "actividades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_au_usuario"           FOREIGN KEY ("usuario_id")
        REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "actividades_usuarios" IS 'Asignación N:M de usuarios autorizados para subir en una actividad';

-- =============================================================================
--  TABLA: documentos
--  Descripción: Documentos PDF con su ciclo de vida de firma.
--               Estado del workflow: PENDIENTE → EN_REVISION → FIRMADO_DIRECTOR
--               → FIRMADO_SUBDECANO → FIRMADO_DECANO → COMPLETADO
--               En cualquier punto puede pasar a: RECHAZADO
-- =============================================================================
CREATE TABLE "documentos" (
    "id"                    SERIAL       NOT NULL,
    "nombre_original"       VARCHAR(255) NOT NULL,
    "ruta_archivo"          VARCHAR(500) NOT NULL,
    "estado"                "enum_documentos_estado" NOT NULL DEFAULT 'PENDIENTE',
    "subido_por_id"         INTEGER,
    "firmante_actual_id"    INTEGER,
    "facultad_id"           INTEGER,
    "actividad_id"          INTEGER,
    "flujo_id"              INTEGER,
    "paso_actual"           INTEGER      NOT NULL DEFAULT 1,
    "observaciones"         TEXT,
    "hash_sha256"           VARCHAR(64),
    "firmado_director_en"   TIMESTAMP WITH TIME ZONE,
    "firmado_subdecano_en"  TIMESTAMP WITH TIME ZONE,
    "firmado_decano_en"     TIMESTAMP WITH TIME ZONE,
    "firmado_rector_en"     TIMESTAMP WITH TIME ZONE,
    "creado_en"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "actualizado_en"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "pk_documentos"               PRIMARY KEY ("id"),
    CONSTRAINT "fk_documentos_subido_por"    FOREIGN KEY ("subido_por_id")
        REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_documentos_firmante"      FOREIGN KEY ("firmante_actual_id")
        REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_documentos_facultad"      FOREIGN KEY ("facultad_id")
        REFERENCES "facultades" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_documentos_actividad"     FOREIGN KEY ("actividad_id")
        REFERENCES "actividades" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_documentos_flujo"         FOREIGN KEY ("flujo_id")
        REFERENCES "flujos_firma" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE  "documentos"                       IS 'Documentos PDF con su ciclo de vida de firma electrónica PAdES';
COMMENT ON COLUMN "documentos"."estado"              IS 'Estado del workflow: PENDIENTE|EN_REVISION|FIRMADO_DIRECTOR|FIRMADO_SUBDECANO|FIRMADO_DECANO|COMPLETADO|RECHAZADO';
COMMENT ON COLUMN "documentos"."subido_por_id"       IS 'Usuario que subió originalmente el documento';
COMMENT ON COLUMN "documentos"."firmante_actual_id"  IS 'Usuario que debe firmar en la etapa actual del flujo';
COMMENT ON COLUMN "documentos"."paso_actual"         IS 'Número del paso activo en el flujo (1=Director, 2=Subdecano, 3=Decano, 4=Rector)';
COMMENT ON COLUMN "documentos"."hash_sha256"         IS 'Hash SHA-256 del archivo para verificación de integridad';
COMMENT ON COLUMN "documentos"."firmado_director_en" IS 'Timestamp de la firma del Director de Carrera';
COMMENT ON COLUMN "documentos"."firmado_subdecano_en" IS 'Timestamp de la firma del Subdecano';
COMMENT ON COLUMN "documentos"."firmado_decano_en"   IS 'Timestamp de la firma del Decano';
COMMENT ON COLUMN "documentos"."firmado_rector_en"   IS 'Timestamp de la firma final del Rector';

-- =============================================================================
--  ÍNDICES DE RENDIMIENTO
-- =============================================================================

-- Documentos: búsqueda por firmante actual (consulta frecuente)
CREATE INDEX "idx_documentos_firmante_actual"
    ON "documentos" ("firmante_actual_id");

-- Documentos: búsqueda por estado del workflow (consulta frecuente)
CREATE INDEX "idx_documentos_estado"
    ON "documentos" ("estado");

-- Documentos: búsqueda por actividad
CREATE INDEX "idx_documentos_actividad"
    ON "documentos" ("actividad_id");

-- Documentos: búsqueda por facultad
CREATE INDEX "idx_documentos_facultad"
    ON "documentos" ("facultad_id");

-- Indicadores: búsqueda por criterio
CREATE INDEX "idx_indicadores_criterio"
    ON "indicadores" ("criterio_id");

-- Actividades: búsqueda por indicador
CREATE INDEX "idx_actividades_indicador"
    ON "actividades" ("indicador_id");

-- Usuarios: búsqueda por email (login)
CREATE INDEX "idx_usuarios_email"
    ON "usuarios" ("email");

-- Usuarios: búsqueda por facultad
CREATE INDEX "idx_usuarios_facultad"
    ON "usuarios" ("facultad_id");

-- =============================================================================
--  RESUMEN DE TABLAS GENERADAS
-- =============================================================================
--
--  Tabla                      | Descripción
--  ---------------------------|------------------------------------------------
--  roles                      | 7 roles jerárquicos del sistema
--  universidades              | Nivel 1 de la jerarquía documental
--  facultades                 | Nivel 2 de la jerarquía documental
--  carreras                   | Nivel 3 de la jerarquía documental
--  usuarios                   | Usuarios autenticables (hash bcrypt)
--  usuario_roles              | N:M usuarios ↔ roles
--  periodos                   | Nivel 4 — Período académico
--  flujos_firma               | Configuración de flujos de firma
--  pasos_firma                | Pasos secuenciales por flujo
--  criterios                  | Nivel 5 — 5 Criterios de acreditación
--  indicadores                | Nivel 6 — 31 Indicadores de acreditación
--  indicadores_responsables   | N:M indicadores ↔ usuarios responsables
--  actividades                | Nivel 7 — Contenedores de documentos PDF
--  actividades_usuarios       | N:M actividades ↔ usuarios autorizados
--  documentos                 | PDFs con ciclo de vida PAdES
--
--  Total: 15 tablas | 2 tipos ENUM | 8 índices de rendimiento
-- =============================================================================
