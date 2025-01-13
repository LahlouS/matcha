<script>
	import { createEventDispatcher } from 'svelte';

	export let value;
	export let closeComponent;

	const dispatch = createEventDispatcher();

	const handleSubmit = (event) => {
		event.preventDefault(); // Prevent the default form submission
		dispatch('submitForgotPassword'); // Emit the event with no additional data
	};

	const close = () => {
		closeComponent = false;
	};
</script>

<div class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
	<div
		class="relative bg-white w-full max-w-lg p-6 rounded-lg shadow-lg"
		role="dialog"
		aria-modal="true"
	>
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Forgot Password</h2>

		<form on:submit={handleSubmit}>
			<div class="mt-4">
				<label for="username" class="block text-sm font-medium leading-6 text-gray-900">
					Username
				</label>
				<div class="mt-2">
					<input
						type="text"
						id="username"
						name="username"
						bind:value={value.username}
						placeholder="Enter your username"
						required
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</div>

			<div class="mt-4">
				<label for="email" class="block text-sm font-medium leading-6 text-gray-900"> Email </label>
				<div class="mt-2">
					<input
						type="email"
						id="email"
						name="email"
						bind:value={value.email}
						placeholder="Enter your email"
						required
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-x-4">
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
					Submit
				</button>
			</div>
		</form>
	</div>
</div>
