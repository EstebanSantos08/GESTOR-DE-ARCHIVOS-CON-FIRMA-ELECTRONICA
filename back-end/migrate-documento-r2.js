'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize, Documento } = require('./Model');

/**
 * Migración para agregar la columna ruta_archivo_original a la tabla documentos.
 * Permite trazabilidad de la versión original subida tras cada firma sucesiva.
 */
async function migrarDocumentoR2() {
  console.log('─── Iniciando migración de esquema para Cloudflare R2 ───');

  try {
    await sequelize.authenticate();
    console.log('✓ Conexión a PostgreSQL establecida');

    const queryInterface = sequelize.getQueryInterface();
    const columnas = await queryInterface.describeTable('documentos');

    if (!columnas.ruta_archivo_original) {
      console.log('-> Agregando columna ruta_archivo_original a tabla documentos...');
      await queryInterface.addColumn('documentos', 'ruta_archivo_original', {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true,
        comment: 'Clave R2 de la versión original del documento para trazabilidad',
      });
      console.log('✓ Columna ruta_archivo_original agregada exitosamente');
    } else {
      console.log('✓ Columna ruta_archivo_original ya existe en documentos');
    }

    // Sincronizar de forma no destructiva
    await Documento.sync({ alter: true });
    console.log('✓ Modelo Documento sincronizado con éxito');

    console.log('─── Migración finalizada con éxito ───');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrarDocumentoR2();
}

module.exports = migrarDocumentoR2;
