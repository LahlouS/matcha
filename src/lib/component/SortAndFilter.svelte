<script>
	import { createEventDispatcher } from 'svelte';
	import { tagList } from '$lib/domain/browse';

	export let sortingCriteria = {
		age: { order: 'none', range: [18, 99] },
		localisation: { order: 'none', country: '' },
		fameRate: { order: 'none', range: [0, 1] },
		tags: []
	};
	export let closeComponent;

	const dispatch = createEventDispatcher();

	// Handle form submission
	const handleSubmit = (event) => {
		event.preventDefault(); // Prevent default form behavior
		dispatch('applyFilters', { sortingCriteria }); // Emit updated sorting criteria
	};

	const handleResetList = (event) => {
		event.preventDefault();
		sortingCriteria = {
			age: { order: 'none', range: [18, 99] },
			localisation: { order: 'none', country: '' },
			fameRate: { order: 'none', range: [0, 1] },
			tags: []
		};
		dispatch('resetList', { sortingCriteria });
		close();
	};

	// Close the popup
	const close = () => {
		closeComponent = false;
	};

	const toggleTag = (tag, isSelected) => {
		if (isSelected) {
			sortingCriteria.tags = [...sortingCriteria.tags, tag];
		} else {
			sortingCriteria.tags = sortingCriteria.tags.filter((t) => t !== tag);
		}
	};
</script>

<div class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
	<div
		class="relative bg-white w-full max-w-lg p-6 rounded-lg shadow-lg"
		role="dialog"
		aria-modal="true"
	>
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Filter & Sort</h2>

		<form on:submit={handleSubmit}>
			<!-- Age Sorting -->
			<div class="mt-4">
				<h3 class="text-sm font-medium text-gray-900">Age</h3>
				<div class="mt-2 flex gap-x-4">
					<select
						bind:value={sortingCriteria.age.order}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
					>
						<option value="none">None</option>
						<option value="ascendant">Ascendant</option>
						<option value="descendant">Descendant</option>
					</select>
					<div class="flex gap-x-2">
						<input
							type="number"
							bind:value={sortingCriteria.age.range[0]}
							min="18"
							max="99"
							placeholder="Min"
							class="w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
						/>
						<input
							type="number"
							bind:value={sortingCriteria.age.range[1]}
							min="18"
							max="99"
							placeholder="Max"
							class="w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
						/>
					</div>
				</div>
			</div>

			<!-- Localisation Sorting -->
			<div class="mt-4">
				<h3 class="text-sm font-medium text-gray-900">Localisation</h3>
				<div class="mt-2 flex gap-x-4">
					<select
						bind:value={sortingCriteria.localisation.order}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
					>
						<option value="none">None</option>
						<option value="closest">Closest</option>
					</select>
					<input
						type="text"
						bind:value={sortingCriteria.localisation.country}
						placeholder="Country"
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
					/>
				</div>
			</div>

			<!-- Fame Rating Sorting -->
			<div class="mt-4">
				<h3 class="text-sm font-medium text-gray-900">Fame Rating</h3>
				<div class="mt-2 flex gap-x-4">
					<select
						bind:value={sortingCriteria.fameRate.order}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
					>
						<option value="none">None</option>
						<option value="ascendant">Ascendant</option>
						<option value="descendant">Descendant</option>
					</select>
					<div class="flex gap-x-2">
						<input
							type="number"
							bind:value={sortingCriteria.fameRate.range[0]}
							min="0"
							max="1"
							step="0.01"
							placeholder="Min"
							class="w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
						/>
						<input
							type="number"
							bind:value={sortingCriteria.fameRate.range[1]}
							min="0"
							max="1"
							step="0.01"
							placeholder="Max"
							class="w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
						/>
					</div>
				</div>
			</div>

			<div class="mt-6">
				<h3 class="text-sm font-medium text-gray-900">Exclude tags</h3>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each tagList as tag}
						<button
							type="button"
							class="px-3 py-1 rounded-full border text-sm
						{sortingCriteria.tags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}"
							on:click={() => toggleTag(tag, !sortingCriteria.tags.includes(tag))}
						>
							{tag}
						</button>
					{/each}
				</div>
			</div>

			<!-- Buttons -->
			<div class="mt-6 flex items-center justify-end gap-x-4">
				<button
					type="button"
					class="inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					on:click={handleResetList}
				>
					Reset
				</button>
				<button
					type="button"
					class="text-sm font-medium text-gray-600 hover:underline"
					on:click={close}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Apply
				</button>
			</div>
		</form>
	</div>
</div>
