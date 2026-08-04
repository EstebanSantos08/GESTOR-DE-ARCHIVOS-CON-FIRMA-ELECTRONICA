/**
 * seed-criterios.js
 * ──────────────────────────────────────────────────────────────────
 * Inserta (o actualiza) los 5 Criterios y los 31 Indicadores de
 * acreditación en la base de datos, usando FindOrCreate para que
 * sea seguro ejecutarlo varias veces sin duplicados.
 *
 * Uso:
 *   node seed-criterios.js
 *
 * Requisitos:
 *   - La base de datos debe estar corriendo y las tablas deben existir.
 *   - El archivo .env debe tener las variables DB_HOST, DB_PORT, etc.
 *   - Debe existir al menos 1 Periodo en la BD
 *     (si no, ejecuta primero: node seed.js)
 * ──────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const {
  sequelize, Periodo, Criterio, Indicador, Usuario,
} = require('./Model');

async function seedCriterios() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    // ─── Buscar un período existente ────────────────────────────────
    const periodo = await Periodo.findOne({ order: [['id', 'ASC']] });
    if (!periodo) {
      console.error('❌ No existe ningún Período en la base de datos.');
      console.error('   Ejecuta primero: node seed.js');
      process.exit(1);
    }
    console.log(`📅 Usando Período: "${periodo.nombre}" (id: ${periodo.id})\n`);

    // ─── Cargar usuarios para resolver responsables ──────────────────
    const usuarios = await Usuario.findAll();
    const byEmail = {};
    for (const u of usuarios) {
      byEmail[u.email] = u;
    }

    // ─── CRITERIOS ──────────────────────────────────────────────────
    const criteriosData = [
      { nombre: '1. CURRÍCULO',                           descripcion: 'Currículo y plan de estudios' },
      { nombre: '2. DOCENCIA',                            descripcion: 'Personal académico y enseñanza' },
      { nombre: '3. INVESTIGACIÓN E INNOVACIÓN',          descripcion: 'Gestión de investigación y producción académica' },
      { nombre: '4. VINCULACIÓN CON LA SOCIEDAD',         descripcion: 'Vinculación, transferencia y prácticas preprofesionales' },
      { nombre: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE', descripcion: 'Planificación, calidad, infraestructura y gestión' },
    ];

    console.log('📋 Procesando Criterios de acreditación...');
    const criteriosDB = [];
    for (const c of criteriosData) {
      const [criterio, creado] = await Criterio.findOrCreate({
        where: { nombre: c.nombre, periodo_id: periodo.id },
        defaults: { descripcion: c.descripcion, periodo_id: periodo.id },
      });
      criteriosDB.push(criterio);
      console.log(`  ${creado ? '✨ CREADO   ' : '✔  EXISTE  '} [${criterio.id}] ${criterio.nombre}`);
    }

    // ─── INDICADORES ────────────────────────────────────────────────
    // responsableKey = email clave (null si no existe en DB)
    const indicadoresData = [
      // ── Criterio 1: CURRÍCULO (criterioIdx: 0) ──────────────────
      { numero:  1, nombre: 'Perfil de egreso',                                                        criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  2, nombre: 'Proyecto curricular',                                                     criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  3, nombre: 'Malla curricular',                                                        criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  4, nombre: 'Syllabus',                                                                criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  5, nombre: 'Metodología y recursos de aprendizaje',                                   criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  6, nombre: 'Escenarios de prácticas formativas',                                      criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  7, nombre: 'Tecnologías para el Aprendizaje y Conocimiento (TAC)',                    criterioIdx: 0, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },

      // ── Criterio 2: DOCENCIA (criterioIdx: 1) ───────────────────
      { numero:  8, nombre: 'Afinidad del personal académico',                                         criterioIdx: 1, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero:  9, nombre: 'Personal académico titular permanente',                                   criterioIdx: 1, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero: 10, nombre: 'Evaluación integral del desempeño del personal académico',                criterioIdx: 1, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero: 11, nombre: 'Sistema de tutorías académicas',                                          criterioIdx: 1, responsableKey: 'agalarza@universidad.edu',   responsableTexto: 'Ing. Andrés Galarza' },
      { numero: 12, nombre: 'Habilidades blandas',                                                     criterioIdx: 1, responsableKey: 'director@universidad.edu',  responsableTexto: 'Directores de Carrera' },
      { numero: 13, nombre: 'Seguimiento al cumplimiento de los resultados de aprendizaje',            criterioIdx: 1, responsableKey: 'acajamarca@universidad.edu', responsableTexto: 'Ing. Antonio Cajamarca' },
      { numero: 14, nombre: 'Tasa de deserción',                                                       criterioIdx: 1, responsableKey: null,                         responsableTexto: 'Bienestar Estudiantil' },
      { numero: 15, nombre: 'Tasa de titulación de grado',                                             criterioIdx: 1, responsableKey: null,                         responsableTexto: 'Ing. José Carrillo' },
      { numero: 16, nombre: 'Seguimiento a graduados',                                                 criterioIdx: 1, responsableKey: 'acajamarca@universidad.edu', responsableTexto: 'Ing. Antonio Cajamarca' },
      { numero: 17, nombre: 'Éxito de los graduados',                                                  criterioIdx: 1, responsableKey: 'acajamarca@universidad.edu', responsableTexto: 'Ing. Antonio Cajamarca' },

      // ── Criterio 3: INVESTIGACIÓN E INNOVACIÓN (criterioIdx: 2) ─
      { numero: 18, nombre: 'Gestión de la investigación e innovación',                                criterioIdx: 2, responsableKey: null, responsableTexto: 'PhD. Orlando Álvarez' },
      { numero: 19, nombre: 'Producción académica',                                                    criterioIdx: 2, responsableKey: null, responsableTexto: 'PhD. Orlando Álvarez' },
      { numero: 20, nombre: 'Interdisciplinariedad para la articulación de las funciones sustantivas', criterioIdx: 2, responsableKey: null, responsableTexto: 'Eco. Jorge Cárdenas / Ing. Jeyson Gaona' },

      // ── Criterio 4: VINCULACIÓN CON LA SOCIEDAD (criterioIdx: 3) 
      { numero: 21, nombre: 'Planificación y gestión de la vinculación con la sociedad',               criterioIdx: 3, responsableKey: null, responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
      { numero: 22, nombre: 'Mecanismos de transferencia de tecnología y conocimiento',                criterioIdx: 3, responsableKey: null, responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
      {
        numero: 23,
        nombre: 'Prácticas preprofesionales',
        criterioIdx: 3,
        responsableKey: null,
        responsableTexto: 'Software - Cuenca: Ing. Xavier González | Sistemas Computacionales: Dr. Orlando Álvarez | Realidad Virtual - Cuenca: Ing. Xavier González | Robótica - Cuenca: Ing. Pablo Buestán | Sistemas Biomédicos - Cuenca: Ing. Sandro Ortiz',
      },

      // ── Criterio 5: FUNCIONES ESTRATÉGICAS Y DE SOPORTE (criterioIdx: 4)
      { numero: 24, nombre: 'Planificación académica y administrativa de la carrera', criterioIdx: 4, responsableKey: 'director@universidad.edu', responsableTexto: 'Directores de Carrera' },
      { numero: 25, nombre: 'Aseguramiento de la calidad de la carrera',              criterioIdx: 4, responsableKey: null,                       responsableTexto: 'Ing. José Carrillo' },
      { numero: 26, nombre: 'Ética, transparencia e integridad',                      criterioIdx: 4, responsableKey: 'director@universidad.edu', responsableTexto: 'Directores de Carrera' },
      { numero: 27, nombre: 'Internacionalización y movilidad',                       criterioIdx: 4, responsableKey: 'agalarza@universidad.edu',  responsableTexto: 'Ing. Andrés Galarza' },
      { numero: 28, nombre: 'Gestión de la infraestructura física y tecnológica',     criterioIdx: 4, responsableKey: null,                       responsableTexto: 'Ing. David Calderón' },
      { numero: 29, nombre: 'Ambientes de aprendizaje',                               criterioIdx: 4, responsableKey: null,                       responsableTexto: 'Ing. David Calderón' },
      { numero: 30, nombre: 'Herramientas pedagógicas',                               criterioIdx: 4, responsableKey: null,                       responsableTexto: 'Ing. David Calderón' },
      { numero: 31, nombre: 'Gestión del acervo y recursos bibliográficos',           criterioIdx: 4, responsableKey: 'director@universidad.edu', responsableTexto: 'Biblioteca UCACUE / Directores de Carrera' },
    ];

    console.log('\n📊 Procesando Indicadores...');
    let creados = 0;
    let existentes = 0;

    for (const ind of indicadoresData) {
      const criterio = criteriosDB[ind.criterioIdx];

      // Resolver ID del responsable
      const responsableId = ind.responsableKey
        ? (byEmail[ind.responsableKey]?.id || null)
        : null;

      const [indicador, indCreado] = await Indicador.findOrCreate({
        where: { numero: ind.numero, criterio_id: criterio.id },
        defaults: {
          nombre: ind.nombre,
          criterio_id: criterio.id,
          responsable_id: responsableId,
          responsable_nombre: ind.responsableTexto,
        },
      });

      // Siempre actualizar responsable_nombre por si cambió
      await indicador.update({ responsable_nombre: ind.responsableTexto });

      const num = ind.numero.toString().padStart(2, '0');
      if (indCreado) {
        creados++;
        console.log(`  ✨ [${num}] CREADO    → ${ind.nombre}`);
        console.log(`         Criterio: ${criterio.nombre}`);
        console.log(`         Responsable: ${ind.responsableTexto}`);
      } else {
        existentes++;
        console.log(`  ✔  [${num}] YA EXISTE → ${ind.nombre}`);
      }
    }

    // ─── Resumen ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('🎉 Seed de Criterios e Indicadores completado exitosamente.');
    console.log(`   Criterios procesados  : ${criteriosDB.length} / 5`);
    console.log(`   Indicadores procesados: ${creados + existentes} / 31`);
    console.log(`     → Recién creados    : ${creados}`);
    console.log(`     → Ya existían       : ${existentes}`);
    console.log('══════════════════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error en seed-criterios:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedCriterios();
