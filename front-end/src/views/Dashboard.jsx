import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  UploadCloud, 
  FileSignature, 
  GraduationCap, 
  GitMerge, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { useApp } from '../context/useApp';
import Badge from '../components/common/Badge';

/**
 * Componente Link adaptado a la arquitectura de navegación de la aplicación (App.jsx / AppContext).
 * Proporciona el comportamiento de enlace navegable hacia las vistas principales del sistema.
 */
function Link({ to, params, onClick, children, className, ...props }) {
  const { navegarA } = useApp();

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) onClick(e);
    const vista = typeof to === 'string' ? to.replace(/^\//, '') : to;
    navegarA(vista, params);
  };

  return (
    <a
      href={`#/${to}`}
      onClick={handleClick}
      className={`block text-left group ${className || ''}`}
      {...props}
    >
      {children}
    </a>
  );
}

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
  const { metricas, auditoria, alertas, setDocumentoSeleccionado, setModalFirmaAbierto } = useApp();

  const handleDocumentClick = (doc) => {
    if (doc) {
      setDocumentoSeleccionado(doc);
      setModalFirmaAbierto(true);
    }
  };

  const accesosRapidos = [
    {
      titulo: 'Subir Documento',
      descripcion: 'Cargar evidencias o nuevos documentos PDF en la estructura institucional.',
      ruta: 'explorador',
      params: null,
      icon: UploadCloud,
      colorIcon: 'text-blue-600',
      colorBg: 'bg-blue-50',
      colorHoverBorder: 'hover:border-blue-500',
      badge: null,
    },
    {
      titulo: 'Mis Firmas Pendientes',
      descripcion: 'Bandeja de documentos por firmar con certificado digital PAdES-BES.',
      ruta: 'explorador',
      params: null,
      icon: FileSignature,
      colorIcon: 'text-amber-600',
      colorBg: 'bg-amber-50',
      colorHoverBorder: 'hover:border-amber-500',
      badge: metricas?.pendientesFirma > 0 ? `${metricas.pendientesFirma} pendientes` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      titulo: 'Gestión de Docentes',
      descripcion: 'Administrar usuarios, roles docentes y asignaciones a facultades.',
      ruta: 'usuarios',
      params: null,
      icon: GraduationCap,
      colorIcon: 'text-purple-600',
      colorBg: 'bg-purple-50',
      colorHoverBorder: 'hover:border-purple-500',
      badge: null,
    },
    {
      titulo: 'Configurar Flujos',
      descripcion: 'Parametrizar los circuitos y secuencia de aprobación de firmas.',
      ruta: 'parametrizacion',
      params: { tab: 'flujos' },
      icon: GitMerge,
      colorIcon: 'text-indigo-600',
      colorBg: 'bg-indigo-50',
      colorHoverBorder: 'hover:border-indigo-500',
      badge: null,
    },
  ];

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
        {/* Panel de Accesos Rápidos */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                <Zap size={16} className="text-amber-500" />
                <span>Accesos Rápidos</span>
              </h2>
              <span className="text-xs text-gray-400 font-normal">Acciones y módulos principales</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accesosRapidos.map((acc, index) => {
                const Icon = acc.icon;
                return (
                  <Link
                    key={index}
                    to={acc.ruta}
                    params={acc.params}
                    className={`p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md ${acc.colorHoverBorder} transition-all duration-200 relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 ${acc.colorBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                        <Icon size={20} className={acc.colorIcon} />
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {acc.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acc.badgeColor}`}>
                            {acc.badge}
                          </span>
                        )}
                        <ArrowRight size={15} className="text-gray-300 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-sm font-semibold text-gray-800 group-hover:text-navy-900 transition-colors">
                        {acc.titulo}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {acc.descripcion}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center space-x-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span>Alertas Urgentes</span>
          </h2>
          <div className="space-y-3">
            {(!alertas || alertas.length === 0) ? (
              <p className="text-xs text-gray-400 py-6 text-center">No hay alertas urgentes pendientes</p>
            ) : (
              alertas.map(a => (
                <div 
                  key={a.id} 
                  className={`pl-3 py-2 pr-2 rounded-lg border-l-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ${
                    a.urgencia === 'alta' ? 'border-red-400' :
                    a.urgencia === 'media' ? 'border-yellow-400' : 'border-gray-300'
                  }`}
                  onClick={() => handleDocumentClick(a.documentoRef)}
                >
                  <p className="text-xs font-semibold text-gray-800 truncate">{a.documento}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.mensaje}</p>
                </div>
              ))
            )}
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
              {(!auditoria || auditoria.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-xs text-gray-400">
                    Sin actividades recientes registradas
                  </td>
                </tr>
              ) : (
                auditoria.slice(0, 5).map(a => (
                  <tr 
                    key={a.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleDocumentClick(a.documentoRef)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">{a.usuario}</td>
                    <td className="px-5 py-3"><Badge tipo={a.tipo} /></td>
                    <td className="px-5 py-3 text-gray-600">{a.descripcion}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{a.fecha}</td>
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
