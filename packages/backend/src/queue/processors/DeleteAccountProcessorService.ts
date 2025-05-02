/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Not, IsNull, MoreThan } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { DriveFilesRepository, NotesRepository, FollowRequestsRepository, UserProfilesRepository, UsersRepository, FollowingsRepository, UserListMembershipsRepository } from '@/models/_.js';
import type Logger from '@/logger.js';
import { DriveService } from '@/core/DriveService.js';
import type { MiUser } from '@/models/User.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import type { MiNote } from '@/models/Note.js';
import { RelationshipJobData } from '@/queue/types.js';
import { QueueService } from '@/core/QueueService.js';
import { EmailService } from '@/core/EmailService.js';
import { RoleService } from '@/core/RoleService.js';
import { bindThis } from '@/decorators.js';
import { SearchService } from '@/core/SearchService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type * as Bull from 'bullmq';
import type { DbUserDeleteJobData } from '../types.js';

@Injectable()
export class DeleteAccountProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		@Inject(DI.followRequestsRepository)
		private followRequestsRepository: FollowRequestsRepository,

		@Inject(DI.userListMembershipsRepository)
		private userListMembershipsRepository: UserListMembershipsRepository,

		private userEntityService: UserEntityService,
		private driveService: DriveService,
		private emailService: EmailService,
		private roleService: RoleService,
		private queueLoggerService: QueueLoggerService,
		private searchService: SearchService,
		private queueService: QueueService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('delete-account');
	}

	private async deleteNotes(user: MiUser) {
		while (true) {
			const notes = await this.notesRepository.find({
				where: {
					userId: user.id,
				},
				take: 100,
			});

			if (notes.length === 0) {
				break;
			}

			await this.notesRepository.delete(notes.map(note => note.id));

			for (const note of notes) {
				await this.searchService.unindexNote(note);
			}
		}

		this.logger.succ('All of notes deleted');
	}

	private async deleteFiles(user: MiUser) {
		while (true) {
			const files = await this.driveFilesRepository.find({
				where: {
					userId: user.id,
				},
				take: 10,
			});

			if (files.length === 0) {
				break;
			}

			for (const file of files) {
				await this.driveService.deleteFileSync(file);
			}
		}

		this.logger.succ('All of files deleted');
	}

	@bindThis
	public async process(job: Bull.Job<DbUserDeleteJobData>): Promise<string | void> {
		this.logger.info(`Deleting account of ${job.data.user.id} ...`, { userDeleteJobData: job.data });
		const user = await this.usersRepository.findOneBy({ id: job.data.user.id });
		const isRemote = user ? this.userEntityService.isRemoteUser(user) : false;
		if (user == null) {
			return;
		}
		const { /*canDeleteContent,*/ canPurgeAccount } = !job.data.force
			? await this.roleService.getUserPolicies(user.id)
			: { /*canDeleteContent: true,*/ canPurgeAccount: true };

		if (job.data.onlyFiles) {
			//if (!canDeleteContent) return 'Permission denied';

			await this.deleteFiles(user);
			return 'Files deleted';
		}

		{ // Send email notification
			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });
			if (profile.email && profile.emailVerified) {
				this.emailService.sendEmail(profile.email, 'Account deleted',
					'Your account has been deleted.',
					'Your account has been deleted.');
			}
		}

		// soft指定されている場合は物理削除しない
		if (!(/*canDeleteContent && */canPurgeAccount) || job.data.soft) {
			await this.usersRepository.update(user.id, {
				token: null,
				isSuspended: true,
				isDeleted: true,
			});
			//削除しない代わりにユーザーの痕跡をすべて解除する
			(async () => {
				//await this.unsubscribeList(user).catch(e => {});
				await this.unFollowAll(user).catch(e => {});
			})();
		} else {
			await this.usersRepository.delete(job.data.user.id);
		}

		return `[${job.data.user.id}] Account deleted`;
	}

	@bindThis
	private async unsubscribeList(user: MiUser): Promise<void> {
		//ToDo
		/*const listed = await this.userListMembershipsRepository.find({
			where: {
				userId: user.id,
				userListId: Not(IsNull()),
			},
		});
		for (const membership of listed) {
			await this.userListMembershipsRepository.delete(membership.id);
		}*/
	}
	@bindThis

	private async unFollowAll(user: MiUser): Promise<void> {
		//その人に対しての全てのフォローリクエストを解除
		this.followRequestsRepository.delete({
			followeeId: user.id,
		});
		this.followRequestsRepository.delete({
			followerId: user.id,
		});
		//フォローとフォロワーを全て削除
		const followings = await this.followingsRepository.find({
			where: {
				followerId: user.id,
				followeeId: Not(IsNull()),
			},
		});
		const followers = await this.followingsRepository.find({
			where: {
				followerId: Not(IsNull()),
				followeeId: user.id,
			},
		});
		const jobs: RelationshipJobData[] = [];
		for (const following of followings) {
			if (following.followeeId && following.followerId) {
				jobs.push({
					from: { id: following.followerId },
					to: { id: following.followeeId },
					silent: true,
				});
			}
		}
		for (const follower of followers) {
			if (follower.followeeId && follower.followerId) {
				jobs.push({
					from: { id: follower.followerId },
					to: { id: follower.followeeId },
					silent: true,
				});
			}
		}
		this.queueService.createUnfollowJob(jobs);
	}
}
