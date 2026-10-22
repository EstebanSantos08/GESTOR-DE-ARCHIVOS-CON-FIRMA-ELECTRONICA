import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  Upload,
  Eye,
  PenLine,
  Info,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderOpen,
  Layers,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

const STORAGE_CTX_KEY = 'gestdoc_explorador_ctx_v1';

function CarpetaCard({ nombre, descripcion, badgeText, badgeColor = 'gray', onClick, onEdit, onDelete }) {
  const badgeClasses = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  };

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
          {badgeText && (
            <span className={`inline-block mt-2 px-2 py-0.5 text-[11px] font-medium rounded-full border ${badgeClasses[badgeColor] || badgeClasses.gray}`}>
              {badgeText}
            </span>
          )}
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

function ModalConfirmar({ abierto, titulo, mensaje, onConfirmar, onCancelar }) {
  const [cargando, setCargando] = useState(false);

  if (!abierto) return null;

  const handleConfirm = async () => {
    setCargando(true);
    try {
      await onConfirmar();
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-sm mx-auto space-y-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 leading-6">{titulo || 'Confirmar eliminación'}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{mensaje}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={cargando}
            className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {cargando ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>{cargando ? 'Eliminando...' : 'Eliminar'}</span>
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
    cargarDocumentosSubcriterio,
    cargarDocumentosActividad,
    _inyectarDocumentosEnSubcriterio,
    _inyectarDocumentosEnActividad,
    eliminarDocumento,
    actualizarUniversidad, eliminarUniversidad,
    actualizarFacultad, eliminarFacultad,
    actualizarCarrera, eliminarCarrera,
    actualizarPeriodo, eliminarPeriodo,
    actualizarCriterio, eliminarCriterio,
    actualizarIndicador, eliminarIndicador,
    navParams,
  } = useApp();

  const cargarDocsFn = cargarDocumentosSubcriterio || cargarDocumentosActividad;
  const inyectarDocsFn = _inyectarDocumentosEnSubcriterio || _inyectarDocumentosEnActividad;

  const [nivel, setNivel] = useState('universidades');
  const [selUniId, setSelUniId] = useState(null);
  const [selFacId, setSelFacId] = useState(null);
  const [selPerId, setSelPerId] = useState(null);
  const [selCarrId, setSelCarrId] = useState(null);
  const [selCritId, setSelCritId] = useState(null);
  const [selIndId, setSelIndId] = useState(null);

  // Vista rápida en Carrera: tabla unificada vs carpetas
  const [modoVistaCarrera, setModoVistaCarrera] = useState('tabla'); // 'tabla' | 'carpetas'
  const [filtroCriterioId, setFiltroCriterioId] = useState('TODOS');
  const [filtroEvidencia, setFiltroEvidencia] = useState('TODOS'); // 'TODOS' | 'CON_DOCS' | 'PENDIENTES'
  const [subExpandidoId, setSubExpandidoId] = useState(null);
  const [subSubiendoId, setSubSubiendoId] = useState(null);
  const [subArrastrandoId, setSubArrastrandoId] = useState(null);
  const [exitoRapido, setExitoRapido] = useState('');

  const [arrastrandoDrop, setArrastrandoDrop] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState('');
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalConfirm, setModalConfirm] = useState({ abierto: false, titulo: '', mensaje: '', onConfirm: null });
  const [errorEdit, setErrorEdit] = useState('');
  const [eliminandoDocId, setEliminandoDocId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const fileInputRef = useRef();
  const quickFileInputRef = useRef();
  const [targetSubIdParaUpload, setTargetSubIdParaUpload] = useState(null);
  const autoInitRef = useRef(false);

  // 1. Soporte de salto directo desde Parametrización o navParams
  useEffect(() => {
    if (navParams && universidades?.length > 0) {
      const { univId, facId, perId, carrId, critId, subId } = navParams;
      if (univId) setSelUniId(Number(univId));
      if (facId) setSelFacId(Number(facId));
      if (perId) setSelPerId(Number(perId));
      if (carrId) setSelCarrId(Number(carrId));
      if (critId) {
        setSelCritId(Number(critId));
        setFiltroCriterioId(String(critId));
      }
      if (subId) {
        autoInitRef.current = true;
        entrarSubcriterio(Number(subId));
        return;
      } else if (carrId) {
        autoInitRef.current = true;
        setNivel('criterios');
        return;
      }
    }
  }, [navParams, universidades]);

  // 2. Auto-selección inteligente y restauración de contexto en localStorage
  useEffect(() => {
    if (!universidades || universidades.length === 0 || autoInitRef.current) return;
    autoInitRef.current = true;

    try {
      const guardado = JSON.parse(localStorage.getItem(STORAGE_CTX_KEY) || 'null');
      if (guardado) {
        const u = universidades.find(x => x.id === Number(guardado.uniId));
        const f = u?.facultades?.find(x => x.id === Number(guardado.facId));
        const p = f?.periodos?.find(x => x.id === Number(guardado.perId));
        const c = (p?.carreras || f?.carreras || []).find(x => x.id === Number(guardado.carrId));

        if (u && f && p && c) {
          setSelUniId(u.id);
          setSelFacId(f.id);
          setSelPerId(p.id);
          setSelCarrId(c.id);
          setNivel('criterios');
          return;
        }
      }
    } catch {
      // Ignorar errores de parseo en localStorage
    }

    // Si no hay sesión previa válida, auto-avanzar niveles con 1 sola opción
    if (universidades.length === 1) {
      const u = universidades[0];
      setSelUniId(u.id);

      const facs = u.facultades || [];
      if (facs.length === 1) {
        const f = facs[0];
        setSelFacId(f.id);

        const pers = f.periodos || [];
        if (pers.length === 1) {
          const p = pers[0];
          setSelPerId(p.id);

          const carrs = p.carreras || f.carreras || [];
          if (carrs.length === 1) {
            setSelCarrId(carrs[0].id);
            setNivel('criterios');
          } else {
            setNivel('carreras');
          }
        } else if (pers.length > 1) {
          // Preseleccionar el último período (más reciente) si tiene carreras
          const ultimoPeriodo = pers[pers.length - 1];
          setSelPerId(ultimoPeriodo.id);
          const carrs = ultimoPeriodo.carreras || f.carreras || [];
          if (carrs.length === 1) {
            setSelCarrId(carrs[0].id);
            setNivel('criterios');
          } else {
            setNivel('carreras');
          }
        } else {
          setNivel('periodos');
        }
      } else {
        setNivel('facultades');
      }
    }
  }, [universidades]);

  // Guardar selección activa en localStorage cuando llega a una carrera
  useEffect(() => {
    if (selUniId && selFacId && selPerId && selCarrId) {
      try {
        localStorage.setItem(
          STORAGE_CTX_KEY,
          JSON.stringify({ uniId: selUniId, facId: selFacId, perId: selPerId, carrId: selCarrId })
        );
      } catch {
        // Ignorar errores de cuota
      }
    }
  }, [selUniId, selFacId, selPerId, selCarrId]);

  useEffect(() => {
    setBusqueda('');
    setFiltroEstado('');
  }, [nivel]);

  const userRoles = usuario?.roles || [];
  const esAdmin = userRoles.includes('ADMINISTRADOR') || userRoles.includes('RECTOR') || userRoles.includes('DECANO');

  const uniActual  = (universidades ?? []).find(u => u.id === Number(selUniId));
  const facActual  = uniActual?.facultades?.find(f => f.id === Number(selFacId));
  const periActual = facActual?.periodos?.find(p => p.id === Number(selPerId));
  const carrActual = periActual?.carreras?.find(c => c.id === Number(selCarrId)) || facActual?.carreras?.find(c => c.id === Number(selCarrId));
  const critActual = carrActual?.criterios?.find(c => c.id === Number(selCritId));
  const subActual  = (
    critActual?.subcriterios ||
    critActual?.indicadores ||
    (carrActual?.criterios || []).flatMap(cr => cr.subcriterios || cr.indicadores || [])
  )?.find(i => i.id === Number(selIndId));

  // Handlers de cambio rápido en la barra superior
  function handleSelectRapidoUni(id) {
    const numId = id ? Number(id) : null;
    setSelUniId(numId);
    setSelFacId(null);
    setSelPerId(null);
    setSelCarrId(null);
    setSelCritId(null);
    setSelIndId(null);
    setNivel(numId ? 'facultades' : 'universidades');
  }

  function handleSelectRapidoFac(id) {
    const numId = id ? Number(id) : null;
    setSelFacId(numId);
    setSelPerId(null);
    setSelCarrId(null);
    setSelCritId(null);
    setSelIndId(null);
    if (!numId) {
      setNivel('facultades');
      return;
    }
    const f = uniActual?.facultades?.find(x => x.id === numId);
    const pers = f?.periodos || [];
    if (pers.length === 1) {
      const p = pers[0];
      setSelPerId(p.id);
      const carrs = p.carreras || f.carreras || [];
      if (carrs.length === 1) {
        setSelCarrId(carrs[0].id);
        setNivel('criterios');
      } else {
        setNivel('carreras');
      }
    } else {
      setNivel('periodos');
    }
  }

  function handleSelectRapidoPer(id) {
    const numId = id ? Number(id) : null;
    setSelPerId(numId);
    setSelCarrId(null);
    setSelCritId(null);
    setSelIndId(null);
    if (!numId) {
      setNivel('periodos');
      return;
    }
    const p = facActual?.periodos?.find(x => x.id === numId);
    const carrs = p?.carreras || facActual?.carreras || [];
    if (carrs.length === 1) {
      setSelCarrId(carrs[0].id);
      setNivel('criterios');
    } else {
      setNivel('carreras');
    }
  }

  function handleSelectRapidoCarr(id) {
    const numId = id ? Number(id) : null;
    setSelCarrId(numId);
    setSelCritId(null);
    setSelIndId(null);
    setFiltroCriterioId('TODOS');
    setSubExpandidoId(null);
    setNivel(numId ? 'criterios' : 'carreras');
  }

  async function handleDescargar(doc) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/documentos/${doc.id}/descargar`, {
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

  function breadcrumbItems() {
    const items = [{ label: 'Inicio', onClick: () => setNivel('universidades') }];
    if (['facultades','periodos','carreras','criterios','subcriterios','indicadores','documentos'].includes(nivel) && uniActual)
      items.push({ label: uniActual?.siglas || uniActual?.nombre, onClick: () => setNivel('facultades') });
    if (['periodos','carreras','criterios','subcriterios','indicadores','documentos'].includes(nivel) && facActual)
      items.push({ label: facActual?.nombre, onClick: () => setNivel('periodos') });
    if (['carreras','criterios','subcriterios','indicadores','documentos'].includes(nivel) && periActual)
      items.push({ label: periActual?.nombre, onClick: () => setNivel('carreras') });
    if (['criterios','subcriterios','indicadores','documentos'].includes(nivel) && carrActual)
      items.push({ label: carrActual?.nombre, onClick: () => { setFiltroCriterioId('TODOS'); setNivel('criterios'); } });
    if (['subcriterios','indicadores'].includes(nivel) && critActual)
      items.push({ label: critActual?.nombre, onClick: () => setNivel('subcriterios') });
    if (nivel === 'documentos' && subActual)
      items.push({ label: `[${subActual.numero}] ${subActual.nombre}`, onClick: null });
    return items;
  }

  async function entrarSubcriterio(subId, critIdOpcional = null) {
    if (critIdOpcional) setSelCritId(critIdOpcional);
    setSelIndId(subId);
    setNivel('documentos');
    setCargandoDocs(true);
    try {
      const docs = await cargarDocsFn(subId);
      inyectarDocsFn(subId, docs);
    } finally {
      setCargandoDocs(false);
    }
  }

  async function toggleExpandirSubcriterio(subId, critIdOpcional = null) {
    if (subExpandidoId === subId) {
      setSubExpandidoId(null);
      return;
    }
    if (critIdOpcional) setSelCritId(critIdOpcional);
    setSubExpandidoId(subId);
    setCargandoDocs(true);
    try {
      const docs = await cargarDocsFn(subId);
      inyectarDocsFn(subId, docs);
    } finally {
      setCargandoDocs(false);
    }
  }

  async function recargarDocs(subIdTarget = selIndId) {
    if (!subIdTarget) return;
    setCargandoDocs(true);
    try {
      const docs = await cargarDocsFn(subIdTarget);
      inyectarDocsFn(subIdTarget, docs);
    } finally {
      setCargandoDocs(false);
    }
  }

  async function manejarArchivo(file, subIdDestino = selIndId) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorSubida('Solo se aceptan archivos PDF');
      return;
    }
    if (!subIdDestino) return;

    setErrorSubida('');
    setSubiendo(true);
    setSubSubiendoId(subIdDestino);
    try {
      await subirDocumento(file, subIdDestino, facActual?.id);
      const docs = await cargarDocsFn(subIdDestino);
      inyectarDocsFn(subIdDestino, docs);
      setSubExpandidoId(subIdDestino);
      setExitoRapido(`PDF "${file.name}" subido correctamente.`);
      setTimeout(() => setExitoRapido(''), 3500);
    } catch (err) {
      setErrorSubida(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
      setSubSubiendoId(null);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setArrastrandoDrop(false);
    manejarArchivo(e.dataTransfer.files[0], selIndId);
  }

  function handleEliminarDoc(doc, subIdContext = selIndId) {
    setModalConfirm({
      abierto: true,
      titulo: 'Eliminar documento',
      mensaje: `¿Estás seguro de eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setEliminandoDocId(doc.id);
        try {
          await eliminarDocumento(doc.id, subIdContext);
        } catch (err) {
          alert(err.message);
        } finally {
          setEliminandoDocId(null);
        }
      },
    });
  }

  function puedeEliminarDoc(doc) {
    if (userRoles.includes('ADMINISTRADOR') || userRoles.includes('RECTOR')) return true;
    return doc.subido_por === usuario?.nombre && ['PENDIENTE', 'RECHAZADO'].includes(doc.estado);
  }

  function puedeFirmar(doc) {
    if (!doc.estado || doc.estado === 'COMPLETADO' || doc.estado === 'RECHAZADO') return false;
    // eslint-disable-next-line eqeqeq
    return doc.firmante_actual_id == usuario?.id;
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
      } else if (tipo === 'indicador' || tipo === 'subcriterio') {
        await actualizarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, { nombre: nombreEdit });
      }
      setModalEdit(null);
    } catch (err) {
      setErrorEdit(err.message);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  function handleEliminar(tipo, id, nombre, meta = {}) {
    setModalConfirm({
      abierto: true,
      titulo: `Eliminar ${tipo}`,
      mensaje: `¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
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
          } else if (tipo === 'indicador' || tipo === 'subcriterio') {
            await eliminarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId);
            if (selIndId === id) setNivel('criterios');
          }
        } catch (err) {
          alert(err.message);
        }
      },
    });
  }

  const docsActual = subActual?.documentos || [];

  const getFiltrados = (lista) => {
    if (!lista) return [];
    return lista.filter(item => {
      let matchBusqueda = true;
      let matchFiltro = true;

      if (busqueda) {
        const term = busqueda.toLowerCase();
        matchBusqueda = (
          item.nombre?.toLowerCase().includes(term) ||
          item.siglas?.toLowerCase().includes(term) ||
          item.estado?.toLowerCase().includes(term) ||
          String(item.numero || '').includes(term)
        );
      }

      if (filtroEstado && item.estado) {
        matchFiltro = item.estado === filtroEstado;
      }

      return matchBusqueda && matchFiltro;
    });
  };

  // Cálculo de subcriterios y avance de la carrera seleccionada
  const todosSubcriteriosCarrera = (carrActual?.criterios || []).flatMap(cr =>
    (cr.subcriterios || cr.indicadores || []).map(sub => {
      const totalDocs = typeof sub.cantidadDocumentos === 'number'
        ? sub.cantidadDocumentos
        : (sub.documentos?.length || 0);
      return {
        ...sub,
        criterioId: cr.id,
        criterioNombre: cr.nombre,
        criterioRequiereFirma: cr.requiere_firma,
        totalDocs,
      };
    })
  ).sort((a, b) => (a.numero || 0) - (b.numero || 0));

  const totalSubsCarrera = todosSubcriteriosCarrera.length;
  const subsConEvidencia = todosSubcriteriosCarrera.filter(s => s.totalDocs > 0).length;
  const totalPdfsCarrera = todosSubcriteriosCarrera.reduce((acc, s) => acc + s.totalDocs, 0);
  const porcentajeAvance = totalSubsCarrera > 0 ? Math.round((subsConEvidencia / totalSubsCarrera) * 100) : 0;

  const subcriteriosCarreraFiltrados = todosSubcriteriosCarrera.filter(sub => {
    if (filtroCriterioId !== 'TODOS' && String(sub.criterioId) !== String(filtroCriterioId)) {
      return false;
    }
    if (filtroEvidencia === 'CON_DOCS' && sub.totalDocs === 0) return false;
    if (filtroEvidencia === 'PENDIENTES' && sub.totalDocs > 0) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const respStr = (sub.responsables || []).map(r => r.nombre).join(' ').toLowerCase();
      return (
        sub.nombre?.toLowerCase().includes(q) ||
        sub.criterioNombre?.toLowerCase().includes(q) ||
        String(sub.numero || '').includes(q) ||
        sub.responsable_nombre?.toLowerCase().includes(q) ||
        respStr.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <Breadcrumbs items={breadcrumbItems()} />

      {/* Input oculto para subida rápida en 1 clic desde cualquier fila de la tabla */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && targetSubIdParaUpload) {
            manejarArchivo(file, targetSubIdParaUpload);
          }
          e.target.value = '';
        }}
      />

      {/* ── Barra Superior de Salto Rápido (Contexto en 1 Clic) ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-navy-800 mr-1">
            <Layers size={14} className="text-navy-600" />
            <span>Acceso Rápido:</span>
          </div>

          {/* Selector Universidad (solo si hay más de 1) */}
          {universidades.length > 1 ? (
            <select
              value={selUniId || ''}
              onChange={e => handleSelectRapidoUni(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 font-medium text-gray-700"
            >
              <option value="">Universidad...</option>
              {universidades.map(u => (
                <option key={u.id} value={u.id}>{u.siglas || u.nombre}</option>
              ))}
            </select>
          ) : uniActual ? (
            <span className="px-2.5 py-1 bg-navy-50 text-navy-800 rounded-lg text-xs font-semibold border border-navy-100">
              {uniActual.siglas || uniActual.nombre}
            </span>
          ) : null}

          {/* Selector Facultad */}
          <select
            value={selFacId || ''}
            onChange={e => handleSelectRapidoFac(e.target.value)}
            disabled={!uniActual}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 font-medium text-gray-700 disabled:opacity-40"
          >
            <option value="">Seleccionar Facultad...</option>
            {(uniActual?.facultades || []).map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>

          {/* Selector Período */}
          <select
            value={selPerId || ''}
            onChange={e => handleSelectRapidoPer(e.target.value)}
            disabled={!facActual}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 font-medium text-gray-700 disabled:opacity-40"
          >
            <option value="">Seleccionar Período...</option>
            {(facActual?.periodos || []).map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {/* Selector Carrera */}
          <select
            value={selCarrId || ''}
            onChange={e => handleSelectRapidoCarr(e.target.value)}
            disabled={!periActual}
            className="text-xs border border-navy-200 rounded-lg px-3 py-1.5 bg-navy-50/60 hover:bg-navy-50 focus:outline-none focus:ring-2 focus:ring-navy-500 font-semibold text-navy-900 disabled:opacity-40"
          >
            <option value="">Seleccionar Carrera...</option>
            {(periActual?.carreras || facActual?.carreras || []).map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Buscador integrado en la barra */}
          <div className="relative flex-1 min-w-[200px] ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={
                carrActual && (nivel === 'criterios' || nivel === 'subcriterios')
                  ? 'Buscar por N° (1..31), subcriterio, criterio o responsable...'
                  : 'Buscar por nombre...'
              }
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 shadow-2xs"
            />
          </div>

          {nivel === 'documentos' && (
            <div className="flex items-center space-x-1.5">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
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

      {/* Alertas rápidas de subida o error */}
      {(exitoRapido || errorSubida) && (
        <div className="px-6 pt-3">
          {exitoRapido && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800">{exitoRapido}</span>
              </div>
              <button onClick={() => setExitoRapido('')} className="text-emerald-500 hover:text-emerald-700">
                <X size={14} />
              </button>
            </div>
          )}
          {errorSubida && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle size={16} className="text-red-500" />
                <span className="text-xs font-medium text-red-700">{errorSubida}</span>
              </div>
              <button onClick={() => setErrorSubida('')} className="text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal editar */}
      {modalEdit && (
        <ModalEditar
          titulo="Editar nombre"
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

      {/* Modal confirmación */}
      <ModalConfirmar
        abierto={modalConfirm.abierto}
        titulo={modalConfirm.titulo}
        mensaje={modalConfirm.mensaje}
        onConfirmar={async () => {
          if (modalConfirm.onConfirm) {
            await modalConfirm.onConfirm();
          }
          setModalConfirm({ abierto: false, titulo: '', mensaje: '', onConfirm: null });
        }}
        onCancelar={() => setModalConfirm({ abierto: false, titulo: '', mensaje: '', onConfirm: null })}
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Nivel 1: Universidades */}
        {nivel === 'universidades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Universidades</p>
            {universidades.length === 0 ? (
              <p className="text-sm text-gray-400 mt-8 text-center">No hay universidades configuradas</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFiltrados(universidades).map(u => (
                  <CarpetaCard
                    key={u.id}
                    nombre={u.nombre}
                    descripcion={u.siglas}
                    badgeText={`${u.facultades?.length || 0} facultades`}
                    onClick={() => handleSelectRapidoUni(u.id)}
                    onEdit={esAdmin ? () => abrirEditar('universidad', u.id, u.nombre, { siglas: u.siglas }) : null}
                    onDelete={esAdmin ? () => handleEliminar('universidad', u.id, u.nombre) : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nivel 2: Facultades */}
        {nivel === 'facultades' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">
              Facultades — {uniActual?.nombre}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(uniActual?.facultades).map(f => (
                <CarpetaCard
                  key={f.id}
                  nombre={f.nombre}
                  descripcion={`${f.periodos?.length || 0} períodos · ${f.carreras?.length || 0} carreras`}
                  onClick={() => handleSelectRapidoFac(f.id)}
                  onEdit={esAdmin ? () => abrirEditar('facultad', f.id, f.nombre, { univId: selUniId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('facultad', f.id, f.nombre, { univId: selUniId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nivel 3: Períodos */}
        {nivel === 'periodos' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">
              Períodos Académicos — {facActual?.nombre}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(facActual?.periodos).map(p => (
                <CarpetaCard
                  key={p.id}
                  nombre={p.nombre}
                  descripcion={`${p.carreras?.length || 0} carreras habilitadas`}
                  onClick={() => handleSelectRapidoPer(p.id)}
                  onEdit={esAdmin ? () => abrirEditar('periodo', p.id, p.nombre, { univId: selUniId, facId: selFacId }) : null}
                  onDelete={esAdmin ? () => handleEliminar('periodo', p.id, p.nombre, { univId: selUniId, facId: selFacId }) : null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nivel 4: Carreras */}
        {nivel === 'carreras' && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">
              Seleccione una Carrera — {periActual?.nombre} ({facActual?.nombre})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFiltrados(periActual?.carreras || facActual?.carreras).map(c => {
                const subs = (c.criterios || []).flatMap(cr => cr.subcriterios || cr.indicadores || []);
                const conDoc = subs.filter(s => (typeof s.cantidadDocumentos === 'number' ? s.cantidadDocumentos : (s.documentos?.length || 0)) > 0).length;
                return (
                  <CarpetaCard
                    key={c.id}
                    nombre={c.nombre}
                    descripcion={`${c.criterios?.length || 0} criterios · ${subs.length} subcriterios`}
                    badgeText={`${conDoc} / ${subs.length} subcriterios con PDF`}
                    badgeColor={conDoc > 0 ? 'green' : 'amber'}
                    onClick={() => handleSelectRapidoCarr(c.id)}
                    onEdit={esAdmin ? () => abrirEditar('carrera', c.id, c.nombre, { univId: selUniId, facId: selFacId }) : null}
                    onDelete={esAdmin ? () => handleEliminar('carrera', c.id, c.nombre, { univId: selUniId, facId: selFacId }) : null}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VISTA UNIFICADA DE CARRERA (Criterios + 31 Subcriterios en 1 paso)
           ══════════════════════════════════════════════════════════════════ */}
        {(nivel === 'criterios' || nivel === 'subcriterios' || nivel === 'indicadores') && carrActual && (
          <div className="space-y-4">
            {/* Cabecera resumen de la Carrera + Progreso */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {carrActual.nombre}
                  </span>
                  <span className="text-xs text-gray-500">
                    {periActual?.nombre} · {facActual?.nombre}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sube o consulta los PDFs directamente en cada uno de los {totalSubsCarrera} subcriterios sin cambiar de pantalla.
                </p>
              </div>

              {/* Barra de Progreso de Evidencias */}
              <div className="flex items-center space-x-4">
                <div className="min-w-[210px]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600">
                      Avance: <strong className="text-navy-900">{subsConEvidencia}/{totalSubsCarrera}</strong> subcriterios
                    </span>
                    <span className="font-bold text-navy-800">{porcentajeAvance}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${porcentajeAvance}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {totalPdfsCarrera} documento{totalPdfsCarrera === 1 ? '' : 's'} PDF en total
                  </p>
                </div>

                {/* Conmutador Tabla Rápida vs Carpetas */}
                <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setModoVistaCarrera('tabla')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      modoVistaCarrera === 'tabla' ? 'bg-white text-navy-900 shadow-2xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Vista de Tabla Directa (1 paso)"
                  >
                    <TableIcon size={13} />
                    <span>Tabla Rápida</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVistaCarrera('carpetas')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      modoVistaCarrera === 'carpetas' ? 'bg-white text-navy-900 shadow-2xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Vista por Carpetas"
                  >
                    <LayoutGrid size={13} />
                    <span>Carpetas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Píldoras de Filtro por Criterio (1..5) + Estado */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltroCriterioId('TODOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filtroCriterioId === 'TODOS'
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Todos ({totalSubsCarrera})
                </button>
                {(carrActual.criterios || []).map(c => {
                  const cant = (c.subcriterios || c.indicadores || []).length;
                  const activo = String(filtroCriterioId) === String(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFiltroCriterioId(String(c.id))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activo
                          ? 'bg-navy-800 text-white shadow-2xs'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {c.nombre} ({cant})
                    </button>
                  );
                })}
              </div>

              {/* Filtro rápido por estado de documentos */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'CON_DOCS', label: `Con PDF (${subsConEvidencia})` },
                  { id: 'PENDIENTES', label: `Vacíos (${totalSubsCarrera - subsConEvidencia})` },
                ].map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setFiltroEvidencia(op.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      filtroEvidencia === op.id
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MODO 1: TABLA RÁPIDA DE SUBCRITERIOS CON SUBIDA EN 1 CLIC */}
            {modoVistaCarrera === 'tabla' ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                {subcriteriosCarreraFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No hay subcriterios que coincidan con el filtro seleccionado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-16">N°</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subcriterio</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Criterio</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Responsable</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Evidencias PDF</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acción Rápida (1 Clic)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {subcriteriosCarreraFiltrados.map(sub => {
                          const expandido = subExpandidoId === sub.id;
                          const estaSubiendo = subSubiendoId === sub.id;
                          const estaArrastrando = subArrastrandoId === sub.id;
                          const docsSub = sub.documentos || [];
                          const respTexto = sub.responsables?.length > 0
                            ? sub.responsables.map(r => r.nombre).join(', ')
                            : sub.responsable_nombre;

                          return (
                            <React.Fragment key={sub.id}>
                              <tr
                                onDragOver={e => { e.preventDefault(); setSubArrastrandoId(sub.id); }}
                                onDragLeave={() => setSubArrastrandoId(null)}
                                onDrop={e => {
                                  e.preventDefault();
                                  setSubArrastrandoId(null);
                                  manejarArchivo(e.dataTransfer.files?.[0], sub.id);
                                }}
                                className={`transition-colors ${
                                  estaArrastrando
                                    ? 'bg-navy-50/80 ring-2 ring-navy-400'
                                    : expandido
                                      ? 'bg-slate-50/90'
                                      : 'hover:bg-gray-50/70'
                                }`}
                              >
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-navy-100 text-navy-800">
                                    [{sub.numero}]
                                  </span>
                                </td>

                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => entrarSubcriterio(sub.id, sub.criterioId)}
                                    className="text-left group"
                                  >
                                    <span className="font-semibold text-navy-900 group-hover:text-blue-600 transition-colors text-xs">
                                      {sub.nombre}
                                    </span>
                                    {(sub.informacion_ayuda || sub.descripcion) && (
                                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                                        {sub.informacion_ayuda || sub.descripcion}
                                      </p>
                                    )}
                                  </button>
                                </td>

                                <td className="px-4 py-3">
                                  <span className="text-xs text-gray-600 font-medium">{sub.criterioNombre}</span>
                                </td>

                                <td className="px-4 py-3">
                                  {respTexto ? (
                                    <span className="text-xs text-gray-700">{respTexto}</span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Sin asignar</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {sub.totalDocs > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandirSubcriterio(sub.id, sub.criterioId)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                    >
                                      <CheckCircle2 size={12} />
                                      <span>{sub.totalDocs} PDF{sub.totalDocs === 1 ? '' : 's'}</span>
                                      {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock size={12} />
                                      <span>Pendiente</span>
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    {/* Botón Subir PDF en 1 clic */}
                                    <button
                                      type="button"
                                      disabled={estaSubiendo}
                                      onClick={() => {
                                        setTargetSubIdParaUpload(sub.id);
                                        quickFileInputRef.current?.click();
                                      }}
                                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-navy-900 text-white text-xs font-medium rounded-lg hover:bg-navy-800 transition-colors shadow-2xs disabled:opacity-50"
                                      title="Subir archivo PDF directamente a este subcriterio"
                                    >
                                      {estaSubiendo ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                      ) : (
                                        <Upload size={12} />
                                      )}
                                      <span>{estaSubiendo ? 'Subiendo...' : 'Subir PDF'}</span>
                                    </button>

                                    {/* Botón Ver / Abrir Subcriterio */}
                                    <button
                                      type="button"
                                      onClick={() => entrarSubcriterio(sub.id, sub.criterioId)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                      title="Abrir vista completa del subcriterio"
                                    >
                                      <FolderOpen size={12} />
                                      <span>Abrir</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Fila Expandida con los Documentos PDF del Subcriterio */}
                              {expandido && (
                                <tr className="bg-slate-50/70">
                                  <td colSpan={6} className="px-6 py-3 border-t border-gray-100">
                                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-navy-900">
                                          Documentos cargados en [{sub.numero}] {sub.nombre}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setSubExpandidoId(null)}
                                          className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                          Cerrar vista rápida
                                        </button>
                                      </div>

                                      {cargandoDocs ? (
                                        <div className="py-4 flex justify-center">
                                          <RefreshCw size={18} className="text-navy-500 animate-spin" />
                                        </div>
                                      ) : docsSub.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-2">
                                          No hay documentos en este subcriterio todavía.
                                        </p>
                                      ) : (
                                        <div className="divide-y divide-gray-100">
                                          {docsSub.map(doc => (
                                            <div key={doc.id} className="py-2 flex items-center justify-between gap-3">
                                              <div className="flex items-center space-x-2.5 min-w-0">
                                                <FileText size={14} className="text-red-400 flex-shrink-0" />
                                                <span className="text-xs font-medium text-gray-800 truncate">{doc.nombre}</span>
                                                <Badge tipo={doc.estado} />
                                                <span className="text-[11px] text-gray-400 hidden sm:inline">
                                                  · {doc.subido_por} ({doc.fecha})
                                                </span>
                                              </div>
                                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => setDocumentoSeleccionado(doc)}
                                                  className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-navy-700 bg-navy-50 rounded-md hover:bg-navy-100"
                                                >
                                                  <Eye size={12} />
                                                  <span>Ver</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDescargar(doc)}
                                                  className="p-1 text-gray-400 hover:text-navy-700 hover:bg-navy-50 rounded-md"
                                                  title="Descargar PDF"
                                                >
                                                  <Download size={12} />
                                                </button>
                                                {puedeFirmar(doc) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setDocumentoSeleccionado(doc)}
                                                    className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-white bg-navy-800 rounded-md hover:bg-navy-700"
                                                  >
                                                    <PenLine size={12} />
                                                    <span>Firmar</span>
                                                  </button>
                                                )}
                                                {puedeEliminarDoc(doc) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEliminarDoc(doc, sub.id)}
                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                                    title="Eliminar PDF"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* MODO 2: CARPETAS DE SUBCRITERIOS */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcriteriosCarreraFiltrados.map(i => {
                  const respTexto = i.responsables?.length > 0
                    ? i.responsables.map(r => r.nombre).join(', ')
                    : i.responsable_nombre;
                  return (
                    <CarpetaCard
                      key={i.id}
                      nombre={`[${i.numero}] ${i.nombre}`}
                      descripcion={`${i.criterioNombre}${respTexto ? ` · Resp: ${respTexto}` : ''}`}
                      badgeText={`${i.totalDocs} documento${i.totalDocs === 1 ? '' : 's'}`}
                      badgeColor={i.totalDocs > 0 ? 'green' : 'amber'}
                      onClick={() => entrarSubcriterio(i.id, i.criterioId)}
                      onEdit={esAdmin ? () => abrirEditar('subcriterio', i.id, i.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: i.criterioId }) : null}
                      onDelete={esAdmin ? () => handleEliminar('subcriterio', i.id, i.nombre, { univId: selUniId, facId: selFacId, carrId: selCarrId, perId: selPerId, critId: i.criterioId }) : null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Nivel Detalle de un Subcriterio: Subida drag & drop + Tabla de documentos */}
        {nivel === 'documentos' && subActual && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNivel('criterios')}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs"
              >
                <span>← Volver a los 31 Subcriterios de {carrActual?.nombre}</span>
              </button>
            </div>

            {(subActual.informacion_ayuda || subActual.descripcion) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex space-x-3">
                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{subActual.informacion_ayuda || subActual.descripcion}</p>
              </div>
            )}

            {/* Subida directa en el Subcriterio */}
            <div>
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
                    <p className="text-sm text-navy-700 font-medium">Subiendo documento al subcriterio...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className={`mx-auto mb-3 ${arrastrandoDrop ? 'text-navy-600' : 'text-gray-300'}`} />
                    <p className="text-sm font-medium text-gray-700">
                      Arrastra tu PDF aquí para el subcriterio [{subActual.numero}] {subActual.nombre}
                    </p>
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
                      onChange={e => { manejarArchivo(e.target.files[0], selIndId); e.target.value = ''; }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Tabla de documentos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                  <FileText size={16} className="text-navy-700" />
                  <span>Documentos en [{subActual.numero}] {subActual.nombre} ({docsActual.length})</span>
                </h3>
                <button
                  onClick={() => recargarDocs(selIndId)}
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
                  <p className="text-sm text-gray-400">Sin documentos en este subcriterio. Suba el primero.</p>
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
                                  onClick={() => handleEliminarDoc(doc, selIndId)}
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
