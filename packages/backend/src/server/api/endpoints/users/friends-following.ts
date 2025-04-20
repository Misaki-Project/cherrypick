/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository, FollowingsRepository, UserProfilesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { QueryService } from '@/core/QueryService.js';
import { FollowingEntityService } from '@/core/entities/FollowingEntityService.js';
import { UtilityService } from '@/core/UtilityService.js';
import { DI } from '@/di-symbols.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	description: 'Show everyone that this user is following.',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			userCount: {
				type: 'integer',
				optional: false, nullable: true,
			},
			users: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'object',
					optional: false, nullable: false,
					ref: 'Following',
				},
			},
		},
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '63e4aba4-4156-4e53-be25-c9559e42d71b',
		},

		forbidden: {
			message: 'Forbidden.',
			code: 'FORBIDDEN',
			id: 'f6cdb0df-c19f-ec5c-7dbb-0ba84a1f92ba',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },

		userId: { type: 'string', format: 'misskey:id' },
		username: { type: 'string' },
		host: {
			type: 'string',
			nullable: true,
			description: 'The local host is represented with `null`.',
		},
	},
	anyOf: [
		{ required: ['userId'] },
		{ required: ['username', 'host'] },
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		private utilityService: UtilityService,
		private followingEntityService: FollowingEntityService,
		private queryService: QueryService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy(ps.userId != null
				? { id: ps.userId }
				: { usernameLower: ps.username!.toLowerCase(), host: this.utilityService.toPunyNullable(ps.host) ?? IsNull() });

			if (user == null) {
				throw new ApiError(meta.errors.noSuchUser);
			}
			if (me == null) {
				return {
					userCount: null, users: [],
				};
			}

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			if (profile.followingVisibility !== 'public' && !await this.roleService.isModerator(me)) {
				if (profile.followingVisibility === 'private') {
					if (me == null || (me.id !== user.id)) {
						return {
							userCount: null, users: [],
						};
					}
				} else if (profile.followingVisibility === 'followers') {
					if (me == null) {
						throw new ApiError(meta.errors.forbidden);
					} else if (me.id !== user.id) {
						const isFollowing = await this.followingsRepository.exists({
							where: {
								followeeId: user.id,
								followerId: me.id,
							},
						});
						if (!isFollowing) {
							return {
								userCount: null, users: [],
							};
						}
					}
				}
			}
			const query = this.followingsRepository.createQueryBuilder('following')
				.andWhere('following.followeeId = :userId', { userId: user.id })
				.innerJoinAndSelect('following.follower', 'follower')
				.andWhere(qb => {
					const subQuery = this.followingsRepository.createQueryBuilder('myFollowing')
						.select('myFollowing.followeeId')
						.where('myFollowing.followerId = :meId', { meId: me.id });
					return `follower.id IN (${subQuery.getQuery()})`;
				})
				.setParameters({ meId: me.id });

			const count = await query.getCount();
			const followings = await query
				.limit(ps.limit)
				.getMany();

			return {
				userCount: count,
				users: await this.followingEntityService.packMany(followings, me, { populateFollower: true }),
			};
		});
	}
}
