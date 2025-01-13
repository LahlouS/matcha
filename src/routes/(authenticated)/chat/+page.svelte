<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore';
	import type { User } from 'lucia';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import type { Chat, ChatPreview } from '$lib/domain/chat';

	export let data: PageData;

	$: chats = chatPreviews(Array.from($chatStore.values()));
	const user = data.user!;

	function chatPreviews(chats: Chat[]): ChatPreview[] {
		let previews: ChatPreview[] = [];
		previews = Array.from(chats.values()).map((chat) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { messages, ...rest } = chat;
			return {
				...rest,
				lastMessage: chat.messages[chat.messages.length - 1]
			};
		});
		return previews;
	}

	function chatLink(chat: ChatPreview, user: User): string {
		const otherUserId = chat.userOne === user.id ? chat.userTwo : chat.userOne;
		return `/chat/${otherUserId}`;
	}

	function otherUserId(chat: ChatPreview, user: User): string {
		return chat.userOne === user.id ? chat.userTwo : chat.userOne;
	}
</script>

<div class="flex flex-row justify-center">
	<div>
		<h1 class="text-2xl font-bold text-gray-900 mb-4">Chats</h1>
		{#if chats.length === 0}
			<p class="text-sm text-gray-500">No chats yet. Loser!</p>
		{:else}
			<ul role="list" class="divide-y divide-gray-100">
				{#each chats as chat}
					<a href={chatLink(chat, user)}>
						<li class="flex items-center border px-4 rounded-xl justify-between gap-x-6 py-5">
							<div class="flex flex-col gap-2 min-w-0 gap-x-4">
								<p class="font-bold">{otherUserId(chat, user)}</p>
								<p>{chat.lastMessage?.sentAt ? format(chat.lastMessage?.sentAt, 'PPpp') : ''}</p>
								<p>{chat.lastMessage?.message ?? 'No messages yet.'}</p>
								<div class="min-w-0 flex-auto">> --></div>
							</div>
						</li>
					</a>
				{/each}
			</ul>
		{/if}
	</div>
</div>
