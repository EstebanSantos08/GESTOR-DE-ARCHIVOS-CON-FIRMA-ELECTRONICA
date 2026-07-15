const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Universidad = require('./Universidad');
const Facultad = require('./Facultad');
const Periodo = require('./Periodo');
const Criterio = require('./Criterio');
const Actividad = require('./Actividad');
const Documento = require('./Documento');

Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'rol_id', as: 'usuarios' });

Usuario.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Usuario, { foreignKey: 'facultad_id', as: 'usuarios' });
Facultad.belongsTo(Universidad, { foreignKey: 'universidad_id', as: 'universidad' });
Universidad.hasMany(Facultad, { foreignKey: 'universidad_id', as: 'facultades' });

Periodo.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Periodo, { foreignKey: 'facultad_id', as: 'periodos' });

Criterio.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });
Periodo.hasMany(Criterio, { foreignKey: 'periodo_id', as: 'criterios' });

Actividad.belongsTo(Criterio, { foreignKey: 'criterio_id', as: 'criterio' });
Criterio.hasMany(Actividad, { foreignKey: 'criterio_id', as: 'actividades' });

Documento.belongsTo(Usuario, { foreignKey: 'subido_por_id', as: 'subidoPor' });
Documento.belongsTo(Usuario, { foreignKey: 'firmante_actual_id', as: 'firmanteActual' });
Documento.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Documento.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Universidad,
  Facultad,
  Periodo,
  Criterio,
  Actividad,
  Documento,
};
