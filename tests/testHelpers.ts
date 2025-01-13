import { faker } from '@faker-js/faker';
import { generateIdFromEntropySize, type User } from 'lucia';

// todo: fix this
function anyUser(overrides: Partial<User> = {}): User {
	const userId = generateIdFromEntropySize(10);
	return {
		id: userId,
		email: faker.internet.email(),
		username: faker.internet.username(),
		profileIsSetup: faker.datatype.boolean(),
		...overrides
	};
}

export { anyUser };
