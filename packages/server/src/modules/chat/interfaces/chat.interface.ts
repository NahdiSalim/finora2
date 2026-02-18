export interface ChatSessionResponse {
    session_id: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatMessagesResponse {
    messages: ChatMessage[];
}

export interface SendMessageResponse {
    response: string;
}
