import React, { useState } from 'react';
import { X, Shield, CheckCircle, Loader, XCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';

export default function ModalFirma({ documento, onClose }) {
  const { firmarDocumento, rechazarDocumento, usuario } = useApp();
  const [paso, setPaso] = useState('opciones'); // opciones | confirmandoRechazo | procesando | exito | rechazado | error
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const puedeRechazar = usuario.rol === 'DECANO' || usuario.rol === 'RECTOR';
  const estaRechazado = documento?.estado === 'RECHAZADO';
  const estaCompletado = documento?.estado === 'COMPLETADO';

  async function handleFirmar() {
    setPaso('procesando');
    try {
      await firmarDocumento(documento.id, documento.nombre);
      setPaso('exito');
    } catch (err) {
      setErrorMsg(err.message || 'Error al firmar el documento');
      setPaso('error');
    }
  }

  async function handleRechazar() {
    if (!motivoRechazo.trim()) return;
    setPaso('procesando');
    try {
      await rechazarDocumento(documento.id, documento.nombre, motivoRechazo.trim());
      setPaso('rechazado');
    } catch (err) {
      setErrorMsg(err.message || 'Error al rechazar el documento');
      setPaso('error');
    }
  }

  function handleClose() {
    if (paso === 'procesando') return;
    onClose();
  }

  const estadoLabel = {
    PENDIENTE: 'Pendiente de firma Decano',
    FIRMADO_DECANO: 'Pendiente de firma Rector',
    COMPLETADO: 'Completado',
    RECHAZADO: 'Rechazado',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="text-blue-300" size={20} />
            <h2 className="text-white font-semibold">
              {estaRechazado ? 'Documento Rechazado' : estaCompletado ? 'Documento Completado' : 'Detalle del Documento'}
            </h2>
          </div>
          {paso !== 'procesando' && (
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-6 py-6 space-y-4">

          {/* Info del documento */}
          {['opciones', 'confirmandoRechazo'].includes(paso) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Documento</span>
                <span className="font-medium text-navy-900 text-right max-w-[200px] truncate">{documento?.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <span className={`font-medium ${estaRechazado ? 'text-red-600' : estaCompletado ? 'text-green-600' : 'text-amber-600'}`}>
                  {estadoLabel[documento?.estado] || documento?.estado}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subido por</span>
                <span className="text-gray-700">{documento?.subido_por}</span>
              </div>
              {documento?.observaciones && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Observaciones: </span>
                  <span className="text-xs text-gray-700">{documento.observaciones}</span>
                </div>
              )}
            </div>
          )}

          {/* Documento rechazado — solo info */}
          {paso === 'opciones' && estaRechazado && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex space-x-3">
              <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Documento rechazado</p>
                <p className="text-xs text-red-600 mt-1">Este documento fue rechazado y no puede modificarse. El docente deberá subir una nueva versión.</p>
              </div>
            </div>
          )}

          {/* Documento completado — solo info */}
          {paso === 'opciones' && estaCompletado && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex space-x-3">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-700">Documento completado</p>
                <p className="text-xs text-green-600 mt-1">Este documento tiene todas las firmas requeridas.</p>
              </div>
            </div>
          )}

          {/* Acciones de firma/rechazo */}
          {paso === 'opciones' && !estaRechazado && !estaCompletado && (
            <>
              {puedeRechazar && (
                <button
                  onClick={() => setPaso('confirmandoRechazo')}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <XCircle size={15} />
                  <span>Rechazar documento</span>
                </button>
              )}
              <button
                onClick={handleFirmar}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 transition-colors"
              >
                <Shield size={15} />
                <span>Firmar digitalmente</span>
              </button>
            </>
          )}

          {/* Confirmar rechazo */}
          {paso === 'confirmandoRechazo' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex space-x-2">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">El rechazo es definitivo. El docente deberá subir una nueva versión del documento.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={e => setMotivoRechazo(e.target.value)}
                  placeholder="Describe el motivo del rechazo..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setPaso('opciones')}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazar}
                  disabled={!motivoRechazo.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Confirmar rechazo
                </button>
              </div>
            </>
          )}

          {/* Procesando */}
          {paso === 'procesando' && (
            <div className="py-8 text-center">
              <Loader size={40} className="text-navy-700 animate-spin mx-auto mb-4" />
              <p className="text-navy-900 font-semibold">Procesando...</p>
              <p className="text-sm text-gray-500 mt-1">Por favor espere</p>
            </div>
          )}

          {/* Éxito firma */}
          {paso === 'exito' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <p className="text-navy-900 font-semibold text-lg">¡Firma aplicada!</p>
              <p className="text-sm text-gray-500 mt-1">El documento avanzó al siguiente estado</p>
              <button onClick={handleClose} className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {/* Rechazo confirmado */}
          {paso === 'rechazado' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} className="text-red-500" />
              </div>
              <p className="text-navy-900 font-semibold text-lg">Documento rechazado</p>
              <p className="text-sm text-gray-500 mt-1">Se notificará al docente correspondiente</p>
              <button onClick={handleClose} className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {/* Error */}
          {paso === 'error' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <p className="text-navy-900 font-semibold">Error</p>
              <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
              <button onClick={() => setPaso('opciones')} className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors">
                Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
