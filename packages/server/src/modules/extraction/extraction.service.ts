import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { ExtractionType } from './extraction.types';
import * as crypto from 'crypto';
import 'dotenv/config';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';

@Injectable()
export class ExtractionService {
  constructor(private readonly prisma: PrismaService) {}
  private computePdfHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async extract(type: ExtractionType, file: Express.Multer.File) {
    // 2️⃣ Python endpoints
    const pythonUrls: Record<ExtractionType, string> = {
      DE_PROG: process.env.PROGRAM_EXTRACTION_DE!,
      TN_PROG: process.env.PROGRAM_EXTRACTION_TN!,
      PROFILE: process.env.PROFILE_EXTRACTION_DE!,
    };

    // 1️⃣ Validate type
    if (!['DE_PROG', 'TN_PROG', 'PROFILE'].includes(type)) {
      throw new ApiError(
        errors.EXTRACTION_TYPE_ERROR.message,
        errors.EXTRACTION_TYPE_ERROR.code,
        errors.EXTRACTION_TYPE_ERROR.errorCode,
      );
    }
    const newHash = this.computePdfHash(file?.buffer);

    const existing =
      type === 'PROFILE'
        ? await this.prisma.profile.findUnique({ where: { hash: newHash } })
        : await this.prisma.programme.findUnique({ where: { hash: newHash } });
    if (existing) {
      throw new ApiError(
        errors.EXTRACTION_ALREADY_DONE.message,
        errors.EXTRACTION_ALREADY_DONE.code,
        errors.EXTRACTION_ALREADY_DONE.errorCode,
      );
    }

    // 3️⃣ Send file to Python
    const formData: FormData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    let insertedRowsIds: number[];
    const options = {
      headers: { API_KEY: process.env.API_KEY! },
    };
    try {
      const response = await axios.post(pythonUrls[type], formData, options);
      insertedRowsIds = response?.data?.successful_ids || [];
    } catch (error) {
      console.log(error);
      throw new ApiError(
        errors.EXTRACTION_FAIL.message,
        errors.EXTRACTION_FAIL.code,
        errors.EXTRACTION_FAIL.errorCode,
      );
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}.pdf`;
    const uploadPath = join(process.cwd(), '/uploads', fileName);
    if(insertedRowsIds?.length ===0 ){
       throw new ApiError(
        errors.EXTRACTION_FAIL.message,
        errors.EXTRACTION_FAIL.code,
        errors.EXTRACTION_FAIL.errorCode,
      );
    }

    await fs.writeFile(uploadPath, file.buffer);

    if (type === 'PROFILE') {
      await this.prisma.profile.updateMany({
        where: { id: { in: insertedRowsIds } },
        data: {
          file: `/uploads/${fileName}`,
          hash: newHash,
        },
      });
    } else {
      await this.prisma.programme.updateMany({
        where: { id: { in: insertedRowsIds } },
        data: {
          file: `/uploads/${fileName}`,
          hash: newHash,
        },
      });
    }

    return {
      status: 'success',
      code: '200',
      data: {
        insertedRowsIds,
      },
    };
  }
}
