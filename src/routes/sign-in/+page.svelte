<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import ForgotPswd from '$lib/component/ForgotPswd.svelte';

	export let data;
	let status = 0;
	const { enhance, form, errors, constraints, message } = superForm(data.form);

	let showForgotPassword = false;

	const openForgotPasswordModal = () => {
		showForgotPassword = true;
	};

	const closeForgotPasswordModal = () => {
		showForgotPassword = false;
	};

	// TODO: send error message to you component to print them directly in the box
	const handleForgotPasswordSubmit = async () => {
		try {
			const response = await fetch('/sign-in?/forgot_pswd', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams($form).toString()
			});

			const result = await response.json();
			const message = JSON.parse(result.data);
			if (response.ok) {
				status = result.status;
				$message = message[9]; // Handle success (e.g., show success message)
			} else {
				status = result.status;
				console.error('response is not ok', message); // Handle error response
				$message = message[9]; // Handle success (e.g., show success message)
			}
		} catch (error) {
			console.error('Error submitting forgot password request:', error);
		}
		closeForgotPasswordModal();
	};
</script>

<div class="flex md:pt-12 flex-col justify-center px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-sm">
		<img
			class="mx-auto h-10 w-auto"
			src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
			alt="Matcha"
		/>
		<h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
			Sign in to your account
		</h2>
	</div>

	<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
		<form class="space-y-6" method="POST" use:enhance action="?/sign_in">
			<div>
				<label for="username" class="block text-sm font-medium leading-6 text-gray-900"
					>Username
				</label>
				<div class="mt-2">
					<input
						bind:value={$form.username}
						id="username"
						name="username"
						required
						aria-invalid={$errors.username ? 'true' : undefined}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						{...$constraints.username}
					/>
					{#if $errors.username}
						<p class="mt-2 text-sm text-red-600">{$errors.username}</p>
					{/if}
				</div>
			</div>

			<div>
				<div class="flex items-center justify-between">
					<label for="password" class="block text-sm font-medium leading-6 text-gray-900">
						Password
					</label>
					<div class="text-sm">
						<button
							tabindex="-1"
							type="button"
							class="text-blue-600 hover:underline focus:outline-none"
							on:click={openForgotPasswordModal}
						>
							Forgot password?
						</button>
					</div>
				</div>

				<div class="mt-2">
					<input
						bind:value={$form.password}
						id="password"
						name="password"
						type="password"
						aria-invalid={$errors.password ? 'true' : undefined}
						autocomplete="current-password"
						required
						{...$constraints.password}
						class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
					{#if $errors.password}
						<p class="mt-2 text-sm text-red-600">{$errors.password}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>Sign in
				</button>
			</div>
			{#if $message}
				{#if status == 418}
					<p class="mt-2 text-sm text-green-600">{$message}</p>
				{:else}
					<p class="mt-2 text-sm text-red-600">{$message}</p>
				{/if}
			{/if}
		</form>
		<!-- Conditionally Render Forgot Password Modal -->
		{#if showForgotPassword}
			<ForgotPswd
				bind:value={$form}
				bind:closeComponent={showForgotPassword}
				on:submitForgotPassword={handleForgotPasswordSubmit}
			/>
		{/if}
		<p class="mt-10 text-center text-sm text-gray-500">
			Not a member?
			<a href="sign-up" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
				>Sign up instead.</a
			>
		</p>
	</div>
</div>
