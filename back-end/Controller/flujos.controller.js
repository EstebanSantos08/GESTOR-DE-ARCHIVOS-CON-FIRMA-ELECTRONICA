const { FlujoFirma, PasoFirma, Rol, Usuario } = require('../Model');

async function procesarPasos(pasos, flujoId) {
  if (!pasos || !Array.isArray(pasos) || pasos.length === 0) return [];

  const pasosCrear = await Promise.all(
    pasos.map(async (p, i) => {
      let rol_id = null;
      let usuario_id = null;

      if (typeof p === 'object' && p !== null) {
        usuario_id = p.usuario_id ? parseInt(p.usuario_id, 10) : null;
        rol_id = p.rol_id ? parseInt(p.rol_id, 10) : null;
      } else if (typeof p === 'number' || typeof p === 'string') {
        const val = parseInt(p, 10);
        if (!isNaN(val)) {
          const user = await Usuario.findByPk(val, {
            include: [{ model: Rol, as: 'roles' }]
          });
          if (user) {
            usuario_id = user.id;
            rol_id = user.roles && user.roles[0] ? user.roles[0].id : null;
          } else {
            rol_id = val;
          }
        }
      }

      if (usuario_id && !rol_id) {
        const user = await Usuario.findByPk(usuario_id, {
          include: [{ model: Rol, as: 'roles' }]
        });
        if (user && user.roles && user.roles[0]) {
          rol_id = user.roles[0].id;
        }
      }

      return {
        flujo_id: flujoId,
        orden: i + 1,
        rol_id: rol_id || null,
        usuario_id: usuario_id || null,
      };
    })
  );

  return pasosCrear;
}

async function listarFlujos(req, res) {
  try {
    const flujos = await FlujoFirma.findAll({
      include: [
        {
          model: PasoFirma,
          as: 'pasos',
          include: [
            { model: Rol, as: 'rolRequerido' },
            { model: Usuario, as: 'usuarioFirmante', attributes: ['id', 'nombre', 'email'] },
          ]
        }
      ],
      order: [
        ['id', 'ASC'],
        [{ model: PasoFirma, as: 'pasos' }, 'orden', 'ASC']
      ]
    });
    res.json(flujos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function crearFlujo(req, res) {
  try {
    const { nombre, es_global, pasos } = req.body;
    
    // Si es global, desmarcar otros globales si se desea que solo haya uno. 
    if (es_global) {
      await FlujoFirma.update({ es_global: false }, { where: { es_global: true } });
    }

    const nuevoFlujo = await FlujoFirma.create({ nombre, es_global });
    
    if (pasos && pasos.length > 0) {
      const pasosCrear = await procesarPasos(pasos, nuevoFlujo.id);
      await PasoFirma.bulkCreate(pasosCrear);
    }

    const resultado = await FlujoFirma.findByPk(nuevoFlujo.id, {
      include: [
        {
          model: PasoFirma,
          as: 'pasos',
          include: [
            { model: Rol, as: 'rolRequerido' },
            { model: Usuario, as: 'usuarioFirmante', attributes: ['id', 'nombre', 'email'] },
          ]
        }
      ],
      order: [[{ model: PasoFirma, as: 'pasos' }, 'orden', 'ASC']]
    });
    
    res.status(201).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function actualizarFlujo(req, res) {
  try {
    const { nombre, es_global, pasos } = req.body;
    const flujo = await FlujoFirma.findByPk(req.params.id);
    if (!flujo) return res.status(404).json({ error: 'Flujo no encontrado' });

    if (es_global && !flujo.es_global) {
      await FlujoFirma.update({ es_global: false }, { where: { es_global: true } });
    } else if (!es_global && flujo.es_global) {
      const count = await FlujoFirma.count({ where: { es_global: true } });
      if (count <= 1) {
        return res.status(400).json({ error: 'Debe existir al menos un flujo global configurado' });
      }
    }

    await flujo.update({ nombre, es_global });

    if (pasos) {
      await PasoFirma.destroy({ where: { flujo_id: flujo.id } });
      const pasosCrear = await procesarPasos(pasos, flujo.id);
      await PasoFirma.bulkCreate(pasosCrear);
    }

    const resultado = await FlujoFirma.findByPk(flujo.id, {
      include: [
        {
          model: PasoFirma,
          as: 'pasos',
          include: [
            { model: Rol, as: 'rolRequerido' },
            { model: Usuario, as: 'usuarioFirmante', attributes: ['id', 'nombre', 'email'] },
          ]
        }
      ],
      order: [[{ model: PasoFirma, as: 'pasos' }, 'orden', 'ASC']]
    });

    res.json({ mensaje: 'Flujo actualizado correctamente', flujo: resultado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function eliminarFlujo(req, res) {
  try {
    const flujo = await FlujoFirma.findByPk(req.params.id);
    if (!flujo) return res.status(404).json({ error: 'Flujo no encontrado' });
    
    // No permitir eliminar si es el único global
    if (flujo.es_global) {
      const count = await FlujoFirma.count({ where: { es_global: true } });
      if (count <= 1) {
        return res.status(400).json({ error: 'No puedes eliminar el único flujo global' });
      }
    }

    await PasoFirma.destroy({ where: { flujo_id: flujo.id } });
    await flujo.destroy();
    res.json({ mensaje: 'Flujo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listarFlujos,
  crearFlujo,
  actualizarFlujo,
  eliminarFlujo
};
