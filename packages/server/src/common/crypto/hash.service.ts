import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
