const sequelize = require('./config/database');
const { Documento, Criterio, FlujoFirma, PasoFirma } = require('./Model');

async function up() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida.');

    // Sincronizar nuevos modelos
    await FlujoFirma.sync({ alter: true });
    await PasoFirma.sync({ alter: true });
    
    // Sincronizar Criterio para añadir flujo_id
    await Criterio.sync({ alter: true });

    // Modificar ENUM enum_documentos_estado en PostgreSQL si es posible.
    // Atrapamos error si ya existe el valor EN_REVISION.
    try {
      await sequelize.query(`ALTER TYPE "enum_documentos_estado" ADD VALUE 'EN_REVISION';`);
      console.log('Valor EN_REVISION añadido al ENUM.');
    } catch (err) {
      console.log('Nota: el valor EN_REVISION puede que ya exista o el motor DB no lo soporte igual.', err.message);
    }

    // Sincronizar Documento para añadir flujo_id y paso_actual
    await Documento.sync({ alter: true });

    // Crear un flujo global por defecto si no existe ninguno
    let flujoGlobal = await FlujoFirma.findOne({ where: { es_global: true } });
    if (!flujoGlobal) {
      flujoGlobal = await FlujoFirma.create({ nombre: 'Flujo Por Defecto', es_global: true });
      const { Rol } = require('./Model');
      const rolDir = await Rol.findOne({ where: { nombre: 'DIRECTOR_CARRERA' } });
      const rolSub = await Rol.findOne({ where: { nombre: 'SUBDECANO' } });
      const rolDec = await Rol.findOne({ where: { nombre: 'DECANO' } });
      const rolRec = await Rol.findOne({ where: { nombre: 'RECTOR' } });
      
      let orden = 1;
      if (rolDir) await PasoFirma.create({ flujo_id: flujoGlobal.id, orden: orden++, rol_id: rolDir.id });
      if (rolSub) await PasoFirma.create({ flujo_id: flujoGlobal.id, orden: orden++, rol_id: rolSub.id });
      if (rolDec) await PasoFirma.create({ flujo_id: flujoGlobal.id, orden: orden++, rol_id: rolDec.id });
      if (rolRec) await PasoFirma.create({ flujo_id: flujoGlobal.id, orden: orden++, rol_id: rolRec.id });
      console.log('Flujo global creado por defecto.');
    }

    console.log('Base de datos sincronizada para la Sesión 2.');
  } catch (error) {
    console.error('Error en la migración:', error);
  } finally {
    process.exit(0);
  }
}

up();
