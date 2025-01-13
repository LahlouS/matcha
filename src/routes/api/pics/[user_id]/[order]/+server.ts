import { MAX_F_SIZE } from '$env/static/private';
import { error, redirect } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET({ params, locals: { userRepository } }) {
	const user_id = params.user_id;
	const order = Number(params.order);

	if (order < 0 || order > 4) {
		throw error(400, 'Invalid order');
	}
	try {
		const image = await userRepository.userImage(user_id, order);
		if (!image) {
			const imagePath = path.resolve('static/default_profile_picture.jpg');
			const defaultImage = fs.readFileSync(imagePath);
			const mimeType = 'image/jpg';
			return new Response(defaultImage, {
				headers: {
					'Content-Type': mimeType,
					'Cache-Control': 'max-age=3600'
				}
			});
		}
		const mimeType = 'image/jpeg';
		return new Response(image, {
			headers: {
				'Content-Type': mimeType,
				'Cache-Control': 'max-age=3600'
			}
		});
	} catch (error) {
		console.error(error);
		return new Response('Error reading image', { status: 500 });
	}
}

const MAX_FILE_SIZE = Number(MAX_F_SIZE);

export async function POST({ params, locals: { user, userRepository }, request }) {
	const user_id = params.user_id;
	const order = Number(params.order);
	if (order < 0 || order > 4) {
		throw error(400, 'Invalid order');
	}
	if (!user || user_id !== user.id) {
		throw error(403, 'Forbidden');
	}
	try {
		const formData = await request.formData();
		const imageFile = formData.get('image');

		if (!imageFile || !(imageFile instanceof Blob)) {
			return new Response('No valid image uploaded', { status: 400 });
		}
		if (imageFile.size > MAX_FILE_SIZE) {
			return new Response('Image too large', { status: 400 });
		}
		const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

		await userRepository.saveUserImage(user_id, order, imageBuffer);
		return new Response('Image uploaded and saved successfully', { status: 200 });
	} catch (error) {
		console.error(error);
		return new Response('Error processing image', { status: 500 });
	}
}

export async function DELETE({ locals: { user, userRepository }, params }) {
	const user_id = params.user_id;
	const order = Number(params.order);
	if (order < 0 || order > 4) {
		throw error(400, 'Invalid order');
	}
	if (!user || user_id !== user.id) {
		throw error(403, 'Forbidden');
	}
	try {
		await userRepository.deleteUserImage(user_id, order);
		let isProfilePic = order === 0;
		if (isProfilePic) {
			await userRepository.upsertProfileIsSetup(user_id, false);
		}
		return new Response(JSON.stringify({ isProfilePic }), { status: 200 });
	} catch {
		throw error(500, 'Error deleting image');
	}
}
