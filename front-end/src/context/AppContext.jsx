import React, { useState, useEffect, useMemo } from 'react';
import { AppContext } from './AppContextObject';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function tokenValido(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function parsearUsuario(data) {
  if (!data) return null;
  const nombre = data.nombre || data.email || 'Usuario';
  const avatar = (nombre.split(' ').filter(Boolean).map(n => n[0]).join('') || 'US').substring(0, 2).toUpperCase();
  let roles = ['DOCENTE'];
  if (data.roles && Array.isArray(data.roles)) {
    roles = data.roles.map(r => r.nombre || r);
  } else if (data.rol) {
    roles = [data.rol.nombre || data.rol];
  }

  // Normaliza carreras: acepta tanto el alias M:N 'carreras' (array de objetos)
  // como el alias antiguo 'carrera' (objeto único) por compatibilidad transitoria.
  let carreras = [];
  if (data.carreras && Array.isArray(data.carreras)) {
    carreras = data.carreras.map(c => (typeof c === 'object' ? { id: c.id, nombre: c.nombre } : { id: c, nombre: '' }));
  } else if (data.carrera && typeof data.carrera === 'object') {
    carreras = [{ id: data.carrera.id, nombre: data.carrera.nombre }];
  }

  return {
    ...data,
    nombre,
    avatar,
    roles,
    carreras,
  };
}

export function AppProvider({ children }) {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [navParams, setNavParams] = useState(null);

  function navegarA(vista, params = null) {
    setVistaActual(vista);
    setNavParams(params);
  }

  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [universidades, setUniversidades] = useState([]);
  const [cargandoEstructura, setCargandoEstructura] = useState(false);
  const [documentosGlobales, setDocumentosGlobales] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);
  const [flujosFirma, setFlujosFirma] = useState([]);
  const [certBase64, setCertBase64] = useState(null);
  const [certPassword, setCertPassword] = useState('');
  const [metricasApi, setMetricasApi] = useState(null);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('gestdoc_token');
      const savedUsuario = localStorage.getItem('gestdoc_usuario');
      if (savedToken && savedUsuario && tokenValido(savedToken)) {
        const u = JSON.parse(savedUsuario);
        const uParsed = parsearUsuario(u);
        if (uParsed) {
          setToken(savedToken);
          setUsuario(uParsed);
          setIsAutenticado(true);
        } else {
          localStorage.removeItem('gestdoc_token');
          localStorage.removeItem('gestdoc_usuario');
        }
      }
    } catch {
      localStorage.removeItem('gestdoc_token');
      localStorage.removeItem('gestdoc_usuario');
    }
  }, []);

  async function cargarDocumentosGlobales(tkn = token, usr = usuario) {
    const activeToken = tkn || token;
    const activeUser = usr || usuario;
    if (!activeToken) return;
    try {
      // Admins pueden ver todos los documentos; el resto solo ve los suyos y donde son firmantes
      const esAdmin = activeUser?.roles?.includes('ADMINISTRADOR') || activeUser?.roles?.some(r => r === 'ADMINISTRADOR' || r?.nombre === 'ADMINISTRADOR');
      const url = esAdmin ? `${API_URL}/documentos?todos=true` : `${API_URL}/documentos`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const docs = await res.json();
        setDocumentosGlobales(Array.isArray(docs) ? docs : []);
      } else {
        setDocumentosGlobales([]);
      }
    } catch {
      setDocumentosGlobales([]);
    }
  }

  useEffect(() => {
    if (isAutenticado && token) {
      cargarEstructura();
      cargarMetricasApi();
      cargarFlujosFirma();
      cargarDocumentosGlobales(token, usuario);
    }
  }, [isAutenticado, token]);

  const auditoria = useMemo(() => {
    if (!documentosGlobales || documentosGlobales.length === 0) return [];
    const eventos = [];
    documentosGlobales.forEach(d => {
      if (d.creado_en) {
        eventos.push({
          id: `subida-${d.id}`,
          usuario: d.subidoPor?.nombre || 'Docente',
          tipo: 'CARGA',
          descripcion: `Subió evidencia "${d.nombre_original}"`,
          fecha: new Date(d.creado_en).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: new Date(d.creado_en).getTime(),
        });
      }
      if (d.actualizado_en && new Date(d.actualizado_en).getTime() > new Date(d.creado_en).getTime() + 1000) {
        let tipo = 'FIRMA';
        let desc = `Firmó el documento "${d.nombre_original}" (${d.estado ? d.estado.replace(/_/g, ' ') : ''})`;
        if (d.estado === 'RECHAZADO') {
          tipo = 'RECHAZO';
          desc = `Rechazó el documento "${d.nombre_original}": ${d.observaciones || 'Sin observaciones'}`;
        } else if (d.estado === 'COMPLETADO') {
          tipo = 'COMPLETADO';
          desc = `Documento "${d.nombre_original}" completó todas las firmas`;
        }

        eventos.push({
          id: `act-${d.id}-${d.estado}`,
          usuario: d.firmanteActual?.nombre || d.subidoPor?.nombre || 'Firmante',
          tipo,
          descripcion: desc,
          fecha: new Date(d.actualizado_en).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: new Date(d.actualizado_en).getTime(),
          documentoRef: d,
        });
      }
    });
    return eventos.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [documentosGlobales]);

  const alertas = useMemo(() => {
    if (!documentosGlobales || documentosGlobales.length === 0) return [];
    const items = [];
    documentosGlobales.forEach(d => {
      if (d.estado === 'RECHAZADO') {
        items.push({
          id: `rech-${d.id}`,
          documento: d.nombre_original,
          urgencia: 'alta',
          mensaje: `Documento rechazado: ${d.observaciones || 'Requiere corrección y reenvío'}`,
          fecha: d.actualizado_en ? new Date(d.actualizado_en).toLocaleDateString('es-EC') : 'Reciente',
          documentoRef: d,
        });
      // eslint-disable-next-line eqeqeq
      } else if (usuario && d.firmante_actual_id == usuario.id) {
        items.push({
          id: `firm-${d.id}`,
          documento: d.nombre_original,
          urgencia: 'alta',
          mensaje: `Requiere tu firma digital (${d.estado ? d.estado.replace(/_/g, ' ') : ''})`,
          fecha: d.actualizado_en ? new Date(d.actualizado_en).toLocaleDateString('es-EC') : 'Reciente',
          documentoRef: d,
        });
      } else if (d.firmante_actual_id && d.estado !== 'COMPLETADO' && d.estado !== 'RECHAZADO') {
        // Documento en proceso (cualquier estado con firmante pendiente)
        items.push({
          id: `pend-${d.id}`,
          documento: d.nombre_original,
          urgencia: 'media',
          mensaje: `Pendiente de firma (${d.estado ? d.estado.replace(/_/g, ' ') : ''}) — firmante: ${d.firmanteActual?.nombre || 'Asignado'}`,
          fecha: d.actualizado_en ? new Date(d.actualizado_en).toLocaleDateString('es-EC') : 'Reciente',
          documentoRef: d,
        });
      }
    });
    return items.slice(0, 6);
  }, [documentosGlobales, usuario]);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  async function cargarEstructura() {
    setCargandoEstructura(true);
    try {
      const res = await fetch(`${API_URL}/parametrizacion/estructura`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        
        // Filtrar actividades según permisos
        const isAdmin = usuario?.roles?.some(r => r.nombre === 'ADMINISTRADOR');
        if (!isAdmin) {
          data.forEach(u => {
            u.facultades.forEach(f => {
              f.carreras.forEach(ca => {
                ca.periodos.forEach(p => {
                  p.criterios.forEach(c => {
                    c.indicadores.forEach(i => {
                      if (i.actividades) {
                        i.actividades = i.actividades.filter(a => {
                          const asignados = a.usuariosAsignados || [];
                          // Si no hay asignados, es pública. Si hay, debe incluir al usuario actual.
                          return asignados.length === 0 || asignados.some(usr => usr.id === usuario?.id);
                        });
                      }
                    });
                  });
                });
              });
            });
          });
        }
        
        setUniversidades(data);
      }
    } catch {
      // Si falla, se queda con estructura vacía
    } finally {
      setCargandoEstructura(false);
    }
  }

  async function cargarDocumentosActividad(actividadId) {
    const res = await fetch(`${API_URL}/documentos?actividad_id=${actividadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const docs = await res.json();
    // Devolvemos el documento completo con todos los campos del backend
    // más alias de compatibilidad para el panel lateral
    return docs.map(d => ({
      ...d,
      nombre: d.nombre_original,
      subido_por: d.subidoPor?.nombre || '',
      fecha: new Date(d.creado_en).toLocaleDateString('es-EC'),
      hash: d.hash_sha256 || '',
      tamanio: 'N/A',
      firmantes: [],
      observaciones: d.observaciones || '',
    }));
  }

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

    const u = parsearUsuario(data.usuario);
    setToken(data.token);
    setUsuario(u);
    setIsAutenticado(true);
    setVistaActual('dashboard');
    localStorage.setItem('gestdoc_token', data.token);
    localStorage.setItem('gestdoc_usuario', JSON.stringify(u));
  }

  async function registrar({ nombre, email, password }) {
    const res = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al registrarse');
    return data;
  }

  async function cambiarPassword(passwordActual, passwordNueva) {
    const res = await fetch(`${API_URL}/auth/cambiar-password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
    return data;
  }

  async function solicitarRecuperacion(email) {
    const res = await fetch(`${API_URL}/auth/recuperar-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al solicitar recuperación');
    return data;
  }

  async function resetPassword(token, passwordNueva) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, passwordNueva }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');
    return data;
  }

  async function adminResetPassword(usuarioId, passwordNueva) {
    const res = await fetch(`${API_URL}/auth/usuarios/${usuarioId}/password`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ passwordNueva }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña del usuario');
    return data;
  }

  async function cargarCertificado(file, password) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(e.target.result)));
        setCertBase64(base64);
        setCertPassword(password);
        resolve();
      };
      reader.onerror = () => reject(new Error('Error al leer el certificado'));
      reader.readAsArrayBuffer(file);
    });
  }

  function limpiarCertificado() {
    setCertBase64(null);
    setCertPassword('');
  }

  async function cargarMetricasApi() {
    try {
      const res = await fetch(`${API_URL}/documentos/resumen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetricasApi(data);
      }
    } catch {
      // silencioso — las métricas locales sirven como fallback
    }
  }

  function logout() {
    setToken(null);
    setUsuario(null);
    setIsAutenticado(false);
    setVistaActual('dashboard');
    setDocumentoSeleccionado(null);
    setUniversidades([]);
    setCertBase64(null);
    setCertPassword('');
    setMetricasApi(null);
    localStorage.removeItem('gestdoc_token');
    localStorage.removeItem('gestdoc_usuario');
  }

  function navegarA(vista, params = null) {
    setVistaActual(vista);
    setNavParams(params);
  }

  function _inyectarDocumentosEnActividad(actividadId, docs) {
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          carreras: f.carreras.map(ca => ({
            ...ca,
            periodos: ca.periodos.map(p => ({
              ...p,
              criterios: p.criterios.map(c => ({
                ...c,
                indicadores: c.indicadores.map(i => ({
                  ...i,
                  actividades: i.actividades.map(a =>
                    a.id === actividadId
                      ? { ...a, documentos: docs, cantidadDocumentos: Array.isArray(docs) ? docs.length : (a.cantidadDocumentos || 0) }
                      : a
                  ),
                })),
              })),
            })),
          })),
        })),
      }))
    );
  }

  async function subirDocumento(file, actividadId, facultadId) {
    const formData = new FormData();
    formData.append('archivo', file);
    if (actividadId) formData.append('actividad_id', actividadId);
    if (facultadId) formData.append('facultad_id', facultadId);

    const res = await fetch(`${API_URL}/documentos/subir`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al subir documento');
    }

    if (actividadId) {
      const docs = await cargarDocumentosActividad(actividadId);
      _inyectarDocumentosEnActividad(actividadId, docs);
    }
    cargarMetricasApi();
    cargarDocumentosGlobales();
  }

  async function firmarDocumento(docId, nombreDoc) {
    const body = { observaciones: '' };
    if (certBase64 && certPassword) {
      body.certBase64 = certBase64;
      body.certPassword = certPassword;
    }

    const res = await fetch(`${API_URL}/documentos/${docId}/firmar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al firmar');

    const doc = data.documento;

    // Actualizar el documento con todos los cambios (estado, firmante, paso)
    const cambiosDoc = {
      estado: doc.estado,
      firmante_actual_id: doc.firmante_actual_id,
      paso_actual: doc.paso_actual,
      firmanteActual: doc.firmanteActual || null,
    };
    _actualizarDocumentoEnEstado(docId, cambiosDoc);

    // Actualizar el documento seleccionado con datos completos
    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, ...cambiosDoc }));
    }
    cargarMetricasApi();
    cargarDocumentosGlobales();
  }

  async function rechazarDocumento(docId, nombreDoc, motivo) {
    const res = await fetch(`${API_URL}/documentos/${docId}/rechazar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ motivo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al rechazar');

    _actualizarDocumentoEnEstado(docId, { estado: 'RECHAZADO', observaciones: motivo });

    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, estado: 'RECHAZADO', observaciones: motivo }));
    }
    cargarMetricasApi();
    cargarDocumentosGlobales();
  }

  async function eliminarDocumento(docId, actividadId) {
    const res = await fetch(`${API_URL}/documentos/${docId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar documento');

    // Elimina el doc del estado local
    if (actividadId) {
      _inyectarDocumentosEnActividad(
        actividadId,
        (universidades
          .flatMap(u => u.facultades.flatMap(f => f.carreras.flatMap(ca => ca.periodos.flatMap(p => p.criterios.flatMap(c => c.indicadores.flatMap(i => i.actividades))))))
          .find(a => a.id === actividadId)?.documentos || []
        ).filter(d => d.id !== docId)
      );
    }

    if (documentoSeleccionado?.id === docId) setDocumentoSeleccionado(null);
    cargarMetricasApi();
    cargarDocumentosGlobales();
    return data;
  }

  function _actualizarDocumentoEnEstado(docId, cambios) {
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          carreras: f.carreras.map(ca => ({
            ...ca,
            periodos: ca.periodos.map(p => ({
              ...p,
              criterios: p.criterios.map(c => ({
                ...c,
                indicadores: c.indicadores.map(i => ({
                  ...i,
                  actividades: i.actividades.map(a => ({
                    ...a,
                    documentos: a.documentos.map(d => d.id === docId ? { ...d, ...cambios } : d),
                  })),
                })),
              })),
            })),
          })),
        })),
      }))
    );
  }

  async function listarUsuarios() {
    const res = await fetch(`${API_URL}/auth/usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return res.json();
  }

  async function actualizarRolUsuario(usuarioId, rol_id) {
    // El backend ahora espera un array de IDs en 'roles' (PUT /usuarios/:id).
    // Se mantiene la firma original (rol_id único) para no romper los llamadores
    // existentes, pero se envía como array.
    const roles = Array.isArray(rol_id) ? rol_id : [rol_id];
    const res = await fetch(`${API_URL}/auth/usuarios/${usuarioId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ roles }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar rol');
    return data;
  }

  async function actualizarUsuario(usuarioId, datos) {
    const res = await fetch(`${API_URL}/auth/usuarios/${usuarioId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar usuario');
    return data;
  }

  async function eliminarUsuario(usuarioId, hard = false) {
    const res = await fetch(`${API_URL}/auth/usuarios/${usuarioId}${hard ? '?hard=true' : ''}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
    return data;
  }

  async function listarRoles() {
    const res = await fetch(`${API_URL}/auth/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  }

  // ─── API: Carreras ────────────────────────────────────────────────────────
  // listarCarreras: devuelve todas las carreras activas de la BD (para selects
  // en formularios de creación/edición de usuarios sin depender del árbol
  // jerárquico de universidades).
  async function listarCarreras() {
    try {
      const res = await fetch(`${API_URL}/parametrizacion/carreras`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  // crearCarrera: crea una carrera nueva vía el endpoint de parametrización.
  // Llama a agregarCarrera del contexto si se conocen univId y facId,
  // o hace la llamada directa si solo se tienen datos básicos.
  async function crearCarrera(datos) {
    const res = await fetch(`${API_URL}/parametrizacion/carreras`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear carrera');
    return data;
  }

  // ─── API: Docentes (N:M con Facultades y Actividades) ──────────────────────
  async function listarDocentes() {
    const res = await fetch(`${API_URL}/parametrizacion/docentes`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al listar docentes');
    return res.json();
  }

  async function obtenerDocente(id) {
    const res = await fetch(`${API_URL}/parametrizacion/docentes/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener docente');
    return res.json();
  }

  async function crearDocente(datos) {
    const res = await fetch(`${API_URL}/parametrizacion/docentes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear docente');
    return data;
  }

  async function actualizarDocente(id, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/docentes/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al actualizar docente');
    return data;
  }

  async function eliminarDocente(id) {
    const res = await fetch(`${API_URL}/parametrizacion/docentes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar docente');
    return data;
  }

  async function listarFacultadesCatalogo() {
    try {
      const res = await fetch(`${API_URL}/parametrizacion/facultades`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async function listarActividadesCatalogo() {
    try {
      const res = await fetch(`${API_URL}/parametrizacion/actividades`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async function listarDocentesElegibles({ facultadId, actividadId, rol } = {}) {
    const params = new URLSearchParams();
    if (facultadId) params.append('facultadId', facultadId);
    if (actividadId) params.append('actividadId', actividadId);
    if (rol) params.append('rol', rol);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_URL}/parametrizacion/docentes/elegibles${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al listar docentes elegibles');
    return res.json();
  }

  // CRUD Flujos de Firma
  async function cargarFlujosFirma() {
    try {
      const res = await fetch(`${API_URL}/flujos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setFlujosFirma(await res.json());
    } catch (e) {}
  }

  async function crearFlujo(datos) {
    const res = await fetch(`${API_URL}/flujos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear flujo');
    await cargarFlujosFirma();
    return data;
  }

  async function actualizarFlujo(id, datos) {
    const res = await fetch(`${API_URL}/flujos/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar flujo');
    await cargarFlujosFirma();
    return data;
  }

  async function eliminarFlujo(id) {
    const res = await fetch(`${API_URL}/flujos/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar flujo');
    await cargarFlujosFirma();
    return data;
  }

  // CRUD de Parametrización - Universidades
  async function actualizarUniversidad(id, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/universidades/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar universidad');
    setUniversidades(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    return data;
  }

  async function eliminarUniversidad(id) {
    const res = await fetch(`${API_URL}/parametrizacion/universidades/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar universidad');
    setUniversidades(prev => prev.filter(u => u.id !== id));
    return data;
  }

  async function agregarUniversidad(datos) {
    const res = await fetch(`${API_URL}/parametrizacion/universidades`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear universidad');
    setUniversidades(prev => [...prev, { ...data, facultades: [] }]);
    return data;
  }

  // CRUD Facultades
  async function actualizarFacultad(id, univId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/facultades/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar facultad');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === id ? { ...f, ...data } : f) }
      : u
    ));
    return data;
  }

  async function eliminarFacultad(id, univId) {
    const res = await fetch(`${API_URL}/parametrizacion/facultades/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar facultad');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.filter(f => f.id !== id) }
      : u
    ));
    return data;
  }

  async function agregarFacultad(univId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/facultades`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, universidad_id: univId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear facultad');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? { ...u, facultades: [...u.facultades, { ...data, carreras: [] }] }
        : u
      )
    );
    return data;
  }

  // CRUD Carreras
  async function actualizarCarrera(id, univId, facultadId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/carreras/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar carrera');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === id ? { ...ca, ...data } : ca) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function eliminarCarrera(id, univId, facultadId) {
    const res = await fetch(`${API_URL}/parametrizacion/carreras/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar carrera');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.filter(ca => ca.id !== id) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function agregarCarrera(univId, facultadId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/carreras`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, facultad_id: facultadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear carrera');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? { ...f, carreras: [...f.carreras, { ...data, periodos: [] }] }
            : f
          )
        }
        : u
      )
    );
    return data;
  }

  // CRUD Periodos
  async function actualizarPeriodo(id, univId, facultadId, carreraId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/periodos/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar período');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === id ? { ...p, ...data } : p) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function eliminarPeriodo(id, univId, facultadId, carreraId) {
    const res = await fetch(`${API_URL}/parametrizacion/periodos/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar período');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.filter(p => p.id !== id) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function agregarPeriodo(univId, facultadId, carreraId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/periodos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, carrera_id: carreraId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear periodo');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, carreras: f.carreras.map(ca => ca.id === carreraId
                ? { ...ca, periodos: [...ca.periodos, { ...data, criterios: [] }] }
                : ca
              )
            }
            : f
          )
        }
        : u
      )
    );
    return data;
  }

  // CRUD Criterios
  async function actualizarCriterio(id, univId, facultadId, carreraId, periodoId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/criterios/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar criterio');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.map(c => c.id === id ? { ...c, ...data } : c) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function eliminarCriterio(id, univId, facultadId, carreraId, periodoId) {
    const res = await fetch(`${API_URL}/parametrizacion/criterios/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar criterio');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.filter(c => c.id !== id) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function agregarCriterio(univId, facultadId, carreraId, periodoId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/criterios`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, periodo_id: periodoId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear criterio');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, carreras: f.carreras.map(ca => ca.id === carreraId
                ? {
                  ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                    ? { ...p, criterios: [...p.criterios, { ...data, indicadores: [] }] }
                    : p
                  )
                }
                : ca
              )
            }
            : f
          )
        }
        : u
      )
    );
    return data;
  }

  // CRUD Indicadores
  async function actualizarIndicador(id, univId, facultadId, carreraId, periodoId, criterioId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/indicadores/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar indicador');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.map(c => c.id === criterioId
                      ? { ...c, indicadores: c.indicadores.map(i => i.id === id ? { ...i, ...data } : i) }
                      : c
                    ) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function eliminarIndicador(id, univId, facultadId, carreraId, periodoId, criterioId) {
    const res = await fetch(`${API_URL}/parametrizacion/indicadores/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar indicador');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.map(c => c.id === criterioId
                      ? { ...c, indicadores: c.indicadores.filter(i => i.id !== id) }
                      : c
                    ) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function agregarIndicador(univId, facultadId, carreraId, periodoId, criterioId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/indicadores`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, criterio_id: criterioId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear indicador');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, carreras: f.carreras.map(ca => ca.id === carreraId
                ? {
                  ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                    ? {
                      ...p, criterios: p.criterios.map(c => c.id === criterioId
                        ? { ...c, indicadores: [...c.indicadores, { ...data, actividades: [] }] }
                        : c
                      )
                    }
                    : p
                  )
                }
                : ca
              )
            }
            : f
          )
        }
        : u
      )
    );
    return data;
  }

  async function asignarResponsablesIndicador(id, responsablesIds) {
    const res = await fetch(`${API_URL}/parametrizacion/indicadores/${id}/responsables`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ responsablesIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al asignar responsables al indicador');
    
    // Recargar toda la estructura para reflejar cambios, ya que la estructura es anidada
    await cargarEstructura();
    return data;
  }

  // CRUD Actividades
  async function actualizarActividad(id, univId, facultadId, carreraId, periodoId, criterioId, indicadorId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/actividades/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar actividad');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.map(c => c.id === criterioId
                      ? { ...c, indicadores: c.indicadores.map(i => i.id === indicadorId
                          ? { ...i, actividades: i.actividades.map(a => a.id === id ? { ...a, ...data } : a) }
                          : i
                        ) }
                      : c
                    ) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function eliminarActividad(id, univId, facultadId, carreraId, periodoId, criterioId, indicadorId) {
    const res = await fetch(`${API_URL}/parametrizacion/actividades/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar actividad');
    setUniversidades(prev => prev.map(u => u.id === univId
      ? { ...u, facultades: u.facultades.map(f => f.id === facultadId
          ? { ...f, carreras: f.carreras.map(ca => ca.id === carreraId
              ? { ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                  ? { ...p, criterios: p.criterios.map(c => c.id === criterioId
                      ? { ...c, indicadores: c.indicadores.map(i => i.id === indicadorId
                          ? { ...i, actividades: i.actividades.filter(a => a.id !== id) }
                          : i
                        ) }
                      : c
                    ) }
                  : p
                ) }
              : ca
            ) }
          : f
        ) }
      : u
    ));
    return data;
  }

  async function agregarActividad(univId, facultadId, carreraId, periodoId, criterioId, indicadorId, datos) {
    const res = await fetch(`${API_URL}/parametrizacion/actividades`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...datos, indicador_id: indicadorId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.errores?.[0]?.msg || 'Error al crear actividad');
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, carreras: f.carreras.map(ca => ca.id === carreraId
                ? {
                  ...ca, periodos: ca.periodos.map(p => p.id === periodoId
                    ? {
                      ...p, criterios: p.criterios.map(c => c.id === criterioId
                        ? {
                          ...c, indicadores: c.indicadores.map(i => i.id === indicadorId
                            ? { ...i, actividades: [...i.actividades, { ...data, documentos: [] }] }
                            : i
                          )
                        }
                        : c
                      )
                    }
                    : p
                  )
                }
                : ca
              )
            }
            : f
          )
        }
        : u
      )
    );
    return data;
  }

  async function asignarUsuariosActividad(id, univId, facultadId, carreraId, periodoId, criterioId, indicadorId, usuariosIds) {
    const res = await fetch(`${API_URL}/parametrizacion/actividades/${id}/usuarios`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ usuariosIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al asignar usuarios a la actividad');
    
    // Refresh only the affected activity tree in the local state, or rely on a full refresh?
    // It's safer to just fetch the full tree again to get the populated users, or manually inject.
    // For simplicity we fetch the whole tree again to ensure consistency:
    await cargarEstructura();
    return data;
  }

  const todosLosDocs = (universidades ?? []).flatMap(u =>
    (u?.facultades ?? []).flatMap(f =>
      (f?.carreras ?? []).flatMap(ca =>
        (ca?.periodos ?? []).flatMap(p =>
          (p?.criterios ?? []).flatMap(c =>
            (c?.indicadores ?? []).flatMap(i =>
              (i?.actividades ?? []).flatMap(a => a?.documentos ?? [])
            )
          )
        )
      )
    )
  );

  const metricasLocales = {
    total: todosLosDocs.length,
    pendientesFirma: todosLosDocs.filter(d => ['PENDIENTE', 'FIRMADO_DIRECTOR', 'FIRMADO_SUBDECANO', 'FIRMADO_DECANO'].includes(d.estado)).length,
    firmados: todosLosDocs.filter(d => d.estado === 'COMPLETADO').length,
    rechazados: todosLosDocs.filter(d => d.estado === 'RECHAZADO').length,
  };
  // Las métricas de la API son más precisas (incluyen todos los docs del servidor)
  const metricas = metricasApi || metricasLocales;

  return (
    <AppContext.Provider value={{
      vistaActual, navegarA, navParams,
      usuario, token,
      isAutenticado, login, logout, registrar,
      cambiarPassword, solicitarRecuperacion, resetPassword, adminResetPassword,
      universidades, setUniversidades, cargandoEstructura, cargarEstructura,
      cargarDocumentosActividad, _inyectarDocumentosEnActividad,
      auditoria, alertas,
      documentoSeleccionado, setDocumentoSeleccionado,
      modalFirmaAbierto, setModalFirmaAbierto,
      firmarDocumento, rechazarDocumento, subirDocumento, eliminarDocumento,
      certBase64, certPassword, cargarCertificado, limpiarCertificado, cargarMetricasApi,
      listarUsuarios, actualizarRolUsuario, actualizarUsuario, eliminarUsuario, listarRoles,
      listarDocentes, obtenerDocente, crearDocente, actualizarDocente, eliminarDocente,
      listarFacultadesCatalogo, listarActividadesCatalogo, listarDocentesElegibles,
      listarCarreras, crearCarrera,
      agregarUniversidad, actualizarUniversidad, eliminarUniversidad,
      agregarFacultad, actualizarFacultad, eliminarFacultad,
      agregarPeriodo, actualizarPeriodo, eliminarPeriodo,
      agregarCarrera, actualizarCarrera, eliminarCarrera,
      agregarCriterio, actualizarCriterio, eliminarCriterio,
      agregarIndicador,
      actualizarIndicador,
      eliminarIndicador,
      asignarResponsablesIndicador,
      agregarActividad, actualizarActividad, eliminarActividad, asignarUsuariosActividad,
      flujosFirma, crearFlujo, actualizarFlujo, eliminarFlujo,
      metricas, todosLosDocs,
    }}>
      {children}
    </AppContext.Provider>
  );
}
