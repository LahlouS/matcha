<script lang="ts">
	import type { PageData } from './$types';
	import { chatClientStore, chatStore } from '$lib/stores/chatStore';
	import { ChatClientError } from '$lib/chatClient';
	import { goto } from '$app/navigation';
	import type { Chat } from '$lib/domain/chat';
	import { onMount } from 'svelte';

	export let data: PageData;
	let chatFromBackend = data.chat;
	$: chatClient = $chatClientStore;
	$: chat = $chatStore.get(chatFromBackend.id);
	let redirectTimeout: any | null = null;

	// Clear existing timeout if it exists
	function clearRedirectTimeout() {
		if (redirectTimeout) {
			clearTimeout(redirectTimeout);
			redirectTimeout = null;
		}
	}

	// Set up redirect timeout
	function setupRedirectTimeout() {
		clearRedirectTimeout();
		redirectTimeout = setTimeout(() => {
			goto('/');
		}, 5000);
	}

	// Watch for changes to chat
	$: if (chat === undefined) {
		setupRedirectTimeout();
	} else {
		clearRedirectTimeout();
	}

	// Cleanup on component destroy
	onMount(() => {
		return () => clearRedirectTimeout();
	});

	function sendMessage(chat: Chat, event: Event) {
		const input = event.target as HTMLInputElement;
		try {
			chatClient?.sendMessage(data.user!.id, chat.id, input.value);
			input.value = '';
		} catch (e) {
			if (e instanceof ChatClientError) {
				goto('/');
			}
		}
	}

	function handleKeyDown(chat: Chat, event: KeyboardEvent) {
		if (event.key === 'Enter') {
			sendMessage(chat, event);
		}
	}
</script>

<div class="flex flex-row justify-center my-4">
	<div>
		<h1 class="text-2xl font-bold text-gray-900 mb-4">Chat</h1>
		{#if chat === undefined}
			<p class="text-sm text-gray-500">Loading...</p>
		{:else}
			{#if chat.messages.length === 0}
				<p class="text-sm text-gray-500">No messages yet. Loser!</p>
			{:else}
				<ul role="list" class="divide-y divide-gray-100">
					{#each chat.messages as message}
						<li class="flex items-center border px-4 rounded-xl justify-between gap-x-6 py-5">
							<div class="flex min-w-0 gap-x-4">
								<p>{message.message}</p>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			<input
				on:submit|preventDefault={(e) => sendMessage(chat, e)}
				on:keydown={(e) => handleKeyDown(chat, e)}
				type="text"
				placeholder="Type your message here"
				class="border border-gray-300 rounded-lg p-2 w-full mt-4"
			/>
		{/if}
	</div>
</div>
