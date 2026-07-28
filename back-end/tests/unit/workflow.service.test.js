const mockDocumento = {
  findByPk: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockUsuario = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
};

const mockRol = {
  findOne: jest.fn(),
};

jest.mock('../../Model', () => ({
  Documento: mockDocumento,
  Usuario: mockUsuario,
  Rol: mockRol,
}));

const workflowService = require('../../Services/workflow.service');

describe('WorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── enrutar ────────────────────────────────────────────────────────────
  describe('enrutar', () => {
    it('debe enrutar PENDIENTE a DIRECTOR_CARRERA con estado FIRMADO_DIRECTOR', async () => {
      const director = { id: 2, nombre: 'Director Test', rol_id: 2 };
      mockRol.findOne.mockResolvedValue({ id: 2, nombre: 'DIRECTOR_CARRERA', nivel: 4 });
      mockUsuario.findOne.mockResolvedValue(director);

      const doc = { id: 1, estado: 'PENDIENTE', facultad_id: 1 };
      const resultado = await workflowService.enrutar(doc);

      expect(mockRol.findOne).toHaveBeenCalledWith({ where: { nombre: 'DIRECTOR_CARRERA' } });
      expect(mockUsuario.findOne).toHaveBeenCalled();
      expect(resultado).toEqual({
        firmante: director,
        estadoSiguiente: 'FIRMADO_DIRECTOR',
        timestampField: 'firmado_director_en',
      });
    });

    it('debe enrutar FIRMADO_DECANO a RECTOR con estado COMPLETADO', async () => {
      const rector = { id: 3, nombre: 'Rector Test', rol_id: 3 };
      mockRol.findOne.mockResolvedValue({ id: 3, nombre: 'RECTOR', nivel: 2 });
      mockUsuario.findOne.mockResolvedValue(rector);

      const doc = { id: 1, estado: 'FIRMADO_DECANO', facultad_id: 1 };
      const resultado = await workflowService.enrutar(doc);

      expect(mockRol.findOne).toHaveBeenCalledWith({ where: { nombre: 'RECTOR' } });
      expect(resultado).toEqual({
        firmante: rector,
        estadoSiguiente: 'COMPLETADO',
        timestampField: 'firmado_rector_en',
      });
    });

    it('debe retornar null para estado COMPLETADO', async () => {
      const doc = { id: 1, estado: 'COMPLETADO' };
      const resultado = await workflowService.enrutar(doc);
      expect(resultado).toBeNull();
    });

    it('debe retornar null para estado RECHAZADO', async () => {
      const doc = { id: 1, estado: 'RECHAZADO' };
      const resultado = await workflowService.enrutar(doc);
      expect(resultado).toBeNull();
    });

    it('debe lanzar error si el rol siguiente no existe en BD', async () => {
      mockRol.findOne.mockResolvedValue(null);
      const doc = { id: 1, estado: 'PENDIENTE' };

      await expect(workflowService.enrutar(doc)).rejects.toThrow(
        'Rol DIRECTOR_CARRERA no existe en BD'
      );
    });
  });

  // ─── procesarFirma ──────────────────────────────────────────────────────
  describe('procesarFirma', () => {
    const rector = { id: 3, nombre: 'Rector' };

    beforeEach(() => {
      mockRol.findOne.mockResolvedValue({ id: 3, nombre: 'RECTOR', nivel: 3 });
      mockUsuario.findOne.mockResolvedValue(rector);
    });

    it('debe procesar firma de DIRECTOR_CARRERA exitosamente (PENDIENTE -> FIRMADO_DIRECTOR)', async () => {
      const documento = {
        id: 1,
        estado: 'PENDIENTE',
        facultad_id: 1,
        firmante_actual_id: 2,
        subido_por_id: 1,
        toJSON: function () { return { ...this }; },
        reload: jest.fn().mockResolvedValue({
          id: 1,
          estado: 'FIRMADO_DIRECTOR',
          toJSON: function () { return { ...this }; },
        }),
        update: jest.fn().mockResolvedValue(true),
      };

      mockDocumento.findByPk.mockResolvedValue(documento);
      // Cuando busca al siguiente firmante (SUBDECANO)
      mockRol.findOne.mockResolvedValue({ id: 3, nombre: 'SUBDECANO' });
      mockUsuario.findOne.mockResolvedValue({ id: 3, nombre: 'Subdecano Test' });

      await workflowService.procesarFirma(1, { id: 2 }, null);

      expect(mockDocumento.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(documento.update).toHaveBeenCalled();
    });

    it('debe procesar firma de RECTOR exitosamente (FIRMADO_DECANO -> COMPLETADO)', async () => {
      const documento = {
        id: 1,
        estado: 'FIRMADO_DECANO',
        facultad_id: 1,
        firmante_actual_id: 3,
        subido_por_id: 1,
        toJSON: function () { return { ...this }; },
        reload: jest.fn().mockResolvedValue({
          id: 1,
          estado: 'COMPLETADO',
          firmante_actual_id: null,
          toJSON: function () { return { ...this }; },
        }),
        update: jest.fn().mockResolvedValue(true),
      };

      mockDocumento.findByPk.mockResolvedValue(documento);

      const resultado = await workflowService.procesarFirma(1, { id: 3 }, 'Aprobado final');

      expect(documento.update).toHaveBeenCalled();
      expect(resultado.estado).toBe('COMPLETADO');
    });

    it('debe lanzar error si el documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);

      await expect(workflowService.procesarFirma(99, { id: 2 }, null)).rejects.toThrow(
        'Documento no encontrado'
      );
    });

    it('debe lanzar error si el documento ya está COMPLETADO', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, estado: 'COMPLETADO', firmante_actual_id: null,
        toJSON: function () { return { ...this }; },
        reload: jest.fn(), update: jest.fn(),
      });

      await expect(workflowService.procesarFirma(1, { id: 2 }, null)).rejects.toThrow(
        'El documento ya está completado'
      );
    });

    it('debe lanzar error si el documento fue RECHAZADO', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, estado: 'RECHAZADO', firmante_actual_id: 2,
        toJSON: function () { return { ...this }; },
        reload: jest.fn(), update: jest.fn(),
      });

      await expect(workflowService.procesarFirma(1, { id: 2 }, null)).rejects.toThrow(
        'El documento fue rechazado'
      );
    });

    it('debe lanzar error si quien firma no es el firmante asignado', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, estado: 'PENDIENTE', firmante_actual_id: 2,
        toJSON: function () { return { ...this }; },
        reload: jest.fn(), update: jest.fn(),
      });

      await expect(workflowService.procesarFirma(1, { id: 3 }, null)).rejects.toThrow(
        'No tiene autorización para firmar este documento en esta etapa'
      );
    });
  });

  // ─── rechazar ───────────────────────────────────────────────────────────
  describe('rechazar', () => {
    it('debe rechazar un documento exitosamente', async () => {
      const doc = {
        id: 1, estado: 'PENDIENTE', firmante_actual_id: 2,
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({
          id: 1, estado: 'RECHAZADO', observaciones: 'Documento inválido', firmante_actual_id: null,
          toJSON: function () { return { ...this }; },
        }),
      };
      mockDocumento.findByPk.mockResolvedValue(doc);

      const resultado = await workflowService.rechazar(1, { id: 2 }, 'Documento inválido');

      expect(doc.update).toHaveBeenCalledWith({
        estado: 'RECHAZADO',
        observaciones: 'Documento inválido',
        firmante_actual_id: null,
      });
      expect(resultado.estado).toBe('RECHAZADO');
    });

    it('debe lanzar error si el documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);
      await expect(workflowService.rechazar(99, { id: 2 }, 'Motivo')).rejects.toThrow(
        'Documento no encontrado'
      );
    });

    it('debe lanzar error si no es el firmante asignado', async () => {
      mockDocumento.findByPk.mockResolvedValue({
        id: 1, estado: 'PENDIENTE', firmante_actual_id: 2,
      });

      await expect(workflowService.rechazar(1, { id: 3 }, 'Motivo')).rejects.toThrow(
        'No tiene autorización para rechazar este documento'
      );
    });
  });

  // ─── asignarFirmanteInicial ─────────────────────────────────────────────
  describe('asignarFirmanteInicial', () => {
    it('debe asignar un DIRECTOR_CARRERA como primer firmante', async () => {
      const director = { id: 2, nombre: 'Director Test' };
      mockRol.findOne.mockResolvedValue({ id: 2, nombre: 'DIRECTOR_CARRERA', nivel: 4 });
      mockUsuario.findOne.mockResolvedValue(director);

      const doc = { id: 1, facultad_id: 1, update: jest.fn().mockResolvedValue(true) };

      const resultado = await workflowService.asignarFirmanteInicial(doc);

      expect(mockRol.findOne).toHaveBeenCalledWith({ where: { nombre: 'DIRECTOR_CARRERA' } });
      expect(doc.update).toHaveBeenCalledWith({ firmante_actual_id: director.id });
      expect(resultado).toEqual(director);
    });

    it('debe lanzar error si no existe rol DIRECTOR_CARRERA', async () => {
      mockRol.findOne.mockResolvedValue(null);
      await expect(workflowService.asignarFirmanteInicial({ id: 1 })).rejects.toThrow(
        'Rol DIRECTOR_CARRERA no configurado'
      );
    });

    it('debe lanzar error si no hay DIRECTOR_CARRERA registrado', async () => {
      mockRol.findOne.mockResolvedValue({ id: 2, nombre: 'DIRECTOR_CARRERA', nivel: 4 });
      mockUsuario.findOne.mockResolvedValue(null);

      await expect(workflowService.asignarFirmanteInicial({ id: 1, facultad_id: 1 })).rejects.toThrow(
        'No hay ningún Director de Carrera registrado en el sistema'
      );
    });
  });

  // ─── _buscarFirmante ────────────────────────────────────────────────────
  describe('_buscarFirmante', () => {
    it('debe buscar firmante con facultad_id primero', async () => {
      const firmante = { id: 2, nombre: 'Decano Facultad' };
      mockUsuario.findOne.mockResolvedValue(firmante);

      const resultado = await workflowService._buscarFirmante(2, 1);

      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { rol_id: 2, facultad_id: 1, activo: true },
        include: [{ model: mockRol, as: 'rol' }],
      });
      expect(resultado).toEqual(firmante);
    });

    it('debe hacer fallback a cualquier usuario del rol si no hay con facultad', async () => {
      mockUsuario.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5, nombre: 'Decano Global' });

      const resultado = await workflowService._buscarFirmante(2, 1);

      expect(mockUsuario.findOne).toHaveBeenCalledTimes(2);
      expect(resultado.nombre).toBe('Decano Global');
    });

    it('debe buscar sin filtro de facultad si facultad_id es null', async () => {
      const firmante = { id: 3, nombre: 'Rector' };
      mockUsuario.findOne.mockResolvedValue(firmante);

      const resultado = await workflowService._buscarFirmante(3, null);

      expect(mockUsuario.findOne).toHaveBeenCalledTimes(1);
      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { rol_id: 3, activo: true },
        include: [{ model: mockRol, as: 'rol' }],
      });
      expect(resultado).toEqual(firmante);
    });
  });
});
