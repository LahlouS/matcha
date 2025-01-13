import type { Database } from 'better-sqlite3';
import type { ToSnakeCase } from './types/snakeCase';
import type { NotificationService } from './server/notificationService';

class ProfileVisitRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'UserRepositoryError';
		this.exception = exception;
	}
}

interface ProfileVisit {
	visitorId: string;
	visitTime: Date;
}

export class ProfileVisitRepository {
	constructor(
		private db: Database,
		private notificationService: NotificationService
	) {}

	public async addVisit(visitorId: string, visitedId: string): Promise<void> {
		this.notificationService.sendNotification(visitedId, 'VISIT', visitorId);
		const result = this.db.prepare<[string, string]>(
			`INSERT INTO profile_visits (visitor_id, visited_user_id)
			VALUES (?, ?)
			ON CONFLICT (visitor_id, visited_user_id) DO NOTHING;`
		);
		return new Promise((resolve, reject) => {
			try {
				result.run(visitorId, visitedId);
				resolve();
			} catch (e) {
				reject(
					new ProfileVisitRepositoryError(
						`Something went wrong saving profile visit of ${visitorId} to ${visitedId}`,
						e
					)
				);
			}
		});
	}

	public async profileVisitsForUser(userId: string): Promise<ProfileVisit[]> {
		const result = this.db.prepare<string[], ToSnakeCase<ProfileVisit>>(
			`SELECT visitor_id, visit_time FROM profile_visits WHERE visited_user_id = ?`
		);

		return new Promise((resolve, reject) => {
			try {
				const rows = result.all(userId);
				resolve(
					rows.map((row) => {
						const date = new Date(row.visit_time);
						return {
							visitorId: row.visitor_id,
							visitTime: date
						} as ProfileVisit;
					})
				);
			} catch (e) {
				reject(
					new ProfileVisitRepositoryError(
						`Something went wrong retrieving visits to the profile of ${userId}`,
						e
					)
				);
			}
		});
	}
}
