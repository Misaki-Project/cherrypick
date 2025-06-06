/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { RolesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { RoleService } from '@/core/RoleService.js';
import { RoleExperienceLevelPolicyValue } from '@/models/Role.js';

export const meta = {
	tags: ['admin', 'role'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:roles',

	errors: {
		noSuchRole: {
			message: 'No such role.',
			code: 'NO_SUCH_ROLE',
			id: 'cd23ef55-09ad-428a-ac61-95a45e124b32',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roleId: { type: 'string', format: 'misskey:id' },
		name: { type: 'string' },
		description: { type: 'string' },
		color: { type: 'string', nullable: true },
		iconUrl: { type: 'string', nullable: true },
		target: { type: 'string', enum: ['manual', 'conditional', 'manualLevel'] },
		condFormula: { type: 'object' },
		isPublic: { type: 'boolean' },
		isModerator: { type: 'boolean' },
		isAdministrator: { type: 'boolean' },
		isExplorable: { type: 'boolean' },
		canHideProfileByUser: { type: 'boolean' },
		asBadge: { type: 'boolean' },
		canEditMembersByModerator: { type: 'boolean' },
		displayOrder: { type: 'number' },
		policies: {
			type: 'object',
		},
		levelPolicies: {
			type: 'object',
			properties: {
				baseLevel: { type: 'number', nullable: false },
				experiencePolicies: { type: 'array', items: {
					type: 'object',
					properties: {
						level: { type: 'number', nullable: false },
						type: { type: 'string', enum: ['const', 'linear', 'exponential'], nullable: false },
						base: { type: 'number', nullable: false },
						additional: { type: 'number', nullable: true },
						exponential: { type: 'number', nullable: true },
					},
				},
																										required: ['level', 'type', 'base'],
				},
			},
			nullable: false,
			required: ['baseLevel', 'experiencePolicies'],
		},
	},
	required: [
		'roleId',
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const role = await this.rolesRepository.findOneBy({ id: ps.roleId });
			if (role == null) {
				throw new ApiError(meta.errors.noSuchRole);
			}

			await this.roleService.update(role, {
				name: ps.name,
				description: ps.description,
				color: ps.color,
				iconUrl: ps.iconUrl,
				target: ps.target,
				condFormula: ps.condFormula,
				isPublic: ps.isPublic,
				isModerator: ps.isModerator,
				isAdministrator: ps.isAdministrator,
				isExplorable: ps.isExplorable,
				canHideProfileByUser: ps.canHideProfileByUser,
				asBadge: ps.asBadge,
				canEditMembersByModerator: ps.canEditMembersByModerator,
				displayOrder: ps.displayOrder,
				policies: ps.policies,
				levelPolicies: ps.levelPolicies ? {
					baseLevel: ps.levelPolicies.baseLevel,
					experiencePolicies: ps.levelPolicies.experiencePolicies.map(ep => ({
						level: ep.level ?? 0,
						type: ep.type === 'exponential' || ep.type === 'linear' || ep.type === 'const' ? ep.type : 'const',
						base: ep.base ?? 0,
						additional: ep.additional ?? null,
						exponential: ep.exponential ?? null,
					})) as unknown as RoleExperienceLevelPolicyValue & { level: number; }[],
				} : role.levelPolicies,
			}, me);
		});
	}
}
