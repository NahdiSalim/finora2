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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinRoomDto } from './dto/join-room.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string[]> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extraire le token JWT
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Vérifier le token
      const payload = this.jwtService.verify(token);
      const userId = payload.id ?? payload.sub; // JWT puts id in payload.id, not payload.sub

      // Stocker la connexion
      client.data.userId = userId;

      const userSockets = this.userSockets.get(userId) || [];
      userSockets.push(client.id);
      this.userSockets.set(userId, userSockets);

      console.log(`User ${userId} connected with socket ${client.id}`);

      // Rejoindre automatiquement les salles de l'utilisateur
      const rooms = await this.chatService.getUserRooms(userId);
      console.log(
        `User ${userId} auto-joining ${rooms.length} rooms:`,
        rooms.map((r) => r.id)
      );
      rooms.forEach((room) => {
        client.join(`room:${room.id}`);
      });

      // Notifier les autres utilisateurs
      client.broadcast.emit('user:online', { userId });
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      const userSockets = this.userSockets.get(userId) || [];
      const updatedSockets = userSockets.filter((id) => id !== client.id);

      if (updatedSockets.length === 0) {
        this.userSockets.delete(userId);
        // Notifier que l'utilisateur est offline
        client.broadcast.emit('user:offline', { userId });
      } else {
        this.userSockets.set(userId, updatedSockets);
      }

      console.log(`User ${userId} disconnected socket ${client.id}`);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto) {
    try {
      const userId = client.data.userId;
      const room = await this.chatService.getRoomById(data.roomId, userId);

      client.join(`room:${data.roomId}`);

      // Notifier les autres participants
      client.to(`room:${data.roomId}`).emit('room:user-joined', {
        roomId: data.roomId,
        userId,
      });

      return { success: true, room };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto) {
    try {
      const userId = client.data.userId;

      client.leave(`room:${data.roomId}`);

      // Notifier les autres participants
      client.to(`room:${data.roomId}`).emit('room:user-left', {
        roomId: data.roomId,
        userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: SendMessageDto) {
    try {
      const userId = client.data.userId;
      const message = await this.chatService.sendMessage(userId, data);

      // Envoyer le message à tous les participants de la salle
      this.server.to(`room:${data.roomId}`).emit('message:new', message);

      // Envoyer des notifications aux utilisateurs mentionnés
      if (data.mentions && data.mentions.length > 0) {
        data.mentions.forEach((mentionedUserId) => {
          const sockets = this.userSockets.get(mentionedUserId);
          if (sockets) {
            sockets.forEach((socketId) => {
              this.server.to(socketId).emit('message:mention', {
                message,
                mentionedBy: userId,
              });
            });
          }
        });
      }

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; content: string }
  ) {
    try {
      const userId = client.data.userId;
      const message = await this.chatService.editMessage(data.messageId, userId, data.content);

      // Notifier tous les participants de la salle
      if (message.roomId) {
        this.server.to(`room:${message.roomId}`).emit('message:updated', message);
      }

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number }
  ) {
    try {
      const userId = client.data.userId;

      // Récupérer le message avant de le supprimer pour avoir le roomId
      const message = await this.chatService.editMessage(data.messageId, userId, '');
      await this.chatService.deleteMessage(data.messageId, userId);

      // Notifier tous les participants de la salle
      if (message.roomId) {
        this.server.to(`room:${message.roomId}`).emit('message:deleted', {
          messageId: data.messageId,
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: number }) {
    const userId = client.data.userId;
    client.to(`room:${data.roomId}`).emit('user:typing', {
      roomId: data.roomId,
      userId,
      typing: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: number }) {
    const userId = client.data.userId;
    client.to(`room:${data.roomId}`).emit('user:typing', {
      roomId: data.roomId,
      userId,
      typing: false,
    });
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number }
  ) {
    try {
      const userId = client.data.userId;
      await this.chatService.markAsRead(data.messageId, userId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
