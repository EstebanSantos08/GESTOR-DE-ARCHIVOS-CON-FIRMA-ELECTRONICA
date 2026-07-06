require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Rol, Usuario, Universidad, Facultad } = require('./Model');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // ─── Roles ────────────────────────────────────────────────────────────
    const roles = await Rol.bulkCreate([
      { nombre: 'DOCENTE', nivel: 1, descripcion: 'Docente universitario — sube documentos' },
      { nombre: 'DECANO',  nivel: 2, descripcion: 'Decano de facultad — primera firma' },
      { nombre: 'RECTOR',  nivel: 3, descripcion: 'Rector — firma final y aprobación' },
    ], { ignoreDuplicates: true });

    console.log('Roles creados:');
    const rolesDB = await Rol.findAll({ order: [['nivel', 'ASC']] });
    rolesDB.forEach(r => console.log(`  [${r.id}] ${r.nombre} (nivel ${r.nivel})`));

    // ─── Universidad y Facultad ──────────────────────────────────────────
    const [universidad] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad Central del Ecuador' },
      defaults: { descripcion: 'Universidad pública principal' },
    });
    console.log(`\nUniversidad: ${universidad.nombre} (id: ${universidad.id})`);

    const [facultad] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ingeniería' },
      defaults: {
        descripcion: 'Facultad de ingeniería y ciencias aplicadas',
        universidad_id: universidad.id,
      },
    });
    console.log(`Facultad: ${facultad.nombre} (id: ${facultad.id})`);

    // ─── Usuarios ────────────────────────────────────────────────────────
    const usuarios = [
      // Docente y Decano pertenecen a la facultad; Rector es universitario (sin facultad)
      { nombre: 'Juan Docente',   email: 'docente@universidad.edu', password: 'Docente123!',  rol: 'DOCENTE', facultad_id: facultad.id },
      { nombre: 'María Decano',   email: 'decano@universidad.edu',  password: 'Decano123!',   rol: 'DECANO',  facultad_id: facultad.id },
      { nombre: 'Carlos Rector',  email: 'rector@universidad.edu',  password: 'Rector123!',   rol: 'RECTOR',  facultad_id: null },
    ];

    console.log('\nUsuarios creados:');
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
        },
      });
      const estado = creado ? 'CREADO' : 'YA EXISTÍA';
      const fac = u.facultad_id ? `facultad: ${facultad.nombre}` : 'sin facultad (global)';
      console.log(`  [${estado}] ${u.nombre} <${u.email}> — rol: ${u.rol} — ${fac} — password: ${u.password}`);
    }

    console.log('\nSeed completado exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err.message);
    process.exit(1);
  }
}

seed();
