'use strict';

const {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

// ─── Error Personalizado ──────────────────────────────────────────────────
class ArchivoNoEncontradoError extends Error {
  constructor(mensaje = 'Archivo no encontrado en Cloudflare R2', clave = null) {
    super(mensaje);
    this.name = 'ArchivoNoEncontradoError';
    this.status = 404;
    this.clave = clave;
  }
}

// ─── Reglas de nombrado de Bucket R2 ─────────────────────────────────────
// 3 a 63 caracteres, minúsculas, números y guiones, sin empezar ni terminar con guion.
const REGEX_BUCKET_R2 = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function obtenerConfigR2() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

// ─── S3Client Singleton para Cloudflare R2 ────────────────────────────────
let s3ClientInstance = null;

function getS3Client() {
  if (!s3ClientInstance) {
    const { accountId, accessKeyId, secretAccessKey } = obtenerConfigR2();

    s3ClientInstance = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3ClientInstance;
}

// ─── Control de Caché en Memoria para verificación del Bucket ──────────────
let bucketPromise = null;

function _esErrorAccesoDenegado(err) {
  return (
    err.name === 'AccessDenied' ||
    err.name === 'UnauthorizedOperation' ||
    err.$metadata?.httpStatusCode === 403 ||
    err.Code === 'AccessDenied'
  );
}

function _esErrorNoEncontrado(err) {
  return (
    err.name === 'NotFound' ||
    err.name === 'NoSuchBucket' ||
    err.name === 'NoSuchKey' ||
    err.$metadata?.httpStatusCode === 404 ||
    err.Code === 'NoSuchBucket' ||
    err.Code === 'NoSuchKey'
  );
}

function _esErrorBucketYaExiste(err) {
  return (
    err.name === 'BucketAlreadyOwnedByYou' ||
    err.name === 'BucketAlreadyExists' ||
    err.$metadata?.httpStatusCode === 409 ||
    err.Code === 'BucketAlreadyOwnedByYou' ||
    err.Code === 'BucketAlreadyExists'
  );
}

/**
 * Valida el nombre del bucket y asegura su existencia en Cloudflare R2.
 * Si no existe, lo crea automáticamente y valida su disponibilidad con reintentos exponenciales.
 *
 * @returns {Promise<string>} Nombre del bucket verificado
 */
async function _asegurarBucketExisteInterno() {
  const { bucketName } = obtenerConfigR2();

  if (!bucketName || !REGEX_BUCKET_R2.test(bucketName)) {
    throw new Error(
      `El nombre de bucket R2 "${bucketName}" no es válido. Debe tener entre 3 y 63 caracteres, contener únicamente minúsculas, números y guiones, y no comenzar ni terminar con guion.`
    );
  }

  const client = getS3Client();

  // 1. Verificar si el bucket ya existe
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return bucketName;
  } catch (err) {
    if (_esErrorAccesoDenegado(err)) {
      throw new Error(
        'El token de Cloudflare R2 no tiene permiso Admin Read & Write. Debe regenerar el token con dicho permiso en Cloudflare (R2 → Manage R2 API Tokens).'
      );
    }

    if (!_esErrorNoEncontrado(err)) {
      throw new Error(`Error inesperado al consultar el bucket R2: ${err.message}`);
    }

    // 2. Si es 404, crear el bucket
    console.log(`[R2] Bucket "${bucketName}" no encontrado. Creando automáticamente...`);
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`[R2] Bucket "${bucketName}" creado exitosamente.`);
    } catch (createErr) {
      if (_esErrorAccesoDenegado(createErr)) {
        throw new Error(
          'El token de Cloudflare R2 no tiene permiso Admin Read & Write para crear buckets. Debe regenerar el token con dicho permiso en Cloudflare (R2 → Manage R2 API Tokens).'
        );
      }
      if (!_esErrorBucketYaExiste(createErr)) {
        throw new Error(`Error al crear el bucket en Cloudflare R2: ${createErr.message}`);
      }
      // Si ya existe (concurrencia de múltiples réplicas), continuar
    }

    // 3. Confirmar disponibilidad con hasta 3 reintentos y espera exponencial (500 ms, 1 s, 2 s)
    const esperas = [500, 1000, 2000];
    let disponible = false;

    for (let intento = 0; intento < esperas.length; intento++) {
      await new Promise((resolve) => setTimeout(resolve, esperas[intento]));
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucketName }));
        disponible = true;
        break;
      } catch (checkErr) {
        if (_esErrorAccesoDenegado(checkErr)) {
          throw new Error(
            'El token de Cloudflare R2 no tiene permiso Admin Read & Write. Debe regenerar el token con dicho permiso en Cloudflare.'
          );
        }
      }
    }

    if (!disponible) {
      // Intento final directo
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    }

    return bucketName;
  }
}

/**
 * Función pública que cachea la promesa para evitar verificaciones concurrentes o duplicadas.
 * Si falla, limpia la caché para permitir un nuevo intento posterior.
 */
function asegurarBucketExiste() {
  if (!bucketPromise) {
    bucketPromise = _asegurarBucketExisteInterno().catch((err) => {
      bucketPromise = null; // Limpiar caché si falla
      throw err;
    });
  }
  return bucketPromise;
}

/**
 * Sube un buffer a Cloudflare R2.
 *
 * @param {string} key
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<{ key: string, bucket: string, contentLength: number }>}
 */
async function subirArchivoR2(key, buffer, contentType = 'application/pdf') {
  const bucket = await asegurarBucketExiste();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    })
  );

  return { key, bucket, contentLength: buffer.length };
}

/**
 * Obtiene el contenido completo de un objeto en Cloudflare R2 como Buffer.
 *
 * @param {string} key
 * @returns {Promise<Buffer>}
 */
async function obtenerBufferR2(key) {
  const bucket = await asegurarBucketExiste();
  const client = getS3Client();

  try {
    const respuesta = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const byteArray = await respuesta.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err) {
    if (_esErrorNoEncontrado(err)) {
      throw new ArchivoNoEncontradoError(`Archivo "${key}" no encontrado en Cloudflare R2`, key);
    }
    throw err;
  }
}

/**
 * Obtiene el flujo de lectura (Stream) y metadatos de un objeto en Cloudflare R2.
 *
 * @param {string} key
 * @returns {Promise<{ stream: import('stream').Readable, contentLength: number, contentType: string }>}
 */
async function obtenerStreamR2(key) {
  const bucket = await asegurarBucketExiste();
  const client = getS3Client();

  try {
    const respuesta = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return {
      stream: respuesta.Body,
      contentLength: respuesta.ContentLength,
      contentType: respuesta.ContentType || 'application/pdf',
    };
  } catch (err) {
    if (_esErrorNoEncontrado(err)) {
      throw new ArchivoNoEncontradoError(`Archivo "${key}" no encontrado en Cloudflare R2`, key);
    }
    throw err;
  }
}

/**
 * Elimina un objeto de Cloudflare R2. Ignora si el objeto no existe.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function eliminarArchivoR2(key) {
  if (!key) return;
  const bucket = await asegurarBucketExiste();
  const client = getS3Client();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (err) {
    if (!_esErrorNoEncontrado(err)) {
      console.warn(`[R2] Advertencia al eliminar archivo "${key}":`, err.message);
    }
  }
}

/**
 * Elimina todos los objetos con el prefijo indicado de manera paginada en lotes de hasta 1000.
 *
 * @param {string} prefix
 * @returns {Promise<number>} Cantidad de objetos eliminados
 */
async function eliminarPorPrefijoR2(prefix) {
  const bucket = await asegurarBucketExiste();
  const client = getS3Client();
  let totalEliminados = 0;
  let continuationToken = undefined;

  do {
    const listado = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (listado.Contents && listado.Contents.length > 0) {
      const objetosParaBorrar = listado.Contents.map((obj) => ({ Key: obj.Key }));
      // Cloudflare R2 / S3 admite hasta 1000 claves por DeleteObjectsCommand
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objetosParaBorrar,
            Quiet: true,
          },
        })
      );
      totalEliminados += objetosParaBorrar.length;
    }

    continuationToken = listado.IsTruncated ? listado.NextContinuationToken : undefined;
  } while (continuationToken);

  return totalEliminados;
}

module.exports = {
  getS3Client,
  asegurarBucketExiste,
  subirArchivoR2,
  obtenerBufferR2,
  obtenerStreamR2,
  eliminarArchivoR2,
  eliminarPorPrefijoR2,
  ArchivoNoEncontradoError,
};
