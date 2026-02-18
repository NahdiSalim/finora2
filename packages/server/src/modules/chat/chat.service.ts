import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ChatMessagesResponse, ChatSessionResponse, SendMessageResponse } from './interfaces/chat.interface';
import { errors } from 'src/common/errors/errors';
import { ApiError } from 'src/common/errors/api-error';

@Injectable()
export class ChatService {
    private readonly pythonApiUrl: string;
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.pythonApiUrl = this.configService.get<string>('PYTHON_CHATBOT_API_URL') as string;
    }

    async startChatSession(): Promise<ChatSessionResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<ChatSessionResponse>(`${this.pythonApiUrl}/start_chat`),
            );
            return response.data;
        } catch (error) {
            this.logger.error('Failed to start chat session', error);
            throw new ApiError(
                errors.CHAT_SESSION_START_FAILED.message,
                errors.CHAT_SESSION_START_FAILED.code,
                errors.CHAT_SESSION_START_FAILED.errorCode,
            );
        }
    }

    async getAllMessages(sessionId: string): Promise<ChatMessagesResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<ChatMessagesResponse>(
                    `${this.pythonApiUrl}/messages/${sessionId}`
                ),
            );
            return response.data;
        } catch (error) {
            this.logger.error('Failed to get messages', error);
            throw new ApiError(
                errors.CHAT_MESSAGES_FETCH_FAILED.message,
                errors.CHAT_MESSAGES_FETCH_FAILED.code,
                errors.CHAT_MESSAGES_FETCH_FAILED.errorCode,
            );
        }
    }

    async sendMessage(sessionId: string, question: string): Promise<SendMessageResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.pythonApiUrl}/stream/?session_id=${sessionId}&question=${encodeURIComponent(question)}`),
            );

            return response.data;
        } catch (error) {
            this.logger.error('Failed to send message', error);
            throw new ApiError(
                errors.CHAT_SEND_MESSAGE_FAILED.message,
                errors.CHAT_SEND_MESSAGE_FAILED.code,
                errors.CHAT_SEND_MESSAGE_FAILED.errorCode,
            );
        }
    }
}
