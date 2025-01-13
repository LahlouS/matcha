import { writable } from 'svelte/store';

export const toasts = writable<Toast[]>([]);

export type ToastWithoutId = {
	type?: undefined | 'success' | 'error' | 'info';
	message: string;
	extraInformation?: string;
	dismissible?: boolean;
	timeout?: number;
};

type Toast = {
	id: number;
	type: string;
	message: string;
	extraInformation: string;
	dismissible: boolean;
	timeout: number;
};

export default ({ type, message, extraInformation, dismissible, timeout }: ToastWithoutId) => {
	const id = Math.floor(Math.random() * 10000);

	const toast: Toast = {
		id,
		type: type ?? '',
		message,
		extraInformation: extraInformation ?? '',
		dismissible: dismissible ?? true,
		timeout: timeout ?? 3000
	};

	toasts.update((all) => [toast, ...all]);

	if (toast.timeout) {
		setTimeout(() => dismissToast(id), toast.timeout);
	}
};

export const dismissToast = (id: number) => {
	toasts.update((all) => all.filter((t) => t.id !== id));
};
