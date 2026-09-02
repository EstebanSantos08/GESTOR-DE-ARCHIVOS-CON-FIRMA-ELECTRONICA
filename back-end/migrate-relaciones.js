require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const {
  sequelize,
  Facultad,
  Carrera,
  Usuario,
  Actividad,
  UsuarioFacultad,
  UsuarioActividad,
} = require('./Model');

/**
 * Script de migración segura de relaciones:
 * 1. Asegura la columna facultad_id / facultadId en Carreras.
 * 2. Crea / actualiza las tablas intermedias UsuarioFacultad y UsuarioActividad.
 * 3. Ejecuta sync con { alter: true } preservando todos los registros existentes.
 */
async function migrarRelaciones() {
  console.log('─── Iniciando migración de relaciones en la base de datos ───');
  
  try {
    await sequelize.authenticate();
    console.log('✓ Conexión a PostgreSQL establecida correctamente');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Verificar columnas en tabla 'carreras'
    console.log('1. Verificando estructura de la tabla carreras...');
    const carrerasCols = await queryInterface.describeTable('carreras');
    
    if (!carrerasCols.facultad_id && !carrerasCols.facultadId) {
      console.log('  -> Agregando columna facultad_id a carreras...');
      await queryInterface.addColumn('carreras', 'facultad_id', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'facultades',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      console.log('  ✓ Columna facultad_id añadida a carreras');
    } else {
      console.log('  ✓ Columna de relación de Facultad presente en carreras');
    }

    // 2. Sincronizar modelos involucrados con { alter: true } de forma no destructiva
    console.log('2. Sincronizando modelo Facultad...');
    await Facultad.sync({ alter: true });

    console.log('3. Sincronizando modelo Carrera...');
    await Carrera.sync({ alter: true });

    console.log('4. Sincronizando modelo Usuario...');
    await Usuario.sync({ alter: true });

    console.log('5. Sincronizando modelo Actividad...');
    await Actividad.sync({ alter: true });

    console.log('6. Sincronizando tabla intermedia UsuarioFacultad...');
    await UsuarioFacultad.sync({ alter: true });
    console.log('  ✓ Tabla usuario_facultades sincronizada');

    console.log('7. Sincronizando tabla intermedia UsuarioActividad...');
    await UsuarioActividad.sync({ alter: true });
    console.log('  ✓ Tabla usuario_actividades sincronizada');

    console.log('8. Verificando estructura de la tabla pasos_firma...');
    const pasosCols = await queryInterface.describeTable('pasos_firma');
    if (!pasosCols.usuario_id && !pasosCols.usuarioId) {
      console.log('  -> Agregando columna usuario_id a pasos_firma...');
      await queryInterface.addColumn('pasos_firma', 'usuario_id', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      console.log('  ✓ Columna usuario_id añadida a pasos_firma');
    } else {
      console.log('  ✓ Columna usuario_id presente en pasos_firma');
    }

    const { PasoFirma } = require('./Model');
    await PasoFirma.sync({ alter: true });
    console.log('  ✓ Modelo PasoFirma sincronizado');

    // 9. Sincronización global segura
    console.log('9. Ejecutando sequelize.sync({ alter: true }) seguro...');
    await sequelize.sync({ alter: true });
    console.log('  ✓ Esquema de base de datos actualizado con éxito');

    console.log('\n─── Migración completada exitosamente sin purgar datos existentes ───');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada');
  }
}

if (require.main === module) {
  migrarRelaciones();
}

module.exports = migrarRelaciones;
