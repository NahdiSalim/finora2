import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { MinioService } from '../../common/services/minio.service';

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// No JWT guard — this endpoint is accessed by OpenAI/OpenRouter servers using a
// short-lived HMAC-signed URL. The only global guard applied is ThrottlerGuard.
@Controller('chatbot')
export class ChatbotImageProxyController {
  private readonly logger = new Logger(ChatbotImageProxyController.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly config: ConfigService
  ) {}

  @Get('image-proxy')
  async proxyImage(
    @Query('path') path: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response
  ) {
    if (!path || !exp || !sig) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const expTs = parseInt(exp, 10);
    if (isNaN(expTs) || Math.floor(Date.now() / 1000) > expTs) {
      return res.status(410).json({ error: 'URL expired' });
    }

    const secret = this.config.get<string>('JWT_SECRET') ?? 'fallback';
    const expected = createHmac('sha256', secret)
      .update(`${path}|${exp}`)
      .digest('hex')
      .slice(0, 32);

    // Both buffers are exactly 32 bytes (one byte per hex char)
    const incoming = sig.slice(0, 32).padEnd(32, '0');
    if (!timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const buffer = await this.minioService.downloadFile(path);
      const ext = path.split('.').pop()?.toLowerCase() ?? '';
      const contentType = EXT_MIME[ext] ?? 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('Content-Length', String(buffer.length));
      res.end(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[image-proxy] fetch failed for "${path}": ${msg}`);
      res.status(404).json({ error: 'Not found' });
    }
  }
}
