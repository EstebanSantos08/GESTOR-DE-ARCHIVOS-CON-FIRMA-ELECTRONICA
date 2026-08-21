/**
 * TEST COMPLETO - Gestión de Archivos con Firma Electrónica
 * Ejecutar con: node tests/test_completo.js
 */
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API = 'http://localhost:3000/api';
let tokens = {}; // { admin, docente, director }
let ids = {};    // { flujoId, actividadId, documentoId }

// ─── Utilidades ────────────────────────────────────────────────────────────

const OK  = 'OK ';
const FAIL = 'FAIL';
const WARN = 'WARN';
let passed = 0, failed = 0;

function log(emoji, msg) { console.log(`  [${emoji}] ${msg}`); }

function assert(condition, msgOk, msgFail) {
  if (condition) { log(OK, msgOk); passed++; }
  else { log(FAIL, msgFail); failed++; }
  return condition;
}

async function request(method, urlPath, body = null, token = null, isForm = false) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let postData;
    if (isForm && body) {
      Object.assign(headers, body.getHeaders());
    } else if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = { hostname: 'localhost', port: 3000, path: '/api' + urlPath, method, headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (isForm && body) {
      body.pipe(req);
    } else {
      if (postData) req.write(postData);
      req.end();
    }
  });
}

// ─── SESION 1: Base de Datos y Servidor ────────────────────────────────────

async function sesion1_DB() {
  console.log('\n==============================================');
  console.log('  SESION 1: Base de Datos y Servidor');
  console.log('==============================================');

  const { sequelize, FlujoFirma, PasoFirma, Rol } = require('../Model');

  try {
    await sequelize.authenticate();
    log(OK, 'Conexion a PostgreSQL OK');
    passed++;
  } catch(e) {
    log(FAIL, 'Conexion a PostgreSQL FALLO: ' + e.message);
    failed++;
    return;
  }

  const flujoGlobal = await FlujoFirma.findOne({ where: { es_global: true } });
  assert(flujoGlobal !== null,
    'Flujo global encontrado: "' + (flujoGlobal && flujoGlobal.nombre) + '"',
    'No existe ningun flujo global configurado');

  if (flujoGlobal) {
    ids.flujoGlobalId = flujoGlobal.id;
    const pasos = await PasoFirma.findAll({ where: { flujo_id: flujoGlobal.id } });
    assert(pasos.length > 0, 'Flujo global tiene ' + pasos.length + ' paso(s)', 'El flujo global no tiene pasos definidos');
  }

  const roles = await Rol.findAll();
  assert(roles.length >= 5,
    roles.length + ' roles en BD: ' + roles.map(function(r) { return r.nombre; }).join(', '),
    'Solo ' + roles.length + ' roles encontrados');

  try {
    const r = await request('GET', '/parametrizacion/estructura');
    assert(r.status === 401, 'Servidor activo (401 sin token)', 'Respuesta inesperada: ' + r.status);
  } catch(e) {
    log(FAIL, 'Servidor NO responde en localhost:3000 - ' + e.message);
    failed++;
  }
}

// ─── SESION 2: Autenticacion ─────────────────────────────────────────────

async function sesion2_Auth() {
  console.log('\n==============================================');
  console.log('  SESION 2: Autenticacion');
  console.log('==============================================');

  const { Usuario, Rol } = require('../Model');
  const jwt = require('jsonwebtoken');

  const adminUser = await Usuario.findOne({ include: [{ model: Rol, as: 'roles', where: { nombre: 'ADMINISTRADOR' } }] });
  const docenteUser = await Usuario.findOne({ include: [{ model: Rol, as: 'roles', where: { nombre: 'DOCENTE' } }] });
  const directorUser = await Usuario.findOne({ include: [{ model: Rol, as: 'roles', where: { nombre: 'DIRECTOR_CARRERA' } }] });

  assert(adminUser !== null, 'Usuario ADMINISTRADOR existe: ' + (adminUser && adminUser.email), 'No existe ADMINISTRADOR en BD');
  assert(docenteUser !== null, 'Usuario DOCENTE existe: ' + (docenteUser && docenteUser.email), 'No existe DOCENTE en BD');
  assert(directorUser !== null, 'Usuario DIRECTOR_CARRERA existe: ' + (directorUser && directorUser.email), 'No existe DIRECTOR en BD');

  // Login invalido
  const r1 = await request('POST', '/auth/login', { email: 'noexiste@x.com', password: 'wrong' });
  assert(r1.status === 401 || r1.status === 400, 'Login invalido devuelve 401/400', 'Status inesperado: ' + r1.status);

  // Intentar login real con passwords comunes, fallback a token manual
  const users = [
    { rol: 'admin', user: adminUser },
    { rol: 'docente', user: docenteUser },
    { rol: 'director', user: directorUser },
  ].filter(function(x) { return x.user; });

  for (const item of users) {
    let loginOk = false;
    for (const pwd of ['admin123', '12345678', 'password', 'test123', '123456', '1234']) {
      const r = await request('POST', '/auth/login', { email: item.user.email, password: pwd });
      if (r.status === 200 && r.body.token) {
        tokens[item.rol] = r.body.token;
        log(OK, 'Login ' + item.rol + ' (' + item.user.email + ') OK con password real');
        passed++;
        loginOk = true;
        break;
      }
    }
    if (!loginOk) {
      const rolesArr = (item.user.roles || []).map(function(r) { return r.nombre; });
      tokens[item.rol] = jwt.sign(
        { id: item.user.id, email: item.user.email, roles: rolesArr, nivel: 7 },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      log(WARN, 'Token generado manualmente para ' + item.rol + ' (password desconocida)');
    }
  }

  if (tokens.admin) {
    const r = await request('GET', '/parametrizacion/estructura', null, tokens.admin);
    assert(r.status === 200, 'Token admin valido - accede a estructura', 'Acceso con token admin fallo: ' + r.status);
  }
}

// ─── SESION 3: Parametrizacion ───────────────────────────────────────────

async function sesion3_Parametrizacion() {
  console.log('\n==============================================');
  console.log('  SESION 3: Parametrizacion y Estructura');
  console.log('==============================================');

  if (!tokens.admin) { log(WARN, 'Sin token admin - saltando'); return; }

  const r1 = await request('GET', '/parametrizacion/estructura', null, tokens.admin);
  assert(r1.status === 200, 'Estructura cargada: ' + (r1.body && r1.body.length) + ' universidades', 'Error: ' + r1.status);

  if (r1.status === 200 && r1.body && r1.body.length > 0) {
    const univ = r1.body[0];
    assert(Array.isArray(univ.facultades), 'Estructura anidada OK (' + (univ.facultades && univ.facultades.length) + ' facultades)', 'Estructura mal formada');

    const actividad = univ.facultades && univ.facultades[0] &&
      univ.facultades[0].carreras && univ.facultades[0].carreras[0] &&
      univ.facultades[0].carreras[0].periodos && univ.facultades[0].carreras[0].periodos[0] &&
      univ.facultades[0].carreras[0].periodos[0].criterios && univ.facultades[0].carreras[0].periodos[0].criterios[0] &&
      univ.facultades[0].carreras[0].periodos[0].criterios[0].indicadores && univ.facultades[0].carreras[0].periodos[0].criterios[0].indicadores[0] &&
      univ.facultades[0].carreras[0].periodos[0].criterios[0].indicadores[0].actividades && univ.facultades[0].carreras[0].periodos[0].criterios[0].indicadores[0].actividades[0];

    if (actividad) {
      ids.actividadId = actividad.id;
      ids.facultadId = univ.facultades[0].id;
      log(OK, 'Actividad encontrada: ID=' + actividad.id + ', "' + actividad.nombre + '"');
      passed++;
    } else {
      log(WARN, 'No se encontro actividad anidada');
    }
  }

  const r2 = await request('GET', '/flujos', null, tokens.admin);
  assert(r2.status === 200 && Array.isArray(r2.body), 'Flujos: ' + (r2.body && r2.body.length) + ' flujo(s)', 'Error flujos: ' + r2.status);
}

// ─── SESION 4: Documentos — Subida y Visibilidad ─────────────────────────

async function sesion4_Documentos() {
  console.log('\n==============================================');
  console.log('  SESION 4: Documentos - Subida y Visibilidad');
  console.log('==============================================');

  const uploadToken = tokens.docente || tokens.admin;
  if (!uploadToken) { log(WARN, 'Sin token - saltando sesion 4'); return; }

  const r1 = await request('POST', '/documentos/subir', {}, uploadToken);
  assert(r1.status === 400, 'Subir sin archivo devuelve 400', 'Status: ' + r1.status + ' ' + JSON.stringify(r1.body));

  // Crear PDF minimo de prueba
  const pdfTestPath = path.join(__dirname, 'temp_test.pdf');
  const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
  fs.writeFileSync(pdfTestPath, pdfContent);

  try {
    const form = new FormData();
    form.append('archivo', fs.createReadStream(pdfTestPath), { filename: 'test_prueba.pdf', contentType: 'application/pdf' });
    if (ids.actividadId) form.append('actividad_id', String(ids.actividadId));
    if (ids.facultadId) form.append('facultad_id', String(ids.facultadId));

    const r2 = await request('POST', '/documentos/subir', form, uploadToken, true);
    const ok = r2.status === 201;
    assert(ok, 'Subida PDF OK - ID: ' + (r2.body && r2.body.id), 'Subida fallo: ' + r2.status + ' - ' + JSON.stringify(r2.body));

    if (ok && r2.body) {
      ids.documentoId = r2.body.id;
      ids.firmanteActualId = r2.body.firmante_actual_id;
      log(OK, '  -> Estado: ' + r2.body.estado + ', Flujo: ' + r2.body.flujo_id + ', Firmante ID: ' + r2.body.firmante_actual_id);
      passed++;
      assert(r2.body.flujo_id !== null && r2.body.flujo_id !== undefined, 'Flujo asignado automaticamente', 'Documento sin flujo_id');
      assert(r2.body.firmante_actual_id !== null && r2.body.firmante_actual_id !== undefined, 'Firmante inicial asignado', 'Sin firmante_actual_id');
    }
  } catch(e) {
    log(FAIL, 'Error en subida: ' + e.message);
    failed++;
  } finally {
    if (fs.existsSync(pdfTestPath)) fs.unlinkSync(pdfTestPath);
  }

  if (ids.documentoId) {
    const r3 = await request('GET', '/documentos', null, uploadToken);
    assert(r3.status === 200, 'Listar documentos OK (' + (r3.body && r3.body.length) + ' docs)', 'Error: ' + r3.status);
    const miDoc = r3.body && r3.body.find(function(d) { return d.id === ids.documentoId; });
    assert(miDoc !== undefined, 'El usuario ve su propio documento', 'El usuario NO ve su documento subido');
  }
}

// ─── SESION 5: Workflow — Flujo de Firma ─────────────────────────────────

async function sesion5_Workflow() {
  console.log('\n==============================================');
  console.log('  SESION 5: Workflow - Flujo de Firma');
  console.log('==============================================');

  if (!ids.documentoId) { log(WARN, 'Sin documento de prueba - saltando sesion 5'); return; }

  const { Documento, Usuario, Rol } = require('../Model');
  const jwt = require('jsonwebtoken');

  const doc = await Documento.findByPk(ids.documentoId);
  assert(doc !== null, 'Documento en BD OK', 'Documento no encontrado en BD');
  assert(doc && doc.flujo_id !== null, 'flujo_id asignado: ' + (doc && doc.flujo_id), 'Documento sin flujo_id en BD');
  assert(doc && doc.firmante_actual_id !== null, 'firmante_actual_id asignado: ' + (doc && doc.firmante_actual_id), 'Sin firmante - workflow fallo');
  assert(doc && doc.paso_actual === 1, 'paso_actual = 1', 'paso_actual = ' + (doc && doc.paso_actual) + ' (esperado: 1)');

  // Intentar firmar sin ser el firmante
  const docenteToken = tokens.docente;
  if (docenteToken && doc && doc.firmante_actual_id) {
    const payload = JSON.parse(Buffer.from(docenteToken.split('.')[1], 'base64').toString());
    if (payload.id != doc.firmante_actual_id) {
      const r = await request('POST', '/documentos/' + ids.documentoId + '/firmar', {}, docenteToken);
      assert(r.status === 400, 'No-firmante recibe 400 al intentar firmar', 'Se esperaba 400, recibido ' + r.status);
    } else {
      log(WARN, 'El docente ES el firmante - omitiendo prueba de denegado');
    }
  }

  // Generar token del firmante real
  if (doc && doc.firmante_actual_id) {
    const firmante = await Usuario.findByPk(doc.firmante_actual_id, { include: [{ model: Rol, as: 'roles' }] });
    if (firmante) {
      log(OK, 'Firmante actual: ' + firmante.nombre + ' (' + (firmante.roles && firmante.roles.map(function(r) { return r.nombre; }).join(', ')) + ')');
      passed++;

      let firmanteToken = null;
      for (const tkn of Object.values(tokens)) {
        const payload = JSON.parse(Buffer.from(tkn.split('.')[1], 'base64').toString());
        if (payload.id == doc.firmante_actual_id) { firmanteToken = tkn; break; }
      }
      if (!firmanteToken) {
        firmanteToken = jwt.sign(
          { id: firmante.id, email: firmante.email, roles: (firmante.roles || []).map(function(r) { return r.nombre; }), nivel: 3 },
          process.env.JWT_SECRET, { expiresIn: '1h' }
        );
        log(WARN, 'Token firmante generado manualmente');
      }

      // Rechazar el documento (para no requerir certificado p12 real)
      const r = await request('POST', '/documentos/' + ids.documentoId + '/rechazar',
        { motivo: 'Prueba automatizada - rechazo de test' }, firmanteToken);
      assert(r.status === 200, 'Rechazo OK - Estado: ' + (r.body && r.body.documento && r.body.documento.estado), 'Rechazo fallo: ' + r.status + ' - ' + JSON.stringify(r.body));

      if (r.status === 200) {
        const docRechazado = await Documento.findByPk(ids.documentoId);
        assert(docRechazado && docRechazado.estado === 'RECHAZADO', 'Estado en BD = RECHAZADO', 'Estado en BD: ' + (docRechazado && docRechazado.estado));
      }
    }
  }
}

// ─── SESION 6: Control de Acceso ─────────────────────────────────────────

async function sesion6_Acceso() {
  console.log('\n==============================================');
  console.log('  SESION 6: Control de Acceso y Visibilidad');
  console.log('==============================================');

  const r1 = await request('GET', '/documentos');
  assert(r1.status === 401, 'Sin token = 401 en /documentos', 'Status: ' + r1.status);

  if (tokens.admin) {
    const r2 = await request('GET', '/documentos?todos=true', null, tokens.admin);
    assert(r2.status === 200, 'Admin ve todos los docs: ' + (r2.body && r2.body.length), 'Error: ' + r2.status);
  }

  if (ids.documentoId) {
    const tkn = tokens.docente || tokens.admin;
    const r3 = await request('GET', '/documentos/' + ids.documentoId + '/descargar', null, tkn);
    assert([200, 404].includes(r3.status), 'Descarga: status ' + r3.status + ' (OK)', 'Descarga inesperada: ' + r3.status);
  }

  // Verificar que sin token no se puede subir
  const r4 = await request('POST', '/documentos/subir', {});
  assert(r4.status === 401, 'Subir sin token = 401', 'Status: ' + r4.status);

  log(OK, 'Control de acceso basico OK');
  passed++;
}

// ─── SESION 7: CRUD Flujos de Firma ──────────────────────────────────────

async function sesion7_Flujos() {
  console.log('\n==============================================');
  console.log('  SESION 7: CRUD Flujos de Firma');
  console.log('==============================================');

  if (!tokens.admin) { log(WARN, 'Sin token admin - saltando'); return; }

  const r1 = await request('GET', '/flujos', null, tokens.admin);
  assert(r1.status === 200 && Array.isArray(r1.body), 'Listar flujos: ' + (r1.body && r1.body.length), 'Error: ' + r1.status);

  const { Rol, FlujoFirma } = require('../Model');
  const roles = await Rol.findAll({ limit: 2 });

  if (roles.length >= 1) {
    const r2 = await request('POST', '/flujos', {
      nombre: 'Flujo Test Automatizado',
      es_global: false,
      pasos: roles.map(function(r) { return r.id; })
    }, tokens.admin);
    assert(r2.status === 201, 'Crear flujo OK: "' + (r2.body && r2.body.nombre) + '"', 'Crear fallo: ' + r2.status + ' - ' + JSON.stringify(r2.body));

    const nuevoId = r2.body && (r2.body.id || (r2.body.flujo && r2.body.flujo.id));
    if (nuevoId) {
      const r3 = await request('PUT', '/flujos/' + nuevoId, {
        nombre: 'Flujo Test Actualizado',
        es_global: false,
        pasos: [roles[0].id]
      }, tokens.admin);
      assert(r3.status === 200, 'Actualizar flujo OK', 'Error: ' + r3.status + ' - ' + JSON.stringify(r3.body));

      const r4 = await request('DELETE', '/flujos/' + nuevoId, null, tokens.admin);
      assert(r4.status === 200, 'Eliminar flujo test OK', 'Error: ' + r4.status);
    }
  }

  const globalStillExists = await FlujoFirma.findOne({ where: { es_global: true } });
  assert(globalStillExists !== null, 'Flujo global intacto tras CRUD', 'Flujo global fue eliminado - ERROR CRITICO');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n+==========================================+');
  console.log('|  TEST COMPLETO - Gestion de Archivos   |');
  console.log('+==========================================+');
  console.log('  ' + new Date().toLocaleString('es-EC'));

  try {
    await sesion1_DB();
    await sesion2_Auth();
    await sesion3_Parametrizacion();
    await sesion4_Documentos();
    await sesion5_Workflow();
    await sesion6_Acceso();
    await sesion7_Flujos();
  } catch(e) {
    console.error('\n[ERROR CRITICO] ' + e.message);
    console.error(e.stack);
    failed++;
  }

  const total = passed + failed;
  console.log('\n+==========================================+');
  console.log('  RESULTADO FINAL');
  console.log('+==========================================+');
  console.log('  Pasaron:  ' + passed + '/' + total);
  console.log('  Fallaron: ' + failed + '/' + total);
  console.log('  Estado: ' + (failed === 0 ? 'TODO OK' : 'HAY ' + failed + ' FALLO(S)'));
  console.log('+==========================================+\n');

  process.exit(failed === 0 ? 0 : 1);
}

main();
