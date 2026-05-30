import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CallService } from './call.service';
import type { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<Pick<ChatService, 'sendMessage'>>;

  const userId = 2;
  const roomId = 1;

  beforeEach(async () => {
    chatService = {
      sendMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: chatService },
        { provide: CallService, useValue: {} },
        { provide: JwtService, useValue: { verify: jest.fn() } },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  // ─── 4.6.1 Test Unitaire « Envoi de message via Socket.IO » ─────────────────
  describe('4.6.1 — Envoi de message via Socket.IO (message:send)', () => {
    const mockMessage = {
      id: 42,
      roomId,
      senderId: userId,
      content: 'Bonjour, avez-vous reçu les pièces comptables ?',
      type: 'text',
      createdAt: new Date(),
    };

    it('devrait appeler le service pour persister le message', async () => {
      chatService.sendMessage.mockResolvedValue(mockMessage as any);

      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      gateway.server = { to: toMock } as any;

      const client = { data: { userId } } as Socket;

      const result = await gateway.handleSendMessage(client, {
        roomId,
        content: mockMessage.content,
        type: 'text',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith(userId, {
        roomId,
        content: mockMessage.content,
        type: 'text',
      });
      expect(result.success).toBe(true);
      expect(result.message).toEqual(mockMessage);
    });

    it('devrait diffuser le message via Socket.IO à la salle (room:{id})', async () => {
      chatService.sendMessage.mockResolvedValue(mockMessage as any);

      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      gateway.server = { to: toMock } as any;

      const client = { data: { userId } } as Socket;

      await gateway.handleSendMessage(client, {
        roomId,
        content: mockMessage.content,
        type: 'text',
      });

      expect(toMock).toHaveBeenCalledWith(`room:${roomId}`);
      expect(emitMock).toHaveBeenCalledWith('message:new', mockMessage);
    });

    it('devrait notifier les utilisateurs mentionnés', async () => {
      const mentionedUserId = 5;
      chatService.sendMessage.mockResolvedValue(mockMessage as any);

      const mentionEmit = jest.fn();
      const roomEmit = jest.fn();
      gateway.server = {
        to: jest.fn().mockImplementation((target: string) => {
          if (target === `user:${mentionedUserId}` || target.startsWith('socket')) {
            return { emit: mentionEmit };
          }
          return { emit: roomEmit };
        }),
      } as any;

      // Simulate gateway tracking a socket for the mentioned user
      (gateway as any).userSockets.set(mentionedUserId, ['socket-mention-1']);

      const client = { data: { userId } } as Socket;

      await gateway.handleSendMessage(client, {
        roomId,
        content: '@collaborateur merci pour le suivi',
        type: 'text',
        mentions: [mentionedUserId],
      });

      expect(mentionEmit).toHaveBeenCalledWith('message:mention', {
        message: mockMessage,
        mentionedBy: userId,
      });
    });

    it('devrait retourner une erreur si la persistance échoue', async () => {
      chatService.sendMessage.mockRejectedValue(new Error('Salle introuvable'));

      const client = { data: { userId } } as Socket;

      const result = await gateway.handleSendMessage(client, {
        roomId: 999,
        content: 'Test',
        type: 'text',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Salle introuvable');
    });
  });
});
