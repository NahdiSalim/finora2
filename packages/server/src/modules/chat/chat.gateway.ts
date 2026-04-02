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
import { CallService } from './call.service';
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
  private activeCalls: Map<number, number> = new Map();
  private callParticipants: Map<number, Set<number>> = new Map();
  private callTimeouts: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    private chatService: ChatService,
    private callService: CallService,
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

      // Rejoindre automatiquement les salles de l'utilisateur
      const rooms = await this.chatService.getUserRooms(userId);
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

        // If user was in any active calls, notify other participants
        this.callParticipants.forEach((participants, roomId) => {
          if (participants.has(userId)) {
            participants.delete(userId);

            // Notify other participants that this user left
            participants.forEach((participantId) => {
              const targetSockets = this.userSockets.get(participantId);
              targetSockets?.forEach((socketId) => {
                this.server.to(socketId).emit('call:user-left', {
                  userId,
                  roomId,
                });
              });
            });

            // If no participants left, clean up the call
            if (participants.size === 0) {
              const callId = this.activeCalls.get(roomId);
              if (callId) {
                this.callService.endCall(callId, 0).catch((err) => {
                  console.error('Error ending call on disconnect:', err);
                });
                this.activeCalls.delete(roomId);
                this.callParticipants.delete(roomId);
              }
            }
          }
        });

        // Notifier que l'utilisateur est offline
        client.broadcast.emit('user:offline', { userId });
      } else {
        this.userSockets.set(userId, updatedSockets);
      }
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
          roomId: message.roomId,
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

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      callType: 'audio' | 'video';
      participants: number[];
    }
  ) {
    try {
      const userId = client.data.userId;

      const call = await this.callService.createCall({
        roomId: data.roomId,
        initiatorId: userId,
        callType: data.callType,
        participants: data.participants.map((p) => p.toString()),
      });

      this.activeCalls.set(data.roomId, call.id);

      // Track the initiator as the first participant in the call
      const participants = new Set<number>([userId]);
      this.callParticipants.set(data.roomId, participants);

      // Set timeout for missed call (30 seconds)
      const timeout = setTimeout(async () => {
        const stillActive = this.activeCalls.get(data.roomId);
        if (stillActive === call.id) {
          try {
            await this.callService.markCallAsMissed(call.id);
            this.activeCalls.delete(data.roomId);
            this.callParticipants.delete(data.roomId);
            this.callTimeouts.delete(data.roomId);

            // Create missed call message
            const missedCallMessage = await this.chatService.sendMessage(userId, {
              roomId: data.roomId,
              content: `${call.callType === 'video' ? 'Appel vidéo' : 'Appel vocal'} manqué`,
              type: 'call',
              callId: call.id,
            });

            this.server.to(`room:${data.roomId}`).emit('message:new', missedCallMessage);

            // Notify caller that call was missed
            const callerSockets = this.userSockets.get(userId);
            callerSockets?.forEach((socketId) => {
              this.server.to(socketId).emit('call:missed', {
                roomId: data.roomId,
                callId: call.id,
              });
            });
          } catch (error) {
            console.error('Error handling missed call:', error);
          }
        }
      }, 30000);

      this.callTimeouts.set(data.roomId, timeout);

      data.participants.forEach((participantId) => {
        if (participantId !== userId) {
          const targetSockets = this.userSockets.get(participantId);

          if (targetSockets && targetSockets.length > 0) {
            targetSockets.forEach((socketId) => {
              this.server.to(socketId).emit('call:incoming', {
                callId: call.id,
                callerId: userId,
                roomId: data.roomId,
                callType: data.callType,
                initiatorName: `${call.initiator.firstName} ${call.initiator.lastName}`,
              });
            });
          }
        }
      });

      return { success: true, callId: call.id };
    } catch (error) {
      console.error('Error initiating call:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:offer')
  handleCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      targetUserId: number;
      offer: any;
    }
  ) {
    const userId = client.data.userId;

    const targetSockets = this.userSockets.get(data.targetUserId);
    targetSockets?.forEach((socketId) => {
      this.server.to(socketId).emit('call:offer', {
        callerId: userId,
        roomId: data.roomId,
        offer: data.offer,
      });
    });

    return { success: true };
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      targetUserId: number;
      answer: any;
    }
  ) {
    const userId = client.data.userId;

    const targetSockets = this.userSockets.get(data.targetUserId);
    targetSockets?.forEach((socketId) => {
      this.server.to(socketId).emit('call:answer', {
        callerId: userId,
        roomId: data.roomId,
        answer: data.answer,
      });
    });

    return { success: true };
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      targetUserId: number;
      candidate: any;
    }
  ) {
    const userId = client.data.userId;

    const targetSockets = this.userSockets.get(data.targetUserId);
    targetSockets?.forEach((socketId) => {
      this.server.to(socketId).emit('call:ice-candidate', {
        callerId: userId,
        roomId: data.roomId,
        candidate: data.candidate,
      });
    });

    return { success: true };
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      callerId: number;
      callId?: number;
    }
  ) {
    try {
      const userId = client.data.userId;

      const callId = data.callId || this.activeCalls.get(data.roomId);
      if (callId) {
        await this.callService.updateCallStatus(callId, 'ongoing');

        // Clear the missed call timeout
        const timeout = this.callTimeouts.get(data.roomId);
        if (timeout) {
          clearTimeout(timeout);
          this.callTimeouts.delete(data.roomId);
        }
      }

      // Get user info for the newly joined user
      const newUserInfo = await this.chatService.getUserById(userId);
      const newUserName = newUserInfo
        ? `${newUserInfo.firstName} ${newUserInfo.lastName}`
        : `User ${userId}`;

      // Add this user to the active call participants
      const participants = this.callParticipants.get(data.roomId);
      if (participants) {
        participants.add(userId);
      }

      // Notify the caller that their call was accepted
      const callerSockets = this.userSockets.get(data.callerId);
      callerSockets?.forEach((socketId) => {
        this.server.to(socketId).emit('call:accepted', {
          acceptedBy: userId,
          roomId: data.roomId,
          userName: newUserName,
        });
      });

      // Send existing participants info to the newly joined user
      // This creates a mesh network where everyone connects to everyone
      if (participants && participants.size > 1) {
        const existingParticipants = Array.from(participants)
          .filter((pId) => pId !== userId)
          .map(async (pId) => {
            const user = await this.chatService.getUserById(pId);
            return {
              userId: pId,
              userName: user ? `${user.firstName} ${user.lastName}` : `User ${pId}`,
            };
          });

        const participantsInfo = await Promise.all(existingParticipants);

        const newUserSockets = this.userSockets.get(userId);
        newUserSockets?.forEach((socketId) => {
          this.server.to(socketId).emit('call:existing-participants', {
            participants: participantsInfo,
          });
        });
      }

      // Notify ALL other active participants that a new user joined
      // This is crucial for group calls - existing participants need to establish connections
      if (participants) {
        participants.forEach((participantId) => {
          if (participantId !== userId) {
            const targetSockets = this.userSockets.get(participantId);
            targetSockets?.forEach((socketId) => {
              this.server.to(socketId).emit('call:user-joined', {
                userId,
                roomId: data.roomId,
                userName: newUserName,
              });
            });
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting call:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      callerId: number;
      callId?: number;
    }
  ) {
    try {
      const userId = client.data.userId;

      const callId = data.callId || this.activeCalls.get(data.roomId);
      const participants = this.callParticipants.get(data.roomId);

      if (callId) {
        // Check if other people have already joined the call
        const hasOtherParticipants = participants && participants.size > 1;

        if (!hasOtherParticipants) {
          // No one else has joined yet - end the entire call
          const timeout = this.callTimeouts.get(data.roomId);
          if (timeout) {
            clearTimeout(timeout);
            this.callTimeouts.delete(data.roomId);
          }

          const call = await this.callService.markCallAsRejected(callId);
          this.activeCalls.delete(data.roomId);
          this.callParticipants.delete(data.roomId);

          // Create a system message for the rejected call - sent from the initiator
          const callMessage = await this.chatService.sendMessage(call.initiatorId, {
            roomId: data.roomId,
            content: `${call.callType === 'video' ? 'Appel vidéo' : 'Appel vocal'} refusé`,
            type: 'call',
            callId: call.id,
          });

          this.server.to(`room:${data.roomId}`).emit('message:new', callMessage);
        }
      }

      // Notify the caller that this user rejected
      const callerSockets = this.userSockets.get(data.callerId);
      const hasOtherParticipants = participants && participants.size > 1;

      callerSockets?.forEach((socketId) => {
        this.server.to(socketId).emit('call:rejected', {
          rejectedBy: userId,
          roomId: data.roomId,
          callEnded: !hasOtherParticipants,
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting call:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: number;
      participants: number[];
      duration?: number;
      callId?: number;
    }
  ) {
    try {
      const userId = client.data.userId;

      const callId = data.callId || this.activeCalls.get(data.roomId);
      if (callId) {
        // Clear timeout
        const timeout = this.callTimeouts.get(data.roomId);
        if (timeout) {
          clearTimeout(timeout);
          this.callTimeouts.delete(data.roomId);
        }

        const call = await this.callService.endCall(callId, data.duration || 0);
        this.activeCalls.delete(data.roomId);
        this.callParticipants.delete(data.roomId);

        // Create a system message for the completed call - sent from the initiator
        const duration = data.duration || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationText =
          duration > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '0:00';

        const callMessage = await this.chatService.sendMessage(call.initiatorId, {
          roomId: data.roomId,
          content: `${call.callType === 'video' ? 'Appel vidéo' : 'Appel vocal'} - ${durationText}`,
          type: 'call',
          callId: call.id,
        });

        this.server.to(`room:${data.roomId}`).emit('message:new', callMessage);
      }

      data.participants.forEach((participantId) => {
        if (participantId !== userId) {
          const targetSockets = this.userSockets.get(participantId);
          targetSockets?.forEach((socketId) => {
            this.server.to(socketId).emit('call:ended', {
              endedBy: userId,
              roomId: data.roomId,
            });
          });
        }
      });

      client.to(`room:${data.roomId}`).emit('call:ended', {
        endedBy: userId,
        roomId: data.roomId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: error.message };
    }
  }
}
