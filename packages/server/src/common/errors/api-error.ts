export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode || 'SERVER_ERROR';
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
