import React, { useState } from 'react';
import { Shield, Eye, EyeOff, LogIn, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';
import { useApp } from '../context/useApp';

const CUENTAS_DEMO = [
  { rol: 'ADMIN',        email: 'admin@universidad.edu',       password: 'Admin123!',       color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { rol: 'RECTOR',       email: 'rector@universidad.edu',      password: 'Rector123!',      color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { rol: 'DECANO',       email: 'decano@universidad.edu',      password: 'Decano123!',      color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { rol: 'SUBDECANO',    email: 'subdecano@universidad.edu',   password: 'Subdecano123!',   color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { rol: 'DIRECTOR',     email: 'director@universidad.edu',    password: 'Director123!',    color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { rol: 'RESPONSABLE',  email: 'responsable@universidad.edu', password: 'Responsable123!', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { rol: 'DOCENTE',      email: 'agalarza@universidad.edu',    password: 'Docente123!',     color: 'bg-green-100 text-green-800 border-green-200' },
];

export default function Login() {
  const { login, registrar, navegarA } = useApp();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Registro state
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regError, setRegError] = useState('');
  const [regExito, setRegExito] = useState(false);
  const [regCargando, setRegCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(e) {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regPassword2) {
      setRegError('Las contraseñas no coinciden');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setRegCargando(true);
    try {
      await registrar({ nombre: regNombre, email: regEmail, password: regPassword });
      setRegExito(true);
    } catch (err) {
      setRegError(err.message || 'Error al registrarse');
    } finally {
      setRegCargando(false);
    }
  }

  function usarCuenta(cuenta) {
    setEmail(cuenta.email);
    setPassword(cuenta.password);
    setError('');
  }

  function cambiarModo(m) {
    setModo(m);
    setError('');
    setRegError('');
    setRegExito(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">GestDoc</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema de Gestión Documental y Firma Digital</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => cambiarModo('login')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                modo === 'login'
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <LogIn size={15} />
                <span>Iniciar sesión</span>
              </span>
            </button>
            <button
              onClick={() => cambiarModo('registro')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                modo === 'registro'
                  ? 'bg-navy-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <UserPlus size={15} />
                <span>Registrarse</span>
              </span>
            </button>
          </div>

          {/* ── LOGIN ── */}
          {modo === 'login' && (
            <>
              <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Correo institucional
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@universidad.edu"
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => navegarA('recuperar')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {cargando
                    ? <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    : <LogIn size={16} />}
                  <span>{cargando ? 'Autenticando...' : 'Ingresar al sistema'}</span>
                </button>
              </form>

              {/* Cuentas demo */}
              <div className="px-6 pb-6">
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Cuentas de demostración
                  </p>
                  <div className="space-y-2">
                    {CUENTAS_DEMO.map(c => (
                      <button
                        key={c.rol}
                        type="button"
                        onClick={() => usarCuenta(c)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${c.color} mr-2`}>
                            {c.rol}
                          </span>
                          <span className="text-xs text-gray-500">{c.email}</span>
                        </div>
                        <span className="text-xs text-gray-300">usar →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── REGISTRO ── */}
          {modo === 'registro' && (
            <div className="px-6 py-6">
              {regExito ? (
                <div className="py-6 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <p className="text-navy-900 font-semibold">¡Cuenta creada exitosamente!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Tu cuenta fue registrada con rol <strong>Docente</strong>.<br />
                    Un Decano o Rector puede cambiar tu rol si es necesario.
                  </p>
                  <button
                    onClick={() => cambiarModo('login')}
                    className="mt-5 px-5 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 transition-colors"
                  >
                    Ir a iniciar sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegistro} className="space-y-4">
                  <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    Las cuentas nuevas se crean con rol <strong>Docente</strong>. El Decano o Rector puede asignarte otro rol.
                  </p>

                  {regError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                      <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-700">{regError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={regNombre}
                      onChange={e => setRegNombre(e.target.value)}
                      placeholder="Juan Pérez"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="correo@universidad.edu"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Confirmar contraseña
                    </label>
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      value={regPassword2}
                      onChange={e => setRegPassword2(e.target.value)}
                      placeholder="Repite la contraseña"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regCargando}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
                  >
                    {regCargando
                      ? <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : <UserPlus size={16} />}
                    <span>{regCargando ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Universidad · Sistema de Firma Digital PAdES-BES
        </p>
      </div>
    </div>
  );
}
