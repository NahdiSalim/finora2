import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Client connection rejected: No token provided');
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      let payload;
      try {
        // Use the same JWT_SECRET that was used to create the token
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET not configured');
        }

        this.logger.debug(`Verifying token with JWT_SECRET: ${jwtSecret}`);
        this.logger.debug(`Token preview: ${token.substring(0, 50)}...`);

        payload = this.jwtService.verify(token, {
          secret: jwtSecret,
        });

        this.logger.debug(`Token verified successfully. Payload: ${JSON.stringify(payload)}`);
      } catch (jwtError) {
        this.logger.error('JWT verification failed:', jwtError.message);
        this.logger.error(`JWT Error details:`, jwtError);
        client.emit('error', { message: 'Invalid token: ' + jwtError.message });
        client.disconnect();
        return;
      }
      console.log(payload, 'payload');
      const userId = payload.user.id;

      if (!userId) {
        this.logger.warn('Client connection rejected: No userId in token');
        client.emit('error', { message: 'No userId in token' });
        client.disconnect();
        return;
      }

      // Store user socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Store userId in socket data
      client.data.userId = userId;

      // Join user to their personal room
      client.join(`user:${userId}`);

      this.logger.log(`User ${userId} connected with socket ${client.id}`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to notification service',
        userId,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.error('Connection error:', error.message);
      client.emit('error', { message: 'Connection error: ' + error.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      this.logger.log(`User ${userId} disconnected socket ${client.id}`);
    }
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user ${userId}`);
  }

  /**
   * Send notification update (read status, etc.)
   */
  sendNotificationUpdate(userId: number, update: any) {
    this.server.to(`user:${userId}`).emit('notificationUpdate', update);
  }

  /**
   * Broadcast notification to multiple users
   */
  broadcastNotification(userIds: number[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Client subscribes to notifications
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`User ${userId} subscribed to notifications`);
    return { event: 'subscribed', data: { userId } };
  }

  /**
   * Client marks notification as read
   */
  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number }
  ) {
    const userId = client.data.userId;
    this.logger.log(`User ${userId} marked notification ${data.notificationId} as read`);
    return { event: 'marked', data };
  }

  /**
   * Get online status of users
   */
  isUserOnline(userId: number): boolean {
    const sockets = this.userSockets.get(userId);
    return this.userSockets.has(userId) && !!sockets && sockets.size > 0;
  }

  /**
   * Get count of online users
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }
}
