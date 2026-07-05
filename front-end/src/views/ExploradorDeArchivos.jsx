import React, { useState, useRef } from 'react';
import { Folder, FolderOpen, Upload, Eye, PenLine, Info, FileText, ChevronRight } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Badge from '../components/common/Badge';
import { useApp } from '../context/AppContext';

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
  const { universidades, subirDocumento, setDocumentoSeleccionado, usuario } = useApp();
  const [nivel, setNivel] = useState('universidades');
  const [selUniId, setSelUniId] = useState(null);
  const [selFacId, setSelFacId] = useState(null);
  const [selCritId, setSelCritId] = useState(null);
  const [selActId, setSelActId] = useState(null);
  const [arrastrandoDrop, setArrastrandoDrop] = useState(false);
  const fileInputRef = useRef();

  const uniActual = universidades.find(u => u.id === selUniId);
  const facActual = uniActual?.facultades.find(f => f.id === selFacId);
  const critActual = facActual?.criterios.find(c => c.id === selCritId);
  const actActual = critActual?.actividades.find(a => a.id === selActId);

  function breadcrumbItems() {
    const items = [{ label: 'Inicio', onClick: () => setNivel('universidades') }];
    if (nivel === 'facultades' || nivel === 'criterios' || nivel === 'actividades' || nivel === 'documentos') {
      items.push({ label: uniActual?.siglas || uniActual?.nombre, onClick: () => setNivel('facultades') });
    }
    if (nivel === 'criterios' || nivel === 'actividades' || nivel === 'documentos') {
      items.push({ label: facActual?.nombre, onClick: () => setNivel('criterios') });
    }
    if (nivel === 'actividades' || nivel === 'documentos') {
      items.push({ label: critActual?.nombre, onClick: () => setNivel('actividades') });
    }
    if (nivel === 'documentos') {
      items.push({ label: actActual?.nombre, onClick: null });
    }
    return items;
  }

  function manejarArchivo(file) {
    if (!file || !file.name.endsWith('.pdf')) {
      alert('Solo se aceptan archivos PDF');
      return;
    }
    subirDocumento(file.name, selActId);
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrandoDrop(false);
    const file = e.dataTransfer.files[0];
    manejarArchivo(file);
  }

  function puedeFiremar(doc) {
    if (usuario.rol === 'DECANO' && doc.estado === 'PENDIENTE') return true;
    if (usuario.rol === 'RECTOR' && doc.estado === 'FIRMADO_DECANO') return true;
    return false;
  }

  return (
    <div className="flex flex-col h-full">
      <Breadcrumbs items={breadcrumbItems()} />

      <div className="flex-1 p-6 overflow-auto">
        {/* NIVEL: Universidades */}
        {nivel === 'universidades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Universidades</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {universidades.map(u => (
                <CarpetaCard
                  key={u.id}
                  nombre={u.nombre}
                  descripcion={u.siglas}
                  onClick={() => { setSelUniId(u.id); setNivel('facultades'); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* NIVEL: Facultades */}
        {nivel === 'facultades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Facultades — {uniActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniActual?.facultades.map(f => (
                <CarpetaCard
                  key={f.id}
                  nombre={f.nombre}
                  descripcion={`${f.criterios.length} criterios`}
                  onClick={() => { setSelFacId(f.id); setNivel('criterios'); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* NIVEL: Criterios */}
        {nivel === 'criterios' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Criterios — {facActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facActual?.criterios.map(c => (
                <CarpetaCard
                  key={c.id}
                  nombre={c.nombre}
                  descripcion={`${c.actividades.length} actividades · ${c.requiere_firma ? 'Requiere firma' : 'Sin firma'}`}
                  onClick={() => { setSelCritId(c.id); setNivel('actividades'); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* NIVEL: Actividades */}
        {nivel === 'actividades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Actividades — {critActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {critActual?.actividades.map(a => (
                <CarpetaCard
                  key={a.id}
                  nombre={a.nombre}
                  descripcion={`${a.documentos.length} documentos`}
                  onClick={() => { setSelActId(a.id); setNivel('documentos'); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* NIVEL: Documentos */}
        {nivel === 'documentos' && actActual && (
          <div className="space-y-5">
            {/* Info de actividad */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex space-x-3">
              <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{actActual.informacion_ayuda}</p>
            </div>

            {/* Drag & Drop */}
            <div
              onDragOver={e => { e.preventDefault(); setArrastrandoDrop(true); }}
              onDragLeave={() => setArrastrandoDrop(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                arrastrandoDrop
                  ? 'border-navy-500 bg-navy-50'
                  : 'border-gray-200 bg-white hover:border-navy-300 hover:bg-gray-50'
              }`}
            >
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
            </div>

            {/* Tabla de documentos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                  <FileText size={16} className="text-navy-700" />
                  <span>Documentos ({actActual.documentos.length})</span>
                </h3>
              </div>
              {actActual.documentos.length === 0 ? (
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
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tamaño</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {actActual.documentos.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2">
                              <FileText size={14} className="text-red-400 flex-shrink-0" />
                              <span className="font-medium text-gray-800 text-xs">{doc.nombre}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3"><Badge tipo={doc.estado} /></td>
                          <td className="px-5 py-3 text-gray-600 text-xs">{doc.subido_por}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{doc.fecha}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{doc.tamanio}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setDocumentoSeleccionado(doc)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-navy-700 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                              >
                                <Eye size={12} />
                                <span>Ver</span>
                              </button>
                              {puedeFiremar(doc) && (
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
