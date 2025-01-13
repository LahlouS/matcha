import { error } from '@sveltejs/kit';
import { Reader } from '@maxmind/geoip2-node';
import * as fs from 'fs';

const DATABASE_PATH = 'database/GeoLite2-City.mmdb';

function isValidCoordinates(latitude: number, longitude: number) {
	return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export async function POST({
	request,
	params,
	locals: { user, userRepository },
	getClientAddress
}) {
	const user_id = params.user_id;
	const longitude = Number(params.longitude);
	const latitude = Number(params.latitude);
	if (!user || user_id !== user.id) {
		throw error(403, 'Forbidden');
	}

	// const forwardedFor = request.headers.get('X-Forwarded-For');
	// const clientIp = forwardedFor ? forwardedFor.split(',')[0] : request.connection.remoteAddress;
	// console.log('from forwarded ------> ', clientIp)
	// console.log('location API client address --->', getClientAddress())

	try {
		if (isNaN(longitude) && isNaN(latitude)) {
			// for the moment I hard code 42 ip adress because app is running locally inside a docker.
			const clientAddress = '62.210.34.29'; // getClientAddress()
			const dbBuffer = await fs.readFileSync(DATABASE_PATH);
			const reader = Reader.openBuffer(dbBuffer);
			const response = reader.city(clientAddress);
			userRepository.upsertLocation(
				user_id,
				response.location.longitude,
				response.location.latitude
			);
		} else {
			if (isValidCoordinates(latitude, longitude)) {
				userRepository.upsertLocation(user_id, longitude, latitude);
			}
		}
		return new Response('coordinate uploaded successfully', { status: 200 });
	} catch (error) {
		console.error(error);
		return new Response('Error processing coordinate for user:' + user.id, { status: 500 });
	}
}
