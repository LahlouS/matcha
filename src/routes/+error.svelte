<script lang="ts">
	import { page } from '$app/stores';

	let status = $page.status;
	let errorMessage = $page.error?.message;

	function statusToText(status: number): string {
		switch (status) {
			case 404:
				return 'Oops! Love Not Found';
			case 500:
				return 'We’re Having a Little Heartache';
			default:
				return 'Something Unexpected Happened';
		}
	}

	function statusToLongText(status: number): string {
		switch (status) {
			case 404:
				return "Looks like this love match wasn't meant to be. The page you're looking for is just as elusive as true love.";
			case 500:
				return 'Our server’s heart is broken. Give us a moment to get it back in shape.';
			default:
				return "We're having some trouble finding what you're looking for, but don’t give up on love!";
		}
	}
</script>

<div
	class="mx-auto flex w-full max-w-3xl flex-auto flex-col items-center justify-center px-6 py-20 sm:py-40 lg:px-8 text-center"
>
	<p class="text-xl font-semibold leading-8 text-pink-600">{status}</p>
	<h1 class="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
		{statusToText(status)}
	</h1>
	<p class="mt-6 text-lg leading-7 text-gray-600">{statusToLongText(status)}</p>

	{#if errorMessage}
		<p class="mt-6 text-lg leading-7 font-semibold text-red-600">more seriously: {errorMessage}</p>
	{/if}

	<div class="mt-10">
		<a href="/" class="text-sm font-semibold leading-7 text-pink-600 hover:text-pink-400"
			><span aria-hidden="true">&larr;</span> Back to the fun</a
		>
	</div>
</div>
