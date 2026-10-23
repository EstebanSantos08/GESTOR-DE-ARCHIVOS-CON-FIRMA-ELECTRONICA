import React, { useState, useEffect } from 'react';
import { X, User, Building2, GraduationCap, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/useApp';

// Jerarquía oficial del flujo: 1=DOCENTE, 2=RESP_AREA, 3=DIRECTOR_CARRERA, 4=SUBDECANO, 5=DECANO, 6=RECTOR, 7=ADMINISTRADOR
const JERARQUIA_ROLES = {
  DOCENTE: 1,
  RESPONSABLE_AREA: 2,
  RESP_AREA: 2,
  DIRECTOR_CARRERA: 3,
  SUBDECANO: 4,
  DECANO: 5,
  RECTOR: 6,
  ADMINISTRADOR: 7,
};

function obtenerRolMasAlto(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const ordenados = [...roles].sort((a, b) => {
    const nivelA = JERARQUIA_ROLES[(a?.nombre || '').toUpperCase()] ?? a?.nivel ?? 0;
    const nivelB = JERARQUIA_ROLES[(b?.nombre || '').toUpperCase()] ?? b?.nivel ?? 0;
    return nivelB - nivelA;
  });
  return ordenados[0] || null;
}

/**
 * PasoFirmaItem: Componente para configurar un paso individual de un Flujo de Firma
 * con filtros inteligentes por Facultad y Carrera para seleccionar firmantes elegibles.
 */
export default function PasoFirmaItem({
  index,
  paso = {},
  onChange,
  onRemove,
  facultades = [],
  roles = [],
}) {
  const { listarDocentesElegibles, universidades } = useApp();

  const [candidatos, setCandidatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCandidatos, setErrorCandidatos] = useState('');

  // Facultades y Carreras activas obtenidas de la estructura actual
  const facultadesActivas = (universidades || []).length > 0
    ? (universidades || []).flatMap(u => u.facultades || [])
    : facultades;

  const carrerasActivas = (universidades || []).flatMap(u =>
    (u.facultades || [])
      .filter(f => !paso.facultad_id || Number(f.id) === Number(paso.facultad_id))
      .flatMap(f => f.carreras || [])
  );

  // Efecto: Cargar firmantes candidatos cuando cambian los filtros
  useEffect(() => {
    let cancelado = false;

    async function buscarCandidatos() {
      setCargando(true);
      setErrorCandidatos('');
      try {
        const resultado = await listarDocentesElegibles({
          facultadId: paso.facultad_id || undefined,
          carreraId: paso.carrera_id || undefined,
          rol: paso.rol_id || undefined,
        });

        if (!cancelado) {
          setCandidatos(Array.isArray(resultado) ? resultado : []);
        }
      } catch {
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
  }, [paso.facultad_id, paso.carrera_id, paso.rol_id]);

  // Manejar cambio en filtros
  const handleFiltroChange = (campo, valor) => {
    const nuevoValor = valor ? Number(valor) : null;
    const nuevoPaso = {
      ...paso,
      [campo]: nuevoValor,
      ...(campo === 'facultad_id' ? { carrera_id: null } : {}),
    };
    onChange(nuevoPaso);
  };

  // Manejar selección de firmante
  const handleFirmanteChange = (usuarioIdStr) => {
    const usuarioId = usuarioIdStr ? Number(usuarioIdStr) : null;
    const seleccionado = candidatos.find(c => Number(c.id) === usuarioId);
    const rolMasAlto = obtenerRolMasAlto(seleccionado?.roles);

    const nuevoPaso = {
      ...paso,
      usuario_id: usuarioId,
      // Si el docente tiene rol asociado, sincronizamos rol_id con su rol de mayor jerarquía
      rol_id: rolMasAlto?.id || paso.rol_id || null,
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
            {facultadesActivas.map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Carrera */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <GraduationCap size={12} className="text-indigo-500" />
            <span>Filtrar por Carrera</span>
          </label>
          <select
            value={paso.carrera_id || ''}
            onChange={e => handleFiltroChange('carrera_id', e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50/70 focus:bg-white focus:ring-1 focus:ring-navy-500"
          >
            <option value="">-- Todas las Carreras --</option>
            {carrerasActivas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
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
          {candidatos.map(u => {
            const rolMasAlto = obtenerRolMasAlto(u.roles);
            return (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email}) {rolMasAlto?.nombre ? `— [${rolMasAlto.nombre}]` : ''}
              </option>
            );
          })}
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
