import React, { useState, useEffect } from 'react';
import { Plus, Check, Building2, BookOpen, GraduationCap, CalendarDays, Microscope, Target, Pencil, Trash2, X, Save, UserCheck, UserPlus, Search, Info, FileText, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/useApp';
import { RESPONSABLES_PREDEFINIDOS, CRITERIOS_PREDEFINIDOS, INDICADORES_PREDEFINIDOS } from '../data/parametrosPredefinidos';
import ModalDocenteForm from '../components/modals/ModalDocenteForm';
import PasoFirmaItem from '../components/flujos/PasoFirmaItem';

export { RESPONSABLES_PREDEFINIDOS, CRITERIOS_PREDEFINIDOS, INDICADORES_PREDEFINIDOS };

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-navy-700' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent";
const selectCls = inputCls;
const inputSmCls = "border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-500 w-full";

export default function ParametrizacionAdmin() {
  const {
    universidades,
    agregarUniversidad, actualizarUniversidad, eliminarUniversidad,
    agregarFacultad, actualizarFacultad, eliminarFacultad,
    agregarCarrera, actualizarCarrera, eliminarCarrera,
    agregarPeriodo, actualizarPeriodo, eliminarPeriodo,
    agregarCriterio, actualizarCriterio, eliminarCriterio,
    agregarIndicador, actualizarIndicador, eliminarIndicador, asignarResponsablesIndicador,
    listarUsuarios,
    listarDocentes, eliminarDocente,
    flujosFirma, crearFlujo, actualizarFlujo, eliminarFlujo,
    listarRoles,
    listarFacultadesCatalogo, listarActividadesCatalogo,
    navParams,
    navegarA,
  } = useApp();

  const [rolesBD, setRolesBD] = useState([]);
  const [catalogoFacultades, setCatalogoFacultades] = useState([]);
  const [catalogoActividades, setCatalogoActividades] = useState([]);

  useEffect(() => {
    if (listarRoles) {
      listarRoles().then(r => setRolesBD(r || [])).catch(() => {});
    }
    if (listarFacultadesCatalogo) {
      listarFacultadesCatalogo().then(f => setCatalogoFacultades(f || [])).catch(() => {});
    }
    if (listarActividadesCatalogo) {
      listarActividadesCatalogo().then(a => setCatalogoActividades(a || [])).catch(() => {});
    }
  }, []);

  const facultadesDisponibles = catalogoFacultades.length > 0
    ? catalogoFacultades
    : (universidades || []).flatMap(u => u.facultades || []);

  const actividadesDisponibles = catalogoActividades.length > 0
    ? catalogoActividades
    : (universidades || []).flatMap(u => (u.facultades || []).flatMap(f => (f.periodos || []).flatMap(p => (p.carreras || []).flatMap(ca => (ca.criterios || []).flatMap(cr => cr.subcriterios || cr.indicadores || [])))));

  const [usuariosDB, setUsuariosDB] = useState([]);

  useEffect(() => {
    if (listarUsuarios) {
      listarUsuarios().then(usrs => setUsuariosDB(usrs || [])).catch(() => {});
    }
  }, []);

  const [docentes, setDocentes] = useState([]);
  const [cargandoDocentes, setCargandoDocentes] = useState(false);
  const [busquedaDocente, setBusquedaDocente] = useState('');
  const [modalDocente, setModalDocente] = useState({ abierto: false, docente: null });

  const cargarListaDocentes = async () => {
    if (!listarDocentes) return;
    setCargandoDocentes(true);
    try {
      const data = await listarDocentes();
      setDocentes(Array.isArray(data) ? data : []);
    } catch (e) {
      mostrarError(e.message);
    } finally {
      setCargandoDocentes(false);
    }
  };

  const [tab, setTab] = useState(navParams?.tab || 'subcriterio');

  useEffect(() => {
    if (navParams?.tab) {
      setTab(navParams.tab);
    }
  }, [navParams]);

  const [exito, setExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editando, setEditando] = useState(null); // { tipo, id, valor, meta }
  const [eliminandoId, setEliminandoId] = useState(null);

  const [busquedaCriterio, setBusquedaCriterio] = useState('');
  const [busquedaSubcriterio, setBusquedaSubcriterio] = useState('');
  const [mostrarFormCriterio, setMostrarFormCriterio] = useState(false);
  const [mostrarFormSubcriterio, setMostrarFormSubcriterio] = useState(false);

  const [fUniv, setFUniv] = useState({ nombre: '', siglas: '' });
  const [fFac,  setFfac]  = useState({ nombre: '', univId: '' });
  const [fCarr, setFCarr] = useState({ nombre: '', descripcion: '', univId: '', facId: '' });
  const [fPer,  setFPer]  = useState({ nombre: '', univId: '', facId: '' });
  const [fCrit, setFCrit] = useState({ nombre: '', univId: '', facId: '', perId: '', carrId: '', requiere_firma: true });
  const [fInd,  setFInd]  = useState({
    nombre: '',
    numero: '',
    descripcion: '',
    requiere_firma: true,
    flujo_id: '',
    responsablesIds: [],
    univId: '',
    facId: '',
    perId: '',
    carrId: '',
    critId: '',
  });
  const [fFlujo, setFFlujo] = useState({ nombre: '', es_global: false, pasos: [] });

  // Auto-preseleccionar Universidad/Facultad/Período/Carrera inicial para evitar elegir 4 dropdowns cada vez
  useEffect(() => {
    if (!universidades || universidades.length === 0) return;
    const u = universidades[0];
    const f = u?.facultades?.[0];
    const p = f?.periodos?.[f.periodos.length - 1] || f?.periodos?.[0];
    const c = (p?.carreras || f?.carreras || [])?.[0];

    const uId = u ? String(u.id) : '';
    const fId = f ? String(f.id) : '';
    const pId = p ? String(p.id) : '';
    const cId = c ? String(c.id) : '';

    setFfac(prev => prev.univId ? prev : { ...prev, univId: uId });
    setFCarr(prev => prev.univId ? prev : { ...prev, univId: uId, facId: fId });
    setFPer(prev => prev.univId ? prev : { ...prev, univId: uId, facId: fId });
    setFCrit(prev => prev.univId ? prev : { ...prev, univId: uId, facId: fId, perId: pId, carrId: cId });
    setFInd(prev => prev.univId ? prev : { ...prev, univId: uId, facId: fId, perId: pId, carrId: cId });
  }, [universidades]);

  function sincronizarContexto({ univId, facId, perId, carrId, critId = '' }) {
    setFCrit(prev => ({
      ...prev,
      univId: univId ?? prev.univId,
      facId: facId ?? prev.facId,
      perId: perId ?? prev.perId,
      carrId: carrId ?? prev.carrId,
    }));
    setFInd(prev => ({
      ...prev,
      univId: univId ?? prev.univId,
      facId: facId ?? prev.facId,
      perId: perId ?? prev.perId,
      carrId: carrId ?? prev.carrId,
      critId: critId,
    }));
  }

  function mostrarExito(msg) {
    setErrorMsg('');
    setExito(msg);
    setTimeout(() => setExito(''), 3000);
  }

  function mostrarError(msg) {
    setExito('');
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  }

  async function submitUniv(e) {
    e.preventDefault();
    if (!fUniv.nombre) return;
    try {
      await agregarUniversidad(fUniv);
      setFUniv({ nombre: '', siglas: '' });
      mostrarExito('Universidad creada exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitFac(e) {
    e.preventDefault();
    if (!fFac.nombre || !fFac.univId) return;
    try {
      await agregarFacultad(Number(fFac.univId), { nombre: fFac.nombre });
      setFfac({ nombre: '', univId: '' });
      mostrarExito('Facultad creada exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitCarr(e) {
    e.preventDefault();
    if (!fCarr.nombre || !fCarr.univId || !fCarr.facId) return;
    try {
      await agregarCarrera(Number(fCarr.univId), Number(fCarr.facId), {
        nombre: fCarr.nombre,
        descripcion: fCarr.descripcion || undefined,
      });
      setFCarr({ nombre: '', descripcion: '', univId: '', facId: '' });
      mostrarExito('Carrera creada exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitPer(e) {
    e.preventDefault();
    if (!fPer.nombre || !fPer.univId || !fPer.facId) return;
    try {
      await agregarPeriodo(Number(fPer.univId), Number(fPer.facId), { nombre: fPer.nombre });
      setFPer({ nombre: '', univId: '', facId: '' });
      mostrarExito('Período creado exitosamente con sus carreras, criterios y subcriterios');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitCrit(e) {
    e.preventDefault();
    if (!fCrit.nombre || !fCrit.univId || !fCrit.facId || !fCrit.perId || !fCrit.carrId) return;
    try {
      await agregarCriterio(Number(fCrit.univId), Number(fCrit.facId), Number(fCrit.carrId), Number(fCrit.perId), {
        nombre: fCrit.nombre,
        requiere_firma: fCrit.requiere_firma,
        flujo_id: null,
      });
      setFCrit(prev => ({ ...prev, nombre: '', requiere_firma: true }));
      mostrarExito('Criterio creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitInd(e) {
    e.preventDefault();
    if (!fInd.nombre || !fInd.numero || !fInd.univId || !fInd.facId || !fInd.perId || !fInd.carrId || !fInd.critId) return;
    try {
      const nuevoInd = await agregarIndicador(
        Number(fInd.univId),
        Number(fInd.facId),
        Number(fInd.carrId),
        Number(fInd.perId),
        Number(fInd.critId),
        {
          nombre: fInd.nombre,
          numero: Number(fInd.numero),
          descripcion: fInd.descripcion || undefined,
          requiere_firma: fInd.requiere_firma,
          flujo_id: fInd.flujo_id || null,
          responsable_nombre: fInd.responsable_nombre || undefined,
        }
      );
      if (fInd.responsablesIds && fInd.responsablesIds.length > 0) {
        await asignarResponsablesIndicador(nuevoInd.id, fInd.responsablesIds);
      }
      setFInd(prev => ({
        ...prev,
        nombre: '',
        numero: '',
        descripcion: '',
        requiere_firma: true,
        flujo_id: '',
        responsablesIds: [],
      }));
      mostrarExito('Subcriterio creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitFlujo(e) {
    e.preventDefault();
    if (!fFlujo.nombre.trim()) return mostrarError('Nombre del flujo requerido');
    if (!fFlujo.pasos || fFlujo.pasos.length === 0) return mostrarError('Debe definir al menos un paso de firma');

    try {
      const pasosPayload = fFlujo.pasos.map((p, i) => ({
        orden: i + 1,
        usuario_id: typeof p === 'object' && p !== null ? (p.usuario_id || null) : null,
        rol_id: typeof p === 'object' && p !== null ? (p.rol_id || null) : Number(p),
      }));

      await crearFlujo({
        nombre: fFlujo.nombre,
        es_global: fFlujo.es_global,
        pasos: pasosPayload,
      });
      setFFlujo({ nombre: '', es_global: false, pasos: [] });
      mostrarExito('Flujo creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  function iniciarEdicion(tipo, id, valor, meta = {}) {
    setEditando({ tipo, id, valor: { ...valor }, meta });
  }

  function cancelarEdicion() {
    setEditando(null);
  }

  async function guardarEdicion() {
    if (!editando) return;
    try {
      const { tipo, id, valor, meta } = editando;
      if (tipo === 'universidad') {
        await actualizarUniversidad(id, valor);
      } else if (tipo === 'facultad') {
        await actualizarFacultad(id, meta.univId, valor);
      } else if (tipo === 'carrera') {
        await actualizarCarrera(id, meta.univId, meta.facId, valor);
      } else if (tipo === 'periodo') {
        await actualizarPeriodo(id, meta.univId, meta.facId, meta.carrId, valor);
      } else if (tipo === 'criterio') {
        const payload = { ...valor, flujo_id: valor.flujo_id || null };
        await actualizarCriterio(id, meta.univId, meta.facId, meta.carrId, meta.perId, payload);
      } else if (tipo === 'indicador' || tipo === 'subcriterio') {
        const payload = {
          ...valor,
          numero: Number(valor.numero),
          flujo_id: valor.flujo_id || null,
        };
        await actualizarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, payload);
        if (valor.responsablesIds !== undefined) {
          await asignarResponsablesIndicador(id, valor.responsablesIds);
        }
      } else if (tipo === 'flujo') {
        const pasosPayload = (valor.pasos || []).map((p, i) => ({
          orden: i + 1,
          usuario_id: typeof p === 'object' && p !== null ? (p.usuario_id || null) : null,
          rol_id: typeof p === 'object' && p !== null ? (p.rol_id || null) : Number(p),
        }));
        await actualizarFlujo(id, {
          nombre: valor.nombre,
          es_global: valor.es_global,
          pasos: pasosPayload,
        });
      }
      mostrarExito('Actualizado exitosamente');
      setEditando(null);
    } catch (err) { mostrarError(err.message); }
  }

  async function handleEliminar(tipo, id, meta = {}) {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    setEliminandoId(id);
    try {
      if (tipo === 'universidad') await eliminarUniversidad(id);
      else if (tipo === 'facultad') await eliminarFacultad(id, meta.univId);
      else if (tipo === 'carrera') await eliminarCarrera(id, meta.univId, meta.facId);
      else if (tipo === 'periodo') await eliminarPeriodo(id, meta.univId, meta.facId, meta.carrId);
      else if (tipo === 'criterio') await eliminarCriterio(id, meta.univId, meta.facId, meta.carrId, meta.perId);
      else if (tipo === 'indicador' || tipo === 'subcriterio') await eliminarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId);
      else if (tipo === 'flujo') await eliminarFlujo(id);
      mostrarExito('Eliminado correctamente');
    } catch (err) { mostrarError(err.message); }
    finally { setEliminandoId(null); }
  }

  useEffect(() => {
    if (tab === 'docentes') {
      cargarListaDocentes();
    }
  }, [tab]);

  const TABS = [
    { id: 'universidad', label: 'Universidad', icon: Building2 },
    { id: 'facultad',    label: 'Facultad',    icon: BookOpen },
    { id: 'periodo',     label: 'Período',     icon: CalendarDays },
    { id: 'carrera',     label: 'Carrera',     icon: GraduationCap },
    { id: 'criterio',    label: 'Criterio',    icon: Microscope },
    { id: 'subcriterio', label: 'Subcriterio', icon: Target },
    { id: 'docentes',    label: 'Docentes',    icon: UserCheck },
    { id: 'flujos',      label: 'Flujos Firma', icon: Pencil },
  ];

  // Helper getters for dropdowns
  const univSelPer  = universidades.find(u => u.id === Number(fPer.univId));
  const univSelCarr = universidades.find(u => u.id === Number(fCarr.univId));

  const univSelCrit = universidades.find(u => u.id === Number(fCrit.univId));
  const facSelCrit  = univSelCrit?.facultades.find(f => f.id === Number(fCrit.facId));
  const perSelCrit  = facSelCrit?.periodos?.find(p => p.id === Number(fCrit.perId));

  const univSelInd  = universidades.find(u => u.id === Number(fInd.univId));
  const facSelInd   = univSelInd?.facultades.find(f => f.id === Number(fInd.facId));
  const perSelInd   = facSelInd?.periodos?.find(p => p.id === Number(fInd.perId));
  const carrSelInd  = perSelInd?.carreras?.find(c => c.id === Number(fInd.carrId)) || facSelInd?.carreras?.find(c => c.id === Number(fInd.carrId));
  const critSelInd  = carrSelInd?.criterios?.find(c => String(c.id) === String(fInd.critId));

  const indicadoresFiltrados = critSelInd
    ? INDICADORES_PREDEFINIDOS.filter(
        ind => ind.criterio?.toLowerCase().trim() === critSelInd.nombre?.toLowerCase().trim()
      )
    : [];

  // ── Filas aplanadas y filtradas para Tabla de Criterios ─────────────────
  const filasCriterios = universidades.flatMap(u =>
    (u.facultades || []).flatMap(f =>
      (f.periodos || []).flatMap(p =>
        (p.carreras || []).flatMap(ca =>
          (ca.criterios || []).map(c => ({
            u,
            f,
            p,
            ca,
            c,
            totalSubcriterios: (c.subcriterios || c.indicadores || []).length,
          }))
        )
      )
    )
  ).filter(row => {
    if (fCrit.univId && row.u.id !== Number(fCrit.univId)) return false;
    if (fCrit.facId && row.f.id !== Number(fCrit.facId)) return false;
    if (fCrit.perId && row.p.id !== Number(fCrit.perId)) return false;
    if (fCrit.carrId && row.ca.id !== Number(fCrit.carrId)) return false;
    if (busquedaCriterio.trim()) {
      const q = busquedaCriterio.toLowerCase();
      return (
        row.c.nombre?.toLowerCase().includes(q) ||
        row.ca.nombre?.toLowerCase().includes(q) ||
        row.p.nombre?.toLowerCase().includes(q) ||
        row.f.nombre?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Filas aplanadas y filtradas para Tabla de Subcriterios ──────────────
  const filasSubcriterios = universidades.flatMap(u =>
    (u.facultades || []).flatMap(f =>
      (f.periodos || []).flatMap(p =>
        (p.carreras || []).flatMap(ca =>
          (ca.criterios || []).flatMap(c =>
            (c.subcriterios || c.indicadores || []).map(i => ({
              u,
              f,
              p,
              ca,
              c,
              i,
            }))
          )
        )
      )
    )
  ).filter(row => {
    if (fInd.univId && row.u.id !== Number(fInd.univId)) return false;
    if (fInd.facId && row.f.id !== Number(fInd.facId)) return false;
    if (fInd.perId && row.p.id !== Number(fInd.perId)) return false;
    if (fInd.carrId && row.ca.id !== Number(fInd.carrId)) return false;
    if (fInd.critId && String(row.c.id) !== String(fInd.critId)) return false;
    if (busquedaSubcriterio.trim()) {
      const q = busquedaSubcriterio.toLowerCase();
      return (
        row.i.nombre?.toLowerCase().includes(q) ||
        String(row.i.numero || '').includes(q) ||
        row.c.nombre?.toLowerCase().includes(q) ||
        row.ca.nombre?.toLowerCase().includes(q) ||
        row.i.responsable_nombre?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function ItemRow({ tipo, id, meta, children, editFields }) {
    const esEditando = editando?.tipo === tipo && editando?.id === id;
    const esEliminando = eliminandoId === id;
    return (
      <div className={`bg-gray-50 rounded-lg px-4 py-3 text-sm ${esEliminando ? 'opacity-50' : ''}`}>
        {esEditando ? (
          <div className="space-y-2">
            {editFields}
            <div className="flex items-center space-x-2 pt-1">
              <button onClick={guardarEdicion} className="flex items-center space-x-1 px-3 py-1.5 bg-navy-900 text-white text-xs rounded-lg hover:bg-navy-800 transition-colors">
                <Save size={12} /><span>Guardar</span>
              </button>
              <button onClick={cancelarEdicion} className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors">
                <X size={12} /><span>Cancelar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">{children}</div>
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              <button
                onClick={() => iniciarEdicion(tipo, id, meta.valorEdicion || {}, meta)}
                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleEliminar(tipo, id, meta)}
                disabled={esEliminando}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <Check size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-800">{exito}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <span className="text-sm font-medium text-red-800">{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto hide-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === id
                  ? 'text-navy-900 border-b-2 border-navy-700 bg-navy-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Universidad */}
          {tab === 'universidad' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nueva Universidad</h3>
                <form onSubmit={submitUniv} className="space-y-4">
                  <FormField label="Nombre"><input value={fUniv.nombre} onChange={e => setFUniv({...fUniv, nombre: e.target.value})} placeholder="Universidad de..." className={inputCls} /></FormField>
                  <FormField label="Siglas"><input value={fUniv.siglas} onChange={e => setFUniv({...fUniv, siglas: e.target.value})} placeholder="ESPE, UIO..." className={inputCls} /></FormField>
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Universidad</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Universidades existentes</h3>
                <div className="space-y-2">
                  {universidades.map(u => (
                    <ItemRow
                      key={u.id} tipo="universidad" id={u.id}
                      meta={{ valorEdicion: { nombre: u.nombre, siglas: u.siglas } }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(p => ({ ...p, valor: { ...p.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                          <input value={editando?.valor?.siglas || ''} onChange={e => setEditando(p => ({ ...p, valor: { ...p.valor, siglas: e.target.value } }))} placeholder="Siglas" className={`${inputSmCls} mt-1`} />
                        </>
                      }
                    >
                      <span className="font-medium text-gray-800">{u.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">{u.siglas}</span>
                    </ItemRow>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Facultad */}
          {tab === 'facultad' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nueva Facultad</h3>
                <form onSubmit={submitFac} className="space-y-4">
                  <FormField label="Universidad">
                    <select value={fFac.univId} onChange={e => setFfac({...fFac, univId: e.target.value})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fFac.nombre} onChange={e => setFfac({...fFac, nombre: e.target.value})} placeholder="Facultad de..." className={inputCls} /></FormField>
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Facultad</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Facultades existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.map(f => (
                    <ItemRow
                      key={f.id} tipo="facultad" id={f.id}
                      meta={{ univId: u.id, valorEdicion: { nombre: f.nombre } }}
                      editFields={
                        <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(p => ({ ...p, valor: { ...p.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                      }
                    >
                      <span className="font-medium text-gray-800">{f.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">· {u.siglas || u.nombre}</span>
                    </ItemRow>
                  )))}
                </div>
              </div>
            </div>
          )}

          {/* Carrera */}
          {tab === 'carrera' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nueva Carrera</h3>
                <form onSubmit={submitCarr} className="space-y-4">
                  <FormField label="Universidad">
                    <select value={fCarr.univId} onChange={e => setFCarr({...fCarr, univId: e.target.value, facId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fCarr.facId} onChange={e => setFCarr({...fCarr, facId: e.target.value})} className={selectCls} disabled={!fCarr.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelCarr?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre de la Carrera">
                    <input
                      value={fCarr.nombre}
                      onChange={e => setFCarr({...fCarr, nombre: e.target.value})}
                      placeholder="Ingeniería en Software, TI..."
                      className={inputCls}
                      required
                    />
                  </FormField>
                  <FormField label="Descripción (opcional)">
                    <textarea
                      value={fCarr.descripcion}
                      onChange={e => setFCarr({...fCarr, descripcion: e.target.value})}
                      placeholder="Breve descripción de la carrera..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </FormField>
                  <button
                    type="submit"
                    disabled={!fCarr.nombre || !fCarr.univId || !fCarr.facId}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /><span>Crear Carrera</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">
                  Carreras existentes
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({universidades.flatMap(u => u.facultades.flatMap(f => f.carreras || [])).length} total)
                  </span>
                </h3>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {universidades.flatMap(u => u.facultades.flatMap(f => (f.carreras || []).map(ca => (
                    <ItemRow
                      key={ca.id} tipo="carrera" id={ca.id}
                      meta={{ univId: u.id, facId: f.id, valorEdicion: { nombre: ca.nombre, descripcion: ca.descripcion || '' } }}
                      editFields={
                        <>
                          <input
                            value={editando?.valor?.nombre || ''}
                            onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))}
                            placeholder="Nombre"
                            className={inputSmCls}
                          />
                          <textarea
                            value={editando?.valor?.descripcion || ''}
                            onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, descripcion: e.target.value } }))}
                            placeholder="Descripción"
                            rows={2}
                            className={`${inputSmCls} mt-1 resize-none`}
                          />
                        </>
                      }
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{ca.nombre}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            {f.nombre}
                          </span>
                        </div>
                        {ca.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{ca.descripcion}</p>
                        )}
                      </div>
                    </ItemRow>
                  ))))}
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.carreras || [])).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-6">No hay carreras registradas aún.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Período */}
          {tab === 'periodo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nuevo Período</h3>
                <form onSubmit={submitPer} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start space-x-2">
                    <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Al crear el período se generarán automáticamente los 5 Criterios y 31 Subcriterios por separado para cada carrera de la facultad escogida.
                    </span>
                  </div>
                  <FormField label="Universidad">
                    <select value={fPer.univId} onChange={e => setFPer({...fPer, univId: e.target.value, facId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fPer.facId} onChange={e => setFPer({...fPer, facId: e.target.value})} className={selectCls} disabled={!fPer.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelPer?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre del Período">
                    <input value={fPer.nombre} onChange={e => setFPer({...fPer, nombre: e.target.value})} placeholder="2026-I, 2026-II..." className={inputCls} required />
                  </FormField>
                  <button
                    type="submit"
                    disabled={!fPer.nombre || !fPer.univId || !fPer.facId}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /><span>Crear Período</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Períodos existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => (u.facultades || []).flatMap(f => {
                    const periodosDirectos = f.periodos || [];
                    const periodosCarreras = (f.carreras || []).flatMap(ca => ca.periodos || []);
                    const todosPeriodos = periodosDirectos.length > 0 ? periodosDirectos : periodosCarreras;
                    return todosPeriodos.map(p => (
                      <ItemRow
                        key={p.id} tipo="periodo" id={p.id}
                        meta={{ univId: u.id, facId: f.id, valorEdicion: { nombre: p.nombre } }}
                        editFields={
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                        }
                      >
                        <span className="font-medium text-gray-800">{p.nombre}</span>
                        <span className="text-gray-400 text-xs ml-2">· {f.nombre} ({u.siglas || u.nombre})</span>
                      </ItemRow>
                    ));
                  }))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ CRITERIO (Filtros Rápidos + Tabla Protagonista + Formulario Colapsable) ══════════ */}
          {tab === 'criterio' && (
            <div className="space-y-4">
              {/* Barra Compacta de Filtros de Contexto + Botón Nuevo Criterio */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">Criterios de Acreditación</h3>
                    <p className="text-xs text-gray-500">Filtra por carrera o edita directamente en la tabla. Haz clic en los subcriterios de una fila para ver su detalle.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(fCrit.univId || fCrit.facId || fCrit.perId || fCrit.carrId) && (
                      <button
                        type="button"
                        onClick={() => sincronizarContexto({ univId: '', facId: '', perId: '', carrId: '', critId: '' })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                      >
                        Ver todas las carreras
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostrarFormCriterio(v => !v)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-medium hover:bg-navy-800 transition-colors"
                    >
                      <Plus size={14} />
                      <span>{mostrarFormCriterio ? 'Ocultar formulario' : 'Agregar Criterio'}</span>
                      {mostrarFormCriterio ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Selectores de Contexto Sincronizados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormField label="Universidad">
                    <select
                      value={fCrit.univId}
                      onChange={e => sincronizarContexto({ univId: e.target.value, facId: '', perId: '', carrId: '' })}
                      className={selectCls}
                    >
                      <option value="">Todas las universidades...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select
                      value={fCrit.facId}
                      onChange={e => sincronizarContexto({ univId: fCrit.univId, facId: e.target.value, perId: '', carrId: '' })}
                      className={selectCls}
                      disabled={!fCrit.univId}
                    >
                      <option value="">Todas las facultades...</option>
                      {univSelCrit?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select
                      value={fCrit.perId}
                      onChange={e => sincronizarContexto({ univId: fCrit.univId, facId: fCrit.facId, perId: e.target.value, carrId: '' })}
                      className={selectCls}
                      disabled={!fCrit.facId}
                    >
                      <option value="">Todos los períodos...</option>
                      {(facSelCrit?.periodos || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select
                      value={fCrit.carrId}
                      onChange={e => sincronizarContexto({ univId: fCrit.univId, facId: fCrit.facId, perId: fCrit.perId, carrId: e.target.value })}
                      className={selectCls}
                      disabled={!fCrit.perId}
                    >
                      <option value="">Todas las carreras...</option>
                      {(perSelCrit?.carreras || facSelCrit?.carreras || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                </div>

                {/* Formulario Colapsable para Crear Criterio Manual */}
                {mostrarFormCriterio && (
                  <form onSubmit={submitCrit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end pt-3 border-t border-gray-200">
                    <div className="lg:col-span-4">
                      <FormField label="Criterio Predefinido (Opcional)">
                        <select
                          value={CRITERIOS_PREDEFINIDOS.includes(fCrit.nombre) ? fCrit.nombre : ''}
                          onChange={e => {
                            if (e.target.value) setFCrit({ ...fCrit, nombre: e.target.value });
                          }}
                          className={selectCls}
                        >
                          <option value="">-- Seleccionar predefinido --</option>
                          {CRITERIOS_PREDEFINIDOS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </FormField>
                    </div>
                    <div className="lg:col-span-4">
                      <FormField label="Nombre del Criterio">
                        <input value={fCrit.nombre} onChange={e => setFCrit({...fCrit, nombre: e.target.value})} placeholder="Ej. 1. CURRÍCULO..." className={inputCls} />
                      </FormField>
                    </div>
                    <div className="lg:col-span-2 pb-1">
                      <Toggle value={fCrit.requiere_firma} onChange={v => setFCrit({...fCrit, requiere_firma: v})} label="Requiere firma" />
                    </div>
                    <div className="lg:col-span-2">
                      <button
                        type="submit"
                        disabled={!fCrit.nombre || !fCrit.univId || !fCrit.facId || !fCrit.perId || !fCrit.carrId}
                        className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} /><span>Crear Criterio</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Tabla Estructurada de Criterios */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Microscope size={16} className="text-navy-700" />
                    <h4 className="text-sm font-semibold text-navy-900">
                      Tabla de Criterios ({filasCriterios.length})
                    </h4>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaCriterio}
                      onChange={e => setBusquedaCriterio(e.target.value)}
                      placeholder="Buscar criterio, carrera o período..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>

                {filasCriterios.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No se encontraron criterios con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Criterio</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Carrera</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Período / Facultad</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subcriterios (1 Clic)</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Firma Digital</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filasCriterios.map(({ u, f, p, ca, c, totalSubcriterios }) => {
                          const esEditando = editando?.tipo === 'criterio' && editando?.id === c.id;
                          const esEliminando = eliminandoId === c.id;
                          const meta = {
                            univId: u.id,
                            facId: f.id,
                            perId: p.id,
                            carrId: ca.id,
                            valorEdicion: { nombre: c.nombre, requiere_firma: c.requiere_firma },
                          };

                          return (
                            <tr key={`${ca.id}-${c.id}`} className={`hover:bg-gray-50/70 transition-colors ${esEliminando ? 'opacity-50' : ''}`}>
                              <td className="px-5 py-3">
                                {esEditando ? (
                                  <input
                                    value={editando?.valor?.nombre || ''}
                                    onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))}
                                    className={inputSmCls}
                                    placeholder="Nombre del criterio"
                                  />
                                ) : (
                                  <div>
                                    <span className="font-semibold text-navy-900 text-xs">{c.nombre}</span>
                                    {c.descripcion && <p className="text-[11px] text-gray-400 mt-0.5">{c.descripcion}</p>}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {ca.nombre}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                <span className="font-medium text-gray-800">{p.nombre}</span>
                                <span className="text-gray-400 ml-1">· {f.nombre}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sincronizarContexto({
                                      univId: String(u.id),
                                      facId: String(f.id),
                                      perId: String(p.id),
                                      carrId: String(ca.id),
                                      critId: String(c.id),
                                    });
                                    setTab('subcriterio');
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-50 text-navy-800 hover:bg-navy-100 border border-navy-200 transition-colors"
                                  title="Ver subcriterios de este criterio"
                                >
                                  <Target size={12} />
                                  <span>{totalSubcriterios} subcriterios →</span>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {esEditando ? (
                                  <div className="flex justify-center">
                                    <Toggle
                                      value={editando?.valor?.requiere_firma ?? true}
                                      onChange={v => setEditando(prev => ({ ...prev, valor: { ...prev.valor, requiere_firma: v } }))}
                                      label=""
                                    />
                                  </div>
                                ) : (
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${c.requiere_firma ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {c.requiere_firma ? 'Con firma' : 'Sin firma'}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {esEditando ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button onClick={guardarEdicion} className="px-2.5 py-1 bg-navy-900 text-white text-xs rounded-lg hover:bg-navy-800 flex items-center space-x-1">
                                      <Save size={12} /><span>Guardar</span>
                                    </button>
                                    <button onClick={cancelarEdicion} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end space-x-1">
                                    <button
                                      onClick={() => iniciarEdicion('criterio', c.id, meta.valorEdicion, meta)}
                                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Editar Criterio"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleEliminar('criterio', c.id, meta)}
                                      disabled={esEliminando}
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                      title="Eliminar Criterio"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ SUBCRITERIO (Filtros Rápidos + Tabla Protagonista + Salto Directo a PDFs) ══════════ */}
          {(tab === 'subcriterio' || tab === 'indicador') && (
            <div className="space-y-4">
              {/* Panel Superior Compacto: Filtros de Contexto + Botón Agregar Subcriterio */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">Subcriterios y Evidencias PDF</h3>
                    <p className="text-xs text-gray-500">
                      Edita responsables o flujos en línea, o haz clic en <strong>PDFs</strong> para subir y gestionar documentos directamente.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(fInd.univId || fInd.facId || fInd.perId || fInd.carrId || fInd.critId) && (
                      <button
                        type="button"
                        onClick={() => sincronizarContexto({ univId: '', facId: '', perId: '', carrId: '', critId: '' })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                      >
                        Ver todos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostrarFormSubcriterio(v => !v)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-medium hover:bg-navy-800 transition-colors"
                    >
                      <Plus size={14} />
                      <span>{mostrarFormSubcriterio ? 'Ocultar formulario' : 'Agregar Subcriterio'}</span>
                      {mostrarFormSubcriterio ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Selectores de Contexto Sincronizados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <FormField label="Universidad">
                    <select
                      value={fInd.univId}
                      onChange={e => sincronizarContexto({ univId: e.target.value, facId: '', perId: '', carrId: '', critId: '' })}
                      className={selectCls}
                    >
                      <option value="">Todas...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select
                      value={fInd.facId}
                      onChange={e => sincronizarContexto({ univId: fInd.univId, facId: e.target.value, perId: '', carrId: '', critId: '' })}
                      className={selectCls}
                      disabled={!fInd.univId}
                    >
                      <option value="">Todas...</option>
                      {univSelInd?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select
                      value={fInd.perId}
                      onChange={e => sincronizarContexto({ univId: fInd.univId, facId: fInd.facId, perId: e.target.value, carrId: '', critId: '' })}
                      className={selectCls}
                      disabled={!fInd.facId}
                    >
                      <option value="">Todos...</option>
                      {(facSelInd?.periodos || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select
                      value={fInd.carrId}
                      onChange={e => sincronizarContexto({ univId: fInd.univId, facId: fInd.facId, perId: fInd.perId, carrId: e.target.value, critId: '' })}
                      className={selectCls}
                      disabled={!fInd.perId}
                    >
                      <option value="">Todas...</option>
                      {(perSelInd?.carreras || facSelInd?.carreras || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Criterio">
                    <select
                      value={fInd.critId}
                      onChange={e => setFInd({
                        ...fInd,
                        critId: e.target.value,
                        numero: '',
                        nombre: '',
                        responsable_nombre: '',
                      })}
                      className={selectCls}
                      disabled={!fInd.carrId}
                    >
                      <option value="">Todos los criterios...</option>
                      {(carrSelInd?.criterios || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                </div>

                {/* Formulario Colapsable de Nuevo Subcriterio */}
                {mostrarFormSubcriterio && (
                  <form onSubmit={submitInd} className="space-y-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                      <div className="lg:col-span-4">
                        <FormField label="Subcriterio Predefinido">
                          <select
                            value={indicadoresFiltrados.some(i => i.nombre === fInd.nombre) ? fInd.nombre : ''}
                            disabled={!fInd.critId}
                            onChange={e => {
                              const sel = indicadoresFiltrados.find(i => i.nombre === e.target.value);
                              if (sel) {
                                setFInd(prev => ({
                                  ...prev,
                                  numero: sel.numero,
                                  nombre: sel.nombre,
                                  responsable_nombre: sel.responsable_nombre,
                                }));
                              } else {
                                setFInd(prev => ({
                                  ...prev,
                                  numero: '',
                                  nombre: '',
                                  responsable_nombre: '',
                                }));
                              }
                            }}
                            className={selectCls}
                          >
                            <option value="">
                              {fInd.critId
                                ? `-- Elegir de los ${indicadoresFiltrados.length} disponibles --`
                                : '-- Primero elija un Criterio --'}
                            </option>
                            {indicadoresFiltrados.map(ind => (
                              <option key={`${ind.numero}-${ind.nombre}`} value={ind.nombre}>
                                [{ind.numero}] {ind.nombre}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <div className="lg:col-span-1">
                        <FormField label="N°">
                          <input
                            type="number"
                            value={fInd.numero}
                            onChange={e => setFInd({...fInd, numero: e.target.value})}
                            placeholder="1-31"
                            className={inputCls}
                          />
                        </FormField>
                      </div>

                      <div className="lg:col-span-4">
                        <FormField label="Nombre del Subcriterio">
                          <input
                            value={fInd.nombre}
                            onChange={e => setFInd({...fInd, nombre: e.target.value})}
                            placeholder="Ej. Perfil de egreso, Syllabus..."
                            className={inputCls}
                          />
                        </FormField>
                      </div>

                      <div className="lg:col-span-3">
                        <FormField label="Flujo de Firma (Opcional)">
                          <select value={fInd.flujo_id || ''} onChange={e => setFInd({...fInd, flujo_id: e.target.value})} className={selectCls}>
                            <option value="">-- Flujo Global por Defecto --</option>
                            {flujosFirma.map(fl => <option key={fl.id} value={fl.id}>{fl.nombre} {fl.es_global ? '(Global)' : ''}</option>)}
                          </select>
                        </FormField>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                      <div className="lg:col-span-5">
                        <FormField label="Instrucciones / Ayuda para subida de PDFs (Opcional)">
                          <input
                            value={fInd.descripcion}
                            onChange={e => setFInd({...fInd, descripcion: e.target.value})}
                            placeholder="Instrucciones que verá el docente al subir documentos en este subcriterio..."
                            className={inputCls}
                          />
                        </FormField>
                      </div>

                      <div className="lg:col-span-5">
                        <FormField label="Responsables Asignados">
                          <div className="max-h-24 overflow-y-auto flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-white">
                            {usuariosDB.map(u => {
                              const seleccionados = fInd.responsablesIds || [];
                              const isChecked = seleccionados.includes(u.id);
                              return (
                                <label key={u.id} className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs cursor-pointer border transition-colors ${isChecked ? 'bg-navy-50 border-navy-300 text-navy-900 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      const newSelected = e.target.checked
                                        ? [...seleccionados, u.id]
                                        : seleccionados.filter(id => id !== u.id);
                                      setFInd({...fInd, responsablesIds: newSelected});
                                    }}
                                    className="rounded text-navy-600 focus:ring-navy-500"
                                  />
                                  <span>{u.nombre}</span>
                                </label>
                              );
                            })}
                          </div>
                        </FormField>
                      </div>

                      <div className="lg:col-span-2">
                        <button
                          type="submit"
                          disabled={!fInd.nombre || !fInd.numero || !fInd.univId || !fInd.facId || !fInd.perId || !fInd.carrId || !fInd.critId}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} /><span>Crear Subcriterio</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Tabla Estructurada de Subcriterios */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Target size={16} className="text-navy-700" />
                    <h4 className="text-sm font-semibold text-navy-900">
                      Tabla de Subcriterios ({filasSubcriterios.length})
                    </h4>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaSubcriterio}
                      onChange={e => setBusquedaSubcriterio(e.target.value)}
                      placeholder="Buscar por N°, subcriterio, criterio o responsable..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>

                {filasSubcriterios.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No se encontraron subcriterios con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                        <tr>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-16">N°</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Subcriterio</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Criterio Padre</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Carrera / Período</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Responsables</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Documentos (1 Clic)</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filasSubcriterios.map(({ u, f, p, ca, c, i }) => {
                          const esEditando = (editando?.tipo === 'subcriterio' || editando?.tipo === 'indicador') && editando?.id === i.id;
                          const esEliminando = eliminandoId === i.id;
                          const totalDocs = typeof i.cantidadDocumentos === 'number'
                            ? i.cantidadDocumentos
                            : (i.documentos?.length || 0);
                          const meta = {
                            univId: u.id,
                            facId: f.id,
                            perId: p.id,
                            carrId: ca.id,
                            critId: c.id,
                            valorEdicion: {
                              numero: i.numero,
                              nombre: i.nombre,
                              descripcion: i.descripcion || i.informacion_ayuda || '',
                              flujo_id: i.flujo_id || '',
                              requiere_firma: i.requiere_firma ?? true,
                              responsablesIds: i.responsables?.map(r => r.id) || [],
                            },
                          };

                          return (
                            <tr key={`${ca.id}-${c.id}-${i.id}`} className={`hover:bg-gray-50/70 transition-colors align-top ${esEliminando ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3 text-center">
                                {esEditando ? (
                                  <input
                                    type="number"
                                    value={editando?.valor?.numero || ''}
                                    onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, numero: e.target.value } }))}
                                    className={`${inputSmCls} text-center`}
                                  />
                                ) : (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-navy-100 text-navy-800">
                                    [{i.numero}]
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {esEditando ? (
                                  <div className="space-y-1.5">
                                    <input
                                      value={editando?.valor?.nombre || ''}
                                      onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))}
                                      placeholder="Nombre del subcriterio"
                                      className={inputSmCls}
                                    />
                                    <input
                                      value={editando?.valor?.descripcion || ''}
                                      onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, descripcion: e.target.value } }))}
                                      placeholder="Instrucciones para subida de PDFs..."
                                      className={inputSmCls}
                                    />
                                    <select
                                      value={editando?.valor?.flujo_id || ''}
                                      onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, flujo_id: e.target.value } }))}
                                      className={inputSmCls}
                                    >
                                      <option value="">-- Usar Flujo Global --</option>
                                      {flujosFirma.map(fl => <option key={fl.id} value={fl.id}>{fl.nombre}</option>)}
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-semibold text-navy-900 text-xs">{i.nombre}</span>
                                    {(i.descripcion || i.informacion_ayuda) && (
                                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                                        {i.descripcion || i.informacion_ayuda}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                                {c.nombre}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {ca.nombre}
                                  </span>
                                  <span className="text-[11px] text-gray-400">{p.nombre} · {f.nombre}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {esEditando ? (
                                  <div className="max-h-28 overflow-y-auto space-y-1 p-2 border border-gray-200 rounded-lg bg-gray-50">
                                    {usuariosDB.map(usr => {
                                      const seleccionados = editando?.valor?.responsablesIds || [];
                                      const isChecked = seleccionados.includes(usr.id);
                                      return (
                                        <label key={usr.id} className="flex items-center space-x-1.5 cursor-pointer text-xs">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={e => {
                                              const nuevos = e.target.checked
                                                ? [...seleccionados, usr.id]
                                                : seleccionados.filter(id => id !== usr.id);
                                              setEditando(prev => ({ ...prev, valor: { ...prev.valor, responsablesIds: nuevos } }));
                                            }}
                                            className="rounded text-navy-600"
                                          />
                                          <span className="text-gray-700 truncate">{usr.nombre}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {i.responsables && i.responsables.length > 0 ? (
                                      i.responsables.map(r => (
                                        <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {r.nombre}
                                        </span>
                                      ))
                                    ) : i.responsable_nombre ? (
                                      <span className="text-xs text-gray-600">{i.responsable_nombre}</span>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Sin asignar</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navegarA &&
                                    navegarA('explorador', {
                                      univId: u.id,
                                      facId: f.id,
                                      perId: p.id,
                                      carrId: ca.id,
                                      critId: c.id,
                                      subId: i.id,
                                    })
                                  }
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                    totalDocs > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-navy-50 text-navy-800 border-navy-200 hover:bg-navy-100'
                                  }`}
                                  title="Ir directamente a subir o ver PDFs de este subcriterio"
                                >
                                  <FolderOpen size={12} />
                                  <span>{totalDocs} PDF{totalDocs === 1 ? '' : 's'} →</span>
                                </button>
                              </td>

                              <td className="px-5 py-3 text-right">
                                {esEditando ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button onClick={guardarEdicion} className="px-2.5 py-1 bg-navy-900 text-white text-xs rounded-lg hover:bg-navy-800 flex items-center space-x-1">
                                      <Save size={12} /><span>Guardar</span>
                                    </button>
                                    <button onClick={cancelarEdicion} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end space-x-1">
                                    <button
                                      onClick={() => iniciarEdicion('subcriterio', i.id, meta.valorEdicion, meta)}
                                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Editar Subcriterio"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleEliminar('subcriterio', i.id, meta)}
                                      disabled={esEliminando}
                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                      title="Eliminar Subcriterio"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flujos */}
          {tab === 'flujos' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nuevo Flujo de Firma</h3>
                <form onSubmit={submitFlujo} className="space-y-4">
                  <FormField label="Nombre">
                    <input value={fFlujo.nombre} onChange={e => setFFlujo({...fFlujo, nombre: e.target.value})} placeholder="Flujo de Proyecto, Flujo A..." className={inputCls} />
                  </FormField>
                  <Toggle value={fFlujo.es_global} onChange={v => setFFlujo({...fFlujo, es_global: v})} label="Establecer como flujo global por defecto" />
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Secuencia de Pasos de Firma</h4>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {fFlujo.pasos.length} paso{fFlujo.pasos.length === 1 ? '' : 's'} configurado{fFlujo.pasos.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {fFlujo.pasos.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-3 text-center bg-white rounded-lg border border-dashed border-gray-200">
                        No hay pasos configurados. Haz clic en "Agregar Paso" para asignar firmantes.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {fFlujo.pasos.map((paso, idx) => {
                          const pasoObj = typeof paso === 'object' && paso !== null ? paso : { rol_id: paso, usuario_id: null, facultad_id: null, actividad_id: null };
                          return (
                            <PasoFirmaItem
                              key={idx}
                              index={idx}
                              paso={pasoObj}
                              onChange={(nuevoPaso) => {
                                const newPasos = [...fFlujo.pasos];
                                newPasos[idx] = nuevoPaso;
                                setFFlujo({ ...fFlujo, pasos: newPasos });
                              }}
                              onRemove={() => {
                                const newPasos = [...fFlujo.pasos];
                                newPasos.splice(idx, 1);
                                setFFlujo({ ...fFlujo, pasos: newPasos });
                              }}
                              facultades={facultadesDisponibles}
                              actividades={actividadesDisponibles}
                              roles={rolesBD}
                            />
                          );
                        })}
                      </div>
                    )}

                    <button 
                      type="button" 
                      onClick={() => setFFlujo({
                        ...fFlujo,
                        pasos: [...fFlujo.pasos, { usuario_id: null, rol_id: null, facultad_id: null, actividad_id: null }]
                      })}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 py-1"
                    >
                      <Plus size={14}/> <span>Agregar Paso de Firma</span>
                    </button>
                  </div>

                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Flujo</span>
                  </button>
                </form>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Flujos existentes</h3>
                <div className="space-y-2">
                  {flujosFirma.map(f => (
                    <ItemRow
                      key={f.id} tipo="flujo" id={f.id}
                      meta={{
                        valorEdicion: {
                          nombre: f.nombre,
                          es_global: f.es_global,
                          pasos: f.pasos?.map(p => ({
                            usuario_id: p.usuario_id || null,
                            rol_id: p.rol_id || null,
                            facultad_id: null,
                            actividad_id: null,
                          })) || []
                        }
                      }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                          <div className="mt-2">
                            <Toggle value={editando?.valor?.es_global ?? false} onChange={v => setEditando(prev => ({ ...prev, valor: { ...prev.valor, es_global: v } }))} label="Flujo global" />
                          </div>
                          
                          <div className="mt-3 space-y-2.5 border-t pt-2 border-gray-200">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Pasos de Firma</p>
                            {(editando?.valor?.pasos || []).map((paso, idx) => {
                              const pasoObj = typeof paso === 'object' && paso !== null ? paso : { rol_id: paso, usuario_id: null, facultad_id: null, actividad_id: null };
                              return (
                                <PasoFirmaItem
                                  key={idx}
                                  index={idx}
                                  paso={pasoObj}
                                  onChange={(nuevoPaso) => {
                                    const newPasos = [...editando.valor.pasos];
                                    newPasos[idx] = nuevoPaso;
                                    setEditando(prev => ({ ...prev, valor: { ...prev.valor, pasos: newPasos } }));
                                  }}
                                  onRemove={() => {
                                    const newPasos = [...editando.valor.pasos];
                                    newPasos.splice(idx, 1);
                                    setEditando(prev => ({ ...prev, valor: { ...prev.valor, pasos: newPasos } }));
                                  }}
                                  facultades={facultadesDisponibles}
                                  actividades={actividadesDisponibles}
                                  roles={rolesBD}
                                />
                              );
                            })}
                            <button 
                              type="button" 
                              onClick={() => setEditando(prev => ({
                                ...prev,
                                valor: {
                                  ...prev.valor,
                                  pasos: [...(prev.valor.pasos || []), { usuario_id: null, rol_id: null, facultad_id: null, actividad_id: null }]
                                }
                              }))}
                              className="text-[11px] font-medium text-blue-600 flex items-center space-x-1 pt-1"
                            >
                              <Plus size={12}/> <span>Añadir paso</span>
                            </button>
                          </div>
                        </>
                      }
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{f.nombre}</span>
                          {f.es_global && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-sm">GLOBAL</span>}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {f.pasos?.length || 0} pasos: {(f.pasos || []).map(p => p.usuarioFirmante ? p.usuarioFirmante.nombre : (p.rolRequerido?.nombre || `Rol #${p.rol_id}`)).join(' → ')}
                        </div>
                      </div>
                    </ItemRow>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ DOCENTES ══════════ */}
          {tab === 'docentes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Parametrización de Docentes</h3>
                  <p className="text-xs text-gray-500">Gestión de docentes con asignación múltiple a Facultades y Carreras</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDocente({ abierto: true, docente: null })}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-medium hover:bg-navy-800 transition-colors shadow-xs"
                >
                  <UserPlus size={14} />
                  <span>Nuevo Docente</span>
                </button>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar docente por nombre o correo..."
                  value={busquedaDocente}
                  onChange={e => setBusquedaDocente(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
                />
              </div>

              {/* Lista */}
              {cargandoDocentes ? (
                <div className="py-12 text-center text-xs text-gray-400">Cargando docentes...</div>
              ) : docentes.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No hay docentes registrados aún</div>
              ) : (
                <div className="space-y-2">
                  {docentes
                    .filter(d =>
                      (d.nombre || '').toLowerCase().includes(busquedaDocente.toLowerCase()) ||
                      (d.email || '').toLowerCase().includes(busquedaDocente.toLowerCase())
                    )
                    .map(d => (
                      <div
                        key={d.id}
                        className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-gray-300 transition-all"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-navy-900">{d.nombre}</span>
                            <span className="text-xs text-gray-400">({d.email})</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">Facultades:</span>
                              {(d.facultades && d.facultades.length > 0) ? (
                                d.facultades.map(f => (
                                  <span key={f.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {f.nombre}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">Ninguna</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">Carreras:</span>
                              {(d.carreras && d.carreras.length > 0) ? (
                                d.carreras.map(c => (
                                  <span key={c.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {c.nombre}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">Ninguna</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => setModalDocente({ abierto: true, docente: d })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Docente"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`¿Deseas eliminar al docente "${d.nombre}"?`)) return;
                              try {
                                await eliminarDocente(d.id);
                                mostrarExito('Docente eliminado');
                                cargarListaDocentes();
                              } catch (err) {
                                mostrarError(err.message);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar Docente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Docentes */}
      <ModalDocenteForm
        isOpen={modalDocente.abierto}
        onClose={() => setModalDocente({ abierto: false, docente: null })}
        docente={modalDocente.docente}
        onSuccess={() => {
          mostrarExito(modalDocente.docente ? 'Docente actualizado correctamente' : 'Docente creado con éxito');
          cargarListaDocentes();
        }}
      />
    </div>
  );
}
