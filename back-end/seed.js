require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
  sequelize,
  Rol,
  Usuario,
  UsuarioRol,
  UsuarioFacultad,
  UsuarioCarrera,
  UsuarioActividad,
  Universidad,
  Facultad,
  Carrera,
  Periodo,
  Criterio,
  Subcriterio,
  Indicador,
  Carpeta,
  Actividad,
  Documento,
  FlujoFirma,
  PasoFirma,
} = require('./Model');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // ─── 1. Limpiar estructura previa (dejar solo roles y usuarios de prueba) ──
    console.log('Limpiando tablas de estructura y documentos...');
    await Documento.destroy({ where: {}, force: true }).catch(() => {});
    await PasoFirma.destroy({ where: {}, force: true }).catch(() => {});
    await FlujoFirma.destroy({ where: {}, force: true }).catch(() => {});
    await UsuarioActividad.destroy({ where: {}, force: true }).catch(() => {});
    await Actividad.destroy({ where: {}, force: true }).catch(() => {});
    await Carpeta.destroy({ where: {}, force: true }).catch(() => {});
    await sequelize.query('DELETE FROM subcriterios_responsables;').catch(() => {});
    await sequelize.query('DELETE FROM indicadores_responsables;').catch(() => {});
    await sequelize.query('DELETE FROM actividades_usuarios;').catch(() => {});
    await Subcriterio.destroy({ where: {}, force: true }).catch(() => {});
    await Indicador.destroy({ where: {}, force: true }).catch(() => {});
    await Criterio.destroy({ where: {}, force: true }).catch(() => {});
    await Periodo.destroy({ where: {}, force: true }).catch(() => {});
    await UsuarioCarrera.destroy({ where: {}, force: true }).catch(() => {});
    await Carrera.destroy({ where: {}, force: true }).catch(() => {});
    await UsuarioFacultad.destroy({ where: {}, force: true }).catch(() => {});
    await Usuario.update({ facultad_id: null }, { where: {} }).catch(() => {});
    await Facultad.destroy({ where: {}, force: true }).catch(() => {});
    await Universidad.destroy({ where: {}, force: true }).catch(() => {});

    // ─── 2. Roles (7 niveles jerárquicos) ─────────────────────────────────────
    await Rol.bulkCreate([
      { nombre: 'DOCENTE',           nivel: 1, descripcion: 'Docente universitario — sube documentos' },
      { nombre: 'RESPONSABLE_AREA',  nivel: 2, descripcion: 'Responsable de área — sube evidencia en indicadores asignados' },
      { nombre: 'DIRECTOR_CARRERA',  nivel: 3, descripcion: 'Director de carrera — primera firma y revisión' },
      { nombre: 'SUBDECANO',         nivel: 4, descripcion: 'Subdecano — segunda firma y parametrización' },
      { nombre: 'DECANO',            nivel: 5, descripcion: 'Decano de facultad — tercera firma' },
      { nombre: 'RECTOR',            nivel: 6, descripcion: 'Rector — firma final y aprobación' },
      { nombre: 'ADMINISTRADOR',     nivel: 7, descripcion: 'Administrador del sistema — gestión total, no firma' },
    ], { ignoreDuplicates: true });

    const rolesDB = await Rol.findAll({ order: [['nivel', 'ASC']] });
    console.log('Roles verificados:');
    rolesDB.forEach(r => console.log(`  [${r.id}] ${r.nombre} (nivel ${r.nivel})`));

    // ─── 3. Usuarios de prueba (únicamente los 7 usuarios de test) ────────────
    const usuarios = [
      { nombre: 'Administrador Sistema',    email: 'admin@universidad.edu',            password: 'Admin123!',    rol: 'ADMINISTRADOR' },
      { nombre: 'Docente Prueba',           email: 'docente.prueba@ucacue.edu.ec',     password: 'Password123!', rol: 'DOCENTE' },
      { nombre: 'Responsable Área Prueba',  email: 'responsable.prueba@ucacue.edu.ec', password: 'Password123!', rol: 'RESPONSABLE_AREA' },
      { nombre: 'Director Carrera Prueba',  email: 'director.prueba@ucacue.edu.ec',    password: 'Password123!', rol: 'DIRECTOR_CARRERA' },
      { nombre: 'Subdecano Prueba',         email: 'subdecano.prueba@ucacue.edu.ec',   password: 'Password123!', rol: 'SUBDECANO' },
      { nombre: 'Decano Prueba',            email: 'decano.prueba@ucacue.edu.ec',      password: 'Password123!', rol: 'DECANO' },
      { nombre: 'Rector Prueba',            email: 'rector.prueba@ucacue.edu.ec',      password: 'Password123!', rol: 'RECTOR' },
    ];

    const emailsPermitidos = usuarios.map(u => u.email);

    // Eliminar cualquier otro usuario que no sea de los 7 de prueba
    const usuariosExtra = await Usuario.findAll({
      where: { email: { [Op.notIn]: emailsPermitidos } },
    });
    if (usuariosExtra.length > 0) {
      const idsExtra = usuariosExtra.map(u => u.id);
      await UsuarioRol.destroy({ where: { usuario_id: { [Op.in]: idsExtra } } }).catch(() => {});
      await Usuario.destroy({ where: { id: { [Op.in]: idsExtra } }, force: true });
      console.log(`Eliminados ${idsExtra.length} usuario(s) adicionales fuera del set de prueba.`);
    }

    console.log('\nUsuarios de prueba:');
    for (const u of usuarios) {
      const rol = rolesDB.find(r => r.nombre === u.rol);
      const hash = await bcrypt.hash(u.password, 10);
      const [usuario, creado] = await Usuario.findOrCreate({
        where: { email: u.email },
        defaults: {
          nombre: u.nombre,
          password_hash: hash,
          facultad_id: null,
          activo: true,
        },
      });
      if (!creado) {
        await usuario.update({
          nombre: u.nombre,
          password_hash: hash,
          facultad_id: null,
          activo: true,
        });
      }
      if (rol) {
        await usuario.setRoles([rol.id]);
      }
      console.log(`  [${creado ? 'CREADO' : 'ACTUALIZADO'}] ${u.nombre} <${u.email}> — ${u.rol} — password: ${u.password}`);
    }

    console.log('\n══════════════════════════════════════════');
    console.log('Base de datos lista únicamente con los 7 usuarios de prueba.');
    console.log('══════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
