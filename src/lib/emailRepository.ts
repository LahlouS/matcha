import { APP_PASSWORD, GOOGLE_EMAIL } from '$env/static/private';
import nodemailer from 'nodemailer';
import type { Database } from 'better-sqlite3';
import { generateIdFromEntropySize } from 'lucia';
import { TimeSpan, createDate } from 'oslo';
import { PUBLIC_BASE_URL } from '$env/static/public';
import type { Transporter } from 'nodemailer';
import type { ToSnakeCase } from './types/snakeCase';

class EmailRepositoryError extends Error {
	exception: unknown;
	constructor(message: string, exception: unknown) {
		super(message);
		this.name = 'EmailRepositoryError';
		this.exception = exception;
	}
}

interface EmailSession {
	id: string;
	expiresAt: number;
	userId: string;
	email: string;
}

// singleton instance
let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
	if (!transporter) {
		transporter = createTransporter();
	}
	return transporter;
}

function createTransporter(): Transporter {
	const transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		auth: {
			user: GOOGLE_EMAIL,
			pass: APP_PASSWORD
		}
	});
	transporter.verify(function (error: any) {
		if (error) {
			console.error(error);
			throw new EmailRepositoryError('Error occur trying to instaciate mail service', error);
		}
	});
	return transporter;
}

class EmailRepository {
	constructor(
		private db: Database,
		private transporter: Transporter
	) {}

	public async emailVerification(userId: string, email: string) {
		try {
			await this.updateEmailIsSetup(userId, false);
			const token = this.createEmailVerificationToken(userId, email);
			const link = `${PUBLIC_BASE_URL}/api/email-verification/` + token;
			const res = await this.verificationLinkTo(email, link);
			console.log('in emailVerification: verificationLink = ', link);
		} catch (error) {
			throw new EmailRepositoryError(
				'Something went wrong doing emailVerification procedure for: ' + email,
				error
			);
		}
	}

	public async passwordVerification(userId: string, email: string, passwordHash: string) {
		try {
			await this.upsertPasswordIsSet(userId, false);
			const verificationToken = this.createResetPasswordToken(userId, email, passwordHash);
			const verificationLink =
				`${PUBLIC_BASE_URL}/profile/${userId}/edit-profile/reset-pswd/` + verificationToken;
			const res_email = await this.resetLinkTo(email, verificationLink);
			console.log('in passwordVerification: verificationLink = ', verificationLink);
		} catch (error) {
			throw new EmailRepositoryError(
				'Something went wrong doing passwordVerification procedure for: ' + email,
				error
			);
		}
	}

	public async verificationLinkTo(email: string, link: string) {
		const body = `
					Hello horny robot !\n
					Excited to be part of the matcha adventure ??\n
					please click the link below to verify your e-mail adress.\n
					${link}
				`;
		const message = {
			from: GOOGLE_EMAIL,
			to: email,
			subject: 'Your verification link',
			text: body
		};
		return new Promise((resolve: any, reject: any) => {
			this.transporter.sendMail(message, (err: any, info: any) => {
				if (err) {
					console.error(err);
					reject(
						new EmailRepositoryError(
							'Error occur trying to send mail for the following email:' + email,
							err
						)
					);
				} else {
					resolve(info);
				}
			});
		});
	}

	public async resetLinkTo(email: string, link: string) {
		const body = `
					Hello horny robot !\n
					please click the link below to reset your password\n
					${link}
				`;
		const message = {
			from: GOOGLE_EMAIL,
			to: email,
			subject: 'Your reset password link',
			text: body
		};
		return new Promise((resolve: any, reject: any) => {
			this.transporter.sendMail(message, (err: any, info: any) => {
				if (err) {
					console.error(err);
					reject(
						new EmailRepositoryError(
							'Error occur trying to send mail (reset pswd link) for the following email:' + email,
							err
						)
					);
				} else {
					resolve(info);
				}
			});
		});
	}

	public async resetPasswordLinkTo(email: string, link: string) {
		const body = `
					Hello clumsy robot !\n
					dizzy with love ?\n
					please click the link below to verify your e-mail adress.\n
					${link}
				`;
		const message = {
			from: GOOGLE_EMAIL,
			to: email,
			subject: 'Your reset password link',
			text: body
		};
		return new Promise((resolve: any, reject: any) => {
			this.transporter.sendMail(message, (err: any, info: any) => {
				if (err) {
					console.error(err);
					reject(
						new EmailRepositoryError(
							'Error occur trying to send mail (reset password) for the following email:' + email,
							err
						)
					);
				} else {
					resolve(info);
				}
			});
		});
	}

	public createEmailVerificationToken(userId: string, email: string): string {
		try {
			// optionally invalidate all existing tokens
			this.deleteEmailSession(userId);
			const tokenId = generateIdFromEntropySize(25); // 40 characters long
			this.insertEmailSession(userId, tokenId, email, createDate(new TimeSpan(3, 'm')));
			return tokenId;
		} catch (error) {
			throw new EmailRepositoryError(
				'Something went wrong creating the email verification token for: ' + email,
				error
			);
		}
	}

	public createResetPasswordToken(userId: string, email: string, old_pswd: string): string {
		try {
			this.deleteResetPasswordSession(userId);
			const tokenId = generateIdFromEntropySize(25); // 40 characters long
			this.insertResetPasswordSession(
				userId,
				tokenId,
				email,
				createDate(new TimeSpan(3, 'm')),
				old_pswd
			);
			return tokenId;
		} catch (error) {
			throw new EmailRepositoryError(
				'Something went wrong creating the password verification token for:' + email,
				error
			);
		}
	}

	public emailSessionByUserId(userId: string): ToSnakeCase<EmailSession> | null {
		try {
			const sql = this.db.prepare<string, ToSnakeCase<EmailSession>>(`
				SELECT *
				FROM email_sessions
				WHERE user_id = ?
				ORDER BY expires_at DESC
				`);
			const res = sql.get(userId);
			if (!res) {
				return null;
			}
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to get e-mail session for userId:' + userId,
				error
			);
		}
	}

	public emailSession(tokenId: string) {
		try {
			const sql = this.db.prepare<string>(`
				SELECT *
				FROM email_sessions
				WHERE id = ?
				`);
			const res = sql.get(tokenId);
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to get e-mail session for sessionid:' + tokenId,
				error
			);
		}
	}

	public passwordSession(tokenId: string) {
		try {
			const sql = this.db.prepare<string>(`
				SELECT *
				FROM reset_pswd_sessions
				WHERE id = ?
				`);
			const res = sql.get(tokenId);
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to get reset password session for sessionid:' + tokenId,
				error
			);
		}
	}

	public async deleteEmailSession(id: string) {
		try {
			const sql = this.db.prepare<string>(`
				DELETE FROM email_sessions WHERE id = ?
				`);
			const res = sql.run(id);
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to delete e-mail session for user:' + id,
				error
			);
		}
	}

	public async deleteResetPasswordSession(id: string) {
		try {
			const sql = this.db.prepare<string>(`
				DELETE FROM reset_pswd_sessions WHERE id = ?
				`);
			const res = sql.run(id);
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to delete reset password session for user:' + id,
				error
			);
		}
	}

	public async deleteResetPasswordSessionByUserId(userId: string) {
		try {
			const sql = this.db.prepare<string>(`
				DELETE FROM reset_pswd_sessions WHERE  user_id = ?
				`);
			const res = sql.run(userId);
			return res;
		} catch (error) {
			throw new EmailRepositoryError(
				'Error occurs trying to delete reset password session for user:' + userId,
				error
			);
		}
	}

	public async insertEmailSession(userId: string, tokenId: string, userEmail: string, date: Date) {
		try {
			const sql = this.db.prepare<[string, number, string, string]>(`
				INSERT INTO email_sessions (id, expires_at, user_id, email)
				VALUES (?, ?, ?, ?)
				`);
			const res = sql.run(tokenId, date.getTime(), userId, userEmail);
			return res;
		} catch (error) {
			console.log('console log error from inserEmailsession', error);
			throw new EmailRepositoryError(
				'Error occurs trying to insert e-mail session for user:' + userId,
				error
			);
		}
	}

	public async insertResetPasswordSession(
		userId: string,
		tokenId: string,
		userEmail: string,
		date: Date,
		old_pswd: string
	) {
		try {
			const sql = this.db.prepare<[string, number, string, string, string]>(`
				INSERT INTO reset_pswd_sessions (id, expires_at, user_id, email, old_password_hash)
				VALUES (?, ?, ?, ?, ?)
				`);
			const res = sql.run(tokenId, date.getTime(), userId, userEmail, old_pswd);
			return res;
		} catch (error) {
			console.log('console log error from insertResetPasswordSession', error);
			throw new EmailRepositoryError(
				'Error occurs trying to insert reset password session for user:' + userId,
				error
			);
		}
	}

	public async updateEmailIsSetup(userId: string, val: boolean) {
		try {
			const tmp: number = val ? 1 : 0;
			const updateProfileSet = this.db.prepare<[number, string]>(
				'UPDATE users SET email_is_setup = ? WHERE id = ?'
			);
			const res = updateProfileSet.run(tmp, userId);
		} catch (error) {
			console.log('console log error from updateEmailIsSetup', error);
			throw new EmailRepositoryError(
				'Error occurs trying to update email_is_setup for user:' + userId,
				error
			);
		}
	}

	public async upsertPasswordIsSet(userId: string, flag: boolean) {
		try {
			const val = flag ? 1 : 0;
			const sql = this.db.prepare<[number, string]>(
				`UPDATE users SET password_is_set = ? WHERE id = ?`
			);
			const res = sql.run(val, userId);
			return res;
		} catch (error) {
			console.log('error in the EmailRepository:upsertPasswordIsSet:', error);
			throw new EmailRepositoryError('Error occur in the upsertPasswordIsSet function', error);
		}
	}
}

export { EmailRepository };
