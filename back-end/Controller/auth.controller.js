const { validationResult } = require('express-validator');
const authService = require('../Services/auth.service');
const { Usuario, Rol } = require('../Model');
const bcrypt = require('bcryptjs');

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
      include: [{ model: Rol, as: 'rol' }],
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
      include: [{ model: Rol, as: 'rol' }],
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

    // El Decano solo puede asignar el rol DECANO, no RECTOR
    if (req.usuario.rol === 'DECANO' && rolDestino.nombre === 'RECTOR') {
      return res.status(403).json({ error: 'El Decano no puede asignar el rol de Rector' });
    }

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await usuario.update({ rol_id });
    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Rol, as: 'rol' }],
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
    const { nombre, email } = req.body;
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (email && email !== usuario.email) {
      const existe = await Usuario.findOne({ where: { email } });
      if (existe) return res.status(400).json({ error: 'El email ya está en uso' });
    }

    await usuario.update({ nombre, email });
    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Rol, as: 'rol' }],
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { login, registrar, registroPublico, perfil, listarUsuarios, actualizarRol, eliminarUsuario, actualizarUsuario };
