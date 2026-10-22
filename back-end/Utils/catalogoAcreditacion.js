const CRITERIOS_ACREDITACION = [
  { idx: 0, nombre: '1. CURRÍCULO',                           descripcion: 'Currículo y plan de estudios' },
  { idx: 1, nombre: '2. DOCENCIA',                            descripcion: 'Personal académico y enseñanza' },
  { idx: 2, nombre: '3. INVESTIGACIÓN E INNOVACIÓN',          descripcion: 'Gestión de investigación y producción académica' },
  { idx: 3, nombre: '4. VINCULACIÓN CON LA SOCIEDAD',         descripcion: 'Vinculación, transferencia y prácticas preprofesionales' },
  { idx: 4, nombre: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', descripcion: 'Planificación, calidad, infraestructura y gestión' },
];

const SUBCRITERIOS_ACREDITACION = [
  { numero: 1,  criterioIdx: 0, nombre: 'Perfil de egreso', responsableTexto: 'Directores de Carrera' },
  { numero: 2,  criterioIdx: 0, nombre: 'Proyecto curricular', responsableTexto: 'Directores de Carrera' },
  { numero: 3,  criterioIdx: 0, nombre: 'Malla curricular', responsableTexto: 'Directores de Carrera' },
  { numero: 4,  criterioIdx: 0, nombre: 'Syllabus', responsableTexto: 'Directores de Carrera' },
  { numero: 5,  criterioIdx: 0, nombre: 'Metodología y recursos de aprendizaje', responsableTexto: 'Directores de Carrera' },
  { numero: 6,  criterioIdx: 0, nombre: 'Escenarios de prácticas formativas', responsableTexto: 'Directores de Carrera' },
  { numero: 7,  criterioIdx: 0, nombre: 'Tecnologías para el Aprendizaje y Conocimiento (TAC)', responsableTexto: 'Directores de Carrera' },

  { numero: 8,  criterioIdx: 1, nombre: 'Afinidad del personal académico', responsableTexto: 'Directores de Carrera' },
  { numero: 9,  criterioIdx: 1, nombre: 'Personal académico titular permanente', responsableTexto: 'Directores de Carrera' },
  { numero: 10, criterioIdx: 1, nombre: 'Evaluación integral del desempeño del personal académico', responsableTexto: 'Directores de Carrera' },
  { numero: 11, criterioIdx: 1, nombre: 'Sistema de tutorías académicas', responsableTexto: 'Ing. Andrés Galarza' },
  { numero: 12, criterioIdx: 1, nombre: 'Habilidades blandas', responsableTexto: 'Directores de Carrera' },
  { numero: 13, criterioIdx: 1, nombre: 'Seguimiento al cumplimiento de los resultados de aprendizaje', responsableTexto: 'Ing. Antonio Cajamarca' },
  { numero: 14, criterioIdx: 1, nombre: 'Tasa de deserción', responsableTexto: 'Bienestar Estudiantil' },
  { numero: 15, criterioIdx: 1, nombre: 'Tasa de titulación de grado', responsableTexto: 'Ing. José Carrillo' },
  { numero: 16, criterioIdx: 1, nombre: 'Seguimiento a graduados', responsableTexto: 'Ing. Antonio Cajamarca' },
  { numero: 17, criterioIdx: 1, nombre: 'Éxito de los graduados', responsableTexto: 'Ing. Antonio Cajamarca' },

  { numero: 18, criterioIdx: 2, nombre: 'Gestión de la investigación e innovación', responsableTexto: 'PhD. Orlando Álvarez' },
  { numero: 19, criterioIdx: 2, nombre: 'Producción académica', responsableTexto: 'PhD. Orlando Álvarez' },
  { numero: 20, criterioIdx: 2, nombre: 'Interdisciplinariedad para la articulación de las funciones sustantivas', responsableTexto: 'Eco. Jorge Cárdenas / Ing. Jeyson Gaona' },

  { numero: 21, criterioIdx: 3, nombre: 'Planificación y gestión de la vinculación con la sociedad', responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
  { numero: 22, criterioIdx: 3, nombre: 'Mecanismos de transferencia de tecnología y conocimiento', responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
  { numero: 23, criterioIdx: 3, nombre: 'Prácticas preprofesionales', responsableTexto: 'Software: Ing. Xavier González | Sistemas: Dr. Orlando Álvarez | VR: Ing. Xavier González | Robótica: Ing. Pablo Buestán | Biomédicos: Ing. Sandro Ortiz' },

  { numero: 24, criterioIdx: 4, nombre: 'Planificación académica y administrativa de la carrera', responsableTexto: 'Directores de Carrera' },
  { numero: 25, criterioIdx: 4, nombre: 'Aseguramiento de la calidad de la carrera', responsableTexto: 'Ing. José Carrillo' },
  { numero: 26, criterioIdx: 4, nombre: 'Ética, transparencia e integridad', responsableTexto: 'Directores de Carrera' },
  { numero: 27, criterioIdx: 4, nombre: 'Internacionalización y movilidad', responsableTexto: 'Ing. Andrés Galarza' },
  { numero: 28, criterioIdx: 4, nombre: 'Gestión de la infraestructura física y tecnológica', responsableTexto: 'Ing. David Calderón' },
  { numero: 29, criterioIdx: 4, nombre: 'Ambientes de aprendizaje', responsableTexto: 'Ing. David Calderón' },
  { numero: 30, criterioIdx: 4, nombre: 'Herramientas pedagógicas', responsableTexto: 'Ing. David Calderón' },
  { numero: 31, criterioIdx: 4, nombre: 'Gestión del acervo y recursos bibliográficos', responsableTexto: 'Biblioteca UCACUE / Directores de Carrera' },
];

/**
 * Genera de forma automatizada los 5 Criterios y 31 Subcriterios (e Indicadores legacy)
 * para una Carrera dentro de un Período dado. Los documentos PDF se suben directamente al Subcriterio.
 */
async function generarEstructuraParaCarreraYPeriodo({
  carreraId,
  periodoId,
  models,
  transaction,
}) {
  const { Criterio, Subcriterio, Indicador } = models;

  const criteriosCreados = [];

  for (const critDef of CRITERIOS_ACREDITACION) {
    const [criterio] = await Criterio.findOrCreate({
      where: {
        nombre: critDef.nombre,
        periodo_id: periodoId,
        carrera_id: carreraId,
      },
      defaults: {
        descripcion: critDef.descripcion,
        periodo_id: periodoId,
        carrera_id: carreraId,
        requiere_firma: true,
      },
      transaction,
    });
    criteriosCreados.push(criterio);
  }

  for (const subDef of SUBCRITERIOS_ACREDITACION) {
    const criterio = criteriosCreados[subDef.criterioIdx];

    // 1. Crear Subcriterio (nivel final donde se suben los documentos PDF)
    if (Subcriterio) {
      await Subcriterio.findOrCreate({
        where: { numero: subDef.numero, criterio_id: criterio.id },
        defaults: {
          nombre: subDef.nombre,
          descripcion: `Subir los documentos PDF respaldatorios para el subcriterio [${subDef.numero}] ${subDef.nombre}.`,
          criterio_id: criterio.id,
          responsable_nombre: subDef.responsableTexto,
          requiere_firma: true,
        },
        transaction,
      });
    }

    // 2. Crear Indicador (para mantener sincronía y compatibilidad retroactiva)
    if (Indicador) {
      await Indicador.findOrCreate({
        where: { numero: subDef.numero, criterio_id: criterio.id },
        defaults: {
          nombre: subDef.nombre,
          descripcion: `Subir los documentos PDF respaldatorios para el subcriterio [${subDef.numero}] ${subDef.nombre}.`,
          criterio_id: criterio.id,
          responsable_nombre: subDef.responsableTexto,
        },
        transaction,
      });
    }
  }

  return criteriosCreados;
}

module.exports = {
  CRITERIOS_ACREDITACION,
  SUBCRITERIOS_ACREDITACION,
  generarEstructuraParaCarreraYPeriodo,
};
