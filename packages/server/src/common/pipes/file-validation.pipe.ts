import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    // Audio files
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
  ];

  private readonly maxFileSize = 20 * 1024 * 1024; // 20MB

  transform(files: Express.Multer.File[] | undefined, metadata: ArgumentMetadata) {
    if (!files || files.length === 0) {
      return files;
    }

    for (const file of files) {
      // Check file size
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(
          `Le fichier "${file.originalname}" est trop volumineux. Taille maximale: 20MB`
        );
      }

      // Check MIME type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Le type de fichier "${file.mimetype}" n'est pas supporté pour "${file.originalname}"`
        );
      }
    }

    return files;
  }
}
