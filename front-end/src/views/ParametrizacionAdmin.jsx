import React, { useState } from 'react';
import { Plus, Check, Building2, BookOpen, Microscope, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
  const { universidades, agregarUniversidad, agregarFacultad, agregarCriterio, agregarActividad } = useApp();
  const [tab, setTab] = useState('universidad');
  const [exito, setExito] = useState('');

  const [fUniv, setFUniv] = useState({ nombre: '', siglas: '' });
  const [fFac, setFfac] = useState({ nombre: '', univId: '' });
  const [fCrit, setFCrit] = useState({ nombre: '', univId: '', facId: '', requiere_firma: true });
  const [fAct, setFAct] = useState({ nombre: '', univId: '', facId: '', critId: '', informacion_ayuda: '', requiere_firma: true });

  function mostrarExito(msg) {
    setExito(msg);
    setTimeout(() => setExito(''), 3000);
  }

  function submitUniv(e) {
    e.preventDefault();
    if (!fUniv.nombre) return;
    agregarUniversidad(fUniv);
    setFUniv({ nombre: '', siglas: '' });
    mostrarExito('Universidad creada exitosamente');
  }

  function submitFac(e) {
    e.preventDefault();
    if (!fFac.nombre || !fFac.univId) return;
    agregarFacultad(Number(fFac.univId), { nombre: fFac.nombre });
    setFfac({ nombre: '', univId: '' });
    mostrarExito('Facultad creada exitosamente');
  }

  function submitCrit(e) {
    e.preventDefault();
    if (!fCrit.nombre || !fCrit.univId || !fCrit.facId) return;
    agregarCriterio(Number(fCrit.univId), Number(fCrit.facId), { nombre: fCrit.nombre, requiere_firma: fCrit.requiere_firma });
    setFCrit({ nombre: '', univId: '', facId: '', requiere_firma: true });
    mostrarExito('Criterio creado exitosamente');
  }

  function submitAct(e) {
    e.preventDefault();
    if (!fAct.nombre || !fAct.univId || !fAct.facId || !fAct.critId) return;
    agregarActividad(Number(fAct.univId), Number(fAct.facId), Number(fAct.critId), {
      nombre: fAct.nombre,
      informacion_ayuda: fAct.informacion_ayuda,
      requiere_firma: fAct.requiere_firma,
    });
    setFAct({ nombre: '', univId: '', facId: '', critId: '', informacion_ayuda: '', requiere_firma: true });
    mostrarExito('Actividad creada exitosamente');
  }

  const TABS = [
    { id: 'universidad', label: 'Universidad', icon: Building2 },
    { id: 'facultad',    label: 'Facultad',    icon: BookOpen },
    { id: 'criterio',   label: 'Criterio',    icon: Microscope },
    { id: 'actividad',  label: 'Actividad',   icon: ClipboardList },
  ];

  const univSelFac = universidades.find(u => u.id === Number(fFac.univId));
  const univSelCrit = universidades.find(u => u.id === Number(fCrit.univId));
  const facSelCrit = univSelCrit?.facultades.find(f => f.id === Number(fCrit.facId));
  const univSelAct = universidades.find(u => u.id === Number(fAct.univId));
  const facSelAct = univSelAct?.facultades.find(f => f.id === Number(fAct.facId));
  const critSelAct = facSelAct?.criterios.find(c => c.id === Number(fAct.critId));

  return (
    <div className="p-6 space-y-5">
      {/* Mensaje de éxito */}
      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <Check size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-800">{exito}</span>
        </div>
      )}

      {/* Tabs */}
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
                    <div key={u.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{u.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">{u.siglas}</span>
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
                    <div key={f.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{f.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">· {u.siglas}</span>
                    </div>
                  )))}
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
                    <select value={fCrit.univId} onChange={e => setFCrit({...fCrit, univId: e.target.value, facId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fCrit.facId} onChange={e => setFCrit({...fCrit, facId: e.target.value})} className={selectCls} disabled={!fCrit.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelCrit?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
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
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.criterios.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
                      <span className="font-medium text-gray-800">{c.nombre}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.requiere_firma ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        {c.requiere_firma ? 'Con firma' : 'Sin firma'}
                      </span>
                    </div>
                  ))))}
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
                    <select value={fAct.univId} onChange={e => setFAct({...fAct, univId: e.target.value, facId: '', critId: ''})} className={selectCls}>
                      <option value="">Seleccionar...</option>
                      {universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Facultad">
                    <select value={fAct.facId} onChange={e => setFAct({...fAct, facId: e.target.value, critId: ''})} className={selectCls} disabled={!fAct.univId}>
                      <option value="">Seleccionar...</option>
                      {univSelAct?.facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Criterio">
                    <select value={fAct.critId} onChange={e => setFAct({...fAct, critId: e.target.value})} className={selectCls} disabled={!fAct.facId}>
                      <option value="">Seleccionar...</option>
                      {facSelAct?.criterios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nombre"><input value={fAct.nombre} onChange={e => setFAct({...fAct, nombre: e.target.value})} placeholder="Entregables 2026..." className={inputCls} /></FormField>
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
                  {universidades.flatMap(u => u.facultades.flatMap(f => f.criterios.flatMap(c => c.actividades.map(a => (
                    <div key={a.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800">{a.nombre}</span>
                      <span className="ml-2 text-gray-400 text-xs">· {c.nombre}</span>
                    </div>
                  )))))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
