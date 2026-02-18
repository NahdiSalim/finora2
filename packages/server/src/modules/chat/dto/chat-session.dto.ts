import { ApiProperty } from "@nestjs/swagger";

export class ChatSessionResponseDto {
    @ApiProperty({
        description: 'Unique identifier for the chat session',
        example: 'abc123-def456-ghi789',
    })
    session_id: string;
}

export class ChatMessageDto {
    @ApiProperty({
        description: 'Unique identifier for the message',
        example: 'msg-123',
    })

    @ApiProperty({
        description: 'Role of the message sender',
        example: 'user',
        enum: ['user', 'assistant'],
    })
    role: 'user' | 'assistant';

    @ApiProperty({
        description: 'Content of the message',
        example: 'Hello, how can I help you?',
    })
    content: string;
}

export class ChatMessagesResponseDto {
    @ApiProperty({
        description: 'List of chat messages',
        type: [ChatMessageDto],
    })
    messages: ChatMessageDto[];
}

