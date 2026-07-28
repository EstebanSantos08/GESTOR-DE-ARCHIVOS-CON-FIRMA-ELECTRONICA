require('dotenv').config();
const { Documento, Usuario, Rol } = require('./Model');
const workflowService = require('./Services/workflow.service');

async function test() {
  const decano = await Usuario.findOne({ include: [{ model: Rol, as: 'rol', where: { nombre: 'DECANO' } }] });
  
  const doc = await Documento.findOne({ where: { estado: 'FIRMADO_SUBDECANO' } });
  if (!doc) {
    console.log("No hay documentos en FIRMADO_SUBDECANO. Imprimiendo todos los estados:");
    const docs = await Documento.findAll();
    console.log(docs.map(d => `${d.id} - ${d.estado} - firmante_actual_id: ${d.firmante_actual_id}`));
    return;
  }

  console.log(`Documento ${doc.id} en FIRMADO_SUBDECANO. firmante_actual_id=${doc.firmante_actual_id}, decano_id=${decano.id}`);
  
  try {
    await workflowService.rechazar(doc.id, decano, "Motivo de prueba");
    console.log("Rechazado correctamente");
  } catch (err) {
    console.error("Error al rechazar:", err.message);
  }
}

test();
