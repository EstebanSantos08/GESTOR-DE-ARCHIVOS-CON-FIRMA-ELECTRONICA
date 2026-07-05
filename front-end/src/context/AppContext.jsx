import React, { createContext, useState } from 'react';
import { mockUniversidades, mockAuditoria, mockAlertas } from '../data/mockData';

const API_URL = 'http://localhost:3000/api';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [isAutenticado, setIsAutenticado] = useState(false);
  const [universidades, setUniversidades] = useState(mockUniversidades);
  const [auditoria, setAuditoria] = useState(mockAuditoria);
  const [alertas] = useState(mockAlertas);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    setToken(data.token);
    setUsuario({
      ...data.usuario,
      avatar: data.usuario.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      rol: data.usuario.rol?.nombre || data.usuario.rol,
    });
    setIsAutenticado(true);
    setVistaActual('dashboard');
  }

  function logout() {
    setToken(null);
    setUsuario(null);
    setIsAutenticado(false);
    setVistaActual('dashboard');
    setDocumentoSeleccionado(null);
  }

  function navegarA(vista) {
    setVistaActual(vista);
  }

  function _actualizarDocumento(docId, cambios) {
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          criterios: f.criterios.map(c => ({
            ...c,
            actividades: c.actividades.map(a => ({
              ...a,
              documentos: a.documentos.map(d =>
                d.id === docId ? { ...d, ...cambios } : d
              )
            }))
          }))
        }))
      }))
    );
  }

  function firmarDocumento(docId, nombreDoc) {
    const nuevoEstado = usuario.rol === 'DECANO' ? 'FIRMADO_DECANO' : 'COMPLETADO';
    const nuevosFirmantes = usuario.rol === 'DECANO'
      ? [`Decano ${usuario.nombre}`]
      : [`Rector ${usuario.nombre}`];

    _actualizarDocumento(docId, {
      estado: nuevoEstado,
      firmantes: nuevosFirmantes,
    });

    const nuevaEntrada = {
      id: auditoria.length + 1,
      usuario: usuario.nombre,
      accion: 'FIRMA',
      descripcion: `Firmó ${nombreDoc} (${usuario.rol})`,
      fecha: new Date().toLocaleString('es-EC'),
      hash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      tipo: 'FIRMA',
    };
    setAuditoria(prev => [nuevaEntrada, ...prev]);

    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, estado: nuevoEstado, firmantes: nuevosFirmantes }));
    }
  }

  function rechazarDocumento(docId, nombreDoc) {
    _actualizarDocumento(docId, { estado: 'RECHAZADO' });
    const nuevaEntrada = {
      id: auditoria.length + 1,
      usuario: usuario.nombre,
      accion: 'RECHAZO',
      descripcion: `Rechazó ${nombreDoc}`,
      fecha: new Date().toLocaleString('es-EC'),
      hash: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      tipo: 'RECHAZO',
    };
    setAuditoria(prev => [nuevaEntrada, ...prev]);
    if (documentoSeleccionado?.id === docId) {
      setDocumentoSeleccionado(prev => ({ ...prev, estado: 'RECHAZADO' }));
    }
  }

  function subirDocumento(nombre, actividadId) {
    const nuevoDoc = {
      id: Date.now(),
      nombre,
      estado: 'PENDIENTE',
      subido_por: usuario.nombre,
      fecha: new Date().toLocaleDateString('es-EC'),
      hash: Math.random().toString(36).substring(2).repeat(4),
      tamanio: 'N/A',
      firmantes: [],
    };
    setUniversidades(prev =>
      prev.map(u => ({
        ...u,
        facultades: u.facultades.map(f => ({
          ...f,
          criterios: f.criterios.map(c => ({
            ...c,
            actividades: c.actividades.map(a =>
              a.id === actividadId
                ? { ...a, documentos: [...a.documentos, nuevoDoc] }
                : a
            )
          }))
        }))
      }))
    );
    const entrada = {
      id: auditoria.length + 1,
      usuario: usuario.nombre,
      accion: 'CARGA',
      descripcion: `Subió ${nombre}`,
      fecha: new Date().toLocaleString('es-EC'),
      hash: Math.random().toString(36).substring(2).repeat(4),
      tipo: 'CARGA',
    };
    setAuditoria(prev => [entrada, ...prev]);
  }

  function agregarUniversidad(datos) {
    setUniversidades(prev => [...prev, { ...datos, id: Date.now(), facultades: [] }]);
  }

  function agregarFacultad(univId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? { ...u, facultades: [...u.facultades, { ...datos, id: Date.now(), criterios: [] }] }
        : u
      )
    );
  }

  function agregarCriterio(univId, facultadId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? { ...f, criterios: [...f.criterios, { ...datos, id: Date.now(), actividades: [] }] }
            : f
          )
        }
        : u
      )
    );
  }

  function agregarActividad(univId, facultadId, criterioId, datos) {
    setUniversidades(prev =>
      prev.map(u => u.id === univId
        ? {
          ...u, facultades: u.facultades.map(f => f.id === facultadId
            ? {
              ...f, criterios: f.criterios.map(c => c.id === criterioId
                ? { ...c, actividades: [...c.actividades, { ...datos, id: Date.now(), documentos: [] }] }
                : c
              )
            }
            : f
          )
        }
        : u
      )
    );
  }

  // Métricas calculadas dinámicamente
  const todosLosDocs = universidades.flatMap(u =>
    u.facultades.flatMap(f =>
      f.criterios.flatMap(c =>
        c.actividades.flatMap(a => a.documentos)
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
      isAutenticado, login, logout,
      universidades, setUniversidades,
      auditoria, alertas,
      documentoSeleccionado, setDocumentoSeleccionado,
      modalFirmaAbierto, setModalFirmaAbierto,
      firmarDocumento, rechazarDocumento, subirDocumento,
      agregarUniversidad, agregarFacultad, agregarCriterio, agregarActividad,
      metricas,
      todosLosDocs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

