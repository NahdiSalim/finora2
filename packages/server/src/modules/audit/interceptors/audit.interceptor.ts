import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction } from '../dto/create-audit-log.dto';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, params, ip, headers } = request;

    // Determine action based on HTTP method
    let action: AuditAction;
    switch (method) {
      case 'POST':
        action = AuditAction.CREATE;
        break;
      case 'PUT':
      case 'PATCH':
        action = AuditAction.UPDATE;
        break;
      case 'DELETE':
        action = AuditAction.DELETE;
        break;
      case 'GET':
        action = url.includes('export') ? AuditAction.EXPORT : AuditAction.VIEW;
        break;
      default:
        action = AuditAction.VIEW;
    }

    // Extract entity from URL
    const urlParts = url.split('/').filter((part) => part && part !== 'api');
    const entity = urlParts[0] || 'Unknown';

    // Extract entity ID from params
    const entityId = params?.id ? parseInt(params.id, 10) : undefined;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        // Log successful action
        this.auditService.createLog({
          userId: user?.sub,
          action,
          entity: this.capitalizeEntity(entity),
          entityId,
          changes: method !== 'GET' ? body : undefined,
          metadata: {
            method,
            url,
            duration,
            statusCode: 200,
          },
          ipAddress: ip,
          userAgent: headers['user-agent'],
          companyId: user?.companyId,
          status: 'success',
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log failed action
        this.auditService.createLog({
          userId: user?.sub,
          action,
          entity: this.capitalizeEntity(entity),
          entityId,
          changes: method !== 'GET' ? body : undefined,
          metadata: {
            method,
            url,
            duration,
            statusCode: error.status || 500,
          },
          ipAddress: ip,
          userAgent: headers['user-agent'],
          companyId: user?.companyId,
          status: 'failed',
          errorMessage: error.message,
        });

        throw error;
      })
    );
  }

  private capitalizeEntity(entity: string): string {
    return entity.charAt(0).toUpperCase() + entity.slice(1);
  }
}
