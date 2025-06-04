/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import exp from 'constants';
import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { In } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import type {
	MiMeta,
	MiRole,
	MiRoleAssignment,
	RoleAssignmentsRepository,
	RolesRepository,
	UsersRepository,
} from '@/models/_.js';
import { MemoryKVCache, MemorySingleCache } from '@/misc/cache.js';
import type { MiUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { CacheService } from '@/core/CacheService.js';
import type { RoleCondFormulaValue, RoleExperienceLevelPolicyValue, RoleExperiencePolicyCulcValue, RoleExperienceSetMode } from '@/models/Role.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { IdService } from '@/core/IdService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import type { Packed } from '@/misc/json-schema.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { UserExperience } from '@/models/Role.js';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';

export type RolePolicies = {
	gtlAvailable: boolean;
	ltlAvailable: boolean;
	btlAvailable: boolean;
	canPublicNote: boolean;
	canPublicReplyNote: boolean;
	canPublicQuoteNote: boolean;
	canPublicRenoteSelf: boolean;
	canPublicRenoteLocalNote: boolean;
	canPublicRenoteRemoteNote: boolean;
	canPublicNoteWithFile: boolean;
	canEditNote: boolean;
	canPurgeAccount: boolean;
	scheduleNoteMax: number;
	mentionLimit: number;
	canInvite: boolean;
	inviteLimit: number;
	inviteLimitCycle: number;
	inviteExpirationTime: number;
	canManageCustomEmojis: boolean;
	canManageAvatarDecorations: boolean;
	canSearchNotes: boolean;
	canUseTranslator: boolean;
	canUseAutoTranslate: boolean;
	canHideAds: boolean;
	driveCapacityMb: number;
	alwaysMarkNsfw: boolean;
	canUpdateBioMedia: boolean;
	pinLimit: number;
	antennaLimit: number;
	wordMuteLimit: number;
	webhookLimit: number;
	clipLimit: number;
	noteEachClipsLimit: number;
	userListLimit: number;
	userEachUserListsLimit: number;
	rateLimitFactor: number;
	avatarDecorationLimit: number;
	canImportAntennas: boolean;
	canImportBlocking: boolean;
	canImportFollowing: boolean;
	canImportMuting: boolean;
	canImportUserLists: boolean;
	noteDraftLimit: number;
	canSetFederationAvatarShape: boolean;
	canDeleteAccount: boolean;
	canTruncateAccount: boolean;
};

export const DEFAULT_POLICIES: RolePolicies = {
	gtlAvailable: true,
	ltlAvailable: true,
	btlAvailable: false,
	canPublicNote: true,
	canPublicReplyNote: true,
	canPublicQuoteNote: true,
	canPublicRenoteSelf: true,
	canPublicRenoteLocalNote: true,
	canPublicRenoteRemoteNote: true,
	canPublicNoteWithFile: true,
	canEditNote: true,
	canPurgeAccount: true,
	scheduleNoteMax: 5,
	mentionLimit: 20,
	canInvite: false,
	inviteLimit: 0,
	inviteLimitCycle: 60 * 24 * 7,
	inviteExpirationTime: 0,
	canManageCustomEmojis: false,
	canManageAvatarDecorations: false,
	canSearchNotes: false,
	canUseTranslator: true,
	canUseAutoTranslate: false,
	canHideAds: false,
	driveCapacityMb: 100,
	alwaysMarkNsfw: false,
	canUpdateBioMedia: true,
	pinLimit: 5,
	antennaLimit: 5,
	wordMuteLimit: 200,
	webhookLimit: 3,
	clipLimit: 10,
	noteEachClipsLimit: 200,
	userListLimit: 10,
	userEachUserListsLimit: 50,
	rateLimitFactor: 1,
	avatarDecorationLimit: 1,
	canImportAntennas: true,
	canImportBlocking: true,
	canImportFollowing: true,
	canImportMuting: true,
	canImportUserLists: true,
	noteDraftLimit: 10,
	canSetFederationAvatarShape: true,
	canDeleteAccount: true,
	canTruncateAccount: true,
};

@Injectable()
export class RoleService implements OnApplicationShutdown, OnModuleInit {
	private rootUserIdCache: MemorySingleCache<MiUser['id']>;
	private rolesCache: MemorySingleCache<MiRole[]>;
	private roleAssignmentByUserIdCache: MemoryKVCache<MiRoleAssignment[]>;
	private notificationService: NotificationService;

	public static AlreadyAssignedError = class extends Error { };
	public static NotAssignedError = class extends Error { };

	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.redisForTimelines)
		private redisForTimelines: Redis.Redis,

		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private roleAssignmentsRepository: RoleAssignmentsRepository,

		private cacheService: CacheService,
		private userEntityService: UserEntityService,
		private globalEventService: GlobalEventService,
		private idService: IdService,
		private moderationLogService: ModerationLogService,
		private fanoutTimelineService: FanoutTimelineService,
	) {
		//this.onMessage = this.onMessage.bind(this);

		this.rootUserIdCache = new MemorySingleCache<MiUser['id']>(1000 * 60 * 60 * 24 * 7); // 1week. rootユーザのIDは不変なので長めに
		this.rolesCache = new MemorySingleCache<MiRole[]>(1000 * 60 * 60); // 1h
		this.roleAssignmentByUserIdCache = new MemoryKVCache<MiRoleAssignment[]>(1000 * 60 * 5); // 5m

		this.redisForSub.on('message', this.onMessage);
	}

	async onModuleInit() {
		this.notificationService = this.moduleRef.get(NotificationService.name);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];
			switch (type) {
				case 'roleCreated': {
					const cached = this.rolesCache.get();
					if (cached) {
						cached.push({
							...body,
							updatedAt: new Date(body.updatedAt),
							lastUsedAt: new Date(body.lastUsedAt),
						});
					}
					break;
				}
				case 'roleUpdated': {
					const cached = this.rolesCache.get();
					if (cached) {
						const i = cached.findIndex(x => x.id === body.id);
						if (i > -1) {
							cached[i] = {
								...body,
								updatedAt: new Date(body.updatedAt),
								lastUsedAt: new Date(body.lastUsedAt),
							};
						}
					}
					break;
				}
				case 'roleDeleted': {
					const cached = this.rolesCache.get();
					if (cached) {
						this.rolesCache.set(cached.filter(x => x.id !== body.id));
					}
					break;
				}
				case 'userRoleExperienceUpdated': {
					const cached = this.roleAssignmentByUserIdCache.get(body.userId);
					if (cached) {
						const index = cached.findIndex(x => x.id === body.id);
						if (index > -1) {
							cached[index] = {
								...cached[index],
								experience: body.experience,
							};
						}
					}
					break;
				}
				case 'userRoleAssigned': {
					const cached = this.roleAssignmentByUserIdCache.get(body.userId);
					if (cached) {
						cached.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
							user: null, // joinなカラムは通常取ってこないので
							role: null, // joinなカラムは通常取ってこないので
						});
					}
					break;
				}
				case 'userRoleUnassigned': {
					const cached = this.roleAssignmentByUserIdCache.get(body.userId);
					if (cached) {
						this.roleAssignmentByUserIdCache.set(body.userId, cached.filter(x => x.id !== body.id));
					}
					break;
				}
				default:
					break;
			}
		}
	}

	@bindThis
	private evalCond(user: MiUser, roles: MiRole[], value: RoleCondFormulaValue): boolean {
		try {
			switch (value.type) {
				// ～かつ～
				case 'and': {
					return value.values.every(v => this.evalCond(user, roles, v));
				}
				// ～または～
				case 'or': {
					return value.values.some(v => this.evalCond(user, roles, v));
				}
				// ～ではない
				case 'not': {
					return !this.evalCond(user, roles, value.value);
				}
				// マニュアルロールがアサインされている
				case 'roleAssignedTo': {
					return roles.some(r => r.id === value.roleId);
				}
				// ローカルユーザのみ
				case 'isLocal': {
					return this.userEntityService.isLocalUser(user);
				}
				// リモートユーザのみ
				case 'isRemote': {
					return this.userEntityService.isRemoteUser(user);
				}
				// サスペンド済みユーザである
				case 'isSuspended': {
					return user.isSuspended;
				}
				// 鍵アカウントユーザである
				case 'isLocked': {
					return user.isLocked;
				}
				// botユーザである
				case 'isBot': {
					return user.isBot;
				}
				// 猫である
				case 'isCat': {
					return user.isCat;
				}
				// 「ユーザを見つけやすくする」が有効なアカウント
				case 'isExplorable': {
					return user.isExplorable;
				}
				// ユーザが作成されてから指定期間経過した
				case 'createdLessThan': {
					return this.idService.parse(user.id).date.getTime() > (Date.now() - (value.sec * 1000));
				}
				// ユーザが作成されてから指定期間経っていない
				case 'createdMoreThan': {
					return this.idService.parse(user.id).date.getTime() < (Date.now() - (value.sec * 1000));
				}
				// フォロワー数が指定値以下
				case 'followersLessThanOrEq': {
					return user.followersCount <= value.value;
				}
				// フォロワー数が指定値以上
				case 'followersMoreThanOrEq': {
					return user.followersCount >= value.value;
				}
				// フォロー数が指定値以下
				case 'followingLessThanOrEq': {
					return user.followingCount <= value.value;
				}
				// フォロー数が指定値以上
				case 'followingMoreThanOrEq': {
					return user.followingCount >= value.value;
				}
				// ノート数が指定値以下
				case 'notesLessThanOrEq': {
					return user.notesCount <= value.value;
				}
				// ノート数が指定値以上
				case 'notesMoreThanOrEq': {
					return user.notesCount >= value.value;
				}
				default:
					return false;
			}
		} catch (err) {
			// TODO: log error
			return false;
		}
	}

	@bindThis
	private evalRoleLevel(assign: MiRoleAssignment, role: MiRole): {
		level: number;
		currentLevelExp: number;
		nextLevelExp: number;
		minLevel: number;
		maxLevel: number;
	} | null {
		if (role.target !== 'manualLevel' || !role.levelPolicies) return null;

		const exp = Math.max(assign.experience ?? 0, 0);
		const policies = role.levelPolicies.experiencePolicies;
		const baseLevel = role.levelPolicies.baseLevel;
		const maxLevel = baseLevel + policies.reduce((acc, p) => acc + p.level, 0);

		if (policies.length === 0) {
			return {
				level: baseLevel,
				currentLevelExp: exp,
				nextLevelExp: Number.NaN,
				minLevel: baseLevel,
				maxLevel: maxLevel,
			};
		}

		let level = 0;
		let totalExp = 0;

		for (const policy of policies) {
			if (policy.level <= 0) continue;
			const max = policy.level;
			let diff = max;
			let estLevel = 0;
			const currentExp = exp - totalExp;
			while (diff > 0) {
				switch (policy.type) {
					case 'const':
						if (policy.base * policy.level <= currentExp) {
							totalExp += policy.base * policy.level;
							level += policy.level;
							break;
						} else {
							const nextLevel = Math.floor(currentExp / policy.base);
							const currentLevelExp = Math.floor(exp - totalExp - policy.base * nextLevel);
							return {
								level: baseLevel + level + nextLevel,
								currentLevelExp: currentLevelExp,
								nextLevelExp: policy.base,
								minLevel: baseLevel,
								maxLevel: maxLevel,
							};
						}
					case 'linear':
						if (currentExp >= this.calculateLinearSum(policy.base, policy.additional, estLevel + diff)) {
							estLevel += diff;
						}
						break;
					case 'exponential':
						if (currentExp >= this.calculateExponentialSum(policy.base, policy.additional, policy.exponential, estLevel + diff)) {
							estLevel += diff;
						}
						break;
				}

				if (policy.type === 'const') {
					break;
				}

				if (estLevel === max) {
					switch (policy.type) {
						case 'linear':
							totalExp += this.calculateLinearSum(policy.base, policy.additional, max);
							level += policy.level;
							break;
						case 'exponential':
							totalExp += this.calculateExponentialSum(policy.base, policy.additional, policy.exponential, max);
							level += policy.level;
							break;
					}
					break;
				}
				if (diff !== 1) {
					diff = Math.floor((diff + 1) / 2);
				} else {
					switch (policy.type) {
						case 'linear':
						{
							const current = totalExp + this.calculateLinearSum(policy.base, policy.additional, estLevel);
							const next = Math.floor(current % 1 + policy.base + policy.additional * (estLevel));
							return {
								level: baseLevel + level + estLevel,
								currentLevelExp: Math.floor(exp - current),
								nextLevelExp: next,
								minLevel: baseLevel,
								maxLevel: maxLevel,
							};
						}
						case 'exponential':
						{
							const current = totalExp + this.calculateExponentialSum(policy.base, policy.additional, policy.exponential, estLevel);
							const next = Math.floor(current % 1 + policy.base + policy.additional * Math.pow(policy.exponential, estLevel));
							return {
								level: baseLevel + level + estLevel,
								currentLevelExp: Math.floor(exp - current),
								nextLevelExp: next,
								minLevel: baseLevel,
								maxLevel: maxLevel,
							};
						}
						default:
							return null;
					}
				}
			}
		}
		return {
			level: baseLevel + level,
			currentLevelExp: Math.floor(exp - totalExp),
			nextLevelExp: Number.NaN,
			minLevel: baseLevel,
			maxLevel: maxLevel,
		};
	}

	private calculateExponentialSum(
		base: number,
		additional: number,
		exponential: number,
		level: number,
	): number {
		if (!Number.isInteger(level) || level < 0) {
			throw new Error('level must be a non-negative integer');
		}
		// Case: exponential = 1
		if (exponential === 1) {
			return (base + additional) * (level);
		}
		// Case: exponential != 1
		const geometricSum = (1 - Math.pow(exponential, level)) / (1 - exponential);
		return base * (level) + additional * geometricSum;
	}
	private calculateLinearSum(
		base: number,
		additional: number,
		level: number,
	): number {
		if (!Number.isInteger(level) || level < 0) {
			throw new Error('level must be a non-negative integer');
		}
		return base * level + additional * (level * (level - 1)) / 2;
	}

	@bindThis
	public async attachRoleLevels(roles: MiRole[], assigns: MiRoleAssignment[]): Promise<(MiRole & (UserExperience | undefined))[]> {
		return roles.map(role => {
			if (role.target === 'manualLevel') {
				const assign = assigns.find(a => a.roleId === role.id);
				if (assign) {
					const levelInfo = this.evalRoleLevel(assign, role);
					if (levelInfo) {
						return {
							...role,
							experience: {
								currentLevel: levelInfo.level,
								currentExp: levelInfo.currentLevelExp,
								nextLevelExp: levelInfo.nextLevelExp,
								totalExp: assign.experience ?? 0,
								minLevel: levelInfo.minLevel,
								maxLevel: levelInfo.maxLevel,
							},
						};
					}
				}
			}
			return role;
		});
	}

	@bindThis
	public async getRoles() {
		const roles = await this.rolesCache.fetch(() => this.rolesRepository.findBy({}));
		return roles;
	}

	@bindThis
	public async getUserAssigns(userId: MiUser['id']) {
		const now = Date.now();
		let assigns = await this.roleAssignmentByUserIdCache.fetch(userId, () => this.roleAssignmentsRepository.findBy({ userId }));
		// 期限切れのロールを除外
		assigns = assigns.filter(a => a.expiresAt == null || (a.expiresAt.getTime() > now));
		return assigns;
	}

	@bindThis
	public async getUserRoles(userId: MiUser['id']) {
		const roles = await this.rolesCache.fetch(() => this.rolesRepository.findBy({}));
		const assigns = await this.getUserAssigns(userId);
		const assignedRoles = await this.attachRoleLevels(
			roles.filter(r => assigns.map(x => x.roleId).includes(r.id)),
			assigns,
		);
		const user = roles.some(r => r.target === 'conditional') ? await this.cacheService.findUserById(userId) : null;
		const matchedCondRoles = roles.filter(r => r.target === 'conditional' && user && this.evalCond(user, assignedRoles, r.condFormula));
		return [...assignedRoles, ...matchedCondRoles];
	}

	/**
	 * 指定ユーザーのバッジロール一覧取得
	 */
	@bindThis
	public async getUserBadgeRoles(userId: MiUser['id']) {
		const now = Date.now();
		let assigns = await this.roleAssignmentByUserIdCache.fetch(userId, () => this.roleAssignmentsRepository.findBy({ userId }));
		// 期限切れのロールを除外
		assigns = assigns.filter(a => a.expiresAt == null || (a.expiresAt.getTime() > now));
		const roles = await this.rolesCache.fetch(() => this.rolesRepository.findBy({}));
		const assignedRoles = await this.attachRoleLevels(
			roles.filter(r => assigns.map(x => x.roleId).includes(r.id)),
			assigns,
		);
		const assignedBadgeRoles = assignedRoles.filter(r => r.asBadge);
		const badgeCondRoles = roles.filter(r => r.asBadge && (r.target === 'conditional'));

		if (badgeCondRoles.length > 0) {
			const user = roles.some(r => r.target === 'conditional') ? await this.cacheService.findUserById(userId) : null;
			const matchedBadgeCondRoles = user ? badgeCondRoles.filter(r => this.evalCond(user, assignedRoles, r.condFormula)) : [];
			return [...assignedBadgeRoles, ...matchedBadgeCondRoles];
		} else {
			return assignedBadgeRoles;
		}
	}

	@bindThis
	public async getUserPolicies(userId: MiUser['id'] | null): Promise<RolePolicies> {
		const basePolicies = { ...DEFAULT_POLICIES, ...this.meta.policies };

		if (userId == null) return basePolicies;

		const roles = await this.getUserRoles(userId);
		const assigns = await this.getUserAssigns(userId);

		const calc = <T extends keyof RolePolicies>(name: T, aggregate: (values: RolePolicies[T][]) => RolePolicies[T]) => {
			if (roles.length === 0) return basePolicies[name];
			const policies = roles.map(role => {
				const policy = role.policies[name] ?? { priority: 0, useDefault: true };

				// manualLevelロールの場合、レベルに基づいて制御
				if (role.target === 'manualLevel' && role.levelPolicies) {
					const assign = assigns.find(a => a.roleId === role.id);
					if (assign) {
						const levelInfo = this.evalRoleLevel(assign, role);
						if (levelInfo) {
							// レベルに応じたポリシー値を設定
							const levelPolicy = role.policies[name].policyAsLevel;
							const level = levelInfo.level - levelInfo.minLevel;
							if (levelPolicy) {
								let startLevel = 0;
								for (let i = 0; i < levelPolicy.length; i++) {
									const policyValue = levelPolicy[i];
									const nextLevel = levelPolicy.length - 1 !== i ? (startLevel + level) : levelInfo.maxLevel - levelInfo.minLevel;
									if (level >= startLevel && level <= nextLevel) {
										switch (policyValue.type) {
											case 'base':
												policy.useDefault = true;
												break;
											case 'const':
												policy.useDefault = false;
												policy.value = policyValue.base;
												break;
											case 'multiplier':
												policy.useDefault = false;
												policy.value = Math.min(
													policyValue.base + policyValue.additional * (levelInfo.level - startLevel),
													Number.MAX_SAFE_INTEGER,
												);
												break;
											default:
												console.error(`Unexpected policyValue.type: ${policyValue.type}`);
												break;
										}
										break;
									}
									startLevel += policyValue.level;
								}
							}
						}
					}
				}
				return policy;
			});

			const p2 = policies.filter(policy => policy.priority === 2);
			if (p2.length > 0) return aggregate(p2.map(policy => policy.useDefault ? basePolicies[name] : policy.value));

			const p1 = policies.filter(policy => policy.priority === 1);
			if (p1.length > 0) return aggregate(p1.map(policy => policy.useDefault ? basePolicies[name] : policy.value));

			return aggregate(policies.map(policy => policy.useDefault ? basePolicies[name] : policy.value));
		};

		return {
			gtlAvailable: calc('gtlAvailable', vs => vs.some(v => v === true)),
			ltlAvailable: calc('ltlAvailable', vs => vs.some(v => v === true)),
			btlAvailable: calc('btlAvailable', vs => vs.some(v => v === true)),
			canPublicNote: calc('canPublicNote', vs => vs.some(v => v === true)),
			canPublicReplyNote: calc('canPublicReplyNote', vs => vs.some(v => v === true)),
			canPublicQuoteNote: calc('canPublicQuoteNote', vs => vs.some(v => v === true)),
			canPublicRenoteSelf: calc('canPublicRenoteSelf', vs => vs.some(v => v === true)),
			canPublicRenoteLocalNote: calc('canPublicRenoteLocalNote', vs => vs.some(v => v === true)),
			canPublicRenoteRemoteNote: calc('canPublicRenoteRemoteNote', vs => vs.some(v => v === true)),
			canPublicNoteWithFile: calc('canPublicNoteWithFile', vs => vs.some(v => v === true)),
			canEditNote: calc('canEditNote', vs => vs.some(v => v === true)),
			canPurgeAccount: calc('canPurgeAccount', vs => vs.some(v => v === true)),
			scheduleNoteMax: calc('scheduleNoteMax', vs => Math.max(...vs)),
			mentionLimit: calc('mentionLimit', vs => Math.max(...vs)),
			canInvite: calc('canInvite', vs => vs.some(v => v === true)),
			inviteLimit: calc('inviteLimit', vs => Math.max(...vs)),
			inviteLimitCycle: calc('inviteLimitCycle', vs => Math.max(...vs)),
			inviteExpirationTime: calc('inviteExpirationTime', vs => Math.max(...vs)),
			canManageCustomEmojis: calc('canManageCustomEmojis', vs => vs.some(v => v === true)),
			canManageAvatarDecorations: calc('canManageAvatarDecorations', vs => vs.some(v => v === true)),
			canSearchNotes: calc('canSearchNotes', vs => vs.some(v => v === true)),
			canUseTranslator: calc('canUseTranslator', vs => vs.some(v => v === true)),
			canUseAutoTranslate: calc('canUseAutoTranslate', vs => vs.some(v => v === true)),
			canHideAds: calc('canHideAds', vs => vs.some(v => v === true)),
			driveCapacityMb: calc('driveCapacityMb', vs => Math.max(...vs)),
			alwaysMarkNsfw: calc('alwaysMarkNsfw', vs => vs.some(v => v === true)),
			canUpdateBioMedia: calc('canUpdateBioMedia', vs => vs.some(v => v === true)),
			pinLimit: calc('pinLimit', vs => Math.max(...vs)),
			antennaLimit: calc('antennaLimit', vs => Math.max(...vs)),
			wordMuteLimit: calc('wordMuteLimit', vs => Math.max(...vs)),
			webhookLimit: calc('webhookLimit', vs => Math.max(...vs)),
			clipLimit: calc('clipLimit', vs => Math.max(...vs)),
			noteEachClipsLimit: calc('noteEachClipsLimit', vs => Math.max(...vs)),
			userListLimit: calc('userListLimit', vs => Math.max(...vs)),
			userEachUserListsLimit: calc('userEachUserListsLimit', vs => Math.max(...vs)),
			rateLimitFactor: calc('rateLimitFactor', vs => Math.max(...vs)),
			avatarDecorationLimit: calc('avatarDecorationLimit', vs => Math.max(...vs)),
			canImportAntennas: calc('canImportAntennas', vs => vs.some(v => v === true)),
			canImportBlocking: calc('canImportBlocking', vs => vs.some(v => v === true)),
			canImportFollowing: calc('canImportFollowing', vs => vs.some(v => v === true)),
			canImportMuting: calc('canImportMuting', vs => vs.some(v => v === true)),
			canImportUserLists: calc('canImportUserLists', vs => vs.some(v => v === true)),
			noteDraftLimit: calc('noteDraftLimit', vs => Math.max(...vs)),
			canSetFederationAvatarShape: calc('canSetFederationAvatarShape', vs => vs.some(v => v === true)),
			canDeleteAccount: calc('canDeleteAccount', vs => vs.some(v => v === true)),
			canTruncateAccount: calc('canTruncateAccount', vs => vs.some(v => v === true)),
		};
	}

	@bindThis
	public async isModerator(user: { id: MiUser['id']; isRoot: MiUser['isRoot'] } | null): Promise<boolean> {
		if (user == null) return false;
		return user.isRoot || (await this.getUserRoles(user.id)).some(r => r.isModerator || r.isAdministrator);
	}

	@bindThis
	public async isAdministrator(user: { id: MiUser['id']; isRoot: MiUser['isRoot'] } | null): Promise<boolean> {
		if (user == null) return false;
		return user.isRoot || (await this.getUserRoles(user.id)).some(r => r.isAdministrator);
	}

	@bindThis
	public async isExplorable(role: { id: MiRole['id'] } | null): Promise<boolean> {
		if (role == null) return false;
		const check = await this.rolesRepository.findOneBy({ id: role.id });
		if (check == null) return false;
		return check.isExplorable;
	}

	/**
	 * モデレーター権限のロールが割り当てられているユーザID一覧を取得する.
	 *
	 * @param opts.includeAdmins 管理者権限も含めるか(デフォルト: true)
	 * @param opts.includeRoot rootユーザも含めるか(デフォルト: false)
	 * @param opts.excludeExpire 期限切れのロールを除外するか(デフォルト: false)
	 */
	@bindThis
	public async getModeratorIds(opts?: {
		includeAdmins?: boolean,
		includeRoot?: boolean,
		excludeExpire?: boolean,
	}): Promise<MiUser['id'][]> {
		const includeAdmins = opts?.includeAdmins ?? true;
		const includeRoot = opts?.includeRoot ?? false;
		const excludeExpire = opts?.excludeExpire ?? false;

		const roles = await this.rolesCache.fetch(() => this.rolesRepository.findBy({}));
		const moderatorRoles = includeAdmins
			? roles.filter(r => r.isModerator || r.isAdministrator)
			: roles.filter(r => r.isModerator);

		const assigns = moderatorRoles.length > 0
			? await this.roleAssignmentsRepository.findBy({ roleId: In(moderatorRoles.map(r => r.id)) })
			: [];

		// Setを経由して重複を除去（ユーザIDは重複する可能性があるので）
		const now = Date.now();
		const resultSet = new Set(
			assigns
				.filter(it =>
					(excludeExpire)
						? (it.expiresAt == null || it.expiresAt.getTime() > now)
						: true,
				)
				.map(a => a.userId),
		);

		if (includeRoot) {
			const rootUserId = await this.rootUserIdCache.fetch(async () => {
				const it = await this.usersRepository.createQueryBuilder('users')
					.select('id')
					.where({ isRoot: true })
					.getRawOne<{ id: string }>();
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return it!.id;
			});
			resultSet.add(rootUserId);
		}

		return [...resultSet].sort((x, y) => x.localeCompare(y));
	}

	@bindThis
	public async getModerators(opts?: {
		includeAdmins?: boolean,
		includeRoot?: boolean,
		excludeExpire?: boolean,
	}): Promise<MiUser[]> {
		const ids = await this.getModeratorIds(opts);
		return ids.length > 0
			? await this.usersRepository.findBy({
				id: In(ids),
			})
			: [];
	}

	@bindThis
	public async getAdministratorIds(): Promise<MiUser['id'][]> {
		const roles = await this.rolesCache.fetch(() => this.rolesRepository.findBy({}));
		const administratorRoles = roles.filter(r => r.isAdministrator);
		const assigns = administratorRoles.length > 0 ? await this.roleAssignmentsRepository.findBy({
			roleId: In(administratorRoles.map(r => r.id)),
		}) : [];
		// TODO: isRootなアカウントも含める
		return assigns.map(a => a.userId);
	}

	@bindThis
	public async getAdministrators(): Promise<MiUser[]> {
		const ids = await this.getAdministratorIds();
		const users = ids.length > 0 ? await this.usersRepository.findBy({
			id: In(ids),
		}) : [];
		return users;
	}

	@bindThis
	public async assignExperience(userId: MiUser['id'], roleId: MiRole['id'], experience: number, setMode: RoleExperienceSetMode, moderator?: MiUser, assignForce?: boolean, note?: string): Promise<void> {
		const now = Date.now();
		const role = await this.rolesRepository.findOneByOrFail({ id: roleId });
		let assign = await this.roleAssignmentsRepository.findOneBy({ userId, roleId });
		let setExperience = 0;
		let beforeValue = 0;
		if (!assign) {
			if (!assignForce) {
				throw new RoleService.NotAssignedError();
			}
			//新規でアサインする
			switch (setMode) {
				case 'set':
				case 'add':
					setExperience = experience;
					break;
				case 'multiplier':
					setExperience = 0;
					break;
			}
			setExperience = Math.min(Math.max(Math.floor(setExperience), 0), Number.MAX_SAFE_INTEGER);
			assign = await this.roleAssignmentsRepository.insertOne({
				id: this.idService.gen(now),
				roleId: roleId,
				userId: userId,
				experience: setExperience,
			});

			this.rolesRepository.update(roleId, {
				lastUsedAt: new Date(),
			});
		} else {
			beforeValue = assign.experience ?? 0;
			switch (setMode) {
				case 'set':
					setExperience = experience;
					break;
				case 'add':
					setExperience = (assign.experience ?? 0) + experience;
					break;
				case 'multiplier':
					setExperience = (assign.experience ?? 0) * experience;
					break;
			}
			setExperience = Math.min(Math.max(Math.floor(setExperience), 0), Number.MAX_SAFE_INTEGER);
			await this.roleAssignmentsRepository.update(assign.id, { experience: setExperience });
		}

		this.rolesRepository.update(roleId, {
			lastUsedAt: new Date(),
		});
		const user = await this.usersRepository.findOneByOrFail({ id: userId });

		// ToDo : ここに経験値の通知を追加する
		/*
		if (role.isPublic && user.host === null) {
			this.notificationService.createNotification(userId, 'roleAssigned', {
				roleId: roleId,
			});
		}
		*/

		if (moderator) {
			this.moderationLogService.log(moderator, 'changeExperienceRole', {
				roleId: roleId,
				roleName: role.name,
				userId: userId,
				userUsername: user.username,
				userHost: user.host,
				actionType: setMode,
				actionValue: experience,
				beforeValue: beforeValue,
				afterValue: setExperience,
				note: note ?? null,
			});
		}
		this.globalEventService.publishInternalEvent('userRoleExperienceUpdated', assign);
	}

	@bindThis
	public async assign(userId: MiUser['id'], roleId: MiRole['id'], expiresAt: Date | null = null, moderator?: MiUser): Promise<void> {
		const now = Date.now();

		const role = await this.rolesRepository.findOneByOrFail({ id: roleId });

		const existing = await this.roleAssignmentsRepository.findOneBy({
			roleId: roleId,
			userId: userId,
		});

		if (existing) {
			if (existing.expiresAt && (existing.expiresAt.getTime() < now)) {
				await this.roleAssignmentsRepository.delete({
					roleId: roleId,
					userId: userId,
				});
			} else {
				throw new RoleService.AlreadyAssignedError();
			}
		}

		const created = await this.roleAssignmentsRepository.insertOne({
			id: this.idService.gen(now),
			expiresAt: expiresAt,
			roleId: roleId,
			userId: userId,
		});

		this.rolesRepository.update(roleId, {
			lastUsedAt: new Date(),
		});

		this.globalEventService.publishInternalEvent('userRoleAssigned', created);

		const user = await this.usersRepository.findOneByOrFail({ id: userId });

		if (role.isPublic && user.host === null) {
			this.notificationService.createNotification(userId, 'roleAssigned', {
				roleId: roleId,
			});
		}

		if (moderator) {
			this.moderationLogService.log(moderator, 'assignRole', {
				roleId: roleId,
				roleName: role.name,
				userId: userId,
				userUsername: user.username,
				userHost: user.host,
				expiresAt: expiresAt ? expiresAt.toISOString() : null,
			});
		}
	}

	@bindThis
	public async unassign(userId: MiUser['id'], roleId: MiRole['id'], moderator?: MiUser): Promise<void> {
		const now = new Date();

		const existing = await this.roleAssignmentsRepository.findOneBy({ roleId, userId });
		if (existing == null) {
			throw new RoleService.NotAssignedError();
		} else if (existing.expiresAt && (existing.expiresAt.getTime() < now.getTime())) {
			await this.roleAssignmentsRepository.delete({
				roleId: roleId,
				userId: userId,
			});
			throw new RoleService.NotAssignedError();
		}

		await this.roleAssignmentsRepository.delete(existing.id);

		this.rolesRepository.update(roleId, {
			lastUsedAt: now,
		});

		this.globalEventService.publishInternalEvent('userRoleUnassigned', existing);

		if (moderator) {
			const [user, role] = await Promise.all([
				this.usersRepository.findOneByOrFail({ id: userId }),
				this.rolesRepository.findOneByOrFail({ id: roleId }),
			]);
			this.moderationLogService.log(moderator, 'unassignRole', {
				roleId: roleId,
				roleName: role.name,
				userId: userId,
				userUsername: user.username,
				userHost: user.host,
			});
		}
	}

	@bindThis
	public async addNoteToRoleTimeline(note: Packed<'Note'>): Promise<void> {
		const roles = await this.getUserRoles(note.userId);

		const redisPipeline = this.redisForTimelines.pipeline();

		for (const role of roles) {
			this.fanoutTimelineService.push(`roleTimeline:${role.id}`, note.id, 1000, redisPipeline);
			this.globalEventService.publishRoleTimelineStream(role.id, 'note', note);
		}

		redisPipeline.exec();
	}

	@bindThis
	public async create(values: Partial<MiRole>, moderator?: MiUser): Promise<MiRole> {
		const date = new Date();
		const created = await this.rolesRepository.insertOne({
			id: this.idService.gen(date.getTime()),
			updatedAt: date,
			lastUsedAt: date,
			name: values.name,
			description: values.description,
			color: values.color,
			iconUrl: values.iconUrl,
			target: values.target,
			condFormula: values.condFormula,
			isPublic: values.isPublic,
			isAdministrator: values.isAdministrator,
			isModerator: values.isModerator,
			isExplorable: values.isExplorable,
			asBadge: values.asBadge,
			canEditMembersByModerator: values.canEditMembersByModerator,
			displayOrder: values.displayOrder,
			policies: values.policies,
			levelPolicies: values.levelPolicies,
		});

		this.globalEventService.publishInternalEvent('roleCreated', created);

		if (moderator) {
			this.moderationLogService.log(moderator, 'createRole', {
				roleId: created.id,
				role: created,
			});
		}

		return created;
	}

	@bindThis
	public async update(role: MiRole, params: Partial<MiRole>, moderator?: MiUser): Promise<void> {
		const date = new Date();
		await this.rolesRepository.update(role.id, {
			updatedAt: date,
			...params,
		});

		const updated = await this.rolesRepository.findOneByOrFail({ id: role.id });
		this.globalEventService.publishInternalEvent('roleUpdated', updated);

		if (moderator) {
			this.moderationLogService.log(moderator, 'updateRole', {
				roleId: role.id,
				before: role,
				after: updated,
			});
		}
	}

	@bindThis
	public async delete(role: MiRole, moderator?: MiUser): Promise<void> {
		await this.rolesRepository.delete({ id: role.id });
		this.globalEventService.publishInternalEvent('roleDeleted', role);

		if (moderator) {
			this.moderationLogService.log(moderator, 'deleteRole', {
				roleId: role.id,
				role: role,
			});
		}
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onMessage);
		this.roleAssignmentByUserIdCache.dispose();
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
