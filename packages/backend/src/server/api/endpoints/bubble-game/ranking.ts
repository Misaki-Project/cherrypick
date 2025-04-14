/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { MoreThan } from 'typeorm';
import { min } from 'date-fns';
import { $7 } from 're2';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { BubbleGameRecordsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { maximum } from '@/misc/prelude/array.js';

export const meta = {
	allowGet: true,
	cacheSec: 15,

	errors: {
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: {
					type: 'string', format: 'misskey:id',
					optional: false, nullable: false,
				},
				score: {
					type: 'integer',
					optional: false, nullable: false,
				},
				user: {
					type: 'object',
					optional: true, nullable: false,
					ref: 'UserLite',
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		gameMode: { type: 'string' },
		sinceHour: { type: 'integer', nullable: true, minimum: 0, maximum: 24 * 365 * 3 },
	},
	required: ['gameMode'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.bubbleGameRecordsRepository)
		private bubbleGameRecordsRepository: BubbleGameRecordsRepository,

		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps) => {
			let sinceHour = 24 * 7;
			if (ps.sinceHour) sinceHour = ps.sinceHour;
			const records = await this.bubbleGameRecordsRepository.find({
				where: {
					gameMode: ps.gameMode,
					... (sinceHour > 0 ? {
						seededAt: MoreThan(new Date(Date.now() - 1000 * 60 * 60 * sinceHour)),
					} : {}),
				},
				order: {
					score: 'DESC',
				},
				take: 20,
				relations: ['user'],
			});

			const users = await this.userEntityService.packMany(records.map(r => r.user!), null);

			return records.map(r => ({
				id: r.id,
				score: r.score,
				registeredAt: r.seededAt,
				user: users.find(u => u.id === r.user!.id),
			}));
		});
	}
}
