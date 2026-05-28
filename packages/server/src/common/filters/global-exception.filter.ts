import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError } from '../errors/api-error';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(err: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();

    // Always handle NestJS HttpExceptions with their real status code and message
    if (err instanceof HttpException) {
      const status = err.getStatus();
      const response = err.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? err.message ?? 'Error');
      if (status >= 500) {
        this.logger.error(
          `[${req?.method} ${req?.url}] HTTP ${status}: ${JSON.stringify(message)}`
        );
      }
      res.status(status).json({
        status: 'error',
        code: status,
        message: Array.isArray(message) ? message.join(', ') : message,
      });
      return;
    }

    // ApiError (operational errors)
    if (err instanceof ApiError && err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status ?? 'error',
        code: err.statusCode,
        errorCode: err.errorCode,
        message: err.message ?? 'Something went wrong!',
      });
      return;
    }

    // Unknown / unexpected errors — log fully, return generic 500
    this.logger.error(
      `[${req?.method} ${req?.url}] Unhandled error: ${(err as Error)?.message}`,
      (err as Error)?.stack
    );
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Something went wrong!',
    });
  }
}
