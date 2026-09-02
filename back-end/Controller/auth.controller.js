const { validationResult } = require('express-validator');
const { sequelize } = require('../Model');
const authService = require('../Services/auth.service');
const { Usuario, Rol, Facultad, Carrera, Actividad } = require('../Model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─── Include estándar para devolver un usuario completo ───────────────────────
// Reutilizado en perfil, listar, actualizar, etc.
const INCLUDE_USUARIO_COMPLETO = [
  { model: Rol,    as: 'roles' },
  { model: Facultad, as: 'facultades', through: { attributes: [] } },
  { model: Actividad, as: 'actividades', through: { attributes: [] } },
  { model: Facultad, as: 'facultad', attributes: ['id', 'nombre'], required: false },
  { model: Carrera,  as: 'carreras', attributes: ['id', 'nombre'], through: { attributes: [] } },
];

// ─── Login ────────────────────────────────────────────────────────────────────
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

// ─── Registro administrativo (solo ADMIN) ────────────────────────────────────
// Body esperado: { nombre, email, password, roles: [id], carreras: [id], facultades?: [id], actividades?: [id], facultad_id? }
async function registrar(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  try {
    const { nombre, email, password, roles, rol_id, carreras, facultad_id, facultades, actividades } = req.body;

    const rolesInput     = roles !== undefined ? roles : (rol_id !== undefined ? [rol_id] : []);
    const rolesIds       = Array.isArray(rolesInput)  ? rolesInput.map(Number)  : (rolesInput  ? [Number(rolesInput)]  : []);
    const carrerasIds    = Array.isArray(carreras)    ? carreras.map(Number)    : (carreras    ? [Number(carreras)]    : []);
    const facultadesIds  = Array.isArray(facultades)  ? facultades.map(Number)  : (facultades  ? [Number(facultades)]  : []);
    const actividadesIds = Array.isArray(actividades) ? actividades.map(Number) : (actividades ? [Number(actividades)] : []);

    const usuario = await authService.registrar({
      nombre, email, password,
      roles: rolesIds,
      carreras: carrerasIds,
      facultades: facultadesIds,
      actividades: actividadesIds,
      facultad_id: facultad_id || null,
    });
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── Registro público (asigna rol DOCENTE automáticamente) ───────────────────
// Body esperado: { nombre, email, password, carreras?: [id] }
async function registroPublico(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

  try {
    const rolDocente = await Rol.findOne({ where: { nombre: 'DOCENTE' } });
    if (!rolDocente) return res.status(500).json({ error: 'Rol DOCENTE no configurado' });

    const { nombre, email, password, carreras } = req.body;
    const carrerasIds = Array.isArray(carreras) ? carreras.map(Number) : [];

    const usuario = await authService.registrar({
      nombre, email, password,
      roles: [rolDocente.id],
      carreras: carrerasIds,
    });
    res.status(201).json(usuario);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── Perfil del usuario autenticado ──────────────────────────────────────────
async function perfil(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['password_hash'] },
      include: INCLUDE_USUARIO_COMPLETO,
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── Listar todos los usuarios (solo ADMIN) ───────────────────────────────────
async function listarUsuarios(req, res) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      include: INCLUDE_USUARIO_COMPLETO,
      order: [['id', 'ASC']],
    });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

// ─── Obtener usuario por ID (con facultades, actividades, carreras, roles) ───
async function obtenerUsuario(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: INCLUDE_USUARIO_COMPLETO,
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario: ' + err.message });
  }
}

// ─── Actualizar solo roles (PUT /usuarios/:id/rol) ────────────────────────────
async function actualizarRol(req, res) {
  try {
    const { roles } = req.body;
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'roles array requerido' });
    }

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await usuario.setRoles(roles);

    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: INCLUDE_USUARIO_COMPLETO,
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── Actualizar usuario completo (PUT /usuarios/:id) ─────────────────────────
// Body soportado: { nombre, email, facultad_id, roles: [id], carreras: [id] }
async function actualizarUsuario(req, res) {
  try {
    const { nombre, email, facultad_id, roles, carreras, facultades, actividades } = req.body;
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (email && email !== usuario.email) {
      const existe = await Usuario.findOne({ where: { email } });
      if (existe) return res.status(400).json({ error: 'El email ya está en uso' });
    }

    const esAdmin   = req.usuario.roles && req.usuario.roles.includes('ADMINISTRADOR');
    const esElMismo = req.usuario.id === parseInt(req.params.id);

    if (!esAdmin && !esElMismo) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este usuario' });
    }

    // Helper: convierte strings vacíos o no numéricos en null
    const toIntOrNull = (val) => {
      if (val === undefined) return undefined;
      if (val === null || val === '' || String(val).trim() === '') return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    // Dentro de una transacción: actualiza campos escalares + pivotes M:N
    await sequelize.transaction(async (t) => {
      const camposActualizar = {};
      if (nombre !== undefined && nombre !== null) camposActualizar.nombre = nombre;

      if (esAdmin) {
        if (email !== undefined) camposActualizar.email = email;
        if (facultad_id !== undefined) camposActualizar.facultad_id = toIntOrNull(facultad_id);

        // Roles: array de IDs
        if (roles !== undefined && Array.isArray(roles)) {
          await usuario.setRoles(roles.map(Number), { transaction: t });
        }

        // Carreras: array de IDs (reemplaza las asignaciones previas)
        if (carreras !== undefined && Array.isArray(carreras)) {
          await usuario.setCarreras(carreras.map(Number), { transaction: t });
        }

        // Facultades: array de IDs (M:N)
        if (facultades !== undefined && Array.isArray(facultades)) {
          await usuario.setFacultades(facultades.map(Number), { transaction: t });
        }

        // Actividades: array de IDs (M:N)
        if (actividades !== undefined && Array.isArray(actividades)) {
          await usuario.setActividades(actividades.map(Number), { transaction: t });
        }
      }

      if (Object.keys(camposActualizar).length > 0) {
        await usuario.update(camposActualizar, { transaction: t });
      }
    });

    const actualizado = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: INCLUDE_USUARIO_COMPLETO,
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── Eliminar / Desactivar usuario (DELETE /usuarios/:id) ─────────────────────
async function eliminarUsuario(req, res) {
  try {
    const { Indicador, Documento } = require('../Model');
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (usuario.id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const hardDelete = req.query.hard === 'true' || req.body?.hard === true;

    if (hardDelete) {
      // Desvincular de Documentos para evitar violación de FK
      await Documento.update({ firmante_actual_id: null }, { where: { firmante_actual_id: usuario.id } });
      await Documento.update({ subido_por_id: null },      { where: { subido_por_id: usuario.id } });

      await usuario.destroy();
      return res.json({ mensaje: 'Usuario eliminado permanentemente', id: req.params.id, hard: true });
    } else {
      const nuevoEstado = req.body?.activo !== undefined ? req.body.activo : !usuario.activo;
      await usuario.update({ activo: nuevoEstado });
      return res.json({ mensaje: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`, activo: nuevoEstado });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Cambiar contraseña propia ────────────────────────────────────────────────
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

// ─── Solicitar recuperación de contraseña ────────────────────────────────────
async function solicitarRecuperacion(req, res) {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const exp   = new Date(Date.now() + 3600000); // 1 hora
    await usuario.update({ reset_token: token, reset_token_exp: exp });

    console.log(`[RECUPERACION] Token para ${email}: ${token}`);
    res.json({ mensaje: 'Se ha generado el token de recuperación', token_simulado: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Reset de contraseña con token ───────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    const { token, passwordNueva } = req.body;
    const { Op } = require('sequelize');

    const usuario = await Usuario.findOne({
      where: {
        reset_token: token,
        reset_token_exp: { [Op.gt]: new Date() },
      },
    });

    if (!usuario) return res.status(400).json({ error: 'Token inválido o expirado' });

    const password_hash = await bcrypt.hash(passwordNueva, 10);
    await usuario.update({ password_hash, reset_token: null, reset_token_exp: null });

    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Reset de contraseña por admin ───────────────────────────────────────────
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
  login, registrar, registroPublico, perfil, listarUsuarios, obtenerUsuario,
  actualizarRol, eliminarUsuario, actualizarUsuario,
  cambiarPassword, solicitarRecuperacion, resetPassword, adminResetPassword,
};
