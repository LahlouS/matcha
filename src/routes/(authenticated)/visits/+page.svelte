<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const profileVisits = data.profileVisits;

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: '2-digit'
		}).format(date);
	}
</script>

<div class="max-w-3xl md:mx-auto mx-4 mb-10">
	<div class="md:flex flex flex-col md:items-center md:justify-between">
		<h1 class="text-2xl font-bold text-gray-900 mb-4">Profile Visits</h1>
		<h1>Total amount of people who visited your profile: {profileVisits.length}</h1>
		<div class="flow-root mt-10">
			{#if profileVisits.length === 0}
				<p class="text-sm text-gray-500">No one has visited your profile yet. Loser!</p>
			{:else}
				<ul role="list" class="-mb-8">
					{#each profileVisits as visit}
						<a href={`/profile/${visit.visitorId}`}>
							<li>
								<div class="relative pb-8">
									<span
										class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
										aria-hidden="true"
									></span>
									<div class="relative flex space-x-3">
										<div>
											<span
												class="flex size-8 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white"
											>
												<svg
													class="size-5 text-white"
													viewBox="0 0 20 20"
													fill="currentColor"
													aria-hidden="true"
													data-slot="icon"
												>
													<path
														d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z"
													/>
												</svg>
											</span>
										</div>
										<div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
											<div>
												<p class="text-sm text-gray-500">
													Visited by <span class="font-medium text-gray-900">{visit.visitorId}</span
													>
												</p>
											</div>
											<div class="whitespace-nowrap text-right text-sm text-gray-500">
												<time datetime="2020-09-20">{formatDate(visit.visitTime)}</time>
											</div>
										</div>
									</div>
								</div>
							</li>
						</a>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
