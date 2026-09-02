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

const mockFlujoFirma = {
  findByPk: jest.fn(),
  findOne: jest.fn(),
};

const mockPasoFirma = {};
const mockCriterio = {};
const mockIndicador = {};
const mockActividad = {
  findByPk: jest.fn(),
};
const mockFacultad = {};

jest.mock('../../Model', () => ({
  Documento: mockDocumento,
  Usuario: mockUsuario,
  Rol: mockRol,
  FlujoFirma: mockFlujoFirma,
  PasoFirma: mockPasoFirma,
  Criterio: mockCriterio,
  Indicador: mockIndicador,
  Actividad: mockActividad,
  Facultad: mockFacultad,
}));

const workflowService = require('../../Services/workflow.service');

describe('WorkflowService (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── enrutar ────────────────────────────────────────────────────────────
  describe('enrutar', () => {
    it('debe enrutar paso 1 a DIRECTOR_CARRERA con estado EN_REVISION', async () => {
      const director = { id: 2, nombre: 'Director Test' };
      mockFlujoFirma.findByPk.mockResolvedValue({
        id: 1,
        pasos: [
          { orden: 1, rol_id: 2, rolRequerido: { id: 2, nombre: 'DIRECTOR_CARRERA' }, usuario_id: null },
          { orden: 2, rol_id: 3, rolRequerido: { id: 3, nombre: 'SUBDECANO' }, usuario_id: null },
        ],
      });
      mockUsuario.findOne.mockResolvedValue(director);

      const doc = { id: 1, flujo_id: 1, paso_actual: 1, facultad_id: 1 };
      const resultado = await workflowService.enrutar(doc);

      expect(mockFlujoFirma.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(resultado).toEqual({
        firmante: director,
        estadoSiguiente: 'EN_REVISION',
      });
    });

    it('debe enrutar con asignación directa si el paso tiene usuario_id', async () => {
      const usuarioEspecifico = { id: 42, nombre: 'Docente Asignado Directo' };
      mockFlujoFirma.findByPk.mockResolvedValue({
        id: 1,
        pasos: [
          { orden: 1, usuario_id: 42, rol_id: 2 },
        ],
      });
      mockUsuario.findOne.mockResolvedValue(usuarioEspecifico);

      const doc = { id: 1, flujo_id: 1, paso_actual: 1 };
      const resultado = await workflowService.enrutar(doc);

      expect(mockUsuario.findOne).toHaveBeenCalledWith({
        where: { id: 42, activo: true },
        include: [{ model: mockRol, as: 'roles' }],
      });
      expect(resultado).toEqual({
        firmante: usuarioEspecifico,
        estadoSiguiente: 'EN_REVISION',
      });
    });

    it('debe retornar COMPLETADO cuando paso_actual excede la cantidad de pasos', async () => {
      mockFlujoFirma.findByPk.mockResolvedValue({
        id: 1,
        pasos: [
          { orden: 1, rol_id: 2 },
          { orden: 2, rol_id: 3 },
        ],
      });

      const doc = { id: 1, flujo_id: 1, paso_actual: 3 };
      const resultado = await workflowService.enrutar(doc);

      expect(resultado).toEqual({
        firmante: null,
        estadoSiguiente: 'COMPLETADO',
      });
    });

    it('debe lanzar error si el documento no tiene flujo_id', async () => {
      const doc = { id: 1, paso_actual: 1 };
      await expect(workflowService.enrutar(doc)).rejects.toThrow(
        'El documento no tiene un flujo de firma asignado'
      );
    });

    it('debe lanzar error si el flujo no existe o no tiene pasos', async () => {
      mockFlujoFirma.findByPk.mockResolvedValue(null);
      const doc = { id: 1, flujo_id: 99, paso_actual: 1 };
      await expect(workflowService.enrutar(doc)).rejects.toThrow(
        'El flujo de firma no existe o no tiene pasos definidos'
      );
    });
  });

  // ─── procesarFirma ──────────────────────────────────────────────────────
  describe('procesarFirma', () => {
    it('debe procesar firma y avanzar al siguiente paso', async () => {
      const doc = {
        id: 1,
        flujo_id: 1,
        paso_actual: 1,
        firmante_actual_id: 2,
        estado: 'PENDIENTE',
        toJSON: function () { return { ...this }; },
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({ id: 1, paso_actual: 2, estado: 'EN_REVISION' }),
      };

      mockDocumento.findByPk.mockResolvedValue(doc);
      mockFlujoFirma.findByPk.mockResolvedValue({
        id: 1,
        pasos: [
          { orden: 1, rol_id: 2 },
          { orden: 2, rol_id: 3 },
        ],
      });
      mockUsuario.findOne.mockResolvedValue({ id: 3, nombre: 'Siguiente Firmante' });

      const res = await workflowService.procesarFirma(1, { id: 2 }, 'Observacion test');

      expect(doc.update).toHaveBeenCalledWith({
        paso_actual: 2,
        observaciones: 'Observacion test',
        estado: 'EN_REVISION',
        firmante_actual_id: 3,
      });
      expect(res.estado).toBe('EN_REVISION');
    });

    it('debe completar el documento si es el último paso', async () => {
      const doc = {
        id: 1,
        flujo_id: 1,
        paso_actual: 2,
        firmante_actual_id: 3,
        estado: 'EN_REVISION',
        toJSON: function () { return { ...this }; },
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({ id: 1, estado: 'COMPLETADO', firmante_actual_id: null }),
      };

      mockDocumento.findByPk.mockResolvedValue(doc);
      mockFlujoFirma.findByPk.mockResolvedValue({
        id: 1,
        pasos: [
          { orden: 1, rol_id: 2 },
          { orden: 2, rol_id: 3 },
        ],
      });

      const res = await workflowService.procesarFirma(1, { id: 3 }, 'Firma final');

      expect(doc.update).toHaveBeenCalledWith({
        paso_actual: 3,
        observaciones: 'Firma final',
        estado: 'COMPLETADO',
        firmante_actual_id: null,
      });
      expect(res.estado).toBe('COMPLETADO');
    });

    it('debe lanzar error si el documento no existe', async () => {
      mockDocumento.findByPk.mockResolvedValue(null);
      await expect(workflowService.procesarFirma(99, { id: 2 }, null)).rejects.toThrow(
        'Documento no encontrado'
      );
    });

    it('debe lanzar error si el documento ya está COMPLETADO', async () => {
      mockDocumento.findByPk.mockResolvedValue({ id: 1, estado: 'COMPLETADO' });
      await expect(workflowService.procesarFirma(1, { id: 2 }, null)).rejects.toThrow(
        'El documento ya está completado'
      );
    });

    it('debe lanzar error si el documento fue RECHAZADO', async () => {
      mockDocumento.findByPk.mockResolvedValue({ id: 1, estado: 'RECHAZADO' });
      await expect(workflowService.procesarFirma(1, { id: 2 }, null)).rejects.toThrow(
        'El documento fue rechazado'
      );
    });

    it('debe lanzar error si quien firma no es el firmante asignado', async () => {
      mockDocumento.findByPk.mockResolvedValue({ id: 1, estado: 'EN_REVISION', firmante_actual_id: 2 });
      await expect(workflowService.procesarFirma(1, { id: 99 }, null)).rejects.toThrow(
        'No tiene autorización para firmar este documento en esta etapa'
      );
    });
  });

  // ─── rechazar ───────────────────────────────────────────────────────────
  describe('rechazar', () => {
    it('debe rechazar un documento exitosamente', async () => {
      const doc = {
        id: 1,
        firmante_actual_id: 2,
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue({ id: 1, estado: 'RECHAZADO', observaciones: 'Rechazado test' }),
      };
      mockDocumento.findByPk.mockResolvedValue(doc);

      const res = await workflowService.rechazar(1, { id: 2 }, 'Rechazado test');

      expect(doc.update).toHaveBeenCalledWith({
        estado: 'RECHAZADO',
        observaciones: 'Rechazado test',
        firmante_actual_id: null,
      });
      expect(res.estado).toBe('RECHAZADO');
    });

    it('debe lanzar error si no es el firmante asignado', async () => {
      mockDocumento.findByPk.mockResolvedValue({ id: 1, firmante_actual_id: 2 });
      await expect(workflowService.rechazar(1, { id: 99 }, 'Motivo')).rejects.toThrow(
        'No tiene autorización para rechazar este documento'
      );
    });
  });

  // ─── _buscarFirmante ────────────────────────────────────────────────────
  describe('_buscarFirmante', () => {
    it('debe buscar firmante con facultad_id primero', async () => {
      const firmante = { id: 2, nombre: 'Decano Facultad' };
      mockUsuario.findOne.mockResolvedValue(firmante);

      const resultado = await workflowService._buscarFirmante(2, 1);

      expect(mockUsuario.findOne).toHaveBeenCalled();
      expect(resultado).toEqual(firmante);
    });

    it('debe hacer fallback a cualquier usuario del rol si no hay con facultad', async () => {
      mockUsuario.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5, nombre: 'Decano Global' });

      const resultado = await workflowService._buscarFirmante(2, 1);

      expect(mockUsuario.findOne).toHaveBeenCalledTimes(3);
      expect(resultado.nombre).toBe('Decano Global');
    });

    it('debe buscar sin filtro de facultad si facultad_id es null', async () => {
      const firmante = { id: 3, nombre: 'Rector' };
      mockUsuario.findOne.mockResolvedValue(firmante);

      const resultado = await workflowService._buscarFirmante(3, null);

      expect(mockUsuario.findOne).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(firmante);
    });
  });
});
