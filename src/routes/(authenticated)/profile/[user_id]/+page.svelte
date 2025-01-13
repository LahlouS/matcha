<script lang="ts">
	import type { PageData } from './$types';
	import _ from 'lodash';
	import { page } from '$app/stores';
	import { Heart, Icon } from 'svelte-hero-icons';
	import addToast from '$lib/toast/toastStore';
	import { invalidate } from '$app/navigation';
	import { Cog } from 'svelte-hero-icons';
	import BlockReportUser from '$lib/component/BlockReportUser.svelte';

	export let data: PageData;

	$: id = $page.params.user_id;
	$: profileInfo = data.profileInfo;
	$: isCurrentUserProfile = data.isCurrentUserProfile;
	$: likedByCurrentUser = data.likedByCurrentUser;

	let blockComponent = false;
	function openBlockReportComponent() {
		blockComponent = true;
	}
	const blockUser = async () => {
		try {
			fetch(`/api/block/${id}`, {
				method: 'POST'
			})
				.then(async (response) => {
					if (!response.ok) {
						throw new Error('Failed to block user');
					}
					const result = await response.json();
					blockComponent = false;
					window.location.reload();
				})
				.catch((error) => {
					console.log('Error blocking user:', error);
				});
		} catch {
			addToast({ message: 'Something went wrong liking profile', type: 'error' });
		}
	};

	const reportUser = async (username: string) => {
		blockComponent = false;
		addToast({
			message: username + ' has been reported to the headquarters and will face justice any soon',
			type: 'success'
		});
	};

	async function likeProfile() {
		try {
			const response = await fetch(`/api/like/${id}`, {
				method: 'POST'
			});
			if (response.ok) {
				invalidate('app:matches');
				const result: { isLiked: boolean } = await response.json();
				likedByCurrentUser = result.isLiked;
			}
		} catch (error) {
			addToast({ message: 'Something went wrong liking profile', type: 'error' });
		}
	}
</script>

<div class="max-w-3xl md:mx-auto mx-4 mb-10">
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2
				class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				{`${_.capitalize(profileInfo.firstName)} ${_.capitalize(profileInfo.lastName)} (${_.capitalize(profileInfo.age)})`}
			</h2>
		</div>
		<div class="mt-4 flex md:ml-4 md:mt-0">
			{#if isCurrentUserProfile}
				<a
					href={`/profile/${id}/edit-profile`}
					type="button"
					class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
					>Edit</a
				>
			{:else}
				<button
					type="button"
					on:click={likeProfile}
					class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					<Icon class="h-5 w-5" src={Heart} solid={likedByCurrentUser} />
				</button>
				<button
					type="button"
					on:click={openBlockReportComponent}
					class="ml-2 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					<Icon class="h-5 w-5" src={Cog} />
				</button>
				{#if blockComponent}
					<div
						class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
					>
						<BlockReportUser
							bind:blockComponent
							on:blockUser={blockUser}
							on:reportUser={() => reportUser(profileInfo.firstName)}
						/>
					</div>
				{/if}
			{/if}
		</div>
	</div>
	<br />
	<div class="mt-1 grid gap-4">
		<img
			alt="main"
			class="h-auto max-w-full rounded-lg"
			src={`/api/pics/${id}/0?refresh=${Math.random()}`}
		/>
		<div class="grid grid-cols-4 gap-4">
			{#each Array(4) as _, i}
				<img
					alt={`${i + 1}`}
					class="h-auto max-w-full rounded-lg"
					src={`/api/pics/${id}/${i + 1}?refresh=${Math.random()}`}
				/>
			{/each}
		</div>
	</div>
	<div class="mt-6 border-t border-gray-100">
		<dl class="divide-y divide-gray-100">
			<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
				<dt class="text-lg font-medium leading-6 text-gray-900">About</dt>
				<dd class="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
					{profileInfo.biography}
				</dd>
			</div>
		</dl>
		<dl class="divide-y divide-gray-100">
			<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
				<dt class="text-lg font-medium leading-6 text-gray-900">Interests</dt>
				<dd class="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
					{#each profileInfo.tags as tag}
						<span
							class="mx-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
							>#{tag}</span
						>
					{/each}
				</dd>
			</div>
		</dl>
		<dl class="divide-y divide-gray-100">
			<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
				<dt class="text-lg font-medium leading-6 text-gray-900">Is a</dt>
				<dd class="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
					{profileInfo.gender}
				</dd>
			</div>
		</dl>
		<dl class="divide-y divide-gray-100">
			<div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
				<dt class="text-lg font-medium leading-6 text-gray-900">Is looking for</dt>
				<dd class="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
					{profileInfo.sexualPreference}
				</dd>
			</div>
		</dl>
	</div>
</div>
