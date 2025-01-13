import type { UserRepository } from '$lib/userRepository';
import type { EmailRepository } from '$lib/emailRepository';
import type { User, Session } from 'Lucia';
import type { ProfileVisitRepository } from '$lib/profileVisitRepository';
import type { BrowsingRepository } from '$lib/browsingRepository';
import type { ConnectionRepository } from '$lib/server/connectionRepository';
import type { AuthService } from '$lib/server/authService';
import type { BlockRepository } from '$lib/blockRepository';
import type { ChatRepository } from '$lib/server/chatRepository';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			userRepository: UserRepository;
			user: User | null;
			session: Session | null;
			emailRepository: EmailRepository;
			profileVisitRepository: ProfileVisitRepository;
			browsingRepository: BrowsingRepository;
			connectionRepository: ConnectionRepository;
			blockRepository: BlockRepository;
			authService: AuthService;
			chatRepository: ChatRepository;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
