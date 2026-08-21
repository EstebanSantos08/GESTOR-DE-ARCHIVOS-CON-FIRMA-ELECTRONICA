import React, { useState, useEffect } from 'react';
import { Users, Shield, RefreshCw, AlertCircle, Check, Trash2, Save, Key, Edit2, Search, Filter, Power, UserX, UserCheck } from 'lucide-react';
import { useApp } from '../context/useApp';

const ROL_COLOR = {
  ADMINISTRADOR:    'bg-red-100 text-red-800 border-red-200',
  RECTOR:           'bg-purple-100 text-purple-800 border-purple-200',
  DECANO:           'bg-blue-100 text-blue-800 border-blue-200',
  SUBDECANO:        'bg-indigo-100 text-indigo-800 border-indigo-200',
  DIRECTOR_CARRERA: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  RESPONSABLE_AREA: 'bg-amber-100 text-amber-800 border-amber-200',
  DOCENTE:          'bg-green-100 text-green-800 border-green-200',
};

export default function GestionUsuarios() {
  const { listarUsuarios, actualizarUsuario, eliminarUsuario, adminResetPassword, token, usuario: usuarioActual, universidades } = useApp();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  const [eliminando, setEliminando] = useState(null);

  const [usuarioReset, setUsuarioReset] = useState(null);
  const [passwordReset, setPasswordReset] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetExito, setResetExito] = useState(false);
  const [reseteando, setReseteando] = useState(false);

  // Busqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Edición de usuario
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', email: '', roles: [], facultad_id: '', carrera_id: '' });
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState('');
  const [editExito, setEditExito] = useState(false);

  const facultades = universidades.flatMap(u => u.facultades) || [];
  const carreras = facultades.flatMap(f => f.carreras) || [];

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [usrs, rls] = await Promise.all([
        listarUsuarios(),
        fetch('http://localhost:3000/api/auth/roles', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : []),
      ]);
      setUsuarios(usrs);
      setRoles(rls);
    } catch {
      setError('No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  function abrirModalEditar(u) {
    setUsuarioEditar(u);
    setEditForm({
      nombre: u.nombre,
      email: u.email,
      roles: u.roles ? u.roles.map(r => r.id) : [],
      facultad_id: u.facultad_id || '',
      carrera_id: u.carrera_id || '',
    });
    setEditError('');
    setEditExito(false);
  }

  function handleRoleToggle(rolId) {
    setEditForm(prev => {
      const rolesActuales = prev.roles || [];
      const nuevosRoles = rolesActuales.includes(rolId)
        ? rolesActuales.filter(id => id !== rolId)
        : [...rolesActuales, rolId];

      const rolesNombres = roles.filter(r => nuevosRoles.includes(r.id)).map(r => r.nombre);
      
      let fac_id = prev.facultad_id;
      let carr_id = prev.carrera_id;

      if (rolesNombres.includes('RECTOR') || rolesNombres.includes('ADMINISTRADOR')) {
        fac_id = null;
        carr_id = null;
      } else if (rolesNombres.includes('DECANO') || rolesNombres.includes('SUBDECANO') || rolesNombres.includes('RESPONSABLE_AREA')) {
        carr_id = null;
      }

      return { ...prev, roles: nuevosRoles, facultad_id: fac_id, carrera_id: carr_id };
    });
  }

  function handleEditChange(campo, valor) {
    setEditForm(prev => {
      let valProcesado = valor;
      if (valor === '' || valor === null || valor === undefined) {
        valProcesado = null;
      } else if (campo === 'facultad_id' || campo === 'carrera_id') {
        const parsed = parseInt(valor, 10);
        valProcesado = isNaN(parsed) ? null : parsed;
      }
      return { ...prev, [campo]: valProcesado };
    });
  }

  async function handleGuardarEditar(e) {
    e.preventDefault();
    setGuardando(true);
    setEditError('');
    setEditExito(false);
    try {
      const payloadLimpiado = {
        ...editForm,
        facultad_id: (editForm.facultad_id === '' || editForm.facultad_id === null || isNaN(editForm.facultad_id)) ? null : parseInt(editForm.facultad_id, 10),
        carrera_id: (editForm.carrera_id === '' || editForm.carrera_id === null || isNaN(editForm.carrera_id)) ? null : parseInt(editForm.carrera_id, 10),
        roles: editForm.roles,
      };
      const actualizado = await actualizarUsuario(usuarioEditar.id, payloadLimpiado);
      setUsuarios(prev => prev.map(u => u.id === usuarioEditar.id ? { ...u, ...actualizado } : u));
      setEditExito(true);
      setTimeout(() => {
        setUsuarioEditar(null);
      }, 1500);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleActivo(u) {
    const accion = u.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Deseas ${accion} al usuario "${u.nombre}"?`)) return;
    setEliminando(u.id);
    try {
      const res = await eliminarUsuario(u.id, false);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: res.activo ?? !u.activo } : x));
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  }

  async function handleEliminarDefinitivo(u) {
    if (!window.confirm(`⚠️ ATENCIÓN: ¿Deseas ELIMINAR PERMANENTEMENTE a "${u.nombre}" de la base de datos?\nEsta acción borrará totalmente la cuenta y no se puede deshacer.`)) return;
    setEliminando(u.id);
    try {
      await eliminarUsuario(u.id, true);
      setUsuarios(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  }

  async function handleAdminReset(e) {
    e.preventDefault();
    if (!passwordReset) {
      setResetError('La contraseña no puede estar vacía');
      return;
    }
    setReseteando(true);
    setResetError('');
    setResetExito(false);
    try {
      await adminResetPassword(usuarioReset.id, passwordReset);
      setResetExito(true);
      setTimeout(() => {
        setUsuarioReset(null);
        setPasswordReset('');
        setResetExito(false);
      }, 2000);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setReseteando(false);
    }
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = filtroRol ? (u.roles || []).some(r => r.id === parseInt(filtroRol)) : true;
    return matchBusqueda && matchRol;
  });

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="text-navy-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-navy-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Gestión de Usuarios</h2>
            <p className="text-xs text-gray-500">
              Administra perfiles, roles, accesos y seguridad
            </p>
          </div>
        </div>
        <button
          onClick={cargar}
          className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} />
          <span>Recargar</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
          >
            <option value="">Todos los roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Shield size={15} className="text-navy-700" />
          <span className="text-sm font-semibold text-navy-900">Usuarios encontrados ({usuariosFiltrados.length})</span>
        </div>

        {usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No hay resultados para la búsqueda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Asignación</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuariosFiltrados.map(u => {
                  const userRoles = u.roles || [];
                  const esMismoUsuario = u.id === usuarioActual?.id;
                  
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${esMismoUsuario ? 'bg-blue-50/30' : ''} ${!u.activo ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-navy-700 text-xs font-bold">
                              {((u.nombre || u.email || 'US').split(' ').filter(Boolean).map(n => n[0]).join('') || 'US').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">
                              {u.nombre} {esMismoUsuario && <span className="text-blue-500">(tú)</span>}
                              {!u.activo && <span className="text-gray-400 ml-1">(inactivo)</span>}
                            </p>
                            <p className="text-gray-400 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map(r => (
                            <span key={r.id} className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${ROL_COLOR[r.nombre] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {r.nombre}
                            </span>
                          ))}
                          {userRoles.length === 0 && <span className="text-gray-400 text-xs">Sin roles</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {u.carrera?.nombre || u.facultad?.nombre || 'General'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => abrirModalEditar(u)}
                            disabled={esMismoUsuario}
                            title="Editar Perfil"
                            className="p-1.5 text-gray-500 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setUsuarioReset(u)}
                            disabled={!u.activo || esMismoUsuario}
                            title="Restablecer contraseña"
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActivo(u)}
                            disabled={eliminando === u.id || esMismoUsuario}
                            title={u.activo ? "Desactivar usuario (deshabilita acceso)" : "Reactivar usuario"}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                              u.activo
                                ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                          >
                            {eliminando === u.id ? <RefreshCw size={14} className="animate-spin" /> : (u.activo ? <UserX size={14} /> : <UserCheck size={14} />)}
                          </button>
                          <button
                            onClick={() => handleEliminarDefinitivo(u)}
                            disabled={eliminando === u.id || esMismoUsuario}
                            title="Eliminar permanentemente de la base de datos"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Editar Perfil */}
      {usuarioEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setUsuarioEditar(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-navy-900 mb-4">Editar Usuario</h3>
            <form onSubmit={handleGuardarEditar} className="space-y-4">
              {editExito && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center space-x-2">
                  <Check size={16} />
                  <span>Usuario actualizado</span>
                </div>
              )}
              {editError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={editForm.nombre}
                    onChange={e => handleEditChange('nombre', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={e => handleEditChange('email', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Roles</label>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 space-y-2">
                    {roles.map(r => (
                      <label key={r.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={editForm.roles?.includes(r.id)}
                          onChange={() => handleRoleToggle(r.id)}
                          className="rounded text-navy-600 focus:ring-navy-500"
                        />
                        <span className="text-sm text-gray-700">{r.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {roles.some(r => editForm.roles?.includes(r.id) && ['DECANO', 'SUBDECANO', 'RESPONSABLE_AREA'].includes(r.nombre)) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Facultad</label>
                    <select
                      value={editForm.facultad_id || ''}
                      onChange={e => handleEditChange('facultad_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy-500 bg-white"
                    >
                      <option value="">Seleccione facultad...</option>
                      {facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </div>
                )}

                {roles.some(r => editForm.roles?.includes(r.id) && ['DIRECTOR_CARRERA', 'DOCENTE'].includes(r.nombre)) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Carrera</label>
                    <select
                      value={editForm.carrera_id || ''}
                      onChange={e => handleEditChange('carrera_id', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy-500 bg-white"
                    >
                      <option value="">Seleccione carrera...</option>
                      {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setUsuarioEditar(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 px-4 py-2 bg-navy-900 text-white rounded-lg text-sm hover:bg-navy-800 disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restablecer Contraseña */}
      {usuarioReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !reseteando && setUsuarioReset(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold text-navy-900">Restablecer Contraseña</h3>
            <p className="text-sm text-gray-500">
              Vas a cambiar la contraseña del usuario <strong className="text-navy-700">{usuarioReset.nombre}</strong>.
            </p>
            <form onSubmit={handleAdminReset}>
              {resetExito ? (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center space-x-2">
                  <Check size={16} />
                  <span>Contraseña actualizada</span>
                </div>
              ) : (
                <>
                  {resetError && <p className="text-red-500 text-xs mb-2">{resetError}</p>}
                  <input
                    type="text"
                    placeholder="Nueva contraseña"
                    value={passwordReset}
                    onChange={e => setPasswordReset(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 mb-4"
                  />
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => { setUsuarioReset(null); setResetError(''); }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={reseteando || !passwordReset}
                      className="flex-1 px-4 py-2 bg-navy-900 text-white rounded-lg text-sm hover:bg-navy-800 disabled:opacity-50"
                    >
                      {reseteando ? 'Guardando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
