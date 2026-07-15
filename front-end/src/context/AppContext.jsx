import React, { createContext, useState, useEffect } from 'react';
import { mockAuditoria, mockAlertas } from '../data/mockData';

const API_URL = 'http://localhost:3000/api';

export const AppContext = createContext(null);

function tokenValido(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function parsearUsuario(data) {
  return {
    ...data,
    avatar: data.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    rol: data.rol?.nombre || data.rol,
  };
}

export function AppProvider({ children }) {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [universidades, setUniversidades] = useState([]);
  const [cargandoEstructura, setCargandoEstructura] = useState(false);
  const [auditoria, setAuditoria] = useState(mockAuditoria);
  const [alertas] = useState(mockAlertas);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('gestdoc_token');
    const savedUsuario = localStorage.getItem('gestdoc_usuario');
    if (savedToken && savedUsuario && tokenValido(savedToken)) {
      const u = JSON.parse(savedUsuario);
      setToken(savedToken);
      setUsuario(u);
      setIsAutenticado(true);
    }
  }, []);

  useEffect(() => {
    if (isAutenticado && token) {
      cargarEstructura();
    }
  }, [isAutenticado, token]);

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
    return docs.map(d => ({
      id: d.id,
      nombre: d.nombre_original,
      estado: d.estado,
      subido_por: d.subidoPor?.nombre || '',
      fecha: new Date(d.creado_en).toLocaleDateString('es-EC'),
      hash: d.hash_sha256 || '',
      tamanio: 'N/A',
      firmantes: [],
      observaciones: d.observaciones || '',
      facultad_id: d.facultad_id,
      actividad_id: d.actividad_id,
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

  function logout() {
    setToken(null);
    setUsuario(null);
    setIsAutenticado(false);
    setVistaActual('dashboard');
    setDocumentoSeleccionado(null);
    setUniversidades([]);
    localStorage.removeItem('gestdoc_token');
    localStorage.removeItem('gestdoc_usuario');
  }

  function navegarA(vista) {
    setVistaActual(vista);
  }

  function _inyectarDocumentosEnActividad(actividadId, docs) {
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          periodos: f.periodos.map(p => ({
            ...p,
            criterios: p.criterios.map(c => ({
              ...c,
              actividades: c.actividades.map(a =>
                a.id === actividadId ? { ...a, documentos: docs } : a
              ),
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
  }

  async function firmarDocumento(docId, nombreDoc) {
    const res = await fetch(`${API_URL}/documentos/${docId}/firmar`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ observaciones: '' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al firmar');

    const doc = data.documento;
    const nuevoEstado = doc.estado;

    _actualizarDocumentoEnEstado(docId, { estado: nuevoEstado });

    const nuevaEntrada = {
      id: auditoria.length + 1,
      usuario: usuario.nombre,
      accion: 'FIRMA',
      descripcion: `Firmó ${nombreDoc} (${usuario.rol})`,
      fecha: new Date().toLocaleString('es-EC'),
      hash: doc.hash_sha256 || '',
      tipo: 'FIRMA',
    };
    setAuditoria(prev => [nuevaEntrada, ...prev]);

    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, estado: nuevoEstado }));
    }
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

    const nuevaEntrada = {
      id: auditoria.length + 1,
      usuario: usuario.nombre,
      accion: 'RECHAZO',
      descripcion: `Rechazó ${nombreDoc}`,
      fecha: new Date().toLocaleString('es-EC'),
      hash: '',
      tipo: 'RECHAZO',
    };
    setAuditoria(prev => [nuevaEntrada, ...prev]);

    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, estado: 'RECHAZADO', observaciones: motivo }));
    }
  }

  function _actualizarDocumentoEnEstado(docId, cambios) {
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          periodos: f.periodos.map(p => ({
            ...p,
            criterios: p.criterios.map(c => ({
              ...c,
              actividades: c.actividades.map(a => ({
                ...a,
                documentos: a.documentos.map(d => d.id === docId ? { ...d, ...cambios } : d),
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
    const res = await fetch(`${API_URL}/auth/usuarios/${usuarioId}/rol`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ rol_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar rol');
    return data;
  }

  async function listarRoles() {
    const res = await fetch(`${API_URL}/auth/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  }

  function agregarUniversidad(datos) {
    setUniversidades(prev => [...prev, { ...datos, id: Date.now(), facultades: [] }]);
  }

  function agregarFacultad(univId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? { ...u, facultades: [...u.facultades, { ...datos, id: Date.now(), periodos: [] }] }
        : u
      )
    );
  }

  function agregarPeriodo(univId, facultadId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? { ...f, periodos: [...f.periodos, { ...datos, id: Date.now(), criterios: [] }] }
            : f
          )
        }
        : u
      )
    );
  }

  function agregarCriterio(univId, facultadId, periodoId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, periodos: f.periodos.map(p => p.id === periodoId
                ? { ...p, criterios: [...p.criterios, { ...datos, id: Date.now(), actividades: [] }] }
                : p
              )
            }
            : f
          )
        }
        : u
      )
    );
  }

  function agregarActividad(univId, facultadId, periodoId, criterioId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, periodos: f.periodos.map(p => p.id === periodoId
                ? {
                  ...p, criterios: p.criterios.map(c => c.id === criterioId
                    ? { ...c, actividades: [...c.actividades, { ...datos, id: Date.now(), documentos: [] }] }
                    : c
                  )
                }
                : p
              )
            }
            : f
          )
        }
        : u
      )
    );
  }

  const todosLosDocs = universidades.flatMap(u =>
    u.facultades.flatMap(f =>
      f.periodos.flatMap(p =>
        p.criterios.flatMap(c =>
          c.actividades.flatMap(a => a.documentos)
        )
      )
    )
  );

  const metricas = {
    total: todosLosDocs.length,
    pendientesFirma: todosLosDocs.filter(d => d.estado === 'PENDIENTE' || d.estado === 'FIRMADO_DECANO').length,
    firmados: todosLosDocs.filter(d => d.estado === 'COMPLETADO').length,
    rechazados: todosLosDocs.filter(d => d.estado === 'RECHAZADO').length,
  };

  return (
    <AppContext.Provider value={{
      vistaActual, navegarA,
      usuario, token,
      isAutenticado, login, logout, registrar,
      universidades, setUniversidades, cargandoEstructura, cargarEstructura,
      cargarDocumentosActividad, _inyectarDocumentosEnActividad,
      auditoria, alertas,
      documentoSeleccionado, setDocumentoSeleccionado,
      modalFirmaAbierto, setModalFirmaAbierto,
      firmarDocumento, rechazarDocumento, subirDocumento,
      listarUsuarios, actualizarRolUsuario, listarRoles,
      agregarUniversidad, agregarFacultad, agregarPeriodo, agregarCriterio, agregarActividad,
      metricas, todosLosDocs,
    }}>
      {children}
    </AppContext.Provider>
  );
}
