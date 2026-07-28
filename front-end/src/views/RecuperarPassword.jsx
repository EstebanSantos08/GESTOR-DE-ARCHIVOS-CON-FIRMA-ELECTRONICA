import React, { useState } from 'react';
import { Mail, ArrowLeft, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function RecuperarPassword() {
  const { solicitarRecuperacion, navegarA } = useApp();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenSimulado, setTokenSimulado] = useState(''); // Solo para pruebas en entorno local sin SMTP

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg('');
    setExito(false);
    setTokenSimulado('');

    try {
      const resp = await solicitarRecuperacion(email);
      setExito(true);
      if (resp.token_simulado) {
        setTokenSimulado(resp.token_simulado);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-navy-400/20 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 relative z-10">
        
        <button 
          onClick={() => navegarA('login')}
          className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-navy-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>Volver al inicio de sesión</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-900 text-white shadow-lg shadow-navy-900/30 mb-6">
            <Shield size={32} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-navy-900">Recuperar Contraseña</h2>
          <p className="text-gray-500 text-sm mt-2">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecerla.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {exito ? (
          <div className="text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <p className="text-navy-900 font-semibold mb-2">¡Solicitud enviada!</p>
            <p className="text-sm text-gray-500 mb-6">
              Revisa tu bandeja de entrada para continuar con el restablecimiento de tu contraseña.
            </p>
            
            {tokenSimulado && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-left">
                <p className="text-xs font-semibold text-blue-800 uppercase mb-2">Modo Desarrollo (Simulación):</p>
                <p className="text-xs text-blue-700 break-all mb-4">Token: {tokenSimulado}</p>
                <button 
                  onClick={() => navegarA('reset', { token: tokenSimulado })}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Probar Reseteo ahora
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-navy-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 focus:bg-white transition-all text-sm font-medium"
                  placeholder="tu@universidad.edu"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando || !email}
              className="w-full bg-navy-900 text-white rounded-2xl py-3.5 px-4 font-semibold text-sm hover:bg-navy-800 focus:ring-4 focus:ring-navy-900/20 transition-all shadow-lg shadow-navy-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
