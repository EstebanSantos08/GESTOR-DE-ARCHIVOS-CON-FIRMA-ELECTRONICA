' =============================================================================
'  MACRO POWERDESIGNER — DIAGRAMA ENTIDAD-RELACION (CDM)
'  Sistema de Gestion de Archivos con Firma Electronica PAdES
'  Proyecto de Titulacion — Universidad de Cuenca
' =============================================================================
'
'  INSTRUCCIONES DE USO EN POWERDESIGNER:
'  1. Abrir PowerDesigner
'  2. Ir a: Tools > Execute Model Script... (o presionar F8)
'  3. Seleccionar este archivo .vbs
'  4. Hacer clic en "Run"
'  5. El CDM (Diagrama E-R) se generara automaticamente.
'
'  NOTA: Las variables NO usan "As Object" porque VBScript no lo soporta.
'        Los comentarios con acento fueron removidos para evitar errores de codificacion.
' =============================================================================

Option Explicit

' --------------------------------------------------------------------------
' FUNCION AUXILIAR: Crea un atributo en una entidad
' --------------------------------------------------------------------------
Function crearAtributo(ent, sNombre, sCodigo, sTipo, bObligatorio)
    Dim a
    Set a = ent.Attributes.CreateNew()
    a.Name      = sNombre
    ' No se asigna Code: PowerDesigner lo genera unico automaticamente
    a.DataType  = sTipo
    a.Mandatory = bObligatorio
    Set crearAtributo = a
End Function

' --------------------------------------------------------------------------
' FUNCION AUXILIAR: Crea un atributo con comentario
' --------------------------------------------------------------------------
Function crearAtributoComentario(ent, sNombre, sCodigo, sTipo, bObligatorio, sComentario)
    Dim a
    Set a = ent.Attributes.CreateNew()
    a.Name      = sNombre
    ' No se asigna Code: PowerDesigner lo genera unico automaticamente
    a.DataType  = sTipo
    a.Mandatory = bObligatorio
    a.Comment   = sComentario
    Set crearAtributoComentario = a
End Function

' --------------------------------------------------------------------------
' FUNCION AUXILIAR: Crea una entidad con su PK de tipo Integer
' --------------------------------------------------------------------------
Function crearEntidad(mdl, sNombre, sCodigo, sComentario)
    Dim ent
    Dim ident
    Dim attrId
    Set ent          = mdl.Entities.CreateNew()
    ent.Name         = sNombre
    ent.Code         = sCodigo
    ent.Comment      = sComentario

    ' Crear identificador primario (PK)
    Set ident        = ent.Identifiers.CreateNew()
    ident.Name       = "PK_" & sCodigo
    ident.PrimaryIdentifier = True

    ' Crear atributo id (PK)
    Set attrId       = ent.Attributes.CreateNew()
    attrId.Name      = "id"
    ' No se asigna Code para evitar conflicto de normalizacion entre entidades
    attrId.DataType  = "Integer"
    attrId.Mandatory = True

    ' Agregar id al identificador primario (API correcta en PowerDesigner CDM)
    ident.Attributes.Add attrId

    Set crearEntidad = ent
End Function

' --------------------------------------------------------------------------
' FUNCION AUXILIAR: Crea una relacion entre dos entidades
' --------------------------------------------------------------------------
Function crearRelacion(mdl, sNombre, sCodigo, ent1, ent2, sCardinalidad, sComentario)
    Dim rel
    Set rel         = mdl.Relationships.CreateNew()
    rel.Name        = sNombre
    rel.Code        = sCodigo
    rel.Object1     = ent1
    rel.Object2     = ent2
    rel.Cardinality = sCardinalidad
    rel.Comment     = sComentario
    Set crearRelacion = rel
End Function

' =============================================================================
'  INICIO DEL SCRIPT PRINCIPAL
' =============================================================================

Dim mdl
Set mdl         = CreateModel(PdCDM.cls_Model, "|Language=Conceptual")
mdl.Name        = "Gestion de Archivos con Firma Electronica - ERD"
mdl.Code        = "GESTION_ARCHIVOS_ERD"
mdl.Comment     = "Diagrama Entidad-Relacion del Sistema de Gestion Documental con Firma Digital PAdES. Proyecto de Titulacion 2026."

' =============================================================================
'  ENTIDADES
' =============================================================================

' ── ENTIDAD 1: ROL ──────────────────────────────────────────────────────────
Dim entRol
Set entRol = crearEntidad(mdl, "Rol", "ROL", "Roles jerarquicos del sistema (7 niveles)")

Call crearAtributoComentario(entRol, "nombre", "NOMBRE", "Characters(50)", True, _
    "RESPONSABLE_AREA | DOCENTE | DIRECTOR_CARRERA | SUBDECANO | DECANO | RECTOR | ADMINISTRADOR")
Call crearAtributoComentario(entRol, "nivel", "NIVEL", "Integer", True, _
    "1=RESPONSABLE_AREA, 2=DOCENTE, 3=DIRECTOR_CARRERA, 4=SUBDECANO, 5=DECANO, 6=RECTOR, 7=ADMINISTRADOR")
Call crearAtributo(entRol, "descripcion", "DESCRIPCION", "Characters(255)", False)

' ── ENTIDAD 2: UNIVERSIDAD ──────────────────────────────────────────────────
Dim entUniversidad
Set entUniversidad = crearEntidad(mdl, "Universidad", "UNIVERSIDAD", "Nivel 1 de la jerarquia documental institucional")

Call crearAtributo(entUniversidad, "nombre", "NOMBRE", "Characters(255)", True)

' ── ENTIDAD 3: FACULTAD ─────────────────────────────────────────────────────
Dim entFacultad
Set entFacultad = crearEntidad(mdl, "Facultad", "FACULTAD", "Nivel 2 de la jerarquia documental institucional")

Call crearAtributo(entFacultad, "nombre", "NOMBRE", "Characters(255)", True)

' ── ENTIDAD 4: CARRERA ──────────────────────────────────────────────────────
Dim entCarrera
Set entCarrera = crearEntidad(mdl, "Carrera", "CARRERA", "Nivel 3 de la jerarquia documental institucional")

Call crearAtributo(entCarrera, "nombre", "NOMBRE", "Characters(255)", True)

' ── ENTIDAD 5: USUARIO ──────────────────────────────────────────────────────
Dim entUsuario
Set entUsuario = crearEntidad(mdl, "Usuario", "USUARIO", "Usuarios autenticables del sistema. password_hash almacena el hash bcrypt.")

Call crearAtributo(entUsuario, "nombre", "NOMBRE", "Characters(150)", True)
Call crearAtributoComentario(entUsuario, "email", "EMAIL", "Characters(255)", True, "Identificador unico de login")
Call crearAtributoComentario(entUsuario, "password_hash", "PASSWORD_HASH", "Characters(255)", True, "Hash bcrypt (12 rounds) de la contrasena")
Call crearAtributoComentario(entUsuario, "activo", "ACTIVO", "Boolean", True, "Estado de la cuenta (TRUE por defecto)")
Call crearAtributoComentario(entUsuario, "reset_token", "RESET_TOKEN", "Characters(255)", False, "Token temporal para recuperacion de contrasena")
Call crearAtributoComentario(entUsuario, "reset_token_exp", "RESET_TOKEN_EXP", "DateTime", False, "Fecha de expiracion del token")
Call crearAtributo(entUsuario, "creado_en", "CREADO_EN", "DateTime", True)
Call crearAtributo(entUsuario, "actualizado_en", "ACTUALIZADO_EN", "DateTime", True)

' ── ENTIDAD 6: PERIODO ──────────────────────────────────────────────────────
Dim entPeriodo
Set entPeriodo = crearEntidad(mdl, "Periodo", "PERIODO", "Nivel 4 de la jerarquia. Periodo academico (ej: 2026-I)")

Call crearAtributo(entPeriodo, "nombre", "NOMBRE", "Characters(255)", True)
Call crearAtributo(entPeriodo, "creado_en", "CREADO_EN", "DateTime", True)

' ── ENTIDAD 7: FLUJO FIRMA ──────────────────────────────────────────────────
Dim entFlujoFirma
Set entFlujoFirma = crearEntidad(mdl, "FlujoFirma", "FLUJO_FIRMA", "Configuracion de flujos de firma secuencial PAdES")

Call crearAtributo(entFlujoFirma, "nombre", "NOMBRE", "Characters(255)", True)
Call crearAtributoComentario(entFlujoFirma, "es_global", "ES_GLOBAL", "Boolean", True, "TRUE = flujo por defecto del sistema")

' ── ENTIDAD 8: PASO FIRMA ───────────────────────────────────────────────────
Dim entPasoFirma
Set entPasoFirma = crearEntidad(mdl, "PasoFirma", "PASO_FIRMA", "Paso secuencial dentro de un flujo. orden: 1=Director, 2=Subdecano, 3=Decano, 4=Rector")

Call crearAtributoComentario(entPasoFirma, "orden", "ORDEN", "Integer", True, "Posicion: 1=Director, 2=Subdecano, 3=Decano, 4=Rector")

' ── ENTIDAD 9: CRITERIO ─────────────────────────────────────────────────────
Dim entCriterio
Set entCriterio = crearEntidad(mdl, "Criterio", "CRITERIO", "Nivel 5 de la jerarquia. Criterios oficiales de acreditacion (5 en total)")

Call crearAtributoComentario(entCriterio, "nombre", "NOMBRE", "Characters(200)", True, "Ej: '1. CURRICULO', '2. DOCENCIA'")
Call crearAtributo(entCriterio, "descripcion", "DESCRIPCION", "LongText", False)
Call crearAtributoComentario(entCriterio, "requiere_firma", "REQUIERE_FIRMA", "Boolean", True, "Los documentos de este criterio pasan por el flujo de firma")
Call crearAtributo(entCriterio, "activo", "ACTIVO", "Boolean", True)
Call crearAtributo(entCriterio, "creado_en", "CREADO_EN", "DateTime", True)

' ── ENTIDAD 10: INDICADOR ───────────────────────────────────────────────────
Dim entIndicador
Set entIndicador = crearEntidad(mdl, "Indicador", "INDICADOR", "Nivel 6 de la jerarquia. Indicadores oficiales de acreditacion (31 en total)")

Call crearAtributoComentario(entIndicador, "numero", "NUMERO", "Integer", True, "Numero oficial del indicador (1 al 31)")
Call crearAtributo(entIndicador, "nombre", "NOMBRE", "Characters(300)", True)
Call crearAtributo(entIndicador, "descripcion", "DESCRIPCION", "LongText", False)
Call crearAtributoComentario(entIndicador, "responsable_nombre", "RESPONSABLE_NOMBRE", "Characters(300)", False, "Ej: 'Directores de Carrera', 'Ing. Andres Galarza'")
Call crearAtributo(entIndicador, "activo", "ACTIVO", "Boolean", True)
Call crearAtributo(entIndicador, "creado_en", "CREADO_EN", "DateTime", True)

' ── ENTIDAD 11: ACTIVIDAD ───────────────────────────────────────────────────
Dim entActividad
Set entActividad = crearEntidad(mdl, "Actividad", "ACTIVIDAD", "Nivel 7 de la jerarquia. Contenedor de documentos PDF dentro de un Indicador")

Call crearAtributo(entActividad, "nombre", "NOMBRE", "Characters(200)", True)
Call crearAtributo(entActividad, "descripcion", "DESCRIPCION", "LongText", False)
Call crearAtributo(entActividad, "activo", "ACTIVO", "Boolean", True)
Call crearAtributo(entActividad, "creado_en", "CREADO_EN", "DateTime", True)

' ── ENTIDAD 12: DOCUMENTO ───────────────────────────────────────────────────
Dim entDocumento
Set entDocumento = crearEntidad(mdl, "Documento", "DOCUMENTO", "Documento PDF con su ciclo de vida de firma PAdES. PENDIENTE > EN_REVISION > FIRMADO_DIRECTOR > FIRMADO_SUBDECANO > FIRMADO_DECANO > COMPLETADO / RECHAZADO")

Call crearAtributo(entDocumento, "nombre_original", "NOMBRE_ORIGINAL", "Characters(255)", True)
Call crearAtributo(entDocumento, "ruta_archivo", "RUTA_ARCHIVO", "Characters(500)", True)
Call crearAtributoComentario(entDocumento, "estado", "ESTADO", "Characters(30)", True, _
    "PENDIENTE | EN_REVISION | FIRMADO_DIRECTOR | FIRMADO_SUBDECANO | FIRMADO_DECANO | COMPLETADO | RECHAZADO")
Call crearAtributoComentario(entDocumento, "paso_actual", "PASO_ACTUAL", "Integer", True, "1=Director, 2=Subdecano, 3=Decano, 4=Rector")
Call crearAtributo(entDocumento, "observaciones", "OBSERVACIONES", "LongText", False)
Call crearAtributoComentario(entDocumento, "hash_sha256", "HASH_SHA256", "Characters(64)", False, "Hash SHA-256 para verificacion de integridad")
Call crearAtributoComentario(entDocumento, "firmado_director_en", "FIRMADO_DIRECTOR_EN", "DateTime", False, "Timestamp firma Director de Carrera")
Call crearAtributoComentario(entDocumento, "firmado_subdecano_en", "FIRMADO_SUBDECANO_EN", "DateTime", False, "Timestamp firma Subdecano")
Call crearAtributoComentario(entDocumento, "firmado_decano_en", "FIRMADO_DECANO_EN", "DateTime", False, "Timestamp firma Decano")
Call crearAtributoComentario(entDocumento, "firmado_rector_en", "FIRMADO_RECTOR_EN", "DateTime", False, "Timestamp firma final del Rector")
Call crearAtributo(entDocumento, "creado_en", "CREADO_EN", "DateTime", True)
Call crearAtributo(entDocumento, "actualizado_en", "ACTUALIZADO_EN", "DateTime", True)

' =============================================================================
'  RELACIONES 1:N — JERARQUIA DOCUMENTAL
' =============================================================================

Call crearRelacion(mdl, "tiene_facultades", "REL_UNIV_FAC", _
    entUniversidad, entFacultad, "1,1-0,N", _
    "Una universidad tiene muchas facultades")

Call crearRelacion(mdl, "tiene_carreras", "REL_FAC_CAR", _
    entFacultad, entCarrera, "1,1-0,N", _
    "Una facultad tiene muchas carreras")

Call crearRelacion(mdl, "tiene_periodos", "REL_CAR_PER", _
    entCarrera, entPeriodo, "1,1-0,N", _
    "Una carrera tiene muchos periodos academicos")

Call crearRelacion(mdl, "tiene_criterios", "REL_PER_CRI", _
    entPeriodo, entCriterio, "1,1-0,N", _
    "Un periodo tiene 5 criterios de acreditacion")

Call crearRelacion(mdl, "tiene_indicadores", "REL_CRI_IND", _
    entCriterio, entIndicador, "1,1-1,N", _
    "Un criterio tiene uno o mas indicadores (total 31)")

Call crearRelacion(mdl, "tiene_actividades", "REL_IND_ACT", _
    entIndicador, entActividad, "1,1-0,N", _
    "Un indicador tiene cero o mas actividades (carpetas de documentos PDF)")

Call crearRelacion(mdl, "contiene_documentos", "REL_ACT_DOC", _
    entActividad, entDocumento, "1,1-0,N", _
    "Una actividad contiene cero o mas documentos PDF")

' =============================================================================
'  RELACIONES 1:N — USUARIOS Y FIRMA
' =============================================================================

Call crearRelacion(mdl, "pertenece_a_facultad", "REL_FAC_USU", _
    entFacultad, entUsuario, "0,1-0,N", _
    "Un usuario pertenece a una facultad (NULL para RECTOR y ADMINISTRADOR)")

Call crearRelacion(mdl, "asignado_a_carrera", "REL_CAR_USU", _
    entCarrera, entUsuario, "0,1-0,N", _
    "Un usuario puede estar asignado a una carrera (DIRECTOR_CARRERA y DOCENTE)")

Call crearRelacion(mdl, "define_pasos", "REL_FLU_PAS", _
    entFlujoFirma, entPasoFirma, "1,1-1,N", _
    "Un flujo define 1 o mas pasos de firma (1=Director, 2=Subdecano, 3=Decano, 4=Rector)")

Call crearRelacion(mdl, "requerido_en_paso", "REL_ROL_PAS", _
    entRol, entPasoFirma, "1,1-0,N", _
    "Un rol puede ser requerido en uno o mas pasos de firma")

Call crearRelacion(mdl, "flujo_del_criterio", "REL_FLU_CRI", _
    entFlujoFirma, entCriterio, "0,1-0,N", _
    "Un flujo de firma puede estar asignado a uno o mas criterios")

Call crearRelacion(mdl, "flujo_de_actividad", "REL_FLU_ACT", _
    entFlujoFirma, entActividad, "0,1-0,N", _
    "Un flujo puede asignarse a una actividad (sobreescribe el del criterio)")

Call crearRelacion(mdl, "flujo_del_documento", "REL_FLU_DOC", _
    entFlujoFirma, entDocumento, "0,1-0,N", _
    "El flujo de firma asignado al documento")

Call crearRelacion(mdl, "sube_documento", "REL_USU_DOC_SUBIDA", _
    entUsuario, entDocumento, "0,1-0,N", _
    "Un usuario puede subir muchos documentos (subido_por_id)")

Call crearRelacion(mdl, "firma_documento", "REL_USU_DOC_FIRMA", _
    entUsuario, entDocumento, "0,1-0,N", _
    "Usuario asignado como firmante actual del documento (firmante_actual_id)")

Call crearRelacion(mdl, "documento_de_facultad", "REL_FAC_DOC", _
    entFacultad, entDocumento, "0,1-0,N", _
    "Facultad a la que pertenece el documento (para enrutamiento del firmante)")

Call crearRelacion(mdl, "responsable_principal_indicador", "REL_USU_IND_RESP", _
    entUsuario, entIndicador, "0,1-0,N", _
    "Usuario responsable principal del indicador (responsable_id)")

' =============================================================================
'  RELACIONES M:N — ASOCIACIONES
'  (corresponden a las tablas de union: usuario_roles,
'   indicadores_responsables, actividades_usuarios)
' =============================================================================

Call crearRelacion(mdl, "tiene_roles", "REL_USU_ROL_MN", _
    entUsuario, entRol, "1,N-0,N", _
    "Un usuario puede tener 1 o mas roles. Un rol puede estar en muchos usuarios. [tabla: usuario_roles]")

Call crearRelacion(mdl, "responsables_del_indicador", "REL_IND_USU_MN", _
    entIndicador, entUsuario, "0,N-0,N", _
    "Un indicador puede tener varios responsables de area. [tabla: indicadores_responsables]")

Call crearRelacion(mdl, "usuarios_autorizados_actividad", "REL_ACT_USU_MN", _
    entActividad, entUsuario, "0,N-0,N", _
    "Usuarios autorizados para subir documentos en una actividad. [tabla: actividades_usuarios]")

' =============================================================================
'  FIN
' =============================================================================
MsgBox "Diagrama Entidad-Relacion generado exitosamente." & Chr(13) & Chr(13) & _
       "Entidades creadas : 12" & Chr(13) & _
       "Relaciones 1:N    : 18" & Chr(13) & _
       "Relaciones M:N    :  3" & Chr(13) & Chr(13) & _
       "Siguiente paso:" & Chr(13) & _
       "  Tools > Generate Physical Data Model  (para el PDM/SQL)" & Chr(13) & _
       "  Tools > Generate Logical Data Model   (para el modelo logico)", _
       vbInformation, "ERD - Sistema de Gestion de Archivos"
