const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('../Model');

const SALT_ROUNDS = 12;

class AuthService {
  async registrar({ nombre, email, password, rol_id }) {
    // Evita duplicar cuentas por correo antes de crear el hash de contraseña.
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) throw new Error('El email ya está registrado');

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const usuario = await Usuario.create({ nombre, email, password_hash, rol_id });
    return this._omitirPassword(usuario);
  }

  async login(email, password) {
    const usuario = await Usuario.findOne({
      where: { email, activo: true },
      include: [{ model: Rol, as: 'rol' }],
    });

    if (!usuario) throw new Error('Credenciales inválidas');

    // Se compara el password plano con el hash almacenado.
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) throw new Error('Credenciales inválidas');

    const token = this._generarToken(usuario);
    return { token, usuario: this._omitirPassword(usuario) };
  }

  _generarToken(usuario) {
    // El JWT transporta identidad y nivel de autorización para RBAC.
    return jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        nivel: usuario.rol.nivel,
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
