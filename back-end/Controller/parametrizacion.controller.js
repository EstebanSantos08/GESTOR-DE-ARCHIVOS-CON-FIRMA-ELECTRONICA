const { validationResult } = require('express-validator');
const { Universidad, Facultad, Criterio, Actividad, Documento, Usuario } = require('../Model');

// ─── Fábrica de CRUD genérico ──────────────────────────────────────────────
// Reutiliza la misma lógica para catálogos con soft delete y relaciones opcionales.
function crearCRUD(Modelo, includeOpts = []) {
  return {
    async listar(req, res) {
      try {
        const registros = await Modelo.findAll({
          where: { activo: true },
          include: includeOpts,
          order: [['id', 'ASC']],
        });
        res.json(registros);
      } catch {
        res.status(500).json({ error: 'Error al obtener registros' });
      }
    },

    async obtener(req, res) {
      try {
        const registro = await Modelo.findOne({
          where: { id: req.params.id, activo: true },
          include: includeOpts,
        });
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
        res.json(registro);
      } catch {
        res.status(500).json({ error: 'Error al obtener registro' });
      }
    },

    async crear(req, res) {
      const errores = validationResult(req);
      if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
      try {
        const registro = await Modelo.create(req.body);
        res.status(201).json(registro);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },

    async actualizar(req, res) {
      const errores = validationResult(req);
      if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
      try {
        const registro = await Modelo.findOne({ where: { id: req.params.id, activo: true } });
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
        await registro.update(req.body);
        res.json(registro);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },

    async eliminar(req, res) {
      try {
        const registro = await Modelo.findOne({ where: { id: req.params.id, activo: true } });
        if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
        await registro.update({ activo: false });
        res.json({ mensaje: 'Registro eliminado correctamente' });
      } catch {
        res.status(500).json({ error: 'Error al eliminar registro' });
      }
    },
  };
}

// ─── Controladores específicos ─────────────────────────────────────────────
const universidadCtrl = crearCRUD(Universidad);

const facultadCtrl = crearCRUD(Facultad, [
  { model: Universidad, as: 'universidad', attributes: ['id', 'nombre'] },
]);

const criterioCtrl = crearCRUD(Criterio);

const actividadCtrl = crearCRUD(Actividad, [
  { model: Criterio, as: 'criterio', attributes: ['id', 'nombre'] },
]);

async function estructura(req, res) {
  try {
    const universidades = await Universidad.findAll({
      where: { activo: true },
      order: [['id', 'ASC']],
    });

    const facultades = await Facultad.findAll({
      where: { activo: true },
      order: [['id', 'ASC']],
    });

    const criterios = await Criterio.findAll({
      where: { activo: true },
      order: [['id', 'ASC']],
    });

    const actividades = await Actividad.findAll({
      where: { activo: true },
      order: [['id', 'ASC']],
    });

    const resultado = universidades.map(u => ({
      id: u.id,
      nombre: u.nombre,
      descripcion: u.descripcion,
      facultades: facultades
        .filter(f => f.universidad_id === u.id)
        .map(f => ({
          id: f.id,
          nombre: f.nombre,
          descripcion: f.descripcion,
          criterios: criterios
            .filter(c => c.facultad_id === f.id || c.facultad_id === null)
            .map(c => ({
              id: c.id,
              nombre: c.nombre,
              descripcion: c.descripcion,
              requiere_firma: c.requiere_firma,
              actividades: actividades
                .filter(a => a.criterio_id === c.id)
                .map(a => ({
                  id: a.id,
                  nombre: a.nombre,
                  informacion_ayuda: a.descripcion || '',
                  documentos: [],
                })),
            })),
        })),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { universidadCtrl, facultadCtrl, criterioCtrl, actividadCtrl, estructura };
