import React from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Badge from '../components/common/Badge';

function MetricaCard({ titulo, valor, icon: Icon, colorIcon, colorBg, colorNum }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`w-12 h-12 ${colorBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={colorIcon} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{titulo}</p>
        <p className={`text-2xl font-bold ${colorNum}`}>{valor}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { metricas, universidades, auditoria, alertas } = useApp();

  // Calcular datos para gráfico por criterio
  const criteriosData = universidades.flatMap(u =>
    u.facultades.flatMap(f =>
      f.criterios.map(c => {
        const docs = c.actividades.flatMap(a => a.documentos);
        return {
          nombre: c.nombre,
          total: docs.length,
          completados: docs.filter(d => d.estado === 'COMPLETADO').length,
        };
      })
    )
  ).filter(c => c.total > 0);

  const maxTotal = Math.max(...criteriosData.map(c => c.total), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricaCard titulo="Total Documentos"       valor={metricas.total}          icon={FileText}    colorBg="bg-blue-50"   colorIcon="text-blue-600"   colorNum="text-blue-700" />
        <MetricaCard titulo="Pendientes de Firma"    valor={metricas.pendientesFirma} icon={Clock}       colorBg="bg-yellow-50" colorIcon="text-yellow-600" colorNum="text-yellow-700" />
        <MetricaCard titulo="Firmados Exitosamente"  valor={metricas.firmados}        icon={CheckCircle} colorBg="bg-green-50"  colorIcon="text-green-600"  colorNum="text-green-700" />
        <MetricaCard titulo="Rechazados"             valor={metricas.rechazados}      icon={XCircle}     colorBg="bg-red-50"    colorIcon="text-red-600"    colorNum="text-red-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico por criterio */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center space-x-2">
            <Activity size={16} className="text-navy-700" />
            <span>Avance de Firmas por Criterio</span>
          </h2>
          <div className="space-y-4">
            {criteriosData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
            ) : (
              criteriosData.map((c, i) => {
                const pct = c.total > 0 ? Math.round((c.completados / c.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 truncate max-w-xs">{c.nombre}</span>
                      <span className="text-gray-400 ml-2">{c.completados}/{c.total} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-700 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center space-x-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span>Alertas Urgentes</span>
          </h2>
          <div className="space-y-3">
            {alertas.map(a => (
              <div key={a.id} className={`pl-3 py-2 pr-2 rounded-lg border-l-4 bg-gray-50 ${
                a.urgencia === 'alta' ? 'border-red-400' :
                a.urgencia === 'media' ? 'border-yellow-400' : 'border-gray-300'
              }`}>
                <p className="text-xs font-semibold text-gray-800 truncate">{a.documento}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.mensaje}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividades recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-900">Actividades Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditoria.slice(0, 5).map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{a.usuario}</td>
                  <td className="px-5 py-3"><Badge tipo={a.tipo} /></td>
                  <td className="px-5 py-3 text-gray-600">{a.descripcion}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{a.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
