export const mockUser = {
  id: 3,
  nombre: 'Carlos Rector',
  email: 'rector@universidad.edu',
  rol: 'RECTOR',
  nivel: 3,
  avatar: 'CR',
  facultad: null,
};

export const mockUniversidades = [
  {
    id: 1,
    nombre: 'Universidad de las Fuerzas Armadas ESPE',
    siglas: 'ESPE',
    facultades: [
      {
        id: 1,
        nombre: 'Facultad de Ingeniería de Software',
        criterios: [
          {
            id: 1,
            nombre: 'Academia',
            requiere_firma: true,
            actividades: [
              {
                id: 1,
                nombre: 'Entregables 2026-1',
                informacion_ayuda: 'Suba los documentos de entregables del primer semestre 2026. Formatos aceptados: PDF. El documento será revisado por el Decano y posteriormente por el Rector.',
                documentos: [
                  { id: 1, nombre: 'Silabo_Algoritmos.pdf', estado: 'COMPLETADO', subido_por: 'Juan Docente', fecha: '2026-06-10', hash: 'a3f2c1d9e8b74f2a1c3d5e7f9a2b4c6d', tamanio: '245 KB', firmantes: ['Decano María', 'Rector Carlos'] },
                  { id: 2, nombre: 'Planificacion_BD.pdf', estado: 'FIRMADO_DECANO', subido_por: 'Juan Docente', fecha: '2026-06-15', hash: 'b7e1f4a2c9d3e8b1f5a7c2d4e6f8a0b2', tamanio: '312 KB', firmantes: ['Decano María'] },
                  { id: 3, nombre: 'Informe_Proyecto.pdf', estado: 'PENDIENTE', subido_por: 'Pedro Docente', fecha: '2026-06-20', hash: 'c9d3a7b2e1f4c8d5a3b6e9f2a4c7d0e3', tamanio: '189 KB', firmantes: [] },
                  { id: 4, nombre: 'Acta_Reunion.pdf', estado: 'RECHAZADO', subido_por: 'Pedro Docente', fecha: '2026-06-18', hash: 'd1a4b8c2e5f7a0b3c6d9e2f5a8b1c4d7', tamanio: '98 KB', firmantes: [] },
                ]
              },
              {
                id: 2,
                nombre: 'Distributivo Docente 2026',
                informacion_ayuda: 'Distributivo de carga horaria para el período 2026. Incluir firma del coordinador de carrera.',
                documentos: [
                  { id: 5, nombre: 'Distributivo_Software.pdf', estado: 'PENDIENTE', subido_por: 'Juan Docente', fecha: '2026-06-22', hash: 'e5b6c9d2f4a7b0c3d6e9f2a5b8c1d4e7', tamanio: '156 KB', firmantes: [] },
                ]
              }
            ]
          },
          {
            id: 2,
            nombre: 'Vinculación con la Sociedad',
            requiere_firma: true,
            actividades: [
              {
                id: 3,
                nombre: 'Proyectos Comunitarios 2026',
                informacion_ayuda: 'Registro de proyectos de vinculación comunitaria. Adjuntar memorias y evidencias fotográficas en PDF.',
                documentos: [
                  { id: 6, nombre: 'Memoria_ProyectoA.pdf', estado: 'COMPLETADO', subido_por: 'Ana Decano', fecha: '2026-05-30', hash: 'f2c7d0e3a6b9c2d5e8f1a4b7c0d3e6f9', tamanio: '520 KB', firmantes: ['Decano Ana', 'Rector Carlos'] },
                ]
              }
            ]
          },
          {
            id: 3,
            nombre: 'Investigación',
            requiere_firma: false,
            actividades: [
              {
                id: 4,
                nombre: 'Publicaciones Científicas',
                informacion_ayuda: 'Listado de publicaciones científicas del período.',
                documentos: []
              }
            ]
          }
        ]
      },
      {
        id: 2,
        nombre: 'Facultad de Ciencias Exactas',
        criterios: [
          {
            id: 4,
            nombre: 'Academia',
            requiere_firma: true,
            actividades: [
              {
                id: 5,
                nombre: 'Entregables 2026-1',
                informacion_ayuda: 'Documentos académicos del primer semestre.',
                documentos: [
                  { id: 7, nombre: 'Silabo_Calculo.pdf', estado: 'PENDIENTE', subido_por: 'Docente Ciencias', fecha: '2026-06-25', hash: 'g3h8i2j7k1l6m0n5o4p9q3r8s2t7u1v6', tamanio: '201 KB', firmantes: [] },
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const mockAuditoria = [
  { id: 1, usuario: 'Juan Docente', accion: 'CARGA', descripcion: 'Subió Silabo_Algoritmos.pdf', fecha: '2026-06-10 09:15:32', hash: 'a3f2c1d9e8b74f2a1c3d5e7f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7', tipo: 'CARGA' },
  { id: 2, usuario: 'María Decano', accion: 'FIRMA', descripcion: 'Firmó Silabo_Algoritmos.pdf', fecha: '2026-06-11 14:22:10', hash: 'b7e1f4a2c9d3e8b1f5a7c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4', tipo: 'FIRMA' },
  { id: 3, usuario: 'Carlos Rector', accion: 'FIRMA', descripcion: 'Firmó Silabo_Algoritmos.pdf', fecha: '2026-06-12 10:05:44', hash: 'c9d3a7b2e1f4c8d5a3b6e9f2a4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1', tipo: 'FIRMA' },
  { id: 4, usuario: 'Pedro Docente', accion: 'CARGA', descripcion: 'Subió Informe_Proyecto.pdf', fecha: '2026-06-20 16:40:11', hash: 'd1a4b8c2e5f7a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5', tipo: 'CARGA' },
  { id: 5, usuario: 'María Decano', accion: 'RECHAZO', descripcion: 'Rechazó Acta_Reunion.pdf', fecha: '2026-06-19 11:30:05', hash: 'e5b6c9d2f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5', tipo: 'RECHAZO' },
  { id: 6, usuario: 'Carlos Rector', accion: 'CREACION', descripcion: 'Creó criterio Investigación', fecha: '2026-06-01 08:00:00', hash: 'f2c7d0e3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7', tipo: 'CREACION' },
  { id: 7, usuario: 'Juan Docente', accion: 'CARGA', descripcion: 'Subió Planificacion_BD.pdf', fecha: '2026-06-15 13:55:22', hash: 'a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4', tipo: 'CARGA' },
  { id: 8, usuario: 'María Decano', accion: 'FIRMA', descripcion: 'Firmó Planificacion_BD.pdf', fecha: '2026-06-16 09:20:15', hash: 'b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7', tipo: 'FIRMA' },
  { id: 9, usuario: 'Ana Decano', accion: 'FIRMA', descripcion: 'Firmó Memoria_ProyectoA.pdf', fecha: '2026-05-31 15:10:33', hash: 'c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0', tipo: 'FIRMA' },
  { id: 10, usuario: 'Carlos Rector', accion: 'FIRMA', descripcion: 'Firmó Memoria_ProyectoA.pdf', fecha: '2026-06-01 09:45:00', hash: 'd0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3', tipo: 'FIRMA' },
];

export const mockAlertas = [
  { id: 1, documento: 'Planificacion_BD.pdf', mensaje: 'Pendiente de firma Rector — vence en 2 días', urgencia: 'alta' },
  { id: 2, documento: 'Informe_Proyecto.pdf', mensaje: 'Pendiente de firma Decano — vence en 5 días', urgencia: 'media' },
  { id: 3, documento: 'Distributivo_Software.pdf', mensaje: 'Sin revisar desde hace 7 días', urgencia: 'baja' },
];
