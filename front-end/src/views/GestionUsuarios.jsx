import React, { useState, useEffect } from 'react';
import {
  Users, Shield, RefreshCw, AlertCircle, Check,
  Trash2, Save, Key, Edit2, Search, Filter, UserX, UserCheck, GraduationCap,
  UserPlus, Building2, ClipboardList,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import Badge from '../components/common/Badge';
import ModalDocenteForm from '../components/modals/ModalDocenteForm';

// ─── Paleta de colores por rol ────────────────────────────────────────────────
const ROL_COLOR = {
  ADMINISTRADOR:    'bg-red-100 text-red-800 border-red-200',
  RECTOR:           'bg-purple-100 text-purple-800 border-purple-200',
  DECANO:           'bg-blue-100 text-blue-800 border-blue-200',
  SUBDECANO:        'bg-indigo-100 text-indigo-800 border-indigo-200',
  DIRECTOR_CARRERA: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  RESPONSABLE_AREA: 'bg-amber-100 text-amber-800 border-amber-200',
  DOCENTE:          'bg-green-100 text-green-800 border-green-200',
};

// ─── Paleta de colores para carreras ─────────────────────────────────────────
const CARRERA_COLOR = 'bg-indigo-100 text-indigo-800 border-indigo-200';

// ─── Roles que requieren asignación de Carrera ───────────────────────────────
const ROLES_CON_CARRERA  = ['DIRECTOR_CARRERA', 'DOCENTE'];
// ─── Roles que requieren asignación de Facultad (pero no carrera específica)
const ROLES_CON_FACULTAD = ['DECANO', 'SUBDECANO', 'RESPONSABLE_AREA'];

export default function GestionUsuarios() {
  const {
    listarUsuarios, actualizarUsuario, eliminarUsuario, adminResetPassword,
    token, usuario: usuarioActual, universidades, listarCarreras,
  } = useApp();

  const [usuarios,   setUsuarios]   = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [carrerasBD, setCarrerasBD] = useState([]); // todas las carreras de la BD
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState('');

  const [eliminando,  setEliminando]  = useState(null);
  const [usuarioReset, setUsuarioReset] = useState(null);
  const [passwordReset, setPasswordReset] = useState('');
  const [resetError,  setResetError]  = useState('');
  const [resetExito,  setResetExito]  = useState(false);
  const [reseteando,  setReseteando]  = useState(false);

  // ─── Búsqueda y filtros ───────────────────────────────────────────────────
  const [busqueda,  setBusqueda]  = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // ─── Modal Crear/Editar Docente (N:M Facultades y Actividades) ─────────────
  const [modalDocente, setModalDocente] = useState({ abierto: false, docente: null });

  // ─── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [usrs, rls, carrs] = await Promise.all([
        listarUsuarios(),
        fetch('http://localhost:3000/api/auth/roles', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : []),
        listarCarreras ? listarCarreras() : Promise.resolve([]),
      ]);
      setUsuarios(usrs);
      setRoles(rls);
      setCarrerasBD(Array.isArray(carrs) ? carrs : []);
    } catch {
      setError('No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  // ─── Activar / Desactivar ──────────────────────────────────────────────────
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

  // ─── Eliminar definitivo ───────────────────────────────────────────────────
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

  // ─── Reset de contraseña por admin ────────────────────────────────────────
  async function handleAdminReset(e) {
    e.preventDefault();
    if (!passwordReset) { setResetError('La contraseña no puede estar vacía'); return; }
    setReseteando(true);
    setResetError('');
    setResetExito(false);
    try {
      await adminResetPassword(usuarioReset.id, passwordReset);
      setResetExito(true);
      setTimeout(() => { setUsuarioReset(null); setPasswordReset(''); setResetExito(false); }, 2000);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setReseteando(false);
    }
  }

  // ─── Filtrado ──────────────────────────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase())
                       || u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = filtroRol
      ? (u.roles || []).some(r => r.id === parseInt(filtroRol))
      : true;
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
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-navy-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Gestión de Usuarios</h2>
            <p className="text-xs text-gray-500">Administra perfiles, roles, accesos y seguridad</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setModalDocente({ abierto: true, docente: null })}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-navy-900 rounded-lg hover:bg-navy-800 transition-colors shadow-xs"
          >
            <UserPlus size={14} />
            <span>Nuevo Docente</span>
          </button>
          <button
            type="button"
            onClick={cargar}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      {/* ─── Barra de Filtros ─── */}
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

      {/* ─── Tabla de Usuarios ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Shield size={15} className="text-navy-700" />
          <span className="text-sm font-semibold text-navy-900">
            Usuarios encontrados ({usuariosFiltrados.length})
          </span>
        </div>

        {usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No hay resultados para la búsqueda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Roles</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <GraduationCap size={13} />
                      <span>Carreras</span>
                    </div>
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <Building2 size={13} />
                      <span>Facultades </span>
                    </div>
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <div className="flex items-center gap-1">
                      <ClipboardList size={13} />
                      <span>Actividades </span>
                    </div>
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuariosFiltrados.map(u => {
                  const userRoles    = u.roles    || [];
                  const userCarreras = u.carreras || [];
                  const esMismoUsuario = u.id === usuarioActual?.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50/50 transition-colors
                        ${esMismoUsuario ? 'bg-blue-50/30' : ''}
                        ${!u.activo ? 'opacity-50' : ''}`}
                    >
                      {/* Nombre + email */}
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-navy-700 text-xs font-bold">
                              {((u.nombre || u.email || 'US').split(' ').filter(Boolean).map(n => n[0]).join('') || 'US').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">
                              {u.nombre}
                              {esMismoUsuario && <span className="text-blue-500 ml-1">(tú)</span>}
                              {!u.activo && <span className="text-gray-400 ml-1">(inactivo)</span>}
                            </p>
                            <p className="text-gray-400 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Roles — badges */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map(r => (
                            <Badge key={r.id} tipo={r.nombre} />
                          ))}
                          {userRoles.length === 0 && (
                            <span className="text-gray-400 text-xs">Sin roles</span>
                          )}
                        </div>
                      </td>

                      {/* Carreras — badges M:N */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userCarreras.map(c => (
                            <span
                              key={c.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CARRERA_COLOR}`}
                            >
                              {c.nombre}
                            </span>
                          ))}
                          {userCarreras.length === 0 && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Facultades — badges M:N */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.facultades && u.facultades.length > 0 ? (
                            u.facultades.map(f => (
                              <span
                                key={f.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200"
                              >
                                {f.nombre}
                              </span>
                            ))
                          ) : u.facultad?.nombre ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200">
                              {u.facultad.nombre}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actividades — badges M:N */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.actividades && u.actividades.length > 0 ? (
                            u.actividades.map(a => (
                              <span
                                key={a.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-200"
                              >
                                {a.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setModalDocente({ abierto: true, docente: u })}
                            disabled={esMismoUsuario}
                            title="Editar Perfil y Asignaciones N:M"
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
                            title={u.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                              u.activo
                                ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                          >
                            {eliminando === u.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : (u.activo ? <UserX size={14} /> : <UserCheck size={14} />)
                            }
                          </button>
                          <button
                            onClick={() => handleEliminarDefinitivo(u)}
                            disabled={eliminando === u.id || esMismoUsuario}
                            title="Eliminar permanentemente"
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

      {/* ─── Modal: Crear / Editar Docente / Usuario (N:M Facultades y Actividades) ─── */}
      <ModalDocenteForm
        isOpen={modalDocente.abierto}
        onClose={() => setModalDocente({ abierto: false, docente: null })}
        docente={modalDocente.docente}
        onSuccess={() => {
          cargar();
        }}
      />

      {/* ─── Modal: Restablecer Contraseña ─── */}
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
                  <Check size={16} /><span>Contraseña actualizada</span>
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
