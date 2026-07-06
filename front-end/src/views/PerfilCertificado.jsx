import React, { useState } from 'react';
import { User, Shield, Eye, EyeOff, Upload, Trash2, AlertTriangle, Check } from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

export default function PerfilCertificado() {
  const { usuario } = useApp();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [guardado, setGuardado] = useState(false);
  const [certCargado, setCertCargado] = useState(false);
  const [certNombre, setCertNombre] = useState('');
  const [certPass, setCertPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [certGuardado, setCertGuardado] = useState(false);

  function handleGuardarPerfil(e) {
    e.preventDefault();
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  }

  function handleCargarCert(e) {
    const file = e.target.files[0];
    if (file) { setCertCargado(true); setCertNombre(file.name); }
  }

  function handleGuardarCert(e) {
    e.preventDefault();
    if (!certCargado || !certPass) return;
    setCertGuardado(true);
  }

  function handleEliminarCert() {
    setCertCargado(false);
    setCertNombre('');
    setCertPass('');
    setCertGuardado(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Datos personales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center space-x-3">
          <User size={18} className="text-blue-300" />
          <h2 className="text-white font-semibold text-sm">Datos Personales</h2>
        </div>
        <form onSubmit={handleGuardarPerfil} className="p-6 space-y-5">
          {guardado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <Check size={14} className="text-green-600" />
              <span className="text-sm text-green-800">Cambios guardados correctamente</span>
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
                value={usuario.facultad || 'Universidad (sin facultad asignada)'}
                readOnly
                className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
          >
            Guardar cambios
          </button>
        </form>
      </div>

      {/* Certificado digital */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center space-x-3">
          <Shield size={18} className="text-blue-300" />
          <h2 className="text-white font-semibold text-sm">Certificado Digital</h2>
        </div>
        <div className="p-6 space-y-5">
          {/* Advertencia */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex space-x-3">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              El certificado se almacena únicamente en la memoria del navegador y se elimina automáticamente al cerrar la sesión. Nunca se envía al servidor.
            </p>
          </div>

          {/* Estado del certificado */}
          <div className={`rounded-xl p-4 border ${certGuardado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${certGuardado ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Shield size={16} className={certGuardado ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${certGuardado ? 'text-green-800' : 'text-gray-600'}`}>
                    {certGuardado ? `Certificado cargado en sesión` : 'Sin certificado cargado'}
                  </p>
                  {certGuardado && <p className="text-xs text-green-600 mt-0.5">{certNombre}</p>}
                </div>
              </div>
              {certGuardado && (
                <button
                  onClick={handleEliminarCert}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>

          {/* Formulario carga */}
          {!certGuardado && (
            <form onSubmit={handleGuardarCert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Archivo de certificado</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-navy-300 transition-colors">
                  <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                  {certCargado ? (
                    <p className="text-sm font-medium text-navy-700">{certNombre}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Selecciona tu archivo .p12 o .pfx</p>
                  )}
                  <input type="file" accept=".p12,.pfx" className="hidden" id="cert-perfil" onChange={handleCargarCert} />
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
                disabled={!certCargado || !certPass}
                className="flex items-center space-x-2 px-6 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Shield size={15} />
                <span>Cargar certificado en sesión</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

