import React, { useState } from 'react';
import { Plus, Check, AlertCircle, Trash2, Pencil, Building2, BookOpen, CalendarDays, Microscope, ClipboardList, X } from 'lucide-react';
import { useApp } from '../context/useApp';

function ConfirmarModal({ mensaje, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-sm w-full">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Confirmar eliminación</h3>
        <p className="text-sm text-gray-600 mb-5">{mensaje}</p>
        <div className="flex space-x-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const inputClsEdit = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent";

function EditarModal({ tipo, datos, onSave, onCancel }) {
  const [form, setForm] = useState({ ...datos });
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await onSave(form);
    } catch {
      // Error ya mostrado por ejecutarEdicion
    } finally {
      setGuardando(false);
    }
  }

  const titulos = {
    universidad: 'Editar Universidad',
    facultad: 'Editar Facultad',
    periodo: 'Editar Período',
    criterio: 'Editar Criterio',
    actividad: 'Editar Actividad',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{titulos[tipo] || 'Editar'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nombre">
            <input value={form.nombre || ''} onChange={e => setForm({...form, nombre: e.target.value})} className={inputClsEdit} required />
          </FormField>
          {tipo === 'universidad' && (
            <FormField label="Siglas">
              <input value={form.siglas || ''} onChange={e => setForm({...form, siglas: e.target.value})} className={inputClsEdit} />
            </FormField>
          )}
          {tipo === 'actividad' && (
            <FormField label="Instrucciones de ayuda">
              <textarea value={form.informacion_ayuda || form.descripcion || ''} onChange={e => setForm({...form, informacion_ayuda: e.target.value, descripcion: e.target.value})} rows={3} className={`${inputClsEdit} resize-none`} />
            </FormField>
          )}
          {tipo === 'criterio' && (
            <Toggle
              value={form.requiere_firma ?? true}
              onChange={v => setForm({...form, requiere_firma: v})}
              label="Requiere firma digital"
            />
          )}
          <div className="flex space-x-3 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-4 py-2 text-sm font-medium text-white bg-navy-900 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

export default function ParametrizacionAdmin() {
  const {
    universidades, agregarUniversidad, agregarFacultad, agregarPeriodo, agregarCriterio, agregarActividad,
    eliminarUniversidad, eliminarFacultad, eliminarPeriodo, eliminarCriterio, eliminarActividad,
    actualizarUniversidad, actualizarFacultad, actualizarPeriodo, actualizarCriterio, actualizarActividad,
  } = useApp();
  const [tab, setTab] = useState('universidad');
  const [exito, setExito] = useState('');
  const [error, setError] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [editando, setEditando] = useState(null);

  function cerrarConfirmacion() { setConfirmarEliminar(null); }

  function abrirEdicion(tipo, datos) {
    setEditando({ tipo, datos });
  }
  function cerrarEdicion() { setEditando(null); }

  async function ejecutarEliminar() {
    if (!confirmarEliminar) return;
    const { tipo, id, nombre } = confirmarEliminar;
    try {
      switch (tipo) {
        case 'universidad': await eliminarUniversidad(id); break;
        case 'facultad':    await eliminarFacultad(id); break;
        case 'periodo':     await eliminarPeriodo(id); break;
        case 'criterio':    await eliminarCriterio(id); break;
        case 'actividad':   await eliminarActividad(id); break;
      }
      cerrarConfirmacion();
      mostrarExito(`${nombre} eliminado correctamente`);
    } catch (err) {
      cerrarConfirmacion();
      mostrarError(err.message);
    }
  }

  async function ejecutarEdicion(form) {
    if (!editando) return;
    const { tipo, id } = editando;
    try {
      switch (tipo) {
        case 'universidad': await actualizarUniversidad(id, { nombre: form.nombre, siglas: form.siglas }); break;
        case 'facultad':    await actualizarFacultad(id, { nombre: form.nombre }); break;
        case 'periodo':     await actualizarPeriodo(id, { nombre: form.nombre }); break;
        case 'criterio':    await actualizarCriterio(id, { nombre: form.nombre, requiere_firma: form.requiere_firma }); break;
        case 'actividad':   await actualizarActividad(id, { nombre: form.nombre, descripcion: form.informacion_ayuda || form.descripcion || '' }); break;
      }
      cerrarEdicion();
      mostrarExito(`${form.nombre} actualizado correctamente`);
    } catch (err) {
      mostrarError(err.message);
      throw err; // para que el modal sepa que falló
    }
  }

  const [fUniv, setFUniv] = useState({ nombre: '', siglas: '' });
  const [fFac, setFfac] = useState({ nombre: '', univId: '' });
  const [fPer, setFPer] = useState({ nombre: '', univId: '', facId: '' });
  const [fCrit, setFCrit] = useState({ nombre: '', univId: '', facId: '', perId: '', requiere_firma: true });
  const [fAct, setFAct] = useState({ nombre: '', univId: '', facId: '', perId: '', critId: '', informacion_ayuda: '', requiere_firma: true });

  function mostrarExito(msg) {
    setExito(msg);
    setError('');
    setTimeout(() => setExito(''), 3000);
  }

  function mostrarError(msg) {
    setError(msg);
    setExito('');
    setTimeout(() => setError(''), 4000);
  }

  async function submitUniv(e) {
    e.preventDefault();
    if (!fUniv.nombre) return;
    try {
      await agregarUniversidad(fUniv);
      setFUniv({ nombre: '', siglas: '' });
      mostrarExito('Universidad creada exitosamente');
    } catch (err) {
      mostrarError(err.message);
    }
  }

  async function submitFac(e) {
    e.preventDefault();
    if (!fFac.nombre || !fFac.univId) return;
    try {
      await agregarFacultad(Number(fFac.univId), { nombre: fFac.nombre });
      setFfac({ nombre: '', univId: '' });
      mostrarExito('Facultad creada exitosamente');
    } catch (err) {
      mostrarError(err.message);
    }
  }

  async function submitPer(e) {
    e.preventDefault();
    if (!fPer.nombre || !fPer.univId || !fPer.facId) return;
    try {
      await agregarPeriodo(Number(fPer.univId), Number(fPer.facId), { nombre: fPer.nombre });
      setFPer({ nombre: '', univId: '', facId: '' });
      mostrarExito('Período creado exitosamente');
    } catch (err) {
      mostrarError(err.message);
    }
  }

  async function submitCrit(e) {
    e.preventDefault();
    if (!fCrit.nombre || !fCrit.univId || !fCrit.facId || !fCrit.perId) return;
    try {
      await agregarCriterio(Number(fCrit.univId), Number(fCrit.facId), Number(fCrit.perId), { nombre: fCrit.nombre, requiere_firma: fCrit.requiere_firma });
      setFCrit({ nombre: '', univId: '', facId: '', perId: '', requiere_firma: true });
      mostrarExito('Criterio creado exitosamente');
    } catch (err) {
      mostrarError(err.message);
    }
  }

  async function submitAct(e) {
    e.preventDefault();
    if (!fAct.nombre || !fAct.univId || !fAct.facId || !fAct.perId || !fAct.critId) return;
    try {
      await agregarActividad(Number(fAct.univId), Number(fAct.facId), Number(fAct.perId), Number(fAct.critId), {
        nombre: fAct.nombre,
        informacion_ayuda: fAct.informacion_ayuda,
      });
      setFAct({ nombre: '', univId: '', facId: '', perId: '', critId: '', informacion_ayuda: '', requiere_firma: true });
      mostrarExito('Actividad creada exitosamente');
    } catch (err) {
      mostrarError(err.message);
    }
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

  return (
    <div className="p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}
      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <Check size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-800">{exito}</span>
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
                    <div key={u.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-gray-800">{u.nombre}</span>
                        <span className="ml-2 text-gray-400 text-xs">{u.siglas}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => abrirEdicion('universidad', { id: u.id, nombre: u.nombre, siglas: u.siglas })}
                          className="p-1.5 text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-all"
                          title="Editar universidad"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar({ tipo: 'universidad', id: u.id, nombre: u.nombre })}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar universidad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
                    <div key={f.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-gray-800">{f.nombre}</span>
                        <span className="ml-2 text-gray-400 text-xs">· {u.siglas}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => abrirEdicion('facultad', { id: f.id, nombre: f.nombre })}
                          className="p-1.5 text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-all"
                          title="Editar facultad"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar({ tipo: 'facultad', id: f.id, nombre: f.nombre })}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar facultad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
                    <div key={p.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-gray-800">{p.nombre}</span>
                        <span className="text-gray-400 text-xs">· {f.nombre}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => abrirEdicion('periodo', { id: p.id, nombre: p.nombre })}
                          className="p-1.5 text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-all"
                          title="Editar período"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar({ tipo: 'periodo', id: p.id, nombre: p.nombre })}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar período"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
                    <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-gray-800">{c.nombre}</span>
                        <span className="ml-2 text-gray-400 text-xs">· {p.nombre}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.requiere_firma ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                          {c.requiere_firma ? 'Con firma' : 'Sin firma'}
                        </span>
                        <button
                          onClick={() => abrirEdicion('criterio', { id: c.id, nombre: c.nombre, requiere_firma: c.requiere_firma })}
                          className="p-1.5 text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-all"
                          title="Editar criterio"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar({ tipo: 'criterio', id: c.id, nombre: c.nombre })}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar criterio"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
                    <div key={a.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between group">
                      <div>
                        <span className="font-medium text-gray-800">{a.nombre}</span>
                        <span className="ml-2 text-gray-400 text-xs">· {c.nombre} · {p.nombre}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => abrirEdicion('actividad', { id: a.id, nombre: a.nombre, informacion_ayuda: a.informacion_ayuda || a.descripcion || '' })}
                          className="p-1.5 text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-all"
                          title="Editar actividad"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmarEliminar({ tipo: 'actividad', id: a.id, nombre: a.nombre })}
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar actividad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))))))} 
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <EditarModal
          tipo={editando.tipo}
          datos={editando.datos}
          onSave={ejecutarEdicion}
          onCancel={cerrarEdicion}
        />
      )}

      {confirmarEliminar && (
        <ConfirmarModal
          mensaje={`¿Está seguro de eliminar "${confirmarEliminar.nombre}"? Esta acción también eliminará todos sus registros asociados.`}
          onConfirm={ejecutarEliminar}
          onCancel={cerrarConfirmacion}
        />
      )}
    </div>
  );
}
