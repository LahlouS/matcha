import { goto } from '$app/navigation';

const signout = async () => {
	try {
		const response = await fetch('/api/sign-out', { method: 'POST' });
		if (!response.ok) {
			console.error('Failed to log out:', response.statusText);
			return;
		}
		await goto('/', { invalidateAll: true });
	} catch (error) {
		console.error('An error occurred while logging out:', error);
	}
};

export default signout;
