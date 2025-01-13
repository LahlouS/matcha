import type { Database } from 'better-sqlite3';
import { averages, fameRatingWeights, scoreWeights } from './domain/browse';
import type { CommonTagStats, BrowsingInfo, fameStats } from './domain/browse';

class BrowsingRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'BrowsingRepositoryError';
		this.exception = exception;
	}
}

class BrowsingRepository {
	constructor(private db: Database) {}

	public async allOtherUsers(id: string): Promise<string[]> {
		return new Promise((resolve, reject) => {
			try {
				const result = this.db
					.prepare<string, { id: string }>(
						`SELECT u.id
   						FROM users AS u
						WHERE u.id != ? AND u.profile_is_setup = 1`
					)
					.all(id)
					.map((user) => user.id);
				resolve(result);
			} catch (e) {
				reject(new BrowsingRepositoryError('Something went wrong fetching other users', e));
			}
		});
	}

	public async browsingInfoFor(id: string): Promise<BrowsingInfo> {
		return new Promise((resolve, reject) => {
			try {
				const sql = `
					SELECT  u.id,
							u.username,
							p.biography,
							p.gender,
							p.age,
							p.sexual_preference,
							l.longitude,
							l.latitude,
							GROUP_CONCAT(t.tag) AS tags
					FROM users AS u
					INNER JOIN profile_info AS p ON u.id = p.user_id
					INNER JOIN location AS l ON u.id = l.user_id
					LEFT JOIN tags AS t ON u.id = t.user_id
					WHERE u.id = ?
					GROUP BY u.id
				`;

				const res = this.db.prepare<string>(sql).get(id);
				if (res) res.mask = true;
				if (res && res.tags) {
					res.tags = (res.tags as string).split(',');
				} else if (res) {
					res.tags = [];
				}
				resolve(res);
			} catch (error) {
				reject(
					new BrowsingRepositoryError(
						'Something went wrong getting browsing infos for user id: ' + id,
						error
					)
				);
			}
		});
	}

	public async numberOfLiked(userId: string) {
		try {
			const sql = `
				SELECT count(id) AS cnt FROM likes WHERE liked_id = ?`;
			const query = this.db.prepare<string>(sql);
			const result = query.get(userId);
			return result.cnt;
		} catch (e) {
			throw new BrowsingRepositoryError(
				'an error occured trying to get the number of like for user:' + userId,
				e
			);
		}
	}

	public async numberOfMatch(userId: string) {
		try {
			const sql = `SELECT count() AS cnt, l1.liked_id AS liked1, l1.liker_id AS liker1, l2.liked_id AS liked2, l2.liker_id AS liker2 FROM likes AS l1, likes AS l2
				WHERE liked1 = ? AND liker2 = ? AND liker1 = liked2`;
			const query = this.db.prepare<string, string>(sql);
			const result = query.get(userId, userId);
			return result.cnt;
		} catch (e) {
			throw new BrowsingRepositoryError(
				'an error occured trying to get the number of like for user:' + userId,
				e
			);
		}
	}

	public async numberOfVisited(userId: string) {
		try {
			const sql = `
				SELECT count(visited_user_id) AS cnt FROM profile_visits WHERE visited_user_id = ?`;
			const query = this.db.prepare<string>(sql);
			const result = query.get(userId);
			return result.cnt;
		} catch (e) {
			throw new BrowsingRepositoryError(
				'an error occured trying to get the number of visits for user:' + userId,
				e
			);
		}
	}

	public async fameStats(): Promise<fameStats> {
		try {
			let total_user: number = this.db.prepare(`SELECT count(id) AS cnt FROM users`).get().cnt;
			let total_view: number = this.db
				.prepare(`SELECT count(visited_user_id) AS cnt FROM profile_visits`)
				.get().cnt;
			let total_like: number = this.db
				.prepare(`SELECT count(liked_id) AS cnt FROM likes`)
				.get().cnt;
			let total_match: number = this.db
				.prepare(
					`SELECT count() AS cnt, l1.liked_id AS liked1, l1.liker_id AS liker1, l2.liked_id AS liked2, l2.liker_id AS liker2 FROM likes AS l1, likes AS l2
				WHERE liker1 = liked2`
				)
				.get().cnt;

			let ids = this.db.prepare(`SELECT id FROM users WHERE profile_is_setup = 1`).all();
			ids = ids.map((v) => v.id);

			let view_list = await Promise.all(ids.map((idObj: string) => this.numberOfVisited(idObj)));
			let like_list = await Promise.all(ids.map((idObj: string) => this.numberOfLiked(idObj)));
			let match_list = await Promise.all(ids.map((idObj: string) => this.numberOfMatch(idObj)));

			total_user = total_user === 0 ? 1 : total_user;

			let average_views = total_view / total_user;
			let average_likes = total_like / total_user;
			let average_match = total_match / total_user;

			const view_var = view_list.reduce(
				(sum, x) => sum + Math.pow(x - average_views, 2) / total_user,
				0
			);
			const like_var = like_list.reduce(
				(sum, x) => sum + Math.pow(x - average_views, 2) / total_user,
				0
			);
			const match_var = match_list.reduce(
				(sum, x) => sum + Math.pow(x - average_views, 2) / total_user,
				0
			);

			let standart_dev_views = Math.sqrt(view_var);
			let standart_dev_likes = Math.sqrt(like_var);
			let standart_dev_match = Math.sqrt(match_var);

			let stats: fameStats = {
				average_views: average_views,
				average_likes: average_likes,
				average_match: average_match,
				standart_dev_views: standart_dev_views,
				standart_dev_likes: standart_dev_likes,
				standart_dev_match: standart_dev_match
			};

			return stats;
		} catch (e) {
			throw new BrowsingRepositoryError('an error occured trying to compute fame rate stats', e);
		}
	}

	public async fameRatingFor(userId: string, stats: fameStats | null = null): Promise<number> {
		try {
			const views = await this.numberOfVisited(userId);
			const likes = await this.numberOfLiked(userId);
			const match = await this.numberOfMatch(userId);

			const a = fameRatingWeights.views;
			const b = fameRatingWeights.likes;
			const c = fameRatingWeights.match;

			const averageViews =
				stats && stats.average_views != 0 ? stats.average_views : averages.average_views;
			const averageLikes =
				stats && stats.average_likes != 0 ? stats.average_likes : averages.average_likes;
			const averageMatch =
				stats && stats.average_match != 0 ? stats.average_match : averages.average_match;
			// const stdViews = (stats && stats.standart_dev_views != 0) ? stats.standart_dev_views : averages.standart_dev_views
			// const stdLikes = (stats && stats.standart_dev_likes != 0) ? stats.standart_dev_likes : averages.standart_dev_likes
			// const stdMatch = (stats && stats.standart_dev_match != 0) ? stats.standart_dev_match : averages.standart_dev_match

			const fameRating =
				a * (views / averageViews) + b * (likes / averageLikes) + c * (match / averageMatch);
			return fameRating;
		} catch (e) {
			throw new BrowsingRepositoryError(
				'Error occurs trying to compute fame Rating for user' + userId,
				e
			);
		}
	}

	public async commonTagsStats(userId: string, otherUserId: string): Promise<CommonTagStats> {
		try {
			const sql = `SELECT * FROM tags WHERE user_id = ? OR user_id = ?`;

			const query = this.db.prepare<string, string>(sql);

			const res = query.all(userId, otherUserId);

			const user1tags = res.filter((u) => u.user_id == userId);
			const user2tags = res.filter((u) => u.user_id == otherUserId);

			let cnt = 0;

			user1tags.forEach((u: any) => {
				if (user2tags.some((u2) => u.tag === u2.tag)) cnt += 1;
			});

			return {
				commonTag: cnt,
				ntagsUser1: user1tags.length,
				ntagsUser2: user2tags.length
			};
		} catch (e) {
			throw new BrowsingRepositoryError(
				'Error occurs trying to compute common tag for ' + userId,
				e
			);
		}
	}

	public async scoring(
		userId: string,
		userToScoreId: string,
		distance: number,
		fameRatingPreComp: number | null = null
	) {
		const fameWeight = scoreWeights.fameRating;
		const commonTagWeight = scoreWeights.tags;
		const distWeight = scoreWeights.distance;

		let fameRate = 0;
		if (!fameRatingPreComp) {
			fameRate = await this.fameRatingFor(userToScoreId);
		} else {
			fameRate = fameRatingPreComp;
		}
		const commonTags = await this.commonTagsStats(userId, userToScoreId);
		const tagStat = commonTags.commonTag / (commonTags.ntagsUser1 + commonTags.ntagsUser2);

		const dist = distance; // TODO update for distance metric to be relevant
		const res = Number(
			(fameWeight * fameRate + tagStat * commonTagWeight + (1 / (1 + dist)) * distWeight).toFixed(4)
		);

		return res;
	}

	public async fameRateAll(users: BrowsingInfo[], stats: fameStats | null = null) {
		try {
			for (const u of users) {
				u.fameRate = await this.fameRatingFor(u.id, stats);
			}
			let minval = users.reduce((min, u) => (u.fameRate < min ? u.fameRate : min), Infinity);

			const maxval = users.reduce((max, u) => (u.fameRate > max ? u.fameRate : max), -Infinity);

			if (maxval == minval) {
				minval = 0;
			}

			if (maxval - minval != 0) {
				for (const u of users) {
					u.fameRate = (u.fameRate - minval) / (maxval - minval);
				}
			}
			return users;
		} catch (error) {
			throw new BrowsingRepositoryError(
				'Error occurs trying to compute fameRating for every users',
				error
			);
		}
	}

	public async scoreThemAll(userId: string, users: BrowsingInfo[]) {
		try {
			for (const u of users) {
				u.score = await this.scoring(userId, u.id, u.localisation, u.fameRate);
			}
			return users;
		} catch (error) {
			throw new BrowsingRepositoryError(
				'Error occurs trying to compute score for every users',
				error
			);
		}
	}

	public async sort(users: BrowsingInfo[]) {
		try {
			const compare = (a: any, b: any) => {
				return b.score - a.score; // Sort by age in ascending order
			};
			users = users.sort(compare);
			return users;
		} catch (error) {
			throw new BrowsingRepositoryError('Error occurs trying to sort the list by score', error);
		}
	}

	public async preFilter(userSexualPreference: string, users: BrowsingInfo[]) {
		try {
			if (userSexualPreference === 'all') return users;
			let test = 'other';
			if (userSexualPreference === 'men') test = 'man';
			else if (userSexualPreference === 'women') test = 'woman';
			return users.filter((u) => u.gender === test);
		} catch (error) {
			throw new BrowsingRepositoryError(
				'Error occurs trying to pre filter the list by score',
				error
			);
		}
	}

	public async distanceAll(
		userCoordinate: BrowsingInfo,
		usersCoordinates: BrowsingInfo[]
	): Promise<BrowsingInfo[]> {
		for (const other of usersCoordinates) {
			other.localisation = Number(
				(
					await this.haversineDistance(
						userCoordinate.latitude,
						userCoordinate.longitude,
						other.latitude,
						other.longitude
					)
				).toFixed(2)
			);
		}
		return usersCoordinates;
	}

	public async haversineDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number
	): Promise<number> {
		try {
			const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

			// Convert degrees to radians
			const lat1Rad = toRadians(lat1);
			const lon1Rad = toRadians(lon1);
			const lat2Rad = toRadians(lat2);
			const lon2Rad = toRadians(lon2);

			// Radius of Earth in kilometers (mean radius)
			const R = 6371;

			// Differences in coordinates
			const dLat = lat2Rad - lat1Rad;
			const dLon = lon2Rad - lon1Rad;

			// Haversine formula
			const a =
				Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

			// Distance in kilometers
			return R * c;
		} catch (error) {
			throw new BrowsingRepositoryError('Error occurs trying to compute harvesing distance', error);
		}
	}
}

export { BrowsingRepository, BrowsingRepositoryError };
