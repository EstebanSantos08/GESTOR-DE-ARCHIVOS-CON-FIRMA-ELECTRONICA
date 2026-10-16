import React, { useState } from 'react';
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
  ArrowRight,
  Trash2
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
    <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center space-x-3.5">
      <div className={`w-10 h-10 ${colorBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={19} className={colorIcon} />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{titulo}</p>
        <p className={`text-xl font-bold leading-tight ${colorNum}`}>{valor}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { metricas, auditoria, alertas, setDocumentoSeleccionado, setModalFirmaAbierto, purgarDocumentos, usuario } = useApp();
  const [purgando, setPurgando] = useState(false);
  const esAdmin = usuario?.roles?.includes('ADMINISTRADOR') || usuario?.roles?.some(r => r === 'ADMINISTRADOR' || r?.nombre === 'ADMINISTRADOR');

  const handleDocumentClick = (doc) => {
    if (doc) {
      setDocumentoSeleccionado(doc);
      setModalFirmaAbierto(true);
    }
  };

  const handlePurgar = async () => {
    if (!window.confirm('¿Deseas eliminar permanentemente todos los documentos de prueba y reiniciar el contador a 0?')) return;
    setPurgando(true);
    try {
      await purgarDocumentos();
    } catch (err) {
      alert(err.message || 'Error al purgar documentos');
    } finally {
      setPurgando(false);
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
    <div className="p-4 sm:p-5 space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricaCard titulo="Total Documentos"       valor={metricas.total}          icon={FileText}    colorBg="bg-blue-50"   colorIcon="text-blue-600"   colorNum="text-blue-700" />
        <MetricaCard titulo="Pendientes de Firma"    valor={metricas.pendientesFirma} icon={Clock}       colorBg="bg-yellow-50" colorIcon="text-yellow-600" colorNum="text-yellow-700" />
        <MetricaCard titulo="Firmados Exitosamente"  valor={metricas.firmados}        icon={CheckCircle} colorBg="bg-green-50"  colorIcon="text-green-600"  colorNum="text-green-700" />
        <MetricaCard titulo="Rechazados"             valor={metricas.rechazados}      icon={XCircle}     colorBg="bg-red-50"    colorIcon="text-red-600"    colorNum="text-red-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel de Accesos Rápidos */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                <Zap size={16} className="text-amber-500" />
                <span>Accesos Rápidos</span>
              </h2>
              <span className="text-xs text-gray-400 font-normal">Acciones y módulos principales</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accesosRapidos.map((acc, index) => {
                const Icon = acc.icon;
                return (
                  <Link
                    key={index}
                    to={acc.ruta}
                    params={acc.params}
                    className={`p-3 rounded-xl border border-gray-100 bg-white hover:shadow-md ${acc.colorHoverBorder} transition-all duration-200 relative overflow-hidden`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${acc.colorBg} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                        <Icon size={16} className={acc.colorIcon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-gray-800 group-hover:text-navy-900 transition-colors truncate">
                            {acc.titulo}
                          </h3>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-1.5">
                            {acc.badge && (
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${acc.badgeColor}`}>
                                {acc.badge}
                              </span>
                            )}
                            <ArrowRight size={13} className="text-gray-300 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all duration-200" />
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {acc.descripcion}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <span>Alertas Urgentes</span>
            </h2>
            {esAdmin && (
              <button
                type="button"
                onClick={handlePurgar}
                disabled={purgando}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                title="Eliminar permanentemente todos los documentos de prueba y reiniciar contadores"
              >
                <Trash2 size={12} className={purgando ? 'animate-spin' : ''} />
                <span>{purgando ? 'Purgando...' : 'Limpiar pruebas'}</span>
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {(!alertas || alertas.length === 0) ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay alertas urgentes pendientes</p>
            ) : (
              alertas.map(a => (
                <div 
                  key={a.id} 
                  className={`pl-2.5 py-1.5 pr-2 rounded-lg border-l-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ${
                    a.urgencia === 'alta' ? 'border-red-400' :
                    a.urgencia === 'media' ? 'border-yellow-400' : 'border-gray-300'
                  }`}
                  onClick={() => handleDocumentClick(a.documentoRef)}
                >
                  <p className="text-xs font-semibold text-gray-800 truncate">{a.documento}</p>
                  <p className="text-[11px] text-gray-500 truncate">{a.mensaje}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actividades recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy-900">Actividades Recientes</h2>
        </div>
        <div className="max-h-52 overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Usuario</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Acción</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Descripción</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(!auditoria || auditoria.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-xs text-gray-400">
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
                    <td className="px-4 py-2 font-medium text-gray-800">{a.usuario}</td>
                    <td className="px-4 py-2"><Badge tipo={a.tipo} /></td>
                    <td className="px-4 py-2 text-gray-600">{a.descripcion}</td>
                    <td className="px-4 py-2 text-gray-400 text-[11px]">{a.fecha}</td>
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
