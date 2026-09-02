const { validationResult } = require('express-validator');
const {
  sequelize,
  Universidad, Facultad, Carrera, Periodo,
  Criterio, Indicador, Actividad, Usuario, Rol,
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

// carreraCtrl: CRUD genérico más un `crear` especializado que extrae solo
// los campos permitidos (nombre, descripcion, facultad_id) para evitar que
// propiedades extra del body generen errores de columna desconocida en Sequelize.
const _carreraBase = crearCRUD(Carrera, [
  { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
]);

const carreraCtrl = {
  ..._carreraBase,

  async crear(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
    try {
      const { nombre, descripcion, facultad_id } = req.body;
      const carrera = await Carrera.create({ nombre, descripcion, facultad_id });
      // Recargar con facultad para la respuesta completa
      const completa = await Carrera.findByPk(carrera.id, {
        include: [{ model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] }],
      });
      res.status(201).json(completa);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

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
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*)::int FROM documentos AS d WHERE d.actividad_id = "Actividad".id)'
            ),
            'cantidadDocumentos',
          ],
        ],
      },
      include: [{ model: Usuario, as: 'usuariosAsignados', attributes: ['id', 'nombre'] }],
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
                            .map(a => {
                              const cantDocs = parseInt(a.get('cantidadDocumentos') ?? a.dataValues?.cantidadDocumentos ?? a.cantidadDocumentos ?? 0, 10);
                              return {
                                id: a.id,
                                nombre: a.nombre,
                                informacion_ayuda: a.descripcion || '',
                                requiere_firma: a.requiere_firma,
                                flujo_id: a.flujo_id || null,
                                usuariosAsignados: a.usuariosAsignados || [],
                                cantidadDocumentos: isNaN(cantDocs) ? 0 : cantDocs,
                                documentos: [],
                              };
                            }),
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

// ─── Controladores personalizados ─────────────────────────────────────────
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

// ─── Controlador de Docentes / Usuarios con asignación N:M ─────────────────
const docenteCtrl = {
  async listar(req, res) {
    try {
      const docentes = await Usuario.findAll({
        where: { activo: true },
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Rol, as: 'roles' },
          { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'], through: { attributes: [] } },
          { model: Facultad, as: 'facultades', through: { attributes: [] } },
          { model: Actividad, as: 'actividades', through: { attributes: [] } },
        ],
        order: [['id', 'ASC']],
      });
      res.json(docentes);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener docentes: ' + err.message });
    }
  },

  async obtener(req, res) {
    try {
      const docente = await Usuario.findOne({
        where: { id: req.params.id, activo: true },
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Rol, as: 'roles' },
          { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'], through: { attributes: [] } },
          { model: Facultad, as: 'facultades', through: { attributes: [] } },
          { model: Actividad, as: 'actividades', through: { attributes: [] } },
        ],
      });
      if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
      res.json(docente);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener docente: ' + err.message });
    }
  },

  async crear(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    const bcrypt = require('bcryptjs');
    try {
      const { nombre, email, password, facultades = [], actividades = [], carreras = [], roles = [] } = req.body;
      const password_hash = await bcrypt.hash(password || 'Docente123!', 10);

      const nuevoDocente = await sequelize.transaction(async (t) => {
        const u = await Usuario.create(
          { nombre, email, password_hash, activo: true },
          { transaction: t }
        );

        if (Array.isArray(facultades) && facultades.length > 0) {
          await u.setFacultades(facultades.map(Number), { transaction: t });
        }

        if (Array.isArray(actividades) && actividades.length > 0) {
          await u.setActividades(actividades.map(Number), { transaction: t });
        }

        if (Array.isArray(carreras) && carreras.length > 0) {
          await u.setCarreras(carreras.map(Number), { transaction: t });
        }

        if (Array.isArray(roles) && roles.length > 0) {
          await u.setRoles(roles.map(Number), { transaction: t });
        }

        return u;
      });

      const resultado = await Usuario.findByPk(nuevoDocente.id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Rol, as: 'roles' },
          { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'], through: { attributes: [] } },
          { model: Facultad, as: 'facultades', through: { attributes: [] } },
          { model: Actividad, as: 'actividades', through: { attributes: [] } },
        ],
      });

      res.status(201).json(resultado);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async actualizar(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
      const { nombre, email, facultades, actividades, carreras, roles } = req.body;
      const usuario = await Usuario.findOne({ where: { id: req.params.id, activo: true } });
      if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });

      await sequelize.transaction(async (t) => {
        const campos = {};
        if (nombre !== undefined) campos.nombre = nombre;
        if (email !== undefined) campos.email = email;

        if (Object.keys(campos).length > 0) {
          await usuario.update(campos, { transaction: t });
        }

        if (facultades !== undefined && Array.isArray(facultades)) {
          await usuario.setFacultades(facultades.map(Number), { transaction: t });
        }

        if (actividades !== undefined && Array.isArray(actividades)) {
          await usuario.setActividades(actividades.map(Number), { transaction: t });
        }

        if (carreras !== undefined && Array.isArray(carreras)) {
          await usuario.setCarreras(carreras.map(Number), { transaction: t });
        }

        if (roles !== undefined && Array.isArray(roles)) {
          await usuario.setRoles(roles.map(Number), { transaction: t });
        }
      });

      const actualizado = await Usuario.findByPk(usuario.id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Rol, as: 'roles' },
          { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'], through: { attributes: [] } },
          { model: Facultad, as: 'facultades', through: { attributes: [] } },
          { model: Actividad, as: 'actividades', through: { attributes: [] } },
        ],
      });

      res.json(actualizado);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async eliminar(req, res) {
    try {
      const usuario = await Usuario.findOne({ where: { id: req.params.id, activo: true } });
      if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });
      await usuario.update({ activo: false });
      res.json({ mensaje: 'Docente eliminado correctamente' });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar docente: ' + err.message });
    }
  },

  async elegibles(req, res) {
    try {
      const { facultadId, actividadId, rol, rolId } = req.query;
      const whereUsuario = { activo: true };
      const include = [];

      // 1. Filtro por Rol (opcional)
      const filtroRol = rolId || rol;
      if (filtroRol) {
        const whereRol = isNaN(filtroRol)
          ? { nombre: filtroRol.toString().toUpperCase() }
          : { id: parseInt(filtroRol, 10) };
        include.push({
          model: Rol,
          as: 'roles',
          where: whereRol,
          attributes: ['id', 'nombre', 'nivel'],
          through: { attributes: [] },
          required: true,
        });
      } else {
        include.push({
          model: Rol,
          as: 'roles',
          attributes: ['id', 'nombre', 'nivel'],
          through: { attributes: [] },
          required: false,
        });
      }

      // 2. Filtro por Facultad (M:N)
      if (facultadId) {
        include.push({
          model: Facultad,
          as: 'facultades',
          where: { id: parseInt(facultadId, 10) },
          attributes: ['id', 'nombre'],
          through: { attributes: [] },
          required: true,
        });
      } else {
        include.push({
          model: Facultad,
          as: 'facultades',
          attributes: ['id', 'nombre'],
          through: { attributes: [] },
          required: false,
        });
      }

      // 3. Filtro por Actividad (M:N)
      if (actividadId) {
        include.push({
          model: Actividad,
          as: 'actividades',
          where: { id: parseInt(actividadId, 10) },
          attributes: ['id', 'nombre'],
          through: { attributes: [] },
          required: true,
        });
      } else {
        include.push({
          model: Actividad,
          as: 'actividades',
          attributes: ['id', 'nombre'],
          through: { attributes: [] },
          required: false,
        });
      }

      const docentes = await Usuario.findAll({
        where: whereUsuario,
        attributes: ['id', 'nombre', 'email', 'activo'],
        include,
        order: [['nombre', 'ASC']],
      });

      res.json(docentes);
    } catch (err) {
      res.status(500).json({ error: 'Error al filtrar docentes elegibles: ' + err.message });
    }
  },
};

module.exports = {
  universidadCtrl, facultadCtrl, carreraCtrl,
  periodoCtrl, criterioCtrl, indicadorCtrl,
  actividadCtrl,
  estructura,
  asignarUsuariosActividad,
  asignarResponsablesIndicador,
  docenteCtrl,
};
