/**
 * seed-carreras-demo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserta las 6 carreras de demo bajo la Facultad de Ingeniería existente
 * (o la crea si no existe). Usa findOrCreate para ser idempotente: puede
 * ejecutarse varias veces sin duplicar registros.
 *
 * Uso:
 *   cd back-end
 *   node seed-carreras-demo.js
 */

require('dotenv').config();
const { sequelize, Universidad, Facultad, Carrera } = require('./Model');

const CARRERAS_DEMO = [
  {
    nombre: 'Software',
    descripcion: 'Ingeniería de Software — desarrollo, arquitectura y calidad de software',
  },
  {
    nombre: 'TI',
    descripcion: 'Tecnologías de la Información — infraestructura, redes y servicios TI',
  },
  {
    nombre: 'TDN',
    descripcion: 'Tecnologías Digitales y Negocios — transformación digital y gestión empresarial',
  },
  {
    nombre: 'BM',
    descripcion: 'Sistemas Biomédicos — ingeniería aplicada a equipos y tecnologías médicas',
  },
  {
    nombre: 'Robótica',
    descripcion: 'Robótica e Inteligencia Artificial — diseño de sistemas autónomos y robóticos',
  },
  {
    nombre: 'Realidad Virtual',
    descripcion: 'Realidad Virtual y Aumentada — desarrollo de entornos inmersivos y XR',
  },
];

async function seedCarrerasDemo() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    // ── Universidad ─────────────────────────────────────────────────────────
    const [universidad] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad Católica de Cuenca' },
      defaults: { descripcion: 'UCACUE — Sede Cuenca', siglas: 'UCACUE' },
    });
    console.log(`🏛️  Universidad: ${universidad.nombre} (id: ${universidad.id})`);

    // ── Facultad ─────────────────────────────────────────────────────────────
    const [facultad] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ingeniería' },
      defaults: {
        descripcion: 'Facultad de ingeniería y ciencias aplicadas',
        universidad_id: universidad.id,
      },
    });
    console.log(`🏫  Facultad: ${facultad.nombre} (id: ${facultad.id})\n`);

    // ── Carreras ─────────────────────────────────────────────────────────────
    console.log('📚 Insertando carreras de demo:');
    console.log('─'.repeat(60));

    const resultados = [];
    for (const c of CARRERAS_DEMO) {
      const [carrera, creada] = await Carrera.findOrCreate({
        where: { nombre: c.nombre, facultad_id: facultad.id },
        defaults: {
          nombre: c.nombre,
          descripcion: c.descripcion,
          facultad_id: facultad.id,
          activo: true,
        },
      });

      const estado = creada ? '✅ CREADA     ' : '⚠️  YA EXISTÍA';
      console.log(`  ${estado} | id: ${String(carrera.id).padEnd(4)} | ${carrera.nombre}`);
      if (creada) console.log(`             └─ ${c.descripcion}`);
      resultados.push({ carrera, creada });
    }

    console.log('─'.repeat(60));
    const nuevas = resultados.filter(r => r.creada).length;
    const existentes = resultados.filter(r => !r.creada).length;
    console.log(`\n📊 Resumen: ${nuevas} carrera(s) creadas, ${existentes} ya existían.`);

    // Listar todas las carreras de la facultad al final
    const todasCarreras = await Carrera.findAll({
      where: { facultad_id: facultad.id, activo: true },
      order: [['id', 'ASC']],
    });
    console.log(`\n📋 Carreras activas en "${facultad.nombre}" (${todasCarreras.length} total):`);
    todasCarreras.forEach(c => {
      console.log(`   [${c.id}] ${c.nombre}`);
    });

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  seed-carreras-demo.js completado exitosamente.');
    console.log('══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error en seed-carreras-demo:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedCarrerasDemo();
