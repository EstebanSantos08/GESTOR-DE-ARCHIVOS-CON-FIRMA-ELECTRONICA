require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, Rol, Usuario, Universidad, Facultad,
  Carrera, Periodo, Criterio, Indicador, Actividad
} = require('./Model');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // ─── Roles (7 niveles jerárquicos) ─────────────────────────────────────
    await Rol.bulkCreate([
      { nombre: 'RESPONSABLE_AREA',  nivel: 1, descripcion: 'Responsable de área — sube evidencia en indicadores asignados' },
      { nombre: 'DOCENTE',           nivel: 2, descripcion: 'Docente universitario — sube documentos' },
      { nombre: 'DIRECTOR_CARRERA',  nivel: 3, descripcion: 'Director de carrera — primera firma y revisión' },
      { nombre: 'SUBDECANO',         nivel: 4, descripcion: 'Subdecano — segunda firma y parametrización' },
      { nombre: 'DECANO',            nivel: 5, descripcion: 'Decano de facultad — tercera firma' },
      { nombre: 'RECTOR',            nivel: 6, descripcion: 'Rector — firma final y aprobación' },
      { nombre: 'ADMINISTRADOR',     nivel: 7, descripcion: 'Administrador del sistema — gestión total, no firma' },
    ], { ignoreDuplicates: true });

    console.log('Roles creados:');
    const rolesDB = await Rol.findAll({ order: [['nivel', 'ASC']] });
    rolesDB.forEach(r => console.log(`  [${r.id}] ${r.nombre} (nivel ${r.nivel})`));

    // ─── Universidad ─────────────────────────────────────────────────────
    const [universidad] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad Católica de Cuenca' },
      defaults: { descripcion: 'UCACUE — Sede Cuenca', siglas: 'UCACUE' },
    });
    console.log(`\nUniversidad: ${universidad.nombre} (id: ${universidad.id})`);

    // ─── Facultad ────────────────────────────────────────────────────────
    const [facultad] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ingeniería' },
      defaults: {
        descripcion: 'Facultad de ingeniería y ciencias aplicadas',
        universidad_id: universidad.id,
      },
    });
    console.log(`Facultad: ${facultad.nombre} (id: ${facultad.id})`);

    // ─── Carreras ────────────────────────────────────────────────────────
    const carrerasData = [
      { nombre: 'Software - Cuenca',           descripcion: 'Ingeniería de Software' },
      { nombre: 'Sistemas Computacionales',     descripcion: 'Ingeniería en Sistemas Computacionales' },
      { nombre: 'Realidad Virtual - Cuenca',    descripcion: 'Ingeniería en Realidad Virtual' },
      { nombre: 'Robótica - Cuenca',            descripcion: 'Ingeniería en Robótica' },
      { nombre: 'Sistemas Biomédicos - Cuenca', descripcion: 'Ingeniería en Sistemas Biomédicos' },
    ];

    console.log('\nCarreras:');
    const carreras = [];
    for (const c of carrerasData) {
      const [carrera] = await Carrera.findOrCreate({
        where: { nombre: c.nombre, facultad_id: facultad.id },
        defaults: { descripcion: c.descripcion, facultad_id: facultad.id },
      });
      carreras.push(carrera);
      console.log(`  ${carrera.nombre} (id: ${carrera.id})`);
    }
    const carreraSoftware = carreras[0];

    // ─── Usuarios (1 por cada rol + personalizados) ───────────────────────
    const usuarios = [
      { nombre: 'Admin Sistema',          email: 'admin@universidad.edu',       password: 'Admin123!',       rol: 'ADMINISTRADOR',    facultad_id: null,         carrera_id: null },
      { nombre: 'Carlos Rector',          email: 'rector@universidad.edu',      password: 'Rector123!',      rol: 'RECTOR',           facultad_id: null,         carrera_id: null },
      { nombre: 'María Decano',           email: 'decano@universidad.edu',      password: 'Decano123!',      rol: 'DECANO',           facultad_id: facultad.id,  carrera_id: null },
      { nombre: 'Pedro Subdecano',        email: 'subdecano@universidad.edu',   password: 'Subdecano123!',   rol: 'SUBDECANO',        facultad_id: facultad.id,  carrera_id: null },
      { nombre: 'Ana Director',           email: 'director@universidad.edu',    password: 'Director123!',    rol: 'DIRECTOR_CARRERA', facultad_id: facultad.id,  carrera_id: carreraSoftware.id },
      { nombre: 'Juan Docente',           email: 'docente@universidad.edu',     password: 'Docente123!',     rol: 'DOCENTE',          facultad_id: facultad.id,  carrera_id: carreraSoftware.id },
      { nombre: 'Laura Responsable',      email: 'responsable@universidad.edu', password: 'Responsable123!', rol: 'RESPONSABLE_AREA', facultad_id: facultad.id,  carrera_id: null },
      { nombre: 'Ing. Andrés Galarza',    email: 'agalarza@universidad.edu',    password: 'Docente123!',     rol: 'DOCENTE',          facultad_id: facultad.id,  carrera_id: carreraSoftware.id },
      { nombre: 'Ing. Antonio Cajamarca', email: 'acajamarca@universidad.edu',  password: 'Docente123!',     rol: 'DOCENTE',          facultad_id: facultad.id,  carrera_id: carreraSoftware.id },
    ];

    console.log('\nUsuarios:');
    const usuariosDB = {};
    for (const u of usuarios) {
      const rol = rolesDB.find(r => r.nombre === u.rol);
      const hash = await bcrypt.hash(u.password, 12);
      const [usuario, creado] = await Usuario.findOrCreate({
        where: { email: u.email },
        defaults: {
          nombre: u.nombre,
          password_hash: hash,
          rol_id: rol.id,
          facultad_id: u.facultad_id,
          carrera_id: u.carrera_id,
        },
      });
      if (!creado && u.carrera_id && !usuario.carrera_id) {
        await usuario.update({ carrera_id: u.carrera_id });
      }
      usuariosDB[u.rol] = usuario;
      const estado = creado ? 'CREADO' : 'YA EXISTÍA';
      console.log(`  [${estado}] ${u.nombre} <${u.email}> — ${u.rol} — password: ${u.password}`);
    }

    // ─── Período ─────────────────────────────────────────────────────────
    const [periodo] = await Periodo.findOrCreate({
      where: { nombre: '2026-I', carrera_id: carreraSoftware.id },
      defaults: { carrera_id: carreraSoftware.id },
    });
    console.log(`\nPeríodo: ${periodo.nombre} (id: ${periodo.id})`);

    // ─── Criterios de acreditación (5) ───────────────────────────────────
    const criteriosData = [
      { nombre: '1. CURRÍCULO',                                 descripcion: 'Currículo y plan de estudios' },
      { nombre: '2. DOCENCIA',                                  descripcion: 'Personal académico y enseñanza' },
      { nombre: '3. INVESTIGACIÓN E INNOVACIÓN',                descripcion: 'Gestión de investigación y producción académica' },
      { nombre: '4. VINCULACIÓN CON LA SOCIEDAD',               descripcion: 'Vinculación, transferencia y prácticas preprofesionales' },
      { nombre: '5. FUNCIONES ESTRATÉGICAS Y DE SOPORTE',       descripcion: 'Planificación, calidad, infraestructura y gestión' },
    ];

    console.log('\nCriterios de acreditación:');
    const criteriosDB = [];
    for (const c of criteriosData) {
      const [criterio] = await Criterio.findOrCreate({
        where: { nombre: c.nombre, periodo_id: periodo.id },
        defaults: { descripcion: c.descripcion, periodo_id: periodo.id },
      });
      criteriosDB.push(criterio);
      console.log(`  ${criterio.nombre} (id: ${criterio.id})`);
    }

    const indicadoresData = [
      { numero: 1,  nombre: 'Perfil de egreso',                                       criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 2,  nombre: 'Proyecto curricular',                                    criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 3,  nombre: 'Malla curricular',                                       criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 4,  nombre: 'Syllabus',                                               criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 5,  nombre: 'Metodología y recursos de aprendizaje',                  criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 6,  nombre: 'Escenarios de prácticas formativas',                     criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 7,  nombre: 'Tecnologías para el Aprendizaje y Conocimiento (TAC)',   criterioIdx: 0, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 8,  nombre: 'Afinidad del personal académico',                        criterioIdx: 1, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 9,  nombre: 'Personal académico titular permanente',                  criterioIdx: 1, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 10, nombre: 'Evaluación integral del desempeño del personal académico', criterioIdx: 1, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 11, nombre: 'Sistema de tutorías académicas',                         criterioIdx: 1, responsableRol: 'DOCENTE', responsableTexto: 'Ing. Andrés Galarza' },
      { numero: 12, nombre: 'Habilidades blandas',                                    criterioIdx: 1, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 13, nombre: 'Seguimiento al cumplimiento de los resultados de aprendizaje', criterioIdx: 1, responsableRol: 'DOCENTE', responsableTexto: 'Ing. Antonio Cajamarca' },
      { numero: 14, nombre: 'Tasa de deserción',                                      criterioIdx: 1, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Bienestar Estudiantil' },
      { numero: 15, nombre: 'Tasa de titulación de grado',                            criterioIdx: 1, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. José Carrillo' },
      { numero: 16, nombre: 'Seguimiento a graduados',                                criterioIdx: 1, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. Antonio Cajamarca' },
      { numero: 17, nombre: 'Éxito de los graduados',                                 criterioIdx: 1, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. Antonio Cajamarca' },
      { numero: 18, nombre: 'Gestión de la investigación e innovación',               criterioIdx: 2, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'PhD. Orlando Álvarez' },
      { numero: 19, nombre: 'Producción académica',                                   criterioIdx: 2, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'PhD. Orlando Álvarez' },
      { numero: 20, nombre: 'Interdisciplinariedad para la articulación de las funciones sustantivas', criterioIdx: 2, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Eco. Jorge Cárdenas / Ing. Jeyson Gaona' },
      { numero: 21, nombre: 'Planificación y gestión de la vinculación con la sociedad', criterioIdx: 3, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
      { numero: 22, nombre: 'Mecanismos de transferencia de tecnología y conocimiento', criterioIdx: 3, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. Jenny Vizñay / Ing. Juan Pablo Pazmiño' },
      { numero: 23, nombre: 'Prácticas preprofesionales',                             criterioIdx: 3, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Software: Ing. Xavier González | Sistemas: Dr. Orlando Álvarez | Realidad Virtual: Ing. Xavier González | Robótica: Ing. Pablo Buestán | Sistemas Biomédicos: Ing. Sandro Ortiz' },
      { numero: 24, nombre: 'Planificación académica y administrativa de la carrera', criterioIdx: 4, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 25, nombre: 'Aseguramiento de la calidad de la carrera',              criterioIdx: 4, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. José Carrillo' },
      { numero: 26, nombre: 'Ética, transparencia e integridad',                      criterioIdx: 4, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Directores de Carrera' },
      { numero: 27, nombre: 'Internacionalización y movilidad',                       criterioIdx: 4, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. Andrés Galarza' },
      { numero: 28, nombre: 'Gestión de la infraestructura física y tecnológica',     criterioIdx: 4, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. David Calderón' },
      { numero: 29, nombre: 'Ambientes de aprendizaje',                               criterioIdx: 4, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. David Calderón' },
      { numero: 30, nombre: 'Herramientas pedagógicas',                               criterioIdx: 4, responsableRol: 'RESPONSABLE_AREA', responsableTexto: 'Ing. David Calderón' },
      { numero: 31, nombre: 'Gestión del acervo y recursos bibliográficos',           criterioIdx: 4, responsableRol: 'DIRECTOR_CARRERA', responsableTexto: 'Biblioteca UCACUE / Directores de Carrera' },
    ];

    console.log('\nIndicadores y Actividades:');
    for (const ind of indicadoresData) {
      const criterio = criteriosDB[ind.criterioIdx];
      const responsable = usuariosDB[ind.responsableRol] || null;
      
      const [indicador] = await Indicador.findOrCreate({
        where: { numero: ind.numero, criterio_id: criterio.id },
        defaults: {
          nombre: ind.nombre,
          criterio_id: criterio.id,
          responsable_id: responsable?.id || null,
          responsable_nombre: ind.responsableTexto || null,
        },
      });
      // Actualizar por si ya existía pero con nombre anterior
      await indicador.update({ responsable_nombre: ind.responsableTexto || null });
      
      // Creamos 1 o 2 actividades por indicador
      await Actividad.findOrCreate({
        where: { nombre: `Informe de Evidencias - ${ind.nombre}`, indicador_id: indicador.id },
        defaults: { descripcion: 'Subir todos los PDFs respaldatorios para este indicador.' }
      });
      
      if (ind.numero % 2 === 0) {
        await Actividad.findOrCreate({
          where: { nombre: `Matriz Consolidada - ${ind.nombre}`, indicador_id: indicador.id },
          defaults: { descripcion: 'Subir Excel convertido a PDF con la matriz de datos.' }
        });
      }

      console.log(`  ✅ [${ind.numero}] ${ind.nombre} → ${ind.responsableRol}`);
    }

    console.log('\n══════════════════════════════════════════');
    console.log('Seed completado exitosamente con 7 niveles.');
    console.log('══════════════════════════════════════════');
    console.log('\nCredenciales de prueba:');
    console.log('  admin@universidad.edu       / Admin123!       (ADMINISTRADOR)');
    console.log('  rector@universidad.edu      / Rector123!      (RECTOR)');
    console.log('  decano@universidad.edu      / Decano123!      (DECANO)');
    console.log('  subdecano@universidad.edu   / Subdecano123!   (SUBDECANO)');
    console.log('  director@universidad.edu    / Director123!    (DIRECTOR_CARRERA)');
    console.log('  docente@universidad.edu     / Docente123!     (DOCENTE)');
    console.log('  responsable@universidad.edu / Responsable123! (RESPONSABLE_AREA)');
    console.log('  agalarza@universidad.edu    / Docente123!     (DOCENTE - Tutorías)');
    console.log('  acajamarca@universidad.edu  / Docente123!     (DOCENTE - Seguimiento)');

    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
