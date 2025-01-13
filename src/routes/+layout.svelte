<script lang="ts">
	import '../app.css';
	import type { TransitionConfig } from 'svelte/transition';
	import {
		Heart,
		CheckCircle,
		Icon,
		XMark,
		InformationCircle,
		Bars3,
		Bell,
		ExclamationTriangle
	} from 'svelte-hero-icons';
	import type { LayoutData } from './$types';
	import signout from '$lib/signout';
	import { page } from '$app/stores';
	import { initials as getInitials } from '$lib/domain/profile';
	import { toasts } from '$lib/toast/toastStore';
	import { onDestroy, onMount } from 'svelte';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { socketStore } from '$lib/stores/socketStore';
	import { chatClientStore } from '$lib/stores/chatStore';

	$: url = $page.url.pathname;

	$: initials = data.personalInfo ? getInitials(data.personalInfo) : 'XX';
	export let data: LayoutData;
	$: user = data.user;

	$: {
		if (user) {
			socketStore.connect($page.url.origin, data.session!.id);
		}
	}

	onDestroy(() => {
		notificationStore.cleanup();
		chatClientStore.cleanup();
		socketStore.disconnect();
	});

	type MenuState = 'NOTIFICATIONS' | 'NONE' | 'PROFILE';
	let menuOpen: MenuState = 'NONE';

	function toggleMenu(menu: MenuState) {
		if (menuOpen !== 'NONE') {
			handleMenuClose();
		} else {
			handleMenuOpen(menu);
		}
	}

	function handleMenuOpen(menu: MenuState) {
		menuOpen = menu;
		document.body.addEventListener('click', handleMenuClose);
	}

	function handleMenuClose() {
		menuOpen = 'NONE';
		document.body.removeEventListener('click', handleMenuClose);
	}

	async function handleSignout() {
		await signout();
	}

	function isActive(url: string, dest: string): boolean {
		return url.startsWith(`/${dest}`);
	}

	export function fadeTranslate(
		_: HTMLElement,
		params: { duration: number; y: number }
	): TransitionConfig {
		return {
			duration: params.duration,
			css: (t: number) => {
				const opacity = t;
				const translateY = (1 - t) * params.y;
				return `opacity: ${opacity}; transform: translateY(${translateY}px);`;
			}
		};
	}
</script>

<nav class="bg-white z-50 shadow relative h-16">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="relative flex h-16 justify-between">
			{#if user}
				<!-- Mobile menu button -->
				<div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
					<button
						on:click|stopPropagation={() => toggleMenu('PROFILE')}
						type="button"
						class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
						aria-controls="mobile-menu"
						aria-expanded="false"
					>
						<span class="absolute -inset-0.5"></span>
						<span class="sr-only">Open main menu</span>
						<Icon src={Bars3} class="{menuOpen === 'PROFILE' ? 'hidden' : 'block'} block h-6 w-6" />
						<Icon src={XMark} class="{menuOpen === 'PROFILE' ? 'block' : 'hidden'} block h-6 w-6" />
					</button>
				</div>
			{/if}
			<div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
				<a href="/" class="flex flex-shrink-0 items-center">
					<Icon src={Heart} class="h-8 w-auto" />
				</a>
				{#if user}
					<div class="hidden sm:ml-6 sm:flex sm:space-x-8">
						<!-- Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" -->
						<a
							href={`/browse`}
							class="{isActive(url, 'browse')
								? 'border-indigo-500 text-gray-900'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}  inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium"
							>Browse</a
						>
						<a
							href={`/matches`}
							class="{isActive(url, 'matches')
								? 'border-indigo-500 text-gray-900'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}  inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium"
							>Matches</a
						>
						<a
							href={`/chat`}
							class="{isActive(url, 'chat')
								? 'border-indigo-500 text-gray-900'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}  inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium"
							>Chat</a
						>
					</div>
				{/if}
			</div>
			<div
				class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0"
			>
				<!-- Profile dropdown -->
				{#if user}
					<div class="relative flex flex-row gap-3">
						<button
							on:click|stopPropagation={() => toggleMenu('NOTIFICATIONS')}
							type="button"
							class="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						>
							<span class="absolute -inset-1.5"></span>
							<span class="sr-only">View notifications</span>
							<Icon src={Bell} class="h-6 w-6" />
						</button>
						<div class="hidden md:block">
							<button
								type="button"
								on:click|stopPropagation={() => toggleMenu('PROFILE')}
								class="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
								id="user-menu-button"
								aria-expanded="false"
								aria-haspopup="true"
							>
								<span class="absolute -inset-1.5"></span>
								<span class="sr-only">Open user menu</span>
								<span
									class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-500"
								>
									<span class="text-sm font-medium leading-none text-white">{initials}</span>
								</span>
							</button>
						</div>

						<!-- PC dropdown -->
						<div
							class="absolute {menuOpen === 'PROFILE'
								? ''
								: 'hidden'} max-sm:hidden top-8 right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
							role="menu"
							aria-orientation="vertical"
							aria-labelledby="user-menu-button"
							tabindex="-1"
						>
							{#if user}
								<a
									href={`/profile/${user?.id}`}
									class="hover:bg-gray-100 block px-4 py-2 text-sm text-gray-700"
									role="menuitem"
									tabindex="-1"
									id="user-menu-item-0">Your Profile</a
								>
								<a
									href={`/visits`}
									class="hover:bg-gray-100 block px-4 py-2 text-sm text-gray-700"
									role="menuitem"
									tabindex="-1"
									id="user-menu-item-0">Visits</a
								>
								<button
									on:click={handleSignout}
									class="block px-4 py-2 text-sm text-gray-700 w-full hover:bg-gray-100 text-left"
									role="menuitem"
									tabindex="-1"
									id="user-menu-item-1"
									>Sign out
								</button>
							{/if}
						</div>
					</div>
				{:else}
					<a
						href="/sign-in"
						class="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
					>
						Sign in
					</a>
					<a
						href="/sign-up"
						class="ml-4 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>Sign up</a
					>
				{/if}
			</div>
		</div>
	</div>

	<!-- Mobile menu, show/hide based on menu state. -->
	<div
		class="sm:hidden bg-white shadow {menuOpen === 'PROFILE' ? '' : 'hidden'}"
		id="mobile-menu"
		aria-labelledby="user-menu-button"
	>
		<div class="space-y-1 pb-4 pt-2">
			<a
				href={`/profile/${user?.id}`}
				class="block {isActive(url, 'profile')
					? 'bg-indigo-50 border-indigo-500 text-indigo-700'
					: 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} border-l-4 py-2 pl-3 pr-4 text-base font-medium"
				>Profile</a
			>
			<a
				href={`/browse`}
				class="block {isActive(url, 'browse')
					? 'bg-indigo-50 border-indigo-500 text-indigo-700'
					: 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} border-l-4 py-2 pl-3 pr-4 text-base font-medium"
				>Browse</a
			>
			<a
				href={`/matches`}
				class="block {isActive(url, 'matches')
					? 'bg-indigo-50 border-indigo-500 text-indigo-700'
					: 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} border-l-4 py-2 pl-3 pr-4 text-base font-medium"
				>Matches</a
			>
			<a
				href={`/chat`}
				class="block {isActive(url, 'chat')
					? 'bg-indigo-50 border-indigo-500 text-indigo-700'
					: 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} border-l-4 py-2 pl-3 pr-4 text-base font-medium"
				>Chat</a
			>
			<a
				href={`/visits`}
				class="block {isActive(url, 'visits')
					? 'bg-indigo-50 border-indigo-500 text-indigo-700'
					: 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} border-l-4 py-2 pl-3 pr-4 text-base font-medium"
				>Visits</a
			>
			<button
				on:click={handleSignout}
				class="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
				>Sign out</button
			>
		</div>
	</div>
</nav>

<main class="min-h-[calc(100vh-4rem)] pt-8 md:pt-16">
	<slot />
</main>

<footer class="bg-slate-50 shadow-md">
	<div class="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
		<div class="flex justify-center space-x-6 md:order-2">
			<a href="https://facebook.com" target="”_blank”" class="text-gray-400 hover:text-gray-500">
				<span class="sr-only">Facebook</span>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
			<a href="https://instagram.com" target="”_blank”" class="text-gray-400 hover:text-gray-500">
				<span class="sr-only">Instagram</span>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
			<a href="https://x.com/home" target="”_blank”" class="text-gray-400 hover:text-gray-500">
				<span class="sr-only">X</span>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z"
					/>
				</svg>
			</a>
			<a
				href="https://github.com/rutgercap"
				target="”_blank”"
				class="text-gray-400 hover:text-gray-500"
			>
				<span class="sr-only">GitHub</span>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
			<a
				href="https://www.youtube.com/"
				target="”_blank”"
				class="text-gray-400 hover:text-gray-500"
			>
				<span class="sr-only">YouTube</span>
				<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
		</div>
		<div class="mt-8 md:order-1 md:mt-0">
			<p class="text-center text-xs leading-5 text-gray-500">
				&copy; 2042 ft_matcha, Inc. All rights reserved.
			</p>
		</div>
	</div>
</footer>

<!-- Global notification live region, render this permanently at the end of the document -->
<div
	aria-live="assertive"
	class="pointer-events-none z-51 pt-10 md:pt-20 fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
>
	<div class="flex w-full flex-col items-center space-y-4 sm:items-end">
		{#each $toasts as toast}
			<div
				in:fadeTranslate={{ duration: 300, y: 20 }}
				out:fadeTranslate={{ duration: 100, y: -20 }}
				class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5"
			>
				<div class="p-4">
					<div class="flex items-start">
						<div class="shrink-0">
							{#if toast.type === 'success'}
								<Icon src={CheckCircle} class="size-8 text-green-400" />
							{:else if toast.type === 'error'}
								<Icon src={ExclamationTriangle} class="size-8 text-red-400" />
							{:else if toast.type === 'info'}
								<Icon src={InformationCircle} class="size-8 text-yellow-400" />
							{/if}
						</div>
						<div class="ml-3 w-0 flex-1 pt-0.5">
							<p class="text-sm font-medium text-gray-900">{toast.message}</p>
							<p class="mt-1 text-sm text-gray-500">{toast.extraInformation}</p>
						</div>
						<div class="ml-4 flex shrink-0">
							<button
								type="button"
								class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							>
								<span class="sr-only">Close</span>
								<svg
									class="size-5"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
									data-slot="icon"
								>
									<path
										d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
