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
  FlujoFirma,
  PasoFirma,
  Documento,
} = require('../Model');

const parametrizacionRoutes = require('../Routes/parametrizacion.routes');
const flujosRoutes = require('../Routes/flujos.routes');
const authService = require('../Services/auth.service');
const workflowService = require('../Services/workflow.service');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/parametrizacion', parametrizacionRoutes);
  app.use('/api/flujos', flujosRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const app = createApp();

describe('Motor de Flujos de Firma - Filtrado de Candidatos Elegibles y Asignación Directa', () => {
  let tokenAdmin;
  let adminUser;
  let facultadA, facultadB;
  let actividadAlpha, actividadBeta;
  let rolDocente, rolDecano;
  let docente1, docente2, docente3;
  let flujoTestId;

  beforeAll(async () => {
    await sequelize.authenticate();

    // 1. Crear Universidad y Facultades
    const [univ] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad Elegibles Test' },
      defaults: { sigla: 'UET', activo: true },
    });

    [facultadA] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad Alfa Elegibles' },
      defaults: { universidad_id: univ.id, activo: true },
    });

    [facultadB] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad Beta Elegibles' },
      defaults: { universidad_id: univ.id, activo: true },
    });

    // 2. Crear Carrera, Periodo, Criterio, Indicador y Actividades
    const [carrera] = await Carrera.findOrCreate({
      where: { nombre: 'Carrera Elegibles Test' },
      defaults: { facultad_id: facultadA.id, activo: true },
    });

    const [periodo] = await Periodo.findOrCreate({
      where: { nombre: 'Periodo 2026-Elegibles' },
      defaults: { carrera_id: carrera.id, activo: true },
    });

    const [criterio] = await Criterio.findOrCreate({
      where: { nombre: 'Criterio Elegibles' },
      defaults: { periodo_id: periodo.id, activo: true },
    });

    const [indicador] = await Indicador.findOrCreate({
      where: { nombre: 'Indicador Elegibles' },
      defaults: { criterio_id: criterio.id, numero: 101, activo: true },
    });

    [actividadAlpha] = await Actividad.findOrCreate({
      where: { nombre: 'Actividad Alpha Elegibles' },
      defaults: { indicador_id: indicador.id, activo: true },
    });

    [actividadBeta] = await Actividad.findOrCreate({
      where: { nombre: 'Actividad Beta Elegibles' },
      defaults: { indicador_id: indicador.id, activo: true },
    });

    // 3. Obtener o crear Roles
    [rolDocente] = await Rol.findOrCreate({
      where: { nombre: 'DOCENTE' },
      defaults: { nivel: 1, activo: true },
    });

    [rolDecano] = await Rol.findOrCreate({
      where: { nombre: 'DECANO' },
      defaults: { nivel: 3, activo: true },
    });

    const [rolAdmin] = await Rol.findOrCreate({
      where: { nombre: 'ADMINISTRADOR' },
      defaults: { nivel: 10, activo: true },
    });

    // 4. Usuario Admin para autenticación
    [adminUser] = await Usuario.findOrCreate({
      where: { email: 'admin.flujos.test@ucacue.edu.ec' },
      defaults: {
        nombre: 'Admin Flujos Test',
        password_hash: '$2b$10$dummyhashforadminflujostest',
        activo: true,
      },
    });
    await adminUser.setRoles([rolAdmin.id]);
    tokenAdmin = authService._generarToken({
      id: adminUser.id,
      email: adminUser.email,
      roles: [{ nombre: 'ADMINISTRADOR', nivel: 10 }],
      carreras: [],
    });

    // 5. Crear 3 docentes con perfiles diferenciados:
    // Docente 1: Facultad Alfa + Actividad Alpha (Rol DOCENTE)
    [docente1] = await Usuario.findOrCreate({
      where: { email: 'docente1.elegible@ucacue.edu.ec' },
      defaults: {
        nombre: 'Docente 1 Alfa Alpha',
        password_hash: '$2b$10$dummyhash',
        activo: true,
      },
    });
    await docente1.setRoles([rolDocente.id]);
    await docente1.setFacultades([facultadA.id]);
    await docente1.setActividades([actividadAlpha.id]);

    // Docente 2: Facultad Beta + Actividad Alpha (Rol DOCENTE)
    [docente2] = await Usuario.findOrCreate({
      where: { email: 'docente2.elegible@ucacue.edu.ec' },
      defaults: {
        nombre: 'Docente 2 Beta Alpha',
        password_hash: '$2b$10$dummyhash',
        activo: true,
      },
    });
    await docente2.setRoles([rolDocente.id]);
    await docente2.setFacultades([facultadB.id]);
    await docente2.setActividades([actividadAlpha.id]);

    // Docente 3: Facultad Alfa + Actividad Beta (Rol DECANO)
    [docente3] = await Usuario.findOrCreate({
      where: { email: 'docente3.elegible@ucacue.edu.ec' },
      defaults: {
        nombre: 'Docente 3 Alfa Beta Decano',
        password_hash: '$2b$10$dummyhash',
        activo: true,
      },
    });
    await docente3.setRoles([rolDecano.id]);
    await docente3.setFacultades([facultadA.id]);
    await docente3.setActividades([actividadBeta.id]);
  });

  afterAll(async () => {
    if (flujoTestId) {
      await PasoFirma.destroy({ where: { flujo_id: flujoTestId } });
      await FlujoFirma.destroy({ where: { id: flujoTestId } });
    }
    await sequelize.close();
  });

  describe('1. Endpoint GET /api/parametrizacion/docentes/elegibles', () => {
    test('Debe retornar todos los docentes activos cuando no se pasan filtros', async () => {
      const res = await request(app)
        .get('/api/parametrizacion/docentes/elegibles')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map(u => u.id);
      expect(ids).toContain(docente1.id);
      expect(ids).toContain(docente2.id);
      expect(ids).toContain(docente3.id);
    });

    test('Debe filtrar docentes pertenecientes a una Facultad específica (facultadId)', async () => {
      const res = await request(app)
        .get(`/api/parametrizacion/docentes/elegibles?facultadId=${facultadA.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      const ids = res.body.map(u => u.id);
      // Docente 1 y Docente 3 están en Facultad Alfa
      expect(ids).toContain(docente1.id);
      expect(ids).toContain(docente3.id);
      // Docente 2 está en Facultad Beta, no debe figurar
      expect(ids).not.toContain(docente2.id);
    });

    test('Debe filtrar docentes asignados a una Actividad específica (actividadId)', async () => {
      const res = await request(app)
        .get(`/api/parametrizacion/docentes/elegibles?actividadId=${actividadAlpha.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      const ids = res.body.map(u => u.id);
      // Docente 1 y Docente 2 tienen Actividad Alpha
      expect(ids).toContain(docente1.id);
      expect(ids).toContain(docente2.id);
      // Docente 3 tiene Actividad Beta, no debe figurar
      expect(ids).not.toContain(docente3.id);
    });

    test('Debe filtrar por intersección estricta de Facultad Y Actividad', async () => {
      const res = await request(app)
        .get(`/api/parametrizacion/docentes/elegibles?facultadId=${facultadA.id}&actividadId=${actividadAlpha.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      const ids = res.body.map(u => u.id);
      // Solo Docente 1 cumple ambos criterios (Facultad Alfa Y Actividad Alpha)
      expect(ids).toContain(docente1.id);
      expect(ids).not.toContain(docente2.id);
      expect(ids).not.toContain(docente3.id);
    });

    test('Debe filtrar por Rol (por nombre o por ID)', async () => {
      const resPorNombre = await request(app)
        .get(`/api/parametrizacion/docentes/elegibles?rol=DECANO`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(resPorNombre.status).toBe(200);
      const ids = resPorNombre.body.map(u => u.id);
      expect(ids).toContain(docente3.id);
      expect(ids).not.toContain(docente1.id);
      expect(ids).not.toContain(docente2.id);

      const resPorId = await request(app)
        .get(`/api/parametrizacion/docentes/elegibles?rolId=${rolDecano.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(resPorId.status).toBe(200);
      const idsPorId = resPorId.body.map(u => u.id);
      expect(idsPorId).toContain(docente3.id);
    });
  });

  describe('2. Configuración de Flujo y Pasos con Asignación de usuario_id', () => {
    test('POST /api/flujos debe crear un flujo con pasos asignando usuario_id específico', async () => {
      const payload = {
        nombre: 'Flujo Test Asignacion Directa',
        es_global: false,
        pasos: [
          { orden: 1, usuario_id: docente1.id }, // Asignado directo
          { orden: 2, rol_id: rolDecano.id },    // Clásico por Rol
        ],
      };

      const res = await request(app)
        .post('/api/flujos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      flujoTestId = res.body.id;

      // Verificar en la base de datos que se guardaron los pasos
      const pasosDB = await PasoFirma.findAll({
        where: { flujo_id: flujoTestId },
        order: [['orden', 'ASC']],
      });

      expect(pasosDB).toHaveLength(2);
      expect(pasosDB[0].usuario_id).toBe(docente1.id);
      expect(pasosDB[0].rol_id).toBe(rolDocente.id); // Derivado automáticamente del usuario
      expect(pasosDB[1].usuario_id).toBeNull();
      expect(pasosDB[1].rol_id).toBe(rolDecano.id);
    });

    test('GET /api/flujos debe retornar los pasos con usuarioFirmante asociado', async () => {
      const res = await request(app)
        .get('/api/flujos')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      const flujo = res.body.find(f => f.id === flujoTestId);
      expect(flujo).toBeDefined();
      expect(flujo.pasos).toHaveLength(2);
      expect(flujo.pasos[0].usuarioFirmante).toBeDefined();
      expect(flujo.pasos[0].usuarioFirmante.nombre).toBe(docente1.nombre);
    });

    test('PUT /api/flujos/:id debe actualizar los pasos soportando objetos con usuario_id', async () => {
      const payloadActualizar = {
        nombre: 'Flujo Test Asignacion Directa Actualizado',
        es_global: false,
        pasos: [
          { orden: 1, usuario_id: docente3.id }, // Cambiado a Docente 3
          { orden: 2, usuario_id: docente2.id }, // Cambiado a Docente 2
        ],
      };

      const res = await request(app)
        .put(`/api/flujos/${flujoTestId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(payloadActualizar);

      expect(res.status).toBe(200);

      const pasosDB = await PasoFirma.findAll({
        where: { flujo_id: flujoTestId },
        order: [['orden', 'ASC']],
      });

      expect(pasosDB).toHaveLength(2);
      expect(pasosDB[0].usuario_id).toBe(docente3.id);
      expect(pasosDB[1].usuario_id).toBe(docente2.id);
    });
  });

  describe('3. Motor de Workflow y Fallback Estricto de Firmantes', () => {
    test('enrutar() debe asignar directamente el firmante cuando el paso tiene usuario_id', async () => {
      // Documento asociado al flujo creado (en paso 1, asignado a docente3)
      const docMock = {
        id: 9991,
        flujo_id: flujoTestId,
        paso_actual: 1,
        facultad_id: facultadA.id,
        actividad_id: actividadBeta.id,
      };

      const resultado = await workflowService.enrutar(docMock);
      expect(resultado).toBeDefined();
      expect(resultado.estadoSiguiente).toBe('EN_REVISION');
      expect(resultado.firmante).toBeDefined();
      expect(resultado.firmante.id).toBe(docente3.id);
      expect(resultado.firmante.nombre).toBe(docente3.nombre);
    });

    test('enrutar() debe ejecutar fallback estricto por rol_id cuando el paso NO tiene usuario_id', async () => {
      // Flujo con paso 1 basado únicamente en rol
      const flujoFallback = await FlujoFirma.create({
        nombre: 'Flujo Fallback Rol',
        es_global: false,
      });

      await PasoFirma.create({
        flujo_id: flujoFallback.id,
        orden: 1,
        rol_id: rolDecano.id,
        usuario_id: null,
      });

      const docMock = {
        id: 9992,
        flujo_id: flujoFallback.id,
        paso_actual: 1,
        facultad_id: facultadA.id, // Docente 3 es Decano en Facultad Alfa
      };

      const resultado = await workflowService.enrutar(docMock);
      expect(resultado).toBeDefined();
      expect(resultado.firmante).toBeDefined();
      // Debe encontrar a docente3 por su rol de Decano y su pertenencia M:N a Facultad Alfa
      expect(resultado.firmante.id).toBe(docente3.id);

      // Limpiar
      await PasoFirma.destroy({ where: { flujo_id: flujoFallback.id } });
      await flujoFallback.destroy();
    });
  });
});
