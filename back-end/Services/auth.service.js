const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Rol, Carrera, Facultad, Actividad } = require('../Model');

const SALT_ROUNDS = 12;

class AuthService {
  /**
   * Registra un nuevo usuario dentro de una transacción Sequelize.
   * Acepta arrays de IDs de roles, carreras, facultades y actividades
   * para popular las tablas pivote de forma atómica.
   *
   * @param {object} datos
   * @param {string}   datos.nombre
   * @param {string}   datos.email
   * @param {string}   datos.password
   * @param {number[]} [datos.roles]       - Array de rol_id a asignar
   * @param {number[]} [datos.carreras]    - Array de carrera_id a asignar
   * @param {number[]} [datos.facultades]  - Array de facultad_id a asignar (M:N)
   * @param {number[]} [datos.actividades] - Array de actividad_id a asignar (M:N)
   * @param {number}   [datos.facultad_id]
   */
  async registrar({ nombre, email, password, roles = [], carreras = [], facultades = [], actividades = [], facultad_id = null }) {
    // Evita duplicar cuentas por correo antes de crear el hash de contraseña.
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) throw new Error('El email ya está registrado');

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Transacción: crea el usuario y puebla las tablas pivote de forma atómica.
    const usuario = await sequelize.transaction(async (t) => {
      const u = await Usuario.create(
        { nombre, email, password_hash, facultad_id },
        { transaction: t }
      );

      if (roles.length > 0) {
        await u.setRoles(roles, { transaction: t });
      }

      if (carreras.length > 0) {
        await u.setCarreras(carreras, { transaction: t });
      }

      if (facultades.length > 0) {
        await u.setFacultades(facultades, { transaction: t });
      }

      if (actividades.length > 0) {
        await u.setActividades(actividades, { transaction: t });
      }

      return u;
    });

    // Recargamos el usuario con roles, carreras, facultades y actividades.
    const usuarioCompleto = await Usuario.findByPk(usuario.id, {
      include: [
        { model: Rol, as: 'roles' },
        { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'] },
        { model: Facultad, as: 'facultades', through: { attributes: [] } },
        { model: Actividad, as: 'actividades', through: { attributes: [] } },
      ],
    });

    return this._omitirPassword(usuarioCompleto);
  }

  /**
   * Login: carga roles + carreras del usuario para incluirlos en el JWT.
   */
  async login(email, password) {
    const usuario = await Usuario.findOne({
      where: { email, activo: true },
      include: [
        { model: Rol, as: 'roles' },
        { model: Carrera, as: 'carreras', attributes: ['id', 'nombre'] },
      ],
    });

    if (!usuario) throw new Error('Credenciales inválidas');

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) throw new Error('Credenciales inválidas');

    const token = this._generarToken(usuario);
    return { token, usuario: this._omitirPassword(usuario) };
  }

  /**
   * Genera el payload del JWT incluyendo:
   *   - roles[]    → nombres de los roles del usuario
   *   - nivel      → nivel máximo jerárquico
   *   - carreras[] → objetos { id, nombre } de las carreras asignadas
   */
  _generarToken(usuario) {
    const rolesArray = (usuario.roles || []).map(r => r.nombre);
    const maxNivel   = (usuario.roles || []).reduce((max, r) => Math.max(max, r.nivel), 0);
    const carrerasArray = (usuario.carreras || []).map(c => ({ id: c.id, nombre: c.nombre }));

    return jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        roles: rolesArray,
        nivel: maxNivel,
        carreras: carrerasArray,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
  }

  verificarToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  _omitirPassword(usuario) {
    // Nunca devolvemos el hash al cliente, aunque venga de Sequelize.
    const data = usuario.toJSON ? usuario.toJSON() : { ...usuario };
    delete data.password_hash;
    return data;
  }
}

module.exports = new AuthService();
