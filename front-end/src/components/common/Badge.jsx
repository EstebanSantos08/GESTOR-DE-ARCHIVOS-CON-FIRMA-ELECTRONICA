import React from 'react';

const ESTADO_CONFIG = {
  COMPLETADO:       { label: 'Completado',          cls: 'bg-green-100 text-green-800 border-green-200' },
  FIRMADO_DECANO:   { label: 'Firmado Decano',      cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  FIRMADO_SUBDECANO:{ label: 'Firmado Subdecano',   cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  FIRMADO_DIRECTOR: { label: 'Firmado Director',    cls: 'bg-teal-100 text-teal-800 border-teal-200' },
  PENDIENTE:        { label: 'Pendiente',           cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  RECHAZADO:        { label: 'Rechazado',           cls: 'bg-red-100 text-red-800 border-red-200' },
  CARGA:         { label: 'Carga',          cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  FIRMA:         { label: 'Firma',          cls: 'bg-green-100 text-green-800 border-green-200' },
  RECHAZO:       { label: 'Rechazo',        cls: 'bg-red-100 text-red-800 border-red-200' },
  CREACION:      { label: 'Creación',       cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  RECTOR:        { label: 'Rector',         cls: 'bg-navy-100 text-navy-900 border-navy-200' },
  DECANO:        { label: 'Decano',         cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  DOCENTE:       { label: 'Docente',        cls: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export default function Badge({ tipo, className = '' }) {
  const config = ESTADO_CONFIG[tipo] || { label: tipo, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.cls} ${className}`}>
      {config.label}
    </span>
  );
}
