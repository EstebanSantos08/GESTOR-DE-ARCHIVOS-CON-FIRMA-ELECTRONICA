const { FlujoFirma, PasoFirma, Rol } = require('../Model');

async function listarFlujos(req, res) {
  try {
    const flujos = await FlujoFirma.findAll({
      include: [
        {
          model: PasoFirma,
          as: 'pasos',
          include: [{ model: Rol, as: 'rolRequerido' }]
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
    // Por requerimiento puede haber múltiples, pero la lógica de workflow.service.js
    // busca el primero que encuentre con es_global = true si no hay flujo_id.
    if (es_global) {
      await FlujoFirma.update({ es_global: false }, { where: { es_global: true } });
    }

    const nuevoFlujo = await FlujoFirma.create({ nombre, es_global });
    
    if (pasos && pasos.length > 0) {
      const pasosCrear = pasos.map((rol_id, i) => ({
        flujo_id: nuevoFlujo.id,
        orden: i + 1,
        rol_id
      }));
      await PasoFirma.bulkCreate(pasosCrear);
    }
    
    res.status(201).json(nuevoFlujo);
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
      const pasosCrear = pasos.map((rol_id, i) => ({
        flujo_id: flujo.id,
        orden: i + 1,
        rol_id
      }));
      await PasoFirma.bulkCreate(pasosCrear);
    }

    res.json({ mensaje: 'Flujo actualizado correctamente' });
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
