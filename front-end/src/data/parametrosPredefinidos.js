export const RESPONSABLES_PREDEFINIDOS = [
  'Directores de Carrera',
  'Ing. Andrés Galarza',
  'Ing. Antonio Cajamarca',
  'Bienestar Estudiantil',
  'Ing. José Carrillo',
  'PhD. Orlando Álvarez',
  'Eco. Jorge Cárdenas / Ing. Jeyson Gaona',
  'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño',
  'Ing. Xavier González',
  'Dr. Orlando Álvarez',
  'Ing. Pablo Buestán',
  'Ing. Sandro Ortiz',
  'Ing. David Calderón',
  'Biblioteca UCACUE / Directores de Carrera',
];

export const CRITERIOS_PREDEFINIDOS = [
  '1. CURRÍCULO',
  '2. DOCENCIA',
  '3. INVESTIGACIÓN E INNOVACIÓN',
  '4. VINCULACIÓN CON LA SOCIEDAD',
  '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE',
];

export const GRUPOS_SUBCRITERIOS_POR_CRITERIO = {
  '1. CURRÍCULO': [],
  '2. DOCENCIA': [
    '2.1 PERSONAL ACADÉMICO',
    '2.2 ESTUDIANTES',
  ],
  '3. INVESTIGACIÓN E INNOVACIÓN': [
    '3.1 GESTIÓN DE LA INVESTIGACIÓN E INNOVACIÓN',
    '3.2 CONTRIBUCIÓN A LA INVESTIGACIÓN E INNOVACIÓN',
  ],
  '4. VINCULACIÓN CON LA SOCIEDAD': [
    '4.1 ORGANIZACIÓN DE LA VINCULACIÓN CON LA SOCIEDAD',
    '4.2 TRANSFERENCIA DE TECNOLOGÍAS Y PRÁCTICAS PREPROFESIONALES',
  ],
  '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE': [
    '5.1 FUNCIONES ESTRATÉGICAS',
    '5.2 FUNCIONES DE SOPORTE',
  ],
};

export const INDICADORES_PREDEFINIDOS = [
  // 1. CURRÍCULO (Directo, sin subcriterio agrupador)
  { numero: 1,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Perfil de egreso', responsable_nombre: 'Directores de Carrera' },
  { numero: 2,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Proyecto curricular', responsable_nombre: 'Directores de Carrera' },
  { numero: 3,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Malla curricular', responsable_nombre: 'Directores de Carrera' },
  { numero: 4,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Syllabus', responsable_nombre: 'Directores de Carrera' },
  { numero: 5,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Metodología y recursos de aprendizaje', responsable_nombre: 'Directores de Carrera' },
  { numero: 6,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Escenarios de prácticas formativas', responsable_nombre: 'Directores de Carrera' },
  { numero: 7,  criterio: '1. CURRÍCULO', grupo_subcriterio: null, nombre: 'Tecnologías para el Aprendizaje y Conocimiento (TAC)', responsable_nombre: 'Directores de Carrera' },

  // 2. DOCENCIA
  { numero: 8,  criterio: '2. DOCENCIA', grupo_subcriterio: '2.1 PERSONAL ACADÉMICO', nombre: 'Afinidad del personal académico', responsable_nombre: 'Directores de Carrera' },
  { numero: 9,  criterio: '2. DOCENCIA', grupo_subcriterio: '2.1 PERSONAL ACADÉMICO', nombre: 'Personal académico titular permanente', responsable_nombre: 'Directores de Carrera' },
  { numero: 10, criterio: '2. DOCENCIA', grupo_subcriterio: '2.1 PERSONAL ACADÉMICO', nombre: 'Evaluación integral del desempeño del personal académico', responsable_nombre: 'Directores de Carrera' },
  { numero: 11, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Sistema de tutorías académicas', responsable_nombre: 'Ing. Andrés Galarza' },
  { numero: 12, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Habilidades blandas', responsable_nombre: 'Directores de Carrera' },
  { numero: 13, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Seguimiento al cumplimiento de los resultados de aprendizaje', responsable_nombre: 'Ing. Antonio Cajamarca' },
  { numero: 14, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Tasa de deserción', responsable_nombre: 'Bienestar Estudiantil' },
  { numero: 15, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Tasa de titulación de grado', responsable_nombre: 'Ing. José Carrillo' },
  { numero: 16, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Seguimiento a graduados', responsable_nombre: 'Ing. Antonio Cajamarca' },
  { numero: 17, criterio: '2. DOCENCIA', grupo_subcriterio: '2.2 ESTUDIANTES', nombre: 'Éxito de los graduados', responsable_nombre: 'Ing. Antonio Cajamarca' },

  // 3. INVESTIGACIÓN E INNOVACIÓN
  { numero: 18, criterio: '3. INVESTIGACIÓN E INNOVACIÓN', grupo_subcriterio: '3.1 GESTIÓN DE LA INVESTIGACIÓN E INNOVACIÓN', nombre: 'Gestión de la investigación e innovación', responsable_nombre: 'PhD. Orlando Álvarez' },
  { numero: 19, criterio: '3. INVESTIGACIÓN E INNOVACIÓN', grupo_subcriterio: '3.2 CONTRIBUCIÓN A LA INVESTIGACIÓN E INNOVACIÓN', nombre: 'Producción académica', responsable_nombre: 'PhD. Orlando Álvarez' },
  { numero: 20, criterio: '3. INVESTIGACIÓN E INNOVACIÓN', grupo_subcriterio: '3.2 CONTRIBUCIÓN A LA INVESTIGACIÓN E INNOVACIÓN', nombre: 'Interdisciplinariedad para la articulación de las funciones sustantivas', responsable_nombre: 'Eco. Jorge Cárdenas / Ing. Jeyson Gaona' },

  // 4. VINCULACIÓN CON LA SOCIEDAD
  { numero: 21, criterio: '4. VINCULACIÓN CON LA SOCIEDAD', grupo_subcriterio: '4.1 ORGANIZACIÓN DE LA VINCULACIÓN CON LA SOCIEDAD', nombre: 'Planificación y gestión de la vinculación con la sociedad', responsable_nombre: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
  { numero: 22, criterio: '4. VINCULACIÓN CON LA SOCIEDAD', grupo_subcriterio: '4.2 TRANSFERENCIA DE TECNOLOGÍAS Y PRÁCTICAS PREPROFESIONALES', nombre: 'Mecanismos de transferencia de tecnología y conocimiento', responsable_nombre: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
  { numero: 23, criterio: '4. VINCULACIÓN CON LA SOCIEDAD', grupo_subcriterio: '4.2 TRANSFERENCIA DE TECNOLOGÍAS Y PRÁCTICAS PREPROFESIONALES', nombre: 'Prácticas preprofesionales', responsable_nombre: 'Software: Ing. Xavier González | Sistemas: Dr. Orlando Álvarez | VR: Ing. Xavier González | Robótica: Ing. Pablo Buestán | Biomédicos: Ing. Sandro Ortiz' },

  // 5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE
  { numero: 24, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.1 FUNCIONES ESTRATÉGICAS', nombre: 'Planificación académica y administrativa de la carrera', responsable_nombre: 'Directores de Carrera' },
  { numero: 25, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.1 FUNCIONES ESTRATÉGICAS', nombre: 'Aseguramiento de la calidad de la carrera', responsable_nombre: 'Ing. José Carrillo' },
  { numero: 26, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.1 FUNCIONES ESTRATÉGICAS', nombre: 'Ética, transparencia e integridad', responsable_nombre: 'Directores de Carrera' },
  { numero: 27, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.1 FUNCIONES ESTRATÉGICAS', nombre: 'Internacionalización y movilidad', responsable_nombre: 'Ing. Andrés Galarza' },
  { numero: 28, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.2 FUNCIONES DE SOPORTE', nombre: 'Gestión de la infraestructura física y tecnológica', responsable_nombre: 'Ing. David Calderón' },
  { numero: 29, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.2 FUNCIONES DE SOPORTE', nombre: 'Ambientes de aprendizaje', responsable_nombre: 'Ing. David Calderón' },
  { numero: 30, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.2 FUNCIONES DE SOPORTE', nombre: 'Herramientas pedagógicas', responsable_nombre: 'Ing. David Calderón' },
  { numero: 31, criterio: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', grupo_subcriterio: '5.2 FUNCIONES DE SOPORTE', nombre: 'Gestión del acervo y recursos bibliográficos', responsable_nombre: 'Biblioteca UCACUE / Directores de Carrera' },
];
