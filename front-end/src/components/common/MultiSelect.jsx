import React, { useState, useMemo } from 'react';
import { Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Componente MultiSelect reutilizable para selección múltiple con buscador,
 * checkboxes dinámicos y chips de elementos seleccionados.
 *
 * @param {string} label              - Etiqueta del campo
 * @param {Array} options             - Arreglo de opciones [{ id: number|string, nombre: string, descripcion?: string }]
 * @param {Array} selectedIds         - Arreglo de IDs seleccionados [1, 2, 3]
 * @param {function} onChange         - Callback con el nuevo arreglo de IDs (selectedIds) => void
 * @param {string} placeholder        - Texto guía en el buscador
 * @param {string} badgeColor         - Clases de Tailwind para el chip (color)
 * @param {boolean} disabled          - Si está deshabilitado
 * @param {string} emptyText          - Mensaje cuando no hay opciones disponibles
 */
export default function MultiSelect({
  label,
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Buscar...',
  badgeColor = 'bg-navy-50 text-navy-800 border-navy-200',
  disabled = false,
  emptyText = 'No hay opciones disponibles',
}) {
  const [busqueda, setBusqueda] = useState('');
  const [desplegado, setDesplegado] = useState(true);

  // Filtrar opciones por búsqueda
  const opcionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return options;
    const q = busqueda.toLowerCase();
    return options.filter(opt =>
      (opt.nombre || '').toLowerCase().includes(q) ||
      (opt.descripcion || '').toLowerCase().includes(q)
    );
  }, [options, busqueda]);

  // Manejar selección / deselección individual
  const toggleOption = (id) => {
    if (disabled) return;
    const numId = Number(id);
    const yaSeleccionado = selectedIds.includes(numId);
    const nuevosIds = yaSeleccionado
      ? selectedIds.filter(item => item !== numId)
      : [...selectedIds, numId];
    onChange(nuevosIds);
  };

  // Seleccionar todas las opciones visibles
  const handleSelectAll = () => {
    if (disabled) return;
    const idsVisibles = opcionesFiltradas.map(o => Number(o.id));
    const conjunto = new Set([...selectedIds, ...idsVisibles]);
    onChange(Array.from(conjunto));
  };

  // Limpiar todas las seleccionadas
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Remover un item específico desde el badge
  const handleRemoveChip = (e, id) => {
    e.stopPropagation();
    if (disabled) return;
    const numId = Number(id);
    onChange(selectedIds.filter(item => item !== numId));
  };

  const selectedOptions = useMemo(() => {
    return options.filter(o => selectedIds.includes(Number(o.id)));
  }, [options, selectedIds]);

  return (
    <div className="space-y-1.5">
      {/* Cabecera del selector */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
          {label}
          <span className="text-gray-400 font-normal ml-1">
            ({selectedIds.length} seleccionad{selectedIds.length === 1 ? 'o' : 'os'})
          </span>
        </label>
        <div className="flex items-center space-x-2 text-xs">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled}
              className="text-red-500 hover:text-red-700 hover:underline transition-colors"
            >
              Limpiar
            </button>
          )}
          {opcionesFiltradas.length > 0 && selectedIds.length < options.length && (
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={disabled}
              className="text-navy-600 hover:text-navy-800 hover:underline transition-colors"
            >
              Seleccionar todos
            </button>
          )}
          <button
            type="button"
            onClick={() => setDesplegado(prev => !prev)}
            className="text-gray-400 hover:text-gray-600 ml-1 p-0.5 rounded"
            title={desplegado ? 'Colapsar lista' : 'Expandir lista'}
          >
            {desplegado ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Chips de elementos seleccionados (Preview interactivo) */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg max-h-24 overflow-y-auto">
          {selectedOptions.map(opt => (
            <span
              key={opt.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs transition-colors ${badgeColor}`}
            >
              <span>{opt.nombre}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveChip(e, opt.id)}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors focus:outline-none"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Panel colapsable de lista con buscador */}
      {desplegado && (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs">
          {/* Buscador */}
          <div className="relative border-b border-gray-100 p-2 bg-gray-50/50">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              disabled={disabled}
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista de Checkboxes Dinámicos */}
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-1 divide-y divide-gray-50">
            {opcionesFiltradas.length > 0 ? (
              opcionesFiltradas.map(opt => {
                const checked = selectedIds.includes(Number(opt.id));
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start space-x-3 p-2 rounded-md cursor-pointer transition-colors text-xs select-none
                      ${checked ? 'bg-navy-50/60 font-medium text-navy-950' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(opt.id)}
                        disabled={disabled}
                        className="rounded border-gray-300 text-navy-600 focus:ring-navy-500 w-3.5 h-3.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{opt.nombre}</span>
                        {checked && <Check size={12} className="text-navy-600 flex-shrink-0 ml-1" />}
                      </div>
                      {opt.descripcion && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{opt.descripcion}</p>
                      )}
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-gray-400">
                {busqueda ? 'No se encontraron resultados' : emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
