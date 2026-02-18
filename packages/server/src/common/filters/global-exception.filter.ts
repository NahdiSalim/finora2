import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError } from '../errors/api-error';
interface HttpErrorObject {
  errorCode?: string;
  message?: string;
  code?: string;
  status?: string;
  stack?: string;
  isOperational?: boolean 
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const environment = (process.env.NODE_ENV ?? 'production').trim();

    if (environment === 'development') {
      this.sendErrorForDev(err, res);
    } else {
      this.sendErrorForProd(err, res);
    }
  }

  private sendErrorForDev(err: unknown, res: Response) {
    // safely extract properties with type guards
    const error = err as HttpErrorObject;

    res.status(this.getStatusCode(err)).json({
      status: error.status || 'error',
      errorCode: error.errorCode || error?.code,
      code: this.getStatusCode(err),
      message: (error.message as string) || 'Unknown error',
      stack: (error.stack as string) || null,
    });
  }

  private sendErrorForProd(err: unknown, res: Response) {
    const error = err as HttpErrorObject;

    if (error?.isOperational) {
      res.status(this.getStatusCode(err)).json({
        status: error.status ?? 'error',
        code: this.getStatusCode(err),
        errorCode: error.errorCode,
        message: (error.message as string) ?? 'Something went wrong!',
      });
    } else {
      console.error('ERROR 💥:', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
      });
    }
  }

  private getStatusCode(err: unknown): number {
    if (err instanceof ApiError) {
      return err.statusCode;
    }

    if (err instanceof HttpException) {
      return err.getStatus();
    }

    return 500;
  }
}
