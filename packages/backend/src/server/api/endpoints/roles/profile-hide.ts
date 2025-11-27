/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Inject, Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import type { RoleAssignmentsRepository, RolesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['role'],

	requireCredential: true,
	kind: 'write:account',
	requireAdmin: false,

	limit: {
		duration: ms('1hour'),
		max: 20,
		minInterval: ms('1sec'),
	},

	errors: {
		noSuchRole: {
			message: 'No such role.',
			code: 'NO_SUCH_ROLE',
			id: '30aaaee3-4792-48dc-ab0d-cf501a575ac5',
		},
		cannotHideThisRole: {
			message: 'This role cannot be hidden.',
			code: 'CANNOT_HIDE_THIS_ROLE',
			id: 'a21fb109-1d95-9a10-fe18-42ea7c91dabe',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roleId: { type: 'string', format: 'misskey:id' },
		hide: { type: 'boolean', nullable: false },
	},
	required: ['roleId', 'hide'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private roleAssignmentsRepository: RoleAssignmentsRepository,

		private queryService: QueryService,
		private userEntityService: UserEntityService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const role = await this.rolesRepository.findOneBy({
				id: ps.roleId,
				isPublic: true,
			});

			if (role == null) {
				throw new ApiError(meta.errors.noSuchRole);
			}

			if (!role.canHideProfileByUser) {
				throw new ApiError(meta.errors.cannotHideThisRole);
			}

			await roleService.hideUserProfileRole(me.id, ps.roleId, ps.hide);
		});
	}
}
