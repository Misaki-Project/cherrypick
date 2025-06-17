/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { ChatService } from '@/core/ChatService.js';
import { ApiError } from '@/server/api/error.js';
import type { BlockingsRepository } from '@/models/_.js';

export const meta = {
	tags: ['chat'],

	requireCredential: true,

	kind: 'write:chat',

	errors: {
		noSuchMessage: {
			message: 'No such message.',
			code: 'NO_SUCH_MESSAGE',
			id: '9b5839b9-0ba0-4351-8c35-37082093d200',
		},

		youHaveBeenBlocked: {
			message: 'You cannot send a reaction because you have been blocked by this user.',
			code: 'YOU_HAVE_BEEN_BLOCKED',
			id: 'c15a5199-7422-4968-941a-2a462c478f7d',
		},

		youHaveBlocking: {
			message: 'You cannot send a reaction because you have blocked this user.',
			code: 'YOU_HAVE_BLOCKING',
			id: 'a0f1b8c2-4d3e-4f5b-9a6c-7d0e1f2b3c5d',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		messageId: { type: 'string', format: 'misskey:id' },
		reaction: { type: 'string' },
	},
	required: ['messageId', 'reaction'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.blockingsRepository)
		private blockingsRepository: BlockingsRepository,

		private chatService: ChatService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.chatService.checkChatAvailability(me.id, 'write');

			const message = await this.chatService.findMessageById(ps.messageId);
			if (message == null) {
				throw new ApiError(meta.errors.noSuchMessage);
			}
			// Check blocking
			const block = await this.blockingsRepository.findOneBy({
				blockerId: message.fromUserId,
				blockeeId: me.id,
			});
			if (block) {
				throw new ApiError(meta.errors.youHaveBeenBlocked);
			}

			const blocking = await this.blockingsRepository.findOneBy({
				blockerId: me.id,
				blockeeId: message.fromUserId,
			});
			if (blocking) {
				throw new ApiError(meta.errors.youHaveBlocking);
			}

			await this.chatService.react(ps.messageId, me.id, ps.reaction);
		});
	}
}
