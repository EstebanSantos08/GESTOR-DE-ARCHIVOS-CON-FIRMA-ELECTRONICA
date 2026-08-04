import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/useApp';

const TIPOS = ['Todos', 'CARGA', 'FIRMA', 'RECHAZO', 'CREACION'];

export default function HistorialAuditoria() {
  const { auditoria } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const registros = auditoria
    .filter(r => filtroTipo === 'Todos' || r.tipo === filtroTipo)
    .filter(r => {
      const q = busqueda.toLowerCase();
      return !q || r.usuario.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q) || r.hash.toLowerCase().includes(q);
    });

  return (
    <div className="p-6 space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, descripción o hash..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-gray-400" />
          <div className="flex space-x-1">
            {TIPOS.map(t => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filtroTipo === t
                    ? 'bg-navy-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-900">Registro de Auditoría</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{registros.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acción</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha / Hora</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                registros.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{r.usuario}</td>
                    <td className="px-5 py-3"><Badge tipo={r.tipo} /></td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{r.descripcion}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{r.fecha}</td>
                    <td className="px-5 py-3">
                      <span
                        title={r.hash || 'Sin hash'}
                        className="font-mono text-xs text-gray-500 bg-gray-50 rounded px-2 py-0.5 border border-gray-100 cursor-help"
                      >
                        {r.hash ? `${r.hash.substring(0, 16)}…` : 'Sin hash'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

