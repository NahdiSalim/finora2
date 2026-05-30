import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  // Static flag: bucket check runs only once across all instances
  private static bucketInitialized = false;
  private static sharedClient: Minio.Client | null = null;
  private static sharedBucketName: string | null = null;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT')!;

    // Reuse shared client if already created
    if (MinioService.sharedClient) {
      this.minioClient = MinioService.sharedClient;
      this.bucketName = MinioService.sharedBucketName!;
      return;
    }

    // Skip initialization if MinIO is disabled
    if (!endpoint || endpoint === 'disabled' || endpoint === 'your-minio-endpoint') {
      this.logger.warn('⚠️  MinIO is disabled - Document upload will not work');
      return;
    }

    const port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY')?.trim() ?? '';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY')?.trim() ?? '';
    const region = this.configService.get<string>('MINIO_REGION')?.trim() || 'us-east-1';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET')?.trim() || 'finora-documents';

    this.minioClient = new Minio.Client({
      endPoint: endpoint.trim(),
      port,
      useSSL,
      accessKey,
      secretKey,
      region,
    });

    this.logger.log(`MinIO client: ${endpoint}:${port} bucket=${this.bucketName} region=${region}`);

    MinioService.sharedClient = this.minioClient;
    MinioService.sharedBucketName = this.bucketName;
  }

  async onModuleInit() {
    // Skip if already initialized or client not available
    if (MinioService.bucketInitialized || !this.minioClient) {
      return;
    }
    MinioService.bucketInitialized = true;

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`✅ Bucket ${this.bucketName} created successfully`);
      } else {
        this.logger.log(`✅ Bucket ${this.bucketName} already exists`);
      }
    } catch (error) {
      this.logger.warn(`⚠️  MinIO connection failed: ${error.message}`);
      this.logger.warn('⚠️  Document upload features will not work until MinIO is configured');
    }
  }

  /**
   * Sanitize filename for MinIO (remove special characters and spaces)
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace special characters
    return filename
      .normalize('NFD') // Normalize unicode characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s.-]/g, '') // Keep only alphanumeric, spaces, dots, dashes
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase(); // Convert to lowercase for consistency
  }

  /**
   * Sanitize path for MinIO (remove special characters from path segments)
   */
  private sanitizePath(path: string): string {
    if (!path || path.trim() === '') return '';

    return path
      .split('/')
      .map((segment) => this.sanitizeFilename(segment))
      .filter((segment) => segment.length > 0)
      .join('/');
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(companyId: number, path: string, file: Express.Multer.File): Promise<string> {
    if (!this.minioClient) {
      throw new Error(
        'SERVICE_UNAVAILABLE: MinIO storage is not configured. Please contact your administrator.'
      );
    }

    const sanitizedPath = this.sanitizePath(path);
    const sanitizedFilename = this.sanitizeFilename(file.originalname);

    // Build object name with sanitized components
    const pathParts = [`company_${companyId}`];
    if (sanitizedPath) {
      pathParts.push(sanitizedPath);
    }
    pathParts.push(sanitizedFilename);

    const objectName = pathParts.join('/');

    // Only ASCII-safe metadata — non-ASCII in x-amz-meta-* breaks S3 signatures (SignatureDoesNotMatch)
    const metadata: Record<string, string> = {
      'Content-Type': file.mimetype || 'application/octet-stream',
    };
    const safeOriginalName = this.sanitizeFilename(file.originalname);
    if (safeOriginalName) {
      metadata['X-Original-Name'] = safeOriginalName;
    }

    await this.minioClient.putObject(this.bucketName, objectName, file.buffer, file.size, metadata);

    this.logger.log(`File uploaded: ${objectName}`);
    return objectName;
  }

  /**
   * Upload a file from buffer
   */
  async uploadFromBuffer(
    companyId: number,
    path: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const sanitizedPath = this.sanitizePath(path);
    const sanitizedFilename = this.sanitizeFilename(fileName);

    // Build object name with sanitized components
    const pathParts = [`company_${companyId}`];
    if (sanitizedPath) {
      pathParts.push(sanitizedPath);
    }
    pathParts.push(sanitizedFilename);

    const objectName = pathParts.join('/');

    const metadata = {
      'Content-Type': mimeType,
    };

    await this.minioClient.putObject(this.bucketName, objectName, buffer, buffer.length, metadata);

    this.logger.log(`File uploaded from buffer: ${objectName}`);
    return objectName;
  }

  /**
   * Download a file from MinIO
   */
  async downloadFile(objectName: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucketName, objectName);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Get file stream
   */
  async getFileStream(objectName: string): Promise<Readable> {
    return await this.minioClient.getObject(this.bucketName, objectName);
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, objectName);
    this.logger.log(`File deleted: ${objectName}`);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(objectNames: string[]): Promise<void> {
    await this.minioClient.removeObjects(this.bucketName, objectNames);
    this.logger.log(`${objectNames.length} files deleted`);
  }

  /**
   * List files in a folder
   */
  async listFiles(companyId: number, folderPath: string = ''): Promise<Minio.BucketItem[]> {
    const prefix = `company_${companyId}/${folderPath}`;
    const stream = this.minioClient.listObjects(this.bucketName, prefix, false);

    return new Promise((resolve, reject) => {
      const files: Minio.BucketItem[] = [];
      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj as Minio.BucketItem);
        }
      });
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(objectName: string): Promise<Minio.BucketItemStat> {
    return await this.minioClient.statObject(this.bucketName, objectName);
  }

  /**
   * Generate presigned URL for file download (valid for 1 hour by default).
   *
   * If MINIO_PUBLIC_URL is set, the internal MinIO endpoint in the generated URL
   * is replaced with that public URL so browsers can reach the files directly.
   * Example: MINIO_PUBLIC_URL=http://localhost:9000
   */
  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    if (!this.minioClient) {
      throw new Error('SERVICE_UNAVAILABLE: MinIO storage is not configured.');
    }

    const url = await this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds
    );

    const publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');
    if (publicUrl) {
      const protocol =
        this.configService.get<string>('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT')!;
      const port = this.configService.get<string>('MINIO_PORT') || '9000';
      const internalOrigin = `${protocol}://${endpoint}:${port}`;
      return url.replace(internalOrigin, publicUrl.replace(/\/$/, ''));
    }

    return url;
  }

  /**
   * Copy a file
   */
  async copyFile(sourceObjectName: string, destObjectName: string): Promise<void> {
    await this.minioClient.copyObject(
      this.bucketName,
      destObjectName,
      `/${this.bucketName}/${sourceObjectName}`
    );
    this.logger.log(`File copied from ${sourceObjectName} to ${destObjectName}`);
  }

  /**
   * Check if file exists
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file as buffer (alias for downloadFile)
   */
  async getFileBuffer(objectName: string): Promise<Buffer> {
    return this.downloadFile(objectName);
  }

  /**
   * Upload buffer with custom path
   */
  async uploadBuffer(
    companyId: number,
    fullPath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    if (!this.minioClient) {
      throw new Error(
        'SERVICE_UNAVAILABLE: MinIO storage is not configured. Please contact your administrator.'
      );
    }

    const objectName = `company_${companyId}/${fullPath}`;

    const metadata = {
      'Content-Type': mimeType,
    };

    await this.minioClient.putObject(this.bucketName, objectName, buffer, buffer.length, metadata);

    this.logger.log(`Buffer uploaded: ${objectName}`);
    return objectName;
  }
}
