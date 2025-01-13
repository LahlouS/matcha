import { describe, expect } from 'vitest';
import { itWithFixtures } from '../fixtures';
import { ImageRepositoryError } from '$lib/imageRepository';

describe('ImageRepository', () => {
	itWithFixtures(
		'should be able to save an image',
		async ({ savedUser, imageRepository, image }) => {
			await imageRepository.upsertImage(savedUser.id, 0, image);

			const found = await imageRepository.image(savedUser.id, 0);
			expect(found).toEqual(image);
		}
	);

	itWithFixtures(
		'saving image on couple (userId, order) that already exist should update image',
		async ({ savedUser, imageRepository, image, image2 }) => {
			await imageRepository.upsertImage(savedUser.id, 0, image);
			await imageRepository.upsertImage(savedUser.id, 0, image2);

			const found = await imageRepository.image(savedUser.id, 0);
			expect(found).toEqual(image2);
		}
	);

	itWithFixtures(
		'should throw an error when trying to save with higher order than 4',
		async ({ savedUser, imageRepository, image }) => {
			await expect(imageRepository.upsertImage(savedUser.id, 5, image)).rejects.toThrow(
				ImageRepositoryError
			);
		}
	);

	itWithFixtures(
		'should be able to delete a picture',
		async ({ savedUser, imageRepository, image }) => {
			await imageRepository.upsertImage(savedUser.id, 0, image);

			imageRepository.deleteImage(savedUser.id, 0);

			const found = await imageRepository.image(savedUser.id, 0);
			expect(found).toBeNull();
		}
	);

	itWithFixtures(
		'should be able to get uploaded image orders',
		async ({ savedUser, imageRepository, image }) => {
			await imageRepository.upsertImage(savedUser.id, 0, image);

			const found = await imageRepository.listImages(savedUser.id);

			expect(found).toStrictEqual([0]);
		}
	);

	itWithFixtures(
		'Does not error if deleting non existing image',
		async ({ savedUser, imageRepository }) => {
			await imageRepository.deleteImage(savedUser.id, 0);
		}
	);

	itWithFixtures(
		'should return false because user has not set profile picture',
		async ({ savedUser, imageRepository }) => {
			const check = await imageRepository.checkIfImageProfileIsSet(savedUser.id);
			expect(check).toBe(false);
		}
	);

	itWithFixtures(
		'should return true because user has set profile picture',
		async ({ savedUser, imageRepository, image }) => {
			await imageRepository.upsertImage(savedUser.id, 0, image);

			const check = await imageRepository.checkIfImageProfileIsSet(savedUser.id);
			expect(check).toBe(true);
		}
	);
});
