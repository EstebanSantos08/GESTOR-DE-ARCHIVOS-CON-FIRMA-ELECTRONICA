import React, { useState } from 'react';
import { Plus, Check, Building2, BookOpen, CalendarDays, Microscope, ClipboardList, Pencil, Trash2, X, Save } from 'lucide-react';
import { useApp } from '../context/useApp';

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
    agregarPeriodo, actualizarPeriodo, eliminarPeriodo,
    agregarCriterio, actualizarCriterio, eliminarCriterio,
    agregarActividad, actualizarActividad, eliminarActividad,
  } = useApp();

  const [tab, setTab] = useState('universidad');
  const [exito, setExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editando, setEditando] = useState(null); // { tipo, id, valor, meta }
  const [eliminandoId, setEliminandoId] = useState(null);

  const [fUniv, setFUniv] = useState({ nombre: '', siglas: '' });
  const [fFac, setFfac] = useState({ nombre: '', univId: '' });
  const [fPer, setFPer] = useState({ nombre: '', univId: '', facId: '' });
  const [fCrit, setFCrit] = useState({ nombre: '', univId: '', facId: '', perId: '', requiere_firma: true });
  const [fAct, setFAct] = useState({ nombre: '', univId: '', facId: '', perId: '', critId: '', informacion_ayuda: '', requiere_firma: true });

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

  async function submitPer(e) {
    e.preventDefault();
    if (!fPer.nombre || !fPer.univId || !fPer.facId) return;
    try {
      await agregarPeriodo(Number(fPer.univId), Number(fPer.facId), { nombre: fPer.nombre });
      setFPer({ nombre: '', univId: '', facId: '' });
      mostrarExito('Período creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitCrit(e) {
    e.preventDefault();
    if (!fCrit.nombre || !fCrit.univId || !fCrit.facId || !fCrit.perId) return;
    try {
      await agregarCriterio(Number(fCrit.univId), Number(fCrit.facId), Number(fCrit.perId), { nombre: fCrit.nombre, requiere_firma: fCrit.requiere_firma });
      setFCrit({ nombre: '', univId: '', facId: '', perId: '', requiere_firma: true });
      mostrarExito('Criterio creado exitosamente');
    } catch (err) { mostrarError(err.message); }
  }

  async function submitAct(e) {
    e.preventDefault();
    if (!fAct.nombre || !fAct.univId || !fAct.facId || !fAct.perId || !fAct.critId) return;
    try {
      await agregarActividad(Number(fAct.univId), Number(fAct.facId), Number(fAct.perId), Number(fAct.critId), {
        nombre: fAct.nombre,
        informacion_ayuda: fAct.informacion_ayuda,
        requiere_firma: fAct.requiere_firma,
      });
      setFAct({ nombre: '', univId: '', facId: '', perId: '', critId: '', informacion_ayuda: '', requiere_firma: true });
      mostrarExito('Actividad creada exitosamente');
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
      } else if (tipo === 'periodo') {
        await actualizarPeriodo(id, meta.univId, meta.facId, valor);
      } else if (tipo === 'criterio') {
        await actualizarCriterio(id, meta.univId, meta.facId, meta.perId, valor);
      } else if (tipo === 'actividad') {
        await actualizarActividad(id, meta.univId, meta.facId, meta.perId, meta.critId, valor);
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
      else if (tipo === 'periodo') await eliminarPeriodo(id, meta.univId, meta.facId);
      else if (tipo === 'criterio') await eliminarCriterio(id, meta.univId, meta.facId, meta.perId);
      else if (tipo === 'actividad') await eliminarActividad(id, meta.univId, meta.facId, meta.perId, meta.critId);
      mostrarExito('Eliminado correctamente');
    } catch (err) { mostrarError(err.message); }
    finally { setEliminandoId(null); }
  }

  const TABS = [
    { id: 'universidad', label: 'Universidad', icon: Building2 },
    { id: 'facultad',    label: 'Facultad',    icon: BookOpen },
    { id: 'periodo',     label: 'Período',     icon: CalendarDays },
    { id: 'criterio',   label: 'Criterio',    icon: Microscope },
    { id: 'actividad',  label: 'Actividad',   icon: ClipboardList },
  ];

  const univSelFac  = universidades.find(u => u.id === Number(fFac.univId));
  const univSelPer  = universidades.find(u => u.id === Number(fPer.univId));
  const facSelPer   = univSelPer?.facultades.find(f => f.id === Number(fPer.facId));
  const univSelCrit = universidades.find(u => u.id === Number(fCrit.univId));
  const facSelCrit  = univSelCrit?.facultades.find(f => f.id === Number(fCrit.facId));
  const perSelCrit  = facSelCrit?.periodos.find(p => p.id === Number(fCrit.perId));
  const univSelAct  = universidades.find(u => u.id === Number(fAct.univId));
  const facSelAct   = univSelAct?.facultades.find(f => f.id === Number(fAct.facId));
  const perSelAct   = facSelAct?.periodos.find(p => p.id === Number(fAct.perId));
  const critSelAct  = perSelAct?.criterios.find(c => c.id === Number(fAct.critId));

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
        <div className="flex border-b border-gray-100">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 text-sm font-medium transition-colors ${
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

          {/* Período */}
          {tab === 'periodo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Nuevo Período</h3>
                <form onSubmit={submitPer} className="space-y-4">
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
                  <FormField label="Nombre"><input value={fPer.nombre} onChange={e => setFPer({...fPer, nombre: e.target.value})} placeholder="2026-I, 2026-II..." className={inputCls} /></FormField>
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Período</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Períodos existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.periodos.map(p => (
                    <ItemRow
                      key={p.id} tipo="periodo" id={p.id}
                      meta={{ univId: u.id, facId: f.id, valorEdicion: { nombre: p.nombre } }}
                      editFields={
                        <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                      }
                    >
                      <span className="font-medium text-gray-800">{p.nombre}</span>
                      <span className="text-gray-400 text-xs ml-2">· {f.nombre}</span>
                    </ItemRow>
                  ))))}
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
                    <select value={fCrit.univId} onChange={e => setFCrit({...fCrit, univId: e.target.value, facId: '', perId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fCrit.facId} onChange={e => setFCrit({...fCrit, facId: e.target.value, perId: ''})} className={selectCls} disabled={!fCrit.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelCrit?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select value={fCrit.perId} onChange={e => setFCrit({...fCrit, perId: e.target.value})} className={selectCls} disabled={!fCrit.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelCrit?.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fCrit.nombre} onChange={e => setFCrit({...fCrit, nombre: e.target.value})} placeholder="Academia, Investigación..." className={inputCls} /></FormField>
                  <Toggle value={fCrit.requiere_firma} onChange={v => setFCrit({...fCrit, requiere_firma: v})} label="Requiere firma digital" />
                  <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors">
                    <Plus size={16} /><span>Crear Criterio</span>
                  </button>
                </form>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy-900 mb-4">Criterios existentes</h3>
                <div className="space-y-2">
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.periodos.flatMap(p => p.criterios.map(c => (
                    <ItemRow
                      key={c.id} tipo="criterio" id={c.id}
                      meta={{ univId: u.id, facId: f.id, perId: p.id, valorEdicion: { nombre: c.nombre, requiere_firma: c.requiere_firma } }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.requiere_firma ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                          {c.requiere_firma ? 'Con firma' : 'Sin firma'}
                        </span>
                      </div>
                    </ItemRow>
                  )))))}
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
                    <select value={fAct.univId} onChange={e => setFAct({...fAct, univId: e.target.value, facId: '', perId: '', critId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fAct.facId} onChange={e => setFAct({...fAct, facId: e.target.value, perId: '', critId: ''})} className={selectCls} disabled={!fAct.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelAct?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Período">
                    <select value={fAct.perId} onChange={e => setFAct({...fAct, perId: e.target.value, critId: ''})} className={selectCls} disabled={!fAct.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelAct?.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Criterio">
                    <select value={fAct.critId} onChange={e => setFAct({...fAct, critId: e.target.value})} className={selectCls} disabled={!fAct.perId}>
                      <option value="">Seleccionar...</option>
                      {perSelAct?.criterios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fAct.nombre} onChange={e => setFAct({...fAct, nombre: e.target.value})} placeholder="Entregables, Informes..." className={inputCls} /></FormField>
                  <FormField label="Instrucciones de ayuda">
                    <textarea value={fAct.informacion_ayuda} onChange={e => setFAct({...fAct, informacion_ayuda: e.target.value})} rows={3} placeholder="Describa qué documentos deben subirse..." className={`${inputCls} resize-none`} />
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
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.periodos.flatMap(p => p.criterios.flatMap(c => c.actividades.map(a => (
                    <ItemRow
                      key={a.id} tipo="actividad" id={a.id}
                      meta={{ univId: u.id, facId: f.id, perId: p.id, critId: c.id, valorEdicion: { nombre: a.nombre, informacion_ayuda: a.informacion_ayuda || '', requiere_firma: a.requiere_firma } }}
                      editFields={
                        <>
                          <input value={editando?.valor?.nombre || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, nombre: e.target.value } }))} placeholder="Nombre" className={inputSmCls} />
                          <textarea value={editando?.valor?.informacion_ayuda || ''} onChange={e => setEditando(prev => ({ ...prev, valor: { ...prev.valor, informacion_ayuda: e.target.value } }))} placeholder="Instrucciones" rows={2} className={`${inputSmCls} mt-1 resize-none`} />
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
                      <span className="font-medium text-gray-800">{a.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">· {c.nombre} · {p.nombre}</span>
                    </ItemRow>
                  ))))))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
