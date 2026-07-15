import React, { useState, useEffect } from 'react';
import { Users, Shield, RefreshCw, AlertCircle, Check, Trash2 } from 'lucide-react';
import { useApp } from '../context/useApp';

const ROL_COLOR = {
  RECTOR:  'bg-purple-100 text-purple-800 border-purple-200',
  DECANO:  'bg-blue-100 text-blue-800 border-blue-200',
  DOCENTE: 'bg-green-100 text-green-800 border-green-200',
};

export default function GestionUsuarios() {
  const { listarUsuarios, actualizarRolUsuario, eliminarUsuario, token, usuario: usuarioActual } = useApp();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [exito, setExito] = useState(null);

  const esDecano = usuarioActual?.rol === 'DECANO';

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
      // Si el usuario actual es Decano, filtra RECTOR de la lista de roles asignables
      setRoles(esDecano ? rls.filter(r => r.nombre !== 'RECTOR') : rls);
    } catch {
      setError('No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  async function cambiarRol(usuarioId, rol_id) {
    setActualizando(usuarioId);
    setExito(null);
    try {
      const actualizado = await actualizarRolUsuario(usuarioId, rol_id);
      setUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, ...actualizado } : u));
      setExito(usuarioId);
      setTimeout(() => setExito(null), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizando(null);
    }
  }

  async function handleEliminar(u) {
    if (!window.confirm(`¿Desactivar al usuario "${u.nombre}"? No podrá iniciar sesión.`)) return;
    setEliminando(u.id);
    try {
      await eliminarUsuario(u.id);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: false } : x));
      setExito(u.id);
      setTimeout(() => setExito(null), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  }

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
              {esDecano ? 'Puedes asignar rol Docente o Decano' : 'Asigna roles a los usuarios registrados'}
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Shield size={15} className="text-navy-700" />
          <span className="text-sm font-semibold text-navy-900">Usuarios del sistema ({usuarios.length})</span>
        </div>

        {usuarios.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No hay usuarios registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rol actual</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Cambiar rol</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map(u => {
                  const rolNombre = u.rol?.nombre || '';
                  const esMismoUsuario = u.id === usuarioActual?.id;
                  const bloqueado = esMismoUsuario || !u.activo;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${esMismoUsuario ? 'bg-blue-50/30' : ''} ${!u.activo ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-navy-700 text-xs font-bold">
                              {u.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
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
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${ROL_COLOR[rolNombre] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {rolNombre}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {bloqueado ? (
                          <span className="text-xs text-gray-400 italic">
                            {esMismoUsuario ? 'No puedes cambiar tu propio rol' : 'Usuario inactivo'}
                          </span>
                        ) : roles.length > 0 ? (
                          <select
                            value={u.rol_id}
                            disabled={actualizando === u.id}
                            onChange={e => cambiarRol(u.id, parseInt(e.target.value))}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-50 bg-white"
                          >
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        {actualizando === u.id && (
                          <RefreshCw size={14} className="text-navy-500 animate-spin" />
                        )}
                        {exito === u.id && (
                          <span className="flex items-center space-x-1 text-green-600 text-xs">
                            <Check size={14} />
                            <span>Guardado</span>
                          </span>
                        )}
                        {actualizando !== u.id && exito !== u.id && (
                          <span className={`inline-block w-2 h-2 rounded-full ${u.activo ? 'bg-green-400' : 'bg-gray-300'}`} title={u.activo ? 'Activo' : 'Inactivo'} />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {!esMismoUsuario && u.activo && (
                          <button
                            onClick={() => handleEliminar(u)}
                            disabled={eliminando === u.id}
                            title="Desactivar usuario"
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {eliminando === u.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
