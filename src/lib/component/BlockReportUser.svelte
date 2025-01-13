<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let blockComponent = true;

	const handleBlock = () => {
		dispatch('blockUser'); // Emit an event to notify the parent that the user is being blocked
	};

	const handleReport = () => {
		dispatch('reportUser'); // Emit an event to notify the parent that the user is being reported
	};

	const handleClose = () => {
		blockComponent = false;
	};
</script>

<div class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
	<div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
		<div class="flex justify-center items-center space-x-4">
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				on:click={handleBlock}
			>
				Block User
			</button>
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
				on:click={handleReport}
			>
				Report User
			</button>
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
				on:click={handleClose}
			>
				Close
			</button>
		</div>
	</div>
</div>
