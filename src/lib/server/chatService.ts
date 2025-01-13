import type { Chat } from '$lib/domain/chat';
import type { ChatRepository } from './chatRepository';

export class ChatService {
	constructor(private chatRepository: ChatRepository) {}

	public async chatsForUser(userId: string): Promise<Chat[]> {
		return this.chatRepository.chatsForUser(userId);
	}
}
