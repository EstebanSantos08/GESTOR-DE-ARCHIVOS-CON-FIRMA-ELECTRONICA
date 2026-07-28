import React from 'react';
import { LayoutDashboard, FolderOpen, ClipboardList, Settings, User, Shield, LogOut, Users } from 'lucide-react';
import { useApp } from '../../context/useApp';

// Todos los roles ven Dashboard, Explorador y Perfil.
// ADMINISTRADOR gestiona Usuarios y Configuración (parametrización).
// Los firmantes (DIRECTOR_CARRERA hacia arriba) ven Auditoría.
const TODOS = ['ADMINISTRADOR', 'RECTOR', 'DECANO', 'SUBDECANO', 'DIRECTOR_CARRERA', 'RESPONSABLE_AREA', 'DOCENTE'];
const FIRMANTES = ['RECTOR', 'DECANO', 'SUBDECANO', 'DIRECTOR_CARRERA'];

const NAV_ITEMS = [
  { id: 'dashboard',       label: 'Dashboard',     icon: LayoutDashboard, roles: TODOS },
  { id: 'explorador',      label: 'Explorador',    icon: FolderOpen,       roles: TODOS },
  { id: 'auditoria',       label: 'Auditoría',     icon: ClipboardList,    roles: ['ADMINISTRADOR', ...FIRMANTES] },
  { id: 'usuarios',        label: 'Usuarios',      icon: Users,            roles: ['ADMINISTRADOR'] },
  { id: 'parametrizacion', label: 'Configuración', icon: Settings,         roles: ['ADMINISTRADOR'] },
  { id: 'perfil',          label: 'Mi Perfil',     icon: User,             roles: TODOS },
];

const ROL_COLOR = {
  ADMINISTRADOR:    'bg-red-500',
  RECTOR:           'bg-purple-500',
  DECANO:           'bg-blue-500',
  SUBDECANO:        'bg-indigo-500',
  DIRECTOR_CARRERA: 'bg-cyan-500',
  RESPONSABLE_AREA: 'bg-amber-500',
  DOCENTE:          'bg-green-500',
};

const ROL_LABEL = {
  ADMINISTRADOR:    'Administrador',
  RECTOR:           'Rector',
  DECANO:           'Decano',
  SUBDECANO:        'Subdecano',
  DIRECTOR_CARRERA: 'Director Carrera',
  RESPONSABLE_AREA: 'Resp. Área',
  DOCENTE:          'Docente',
};

export default function Sidebar() {
  const { vistaActual, navegarA, usuario, logout } = useApp();
  const rol = usuario?.rol || '';
  const itemsVisibles = NAV_ITEMS.filter(i => i.roles.includes(rol));

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-900 flex flex-col z-40 shadow-xl">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">GestDoc</p>
            <p className="text-blue-300 text-xs">Firma Digital</p>
          </div>
        </div>
      </div>

      {/* Nav filtrado por rol */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {itemsVisibles.map(({ id, label, icon: Icon }) => {
          const activo = vistaActual === id;
          return (
            <button
              key={id}
              onClick={() => navegarA(id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activo
                  ? 'bg-white/10 text-white border-l-2 border-blue-400 pl-[10px]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} className={activo ? 'text-blue-300' : ''} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 ${ROL_COLOR[rol] || 'bg-blue-600'} rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-xs font-bold">{usuario?.avatar}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{usuario?.nombre}</p>
            <p className="text-blue-300 text-xs">{ROL_LABEL[rol] || rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-red-500/20 transition-colors border border-white/10 hover:border-red-400/30"
        >
          <LogOut size={14} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}


