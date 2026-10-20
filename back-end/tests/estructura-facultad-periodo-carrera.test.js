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
  Subcriterio,
  Indicador,
  Actividad,
  Usuario,
  Rol,
} = require('../Model');

const parametrizacionRoutes = require('../Routes/parametrizacion.routes');
const authService = require('../Services/auth.service');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/parametrizacion', parametrizacionRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

jest.setTimeout(30000);

describe('Estructura Jerárquica: Universidad -> Facultad -> Período -> Carrera -> Criterio -> Subcriterio -> Actividad', () => {
  let tokenAdmin;
  let adminUser;
  let universidadTest;
  let facultadTest;
  let carreraSoftware;
  let carreraRVV;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    await sequelize.query('ALTER TABLE periodos ALTER COLUMN carrera_id DROP NOT NULL;').catch(() => {});
    await sequelize.query('ALTER TABLE actividades ALTER COLUMN indicador_id DROP NOT NULL;').catch(() => {});

    // 1. Rol y Usuario Administrador
    const [rolAdmin] = await Rol.findOrCreate({
      where: { nombre: 'ADMINISTRADOR' },
      defaults: { nivel: 7, descripcion: 'Administrador del sistema' },
    });

    [adminUser] = await Usuario.findOrCreate({
      where: { email: 'admin.jerarquia.test@universidad.edu' },
      defaults: {
        nombre: 'Admin Jerarquía Test',
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        activo: true,
      },
    });
    await adminUser.setRoles([rolAdmin]);

    tokenAdmin = authService._generarToken({
      id: adminUser.id,
      email: adminUser.email,
      roles: [{ nombre: 'ADMINISTRADOR', nivel: 7 }],
      carreras: [],
    });

    // 2. Universidad y Facultad
    const ts = Date.now();
    universidadTest = await Universidad.create({
      nombre: `Universidad Jerarquía Test ${ts}`,
      siglas: 'UJT',
      activo: true,
    });

    facultadTest = await Facultad.create({
      nombre: `Facultad de Ingeniería Test ${ts}`,
      universidad_id: universidadTest.id,
      activo: true,
    });

    // 3. Dos Carreras dentro de la misma Facultad: Software y RVV
    carreraSoftware = await Carrera.create({
      nombre: `Ingeniería de Software ${ts}`,
      descripcion: 'Carrera Software',
      facultad_id: facultadTest.id,
      activo: true,
    });

    carreraRVV = await Carrera.create({
      nombre: `Realidad Virtual ${ts}`,
      descripcion: 'Carrera RVV',
      facultad_id: facultadTest.id,
      activo: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('POST /api/parametrizacion/periodos con facultad_id debe crear el período y autogenerar la estructura para Software y RVV', async () => {
    const res = await request(app)
      .post('/api/parametrizacion/periodos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: '2026-I Test',
        facultad_id: facultadTest.id,
        generar_estructura: true,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBe('2026-I Test');
    expect(res.body.facultad_id).toBe(facultadTest.id);

    const periodoId = res.body.id;

    // Verificar que existen 5 criterios para Software y 5 criterios para RVV
    const criteriosSoftware = await Criterio.findAll({
      where: { periodo_id: periodoId, carrera_id: carreraSoftware.id, activo: true },
      order: [['id', 'ASC']],
    });
    const criteriosRVV = await Criterio.findAll({
      where: { periodo_id: periodoId, carrera_id: carreraRVV.id, activo: true },
      order: [['id', 'ASC']],
    });

    expect(criteriosSoftware.length).toBe(5);
    expect(criteriosRVV.length).toBe(5);

    // Los IDs de los criterios de Software deben ser distintos de los de RVV
    const idsSoftware = criteriosSoftware.map(c => c.id);
    const idsRVV = criteriosRVV.map(c => c.id);
    expect(idsSoftware.some(id => idsRVV.includes(id))).toBe(false);

    // Verificar subcriterios (31 en total) para cada carrera
    const subcriteriosSoftware = await Subcriterio.findAll({
      where: { criterio_id: idsSoftware },
    });
    const subcriteriosRVV = await Subcriterio.findAll({
      where: { criterio_id: idsRVV },
    });

    expect(subcriteriosSoftware.length).toBe(31);
    expect(subcriteriosRVV.length).toBe(31);

    // Verificar que también se crearon actividades para los subcriterios
    const subcriterioIdsSoft = subcriteriosSoftware.map(s => s.id);
    const actividadesSoft = await Actividad.findAll({
      where: { subcriterio_id: subcriterioIdsSoft },
    });
    expect(actividadesSoft.length).toBeGreaterThanOrEqual(31);
  });

  test('GET /api/parametrizacion/estructura debe retornar la jerarquía Universidad -> Facultades -> Periodos -> Carreras -> Criterios -> Subcriterios -> Actividades', async () => {
    const res = await request(app)
      .get('/api/parametrizacion/estructura')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const uni = res.body.find(u => u.id === universidadTest.id);
    expect(uni).toBeDefined();
    expect(Array.isArray(uni.facultades)).toBe(true);

    const fac = uni.facultades.find(f => f.id === facultadTest.id);
    expect(fac).toBeDefined();

    // Nivel Períodos cuelga de Facultad
    expect(Array.isArray(fac.periodos)).toBe(true);
    expect(fac.periodos.length).toBeGreaterThanOrEqual(1);

    const per = fac.periodos.find(p => p.nombre === '2026-I Test');
    expect(per).toBeDefined();

    // Dentro del período cuelgan las Carreras
    expect(Array.isArray(per.carreras)).toBe(true);
    const carrSoft = per.carreras.find(c => c.id === carreraSoftware.id);
    const carrRvv = per.carreras.find(c => c.id === carreraRVV.id);

    expect(carrSoft).toBeDefined();
    expect(carrRvv).toBeDefined();

    // Dentro de cada Carrera cuelgan sus Criterios
    expect(Array.isArray(carrSoft.criterios)).toBe(true);
    expect(carrSoft.criterios.length).toBe(5);

    // Dentro de cada Criterio cuelgan los Subcriterios (y su alias indicadores)
    const crit1 = carrSoft.criterios[0];
    expect(Array.isArray(crit1.subcriterios)).toBe(true);
    expect(Array.isArray(crit1.indicadores)).toBe(true);
    expect(crit1.subcriterios.length).toBeGreaterThan(0);

    // Dentro de cada Subcriterio cuelgan las Actividades
    const sub1 = crit1.subcriterios[0];
    expect(Array.isArray(sub1.actividades)).toBe(true);
    expect(sub1.actividades.length).toBeGreaterThan(0);
    expect(sub1.actividades[0]).toHaveProperty('nombre');
  });

  test('CRUD /api/parametrizacion/subcriterios permite listar, crear y asignar responsables', async () => {
    // 1. Listar subcriterios
    const resList = await request(app)
      .get('/api/parametrizacion/subcriterios')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resList.status).toBe(200);
    expect(Array.isArray(resList.body)).toBe(true);

    const sub = resList.body[0];
    expect(sub).toHaveProperty('id');
    expect(sub).toHaveProperty('numero');
    expect(sub).toHaveProperty('nombre');

    // 2. Asignar responsables
    const resResp = await request(app)
      .post(`/api/parametrizacion/subcriterios/${sub.id}/responsables`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ responsablesIds: [adminUser.id] });
    expect(resResp.status).toBe(200);
    expect(resResp.body.mensaje).toContain('correctamente');
  });
});
