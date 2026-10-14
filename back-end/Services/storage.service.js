'use strict';

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

class StorageService {
  constructor() {
    this.r2AccountId = process.env.R2_ACCOUNT_ID;
    this.r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.r2BucketName = process.env.R2_BUCKET_NAME;
    this.uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads');

    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    if (this.estaConfiguradoR2()) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.r2AccessKeyId,
          secretAccessKey: this.r2SecretAccessKey,
        },
      });
      console.log(`☁️ Cloudflare R2 habilitado para almacenamiento persistente (Bucket: ${this.r2BucketName})`);
    } else {
      this.s3Client = null;
      console.log('📁 Cloudflare R2 no configurado. Usando almacenamiento en disco local:', this.uploadsDir);
    }
  }

  /**
   * Comprueba si las variables de entorno de Cloudflare R2 están presentes.
   */
  estaConfiguradoR2() {
    return Boolean(
      this.r2AccountId &&
      this.r2AccessKeyId &&
      this.r2SecretAccessKey &&
      this.r2BucketName
    );
  }

  /**
   * Guarda un archivo (Buffer) en Cloudflare R2 o en disco local.
   * @param {{ buffer: Buffer, nombreOriginal: string, subcarpeta?: string }} opciones
   * @returns {Promise<string>} Clave (ej: "r2://documentos/1728...pdf") o ruta local
   */
  async guardarArchivo({ buffer, nombreOriginal, subcarpeta = 'documentos' }) {
    const timestamp = Date.now();
    const nombreSeguro = (nombreOriginal || 'documento.pdf').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${subcarpeta}/${timestamp}_${nombreSeguro}`;

    if (this.estaConfiguradoR2()) {
      const command = new PutObjectCommand({
        Bucket: this.r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      });
      await this.s3Client.send(command);
      return `r2://${key}`;
    }

    // Fallback: disco local
    const destinoDir = path.join(this.uploadsDir, subcarpeta);
    if (!fs.existsSync(destinoDir)) fs.mkdirSync(destinoDir, { recursive: true });
    const rutaArchivo = path.join(destinoDir, `${timestamp}_${nombreSeguro}`);
    fs.writeFileSync(rutaArchivo, buffer);
    return path.resolve(rutaArchivo);
  }

  /**
   * Obtiene el Buffer del archivo desde Cloudflare R2 o disco local.
   * @param {string} rutaOClave
   * @returns {Promise<Buffer|null>}
   */
  async obtenerBuffer(rutaOClave) {
    if (!rutaOClave) return null;

    // Caso 1: Archivo almacenado en Cloudflare R2
    if (rutaOClave.startsWith('r2://')) {
      if (!this.estaConfiguradoR2()) {
        throw new Error('El documento está almacenado en Cloudflare R2 pero las variables de entorno de R2 no están configuradas en el servidor.');
      }
      const key = rutaOClave.replace(/^r2:\/\//, '');
      const command = new GetObjectCommand({
        Bucket: this.r2BucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    // Caso 2: Archivo en disco local (o migrado de versiones anteriores)
    const rutaFinal = this.resolverRutaLocal(rutaOClave);
    if (rutaFinal && fs.existsSync(rutaFinal)) {
      return fs.readFileSync(rutaFinal);
    }

    // Caso 3: Si no existe en local y R2 está configurado, intentar buscar por clave en R2
    if (this.estaConfiguradoR2()) {
      try {
        const keyFallback = rutaOClave.replace(/\\/g, '/').replace(/^\.?\/?uploads\//, 'documentos/');
        const command = new GetObjectCommand({
          Bucket: this.r2BucketName,
          Key: keyFallback,
        });
        const response = await this.s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } catch {
        // No encontrado en R2
      }
    }

    return null;
  }

  /**
   * Elimina un archivo en Cloudflare R2 o disco local.
   * @param {string} rutaOClave
   */
  async eliminarArchivo(rutaOClave) {
    if (!rutaOClave) return;

    if (rutaOClave.startsWith('r2://')) {
      if (this.estaConfiguradoR2()) {
        try {
          const key = rutaOClave.replace(/^r2:\/\//, '');
          const command = new DeleteObjectCommand({
            Bucket: this.r2BucketName,
            Key: key,
          });
          await this.s3Client.send(command);
        } catch (err) {
          console.warn('⚠️ Error al eliminar objeto en R2:', err.message);
        }
      }
      return;
    }

    const rutaFinal = this.resolverRutaLocal(rutaOClave);
    if (rutaFinal && fs.existsSync(rutaFinal)) {
      try {
        fs.unlinkSync(rutaFinal);
      } catch (err) {
        console.warn('⚠️ Error al eliminar archivo local:', err.message);
      }
    }
  }

  resolverRutaLocal(rutaGuardada) {
    if (!rutaGuardada) return null;
    if (fs.existsSync(rutaGuardada)) return path.resolve(rutaGuardada);
    const desdeCwd = path.resolve(process.cwd(), rutaGuardada);
    if (fs.existsSync(desdeCwd)) return desdeCwd;
    const desdeBackend = path.resolve(__dirname, '..', rutaGuardada);
    if (fs.existsSync(desdeBackend)) return desdeBackend;
    const enUploads = path.resolve(this.uploadsDir, path.basename(rutaGuardada));
    if (fs.existsSync(enUploads)) return enUploads;
    return null;
  }
}

module.exports = new StorageService();
