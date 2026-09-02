import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Lock, RefreshCw, AlertCircle, Check, Building2, ClipboardList, Shield, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import MultiSelect from '../common/MultiSelect';

/**
 * ModalDocenteForm: Formulario modal para Creación (POST) y Edición (PUT) de Docentes / Usuarios
 * con soporte para asignación Muchos a Muchos (N:M) de Facultades, Carreras y Actividades.
 *
 * @param {boolean} isOpen         - Controla la visibilidad del modal
 * @param {function} onClose       - Función para cerrar el modal
 * @param {object|null} docente    - Objeto docente a editar (null para creación)
 * @param {function} onSuccess     - Callback al completar la operación exitosamente
 */
export default function ModalDocenteForm({
  isOpen,
  onClose,
  docente = null,
  onSuccess,
}) {
  const {
    token,
    listarFacultadesCatalogo,
    listarActividadesCatalogo,
    listarCarreras,
    listarRoles,
    crearDocente,
    actualizarDocente,
  } = useApp();

  const esEdicion = Boolean(docente && docente.id);

  // ─── 1. Estado de Catálogos ────────────────────────────────────────────────
  const [catalogoFacultades, setCatalogoFacultades]   = useState([]);
  const [catalogoCarreras, setCatalogoCarreras]       = useState([]);
  const [catalogoActividades, setCatalogoActividades] = useState([]);
  const [catalogoRoles, setCatalogoRoles]             = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos]     = useState(false);
  const [errorCatalogos, setErrorCatalogos]           = useState('');

  // ─── 2. Estado del Formulario ──────────────────────────────────────────────
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    roles: [],
    facultades: [],  // Arreglo de IDs numéricos [1, 2]
    carreras: [],    // Arreglo de IDs numéricos [3, 4]
    actividades: [], // Arreglo de IDs numéricos [5, 6, 7]
  });

  const [guardando, setGuardando] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState('');
  const [exitoSubmit, setExitoSubmit] = useState(false);

  // ─── 3. Carga de Catálogos (Requerimiento 1) ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let cancelado = false;
    async function cargarCatalogos() {
      setCargandoCatalogos(true);
      setErrorCatalogos('');
      try {
        const [facs, carrs, acts, rls] = await Promise.all([
          listarFacultadesCatalogo ? listarFacultadesCatalogo() : Promise.resolve([]),
          listarCarreras ? listarCarreras() : Promise.resolve([]),
          listarActividadesCatalogo ? listarActividadesCatalogo() : Promise.resolve([]),
          listarRoles ? listarRoles() : Promise.resolve([]),
        ]);

        if (!cancelado) {
          setCatalogoFacultades(Array.isArray(facs) ? facs : []);
          setCatalogoCarreras(Array.isArray(carrs) ? carrs : []);
          setCatalogoActividades(Array.isArray(acts) ? acts : []);
          setCatalogoRoles(Array.isArray(rls) ? rls : []);
        }
      } catch (err) {
        if (!cancelado) {
          setErrorCatalogos('Error al cargar catálogos: ' + err.message);
        }
      } finally {
        if (!cancelado) setCargandoCatalogos(false);
      }
    }

    cargarCatalogos();
    return () => { cancelado = true; };
  }, [isOpen]);

  // ─── 4. Pre-población de Estado en Edición (Requerimiento 3 y 4) ───────────
  useEffect(() => {
    if (!isOpen) return;

    if (docente) {
      // Mapear arreglos de objetos que devuelve el GET a arrays de IDs
      const facultadesIds = Array.isArray(docente.facultades)
        ? docente.facultades.map(f => (typeof f === 'object' && f !== null ? Number(f.id) : Number(f)))
        : (docente.facultad_id ? [Number(docente.facultad_id)] : []);

      const carrerasIds = Array.isArray(docente.carreras)
        ? docente.carreras.map(c => (typeof c === 'object' && c !== null ? Number(c.id) : Number(c)))
        : (docente.carrera_id ? [Number(docente.carrera_id)] : []);

      const actividadesIds = Array.isArray(docente.actividades)
        ? docente.actividades.map(a => (typeof a === 'object' && a !== null ? Number(a.id) : Number(a)))
        : [];

      const rolesIds = Array.isArray(docente.roles)
        ? docente.roles.map(r => (typeof r === 'object' && r !== null ? Number(r.id) : Number(r)))
        : (docente.rol_id ? [Number(docente.rol_id)] : []);

      setFormData({
        nombre: docente.nombre || '',
        email: docente.email || '',
        password: '', // En edición no se pre-puebla password
        roles: rolesIds,
        facultades: facultadesIds,
        carreras: carrerasIds,
        actividades: actividadesIds,
      });
    } else {
      // Estado inicial vacío para creación
      setFormData({
        nombre: '',
        email: '',
        password: '',
        roles: [],
        facultades: [],
        carreras: [],
        actividades: [],
      });
    }

    setErrorSubmit('');
    setExitoSubmit(false);
  }, [docente, isOpen]);

  // ─── 5. Manejadores de Estado (Requerimiento 3) ────────────────────────────
  const handleChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleToggleRol = (rolId) => {
    const numId = Number(rolId);
    setFormData(prev => {
      const actuales = prev.roles || [];
      const nuevos = actuales.includes(numId)
        ? actuales.filter(id => id !== numId)
        : [...actuales, numId];
      return { ...prev, roles: nuevos };
    });
  };

  // ─── 6. Lógica de Envío POST/PUT (Requerimiento 4) ──────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorSubmit('');
    setExitoSubmit(false);

    if (!formData.nombre.trim()) {
      setErrorSubmit('El nombre completo es requerido.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorSubmit('El correo electrónico es requerido.');
      return;
    }
    if (!esEdicion && (!formData.password || formData.password.length < 8)) {
      setErrorSubmit('La contraseña es obligatoria y debe tener al menos 8 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      // Mapear explícitamente las opciones seleccionadas a arreglos de números (IDs)
      const payload = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        facultades: (formData.facultades || []).map(Number),
        carreras: (formData.carreras || []).map(Number),
        actividades: (formData.actividades || []).map(Number),
        roles: (formData.roles || []).map(Number),
      };

      if (!esEdicion && formData.password) {
        payload.password = formData.password;
      }

      let resultado;
      if (esEdicion) {
        resultado = await actualizarDocente(docente.id, payload);
      } else {
        resultado = await crearDocente(payload);
      }

      setExitoSubmit(true);
      if (onSuccess) onSuccess(resultado);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorSubmit(err.message || 'Error al guardar docente');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Fondo con backdrop blur */}
      <div
        className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs transition-opacity"
        onClick={guardando ? undefined : onClose}
      />

      {/* Contenedor Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                {esEdicion ? 'Editar Docente / Usuario' : 'Nuevo Docente / Usuario'}
              </h3>
              <p className="text-xs text-navy-200">
                {esEdicion
                  ? 'Modifica las facultades, carreras y actividades asignadas en relaciones N:M'
                  : 'Registra un docente y asígnale múltiples facultades, carreras y actividades'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificaciones */}
        {errorCatalogos && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorCatalogos}</span>
          </div>
        )}

        {errorSubmit && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorSubmit}</span>
          </div>
        )}

        {exitoSubmit && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-center space-x-2">
            <Check size={14} className="flex-shrink-0" />
            <span>{esEdicion ? 'Docente actualizado correctamente' : 'Docente creado con éxito'}</span>
          </div>
        )}

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {cargandoCatalogos ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500">
              <RefreshCw size={24} className="animate-spin text-navy-600" />
              <p className="text-xs">Cargando catálogos de facultades, carreras y actividades...</p>
            </div>
          ) : (
            <>
              {/* Sección Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Dr. Carlos Mendoza"
                      value={formData.nombre}
                      onChange={e => handleChange('nombre', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="docente@universidad.edu"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contraseña (solo creación o cambio opcional) */}
              {!esEdicion && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Contraseña Inicial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={e => handleChange('password', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>
              )}

              {/* Roles (Opcional si se dispone de catálogo) */}
              {catalogoRoles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5 flex items-center gap-1">
                    <Shield size={13} className="text-gray-400" />
                    <span>Roles del Sistema</span>
                  </label>
                  <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                    {catalogoRoles.map(r => {
                      const sel = (formData.roles || []).includes(Number(r.id));
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => handleToggleRol(r.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            sel
                              ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {sel && <Check size={12} />}
                          <span>{r.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <hr className="border-gray-100 my-2" />

              {/* ─── Selector Múltiple: Facultades (Requerimiento 2) ─── */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 mb-2">
                  <Building2 size={16} className="text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Facultades Asignadas (N:M)
                  </h4>
                </div>
                <MultiSelect
                  label="Seleccionar Facultades"
                  options={catalogoFacultades.map(f => ({
                    id: f.id,
                    nombre: f.nombre,
                    descripcion: f.universidad?.nombre || f.descripcion || '',
                  }))}
                  selectedIds={formData.facultades}
                  onChange={(nuevosIds) => handleChange('facultades', nuevosIds)}
                  placeholder="Buscar facultad por nombre..."
                  badgeColor="bg-blue-50 text-blue-800 border-blue-200"
                  emptyText="No hay facultades registradas en el sistema"
                />
              </div>

              {/* ─── Selector Múltiple: Carreras Asignadas (N:M) ─── */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 mb-2">
                  <GraduationCap size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Carreras Asignadas (N:M)
                  </h4>
                </div>
                <MultiSelect
                  label="Seleccionar Carreras"
                  options={catalogoCarreras.map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    descripcion: c.facultad?.nombre ? `Facultad: ${c.facultad.nombre}` : (c.descripcion || ''),
                  }))}
                  selectedIds={formData.carreras}
                  onChange={(nuevosIds) => handleChange('carreras', nuevosIds)}
                  placeholder="Buscar carrera por nombre..."
                  badgeColor="bg-indigo-50 text-indigo-800 border-indigo-200"
                  emptyText="No hay carreras registradas en el sistema"
                />
              </div>

              {/* ─── Selector Múltiple: Actividades (Requerimiento 2) ─── */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2 mb-2">
                  <ClipboardList size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Actividades Asignadas (N:M)
                  </h4>
                </div>
                <MultiSelect
                  label="Seleccionar Actividades"
                  options={catalogoActividades.map(a => ({
                    id: a.id,
                    nombre: a.nombre,
                    descripcion: a.indicador?.nombre ? `Indicador: ${a.indicador.nombre}` : (a.descripcion || ''),
                  }))}
                  selectedIds={formData.actividades}
                  onChange={(nuevosIds) => handleChange('actividades', nuevosIds)}
                  placeholder="Buscar actividad..."
                  badgeColor="bg-emerald-50 text-emerald-800 border-emerald-200"
                  emptyText="No hay actividades registradas en el sistema"
                />
              </div>
            </>
          )}

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || cargandoCatalogos}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-medium text-white bg-navy-900 hover:bg-navy-800 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
            >
              {guardando ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{esEdicion ? 'Actualizar Docente' : 'Crear Docente'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
