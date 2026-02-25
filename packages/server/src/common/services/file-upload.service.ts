import { Injectable } from '@nestjs/common';
import { ApiError } from '../errors/api-error';
import * as fs from 'fs/promises';
import * as path from 'path';

export enum FileCategory {
  ACCOUNTANT_PATENT = 'accountants/patents',
  ACCOUNTANT_RNE = 'accountants/rne',
  USER_PHOTO = 'users/photos',
  COMPANY_LOGO = 'companies/logos',
  DOCUMENT = 'documents',
  TASK_ATTACHMENT = 'tasks/attachments',
}

@Injectable()
export class FileUploadService {
  private readonly baseUploadPath = 'uploads';

  /**
   * Save an uploaded file to the filesystem
   * @param file - The uploaded file from multer
   * @param category - The category/folder where to save the file
   * @param customName - Optional custom name for the file (without extension)
   * @returns The relative path to the saved file
   */
  async saveFile(
    file: Express.Multer.File,
    category: FileCategory,
    customName?: string
  ): Promise<string> {
    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const filename = customName
        ? `${customName}${fileExtension}`
        : `${timestamp}${fileExtension}`;

      // Define upload directory
      const uploadDir = path.join(process.cwd(), this.baseUploadPath, category);
      const filepath = path.join(uploadDir, filename);

      // Create directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });

      // Save file
      await fs.writeFile(filepath, file.buffer);

      // Return relative path for database storage
      return `${this.baseUploadPath}/${category}/${filename}`;
    } catch (error) {
      console.error('Error saving file:', error);
      throw new ApiError('Failed to save file', 500, 'FILE_SAVE_ERROR');
    }
  }

  /**
   * Delete a file from the filesystem
   * @param filepath - The relative path to the file
   */
  async deleteFile(filepath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), filepath);
      await fs.unlink(fullPath);
      console.log(`File deleted: ${filepath}`);
    } catch (error) {
      console.error(`Error deleting file ${filepath}:`, error);
      // Don't throw error, just log it
    }
  }

  /**
   * Delete multiple files
   * @param filepaths - Array of relative paths to files
   */
  async deleteFiles(filepaths: string[]): Promise<void> {
    await Promise.all(filepaths.map((filepath) => this.deleteFile(filepath)));
  }

  /**
   * Check if a file exists
   * @param filepath - The relative path to the file
   * @returns true if file exists, false otherwise
   */
  async fileExists(filepath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filepath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the full URL for a file
   * @param filepath - The relative path to the file
   * @param baseUrl - The base URL of the server (optional)
   * @returns The full URL to access the file
   */
  getFileUrl(filepath: string, baseUrl?: string): string {
    const base = baseUrl || process.env.BACKEND_URL || 'http://localhost:3000';
    return `${base}/${filepath}`;
  }

  /**
   * Validate file type
   * @param file - The uploaded file
   * @param allowedMimeTypes - Array of allowed MIME types
   * @throws ApiError if file type is not allowed
   */
  validateFileType(file: Express.Multer.File, allowedMimeTypes: string[]): void {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ApiError(
        `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      );
    }
  }

  /**
   * Validate file size
   * @param file - The uploaded file
   * @param maxSizeInBytes - Maximum file size in bytes
   * @throws ApiError if file is too large
   */
  validateFileSize(file: Express.Multer.File, maxSizeInBytes: number): void {
    if (file.size > maxSizeInBytes) {
      const maxSizeInMB = (maxSizeInBytes / (1024 * 1024)).toFixed(2);
      throw new ApiError(`File too large. Maximum size: ${maxSizeInMB}MB`, 400, 'FILE_TOO_LARGE');
    }
  }
}
