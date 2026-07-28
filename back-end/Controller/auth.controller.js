const { validationResult } = require('express-validator');
const authService = require('../Services/auth.service');
const { Usuario, Rol, Facultad, Carrera } = require('../Model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function login(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);
    res.json(resultado);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

async function registrar(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  try {
    const usuario = await authService.registrar(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function perfil(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Rol, as: 'rol' },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
      ],
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function registroPublico(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  try {
    const rolDocente = await Rol.findOne({ where: { nombre: 'DOCENTE' } });
    if (!rolDocente) return res.status(500).json({ error: 'Rol DOCENTE no configurado' });

    const { nombre, email, password } = req.body;
    const usuario = await authService.registrar({ nombre, email, password, rol_id: rolDocente.id });
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function listarUsuarios(req, res) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Rol, as: 'rol' },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
      ],
      order: [['id', 'ASC']],
    });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

async function actualizarRol(req, res) {
  try {
    const { rol_id } = req.body;
    if (!rol_id) return res.status(400).json({ error: 'rol_id requerido' });

    const rolDestino = await Rol.findByPk(rol_id);
    if (!rolDestino) return res.status(400).json({ error: 'Rol no encontrado' });

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await usuario.update({ rol_id });
    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Rol, as: 'rol' },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
      ],
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function eliminarUsuario(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (usuario.id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    await usuario.update({ activo: false });
    res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function actualizarUsuario(req, res) {
  try {
    const { nombre, email, facultad_id, carrera_id, rol_id } = req.body;
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (email && email !== usuario.email) {
      const existe = await Usuario.findOne({ where: { email } });
      if (existe) return res.status(400).json({ error: 'El email ya está en uso' });
    }

    const esAdmin = req.usuario.rol === 'ADMINISTRADOR';
    const esElMismo = req.usuario.id === parseInt(req.params.id);

    if (!esAdmin && !esElMismo) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este usuario' });
    }

    const camposActualizar = {};
    if (nombre !== undefined) camposActualizar.nombre = nombre;
    
    // Solo admin puede cambiar cosas críticas
    if (esAdmin) {
      if (email !== undefined) camposActualizar.email = email;
      if (facultad_id !== undefined) camposActualizar.facultad_id = facultad_id;
      if (carrera_id !== undefined) camposActualizar.carrera_id = carrera_id;
      if (rol_id !== undefined) camposActualizar.rol_id = rol_id;
    }

    await usuario.update(camposActualizar);
    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Rol, as: 'rol' },
        { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        { model: Carrera, as: 'carrera', attributes: ['id', 'nombre'] },
      ],
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function cambiarPassword(req, res) {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const esValido = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!esValido) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    const password_hash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ password_hash });
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function solicitarRecuperacion(req, res) {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const exp = new Date(Date.now() + 3600000); // 1 hora
    await usuario.update({ reset_token: token, reset_token_exp: exp });

    console.log(`[RECUPERACION] Token para ${email}: ${token}`);
    res.json({ mensaje: 'Se ha generado el token de recuperación', token_simulado: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, passwordNueva } = req.body;
    const { Op } = require('sequelize');
    
    const usuario = await Usuario.findOne({ 
      where: { 
        reset_token: token, 
        reset_token_exp: { [Op.gt]: new Date() } 
      } 
    });

    if (!usuario) return res.status(400).json({ error: 'Token inválido o expirado' });

    const password_hash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ 
      password_hash, 
      reset_token: null, 
      reset_token_exp: null 
    });

    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function adminResetPassword(req, res) {
  try {
    const { id } = req.params;
    const { passwordNueva } = req.body;
    if (!passwordNueva) return res.status(400).json({ error: 'La nueva contraseña es requerida' });

    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const password_hash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ password_hash });
    res.json({ mensaje: 'Contraseña del usuario actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { 
  login, registrar, registroPublico, perfil, listarUsuarios, 
  actualizarRol, eliminarUsuario, actualizarUsuario,
  cambiarPassword, solicitarRecuperacion, resetPassword, adminResetPassword
};
