require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
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

const workflowService = require('../Services/workflow.service');

describe('E2E Workflow 4 Firmantes (Director -> Subdecano -> Decano -> Rector)', () => {
  let univ, facultad, carrera, periodo, criterio, indicador, actividad;
  let rolDocente, rolDirector, rolSubdecano, rolDecano, rolRector;
  let docente, director, subdecano, decano, rector;
  let flujo4Etapas;
  let documentoPrueba;

  beforeAll(async () => {
    await sequelize.authenticate();

    // 1. Estructura base
    [univ] = await Universidad.findOrCreate({
      where: { nombre: 'Universidad 4 Firmantes E2E' },
      defaults: { sigla: 'U4F', activo: true },
    });

    [facultad] = await Facultad.findOrCreate({
      where: { nombre: 'Facultad 4 Firmantes E2E' },
      defaults: { universidad_id: univ.id, activo: true },
    });

    [carrera] = await Carrera.findOrCreate({
      where: { nombre: 'Carrera 4 Firmantes E2E' },
      defaults: { facultad_id: facultad.id, activo: true },
    });

    [periodo] = await Periodo.findOrCreate({
      where: { nombre: 'Periodo 2026-4F' },
      defaults: { carrera_id: carrera.id, activo: true },
    });

    [criterio] = await Criterio.findOrCreate({
      where: { nombre: 'Criterio 4 Firmantes' },
      defaults: { periodo_id: periodo.id, activo: true },
    });

    [indicador] = await Indicador.findOrCreate({
      where: { nombre: 'Indicador 4 Firmantes' },
      defaults: { criterio_id: criterio.id, numero: 201, activo: true },
    });

    [actividad] = await Actividad.findOrCreate({
      where: { nombre: 'Actividad 4 Firmantes' },
      defaults: { indicador_id: indicador.id, activo: true },
    });

    // 2. Roles
    [rolDocente] = await Rol.findOrCreate({
      where: { nombre: 'DOCENTE' },
      defaults: { nivel: 1, activo: true },
    });

    [rolDirector] = await Rol.findOrCreate({
      where: { nombre: 'DIRECTOR_CARRERA' },
      defaults: { nivel: 2, activo: true },
    });

    [rolSubdecano] = await Rol.findOrCreate({
      where: { nombre: 'SUBDECANO' },
      defaults: { nivel: 3, activo: true },
    });

    [rolDecano] = await Rol.findOrCreate({
      where: { nombre: 'DECANO' },
      defaults: { nivel: 4, activo: true },
    });

    [rolRector] = await Rol.findOrCreate({
      where: { nombre: 'RECTOR' },
      defaults: { nivel: 5, activo: true },
    });

    // 3. Usuarios para cada rol
    [docente] = await Usuario.findOrCreate({
      where: { email: 'docente.4f@ucacue.edu.ec' },
      defaults: { nombre: 'Docente Solicitante', password_hash: '$2b$10$hashdummy', activo: true },
    });
    await docente.setRoles([rolDocente.id]);
    await docente.setFacultades([facultad.id]);

    [director] = await Usuario.findOrCreate({
      where: { email: 'director.4f@ucacue.edu.ec' },
      defaults: { nombre: 'Director Carrera Titular', password_hash: '$2b$10$hashdummy', activo: true },
    });
    await director.setRoles([rolDirector.id]);
    await director.setFacultades([facultad.id]);

    [subdecano] = await Usuario.findOrCreate({
      where: { email: 'subdecano.4f@ucacue.edu.ec' },
      defaults: { nombre: 'Subdecano Titular', password_hash: '$2b$10$hashdummy', activo: true },
    });
    await subdecano.setRoles([rolSubdecano.id]);
    await subdecano.setFacultades([facultad.id]);

    [decano] = await Usuario.findOrCreate({
      where: { email: 'decano.4f@ucacue.edu.ec' },
      defaults: { nombre: 'Decano Titular', password_hash: '$2b$10$hashdummy', activo: true },
    });
    await decano.setRoles([rolDecano.id]);
    await decano.setFacultades([facultad.id]);

    [rector] = await Usuario.findOrCreate({
      where: { email: 'rector.4f@ucacue.edu.ec' },
      defaults: { nombre: 'Rector Titular', password_hash: '$2b$10$hashdummy', activo: true },
    });
    await rector.setRoles([rolRector.id]);
    await rector.setFacultades([facultad.id]);

    // 4. Crear Flujo de 4 Pasos
    flujo4Etapas = await FlujoFirma.create({
      nombre: 'Flujo Institucional Completo (4 Etapas)',
      es_global: false,
    });

    await PasoFirma.bulkCreate([
      { flujo_id: flujo4Etapas.id, orden: 1, rol_id: rolDirector.id, usuario_id: director.id },
      { flujo_id: flujo4Etapas.id, orden: 2, rol_id: rolSubdecano.id, usuario_id: subdecano.id },
      { flujo_id: flujo4Etapas.id, orden: 3, rol_id: rolDecano.id, usuario_id: decano.id },
      { flujo_id: flujo4Etapas.id, orden: 4, rol_id: rolRector.id, usuario_id: rector.id },
    ]);
  });

  afterAll(async () => {
    if (flujo4Etapas) {
      await PasoFirma.destroy({ where: { flujo_id: flujo4Etapas.id } });
      await Documento.destroy({ where: { flujo_id: flujo4Etapas.id } });
      await FlujoFirma.destroy({ where: { id: flujo4Etapas.id } });
    }
    await sequelize.close();
  });

  describe('1. Inicialización y asignación del Paso 1 (Director)', () => {
    test('Creación del documento y asignación del primer firmante', async () => {
      documentoPrueba = await Documento.create({
        nombre_original: 'informe_acreditacion_completo.pdf',
        ruta_archivo: 'uploads/fake_doc.pdf',
        estado: 'PENDIENTE',
        subido_por_id: docente.id,
        facultad_id: facultad.id,
        actividad_id: actividad.id,
        flujo_id: flujo4Etapas.id,
        paso_actual: 1,
      });

      const firmanteInicial = await workflowService.asignarFirmanteInicial(documentoPrueba);
      expect(firmanteInicial).toBeDefined();
      expect(firmanteInicial.id).toBe(director.id);

      await documentoPrueba.reload();
      expect(documentoPrueba.firmante_actual_id).toBe(director.id);
      expect(documentoPrueba.paso_actual).toBe(1);
      expect(documentoPrueba.estado).toBe('PENDIENTE');
    });

    test('Seguridad: Cualquier usuario distinto al Director no puede firmar en la etapa 1', async () => {
      // Subdecano intenta firmar antes de tiempo
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, subdecano, 'Intento no autorizado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);

      // Decano intenta firmar antes de tiempo
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, decano, 'Intento no autorizado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);

      // Rector intenta firmar antes de tiempo
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, rector, 'Intento no autorizado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);

      // Docente que subió intenta firmar
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, docente, 'Intento no autorizado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);
    });
  });

  describe('2. Transición Etapa 1 -> Etapa 2 (Director -> Subdecano)', () => {
    test('Director de Carrera firma exitosamente', async () => {
      const docActualizado = await workflowService.procesarFirma(
        documentoPrueba.id,
        director,
        'Aprobado por Dirección de Carrera'
      );

      expect(docActualizado.paso_actual).toBe(2);
      expect(docActualizado.estado).toBe('EN_REVISION');
      expect(docActualizado.firmante_actual_id).toBe(subdecano.id);
    });

    test('Seguridad: Ni Director ni Decano ni Rector pueden firmar en la etapa 2', async () => {
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, director, 'Intento repetido')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);

      await expect(
        workflowService.procesarFirma(documentoPrueba.id, decano, 'Intento adelantado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);
    });
  });

  describe('3. Transición Etapa 2 -> Etapa 3 (Subdecano -> Decano)', () => {
    test('Subdecano firma exitosamente', async () => {
      const docActualizado = await workflowService.procesarFirma(
        documentoPrueba.id,
        subdecano,
        'Aprobado por Subdecanato'
      );

      expect(docActualizado.paso_actual).toBe(3);
      expect(docActualizado.estado).toBe('EN_REVISION');
      expect(docActualizado.firmante_actual_id).toBe(decano.id);
    });

    test('Seguridad: Ni Subdecano ni Rector pueden firmar en la etapa 3', async () => {
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, subdecano, 'Intento repetido')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);

      await expect(
        workflowService.procesarFirma(documentoPrueba.id, rector, 'Intento adelantado')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);
    });
  });

  describe('4. Transición Etapa 3 -> Etapa 4 (Decano -> Rector)', () => {
    test('Decano firma exitosamente', async () => {
      const docActualizado = await workflowService.procesarFirma(
        documentoPrueba.id,
        decano,
        'Aprobado por Decanato de Facultad'
      );

      expect(docActualizado.paso_actual).toBe(4);
      expect(docActualizado.estado).toBe('EN_REVISION');
      expect(docActualizado.firmante_actual_id).toBe(rector.id);
    });

    test('Seguridad: Ni Decano ni Director pueden firmar en la etapa 4', async () => {
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, decano, 'Intento repetido')
      ).rejects.toThrow(/No tiene autorización para firmar este documento/);
    });
  });

  describe('5. Transición Etapa 4 -> COMPLETADO (Rector)', () => {
    test('Rector firma exitosamente y el documento queda COMPLETADO', async () => {
      const docActualizado = await workflowService.procesarFirma(
        documentoPrueba.id,
        rector,
        'Firma de Aprobación Institucional de Rectorado'
      );

      expect(docActualizado.paso_actual).toBe(5);
      expect(docActualizado.estado).toBe('COMPLETADO');
      expect(docActualizado.firmante_actual_id).toBeNull();
    });

    test('Seguridad: No se puede volver a firmar un documento en estado COMPLETADO', async () => {
      await expect(
        workflowService.procesarFirma(documentoPrueba.id, rector, 'Intento post-completado')
      ).rejects.toThrow('El documento ya está completado');
    });
  });

  describe('6. Flujo alternativo: Rechazo en etapa intermedia', () => {
    test('Un firmante asignado puede rechazar el documento', async () => {
      const docParaRechazar = await Documento.create({
        nombre_original: 'documento_para_rechazar.pdf',
        ruta_archivo: 'uploads/fake_rechazo.pdf',
        estado: 'PENDIENTE',
        subido_por_id: docente.id,
        facultad_id: facultad.id,
        actividad_id: actividad.id,
        flujo_id: flujo4Etapas.id,
        paso_actual: 1,
      });

      await workflowService.asignarFirmanteInicial(docParaRechazar);

      // Director firma etapa 1
      await workflowService.procesarFirma(docParaRechazar.id, director, 'Pasa a subdecano');

      // Subdecano (firmante asignado en etapa 2) lo rechaza
      const docRechazado = await workflowService.rechazar(
        docParaRechazar.id,
        subdecano,
        'Documentación incompleta en anexos'
      );

      expect(docRechazado.estado).toBe('RECHAZADO');
      expect(docRechazado.observaciones).toBe('Documentación incompleta en anexos');
      expect(docRechazado.firmante_actual_id).toBeNull();

      // No se puede firmar un documento rechazado
      await expect(
        workflowService.procesarFirma(docParaRechazar.id, subdecano, 'Intento sobre rechazado')
      ).rejects.toThrow('El documento fue rechazado');

      await docParaRechazar.destroy();
    });
  });
});
