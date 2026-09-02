require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const request = require('supertest');
const express = require('express');
const {
  sequelize,
  Universidad,
  Facultad,
  Carrera,
  Periodo,
  Criterio,
  Indicador,
  Actividad,
  Usuario,
  Rol,
  UsuarioFacultad,
  UsuarioActividad,
} = require('../Model');

const parametrizacionRoutes = require('../Routes/parametrizacion.routes');
const authRoutes = require('../Routes/auth.routes');
const authService = require('../Services/auth.service');

// Aplicación Express de prueba
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/parametrizacion', parametrizacionRoutes);
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

describe('Relaciones Sequelize y Endpoints de Docentes (Facultad 1:N Carrera, Docente N:M Facultad, Docente N:M Actividad)', () => {
  let tokenAdmin;
  let adminUser;
  let universidadTest;
  let facultad1, facultad2;
  let carrera1;
  let periodo1, criterio1, indicador1;
  let actividad1, actividad2, actividad3;
  let docenteCreadoId;
  let usuarioAuthId;

  beforeAll(async () => {
    await sequelize.authenticate();

    // 1. Crear o recuperar registros base para las pruebas
    [universidadTest] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad de Prueba Relaciones' },
      defaults: { sigla: 'UPR', activo: true },
    });

    [facultad1] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ingeniería y Tecnología Test' },
      defaults: { universidad_id: universidadTest.id, activo: true },
    });

    [facultad2] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad de Ciencias Médicas Test' },
      defaults: { universidad_id: universidadTest.id, activo: true },
    });

    [carrera1] = await Carrera.findOrCreate({
      where: { nombre: 'Ingeniería de Software Test' },
      defaults: { facultad_id: facultad1.id, activo: true },
    });

    [periodo1] = await Periodo.findOrCreate({
      where: { nombre: '2026-Test' },
      defaults: { carrera_id: carrera1.id, activo: true },
    });

    [criterio1] = await Criterio.findOrCreate({
      where: { nombre: 'Docencia Test' },
      defaults: { periodo_id: periodo1.id, activo: true },
    });

    [indicador1] = await Indicador.findOrCreate({
      where: { nombre: 'Planificación Académica Test' },
      defaults: { criterio_id: criterio1.id, numero: 99, activo: true },
    });

    [actividad1] = await Actividad.findOrCreate({
      where: { nombre: 'Diseño Curricular y Sílabos' },
      defaults: { indicador_id: indicador1.id, activo: true },
    });

    [actividad2] = await Actividad.findOrCreate({
      where: { nombre: 'Evaluación y Acreditación de Carrera' },
      defaults: { indicador_id: indicador1.id, activo: true },
    });

    [actividad3] = await Actividad.findOrCreate({
      where: { nombre: 'Tutorías y Seguimiento Estudiantil' },
      defaults: { indicador_id: indicador1.id, activo: true },
    });

    // 2. Crear usuario Administrador y generar token
    const [rolAdmin] = await Rol.findOrCreate({
      where: { nombre: 'ADMINISTRADOR' },
      defaults: { nivel: 7, descripcion: 'Administrador del sistema' },
    });

    [adminUser] = await Usuario.findOrCreate({
      where: { email: 'admin_test_relaciones@ucacue.edu.ec' },
      defaults: {
        nombre: 'Admin Test Relaciones',
        password_hash: 'hashedpassword',
        activo: true,
      },
    });
    await adminUser.setRoles([rolAdmin.id]);

    tokenAdmin = authService._generarToken({
      id: adminUser.id,
      email: adminUser.email,
      roles: [{ nombre: 'ADMINISTRADOR', nivel: 7 }],
      carreras: [],
    });
  });

  afterAll(async () => {
    // Limpieza de registros creados en la prueba
    if (docenteCreadoId) {
      await UsuarioFacultad.destroy({ where: { usuario_id: docenteCreadoId } });
      await UsuarioActividad.destroy({ where: { usuario_id: docenteCreadoId } });
      await Usuario.destroy({ where: { id: docenteCreadoId } });
    }
    if (usuarioAuthId) {
      await UsuarioFacultad.destroy({ where: { usuario_id: usuarioAuthId } });
      await UsuarioActividad.destroy({ where: { usuario_id: usuarioAuthId } });
      await Usuario.destroy({ where: { id: usuarioAuthId } });
    }
    await sequelize.close();
  });

  // ─── 1. Relación 1:N Facultad ↔ Carrera ──────────────────────────────────
  describe('1. Relación Facultad ↔ Carrera (1:N)', () => {
    it('debe confirmar que una Facultad tiene muchas Carreras y Carrera pertenece a Facultad', async () => {
      const carreraConFacultad = await Carrera.findByPk(carrera1.id, {
        include: [{ model: Facultad, as: 'facultad' }],
      });

      expect(carreraConFacultad).toBeDefined();
      expect(carreraConFacultad.facultad_id).toBe(facultad1.id);
      expect(carreraConFacultad.facultad).toBeDefined();
      expect(carreraConFacultad.facultad.id).toBe(facultad1.id);

      const facultadConCarreras = await Facultad.findByPk(facultad1.id, {
        include: [{ model: Carrera, as: 'carreras' }],
      });

      expect(facultadConCarreras).toBeDefined();
      expect(Array.isArray(facultadConCarreras.carreras)).toBe(true);
      const idsCarreras = facultadConCarreras.carreras.map(c => c.id);
      expect(idsCarreras).toContain(carrera1.id);
    });
  });

  // ─── 2. POST /api/parametrizacion/docentes ───────────────────────────────
  describe('2. POST /api/parametrizacion/docentes', () => {
    it('debe crear un docente exitosamente enviando arreglos de IDs de facultades y actividades', async () => {
      const payload = {
        nombre: 'Dr. Fernando Morales',
        email: `fmorales_${Date.now()}@test.com`,
        password: 'Password123!',
        facultades: [facultad1.id, facultad2.id],
        actividades: [actividad1.id, actividad2.id],
      };

      const res = await request(app)
        .post('/api/parametrizacion/docentes')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.nombre).toBe(payload.nombre);
      expect(res.body.email).toBe(payload.email);
      expect(res.body).not.toHaveProperty('password_hash');

      // Validar que los nodos anidados facultades y actividades vengan en la respuesta
      expect(Array.isArray(res.body.facultades)).toBe(true);
      expect(res.body.facultades.length).toBe(2);
      const facultadesIds = res.body.facultades.map(f => f.id);
      expect(facultadesIds).toContain(facultad1.id);
      expect(facultadesIds).toContain(facultad2.id);

      expect(Array.isArray(res.body.actividades)).toBe(true);
      expect(res.body.actividades.length).toBe(2);
      const actividadesIds = res.body.actividades.map(a => a.id);
      expect(actividadesIds).toContain(actividad1.id);
      expect(actividadesIds).toContain(actividad2.id);

      docenteCreadoId = res.body.id;

      // Verificar persistencia real en las tablas intermedias de la base de datos
      const asignacionesFac = await UsuarioFacultad.findAll({
        where: { usuario_id: docenteCreadoId },
      });
      expect(asignacionesFac.length).toBe(2);

      const asignacionesAct = await UsuarioActividad.findAll({
        where: { usuario_id: docenteCreadoId },
      });
      expect(asignacionesAct.length).toBe(2);
    });

    it('debe retornar 400 si faltan campos obligatorios (nombre o email)', async () => {
      const res = await request(app)
        .post('/api/parametrizacion/docentes')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ password: '123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });
  });

  // ─── 3. GET /api/parametrizacion/docentes/:id ────────────────────────────
  describe('3. GET /api/parametrizacion/docentes/:id', () => {
    it('debe retornar la estructura anidada con facultades y actividades asignadas', async () => {
      const res = await request(app)
        .get(`/api/parametrizacion/docentes/${docenteCreadoId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(docenteCreadoId);
      expect(res.body.nombre).toBe('Dr. Fernando Morales');

      // Validar estructura anidada de facultades
      expect(Array.isArray(res.body.facultades)).toBe(true);
      expect(res.body.facultades.length).toBe(2);
      const facultadesIds = res.body.facultades.map(f => f.id);
      expect(facultadesIds).toContain(facultad1.id);
      expect(facultadesIds).toContain(facultad2.id);

      // Validar estructura anidada de actividades
      expect(Array.isArray(res.body.actividades)).toBe(true);
      expect(res.body.actividades.length).toBe(2);
      const actividadesIds = res.body.actividades.map(a => a.id);
      expect(actividadesIds).toContain(actividad1.id);
      expect(actividadesIds).toContain(actividad2.id);
    });

    it('debe retornar 404 si el docente no existe', async () => {
      const res = await request(app)
        .get('/api/parametrizacion/docentes/999999')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Docente no encontrado');
    });
  });

  // ─── 4. GET /api/parametrizacion/docentes (Listar) ───────────────────────
  describe('4. GET /api/parametrizacion/docentes', () => {
    it('debe listar docentes incluyendo las relaciones anidadas facultades y actividades', async () => {
      const res = await request(app)
        .get('/api/parametrizacion/docentes')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const docenteEncontrado = res.body.find(d => d.id === docenteCreadoId);
      expect(docenteEncontrado).toBeDefined();
      expect(Array.isArray(docenteEncontrado.facultades)).toBe(true);
      expect(Array.isArray(docenteEncontrado.actividades)).toBe(true);
      expect(docenteEncontrado.facultades.length).toBe(2);
      expect(docenteEncontrado.actividades.length).toBe(2);
    });
  });

  // ─── 5. PUT /api/parametrizacion/docentes/:id (Actualizar) ───────────────
  describe('5. PUT /api/parametrizacion/docentes/:id', () => {
    it('debe actualizar campos escalares y reasignar facultades y actividades atómicamente', async () => {
      const updatePayload = {
        nombre: 'Dr. Fernando Morales Actualizado',
        facultades: [facultad1.id],             // reduce a 1 facultad
        actividades: [actividad2.id, actividad3.id], // cambia actividades
      };

      const res = await request(app)
        .put(`/api/parametrizacion/docentes/${docenteCreadoId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(docenteCreadoId);
      expect(res.body.nombre).toBe(updatePayload.nombre);

      // Verificar nuevas asignaciones en la respuesta
      expect(res.body.facultades.length).toBe(1);
      expect(res.body.facultades[0].id).toBe(facultad1.id);

      expect(res.body.actividades.length).toBe(2);
      const nuevasActividades = res.body.actividades.map(a => a.id);
      expect(nuevasActividades).toContain(actividad2.id);
      expect(nuevasActividades).toContain(actividad3.id);
      expect(nuevasActividades).not.toContain(actividad1.id);

      // Verificar en base de datos
      const facEnBD = await UsuarioFacultad.findAll({ where: { usuario_id: docenteCreadoId } });
      expect(facEnBD.length).toBe(1);
      expect(facEnBD[0].facultad_id).toBe(facultad1.id);

      const actEnBD = await UsuarioActividad.findAll({ where: { usuario_id: docenteCreadoId } });
      expect(actEnBD.length).toBe(2);
    });
  });

  // ─── 6. Endpoints de Auth con Facultades y Actividades ────────────────────
  describe('6. Integración en /api/auth/registrar y /api/auth/usuarios/:id', () => {
    it('POST /api/auth/registrar debe aceptar facultades y actividades y GET /api/auth/usuarios/:id devolverlas', async () => {
      const [rolDocente] = await Rol.findOrCreate({
        where: { nombre: 'DOCENTE' },
        defaults: { nivel: 2, descripcion: 'Docente universitario' },
      });

      const nuevoUsuarioData = {
        nombre: 'Prof. Gabriela Torres',
        email: `gtorres_${Date.now()}@test.com`,
        password: 'PasswordSegura123!',
        roles: [rolDocente.id],
        facultades: [facultad2.id],
        actividades: [actividad1.id, actividad3.id],
      };

      const resPost = await request(app)
        .post('/api/auth/registrar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(nuevoUsuarioData);

      expect(resPost.status).toBe(201);
      expect(resPost.body).toHaveProperty('id');
      usuarioAuthId = resPost.body.id;

      // Consultar usuario por ID
      const resGet = await request(app)
        .get(`/api/auth/usuarios/${usuarioAuthId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.id).toBe(usuarioAuthId);
      expect(Array.isArray(resGet.body.facultades)).toBe(true);
      expect(resGet.body.facultades.length).toBe(1);
      expect(resGet.body.facultades[0].id).toBe(facultad2.id);

      expect(Array.isArray(resGet.body.actividades)).toBe(true);
      expect(resGet.body.actividades.length).toBe(2);
      const actIds = resGet.body.actividades.map(a => a.id);
      expect(actIds).toContain(actividad1.id);
      expect(actIds).toContain(actividad3.id);
    });
  });
});
