<script lang="ts">
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms';

	export let data: PageData;

	const { enhance, form, errors, constraints, message } = superForm(data.form);
</script>

<div class="sm:mx-auto sm:w-full sm:max-w-sm">
	<form class="space-y-6" method="POST" action="?/new_email" use:enhance>
		<div>
			<label for="new_email" class="block text-sm font-medium leading-6 text-gray-900">
				New e-mail
			</label>
			<div class="mt-2">
				<input
					bind:value={$form.new_email}
					id="new_email"
					name="new_email"
					type="email"
					required
					class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					{...$constraints.new_email}
					aria-invalid={$errors.new_email ? 'true' : undefined}
				/>
				{#if $errors.new_email}
					<p class="mt-2 text-sm text-red-600">{$errors.new_email}</p>
				{/if}
			</div>
		</div>

		<div>
			<label for="confirm_email" class="block text-sm font-medium leading-6 text-gray-900">
				Confirm new e-mail
			</label>
			<div class="mt-2">
				<input
					bind:value={$form.confirm_email}
					id="confirm_email"
					name="confirm_email"
					type="email"
					required
					class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					{...$constraints.confirm_email}
					aria-invalid={$errors.confirm_email ? 'true' : undefined}
				/>
				{#if $errors.confirm_email}
					<p class="mt-2 text-sm text-red-600">{$errors.confirm_email}</p>
				{/if}
			</div>
		</div>

		<div>
			<button
				type="submit"
				class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
			>
				Change email
			</button>
		</div>
		{#if $message}
			<p class="mt-2 text-sm text-red-600">{$message}</p>
		{/if}
	</form>
</div>
