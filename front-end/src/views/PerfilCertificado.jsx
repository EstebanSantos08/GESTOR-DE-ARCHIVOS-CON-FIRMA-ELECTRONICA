import React, { useState } from 'react';
import { User, Shield, Eye, EyeOff, Upload, Trash2, AlertTriangle, Check, AlertCircle, Key } from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

export default function PerfilCertificado() {
  const { usuario, certBase64, cargarCertificado, limpiarCertificado, actualizarUsuario, cambiarPassword } = useApp();

  const [nombre, setNombre] = useState(usuario.nombre);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilGuardado, setPerfilGuardado] = useState(false);
  const [perfilError, setPerfilError] = useState('');

  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirmar, setPassConfirmar] = useState('');
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [passGuardado, setPassGuardado] = useState(false);
  const [passError, setPassError] = useState('');

  const [certFile, setCertFile] = useState(null);
  const [certNombre, setCertNombre] = useState('');
  const [certPass, setCertPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [cargandoCert, setCargandoCert] = useState(false);
  const [certError, setCertError] = useState('');
  const [certExito, setCertExito] = useState(false);

  async function handleGuardarPerfil(e) {
    e.preventDefault();
    setGuardandoPerfil(true);
    setPerfilError('');
    try {
      await actualizarUsuario(usuario.id, { nombre });
      setPerfilGuardado(true);
      setTimeout(() => setPerfilGuardado(false), 3000);
    } catch (err) {
      setPerfilError(err.message);
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function handleCambiarPass(e) {
    e.preventDefault();
    if (passNueva !== passConfirmar) {
      setPassError('Las contraseñas nuevas no coinciden');
      return;
    }
    setCambiandoPass(true);
    setPassError('');
    try {
      await cambiarPassword(passActual, passNueva);
      setPassGuardado(true);
      setPassActual('');
      setPassNueva('');
      setPassConfirmar('');
      setTimeout(() => setPassGuardado(false), 3000);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setCambiandoPass(false);
    }
  }

  function handleSeleccionarCert(e) {
    const file = e.target.files[0];
    if (file) {
      setCertFile(file);
      setCertNombre(file.name);
      setCertError('');
      setCertExito(false);
    }
  }

  async function handleGuardarCert(e) {
    e.preventDefault();
    if (!certFile || !certPass) return;
    setCargandoCert(true);
    setCertError('');
    try {
      await cargarCertificado(certFile, certPass);
      setCertExito(true);
      setCertPass('');
    } catch (err) {
      setCertError(err.message || 'Error al cargar el certificado');
    } finally {
      setCargandoCert(false);
    }
  }

  function handleEliminarCert() {
    limpiarCertificado();
    setCertFile(null);
    setCertNombre('');
    setCertPass('');
    setCertExito(false);
    setCertError('');
  }

  const certActivo = !!certBase64;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Datos personales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center space-x-3">
          <User size={18} className="text-blue-300" />
          <h2 className="text-white font-semibold text-sm">Datos Personales</h2>
        </div>
        <form onSubmit={handleGuardarPerfil} className="p-6 space-y-5">
          {perfilGuardado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <Check size={14} className="text-green-600" />
              <span className="text-sm text-green-800">Cambios guardados correctamente</span>
            </div>
          )}
          {perfilError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-sm text-red-700">{perfilError}</span>
            </div>
          )}

          <div className="flex items-center space-x-4 pb-5 border-b border-gray-100">
            <div className="w-16 h-16 bg-navy-900 rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">{usuario.avatar}</span>
            </div>
            <div>
              <p className="font-semibold text-navy-900">{usuario.nombre}</p>
              <Badge tipo={usuario.rol} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre completo</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Correo electrónico</label>
              <input
                value={usuario.email}
                readOnly
                className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Rol</label>
              <div className="border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50">
                <Badge tipo={usuario.rol} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Facultad</label>
              <input
                value={usuario.facultad || 'Sin facultad asignada'}
                readOnly
                className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardandoPerfil}
            className="px-6 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Cambiar Contraseña */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center space-x-3">
          <Key size={18} className="text-blue-300" />
          <h2 className="text-white font-semibold text-sm">Cambiar Contraseña</h2>
        </div>
        <form onSubmit={handleCambiarPass} className="p-6 space-y-5">
          {passGuardado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <Check size={14} className="text-green-600" />
              <span className="text-sm text-green-800">Contraseña actualizada correctamente</span>
            </div>
          )}
          {passError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-sm text-red-700">{passError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contraseña actual</label>
              <input
                type="password"
                value={passActual}
                onChange={e => setPassActual(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={passNueva}
                onChange={e => setPassNueva(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passConfirmar}
                onChange={e => setPassConfirmar(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cambiandoPass || !passActual || !passNueva || !passConfirmar}
            className="px-6 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {cambiandoPass ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* Certificado digital */}
      {(usuario.rol === 'DECANO' || usuario.rol === 'RECTOR') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-navy-900 px-6 py-4 flex items-center space-x-3">
            <Shield size={18} className="text-blue-300" />
            <h2 className="text-white font-semibold text-sm">Certificado Digital para Firma</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex space-x-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Tu certificado <strong>.p12</strong> se carga en memoria durante la sesión y se usa al momento de firmar documentos. Se elimina automáticamente al cerrar sesión.
              </p>
            </div>

            {/* Estado actual */}
            <div className={`rounded-xl p-4 border ${certActivo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${certActivo ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Shield size={16} className={certActivo ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${certActivo ? 'text-green-800' : 'text-gray-600'}`}>
                      {certActivo ? 'Certificado cargado — listo para firmar' : 'Sin certificado cargado'}
                    </p>
                    {certActivo && certNombre && (
                      <p className="text-xs text-green-600 mt-0.5">{certNombre}</p>
                    )}
                  </div>
                </div>
                {certActivo && (
                  <button
                    onClick={handleEliminarCert}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Quitar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formulario carga */}
            {!certActivo && (
              <form onSubmit={handleGuardarCert} className="space-y-4">
                {certError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{certError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Archivo de certificado (.p12 / .pfx)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-navy-300 transition-colors">
                    <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                    {certFile ? (
                      <p className="text-sm font-medium text-navy-700">{certNombre}</p>
                    ) : (
                      <p className="text-sm text-gray-400">Selecciona tu archivo .p12 o .pfx</p>
                    )}
                    <input type="file" accept=".p12,.pfx" className="hidden" id="cert-perfil" onChange={handleSeleccionarCert} />
                    <label htmlFor="cert-perfil" className="mt-2 inline-block px-4 py-1.5 bg-navy-50 text-navy-700 text-xs font-medium rounded-lg cursor-pointer hover:bg-navy-100 transition-colors">
                      Examinar
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contraseña del certificado</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={certPass}
                      onChange={e => setCertPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!certFile || !certPass || cargandoCert}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Shield size={15} />
                  <span>{cargandoCert ? 'Cargando...' : 'Cargar certificado en sesión'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
