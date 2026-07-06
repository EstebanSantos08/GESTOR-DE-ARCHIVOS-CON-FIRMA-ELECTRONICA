import React, { useState } from 'react';
import { X, Check, Circle, Clock, PenLine, XCircle } from 'lucide-react';
import Badge from '../components/common/Badge';
import ModalFirma from '../components/modals/ModalFirma';
import { useApp } from '../context/useApp';

function PasoTimeline({ numero, titulo, completado, activo }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          completado ? 'bg-green-500' : activo ? 'bg-blue-500' : 'bg-gray-100'
        }`}>
          {completado
            ? <Check size={14} className="text-white" />
            : activo
              ? <Clock size={14} className="text-white" />
              : <Circle size={14} className="text-gray-300" />
          }
        </div>
        {numero < 3 && <div className={`w-0.5 h-8 mt-1 ${completado ? 'bg-green-200' : 'bg-gray-100'}`} />}
      </div>
      <div className="pb-6">
        <p className={`text-sm font-medium ${completado ? 'text-green-700' : activo ? 'text-blue-700' : 'text-gray-400'}`}>
          Paso {numero}: {titulo}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {completado ? 'Completado' : activo ? 'En proceso' : 'Pendiente'}
        </p>
      </div>
    </div>
  );
}

export default function PanelLateralAuditoria() {
  const { documentoSeleccionado, setDocumentoSeleccionado, usuario } = useApp();
  const [modalAbierto, setModalAbierto] = useState(false);
  const doc = documentoSeleccionado;

  if (!doc) return null;

  const puedeFiremar =
    (usuario.rol === 'DECANO' && doc.estado === 'PENDIENTE') ||
    (usuario.rol === 'RECTOR' && doc.estado === 'FIRMADO_DECANO');

  const puedeVerModal =
    puedeFiremar ||
    doc.estado === 'RECHAZADO' ||
    doc.estado === 'COMPLETADO';

  const paso2Completado = doc.estado === 'FIRMADO_DECANO' || doc.estado === 'COMPLETADO';
  const paso3Completado = doc.estado === 'COMPLETADO';
  const paso2Activo = doc.estado === 'PENDIENTE';
  const paso3Activo = doc.estado === 'FIRMADO_DECANO';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={() => setDocumentoSeleccionado(null)}
      />
      <aside className="fixed right-0 top-0 h-screen w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="bg-navy-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold text-sm truncate pr-2">{doc.nombre}</h2>
          <button
            onClick={() => setDocumentoSeleccionado(null)}
            className="text-white/70 hover:text-white flex-shrink-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Estado */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">Estado actual:</span>
            <Badge tipo={doc.estado} />
          </div>

          {/* Preview simulado */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 h-40 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-14 bg-red-100 rounded mx-auto mb-2 flex items-center justify-center">
                <span className="text-xs font-bold text-red-500">PDF</span>
              </div>
              <p className="text-xs text-gray-400">{doc.nombre}</p>
            </div>
          </div>

          {/* Metadatos */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Metadatos</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-gray-500">Subido por</span>
              <span className="font-medium text-gray-800">{doc.subido_por}</span>
              <span className="text-gray-500">Fecha</span>
              <span className="font-medium text-gray-800">{doc.fecha}</span>
              <span className="text-gray-500">Tamaño</span>
              <span className="font-medium text-gray-800">{doc.tamanio}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500 block mb-1">Hash SHA-256</span>
              <span className="font-mono text-xs text-gray-700 break-all bg-white rounded p-2 block border border-gray-100">{doc.hash}</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Flujo de Firma</h3>
            <PasoTimeline numero={1} titulo="Carga del documento" completado={true} activo={false} />
            <PasoTimeline numero={2} titulo="Firma Decano" completado={paso2Completado} activo={paso2Activo} />
            <PasoTimeline numero={3} titulo="Firma Rector" completado={paso3Completado} activo={paso3Activo} />
          </div>

          {/* Firmantes */}
          {doc.firmantes && doc.firmantes.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Firmantes</h3>
              {doc.firmantes.map((f, i) => (
                <div key={i} className="flex items-center space-x-2 text-xs text-green-800">
                  <Check size={12} className="text-green-500" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón de acción */}
        {puedeVerModal && (
          <div className="p-5 border-t border-gray-100 flex-shrink-0">
            {puedeFiremar ? (
              <button
                onClick={() => setModalAbierto(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-navy-900 text-white rounded-xl font-medium text-sm hover:bg-navy-800 transition-colors shadow-lg"
              >
                <PenLine size={16} />
                <span>Firmar / Rechazar Documento</span>
              </button>
            ) : doc.estado === 'RECHAZADO' ? (
              <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                <XCircle size={16} />
                <span>Documento rechazado — sin acciones</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                <Check size={16} />
                <span>Documento completado</span>
              </div>
            )}
          </div>
        )}
      </aside>

      {modalAbierto && (
        <ModalFirma
          documento={doc}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

