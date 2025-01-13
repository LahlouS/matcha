import type { Database } from 'better-sqlite3';
import type { ConnectionRepository } from './server/connectionRepository';

class BlockRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'BlockRepositoryError';
		this.exception = exception;
	}
}

class BlockRepository {
	constructor(private db: Database, private connectionRepository: ConnectionRepository) {}

	public async insertBlockUser(blockerId: string, blockedId: string): Promise<void> {
		try {
			const sql = `INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`;
			const res = this.db.prepare<[string, string]>(sql).run(blockerId, blockedId);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying insert a block for blocker: ${blockerId}, blocked: ${blockedId}`,
				e
			);
		}
	}

	public async blocker(blockerId: string): Promise<string[]> {
		try {
			const sql = `SELECT blocked_id FROM blocks WHERE blocker_id = ?`;
			const res = this.db.prepare<string, { blocked_id: string }>(sql).all(blockerId);
			return res.map((r) => r.blocked_id);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying get list of blocked by user:` + blockerId,
				e
			);
		}
	}

	public async blocked(blockedId: string): Promise<string[]> {
		try {
			const sql = `SELECT blocker_id FROM blocks WHERE blocked_id = ?`;
			const res = this.db.prepare<string, { blocker_id: string }>(sql).all(blockedId);
			return res.map((r) => r.blocker_id);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying get list of user who blocked:` + blockedId,
				e
			);
		}
	}

	public async deleteLikes(blockerId: string, blockedId: string): Promise<void> {
		try {
			const sql = `DELETE FROM likes WHERE liker_id = ? AND liked_id = ?`;
			const query = this.db.prepare<[string, string]>(sql);
			query.run(blockerId, blockedId);
			query.run(blockedId, blockerId);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying delete likes between blocker: ${blockerId}, blocked: ${blockedId}`,
				e
			);
		}
	}

	public async deleteViews(blockerId: string, blockedId: string): Promise<void> {
		try {
			const sql = `DELETE FROM profile_visits WHERE visited_user_id = ? AND visitor_id = ?`;
			const query = this.db.prepare<[string, string]>(sql);
			query.run(blockerId, blockedId);
			query.run(blockedId, blockerId);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying delete views between blocker: ${blockerId}, blocked: ${blockedId}`,
				e
			);
		}
	}

	public async deleteConnection(blockerId: string, blockedId: string): Promise<void> {
		try {
			const sql = `DELETE FROM connections WHERE user_id_1 = ? AND user_id_2 = ?`;
			const query = this.db.prepare<[string, string]>(sql);
			query.run(blockerId, blockedId);
			query.run(blockedId, blockerId);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying delete connection between blocker: ${blockerId}, blocked: ${blockedId}`,
				e
			);
		}
	}

	public async isBlockedOrBlocker(userId1: string, userId2: string): Promise<Boolean> {
		try {
			const sql = `SELECT count(*) as cnt FROM blocks WHERE blocked_id = ? AND blocker_id = ?`;
			const query = this.db.prepare<[string, string], { cnt: number }>(sql);
			const er = query.get(userId1, userId2);
			const ed = query.get(userId2, userId1);

			return er?.cnt || ed?.cnt ? true : false;
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs checking for blocks between blocker: ${userId1}, blocked: ${userId2}`,
				e
			);
		}
	}

	public async blockUser(blockerId: string, blockedId: string) {
		return new Promise((resolve, reject) => {
			try {
				const transaction = this.db.transaction((blockerId: string, blockedId: string) => {
					this.insertBlockUser(blockerId, blockedId);
					this.connectionRepository.flipLikeUser(blockerId, blockedId);
					this.connectionRepository.flipLikeUser(blockedId, blockerId);
					this.deleteViews(blockerId, blockedId);
					// this.deleteLikes(blockerId, blockedId);
					// this.deleteConnection(blockerId, blockedId);
				});
				const result = transaction(blockerId, blockedId);
				resolve(result);
			} catch (error) {
				reject(
					new BlockRepositoryError(
						`Error occurs checking for block transaction blocker: ${blockerId}, blocked: ${blockedId}`,
						error
					)
				);
			}
		});
	}

	public async unblock(blockerId: string, blockedId: string): Promise<void> {
		try {
			const sql = `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`;
			const query = this.db.prepare<[string, string]>(sql);
			query.run(blockerId, blockedId);
		} catch (e) {
			throw new BlockRepositoryError(
				`Error occurs trying to unblock: blocker: ${blockerId}, blocked: ${blockedId}`,
				e
			);
		}
	}
}

export { BlockRepository, BlockRepositoryError };
