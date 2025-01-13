import type { Database } from 'better-sqlite3';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class ImageRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'ImageRepositoryError';
		this.exception = exception;
	}
}

export const MAX_PICTURES = 5;

class ImageRepository {
	constructor(
		private destination: string,
		private db: Database
	) {}

	public async upsertImage(userId: string, order: number, imageBuffer: Buffer): Promise<number> {
		if (order < 0 || order >= MAX_PICTURES) {
			throw new ImageRepositoryError('Image order out of range', null);
		}
		const sql = this.db.prepare<[string, number]>(`
            INSERT OR IGNORE INTO profile_pictures (user_id, image_order)
            VALUES (?, ?)
        `);
		try {
			sql.run(userId, order);
		} catch (e) {
			throw new ImageRepositoryError('Error trying to insert image into profile_pictures table', e);
		}
		try {
			const filePath = this.destination + `/${userId}_${order}.jpg`;
			const writeStream = fs.createWriteStream(filePath);
			await new Promise((resolve, reject) => {
				writeStream.on('finish', resolve);
				writeStream.on('error', reject);
				writeStream.write(imageBuffer);
				writeStream.end();
			});
		} catch (e) {
			throw new ImageRepositoryError('Error trying to write image to disk', e);
		}
		return order;
	}

	public async listImages(userId: string): Promise<number[]> {
		try {
			const sql = this.db.prepare<[string], { image_order: number }>(`
				SELECT image_order FROM profile_pictures WHERE user_id = ?
			`);
			return sql.all(userId).map((row) => row.image_order);
		} catch (error) {
			throw new ImageRepositoryError('Error trying to list images', error);
		}
	}

	public async image(userId: string, order: number): Promise<Buffer | null> {
		try {
			const sql = this.db.prepare<[string, number], { id: string }>(`
                SELECT user_id, image_order FROM profile_pictures WHERE user_id = ? AND image_order = ?
                `);
			const res = sql.get(userId, order);
			if (!res || !res.user_id) {
				return null;
			}
			const filePath = this.destination + `/${userId}_${order}.jpg`;
			return fs.readFileSync(filePath);
		} catch (error) {
			throw new ImageRepositoryError(
				'Error trying to fetch the image from user_id and order',
				error
			);
		}
	}

	public async deleteImage(user_id: string, order: number) {
		try {
			const result = this.db
				.prepare<
					[string, number]
				>('DELETE FROM profile_pictures WHERE user_id = ? AND image_order = ?')
				.run(user_id, order);
			if (result.changes === 0) {
				return;
			}
			fs.unlinkSync(this.destination + `/${user_id}_${order}.jpg`);
		} catch (error) {
			throw new ImageRepositoryError('Error trying delete the image', error);
		}
	}

	public async checkIfImageProfileIsSet(userId: string): Promise<boolean> {
		try {
			const sql = this.db.prepare<string>(`SELECT count(user_id) AS cnt
										FROM profile_pictures
										WHERE user_id == ?
										AND image_order == 0`);
			const result = sql.get(userId);
			return result.cnt == 0 ? false : true;
		} catch (e) {
			throw new ImageRepositoryError('Error occur checking for user profile picture', e);
		}
	}
}

export { ImageRepository };
