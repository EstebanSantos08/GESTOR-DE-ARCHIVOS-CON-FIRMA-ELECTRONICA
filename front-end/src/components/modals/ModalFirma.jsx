import React, { useState, useRef } from 'react';
import { X, Shield, CheckCircle, Loader, XCircle, AlertCircle, Move, QrCode, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';

// Proporciones reales del sello respecto a una hoja A4 (595.28 x 841.89 pt)
// SELLO_W = 120 pt (~20.1% del ancho), SELLO_H = 140 pt (~16.6% del alto)
const SELLO_W_PCT = 20.15;
const SELLO_H_PCT = 16.63;

export default function ModalFirma({ documento, pdfBlobUrl, onClose }) {
  const { firmarDocumento, rechazarDocumento, usuario } = useApp();
  const [paso, setPaso] = useState('opciones'); // opciones | confirmandoRechazo | procesando | exito | rechazado | error
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Configuración de ubicación de la firma
  const [modoPosicion, setModoPosicion] = useState('auto'); // 'auto' | 'manual'
  const [paginaSeleccionada, setPaginaSeleccionada] = useState('ultima'); // 'ultima' | '1' | '2' ...
  const [numPaginaManual, setNumPaginaManual] = useState(1);
  // xRatio y yRatio normalizados en [0, 1] (0,0 = esquina superior izquierda disponible; 1,1 = esquina inferior derecha disponible)
  const [coords, setCoords] = useState({ xRatio: 0.72, yRatio: 0.85 });
  const [arrastrando, setArrastrando] = useState(false);
  const hojaRef = useRef(null);

  // eslint-disable-next-line eqeqeq
  const esSuTurno = usuario && documento?.firmante_actual_id == usuario.id;

  const puedeRechazar = esSuTurno;
  const estaRechazado = documento?.estado === 'RECHAZADO';
  const estaCompletado = documento?.estado === 'COMPLETADO';

  function actualizarPosicionDesdeEvento(clientX, clientY) {
    if (!hojaRef.current) return;
    const rect = hojaRef.current.getBoundingClientRect();
    const selloWpx = (rect.width * SELLO_W_PCT) / 100;
    const selloHpx = (rect.height * SELLO_H_PCT) / 100;
    const maxW = Math.max(1, rect.width - selloWpx);
    const maxH = Math.max(1, rect.height - selloHpx);

    // Centrar el sello donde el usuario hace clic o arrastra
    const rawX = clientX - rect.left - selloWpx / 2;
    const rawY = clientY - rect.top - selloHpx / 2;

    const xRatio = Math.max(0, Math.min(1, rawX / maxW));
    const yRatio = Math.max(0, Math.min(1, rawY / maxH));
    setCoords({
      xRatio: Number(xRatio.toFixed(4)),
      yRatio: Number(yRatio.toFixed(4)),
    });
  }

  function handlePointerDown(e) {
    e.preventDefault();
    setArrastrando(true);
    actualizarPosicionDesdeEvento(e.clientX, e.clientY);
  }

  function handlePointerMove(e) {
    if (!arrastrando) return;
    actualizarPosicionDesdeEvento(e.clientX, e.clientY);
  }

  function handlePointerUp() {
    if (arrastrando) setArrastrando(false);
  }

  async function handleFirmar() {
    setPaso('procesando');
    try {
      const posicionFirma =
        modoPosicion === 'manual'
          ? {
              modo: 'manual',
              pagina: paginaSeleccionada === 'ultima' ? 'ultima' : Number(numPaginaManual) || 1,
              xRatio: coords.xRatio,
              yRatio: coords.yRatio,
            }
          : { modo: 'auto', pagina: 'ultima' };

      await firmarDocumento(documento.id, documento.nombre, posicionFirma);
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
    PENDIENTE: 'En Revisión / Pendiente',
    COMPLETADO: 'Completado',
    RECHAZADO: 'Rechazado',
    EN_REVISION: 'En Revisión (Flujo Activo)',
  };

  const getEstadoLabel = (estado) => {
    if (estadoLabel[estado]) return estadoLabel[estado];
    return estado ? estado.replace(/_/g, ' ') : 'Desconocido';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${
          modoPosicion === 'manual' && paso === 'opciones' ? 'max-w-2xl' : 'max-w-md'
        } max-h-[92vh] flex flex-col overflow-hidden transition-all`}
      >

        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Shield className="text-blue-300" size={20} />
            <h2 className="text-white font-semibold">
              {estaRechazado ? 'Documento Rechazado' : estaCompletado ? 'Documento Completado' : 'Firmar Documento'}
            </h2>
          </div>
          {paso !== 'procesando' && (
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">

          {/* Info del documento */}
          {['opciones', 'confirmandoRechazo'].includes(paso) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Documento</span>
                <span className="font-medium text-navy-900 text-right max-w-[200px] truncate">{documento?.nombre}</span>
              </div>
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                estaRechazado ? 'bg-red-50 text-red-700' :
                estaCompletado ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {estaRechazado ? <XCircle size={14} /> : estaCompletado ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{getEstadoLabel(documento.estado)}</span>
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
              {/* Selector de ubicación del sello de firma */}
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Ubicación del sello de firma QR
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModoPosicion('auto')}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      modoPosicion === 'auto'
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles size={14} />
                    <span>Automático (por rol)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPosicion('manual')}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      modoPosicion === 'manual'
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Move size={14} />
                    <span>Elegir lugar en la hoja</span>
                  </button>
                </div>

                {modoPosicion === 'auto' ? (
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    El sello con código QR se ubicará automáticamente en la franja inferior de la última página según tu cargo jerárquico, sin superponerse con las demás firmas.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Selector de página y posiciones rápidas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-medium">Página:</span>
                        <select
                          value={paginaSeleccionada}
                          onChange={e => setPaginaSeleccionada(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy-500"
                        >
                          <option value="ultima">Última página</option>
                          <option value="especifica">Página específica</option>
                        </select>
                        {paginaSeleccionada === 'especifica' && (
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={numPaginaManual}
                            onChange={e => setNumPaginaManual(Math.max(1, Number(e.target.value) || 1))}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy-500"
                          />
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.06, yRatio: 0.88 })}
                          className="px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        >
                          Inf. Izq.
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.5, yRatio: 0.88 })}
                          className="px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        >
                          Inf. Centro
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.94, yRatio: 0.88 })}
                          className="px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        >
                          Inf. Der.
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                      Haz clic o arrastra el recuadro <strong>FIRMA DIGITAL</strong> sobre la hoja para ubicar tu sello exactamente donde deseas estamparlo.
                    </p>

                    {/* Lienzo interactivo proporción A4 */}
                    <div className="flex justify-center bg-gray-100 rounded-xl p-3 border border-gray-200">
                      <div
                        ref={hojaRef}
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        className="relative bg-white shadow-md border border-gray-300 select-none cursor-crosshair overflow-hidden"
                        style={{
                          width: '280px',
                          height: '396px', // Proporción exacta A4 (1 : 1.4142)
                        }}
                      >
                        {/* Vista previa del PDF de fondo */}
                        {pdfBlobUrl ? (
                          <iframe
                            src={`${pdfBlobUrl}#page=${paginaSeleccionada === 'especifica' ? numPaginaManual : 1}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                            title="Vista previa de hoja"
                            className="w-full h-full border-0 pointer-events-none opacity-85"
                          />
                        ) : (
                          <div className="w-full h-full p-5 flex flex-col justify-between pointer-events-none opacity-40">
                            <div className="space-y-2">
                              <div className="h-3 w-2/3 bg-gray-300 rounded" />
                              <div className="h-2 w-full bg-gray-200 rounded" />
                              <div className="h-2 w-5/6 bg-gray-200 rounded" />
                              <div className="h-2 w-full bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-2 w-full bg-gray-200 rounded" />
                              <div className="h-2 w-4/5 bg-gray-200 rounded" />
                              <div className="h-2 w-full bg-gray-200 rounded" />
                            </div>
                            <div className="border-t border-dashed border-gray-300 pt-2 text-[10px] text-center text-gray-400">
                              Zona inferior de firmas
                            </div>
                          </div>
                        )}

                        {/* Sello arrastrable con dimensiones proporcionales reales */}
                        <div
                          style={{
                            width: `${SELLO_W_PCT}%`,
                            height: `${SELLO_H_PCT}%`,
                            left: `${coords.xRatio * (100 - SELLO_W_PCT)}%`,
                            top: `${coords.yRatio * (100 - SELLO_H_PCT)}%`,
                          }}
                          className="absolute border-2 border-navy-900 bg-blue-50/95 rounded shadow-md flex flex-col items-center justify-between p-1 cursor-grab active:cursor-grabbing ring-2 ring-blue-400/50"
                        >
                          <span className="text-[7px] font-bold text-navy-900 tracking-tight leading-none">
                            FIRMA DIGITAL
                          </span>
                          <QrCode size={24} className="text-navy-900 flex-shrink-0" />
                          <div className="w-full text-center leading-tight">
                            <p className="text-[6.5px] font-semibold text-gray-800 truncate">
                              {usuario?.nombre || 'Firmante'}
                            </p>
                            <p className="text-[5.5px] text-gray-500 truncate">
                              PAdES-BES · QR
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
