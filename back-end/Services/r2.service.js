'use strict';

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
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

const REGEX_BUCKET_R2 = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function obtenerConfigR2() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function usarAlmacenamientoLocal() {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = obtenerConfigR2();
  const faltaR2 = !accountId || !accessKeyId || !secretAccessKey || !bucketName;
  return faltaR2 && process.env.NODE_ENV !== 'production';
}

function rutaLocalParaClave(key) {
  const baseDir = path.resolve(__dirname, '..', process.env.UPLOADS_DIR || './uploads');
  return path.join(baseDir, key);
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

async function _asegurarBucketExisteInterno() {
  if (usarAlmacenamientoLocal()) {
    const baseDir = path.resolve(__dirname, '..', process.env.UPLOADS_DIR || './uploads');
    fs.mkdirSync(baseDir, { recursive: true });
    return 'local-dev-uploads';
  }

  const { bucketName } = obtenerConfigR2();

  if (!bucketName || !REGEX_BUCKET_R2.test(bucketName)) {
    throw new Error(
      `El nombre de bucket R2 "${bucketName}" no es válido. Debe tener entre 3 y 63 caracteres, contener únicamente minúsculas, números y guiones, y no comenzar ni terminar con guion.`
    );
  }

  const client = getS3Client();

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
    }

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
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    }

    return bucketName;
  }
}

function asegurarBucketExiste() {
  if (!bucketPromise) {
    bucketPromise = _asegurarBucketExisteInterno().catch((err) => {
      bucketPromise = null;
      throw err;
    });
  }
  return bucketPromise;
}

async function subirArchivoR2(key, buffer, contentType = 'application/pdf') {
  if (usarAlmacenamientoLocal()) {
    const filePath = rutaLocalParaClave(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return { key, bucket: 'local-dev-uploads', contentLength: buffer.length };
  }

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

async function obtenerBufferR2(key) {
  if (usarAlmacenamientoLocal()) {
    const filePath = rutaLocalParaClave(key);
    if (!fs.existsSync(filePath)) {
      throw new ArchivoNoEncontradoError(`Archivo "${key}" no encontrado en almacenamiento local`, key);
    }
    return fs.readFileSync(filePath);
  }

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

async function obtenerStreamR2(key) {
  if (usarAlmacenamientoLocal()) {
    const filePath = rutaLocalParaClave(key);
    if (!fs.existsSync(filePath)) {
      throw new ArchivoNoEncontradoError(`Archivo "${key}" no encontrado en almacenamiento local`, key);
    }
    const stat = fs.statSync(filePath);
    return {
      stream: fs.createReadStream(filePath),
      contentLength: stat.size,
      contentType: 'application/pdf',
    };
  }

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

async function eliminarArchivoR2(key) {
  if (!key) return;
  if (usarAlmacenamientoLocal()) {
    const filePath = rutaLocalParaClave(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    return;
  }

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

async function eliminarPorPrefijoR2(prefix) {
  if (usarAlmacenamientoLocal()) {
    const dirPath = rutaLocalParaClave(prefix);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    return 0;
  }

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
