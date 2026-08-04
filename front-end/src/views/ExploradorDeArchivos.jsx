import React, { useState, useRef } from 'react';
import { Folder, Upload, Eye, PenLine, Info, FileText, ChevronRight, XCircle, RefreshCw, Pencil, Trash2, X, Save, Download, Search, Filter } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

function CarpetaCard({ nombre, descripcion, onClick, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-navy-200 transition-all duration-200 group relative">
      <button
        onClick={onClick}
        className="flex items-start space-x-4 p-5 text-left w-full"
      >
        <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
          <Folder size={24} className="text-navy-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy-900 text-sm leading-snug pr-14">{nombre}</p>
          {descripcion && <p className="text-xs text-gray-400 mt-1 truncate">{descripcion}</p>}
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-navy-500 mt-1 transition-colors flex-shrink-0" />
      </button>

      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-blue-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
              title="Editar"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-red-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModalEditar({ titulo, valor, onChange, onGuardar, onCancelar, extraCampos }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">{titulo}</h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <input
          value={valor}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          placeholder="Nombre"
          autoFocus
        />
        {extraCampos}
        <div className="flex space-x-2 pt-1">
          <button
            onClick={onGuardar}
            className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors"
          >
            <Save size={14} /><span>Guardar</span>
          </button>
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExploradorDeArchivos() {
  const {
    universidades,
    subirDocumento,
    setDocumentoSeleccionado,
    usuario,
    token,
    cargarDocumentosActividad,
    _inyectarDocumentosEnActividad,
    eliminarDocumento,
    actualizarUniversidad, eliminarUniversidad,
    actualizarFacultad, eliminarFacultad,
    actualizarCarrera, eliminarCarrera,
    actualizarPeriodo, eliminarPeriodo,
    actualizarCriterio, eliminarCriterio,
    actualizarIndicador, eliminarIndicador,
    actualizarActividad, eliminarActividad,
  } = useApp();

  const [nivel, setNivel] = useState('universidades');
  const [selUniId, setSelUniId] = useState(null);
  const [selFacId, setSelFacId] = useState(null);
  const [selCarrId, setSelCarrId] = useState(null);
  const [selPerId, setSelPerId] = useState(null);
  const [selCritId, setSelCritId] = useState(null);
  const [selIndId, setSelIndId] = useState(null);
  const [selActId, setSelActId] = useState(null);
  const [arrastrandoDrop, setArrastrandoDrop] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState('');
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [errorEdit, setErrorEdit] = useState('');
  const [eliminandoDocId, setEliminandoDocId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const fileInputRef = useRef();

  // Limpiar búsqueda y filtros al cambiar de nivel
  React.useEffect(() => {
    setBusqueda('');
    setFiltroEstado('');
  }, [nivel]);

  const esAdmin = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'RECTOR' || usuario?.rol === 'DECANO';

  async function handleDescargar(doc) {
    try {
      const res = await fetch(`http://localhost:3000/api/documentos/${doc.id}/descargar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  }

  const uniActual  = (universidades ?? []).find(u => u.id === selUniId);
  const facActual  = uniActual?.facultades?.find(f => f.id === selFacId);
  const carrActual = facActual?.carreras?.find(c => c.id === selCarrId);
  const periActual = carrActual?.periodos?.find(p => p.id === selPerId);
  const critActual = periActual?.criterios?.find(c => c.id === selCritId);
  const indActual  = critActual?.indicadores?.find(i => i.id === selIndId);
  const actActual  = indActual?.actividades?.find(a => a.id === selActId);

  function breadcrumbItems() {
    const items = [{ label: 'Inicio', onClick: () => setNivel('universidades') }];
    if (['facultades','carreras','periodos','criterios','indicadores','actividades','documentos'].includes(nivel))
      items.push({ label: uniActual?.siglas || uniActual?.nombre, onClick: () => setNivel('facultades') });
    if (['carreras','periodos','criterios','indicadores','actividades','documentos'].includes(nivel))
      items.push({ label: facActual?.nombre, onClick: () => setNivel('carreras') });
    if (['periodos','criterios','indicadores','actividades','documentos'].includes(nivel))
      items.push({ label: carrActual?.nombre, onClick: () => setNivel('periodos') });
    if (['criterios','indicadores','actividades','documentos'].includes(nivel))
      items.push({ label: periActual?.nombre, onClick: () => setNivel('criterios') });
    if (['indicadores','actividades','documentos'].includes(nivel))
      items.push({ label: critActual?.nombre, onClick: () => setNivel('indicadores') });
    if (['actividades','documentos'].includes(nivel))
      items.push({ label: indActual?.nombre, onClick: () => setNivel('actividades') });
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

  async function handleEliminarDoc(doc) {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminandoDocId(doc.id);
    try {
      await eliminarDocumento(doc.id, selActId);
    } catch (err) {
      alert(err.message);
    } finally {
      setEliminandoDocId(null);
    }
  }

  function puedeEliminarDoc(doc) {
    if (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'RECTOR') return true;
    return doc.subido_por === usuario.nombre && ['PENDIENTE', 'RECHAZADO'].includes(doc.estado);
  }

  function puedeFirmar(doc) {
    if (doc.estado === 'COMPLETADO' || doc.estado === 'RECHAZADO') return false;
    
    // Jerarquía de 4 pasos
    if (usuario.rol === 'DIRECTOR_CARRERA' && doc.estado === 'PENDIENTE') return true;
    if (usuario.rol === 'SUBDECANO' && doc.estado === 'FIRMADO_DIRECTOR') return true;
    if (usuario.rol === 'DECANO' && doc.estado === 'FIRMADO_SUBDECANO') return true;
    if (usuario.rol === 'RECTOR' && doc.estado === 'FIRMADO_DECANO') return true;
    
    return false;
  }

  // ── Editar ────────────────────────────────────────────────────────────────

  function abrirEditar(tipo, id, nombre, meta = {}) {
    setErrorEdit('');
    setModalEdit({ tipo, id, nombreEdit: nombre, meta });
  }

  async function guardarEditar() {
    if (!modalEdit || !modalEdit.nombreEdit.trim()) return;
    const { tipo, id, nombreEdit, meta } = modalEdit;
    try {
      if (tipo === 'universidad') {
        await actualizarUniversidad(id, { nombre: nombreEdit, siglas: meta.siglas });
      } else if (tipo === 'facultad') {
        await actualizarFacultad(id, meta.univId, { nombre: nombreEdit });
      } else if (tipo === 'carrera') {
        await actualizarCarrera(id, meta.univId, meta.facId, { nombre: nombreEdit });
      } else if (tipo === 'periodo') {
        await actualizarPeriodo(id, meta.univId, meta.facId, meta.carrId, { nombre: nombreEdit });
      } else if (tipo === 'criterio') {
        await actualizarCriterio(id, meta.univId, meta.facId, meta.carrId, meta.perId, { nombre: nombreEdit, requiere_firma: meta.requiere_firma });
      } else if (tipo === 'indicador') {
        await actualizarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, { nombre: nombreEdit });
      } else if (tipo === 'actividad') {
        await actualizarActividad(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, meta.indId, { nombre: nombreEdit });
      }
      setModalEdit(null);
    } catch (err) {
      setErrorEdit(err.message);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async function handleEliminar(tipo, id, nombre, meta = {}) {
    if (!window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      if (tipo === 'universidad') {
        await eliminarUniversidad(id);
        if (selUniId === id) setNivel('universidades');
      } else if (tipo === 'facultad') {
        await eliminarFacultad(id, meta.univId);
        if (selFacId === id) setNivel('facultades');
      } else if (tipo === 'carrera') {
        await eliminarCarrera(id, meta.univId, meta.facId);
        if (selCarrId === id) setNivel('carreras');
      } else if (tipo === 'periodo') {
        await eliminarPeriodo(id, meta.univId, meta.facId, meta.carrId);
        if (selPerId === id) setNivel('periodos');
      } else if (tipo === 'criterio') {
        await eliminarCriterio(id, meta.univId, meta.facId, meta.carrId, meta.perId);
        if (selCritId === id) setNivel('criterios');
      } else if (tipo === 'indicador') {
        await eliminarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId);
        if (selIndId === id) setNivel('indicadores');
      } else if (tipo === 'actividad') {
        await eliminarActividad(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, meta.indId);
        if (selActId === id) setNivel('actividades');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const docsActual = actActual?.documentos || [];

  const getFiltrados = (lista) => {
    if (!lista) return [];
    
    return lista.filter(item => {
      let matchBusqueda = true;
      let matchFiltro = true;

      // Buscador de texto
      if (busqueda) {
        const term = busqueda.toLowerCase();
        matchBusqueda = (
          item.nombre?.toLowerCase().includes(term) || 
          item.siglas?.toLowerCase().includes(term) ||
          item.estado?.toLowerCase().includes(term)
        );
      }

      // Filtro por estado (solo aplica si el item tiene estado, es decir, es un documento)
      if (filtroEstado && item.estado) {
        matchFiltro = item.estado === filtroEstado;
      }

      return matchBusqueda && matchFiltro;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Breadcrumbs items={breadcrumbItems()} />

      <div className="px-6 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 shadow-sm"
            />
          </div>
          
          {nivel === 'documentos' && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white shadow-sm"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="FIRMADO_DIRECTOR">Firmado (Director)</option>
                <option value="FIRMADO_SUBDECANO">Firmado (Subdecano)</option>
                <option value="FIRMADO_DECANO">Firmado (Decano)</option>
                <option value="COMPLETADO">Completado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Modal editar */}
      {modalEdit && (
        <ModalEditar
          titulo={`Editar nombre`}
          valor={modalEdit.nombreEdit}
          onChange={v => setModalEdit(p => ({ ...p, nombreEdit: v }))}
          onGuardar={guardarEditar}
          onCancelar={() => { setModalEdit(null); setErrorEdit(''); }}
          extraCampos={
            <>
              {modalEdit.tipo === 'universidad' && (
                <input
                  value={modalEdit.meta.siglas || ''}
                  onChange={e => setModalEdit(p => ({ ...p, meta: { ...p.meta, siglas: e.target.value } }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="Siglas (ESPE, UIO...)"
                />
              )}
              {errorEdit && <p className="text-xs text-red-600">{errorEdit}</p>}
            </>
          }
        />
      )}

      <div className="flex-1 p-6 overflow-auto">

        {nivel === 'universidades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Universidades</p>
            {universidades.length === 0
              ? <p className="text-sm text-gray-400 mt-8 text-center">No hay universidades configuradas</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFiltrados(universidades).map(u => (
                    <CarpetaCard
                      key={u.id} nombre={u.nombre} descripcion={u.siglas}
                      onClick={() => { setSelUniId(u.id); setNivel('facultades'); }}
                      onEdit={esAdmin ? () => abrirEditar('universidad', u.id, u.nombre, { siglas: u.siglas }) : null}
                      onDelete={esAdmin ? () => handleEliminar('universidad', u.id, u.nombre) : null}
                    />
                  ))}
                </div>
            }
          </div>
        )}

        {nivel === 'facultades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Facultades — {uniActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(uniActual?.facultades).map(f => (
                <CarpetaCard
                  key={f.id} nombre={f.nombre}
                  descripcion={`${f.carreras?.length || 0} carreras`}
                  onClick={() => { setSelFacId(f.id); setNivel('carreras'); }}
                  onEdit={esAdmin ? () => abrirEditar('facultad', f.id, f.nombre, { univId: selUniId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('facultad', f.id, f.nombre, { univId: selUniId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {nivel === 'carreras' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Carreras — {facActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(facActual?.carreras).map(c => (
                <CarpetaCard
                  key={c.id} nombre={c.nombre}
                  descripcion={`${c.periodos?.length || 0} períodos`}
                  onClick={() => { setSelCarrId(c.id); setNivel('periodos'); }}
                  onEdit={esAdmin ? () => abrirEditar('carrera', c.id, c.nombre, { univId: selUniId, facId: selFacId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('carrera', c.id, c.nombre, { univId: selUniId, facId: selFacId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {nivel === 'periodos' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Períodos — {carrActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(carrActual?.periodos).map(p => (
                <CarpetaCard
                  key={p.id} nombre={p.nombre}
                  descripcion={`${p.criterios?.length || 0} criterios`}
                  onClick={() => { setSelPerId(p.id); setNivel('criterios'); }}
                  onEdit={esAdmin ? () => abrirEditar('periodo', p.id, p.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('periodo', p.id, p.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {nivel === 'criterios' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Criterios — {periActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(periActual?.criterios).map(c => (
                <CarpetaCard
                  key={c.id} nombre={c.nombre}
                  descripcion={`${c.indicadores?.length || 0} indicadores · ${c.requiere_firma ? 'Requiere firma' : 'Sin firma'}`}
                  onClick={() => { setSelCritId(c.id); setNivel('indicadores'); }}
                  onEdit={esAdmin ? () => abrirEditar('criterio', c.id, c.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, requiere_firma: c.requiere_firma }) : null}
                  onDelete={esAdmin ? () => handleEliminar('criterio', c.id, c.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {nivel === 'indicadores' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Indicadores — {critActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(critActual?.indicadores).map(i => (
                <CarpetaCard
                  key={i.id} nombre={i.nombre}
                  descripcion={`${i.actividades?.length || 0} actividades${i.responsable_nombre ? ` · Responsable: ${i.responsable_nombre}` : ''}`}
                  onClick={() => { setSelIndId(i.id); setNivel('actividades'); }}
                  onEdit={esAdmin ? () => abrirEditar('indicador', i.id, i.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: selCritId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('indicador', i.id, i.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: selCritId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {nivel === 'actividades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Actividades — {indActual?.nombre}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(indActual?.actividades).map(a => (
                <CarpetaCard
                  key={a.id} nombre={a.nombre}
                  descripcion={`${a.documentos?.length || 0} documentos`}
                  onClick={() => entrarActividad(a.id)}
                  onEdit={esAdmin ? () => abrirEditar('actividad', a.id, a.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: selCritId, indId: selIndId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('actividad', a.id, a.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: selCritId, indId: selIndId }) : null}
                />
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

            {/* Subida — solo DOCENTE o RESPONSABLE_AREA pueden subir */}
            {(usuario.rol === 'DOCENTE' || usuario.rol === 'RESPONSABLE_AREA' || usuario.rol === 'DIRECTOR_CARRERA') && (
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
                      {getFiltrados(docsActual).map(doc => (
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
                              <button
                                onClick={() => handleDescargar(doc)}
                                title="Descargar PDF"
                                className="p-1.5 text-gray-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                              >
                                <Download size={12} />
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

                              {puedeEliminarDoc(doc) && (
                                <button
                                  onClick={() => handleEliminarDoc(doc)}
                                  disabled={eliminandoDocId === doc.id}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                  title="Eliminar documento"
                                >
                                  {eliminandoDocId === doc.id
                                    ? <RefreshCw size={12} className="animate-spin" />
                                    : <Trash2 size={12} />
                                  }
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
