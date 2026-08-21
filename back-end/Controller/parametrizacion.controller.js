const { validationResult } = require('express-validator');
const {
  Universidad, Facultad, Carrera, Periodo,
  Criterio, Indicador, Actividad, Documento, Usuario,
} = require('../Model');

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

// ─── Controladores específicos ─────────────────────────────────────────────
const universidadCtrl = crearCRUD(Universidad);

const facultadCtrl = crearCRUD(Facultad, [
  { model: Universidad, as: 'universidad', attributes: ['id', 'nombre'] },
]);

const carreraCtrl = crearCRUD(Carrera, [
  { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
]);

const periodoCtrl = crearCRUD(Periodo, [
  { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
]);

const criterioCtrl = crearCRUD(Criterio);

const indicadorCtrl = crearCRUD(Indicador, [
  { model: Criterio, as: 'criterio', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'responsables', attributes: ['id', 'nombre', 'email'] },
]);

const actividadCtrl = crearCRUD(Actividad, [
  { model: Indicador, as: 'indicador', attributes: ['id', 'numero', 'nombre'] },
  { model: Usuario, as: 'usuariosAsignados', attributes: ['id', 'nombre', 'email'], through: { attributes: [] } },
]);

// ─── Estructura jerárquica completa ────────────────────────────────────────
// Universidad → Facultad → Carrera → Período → Criterio → Indicador → Actividad
async function estructura(req, res) {
  try {
    const universidades = await Universidad.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const facultades    = await Facultad.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const carreras      = await Carrera.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const periodos      = await Periodo.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const criterios     = await Criterio.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const indicadores   = await Indicador.findAll({
      where: { activo: true },
      include: [{ model: Usuario, as: 'responsables', attributes: ['id', 'nombre'] }],
      order: [['numero', 'ASC']],
    });
    const actividades   = await Actividad.findAll({ 
      where: { activo: true }, 
      include: [{ model: Usuario, as: 'usuariosAsignados', attributes: ['id', 'nombre'] }],
      order: [['id', 'ASC']] 
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
          carreras: carreras
            .filter(ca => ca.facultad_id === f.id)
            .map(ca => ({
              id: ca.id,
              nombre: ca.nombre,
              descripcion: ca.descripcion,
              periodos: periodos
                .filter(p => p.carrera_id === ca.id)
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
                      flujo_id: c.flujo_id || null,
                      indicadores: indicadores
                        .filter(ind => ind.criterio_id === c.id)
                        .map(ind => ({
                          id: ind.id,
                          numero: ind.numero,
                          nombre: ind.nombre,
                          responsables: ind.responsables || [],
                          actividades: actividades
                            .filter(a => a.indicador_id === ind.id)
                            .map(a => ({
                              id: a.id,
                              nombre: a.nombre,
                              informacion_ayuda: a.descripcion || '',
                              requiere_firma: a.requiere_firma,
                              flujo_id: a.flujo_id || null,
                              usuariosAsignados: a.usuariosAsignados || [],
                              documentos: [],
                            })),
                        })),
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

// ─── Controladores personalizados ───
const asignarUsuariosActividad = async (req, res) => {
  const { id } = req.params;
  const { usuariosIds } = req.body;
  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });
    
    await actividad.setUsuariosAsignados(usuariosIds || []);
    res.json({ mensaje: 'Usuarios asignados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const asignarResponsablesIndicador = async (req, res) => {
  const { id } = req.params;
  const { responsablesIds } = req.body;
  try {
    const indicador = await Indicador.findByPk(id);
    if (!indicador) return res.status(404).json({ error: 'Indicador no encontrado' });
    
    await indicador.setResponsables(responsablesIds || []);
    res.json({ mensaje: 'Responsables asignados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  universidadCtrl, facultadCtrl, carreraCtrl,
  periodoCtrl, criterioCtrl, indicadorCtrl,
  actividadCtrl,
  estructura,
  asignarUsuariosActividad,
  asignarResponsablesIndicador
};
