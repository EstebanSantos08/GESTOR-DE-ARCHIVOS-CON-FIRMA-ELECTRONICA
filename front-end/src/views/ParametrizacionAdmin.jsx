import React, { useState, useEffect } from 'react';
import { Plus, Check, Building2, BookOpen, GraduationCap, CalendarDays, Microscope, Target, ClipboardList, Pencil, Trash2, X, Save, UserCheck, UserPlus, Search } from 'lucide-react';
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
    agregarActividad, actualizarActividad, eliminarActividad, asignarUsuariosActividad,
    listarUsuarios,
    listarDocentes, eliminarDocente,
    flujosFirma, crearFlujo, actualizarFlujo, eliminarFlujo,
    listarRoles,
    listarFacultadesCatalogo, listarActividadesCatalogo,
    navParams,
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
    : (universidades || []).flatMap(u => (u.facultades || []).flatMap(f => (f.carreras || []).flatMap(c => (c.periodos || []).flatMap(p => (p.criterios || []).flatMap(cr => (cr.indicadores || []).flatMap(i => i.actividades || []))))));

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

  const [tab, setTab] = useState(navParams?.tab || 'universidad');

  useEffect(() => {
    if (navParams?.tab) {
      setTab(navParams.tab);
    }
  }, [navParams]);
  const [exito, setExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editando, setEditando] = useState(null); // { tipo, id, valor, meta }
  const [eliminandoId, setEliminandoId] = useState(null);

  const [fUniv, setFUniv] = useState({ nombre: '', siglas: '' });
  const [fFac,  setFfac]  = useState({ nombre: '', univId: '' });
  const [fCarr, setFCarr] = useState({ nombre: '', descripcion: '', univId: '', facId: '' });
  const [fPer,  setFPer]  = useState({ nombre: '', univId: '', facId: '', carrId: '' });
  const [fCrit, setFCrit] = useState({ nombre: '', univId: '', facId: '', carrId: '', perId: '', requiere_firma: true });
  const [fInd,  setFInd]  = useState({ nombre: '', numero: '', responsablesIds: [], univId: '', facId: '', carrId: '', perId: '', critId: '' });
  const [fAct,  setFAct]  = useState({ nombre: '', univId: '', facId: '', carrId: '', perId: '', critId: '', indId: '', informacion_ayuda: '', requiere_firma: true, flujo_id: '' });
  const [fFlujo, setFFlujo] = useState({ nombre: '', es_global: false, pasos: [] });

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
    if (!fPer.nombre || !fPer.univId || !fPer.facId || !fPer.carrId) return;
    try {
      await agregarPeriodo(Number(fPer.univId), Number(fPer.facId), Number(fPer.carrId), { nombre: fPer.nombre });
      setFPer({ nombre: '', univId: '', facId: '', carrId: '' });
      mostrarExito('Período creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitCrit(e) {
    e.preventDefault();
    if (!fCrit.nombre || !fCrit.univId || !fCrit.facId || !fCrit.carrId || !fCrit.perId) return;
    try {
      await agregarCriterio(Number(fCrit.univId), Number(fCrit.facId), Number(fCrit.carrId), Number(fCrit.perId), { nombre: fCrit.nombre, requiere_firma: fCrit.requiere_firma, flujo_id: fCrit.flujo_id });
      setFCrit({ nombre: '', univId: '', facId: '', carrId: '', perId: '', requiere_firma: true, flujo_id: '' });
      mostrarExito('Criterio creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitInd(e) {
    e.preventDefault();
    if (!fInd.nombre || !fInd.numero || !fInd.univId || !fInd.facId || !fInd.carrId || !fInd.perId || !fInd.critId) return;
    try {
      const nuevoInd = await agregarIndicador(Number(fInd.univId), Number(fInd.facId), Number(fInd.carrId), Number(fInd.perId), Number(fInd.critId), { nombre: fInd.nombre, numero: Number(fInd.numero) });
      if (fInd.responsablesIds && fInd.responsablesIds.length > 0) {
        await asignarResponsablesIndicador(nuevoInd.id, fInd.responsablesIds);
      }
      setFInd({ nombre: '', numero: '', responsablesIds: [], univId: '', facId: '', carrId: '', perId: '', critId: '' });
      mostrarExito('Indicador creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitAct(e) {
    e.preventDefault();
    if (!fAct.nombre || !fAct.univId || !fAct.facId || !fAct.carrId || !fAct.perId || !fAct.critId || !fAct.indId) return;
    try {
      await agregarActividad(Number(fAct.univId), Number(fAct.facId), Number(fAct.carrId), Number(fAct.perId), Number(fAct.critId), Number(fAct.indId), {
        nombre: fAct.nombre,
        informacion_ayuda: fAct.informacion_ayuda,
        requiere_firma: fAct.requiere_firma,
        flujo_id: fAct.flujo_id || null,
      });
      setFAct({ nombre: '', univId: '', facId: '', carrId: '', perId: '', critId: '', indId: '', informacion_ayuda: '', requiere_firma: true, flujo_id: '' });
      mostrarExito('Actividad creada exitosamente');
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
      } else if (tipo === 'indicador') {
        await actualizarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, valor);
        if (valor.responsablesIds !== undefined) {
          await asignarResponsablesIndicador(id, valor.responsablesIds);
        }
      } else if (tipo === 'actividad') {
        const payload = { ...valor, flujo_id: valor.flujo_id || null };
        await actualizarActividad(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, meta.indId, payload);
        if (valor.usuariosAsignadosIds !== undefined) {
          await asignarUsuariosActividad(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, meta.indId, valor.usuariosAsignadosIds);
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
      else if (tipo === 'indicador') await eliminarIndicador(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId);
      else if (tipo === 'actividad') await eliminarActividad(id, meta.univId, meta.facId, meta.carrId, meta.perId, meta.critId, meta.indId);
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
    { id: 'carrera',     label: 'Carrera',     icon: GraduationCap },
    { id: 'periodo',     label: 'Período',     icon: CalendarDays },
    { id: 'criterio',    label: 'Criterio',    icon: Microscope },
    { id: 'indicador',   label: 'Indicador',   icon: Target },
    { id: 'actividad',   label: 'Actividad',   icon: ClipboardList },
    { id: 'docentes',    label: 'Docentes',    icon: UserCheck },
    { id: 'flujos',      label: 'Flujos Firma', icon: Pencil },
  ];

  // Helper getters for dropdowns
  const univSelFac  = universidades.find(u => u.id === Number(fFac.univId));
  
  const univSelCarr = universidades.find(u => u.id === Number(fCarr.univId));
  const facSelCarr  = univSelCarr?.facultades.find(f => f.id === Number(fCarr.facId));

  const univSelPer  = universidades.find(u => u.id === Number(fPer.univId));
  const facSelPer   = univSelPer?.facultades.find(f => f.id === Number(fPer.facId));
  const carrSelPer  = facSelPer?.carreras.find(c => c.id === Number(fPer.carrId));

  const univSelCrit = universidades.find(u => u.id === Number(fCrit.univId));
  const facSelCrit  = univSelCrit?.facultades.find(f => f.id === Number(fCrit.facId));
  const carrSelCrit = facSelCrit?.carreras.find(c => c.id === Number(fCrit.carrId));
  const perSelCrit  = carrSelCrit?.periodos.find(p => p.id === Number(fCrit.perId));

  const univSelInd  = universidades.find(u => u.id === Number(fInd.univId));
  const facSelInd   = univSelInd?.facultades.find(f => f.id === Number(fInd.facId));
  const carrSelInd  = facSelInd?.carreras.find(c => c.id === Number(fInd.carrId));
  const perSelInd   = carrSelInd?.periodos.find(p => p.id === Number(fInd.perId));
  const critSelInd  = perSelInd?.criterios.find(c => c.id === Number(fInd.critId));

  const univSelAct  = universidades.find(u => u.id === Number(fAct.univId));
  const facSelAct   = univSelAct?.facultades.find(f => f.id === Number(fAct.facId));
  const carrSelAct  = facSelAct?.carreras.find(c => c.id === Number(fAct.carrId));
  const perSelAct   = carrSelAct?.periodos.find(p => p.id === Number(fAct.perId));
  const critSelAct  = perSelAct?.criterios.find(c => c.id === Number(fAct.critId));
  const indSelAct   = critSelAct?.indicadores.find(i => i.id === Number(fAct.indId));


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
                  <FormField label="Universidad">
                    <select value={fPer.univId} onChange={e => setFPer({...fPer, univId: e.target.value, facId: '', carrId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fPer.facId} onChange={e => setFPer({...fPer, facId: e.target.value, carrId: ''})} className={selectCls} disabled={!fPer.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelPer?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select value={fPer.carrId} onChange={e => setFPer({...fPer, carrId: e.target.value})} className={selectCls} disabled={!fPer.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelPer?.carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fPer.nombre} onChange={e => setFPer({...fPer, nombre: e.target.value})} placeholder="2026-I, 2026-II..." className={inputCls} /></FormField>
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Período</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Períodos existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => (f.carreras || []).flatMap(ca => (ca.periodos || []).map(p => (
                    <ItemRow
                      key={p.id} tipo="periodo" id={p.id}
                      meta={{ univId: u.id, facId: f.id, carrId: ca.id, valorEdicion: { nombre: p.nombre } }}
                      editFields={
                        <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                      }
                    >
                      <span className="font-medium text-gray-800">{p.nombre}</span>
                      <span className="text-gray-400 text-xs ml-2">· {ca.nombre}</span>
                    </ItemRow>
                  )))))}
                </div>
              </div>
            </div>
          )}

          {/* Criterio */}
          {tab === 'criterio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nuevo Criterio</h3>
                <form onSubmit={submitCrit} className="space-y-4">
                  <FormField label="Universidad">
                    <select value={fCrit.univId} onChange={e => setFCrit({...fCrit, univId: e.target.value, facId: '', carrId: '', perId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fCrit.facId} onChange={e => setFCrit({...fCrit, facId: e.target.value, carrId: '', perId: ''})} className={selectCls} disabled={!fCrit.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelCrit?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select value={fCrit.carrId} onChange={e => setFCrit({...fCrit, carrId: e.target.value, perId: ''})} className={selectCls} disabled={!fCrit.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelCrit?.carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select value={fCrit.perId} onChange={e => setFCrit({...fCrit, perId: e.target.value})} className={selectCls} disabled={!fCrit.carrId}>
                      <option value="">Seleccionar...</option>
                      {carrSelCrit?.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre del Criterio">
                    <select
                      value={CRITERIOS_PREDEFINIDOS.includes(fCrit.nombre) ? fCrit.nombre : ''}
                      onChange={e => {
                        if (e.target.value) setFCrit({ ...fCrit, nombre: e.target.value });
                      }}
                      className={`${selectCls} mb-2`}
                    >
                      <option value="">-- Seleccionar Criterio Predefinido (opcional) --</option>
                      {CRITERIOS_PREDEFINIDOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={fCrit.nombre} onChange={e => setFCrit({...fCrit, nombre: e.target.value})} placeholder="O escribe el nombre del criterio..." className={inputCls} />
                  </FormField>
                  <FormField label="Flujo de Firma (Opcional)">
                    <select value={fCrit.flujo_id || ''} onChange={e => setFCrit({...fCrit, flujo_id: e.target.value})} className={selectCls}>
                      <option value="">-- Usar Flujo Global por Defecto --</option>
                      {flujosFirma.map(f => <option key={f.id} value={f.id}>{f.nombre} {f.es_global ? '(Global)' : ''}</option>)}
                    </select>
                  </FormField>
                  <Toggle value={fCrit.requiere_firma} onChange={v => setFCrit({...fCrit, requiere_firma: v})} label="Requiere firma digital" />
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Criterio</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Criterios existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => (f.carreras || []).flatMap(ca => (ca.periodos || []).flatMap(p => (p.criterios || []).map(c => (
                    <ItemRow
                      key={c.id} tipo="criterio" id={c.id}
                      meta={{ univId: u.id, facId: f.id, carrId: ca.id, perId: p.id, valorEdicion: { nombre: c.nombre, requiere_firma: c.requiere_firma, flujo_id: c.flujo_id || '' } }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                          <div className="mt-2">
                            <select value={editando?.valor?.flujo_id || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, flujo_id: e.target.value } }))} className={inputSmCls}>
                              <option value="">-- Usar Flujo Global por Defecto --</option>
                              {flujosFirma.map(fl => <option key={fl.id} value={fl.id}>{fl.nombre}</option>)}
                            </select>
                          </div>
                          <div className="mt-2">
                            <Toggle
                              value={editando?.valor?.requiere_firma ?? true}
                              onChange={v => setEditando(prev => ({ ...prev, valor: { ...prev.valor, requiere_firma: v } }))}
                              label="Requiere firma"
                            />
                          </div>
                        </>
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-800">{c.nombre}</span>
                          <span className="ml-2 text-gray-400 text-xs">· {p.nombre}</span>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.requiere_firma ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                            {c.requiere_firma ? 'Con firma' : 'Sin firma'}
                          </span>
                          {c.requiere_firma && (
                            <span className="text-[10px] text-gray-400">
                              Flujo: {c.flujo_id ? flujosFirma.find(f => f.id === c.flujo_id)?.nombre : 'Global'}
                            </span>
                          )}
                        </div>
                      </div>
                    </ItemRow>
                  ))))))}
                </div>
              </div>
            </div>
          )}

          {/* Indicador */}
          {tab === 'indicador' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nuevo Indicador</h3>
                <form onSubmit={submitInd} className="space-y-4">
                  <FormField label="Universidad">
                    <select value={fInd.univId} onChange={e => setFInd({...fInd, univId: e.target.value, facId: '', carrId: '', perId: '', critId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fInd.facId} onChange={e => setFInd({...fInd, facId: e.target.value, carrId: '', perId: '', critId: ''})} className={selectCls} disabled={!fInd.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelInd?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select value={fInd.carrId} onChange={e => setFInd({...fInd, carrId: e.target.value, perId: '', critId: ''})} className={selectCls} disabled={!fInd.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelInd?.carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select value={fInd.perId} onChange={e => setFInd({...fInd, perId: e.target.value, critId: ''})} className={selectCls} disabled={!fInd.carrId}>
                      <option value="">Seleccionar...</option>
                      {carrSelInd?.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Criterio">
                    <select value={fInd.critId} onChange={e => setFInd({...fInd, critId: e.target.value})} className={selectCls} disabled={!fInd.perId}>
                      <option value="">Seleccionar...</option>
                      {perSelInd?.criterios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Seleccionar Indicador Predefinido">
                    <select
                      onChange={e => {
                        const sel = INDICADORES_PREDEFINIDOS.find(i => i.nombre === e.target.value);
                        if (sel) {
                          setFInd(prev => ({
                            ...prev,
                            numero: sel.numero,
                            nombre: sel.nombre,
                            responsable_nombre: sel.responsable_nombre,
                          }));
                        }
                      }}
                      className={selectCls}
                    >
                      <option value="">-- Seleccionar de los 31 Indicadores --</option>
                      {INDICADORES_PREDEFINIDOS.map(ind => (
                        <option key={`${ind.numero}-${ind.nombre}`} value={ind.nombre}>
                          [{ind.numero}] {ind.nombre} (Criterio: {ind.criterio})
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Número"><input type="number" value={fInd.numero} onChange={e => setFInd({...fInd, numero: e.target.value})} placeholder="1, 2, 3..." className={inputCls} readOnly /></FormField>
                  <FormField label="Nombre"><input value={fInd.nombre} onChange={e => setFInd({...fInd, nombre: e.target.value})} placeholder="Ej. Sílabos, Mallas..." className={inputCls} readOnly /></FormField>

                  <FormField label="Responsables Asignados">
                    <div className="max-h-48 overflow-y-auto space-y-2 p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                      {usuariosDB.map(u => {
                        const seleccionados = fInd.responsablesIds || [];
                        const isChecked = seleccionados.includes(u.id);
                        return (
                          <label key={u.id} className="flex items-center space-x-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const newSelected = e.target.checked 
                                  ? [...seleccionados, u.id]
                                  : seleccionados.filter(id => id !== u.id);
                                setFInd({...fInd, responsablesIds: newSelected});
                              }}
                              className="rounded text-navy-600 focus:ring-navy-500 bg-white border-gray-300"
                            />
                            <span className="text-xs text-gray-700">{u.nombre} <span className="text-gray-400">({u.email})</span></span>
                          </label>
                        );
                      })}
                    </div>
                  </FormField>

                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Indicador</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Indicadores existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => (f.carreras || []).flatMap(ca => (ca.periodos || []).flatMap(p => (p.criterios || []).flatMap(c => (c.indicadores || []).map(i => (
                    <ItemRow
                      key={i.id} tipo="indicador" id={i.id}
                      meta={{ univId: u.id, facId: f.id, carrId: ca.id, perId: p.id, critId: c.id, valorEdicion: { nombre: i.nombre, numero: i.numero, responsablesIds: i.responsables?.map(u => u.id) || [] } }}
                      editFields={
                        <>
                          <input type="number" value={editando?.valor?.numero || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, numero: e.target.value } }))} placeholder="Número" className={inputSmCls} />
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={`${inputSmCls} mt-1`} />
                          <div className="mt-2">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Responsables Asignados</label>
                            <div className="max-h-32 overflow-y-auto space-y-2 p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                              {usuariosDB.map(u => {
                                const seleccionados = editando?.valor?.responsablesIds || [];
                                const isChecked = seleccionados.includes(u.id);
                                return (
                                  <label key={u.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newSelected = e.target.checked 
                                          ? [...seleccionados, u.id]
                                          : seleccionados.filter(id => id !== u.id);
                                        setEditando(prev => ({ ...prev, valor: { ...prev.valor, responsablesIds: newSelected } }));
                                      }}
                                      className="rounded text-navy-600 focus:ring-navy-500 bg-white border-gray-300"
                                    />
                                    <span className="text-xs text-gray-700">{u.nombre} <span className="text-gray-400">({u.email})</span></span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      }
                    >
                      <span className="font-medium text-gray-800">
                        [{i.numero}] {i.nombre}
                        {i.responsables && i.responsables.length > 0 && (
                          <span className="text-gray-500 font-normal text-xs ml-1">
                            (Resp: {i.responsables.map(r => r.nombre).join(', ')})
                          </span>
                        )}
                      </span>
                      <span className="ml-2 text-gray-400 text-xs">· {c.nombre}</span>
                    </ItemRow>
                  )))))))}
                </div>
              </div>
            </div>
          )}

          {/* Actividad */}
          {tab === 'actividad' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nueva Actividad</h3>
                <form onSubmit={submitAct} className="space-y-4">
                  <FormField label="Universidad">
                    <select value={fAct.univId} onChange={e => setFAct({...fAct, univId: e.target.value, facId: '', carrId: '', perId: '', critId: '', indId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fAct.facId} onChange={e => setFAct({...fAct, facId: e.target.value, carrId: '', perId: '', critId: '', indId: ''})} className={selectCls} disabled={!fAct.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelAct?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Carrera">
                    <select value={fAct.carrId} onChange={e => setFAct({...fAct, carrId: e.target.value, perId: '', critId: '', indId: ''})} className={selectCls} disabled={!fAct.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelAct?.carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select value={fAct.perId} onChange={e => setFAct({...fAct, perId: e.target.value, critId: '', indId: ''})} className={selectCls} disabled={!fAct.carrId}>
                      <option value="">Seleccionar...</option>
                      {carrSelAct?.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Criterio">
                    <select value={fAct.critId} onChange={e => setFAct({...fAct, critId: e.target.value, indId: ''})} className={selectCls} disabled={!fAct.perId}>
                      <option value="">Seleccionar...</option>
                      {perSelAct?.criterios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Indicador">
                    <select value={fAct.indId} onChange={e => setFAct({...fAct, indId: e.target.value})} className={selectCls} disabled={!fAct.critId}>
                      <option value="">Seleccionar...</option>
                      {critSelAct?.indicadores.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fAct.nombre} onChange={e => setFAct({...fAct, nombre: e.target.value})} placeholder="Entregables, Informes..." className={inputCls} /></FormField>
                  <FormField label="Descripción / Ayuda">
                    <textarea value={fAct.informacion_ayuda} onChange={e => setFAct({...fAct, informacion_ayuda: e.target.value})} className={inputCls} rows={2} placeholder="Instrucciones para esta actividad..."></textarea>
                  </FormField>
                  <FormField label="Flujo de Firma (Opcional)">
                    <select value={fAct.flujo_id || ''} onChange={e => setFAct({...fAct, flujo_id: e.target.value})} className={selectCls}>
                      <option value="">-- Heredar de Criterio / Global --</option>
                      {flujosFirma.map(f => <option key={f.id} value={f.id}>{f.nombre} {f.es_global ? '(Global)' : ''}</option>)}
                    </select>
                  </FormField>
                  <Toggle value={fAct.requiere_firma} onChange={v => setFAct({...fAct, requiere_firma: v})} label="Requiere firma digital" />
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Actividad</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Actividades existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => (f.carreras || []).flatMap(ca => (ca.periodos || []).flatMap(p => (p.criterios || []).flatMap(c => (c.indicadores || []).flatMap(i => (i.actividades || []).map(a => (
                    <ItemRow
                      key={a.id} tipo="actividad" id={a.id}
                      meta={{ univId: u.id, facId: f.id, carrId: ca.id, perId: p.id, critId: c.id, indId: i.id, valorEdicion: { nombre: a.nombre, informacion_ayuda: a.informacion_ayuda || '', requiere_firma: a.requiere_firma, flujo_id: a.flujo_id || '', usuariosAsignadosIds: a.usuariosAsignados?.map(u => u.id) || [] } }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                          <textarea value={editando?.valor?.informacion_ayuda || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, informacion_ayuda: e.target.value } }))} placeholder="Instrucciones" rows={2} className={`${inputSmCls} mt-1 resize-none`} />
                          <div className="mt-2">
                            <select value={editando?.valor?.flujo_id || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, flujo_id: e.target.value } }))} className={inputSmCls}>
                              <option value="">-- Heredar de Criterio / Global --</option>
                              {flujosFirma.map(fl => <option key={fl.id} value={fl.id}>{fl.nombre}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 flex items-center space-x-4">
                            <Toggle
                              value={editando?.valor?.requiere_firma ?? true}
                              onChange={v => setEditando(prev => ({ ...prev, valor: { ...prev.valor, requiere_firma: v } }))}
                              label="Requiere firma"
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Usuarios Asignados (Vacío = Público)</label>
                            <div className="max-h-32 overflow-y-auto space-y-2 p-2 border border-gray-200 rounded-lg bg-gray-50/50">
                              {usuariosDB.map(u => {
                                const seleccionados = editando?.valor?.usuariosAsignadosIds || [];
                                const isChecked = seleccionados.includes(u.id);
                                return (
                                  <label key={u.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newSelected = e.target.checked 
                                          ? [...seleccionados, u.id]
                                          : seleccionados.filter(id => id !== u.id);
                                        setEditando(prev => ({ ...prev, valor: { ...prev.valor, usuariosAsignadosIds: newSelected } }));
                                      }}
                                      className="rounded text-navy-600 focus:ring-navy-500 bg-white border-gray-300"
                                    />
                                    <span className="text-xs text-gray-700">{u.nombre} <span className="text-gray-400">({u.email})</span></span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      }
                    >
                      <span className="font-medium text-gray-800">{a.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">· {i.nombre}</span>
                    </ItemRow>
                  ))))))))}
                </div>
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
                        No hay pasos configurados. Haz clic en "Agregar Paso" para asignar firmantes por facultad y actividad.
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

          {/* ══════════ DOCENTES (N:M Facultades y Actividades) ══════════ */}
          {tab === 'docentes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Parametrización de Docentes</h3>
                  <p className="text-xs text-gray-500">Gestión de docentes con asignación múltiple a Facultades y Actividades (N:M)</p>
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
                            {/* Facultades */}
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

                            {/* Actividades */}
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-medium">Actividades:</span>
                              {(d.actividades && d.actividades.length > 0) ? (
                                d.actividades.map(a => (
                                  <span key={a.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {a.nombre}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">Ninguna</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
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
