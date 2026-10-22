const { validationResult } = require('express-validator');
const {
  sequelize,
  Universidad, Facultad, Carrera, Periodo,
  Criterio, Indicador, Subcriterio, Actividad, Usuario, Rol,
} = require('../Model');
const { generarEstructuraParaCarreraYPeriodo } = require('../Utils/catalogoAcreditacion');

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

const _periodoBase = crearCRUD(Periodo, [
  { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
  { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
]);

const periodoCtrl = {
  ..._periodoBase,

  async crear(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    const t = await sequelize.transaction();
    try {
      const { nombre, facultad_id, carrera_id, generar_estructura = true } = req.body;

      let finalFacultadId = facultad_id;
      if (!finalFacultadId && carrera_id) {
        const carrera = await Carrera.findByPk(carrera_id, { transaction: t });
        if (carrera) finalFacultadId = carrera.facultad_id;
      }

      const periodo = await Periodo.create(
        {
          nombre,
          facultad_id: finalFacultadId || null,
          carrera_id: carrera_id || null,
        },
        { transaction: t }
      );

      // Auto-generación de carpetas por carrera si generar_estructura es true
      if (generar_estructura && finalFacultadId) {
        const carreras = await Carrera.findAll({
          where: { facultad_id: finalFacultadId, activo: true },
          transaction: t,
        });

        for (const carr of carreras) {
          await generarEstructuraParaCarreraYPeriodo({
            carreraId: carr.id,
            periodoId: periodo.id,
            models: { Criterio, Subcriterio, Indicador, Actividad },
            transaction: t,
          });
        }
      } else if (generar_estructura && carrera_id) {
        await generarEstructuraParaCarreraYPeriodo({
          carreraId: carrera_id,
          periodoId: periodo.id,
          models: { Criterio, Subcriterio, Indicador, Actividad },
          transaction: t,
        });
      }

      await t.commit();

      const periodoCompleto = await Periodo.findByPk(periodo.id, {
        include: [
          { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
          { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
        ],
      });

      res.status(201).json(periodoCompleto);
    } catch (err) {
      await t.rollback();
      res.status(400).json({ error: err.message });
    }
  },
};

const criterioCtrl = crearCRUD(Criterio, [
  { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
  { model: Periodo, as: 'periodo', attributes: ['id', 'nombre'] },
]);

const _subcriterioBase = crearCRUD(Subcriterio, [
  { model: Criterio, as: 'criterio', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'responsables', attributes: ['id', 'nombre', 'email'] },
]);

const subcriterioCtrl = {
  ..._subcriterioBase,
  async crear(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
    try {
      const payload = {
        ...req.body,
        descripcion: req.body.descripcion ?? req.body.informacion_ayuda ?? null,
      };
      const sub = await Subcriterio.create(payload);
      if (Indicador) {
        await Indicador.findOrCreate({
          where: { criterio_id: sub.criterio_id, numero: sub.numero },
          defaults: {
            nombre: sub.nombre,
            descripcion: sub.descripcion,
            criterio_id: sub.criterio_id,
            responsable_nombre: sub.responsable_nombre,
          },
        }).catch(() => {});
      }
      res.status(201).json(sub);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async actualizar(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
    try {
      const registro = await Subcriterio.findOne({ where: { id: req.params.id, activo: true } });
      if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
      const numAnterior = registro.numero;
      const payload = {
        ...req.body,
        ...(req.body.informacion_ayuda !== undefined && req.body.descripcion === undefined
          ? { descripcion: req.body.informacion_ayuda }
          : {}),
      };
      await registro.update(payload);
      if (Indicador) {
        await Indicador.update(
          {
            ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}),
            ...(payload.numero !== undefined ? { numero: payload.numero } : {}),
            ...(payload.descripcion !== undefined ? { descripcion: payload.descripcion } : {}),
            ...(payload.responsable_nombre !== undefined ? { responsable_nombre: payload.responsable_nombre } : {}),
          },
          { where: { criterio_id: registro.criterio_id, numero: numAnterior } }
        ).catch(() => {});
      }
      res.json(registro);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async eliminar(req, res) {
    try {
      const registro = await Subcriterio.findOne({ where: { id: req.params.id, activo: true } });
      if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
      await registro.update({ activo: false });
      if (Indicador) {
        await Indicador.update(
          { activo: false },
          { where: { criterio_id: registro.criterio_id, numero: registro.numero } }
        ).catch(() => {});
      }
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch {
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};

const _indicadorBase = crearCRUD(Indicador, [
  { model: Criterio, as: 'criterio', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'responsables', attributes: ['id', 'nombre', 'email'] },
]);

const indicadorCtrl = {
  ..._indicadorBase,
  async crear(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
    try {
      const payload = {
        ...req.body,
        descripcion: req.body.descripcion ?? req.body.informacion_ayuda ?? null,
      };
      const ind = await Indicador.create(payload);
      if (Subcriterio) {
        await Subcriterio.findOrCreate({
          where: { criterio_id: ind.criterio_id, numero: ind.numero },
          defaults: {
            nombre: ind.nombre,
            descripcion: ind.descripcion,
            criterio_id: ind.criterio_id,
            responsable_nombre: ind.responsable_nombre,
            requiere_firma: req.body.requiere_firma ?? true,
            flujo_id: req.body.flujo_id || null,
          },
        }).catch(() => {});
      }
      res.status(201).json(ind);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async actualizar(req, res) {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
    try {
      // Buscar primero en Subcriterio o Indicador por ID
      let sub = Subcriterio ? await Subcriterio.findOne({ where: { id: req.params.id, activo: true } }) : null;
      let ind = await Indicador.findOne({ where: { id: req.params.id, activo: true } });

      const payload = {
        ...req.body,
        ...(req.body.informacion_ayuda !== undefined && req.body.descripcion === undefined
          ? { descripcion: req.body.informacion_ayuda }
          : {}),
      };

      if (sub) {
        const numAnt = sub.numero;
        await sub.update(payload);
        if (Indicador) {
          await Indicador.update(
            {
              ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}),
              ...(payload.numero !== undefined ? { numero: payload.numero } : {}),
              ...(payload.descripcion !== undefined ? { descripcion: payload.descripcion } : {}),
            },
            { where: { criterio_id: sub.criterio_id, numero: numAnt } }
          ).catch(() => {});
        }
        return res.json(sub);
      }

      if (!ind) return res.status(404).json({ error: 'Registro no encontrado' });
      const numAnt = ind.numero;
      await ind.update(payload);
      if (Subcriterio) {
        await Subcriterio.update(payload, { where: { criterio_id: ind.criterio_id, numero: numAnt } }).catch(() => {});
      }
      res.json(ind);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async eliminar(req, res) {
    try {
      const sub = Subcriterio ? await Subcriterio.findOne({ where: { id: req.params.id, activo: true } }) : null;
      const ind = await Indicador.findOne({ where: { id: req.params.id, activo: true } });
      if (!sub && !ind) return res.status(404).json({ error: 'Registro no encontrado' });

      if (sub) {
        await sub.update({ activo: false });
        if (Indicador) {
          await Indicador.update({ activo: false }, { where: { criterio_id: sub.criterio_id, numero: sub.numero } }).catch(() => {});
        }
      }
      if (ind) {
        await ind.update({ activo: false });
        if (Subcriterio) {
          await Subcriterio.update({ activo: false }, { where: { criterio_id: ind.criterio_id, numero: ind.numero } }).catch(() => {});
        }
      }
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch {
      res.status(500).json({ error: 'Error al eliminar registro' });
    }
  },
};

const actividadCtrl = crearCRUD(Actividad, [
  { model: Subcriterio, as: 'subcriterio', attributes: ['id', 'numero', 'nombre'] },
  { model: Indicador, as: 'indicador', attributes: ['id', 'numero', 'nombre'] },
  { model: Usuario, as: 'usuariosAsignados', attributes: ['id', 'nombre', 'email'], through: { attributes: [] } },
]);

// ─── Generación de estructura para una Carrera específica ─────────────────
async function generarEstructuraCarrera(req, res) {
  const { id } = req.params; // carrera_id
  const { periodo_id } = req.body;
  const t = await sequelize.transaction();
  try {
    const carrera = await Carrera.findByPk(id, { transaction: t });
    if (!carrera) {
      await t.rollback();
      return res.status(404).json({ error: 'Carrera no encontrada' });
    }

    let periodos = [];
    if (periodo_id) {
      const per = await Periodo.findByPk(periodo_id, { transaction: t });
      if (per) periodos.push(per);
    } else {
      periodos = await Periodo.findAll({
        where: { facultad_id: carrera.facultad_id, activo: true },
        transaction: t,
      });
    }

    for (const per of periodos) {
      await generarEstructuraParaCarreraYPeriodo({
        carreraId: carrera.id,
        periodoId: per.id,
        models: { Criterio, Subcriterio, Indicador, Actividad },
        transaction: t,
      });
    }

    await t.commit();
    res.json({ mensaje: 'Estructura generada exitosamente para la carrera' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
}

// ─── Estructura jerárquica completa (6 niveles: Documentos en Subcriterio) ──
// Universidad → Facultad → Período → Carrera → Criterio → Subcriterio → Documentos
async function estructura(req, res) {
  try {
    const universidades = await Universidad.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const facultades    = await Facultad.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const carreras      = await Carrera.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const periodos      = await Periodo.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const criterios     = await Criterio.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
    const subcriterios  = await Subcriterio.findAll({
      where: { activo: true },
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*)::int FROM documentos AS d WHERE d.subcriterio_id = "Subcriterio".id)'
            ),
            'cantidadDocumentos',
          ],
        ],
      },
      include: [{ model: Usuario, as: 'responsables', attributes: ['id', 'nombre', 'email'] }],
      order: [['numero', 'ASC']],
    });
    const indicadores   = await Indicador.findAll({
      where: { activo: true },
      include: [{ model: Usuario, as: 'responsables', attributes: ['id', 'nombre', 'email'] }],
      order: [['numero', 'ASC']],
    });

    const resultado = universidades.map(u => ({
      id: u.id,
      nombre: u.nombre,
      descripcion: u.descripcion,
      siglas: u.siglas,
      facultades: facultades
        .filter(f => f.universidad_id === u.id)
        .map(f => {
          const facCarreras = carreras.filter(ca => ca.facultad_id === f.id);
          const facCarreraIds = facCarreras.map(ca => ca.id);

          // Períodos de la facultad (o asociados a carreras de la facultad por compatibilidad)
          const facPeriodos = periodos.filter(p =>
            p.facultad_id === f.id || (p.carrera_id && facCarreraIds.includes(p.carrera_id))
          );

          return {
            id: f.id,
            nombre: f.nombre,
            descripcion: f.descripcion,
            // Lista de carreras a nivel facultad por retrocompatibilidad
            carreras: facCarreras.map(ca => ({
              id: ca.id,
              nombre: ca.nombre,
              descripcion: ca.descripcion,
            })),
            periodos: facPeriodos.map(p => ({
              id: p.id,
              nombre: p.nombre,
              facultad_id: f.id,
              carreras: facCarreras.map(ca => {
                // Criterios aislados de esta carrera en este período
                const carrCriterios = criterios.filter(c =>
                  c.periodo_id === p.id && (c.carrera_id === ca.id || (!c.carrera_id && p.carrera_id === ca.id))
                );

                return {
                  id: ca.id,
                  nombre: ca.nombre,
                  descripcion: ca.descripcion,
                  criterios: carrCriterios.map(c => {
                    const critSubcriteriosDB = subcriterios.filter(s => s.criterio_id === c.id);
                    const critIndicadoresDB  = indicadores.filter(i => i.criterio_id === c.id);
                    const listaBase = critSubcriteriosDB.length > 0 ? critSubcriteriosDB : critIndicadoresDB;

                    const itemsMapeados = listaBase.map(item => {
                      const cantDocs = parseInt(
                        item.get?.('cantidadDocumentos') ?? item.dataValues?.cantidadDocumentos ?? item.cantidadDocumentos ?? 0,
                        10
                      );

                      return {
                        id: item.id,
                        numero: item.numero,
                        nombre: item.nombre,
                        descripcion: item.descripcion || '',
                        informacion_ayuda: item.descripcion || '',
                        requiere_firma: item.requiere_firma ?? true,
                        flujo_id: item.flujo_id || null,
                        responsable_nombre: item.responsable_nombre || '',
                        responsables: item.responsables || [],
                        cantidadDocumentos: isNaN(cantDocs) ? 0 : cantDocs,
                        documentos: [],
                      };
                    });

                    return {
                      id: c.id,
                      nombre: c.nombre,
                      descripcion: c.descripcion,
                      requiere_firma: c.requiere_firma,
                      flujo_id: c.flujo_id || null,
                      subcriterios: itemsMapeados,
                      indicadores: itemsMapeados, // Alias idéntico para retrocompatibilidad
                    };
                  }),
                };
              }),
            })),
          };
        }),
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
    const subDirecto = Subcriterio ? await Subcriterio.findByPk(id) : null;
    const indicador = await Indicador.findByPk(id);
    if (!subDirecto && !indicador) return res.status(404).json({ error: 'Subcriterio / Indicador no encontrado' });

    if (subDirecto) {
      await subDirecto.setResponsables(responsablesIds || []);
      if (Indicador) {
        const indEq = await Indicador.findOne({
          where: { criterio_id: subDirecto.criterio_id, numero: subDirecto.numero },
        });
        if (indEq) await indEq.setResponsables(responsablesIds || []);
      }
      return res.json({ mensaje: 'Responsables asignados correctamente' });
    }

    await indicador.setResponsables(responsablesIds || []);

    const subcriterio = await Subcriterio.findOne({
      where: { criterio_id: indicador.criterio_id, numero: indicador.numero },
    });
    if (subcriterio) {
      await subcriterio.setResponsables(responsablesIds || []);
    }

    res.json({ mensaje: 'Responsables asignados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const asignarResponsablesSubcriterio = async (req, res) => {
  const { id } = req.params;
  const { responsablesIds } = req.body;
  try {
    const subcriterio = await Subcriterio.findByPk(id);
    if (!subcriterio) return res.status(404).json({ error: 'Subcriterio no encontrado' });

    await subcriterio.setResponsables(responsablesIds || []);

    const indicador = await Indicador.findOne({
      where: { criterio_id: subcriterio.criterio_id, numero: subcriterio.numero },
    });
    if (indicador) {
      await indicador.setResponsables(responsablesIds || []);
    }

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
  periodoCtrl, criterioCtrl, indicadorCtrl, subcriterioCtrl,
  actividadCtrl,
  estructura,
  asignarUsuariosActividad,
  asignarResponsablesIndicador,
  asignarResponsablesSubcriterio,
  generarEstructuraCarrera,
  docenteCtrl,
};
