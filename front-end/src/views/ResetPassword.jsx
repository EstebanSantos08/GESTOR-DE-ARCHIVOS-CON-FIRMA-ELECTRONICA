import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Shield, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function ResetPassword({ initialData }) {
  const { resetPassword, navegarA } = useApp();
  
  // En un entorno real se obtendría el token de los params de la URL
  // Para este ejemplo, lo pasamos por initialData al hacer navegarA('reset', { token })
  const tokenUrl = initialData?.token || ''; 
  
  const [token, setToken] = useState(tokenUrl);
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (passwordNueva !== passwordConfirmar) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    setErrorMsg('');
    setExito(false);

    try {
      await resetPassword(token, passwordNueva);
      setExito(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-navy-400/20 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 relative z-10">
        
        {exito ? (
          <div className="text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-navy-900 mb-2">¡Contraseña Restablecida!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Tu contraseña se ha actualizado correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              onClick={() => navegarA('login')}
              className="w-full bg-navy-900 text-white rounded-2xl py-3.5 px-4 font-semibold text-sm hover:bg-navy-800 transition-all shadow-lg shadow-navy-900/20"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => navegarA('login')}
              className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-navy-900 transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span>Volver</span>
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-900 text-white shadow-lg shadow-navy-900/30 mb-6">
                <Lock size={32} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Nueva Contraseña</h2>
              <p className="text-gray-500 text-sm mt-2">
                Ingresa tu nueva contraseña para acceder al sistema.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50/80 backdrop-blur border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Token de Seguridad</label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  readOnly={!!tokenUrl}
                  className="block w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 focus:bg-white transition-all text-sm font-medium disabled:opacity-50"
                  placeholder="Pega aquí tu token"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-navy-600 transition-colors">
                    <Shield size={18} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 focus:bg-white transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-navy-600">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-navy-600 transition-colors">
                    <Shield size={18} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={passwordConfirmar}
                    onChange={(e) => setPasswordConfirmar(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 focus:bg-white transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando || !token || !passwordNueva || !passwordConfirmar}
                className="w-full bg-navy-900 text-white rounded-2xl py-3.5 px-4 font-semibold text-sm hover:bg-navy-800 focus:ring-4 focus:ring-navy-900/20 transition-all shadow-lg shadow-navy-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
