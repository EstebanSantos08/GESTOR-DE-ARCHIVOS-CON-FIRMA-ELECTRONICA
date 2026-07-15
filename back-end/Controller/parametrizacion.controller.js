const { validationResult } = require('express-validator');
const { Universidad, Facultad, Periodo, Criterio, Actividad, Documento, Usuario } = require('../Model');

// ─── Fábrica de CRUD genérico ──────────────────────────────────────────────
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

// ─── Helpers de eliminación en cascada ─────────────────────────────────────
async function softDeleteUniversidad(id) {
  const univ = await Universidad.findOne({ where: { id, activo: true } });
  if (!univ) return null;

  // Obtener todas las facultades hijas
  const facultades = await Facultad.findAll({ where: { universidad_id: id, activo: true } });
  for (const f of facultades) {
    await softDeleteFacultad(f.id);
  }

  await univ.update({ activo: false });
  return univ;
}

async function softDeleteFacultad(id) {
  const fac = await Facultad.findOne({ where: { id, activo: true } });
  if (!fac) return null;

  const periodos = await Periodo.findAll({ where: { facultad_id: id, activo: true } });
  for (const p of periodos) {
    await softDeletePeriodo(p.id);
  }

  await fac.update({ activo: false });
  return fac;
}

async function softDeletePeriodo(id) {
  const per = await Periodo.findOne({ where: { id, activo: true } });
  if (!per) return null;

  const criterios = await Criterio.findAll({ where: { periodo_id: id, activo: true } });
  for (const c of criterios) {
    await softDeleteCriterio(c.id);
  }

  await per.update({ activo: false });
  return per;
}

async function softDeleteCriterio(id) {
  const crit = await Criterio.findOne({ where: { id, activo: true } });
  if (!crit) return null;

  const actividades = await Actividad.findAll({ where: { criterio_id: id, activo: true } });
  for (const a of actividades) {
    await softDeleteActividad(a.id);
  }

  await crit.update({ activo: false });
  return crit;
}

async function softDeleteActividad(id) {
  const act = await Actividad.findOne({ where: { id, activo: true } });
  if (!act) return null;
  // No elimina documentos, solo la actividad
  await act.update({ activo: false });
  return act;
}

// ─── Controladores específicos ─────────────────────────────────────────────
const universidadCtrl = {
  ...crearCRUD(Universidad),
  async eliminar(req, res) {
    try {
      const result = await softDeleteUniversidad(req.params.id);
      if (!result) return res.status(404).json({ error: 'Universidad no encontrada' });
      res.json({ mensaje: 'Universidad y todos sus registros asociados eliminados correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

const facultadCtrl = {
  ...crearCRUD(Facultad, [
    { model: Universidad, as: 'universidad', attributes: ['id', 'nombre'] },
  ]),
  async eliminar(req, res) {
    try {
      const result = await softDeleteFacultad(req.params.id);
      if (!result) return res.status(404).json({ error: 'Facultad no encontrada' });
      res.json({ mensaje: 'Facultad y todos sus registros asociados eliminados correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

const periodoCtrl = {
  ...crearCRUD(Periodo, [
    { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
  ]),
  async eliminar(req, res) {
    try {
      const result = await softDeletePeriodo(req.params.id);
      if (!result) return res.status(404).json({ error: 'Período no encontrado' });
      res.json({ mensaje: 'Período y todos sus registros asociados eliminados correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

const criterioCtrl = {
  ...crearCRUD(Criterio),
  async eliminar(req, res) {
    try {
      const result = await softDeleteCriterio(req.params.id);
      if (!result) return res.status(404).json({ error: 'Criterio no encontrado' });
      res.json({ mensaje: 'Criterio y todos sus registros asociados eliminados correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

const actividadCtrl = {
  ...crearCRUD(Actividad, [
    { model: Criterio, as: 'criterio', attributes: ['id', 'nombre'] },
  ]),
  async eliminar(req, res) {
    try {
      const act = await Actividad.findOne({ where: { id: req.params.id, activo: true } });
      if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });
      await softDeleteActividad(req.params.id);
      res.json({ mensaje: 'Actividad eliminada correctamente' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

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

    const periodos = await Periodo.findAll({
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
      siglas: u.siglas,
      facultades: facultades
        .filter(f => f.universidad_id === u.id)
        .map(f => ({
          id: f.id,
          nombre: f.nombre,
          descripcion: f.descripcion,
          periodos: periodos
            .filter(p => p.facultad_id === f.id)
            .map(p => ({
              id: p.id,
              nombre: p.nombre,
              criterios: criterios
                .filter(c => c.periodo_id === p.id)
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
        })),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { universidadCtrl, facultadCtrl, periodoCtrl, criterioCtrl, actividadCtrl, estructura };
