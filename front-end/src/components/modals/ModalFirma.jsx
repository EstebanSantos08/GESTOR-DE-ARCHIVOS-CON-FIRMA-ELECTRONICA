import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  CheckCircle,
  Loader,
  XCircle,
  AlertCircle,
  Move,
  QrCode,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { useApp } from '../../context/useApp';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Proporciones reales del sello respecto a una hoja A4 (595.28 x 841.89 pt)
// SELLO_W = 120 pt (~20.15% del ancho), SELLO_H = 140 pt (~16.63% del alto)
const SELLO_W_PCT = 20.15;
const SELLO_H_PCT = 16.63;
const BASE_SHEET_WIDTH = 520;

/**
 * Componente que renderiza una página individual del PDF en un <canvas> nítido
 * y permite ubicar/arrastrar el sello de firma sobre esa página sin bloquear el scroll.
 */
function PaginaPdfInteractiva({
  pdfDoc,
  pageNumber,
  zoom,
  esPaginaActiva,
  modoPosicion,
  coords,
  usuarioNombre,
  onSeleccionarPosicion,
  onIniciarArrastreSello,
  pageRefCallback,
}) {
  const canvasRef = useRef(null);
  const sheetRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(1.4142); // A4 default

  useEffect(() => {
    let cancelado = false;
    let renderTask = null;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelado) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const ratio = unscaledViewport.height / unscaledViewport.width;
        setAspectRatio(ratio);

        const displayWidth = Math.round(BASE_SHEET_WIDTH * zoom);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (displayWidth * dpr) / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err) {
        // Ignorar cancelaciones normales de renderizado al cambiar zoom
      }
    }

    renderPage();
    return () => {
      cancelado = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        try {
          renderTask.cancel();
        } catch (_) {}
      }
    };
  }, [pdfDoc, pageNumber, zoom]);

  const sheetWidth = Math.round(BASE_SHEET_WIDTH * zoom);
  const sheetHeight = Math.round(sheetWidth * aspectRatio);

  function handleClickHoja(e) {
    if (modoPosicion !== 'manual' || !sheetRef.current) return;
    onSeleccionarPosicion(pageNumber, e.clientX, e.clientY, sheetRef.current);
  }

  return (
    <div
      ref={el => {
        sheetRef.current = el;
        if (pageRefCallback) pageRefCallback(pageNumber, el);
      }}
      onClick={handleClickHoja}
      style={{ width: `${sheetWidth}px`, height: `${sheetHeight}px` }}
      className={`relative bg-white shadow-lg rounded-sm border-2 transition-shadow select-none mx-auto ${
        modoPosicion === 'manual' ? 'cursor-crosshair' : 'cursor-default'
      } ${
        esPaginaActiva && modoPosicion === 'manual'
          ? 'border-navy-700 ring-4 ring-blue-500/15'
          : 'border-gray-300'
      }`}
    >
      {/* Etiqueta flotante de número de página */}
      <div
        className={`absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-sm pointer-events-none ${
          esPaginaActiva && modoPosicion === 'manual'
            ? 'bg-navy-900 text-white'
            : 'bg-gray-900/75 text-white'
        }`}
      >
        Página {pageNumber}
        {esPaginaActiva && modoPosicion === 'manual' ? ' · Firma aquí' : ''}
      </div>

      {/* Canvas de la hoja PDF */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
      />

      {/* Sello arrastrable si esta es la página seleccionada en modo manual */}
      {modoPosicion === 'manual' && esPaginaActiva && (
        <div
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            onIniciarArrastreSello(pageNumber, e.clientX, e.clientY, sheetRef.current);
          }}
          onTouchStart={e => {
            e.stopPropagation();
            const touch = e.touches?.[0];
            if (touch) {
              onIniciarArrastreSello(pageNumber, touch.clientX, touch.clientY, sheetRef.current);
            }
          }}
          style={{
            width: `${SELLO_W_PCT}%`,
            height: `${SELLO_H_PCT}%`,
            left: `${coords.xRatio * (100 - SELLO_W_PCT)}%`,
            top: `${coords.yRatio * (100 - SELLO_H_PCT)}%`,
          }}
          className="absolute z-20 border-2 border-navy-900 bg-blue-50/95 rounded-md shadow-xl flex flex-col items-center justify-between p-1.5 cursor-grab active:cursor-grabbing ring-4 ring-blue-500/40 hover:bg-blue-100/95 transition-colors"
          title="Arrastra este recuadro para mover tu firma"
        >
          <span className="text-[9px] font-extrabold text-navy-900 tracking-tight leading-none">
            FIRMA DIGITAL
          </span>
          <QrCode size={Math.max(24, Math.round(34 * zoom))} className="text-navy-900 flex-shrink-0" />
          <div className="w-full text-center leading-tight">
            <p className="text-[8.5px] font-bold text-gray-900 truncate">
              {usuarioNombre || 'Firmante'}
            </p>
            <p className="text-[7px] text-gray-600 truncate">
              PAdES-BES · QR
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModalFirma({ documento, pdfBlobUrl, onClose }) {
  const { firmarDocumento, rechazarDocumento, usuario } = useApp();
  const [paso, setPaso] = useState('opciones'); // opciones | confirmandoRechazo | procesando | exito | rechazado | error
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Configuración de ubicación de la firma
  const [modoPosicion, setModoPosicion] = useState('manual'); // 'manual' | 'auto'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const [paginaActiva, setPaginaActiva] = useState(1);
  const [zoom, setZoom] = useState(1);

  // xRatio y yRatio normalizados en [0, 1]
  const [coords, setCoords] = useState({ xRatio: 0.72, yRatio: 0.85 });

  // Estado de arrastre exclusivo del recuadro de firma
  const dragStateRef = useRef({
    activo: false,
    sheetEl: null,
  });

  const scrollContainerRef = useRef(null);
  const pageElementsRef = useRef({});
  const fallbackSheetRef = useRef(null);

  // eslint-disable-next-line eqeqeq
  const esSuTurno = usuario && documento?.firmante_actual_id == usuario.id;
  const puedeRechazar = esSuTurno;
  const estaRechazado = documento?.estado === 'RECHAZADO';
  const estaCompletado = documento?.estado === 'COMPLETADO';

  // Cargar documento PDF con pdfjs-dist para renderizar todas las páginas con scroll libre
  useEffect(() => {
    let cancelado = false;
    if (!pdfBlobUrl) {
      setPdfDoc(null);
      setTotalPaginas(1);
      return;
    }

    setCargandoPdf(true);
    const loadingTask = pdfjsLib.getDocument(pdfBlobUrl);
    loadingTask.promise
      .then(doc => {
        if (cancelado) return;
        setPdfDoc(doc);
        setTotalPaginas(doc.numPages || 1);
        setPaginaActiva(1);
      })
      .catch(() => {
        if (!cancelado) {
          setPdfDoc(null);
          setTotalPaginas(1);
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPdf(false);
      });

    return () => {
      cancelado = true;
    };
  }, [pdfBlobUrl]);

  const calcularCoordsEnHoja = useCallback((clientX, clientY, sheetEl) => {
    if (!sheetEl) return;
    const rect = sheetEl.getBoundingClientRect();
    const selloWpx = (rect.width * SELLO_W_PCT) / 100;
    const selloHpx = (rect.height * SELLO_H_PCT) / 100;
    const maxW = Math.max(1, rect.width - selloWpx);
    const maxH = Math.max(1, rect.height - selloHpx);

    const rawX = clientX - rect.left - selloWpx / 2;
    const rawY = clientY - rect.top - selloHpx / 2;

    const xRatio = Math.max(0, Math.min(1, rawX / maxW));
    const yRatio = Math.max(0, Math.min(1, rawY / maxH));
    setCoords({
      xRatio: Number(xRatio.toFixed(4)),
      yRatio: Number(yRatio.toFixed(4)),
    });
  }, []);

  // Listeners globales de mousemove/mouseup para que el arrastre del sello NUNCA se quede pegado
  useEffect(() => {
    function onWindowMouseMove(e) {
      if (!dragStateRef.current.activo || !dragStateRef.current.sheetEl) return;
      calcularCoordsEnHoja(e.clientX, e.clientY, dragStateRef.current.sheetEl);
    }

    function onWindowTouchMove(e) {
      if (!dragStateRef.current.activo || !dragStateRef.current.sheetEl) return;
      const touch = e.touches?.[0];
      if (touch) {
        calcularCoordsEnHoja(touch.clientX, touch.clientY, dragStateRef.current.sheetEl);
      }
    }

    function onWindowPointerUp() {
      if (dragStateRef.current.activo) {
        dragStateRef.current = { activo: false, sheetEl: null };
      }
    }

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowPointerUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: true });
    window.addEventListener('touchend', onWindowPointerUp);
    window.addEventListener('blur', onWindowPointerUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowPointerUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowPointerUp);
      window.removeEventListener('blur', onWindowPointerUp);
    };
  }, [calcularCoordsEnHoja]);

  function handleSeleccionarPosicion(pageNumber, clientX, clientY, sheetEl) {
    setPaginaActiva(pageNumber);
    calcularCoordsEnHoja(clientX, clientY, sheetEl);
  }

  function handleIniciarArrastreSello(pageNumber, clientX, clientY, sheetEl) {
    setPaginaActiva(pageNumber);
    dragStateRef.current = {
      activo: true,
      sheetEl,
    };
    calcularCoordsEnHoja(clientX, clientY, sheetEl);
  }

  function irAPagina(num) {
    const destino = Math.max(1, Math.min(totalPaginas, Number(num) || 1));
    setPaginaActiva(destino);
    const el = pageElementsRef.current[destino];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function handleFirmar() {
    setPaso('procesando');
    try {
      const posicionFirma =
        modoPosicion === 'manual'
          ? {
              modo: 'manual',
              pagina: Number(paginaActiva) || 1,
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

  const getEstadoLabel = estado => {
    if (estadoLabel[estado]) return estadoLabel[estado];
    return estado ? estado.replace(/_/g, ' ') : 'Desconocido';
  };

  const mostrarVisorAmplio = paso === 'opciones' && !estaRechazado && !estaCompletado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${
          mostrarVisorAmplio ? 'max-w-6xl h-[92vh]' : 'max-w-lg max-h-[90vh]'
        } flex flex-col overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Shield className="text-blue-300" size={20} />
            <div>
              <h2 className="text-white font-semibold text-base leading-tight">
                {estaRechazado
                  ? 'Documento Rechazado'
                  : estaCompletado
                  ? 'Documento Completado'
                  : 'Firmar Documento Digitalmente'}
              </h2>
              {mostrarVisorAmplio && (
                <p className="text-xs text-blue-200 mt-0.5 truncate max-w-md">
                  {documento?.nombre}
                </p>
              )}
            </div>
          </div>
          {paso !== 'procesando' && (
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={22} />
            </button>
          )}
        </div>

        {/* Cuerpo en 2 columnas cuando está listo para firmar */}
        {mostrarVisorAmplio ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Columna Izquierda: Controles y Botones de Acción */}
            <div className="w-full lg:w-[360px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white flex flex-col justify-between overflow-y-auto p-5 space-y-4">
              <div className="space-y-4">
                {/* Resumen del documento */}
                <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">Estado</span>
                    <div
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        estaRechazado
                          ? 'bg-red-50 text-red-700'
                          : estaCompletado
                          ? 'bg-green-50 text-green-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      <AlertCircle size={12} />
                      <span>{getEstadoLabel(documento?.estado)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Subido por</span>
                    <span className="font-medium text-gray-800">{documento?.subido_por}</span>
                  </div>
                  {documento?.observaciones && (
                    <div className="pt-1.5 border-t border-gray-200 text-xs">
                      <span className="text-gray-500">Observaciones: </span>
                      <span className="text-gray-700">{documento.observaciones}</span>
                    </div>
                  )}
                </div>

                {/* Selector de Modo de Ubicación */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Ubicación del Sello de Firma QR
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModoPosicion('manual')}
                      className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        modoPosicion === 'manual'
                          ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Move size={14} />
                      <span>Elegir en la hoja</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoPosicion('auto')}
                      className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        modoPosicion === 'auto'
                          ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>Automático</span>
                    </button>
                  </div>
                </div>

                {modoPosicion === 'manual' ? (
                  <div className="space-y-3.5 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-900">
                        Página donde se estampará:
                      </span>
                      <span className="px-2.5 py-0.5 bg-navy-900 text-white rounded-full text-xs font-bold">
                        Pág. {paginaActiva} de {totalPaginas}
                      </span>
                    </div>

                    {/* Botones rápidos para cambiar de página */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={paginaActiva <= 1}
                        onClick={() => irAPagina(paginaActiva - 1)}
                        className="flex-1 py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center space-x-1"
                      >
                        <ChevronLeft size={14} />
                        <span>Anterior</span>
                      </button>
                      <button
                        type="button"
                        disabled={paginaActiva >= totalPaginas}
                        onClick={() => irAPagina(paginaActiva + 1)}
                        className="flex-1 py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center space-x-1"
                      >
                        <span>Siguiente</span>
                        <ChevronRight size={14} />
                      </button>
                      {totalPaginas > 1 && (
                        <button
                          type="button"
                          onClick={() => irAPagina(totalPaginas)}
                          className="py-1.5 px-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          title="Saltar a la última página"
                        >
                          Última ({totalPaginas})
                        </button>
                      )}
                    </div>

                    {/* Posiciones rápidas en la página activa */}
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-gray-600">
                        Posición rápida en la Página {paginaActiva}:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.06, yRatio: 0.88 })}
                          className="px-2 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          Inf. Izq.
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.5, yRatio: 0.88 })}
                          className="px-2 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          Inf. Centro
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoords({ xRatio: 0.94, yRatio: 0.88 })}
                          className="px-2 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          Inf. Der.
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-blue-800 leading-relaxed">
                      Usa la <strong>rueda del ratón o la barra lateral derecha</strong> para bajar a otras páginas. Haz <strong>clic en cualquier hoja</strong> o arrastra el recuadro <strong>FIRMA DIGITAL</strong> para ubicar tu sello.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-600 leading-relaxed">
                    El sello con código QR se ubicará automáticamente en la franja inferior de la <strong>última página</strong> según tu cargo jerárquico, sin superponerse con las demás firmas.
                  </div>
                )}
              </div>

              {/* Botones de Acción siempre visibles al pie del panel izquierdo */}
              <div className="space-y-2.5 pt-4 border-t border-gray-100">
                {puedeRechazar && (
                  <button
                    type="button"
                    onClick={() => setPaso('confirmandoRechazo')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <XCircle size={16} />
                    <span>Rechazar documento</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFirmar}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 bg-navy-900 text-white rounded-xl text-sm font-semibold hover:bg-navy-800 shadow-md transition-colors"
                >
                  <Shield size={16} />
                  <span>
                    {modoPosicion === 'manual'
                      ? `Firmar en Página ${paginaActiva}`
                      : 'Firmar digitalmente'}
                  </span>
                </button>
              </div>
            </div>

            {/* Columna Derecha: Visor de Páginas Amplio con Scroll Independiente */}
            <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
              {/* Barra de herramientas superior del visor */}
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={paginaActiva <= 1}
                    onClick={() => irAPagina(paginaActiva - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 text-gray-700"
                    title="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 px-1">
                    Página{' '}
                    <input
                      type="number"
                      min={1}
                      max={totalPaginas}
                      value={paginaActiva}
                      onChange={e => irAPagina(e.target.value)}
                      className="w-12 border border-gray-300 rounded px-1.5 py-0.5 text-center text-xs font-bold text-navy-900 mx-1"
                    />{' '}
                    de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={paginaActiva >= totalPaginas}
                    onClick={() => irAPagina(paginaActiva + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 text-gray-700"
                    title="Página siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Controles de Zoom */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
                    title="Reducir tamaño"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <span className="text-xs font-semibold text-gray-600 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700"
                    title="Aumentar tamaño"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>
              </div>

              {/* Contenedor con Scroll Vertical Nativo para todas las hojas */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                {cargandoPdf ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 py-16">
                    <Loader size={32} className="animate-spin text-navy-700 mb-3" />
                    <p className="text-sm font-medium">Renderizando páginas del documento...</p>
                  </div>
                ) : pdfDoc ? (
                  Array.from({ length: totalPaginas }, (_, idx) => idx + 1).map(pageNum => (
                    <PaginaPdfInteractiva
                      key={pageNum}
                      pdfDoc={pdfDoc}
                      pageNumber={pageNum}
                      zoom={zoom}
                      esPaginaActiva={paginaActiva === pageNum}
                      modoPosicion={modoPosicion}
                      coords={coords}
                      usuarioNombre={usuario?.nombre}
                      onSeleccionarPosicion={handleSeleccionarPosicion}
                      onIniciarArrastreSello={handleIniciarArrastreSello}
                      pageRefCallback={(num, el) => {
                        pageElementsRef.current[num] = el;
                      }}
                    />
                  ))
                ) : (
                  /* Hoja simulada si no hay blob PDF cargado */
                  <div
                    ref={fallbackSheetRef}
                    onClick={e =>
                      modoPosicion === 'manual' &&
                      handleSeleccionarPosicion(1, e.clientX, e.clientY, fallbackSheetRef.current)
                    }
                    style={{
                      width: `${Math.round(BASE_SHEET_WIDTH * zoom)}px`,
                      height: `${Math.round(BASE_SHEET_WIDTH * zoom * 1.4142)}px`,
                    }}
                    className="relative bg-white shadow-lg border-2 border-navy-700 mx-auto p-8 flex flex-col justify-between select-none cursor-crosshair"
                  >
                    <div className="space-y-3 opacity-40 pointer-events-none">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <FileText size={18} />
                        <span className="text-xs font-semibold">Vista previa de hoja A4</span>
                      </div>
                      <div className="h-4 w-2/3 bg-gray-300 rounded" />
                      <div className="h-2.5 w-full bg-gray-200 rounded" />
                      <div className="h-2.5 w-5/6 bg-gray-200 rounded" />
                      <div className="h-2.5 w-full bg-gray-200 rounded" />
                    </div>
                    <div className="border-t border-dashed border-gray-300 pt-3 text-xs text-center text-gray-400 pointer-events-none">
                      Zona inferior de firmas
                    </div>

                    {modoPosicion === 'manual' && (
                      <div
                        onMouseDown={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleIniciarArrastreSello(1, e.clientX, e.clientY, fallbackSheetRef.current);
                        }}
                        style={{
                          width: `${SELLO_W_PCT}%`,
                          height: `${SELLO_H_PCT}%`,
                          left: `${coords.xRatio * (100 - SELLO_W_PCT)}%`,
                          top: `${coords.yRatio * (100 - SELLO_H_PCT)}%`,
                        }}
                        className="absolute z-20 border-2 border-navy-900 bg-blue-50/95 rounded-md shadow-xl flex flex-col items-center justify-between p-1.5 cursor-grab active:cursor-grabbing ring-4 ring-blue-500/40"
                      >
                        <span className="text-[9px] font-extrabold text-navy-900">FIRMA DIGITAL</span>
                        <QrCode size={32} className="text-navy-900" />
                        <div className="w-full text-center leading-tight">
                          <p className="text-[8.5px] font-bold text-gray-900 truncate">
                            {usuario?.nombre || 'Firmante'}
                          </p>
                          <p className="text-[7px] text-gray-600 truncate">PAdES-BES · QR</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Vista compacta para Confirmación de rechazo, Procesando, Éxito o Error */
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            {['opciones', 'confirmandoRechazo'].includes(paso) && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Documento</span>
                  <span className="font-medium text-navy-900 text-right max-w-[240px] truncate">
                    {documento?.nombre}
                  </span>
                </div>
                <div
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    estaRechazado
                      ? 'bg-red-50 text-red-700'
                      : estaCompletado
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {estaRechazado ? (
                    <XCircle size={14} />
                  ) : estaCompletado ? (
                    <CheckCircle size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  <span>{getEstadoLabel(documento?.estado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subido por</span>
                  <span className="text-gray-700">{documento?.subido_por}</span>
                </div>
              </div>
            )}

            {paso === 'opciones' && estaRechazado && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex space-x-3">
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Documento rechazado</p>
                  <p className="text-xs text-red-600 mt-1">
                    Este documento fue rechazado y no puede modificarse. El docente deberá subir una nueva versión.
                  </p>
                </div>
              </div>
            )}

            {paso === 'opciones' && estaCompletado && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex space-x-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Documento completado</p>
                  <p className="text-xs text-green-600 mt-1">
                    Este documento tiene todas las firmas requeridas.
                  </p>
                </div>
              </div>
            )}

            {paso === 'confirmandoRechazo' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex space-x-2">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    El rechazo es definitivo. El docente deberá subir una nueva versión del documento.
                  </p>
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

            {paso === 'procesando' && (
              <div className="py-8 text-center">
                <Loader size={40} className="text-navy-700 animate-spin mx-auto mb-4" />
                <p className="text-navy-900 font-semibold">Procesando...</p>
                <p className="text-sm text-gray-500 mt-1">Por favor espere</p>
              </div>
            )}

            {paso === 'exito' && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <p className="text-navy-900 font-semibold text-lg">¡Firma aplicada!</p>
                <p className="text-sm text-gray-500 mt-1">El documento avanzó al siguiente estado</p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}

            {paso === 'rechazado' && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} className="text-red-500" />
                </div>
                <p className="text-navy-900 font-semibold text-lg">Documento rechazado</p>
                <p className="text-sm text-gray-500 mt-1">Se notificará al docente correspondiente</p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}

            {paso === 'error' && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <p className="text-navy-900 font-semibold">Error</p>
                <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
                <button
                  onClick={() => setPaso('opciones')}
                  className="mt-6 px-6 py-2.5 bg-navy-900 rounded-lg text-sm font-medium text-white hover:bg-navy-800 transition-colors"
                >
                  Volver
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
