import React, { useState, useRef } from 'react';
import { Folder, Upload, Eye, PenLine, Info, FileText, ChevronRight, XCircle, RefreshCw } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

function CarpetaCard({ nombre, descripcion, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-navy-200 transition-all duration-200 text-left group"
    >
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
          <Folder size={24} className="text-navy-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy-900 text-sm leading-snug">{nombre}</p>
          {descripcion && <p className="text-xs text-gray-400 mt-1 truncate">{descripcion}</p>}
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-navy-500 mt-1 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

export default function ExploradorDeArchivos() {
  const {
    universidades, subirDocumento,
    setDocumentoSeleccionado, usuario,
    cargarDocumentosActividad, _inyectarDocumentosEnActividad,
  } = useApp();

  const [nivel, setNivel] = useState('universidades');
  const [selUniId, setSelUniId] = useState(null);
  const [selFacId, setSelFacId] = useState(null);
  const [selCritId, setSelCritId] = useState(null);
  const [selActId, setSelActId] = useState(null);
  const [arrastrandoDrop, setArrastrandoDrop] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState('');
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const fileInputRef = useRef();

  const uniActual  = universidades.find(u => u.id === selUniId);
  const facActual  = uniActual?.facultades.find(f => f.id === selFacId);
  const critActual = facActual?.criterios.find(c => c.id === selCritId);
  const actActual  = critActual?.actividades.find(a => a.id === selActId);

  function breadcrumbItems() {
    const items = [{ label: 'Inicio', onClick: () => setNivel('universidades') }];
    if (['facultades','criterios','actividades','documentos'].includes(nivel))
      items.push({ label: uniActual?.siglas || uniActual?.nombre, onClick: () => setNivel('facultades') });
    if (['criterios','actividades','documentos'].includes(nivel))
      items.push({ label: facActual?.nombre, onClick: () => setNivel('criterios') });
    if (['actividades','documentos'].includes(nivel))
      items.push({ label: critActual?.nombre, onClick: () => setNivel('actividades') });
    if (nivel === 'documentos')
      items.push({ label: actActual?.nombre, onClick: null });
    return items;
  }

  async function entrarActividad(actId) {
    setSelActId(actId);
    setNivel('documentos');
    setCargandoDocs(true);
    try {
      const docs = await cargarDocumentosActividad(actId);
      _inyectarDocumentosEnActividad(actId, docs);
    } finally {
      setCargandoDocs(false);
    }
  }

  async function recargarDocs() {
    if (!selActId) return;
    setCargandoDocs(true);
    try {
      const docs = await cargarDocumentosActividad(selActId);
      _inyectarDocumentosEnActividad(selActId, docs);
    } finally {
      setCargandoDocs(false);
    }
  }

  async function manejarArchivo(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorSubida('Solo se aceptan archivos PDF');
      return;
    }
    setErrorSubida('');
    setSubiendo(true);
    try {
      await subirDocumento(file, selActId, facActual?.id);
    } catch (err) {
      setErrorSubida(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrandoDrop(false);
    manejarArchivo(e.dataTransfer.files[0]);
  }

  function puedeFirmar(doc) {
    if (doc.estado === 'COMPLETADO' || doc.estado === 'RECHAZADO') return false;
    if (usuario.rol === 'DECANO' && doc.estado === 'PENDIENTE') return true;
    if (usuario.rol === 'RECTOR' && doc.estado === 'FIRMADO_DECANO') return true;
    return false;
  }

  const docsActual = actActual?.documentos || [];

  return (
    <div className="flex flex-col h-full">
      <Breadcrumbs items={breadcrumbItems()} />

      <div className="flex-1 p-6 overflow-auto">

        {nivel === 'universidades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Universidades</p>
            {universidades.length === 0
              ? <p className="text-sm text-gray-400 mt-8 text-center">No hay universidades configuradas</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {universidades.map(u => (
                    <CarpetaCard key={u.id} nombre={u.nombre} descripcion={u.siglas}
                      onClick={() => { setSelUniId(u.id); setNivel('facultades'); }} />
                  ))}
                </div>
            }
          </div>
        )}

        {nivel === 'facultades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Facultades — {uniActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniActual?.facultades.map(f => (
                <CarpetaCard key={f.id} nombre={f.nombre}
                  descripcion={`${f.criterios.length} criterios`}
                  onClick={() => { setSelFacId(f.id); setNivel('criterios'); }} />
              ))}
            </div>
          </div>
        )}

        {nivel === 'criterios' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Criterios — {facActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facActual?.criterios.map(c => (
                <CarpetaCard key={c.id} nombre={c.nombre}
                  descripcion={`${c.actividades.length} actividades · ${c.requiere_firma ? 'Requiere firma' : 'Sin firma'}`}
                  onClick={() => { setSelCritId(c.id); setNivel('actividades'); }} />
              ))}
            </div>
          </div>
        )}

        {nivel === 'actividades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Actividades — {critActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {critActual?.actividades.map(a => (
                <CarpetaCard key={a.id} nombre={a.nombre}
                  descripcion={`${a.documentos.length} documentos`}
                  onClick={() => entrarActividad(a.id)} />
              ))}
            </div>
          </div>
        )}

        {nivel === 'documentos' && actActual && (
          <div className="space-y-5">
            {actActual.informacion_ayuda && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex space-x-3">
                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{actActual.informacion_ayuda}</p>
              </div>
            )}

            {/* Subida — solo DOCENTE */}
            {usuario.rol === 'DOCENTE' && (
              <div>
                {errorSubida && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <XCircle size={14} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{errorSubida}</span>
                  </div>
                )}
                <div
                  onDragOver={e => { e.preventDefault(); setArrastrandoDrop(true); }}
                  onDragLeave={() => setArrastrandoDrop(false)}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    arrastrandoDrop ? 'border-navy-500 bg-navy-50' : 'border-gray-200 bg-white hover:border-navy-300 hover:bg-gray-50'
                  }`}
                >
                  {subiendo ? (
                    <div className="flex flex-col items-center space-y-2">
                      <RefreshCw size={28} className="text-navy-500 animate-spin" />
                      <p className="text-sm text-navy-700 font-medium">Subiendo documento...</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} className={`mx-auto mb-3 ${arrastrandoDrop ? 'text-navy-600' : 'text-gray-300'}`} />
                      <p className="text-sm font-medium text-gray-700">Arrastra tu PDF aquí</p>
                      <p className="text-xs text-gray-400 mt-1">o</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-4 py-2 bg-navy-900 text-white text-xs font-medium rounded-lg hover:bg-navy-800 transition-colors"
                      >
                        Seleccionar archivo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => { manejarArchivo(e.target.files[0]); e.target.value = ''; }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tabla de documentos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                  <FileText size={16} className="text-navy-700" />
                  <span>Documentos ({docsActual.length})</span>
                </h3>
                <button
                  onClick={recargarDocs}
                  disabled={cargandoDocs}
                  className="flex items-center space-x-1 text-xs text-gray-500 hover:text-navy-700 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={13} className={cargandoDocs ? 'animate-spin' : ''} />
                  <span>Recargar</span>
                </button>
              </div>

              {cargandoDocs ? (
                <div className="py-12 flex justify-center">
                  <RefreshCw size={24} className="text-navy-400 animate-spin" />
                </div>
              ) : docsActual.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Sin documentos. Suba el primero.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Subido por</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {docsActual.map(doc => (
                        <tr
                          key={doc.id}
                          className={`hover:bg-gray-50/50 transition-colors ${doc.estado === 'RECHAZADO' ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2">
                              <FileText size={14} className={doc.estado === 'RECHAZADO' ? 'text-red-300' : 'text-red-400'} />
                              <span className="font-medium text-gray-800 text-xs">{doc.nombre}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Badge tipo={doc.estado} />
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-xs">{doc.subido_por}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{doc.fecha}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setDocumentoSeleccionado(doc)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                              >
                                <Eye size={12} />
                                <span>Ver</span>
                              </button>

                              {doc.estado === 'RECHAZADO' && (
                                <span className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg border border-red-100">
                                  <XCircle size={12} />
                                  <span>Rechazado</span>
                                </span>
                              )}

                              {puedeFirmar(doc) && (
                                <button
                                  onClick={() => setDocumentoSeleccionado(doc)}
                                  className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-700 transition-colors"
                                >
                                  <PenLine size={12} />
                                  <span>Firmar</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
