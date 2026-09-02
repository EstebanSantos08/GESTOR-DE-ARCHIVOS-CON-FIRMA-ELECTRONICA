import React, { useState, useEffect } from 'react';
import { X, User, Building2, ClipboardList, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import { useApp } from '../../context/useApp';

/**
 * PasoFirmaItem: Componente para configurar un paso individual de un Flujo de Firma
 * con filtros inteligentes por Facultad y Actividad para seleccionar firmantes elegibles.
 *
 * @param {number} index        - Índice del paso (0-based)
 * @param {object} paso         - Objeto de configuración { orden, rol_id, usuario_id, facultad_id, actividad_id }
 * @param {function} onChange   - Callback al actualizar el paso (nuevoPaso) => void
 * @param {function} onRemove   - Callback para eliminar el paso () => void
 * @param {Array} facultades    - Lista de facultades [{ id, nombre }]
 * @param {Array} actividades   - Lista de actividades [{ id, nombre }]
 * @param {Array} roles         - Lista de roles [{ id, nombre }]
 */
export default function PasoFirmaItem({
  index,
  paso = {},
  onChange,
  onRemove,
  facultades = [],
  actividades = [],
  roles = [],
}) {
  const { listarDocentesElegibles } = useApp();

  const [candidatos, setCandidatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCandidatos, setErrorCandidatos] = useState('');

  // Efecto: Cargar firmantes candidatos cuando cambian los filtros
  useEffect(() => {
    let cancelado = false;

    async function buscarCandidatos() {
      setCargando(true);
      setErrorCandidatos('');
      try {
        const resultado = await listarDocentesElegibles({
          facultadId: paso.facultad_id || undefined,
          actividadId: paso.actividad_id || undefined,
          rol: paso.rol_id || undefined,
        });

        if (!cancelado) {
          setCandidatos(Array.isArray(resultado) ? resultado : []);
        }
      } catch (err) {
        if (!cancelado) {
          setErrorCandidatos('Error al cargar candidatos');
          setCandidatos([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    buscarCandidatos();
    return () => { cancelado = true; };
  }, [paso.facultad_id, paso.actividad_id, paso.rol_id]);

  // Manejar cambio en filtros
  const handleFiltroChange = (campo, valor) => {
    const nuevoValor = valor ? Number(valor) : null;
    const nuevoPaso = {
      ...paso,
      [campo]: nuevoValor,
      // Si el docente seleccionado actualmente ya no coincide, se puede mantener o reevaluar
    };
    onChange(nuevoPaso);
  };

  // Manejar selección de firmante
  const handleFirmanteChange = (usuarioIdStr) => {
    const usuarioId = usuarioIdStr ? Number(usuarioIdStr) : null;
    const seleccionado = candidatos.find(c => Number(c.id) === usuarioId);

    const nuevoPaso = {
      ...paso,
      usuario_id: usuarioId,
      // Si el docente tiene rol asociado, sincronizamos rol_id
      rol_id: seleccionado?.roles?.[0]?.id || paso.rol_id || null,
    };

    onChange(nuevoPaso);
  };

  const docenteSeleccionado = candidatos.find(c => Number(c.id) === Number(paso.usuario_id));

  return (
    <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3 transition-all hover:border-gray-300">
      {/* Cabecera del Paso */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-navy-900">
            Paso {index + 1} de Firma
          </span>
          {docenteSeleccionado && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 size={11} />
              <span>Asignado</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
          title="Eliminar este paso"
        >
          <X size={14} />
        </button>
      </div>

      {/* Selectores de Filtro inteligentes encima del selector de firmante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Filtro por Facultad */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <Building2 size={12} className="text-blue-500" />
            <span>Filtrar por Facultad</span>
          </label>
          <select
            value={paso.facultad_id || ''}
            onChange={e => handleFiltroChange('facultad_id', e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50/70 focus:bg-white focus:ring-1 focus:ring-navy-500"
          >
            <option value="">-- Todas las Facultades --</option>
            {facultades.map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Actividad */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <ClipboardList size={12} className="text-emerald-500" />
            <span>Filtrar por Actividad</span>
          </label>
          <select
            value={paso.actividad_id || ''}
            onChange={e => handleFiltroChange('actividad_id', e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50/70 focus:bg-white focus:ring-1 focus:ring-navy-500"
          >
            <option value="">-- Todas las Actividades --</option>
            {actividades.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selector del Firmante */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold text-navy-900 flex items-center gap-1">
            <User size={12} className="text-navy-700" />
            <span>Firmante / Docente Asignado</span>
            <span className="text-red-500">*</span>
          </label>
          {cargando ? (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-navy-600" />
              <span>Buscando candidatos...</span>
            </span>
          ) : (
            <span className="text-[10px] text-navy-700 font-medium bg-navy-50 px-1.5 py-0.5 rounded">
              {candidatos.length} docente{candidatos.length === 1 ? '' : 's'} elegible{candidatos.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <select
          value={paso.usuario_id || ''}
          onChange={e => handleFirmanteChange(e.target.value)}
          disabled={cargando}
          className={`w-full text-xs border rounded-lg p-2 transition-all ${
            paso.usuario_id
              ? 'border-navy-500 bg-white font-medium text-navy-950 shadow-xs'
              : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          <option value="">-- Seleccione el Firmante --</option>
          {candidatos.map(u => (
            <option key={u.id} value={u.id}>
              {u.nombre} ({u.email}) {u.roles?.[0]?.nombre ? `— [${u.roles[0].nombre}]` : ''}
            </option>
          ))}
        </select>

        {errorCandidatos && (
          <p className="text-[11px] text-red-500 mt-1">{errorCandidatos}</p>
        )}

        {/* Fallback opcional a Rol genérico si no se asigna un docente específico */}
        {!paso.usuario_id && roles.length > 0 && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-[11px] text-gray-400 font-normal">O asignar por rol general:</span>
            <select
              value={paso.rol_id || ''}
              onChange={e => handleFiltroChange('rol_id', e.target.value)}
              className="text-xs border border-gray-200 rounded p-1 bg-white text-gray-600"
            >
              <option value="">-- Rol predeterminado --</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
