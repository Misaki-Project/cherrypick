<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<MkInput v-if="readonly" :modelValue="role.id" :readonly="true">
		<template #label>ID</template>
	</MkInput>

	<MkInput v-model="role.name" :readonly="readonly">
		<template #label>{{ i18n.ts._role.name }}</template>
	</MkInput>

	<MkTextarea v-model="role.description" :readonly="readonly">
		<template #label>{{ i18n.ts._role.description }}</template>
	</MkTextarea>

	<MkColorInput v-model="role.color">
		<template #label>{{ i18n.ts.color }}</template>
	</MkColorInput>

	<MkInput v-model="role.iconUrl" type="url">
		<template #label>{{ i18n.ts._role.iconUrl }}</template>
	</MkInput>

	<MkInput v-model="role.displayOrder" type="number">
		<template #label>{{ i18n.ts._role.displayOrder }}</template>
		<template #caption>{{ i18n.ts._role.descriptionOfDisplayOrder }}</template>
	</MkInput>

	<MkSelect v-model="rolePermission" :readonly="readonly">
		<template #label><i class="ti ti-shield-lock"></i> {{ i18n.ts._role.permission }}</template>
		<template #caption><div v-html="i18n.ts._role.descriptionOfPermission.replaceAll('\n', '<br>')"></div></template>
		<option value="normal">{{ i18n.ts.normalUser }}</option>
		<option value="moderator">{{ i18n.ts.moderator }}</option>
		<option value="administrator">{{ i18n.ts.administrator }}</option>
	</MkSelect>

	<MkSelect v-model="role.target" :readonly="readonly">
		<template #label><i class="ti ti-users"></i> {{ i18n.ts._role.assignTarget }}</template>
		<template #caption><div v-html="i18n.ts._role.descriptionOfAssignTarget.replaceAll('\n', '<br>')"></div></template>
		<option value="manual">{{ i18n.ts._role.manual }}</option>
		<option value="conditional">{{ i18n.ts._role.conditional }}</option>
		<option value="manualLevel">{{ i18n.ts._role.manualLevel }}</option>
	</MkSelect>

	<MkFolder v-if="role.target === 'conditional'" defaultOpen>
		<template #label>{{ i18n.ts._role.condition }}</template>
		<div class="_gaps">
			<RolesEditorFormula v-model="role.condFormula"/>
		</div>
	</MkFolder>

	<MkFolder v-if="role.target === 'manualLevel'" defaultOpen>
		<template #label>{{ i18n.ts._role.levelPolicies }}</template>
		<div class="_gaps">
			<RolesEditorLevel v-model="levelPolicies" :readonly="readonly"/>
		</div>
	</MkFolder>

	<MkSwitch v-model="role.canEditMembersByModerator" :readonly="readonly">
		<template #label>{{ i18n.ts._role.canEditMembersByModerator }}</template>
		<template #caption>{{ i18n.ts._role.descriptionOfCanEditMembersByModerator }}</template>
	</MkSwitch>

	<MkSwitch v-model="role.isPublic" :readonly="readonly">
		<template #label>{{ i18n.ts._role.isPublic }}</template>
		<template #caption>{{ i18n.ts._role.descriptionOfIsPublic }}</template>
	</MkSwitch>

	<MkSwitch v-model="role.asBadge" :readonly="readonly">
		<template #label>{{ i18n.ts._role.asBadge }}</template>
		<template #caption>{{ i18n.ts._role.descriptionOfAsBadge }}</template>
	</MkSwitch>

	<MkSwitch v-model="role.isExplorable" :readonly="readonly">
		<template #label>{{ i18n.ts._role.isExplorable }}</template>
		<template #caption>{{ i18n.ts._role.descriptionOfIsExplorable }}</template>
	</MkSwitch>

	<FormSlot>
		<template #label><i class="ti ti-license"></i> {{ i18n.ts._role.policies }}</template>
		<div class="_gaps_s">
			<MkInput ref="queryEl" v-model="q" type="search">
				<template #prefix><i class="ti ti-search"></i></template>
				<template v-if="q != ''" #suffix><button type="button" :class="$style.deleteBtn" tabindex="-1" @click="q = ''; queryEl?.focus();"><i class="ti ti-x"></i></button></template>
			</MkInput>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.rateLimitFactor, 'rateLimitFactor'])">
				<template #label>{{ i18n.ts._role._options.rateLimitFactor }}</template>
				<template #suffix>
					<span v-if="role.policies.rateLimitFactor.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ `${Math.floor(role.policies.rateLimitFactor.value * 100)}%` }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.rateLimitFactor)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.rateLimitFactor" :readonly="readonly"/>
					</div>
					<div v-else>
						<span>{{ i18n.ts._role._options.descriptionOfRateLimitFactor }}</span>
						<MkSwitch v-model="role.policies.rateLimitFactor.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkRange :modelValue="role.policies.rateLimitFactor.value * 100" :min="0" :max="400" :step="10" :textConverter="(v) => `${v}%`" @update:modelValue="v => role.policies.rateLimitFactor.value = (v / 100)">
							<template #label>{{ i18n.ts._role._options.rateLimitFactor }}</template>
							<template #caption>{{ i18n.ts._role._options.descriptionOfRateLimitFactor }}</template>
						</MkRange>
					</div>
					<MkRange v-model="role.policies.rateLimitFactor.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.gtlAvailable, 'gtlAvailable'])">
				<template #label>{{ i18n.ts._role._options.gtlAvailable }}</template>
				<template #suffix>
					<span v-if="role.policies.gtlAvailable.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.gtlAvailable.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.gtlAvailable)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.gtlAvailable" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.gtlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.gtlAvailable.value" :disabled="role.policies.gtlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.gtlAvailable.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.ltlAvailable, 'ltlAvailable'])">
				<template #label>{{ i18n.ts._role._options.ltlAvailable }}</template>
				<template #suffix>
					<span v-if="role.policies.ltlAvailable.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.ltlAvailable.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.ltlAvailable)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.ltlAvailable" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.ltlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.ltlAvailable.value" :disabled="role.policies.ltlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.ltlAvailable.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.btlAvailable, 'btlAvailable'])">
				<template #label>{{ i18n.ts._role._options.btlAvailable }}</template>
				<template #suffix>
					<span v-if="role.policies.btlAvailable.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.btlAvailable.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.btlAvailable)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.btlAvailable" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.btlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.btlAvailable.value" :disabled="role.policies.btlAvailable.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.btlAvailable.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicNote, 'canPublicNote'])">
				<template #label>{{ i18n.ts._role._options.canPublicNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicNote.value" :disabled="role.policies.canPublicNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicReplyNote, 'canPublicReplyNote'])">
				<template #label>{{ i18n.ts._role._options.canPublicReplyNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicReplyNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicReplyNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicReplyNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicReplyNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicReplyNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicReplyNote.value" :disabled="role.policies.canPublicReplyNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicReplyNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicQuoteNote, 'canPublicQuoteNote'])">
				<template #label>{{ i18n.ts._role._options.canPublicQuoteNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicQuoteNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicQuoteNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicQuoteNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicQuoteNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicQuoteNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicQuoteNote.value" :disabled="role.policies.canPublicQuoteNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicQuoteNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicRenoteSelf, 'canPublicRenoteSelf'])">
				<template #label>{{ i18n.ts._role._options.canPublicRenoteSelf }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicRenoteSelf.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicRenoteSelf.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicRenoteSelf)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicRenoteSelf" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicRenoteSelf.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicRenoteSelf.value" :disabled="role.policies.canPublicRenoteSelf.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicRenoteSelf.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicRenoteLocalNote, 'canPublicRenoteLocalNote'])">
				<template #label>{{ i18n.ts._role._options.canPublicRenoteLocalNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicRenoteLocalNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicRenoteLocalNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicRenoteLocalNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicRenoteLocalNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicRenoteLocalNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicRenoteLocalNote.value" :disabled="role.policies.canPublicRenoteLocalNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicRenoteLocalNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicRenoteRemoteNote, 'canPublicRenoteRemoteNote'])">
				<template #label>{{ i18n.ts._role._options.canPublicRenoteRemoteNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicRenoteRemoteNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicRenoteRemoteNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicRenoteRemoteNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicRenoteRemoteNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicRenoteRemoteNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicRenoteRemoteNote.value" :disabled="role.policies.canPublicRenoteRemoteNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicRenoteRemoteNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPublicNoteWithFile, 'canPublicNoteWithFile'])">
				<template #label>{{ i18n.ts._role._options.canPublicNoteWithFile }}</template>
				<template #suffix>
					<span v-if="role.policies.canPublicNoteWithFile.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPublicNoteWithFile.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPublicNoteWithFile)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPublicNoteWithFile" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPublicNoteWithFile.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPublicNoteWithFile.value" :disabled="role.policies.canPublicNoteWithFile.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPublicNoteWithFile.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canPurgeAccount, 'canPurgeAccount'])">
				<template #label>{{ i18n.ts._role._options.canPurgeAccount }}</template>
				<template #suffix>
					<span v-if="role.policies.canPurgeAccount.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canPurgeAccount.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canPurgeAccount)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canPurgeAccount" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canPurgeAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canPurgeAccount.value" :disabled="role.policies.canPurgeAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canPurgeAccount.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canEditNote, 'canEditNote'])">
				<template #label>{{ i18n.ts._role._options.canEditNote }}</template>
				<template #suffix>
					<span v-if="role.policies.canEditNote.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canEditNote.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canEditNote)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canEditNote" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canEditNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canEditNote.value" :disabled="role.policies.canEditNote.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canEditNote.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.scheduleNoteMax, 'scheduleNoteMax'])">
				<template #label>{{ i18n.ts._role._options.scheduleNoteMax }}</template>
				<template #suffix>
					<span v-if="role.policies.scheduleNoteMax.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.scheduleNoteMax.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.scheduleNoteMax)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.scheduleNoteMax" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.scheduleNoteMax.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.scheduleNoteMax.value" :disabled="role.policies.scheduleNoteMax.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.scheduleNoteMax.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.mentionMax, 'mentionLimit'])">
				<template #label>{{ i18n.ts._role._options.mentionMax }}</template>
				<template #suffix>
					<span v-if="role.policies.mentionLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.mentionLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.mentionLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.mentionLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.mentionLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.mentionLimit.value" :disabled="role.policies.mentionLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.mentionLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canInvite, 'canInvite'])">
				<template #label>{{ i18n.ts._role._options.canInvite }}</template>
				<template #suffix>
					<span v-if="role.policies.canInvite.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canInvite.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canInvite)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canInvite" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canInvite.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canInvite.value" :disabled="role.policies.canInvite.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canInvite.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.inviteLimit, 'inviteLimit'])">
				<template #label>{{ i18n.ts._role._options.inviteLimit }}</template>
				<template #suffix>
					<span v-if="role.policies.inviteLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.inviteLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.inviteLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.inviteLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.inviteLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.inviteLimit.value" :disabled="role.policies.inviteLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.inviteLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.inviteLimitCycle, 'inviteLimitCycle'])">
				<template #label>{{ i18n.ts._role._options.inviteLimitCycle }}</template>
				<template #suffix>
					<span v-if="role.policies.inviteLimitCycle.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.inviteLimitCycle.value + i18n.ts._time.minute }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.inviteLimitCycle)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.inviteLimitCycle" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.inviteLimitCycle.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.inviteLimitCycle.value" :disabled="role.policies.inviteLimitCycle.useDefault" type="number" :readonly="readonly">
							<template #suffix>{{ i18n.ts._time.minute }}</template>
						</MkInput>
					</div>
					<MkRange v-model="role.policies.inviteLimitCycle.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.inviteExpirationTime, 'inviteExpirationTime'])">
				<template #label>{{ i18n.ts._role._options.inviteExpirationTime }}</template>
				<template #suffix>
					<span v-if="role.policies.inviteExpirationTime.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.inviteExpirationTime.value + i18n.ts._time.minute }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.inviteExpirationTime)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.inviteExpirationTime" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.inviteExpirationTime.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.inviteExpirationTime.value" :disabled="role.policies.inviteExpirationTime.useDefault" type="number" :readonly="readonly">
							<template #suffix>{{ i18n.ts._time.minute }}</template>
						</MkInput>
					</div>
					<MkRange v-model="role.policies.inviteExpirationTime.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canManageCustomEmojis, 'canManageCustomEmojis'])">
				<template #label>{{ i18n.ts._role._options.canManageCustomEmojis }}</template>
				<template #suffix>
					<span v-if="role.policies.canManageCustomEmojis.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canManageCustomEmojis.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canManageCustomEmojis)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canManageCustomEmojis" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canManageCustomEmojis.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canManageCustomEmojis.value" :disabled="role.policies.canManageCustomEmojis.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canManageCustomEmojis.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canManageAvatarDecorations, 'canManageAvatarDecorations'])">
				<template #label>{{ i18n.ts._role._options.canManageAvatarDecorations }}</template>
				<template #suffix>
					<span v-if="role.policies.canManageAvatarDecorations.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canManageAvatarDecorations.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canManageAvatarDecorations)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canManageAvatarDecorations" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canManageAvatarDecorations.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canManageAvatarDecorations.value" :disabled="role.policies.canManageAvatarDecorations.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canManageAvatarDecorations.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canSearchNotes, 'canSearchNotes'])">
				<template #label>{{ i18n.ts._role._options.canSearchNotes }}</template>
				<template #suffix>
					<span v-if="role.policies.canSearchNotes.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canSearchNotes.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canSearchNotes)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canSearchNotes" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canSearchNotes.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canSearchNotes.value" :disabled="role.policies.canSearchNotes.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canSearchNotes.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canUseTranslator, 'canUseTranslator'])">
				<template #label>{{ i18n.ts._role._options.canUseTranslator }}</template>
				<template #suffix>
					<span v-if="role.policies.canUseTranslator.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canUseTranslator.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canUseTranslator)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canUseTranslator" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canUseTranslator.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canUseTranslator.value" :disabled="role.policies.canUseTranslator.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canUseTranslator.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canUseAutoTranslate, 'canUseAutoTranslate'])">
				<template #label>{{ i18n.ts._role._options.canUseAutoTranslate }}</template>
				<template #suffix>
					<span v-if="role.policies.canUseAutoTranslate.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canUseAutoTranslate.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canUseAutoTranslate)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canUseAutoTranslate" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canUseAutoTranslate.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canUseAutoTranslate.value" :disabled="role.policies.canUseAutoTranslate.useDefault || !role.policies.canUseTranslator.value" :readonly="readonly" @update:modelValue="learnMoreAutoTranslate">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canUseAutoTranslate.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.driveCapacity, 'driveCapacityMb'])">
				<template #label>{{ i18n.ts._role._options.driveCapacity }}</template>
				<template #suffix>
					<span v-if="role.policies.driveCapacityMb.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.driveCapacityMb.value + 'MB' }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.driveCapacityMb)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.driveCapacityMb" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.driveCapacityMb.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.driveCapacityMb.value" :disabled="role.policies.driveCapacityMb.useDefault" type="number" :readonly="readonly">
							<template #suffix>MB</template>
						</MkInput>
					</div>
					<MkRange v-model="role.policies.driveCapacityMb.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.alwaysMarkNsfw, 'alwaysMarkNsfw'])">
				<template #label>{{ i18n.ts._role._options.alwaysMarkNsfw }}</template>
				<template #suffix>
					<span v-if="role.policies.alwaysMarkNsfw.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.alwaysMarkNsfw.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.alwaysMarkNsfw)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.alwaysMarkNsfw" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.alwaysMarkNsfw.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.alwaysMarkNsfw.value" :disabled="role.policies.alwaysMarkNsfw.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.alwaysMarkNsfw.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canUpdateBioMedia, 'canUpdateBioMedia'])">
				<template #label>{{ i18n.ts._role._options.canUpdateBioMedia }}</template>
				<template #suffix>
					<span v-if="role.policies.canUpdateBioMedia.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canUpdateBioMedia.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canUpdateBioMedia)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canUpdateBioMedia" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canUpdateBioMedia.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canUpdateBioMedia.value" :disabled="role.policies.canUpdateBioMedia.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canUpdateBioMedia.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.pinMax, 'pinLimit'])">
				<template #label>{{ i18n.ts._role._options.pinMax }}</template>
				<template #suffix>
					<span v-if="role.policies.pinLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.pinLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.pinLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.pinLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.pinLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.pinLimit.value" :disabled="role.policies.pinLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.pinLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.antennaMax, 'antennaLimit'])">
				<template #label>{{ i18n.ts._role._options.antennaMax }}</template>
				<template #suffix>
					<span v-if="role.policies.antennaLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.antennaLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.antennaLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.antennaLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.antennaLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.antennaLimit.value" :disabled="role.policies.antennaLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.antennaLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.wordMuteMax, 'wordMuteLimit'])">
				<template #label>{{ i18n.ts._role._options.wordMuteMax }}</template>
				<template #suffix>
					<span v-if="role.policies.wordMuteLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.wordMuteLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.wordMuteLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.wordMuteLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.wordMuteLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.wordMuteLimit.value" :disabled="role.policies.wordMuteLimit.useDefault" type="number" :readonly="readonly">
							<template #suffix>chars</template>
						</MkInput>
					</div>
					<MkRange v-model="role.policies.wordMuteLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.webhookMax, 'webhookLimit'])">
				<template #label>{{ i18n.ts._role._options.webhookMax }}</template>
				<template #suffix>
					<span v-if="role.policies.webhookLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.webhookLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.webhookLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.webhookLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.webhookLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.webhookLimit.value" :disabled="role.policies.webhookLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.webhookLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.clipMax, 'clipLimit'])">
				<template #label>{{ i18n.ts._role._options.clipMax }}</template>
				<template #suffix>
					<span v-if="role.policies.clipLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.clipLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.clipLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.clipLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.clipLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.clipLimit.value" :disabled="role.policies.clipLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.clipLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.noteEachClipsMax, 'noteEachClipsLimit'])">
				<template #label>{{ i18n.ts._role._options.noteEachClipsMax }}</template>
				<template #suffix>
					<span v-if="role.policies.noteEachClipsLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.noteEachClipsLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.noteEachClipsLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.noteEachClipsLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.noteEachClipsLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.noteEachClipsLimit.value" :disabled="role.policies.noteEachClipsLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.noteEachClipsLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.userListMax, 'userListLimit'])">
				<template #label>{{ i18n.ts._role._options.userListMax }}</template>
				<template #suffix>
					<span v-if="role.policies.userListLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.userListLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.userListLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.userListLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.userListLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.userListLimit.value" :disabled="role.policies.userListLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.userListLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.userEachUserListsMax, 'userEachUserListsLimit'])">
				<template #label>{{ i18n.ts._role._options.userEachUserListsMax }}</template>
				<template #suffix>
					<span v-if="role.policies.userEachUserListsLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.userEachUserListsLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.userEachUserListsLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.userEachUserListsLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.userEachUserListsLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.userEachUserListsLimit.value" :disabled="role.policies.userEachUserListsLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.userEachUserListsLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canHideAds, 'canHideAds'])">
				<template #label>{{ i18n.ts._role._options.canHideAds }}</template>
				<template #suffix>
					<span v-if="role.policies.canHideAds.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canHideAds.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canHideAds)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canHideAds" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canHideAds.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canHideAds.value" :disabled="role.policies.canHideAds.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canHideAds.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.avatarDecorationLimit, 'avatarDecorationLimit'])">
				<template #label>{{ i18n.ts._role._options.avatarDecorationLimit }}</template>
				<template #suffix>
					<span v-if="role.policies.avatarDecorationLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.avatarDecorationLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.avatarDecorationLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.avatarDecorationLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.avatarDecorationLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.avatarDecorationLimit.value" type="number" :min="0" :max="16" @update:modelValue="updateAvatarDecorationLimit">
							<template #label>{{ i18n.ts._role._options.avatarDecorationLimit }}</template>
						</MkInput>
					</div>
					<MkRange v-model="role.policies.avatarDecorationLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canImportAntennas, 'canImportAntennas'])">
				<template #label>{{ i18n.ts._role._options.canImportAntennas }}</template>
				<template #suffix>
					<span v-if="role.policies.canImportAntennas.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canImportAntennas.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canImportAntennas)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canImportAntennas" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canImportAntennas.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canImportAntennas.value" :disabled="role.policies.canImportAntennas.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canImportAntennas.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canImportBlocking, 'canImportBlocking'])">
				<template #label>{{ i18n.ts._role._options.canImportBlocking }}</template>
				<template #suffix>
					<span v-if="role.policies.canImportBlocking.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canImportBlocking.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canImportBlocking)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canImportBlocking" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canImportBlocking.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canImportBlocking.value" :disabled="role.policies.canImportBlocking.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canImportBlocking.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canImportFollowing, 'canImportFollowing'])">
				<template #label>{{ i18n.ts._role._options.canImportFollowing }}</template>
				<template #suffix>
					<span v-if="role.policies.canImportFollowing.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canImportFollowing.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canImportFollowing)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canImportFollowing" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canImportFollowing.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canImportFollowing.value" :disabled="role.policies.canImportFollowing.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canImportFollowing.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canImportMuting, 'canImportMuting'])">
				<template #label>{{ i18n.ts._role._options.canImportMuting }}</template>
				<template #suffix>
					<span v-if="role.policies.canImportMuting.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canImportMuting.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canImportMuting)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canImportMuting" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canImportMuting.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canImportMuting.value" :disabled="role.policies.canImportMuting.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canImportMuting.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canImportUserLists, 'canImportUserLists'])">
				<template #label>{{ i18n.ts._role._options.canImportUserLists }}</template>
				<template #suffix>
					<span v-if="role.policies.canImportUserLists.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canImportUserLists.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canImportUserLists)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canImportUserLists" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canImportUserLists.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canImportUserLists.value" :disabled="role.policies.canImportUserLists.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canImportUserLists.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.noteDraftLimit, 'noteDraftLimit'])">
				<template #label>{{ i18n.ts._role._options.noteDraftLimit }}</template>
				<template #suffix>
					<span v-if="role.policies.noteDraftLimit.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.noteDraftLimit.value }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.noteDraftLimit)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.noteDraftLimit" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.noteDraftLimit.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkInput v-model="role.policies.noteDraftLimit.value" :disabled="role.policies.noteDraftLimit.useDefault" type="number" :readonly="readonly">
						</MkInput>
					</div>
					<MkRange v-model="role.policies.noteDraftLimit.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canSetFederationAvatarShape, 'canSetFederationAvatarShape'])">
				<template #label>{{ i18n.ts._role._options.canSetFederationAvatarShape }}</template>
				<template #suffix>
					<span v-if="role.policies.canSetFederationAvatarShape.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canSetFederationAvatarShape.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canSetFederationAvatarShape)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canSetFederationAvatarShape" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canSetFederationAvatarShape.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canSetFederationAvatarShape.value" :disabled="role.policies.canSetFederationAvatarShape.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canSetFederationAvatarShape.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canDeleteAccount, 'canDeleteAccount'])">
				<template #label>{{ i18n.ts._role._options.canDeleteAccount }}</template>
				<template #suffix>
					<span v-if="role.policies.canDeleteAccount.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canDeleteAccount.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canDeleteAccount)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canDeleteAccount" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canDeleteAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canDeleteAccount.value" :disabled="role.policies.canDeleteAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canDeleteAccount.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>

			<MkFolder v-if="matchQuery([i18n.ts._role._options.canTruncateAccount, 'canTruncateAccount'])">
				<template #label>{{ i18n.ts._role._options.canTruncateAccount }}</template>
				<template #suffix>
					<span v-if="role.policies.canTruncateAccount.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._role.useBaseValue }}</span>
					<span v-else>{{ role.policies.canTruncateAccount.value ? i18n.ts.yes : i18n.ts.no }}</span>
					<span :class="$style.priorityIndicator"><i :class="getPriorityIcon(role.policies.canTruncateAccount)"></i></span>
				</template>
				<div class="_gaps">
					<div v-if="role.target === 'manualLevel'">
						<RolesEditorLevelCond v-model="levelCondPolicies.canTruncateAccount" :readonly="readonly"/>
					</div>
					<div v-else>
						<MkSwitch v-model="role.policies.canTruncateAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts._role.useBaseValue }}</template>
						</MkSwitch>
						<MkSwitch v-model="role.policies.canTruncateAccount.value" :disabled="role.policies.canTruncateAccount.useDefault" :readonly="readonly">
							<template #label>{{ i18n.ts.enable }}</template>
						</MkSwitch>
					</div>
					<MkRange v-model="role.policies.canTruncateAccount.priority" :min="0" :max="2" :step="1" easing :textConverter="(v) => v === 0 ? i18n.ts._role._priority.low : v === 1 ? i18n.ts._role._priority.middle : v === 2 ? i18n.ts._role._priority.high : ''">
						<template #label>{{ i18n.ts._role.priority }}</template>
					</MkRange>
				</div>
			</MkFolder>
		</div>
	</FormSlot>
</div>
</template>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue';
import { throttle } from 'throttle-debounce';
import { ROLE_POLICIES } from '@@/js/const.js';
import { v4 as uuid } from 'uuid';
import RolesEditorFormula from './RolesEditorFormula.vue';
import RolesEditorLevelCond from './RolesEditorLevelCond.vue';
import RolesEditorLevel from './RolesEditorLevel.vue';
import MkInput from '@/components/MkInput.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRange from '@/components/MkRange.vue';
import FormSlot from '@/components/form/slot.vue';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { deepClone } from '@/scripts/clone.js';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'update:modelValue', v: any): void;
}>();

const props = defineProps<{
	modelValue: any;
	readonly?: boolean;
}>();

const role = ref(deepClone(props.modelValue));

const queryEl = ref(null);

// fill missing policy
for (const ROLE_POLICY of ROLE_POLICIES) {
	if (role.value.policies[ROLE_POLICY] == null) {
		role.value.policies[ROLE_POLICY] = {
			useDefault: true,
			priority: 0,
			value: instance.policies[ROLE_POLICY],
		};
	}
	if (role.value.policies[ROLE_POLICY].policyAsLevel == null) {
		role.value.policies[ROLE_POLICY].policyAsLevel = [{
			level: 1,
			type: 'base',
			value: instance.policies[ROLE_POLICY],
			additional: 0,
		}];
	}
}

if (!role.value.levelPolicies) {
	role.value.levelPolicies = {
		baseLevel: 1,
		experiencePolicies: [{
			level: 0,
			type: 'const',
			base: 100,
			additional: 0,
			exponential: 1,
		}],
	};
}

type ExperiencePolicy = {
	type: string;
	base: number;
	additional?: number;
	exponential?: number;
};

let levelPolicies = {
	baseLevel: role.value.levelPolicies.baseLevel,
	experiencePolicies: role.value.levelPolicies.experiencePolicies.map(policy => ({
		id: uuid(),
		level: policy.level,
		type: policy.type as 'const' | 'linear' | 'exponential',
		base: policy.base,
		additional: policy.additional || 0,
		exponential: policy.exponential || 1,
	})),
};
let levelCondPolicies = Object.fromEntries(
	Object.entries(role.value.policies).map(([name, policy]) => {
		const typedPolicy = policy as { value: any; policyAsLevel?: any[] };
		return [
			name,
			{
				type: typeof policy.value === 'boolean'
					? 'boolean'
					: typeof policy.value === 'number'
						? 'number'
						: 'string',
				defaultValue: instance.policies[name],
				baseLevel: role.value.levelPolicies?.baseLevel,
				CondFormula: Array.isArray((policy as { policyAsLevel?: any[] }).policyAsLevel)
					? (policy as { policyAsLevel: any[] }).policyAsLevel.map((p: { level: number; type: string; base: number; additional?: number }) => ({
						id: uuid(),
						level: p.level,
						type: p.type as 'base' | 'const' | 'multiplier',
						base: p.base,
						additional: p.additional || 0,
					}))
					: [],
			},
		];
	}),
);
console.log(levelCondPolicies);

function updateAvatarDecorationLimit(value: string | number) {
	const numValue = Number(value);
	const limited = Math.min(16, Math.max(0, numValue));
	role.value.policies.avatarDecorationLimit.value = limited;
}

const rolePermission = computed({
	get: () => role.value.isAdministrator ? 'administrator' : role.value.isModerator ? 'moderator' : 'normal',
	set: (val) => {
		role.value.isAdministrator = val === 'administrator';
		role.value.isModerator = val === 'moderator';
	},
});

const q = ref('');

function getPriorityIcon(option) {
	if (option.priority === 2) return 'ti ti-arrows-up';
	if (option.priority === 1) return 'ti ti-arrow-narrow-up';
	return 'ti ti-point';
}

function matchQuery(keywords: string[]): boolean {
	if (q.value.trim().length === 0) return true;
	return keywords.some(keyword => keyword.toLowerCase().includes(q.value.toLowerCase()));
}

const save = throttle(100, () => {
	const data = {
		name: role.value.name,
		description: role.value.description,
		color: role.value.color === '' ? null : role.value.color,
		iconUrl: role.value.iconUrl === '' ? null : role.value.iconUrl,
		displayOrder: role.value.displayOrder,
		target: role.value.target,
		condFormula: role.value.condFormula,
		isAdministrator: role.value.isAdministrator,
		isModerator: role.value.isModerator,
		isPublic: role.value.isPublic,
		isExplorable: role.value.isExplorable,
		asBadge: role.value.asBadge,
		canEditMembersByModerator: role.value.canEditMembersByModerator,
		policies: Object.entries(role.value.policies).map(([key, policy]) => ({
			useDefault: policy.useDefault,
			priority: policy.priority,
			value: policy.value,
			policyAsLevel: levelCondPolicies[key].CondFormula.map(p => ({
				level: p.level,
				type: p.type,
				base: p.base,
				additional: p.additional || 0,
			})),
		})),
		levelPolicies: {
			baseLevel: levelPolicies.baseLevel,
			experiencePolicies: levelPolicies.experiencePolicies.map(policy => ({
				level: policy.level,
				type: policy.type,
				base: policy.base,
				additional: policy.additional,
				exponential: policy.exponential,
			})),
		},

	};
	emit('update:modelValue', data);
});

async function learnMoreAutoTranslate() {
	if (!role.value.policies.canUseAutoTranslate.value) return;

	const confirm = await os.confirm({
		type: 'warning',
		title: i18n.ts.useAutoTranslate,
		text: i18n.ts._role._options.canUseAutoTranslateDescription,
	});
	if (confirm.canceled) role.value.policies.canUseAutoTranslate.value = false;
}

watch(role, save, { deep: true });
</script>

<style lang="scss" module>
.useDefaultLabel {
	opacity: 0.7;
}

.priorityIndicator {
	margin-left: 8px;
}

.deleteBtn {
	position: relative;
	z-index: 2;
	margin: 0 auto;
	border: none;
	background: none;
	color: inherit;
	font-size: 0.8em;
	pointer-events: auto;
}
</style>
