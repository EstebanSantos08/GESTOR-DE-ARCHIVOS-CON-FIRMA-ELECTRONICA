import React from 'react';
import Sidebar from './Sidebar';
import Dashboard from '../../views/Dashboard';
import ExploradorDeArchivos from '../../views/ExploradorDeArchivos';
import HistorialAuditoria from '../../views/HistorialAuditoria';
import ParametrizacionAdmin from '../../views/ParametrizacionAdmin';
import PerfilCertificado from '../../views/PerfilCertificado';
import PanelLateralAuditoria from '../../views/PanelLateralAuditoria';
import { useApp } from '../../context/useApp';

const VISTAS = {
  dashboard:       { componente: Dashboard,           titulo: 'Dashboard Analítico' },
  explorador:      { componente: ExploradorDeArchivos, titulo: 'Explorador de Archivos' },
  auditoria:       { componente: HistorialAuditoria,   titulo: 'Historial de Auditoría' },
  parametrizacion: { componente: ParametrizacionAdmin, titulo: 'Parametrización' },
  perfil:          { componente: PerfilCertificado,    titulo: 'Mi Perfil y Certificado' },
};

export default function Layout() {
  const { vistaActual, usuario, documentoSeleccionado } = useApp();
  const vista = VISTAS[vistaActual] || VISTAS.dashboard;
  const Componente = vista.componente;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-lg font-semibold text-navy-900">{vista.titulo}</h1>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{usuario.nombre}</p>
              <p className="text-xs text-gray-500">{usuario.email}</p>
            </div>
            <div className="w-9 h-9 bg-navy-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{usuario.avatar}</span>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          <Componente />
        </main>
      </div>

      {/* Panel lateral */}
      {documentoSeleccionado && <PanelLateralAuditoria />}
    </div>
  );
}

