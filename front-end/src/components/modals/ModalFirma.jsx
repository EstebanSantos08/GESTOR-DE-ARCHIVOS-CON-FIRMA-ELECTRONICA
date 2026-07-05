import React, { useState } from 'react';
import { X, Eye, EyeOff, Shield, CheckCircle, Loader } from 'lucide-react';
import { useApp } from '../../context/useApp';

export default function ModalFirma({ documento, onClose }) {
  const { firmarDocumento } = useApp();
  const [paso, setPaso] = useState('formulario'); // formulario | procesando | exito
  const [certFile, setCertFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleFirmar() {
    if (!certFile || !password) return;
    setPaso('procesando');
    setTimeout(() => {
      firmarDocumento(documento.id, documento.nombre);
      setPaso('exito');
    }, 2000);
  }

  function handleClose() {
    if (paso === 'procesando') return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-blue-300" size={20} />
            <h2 className="text-white font-semibold">Firma Digital PAdES</h2>
          </div>
          {paso !== 'procesando' && (
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-6 py-6">
          {paso === 'formulario' && (
            <>
              <p className="text-sm text-gray-600 mb-5">
                Firmando: <span className="font-semibold text-navy-900">{documento?.nombre}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificado (.p12 / .pfx)
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-navy-400 transition-colors">
                    <input
                      type="file"
                      accept=".p12,.pfx"
                      onChange={e => setCertFile(e.target.files[0])}
                      className="hidden"
                      id="cert-upload"
                    />
                    <label htmlFor="cert-upload" className="cursor-pointer">
                      {certFile ? (
                        <p className="text-sm font-medium text-navy-700">{certFile.name}</p>
                      ) : (
                        <p className="text-sm text-gray-400">Haga clic para seleccionar el certificado</p>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña del certificado
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFirmar}
                  disabled={!certFile || !password}
                  className="flex-1 px-4 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Firmar Documento
                </button>
              </div>
            </>
          )}

          {paso === 'procesando' && (
            <div className="py-8 text-center">
              <div className="flex justify-center mb-4">
                <Loader size={40} className="text-navy-700 animate-spin" />
              </div>
              <p className="text-navy-900 font-semibold">Procesando firma digital...</p>
              <p className="text-sm text-gray-500 mt-1">Aplicando sello PAdES-BES</p>
            </div>
          )}

          {paso === 'exito' && (
            <div className="py-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
              </div>
              <p className="text-navy-900 font-semibold text-lg">¡Firma aplicada exitosamente!</p>
              <p className="text-sm text-gray-500 mt-1">El documento ha sido actualizado</p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

