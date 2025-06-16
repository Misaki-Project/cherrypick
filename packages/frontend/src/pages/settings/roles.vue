<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<FormSection first>
		<template #label>{{ i18n.ts.rolesAssignedToMe }}</template>
		<template #description>{{ i18n.ts.descriptionRolesAssignedToMeOfSetting }}</template>
		<div class="_gaps_s">
			<div v-for="role in roles" :key="role.id">
				<div :class="$style.roleItemMain">
					<MkRolePreview :class="$style.role" :role="role" :forModeration="false" :detailed="false"/>
					<button v-if="role.isHideUserProfile" v-tooltip="i18n.ts.roleShowProfileTip" class="_button" :class="$style.roleHide" @click="showRole(role, $event)"><i class="ti ti-eye-off"></i></button>
					<button v-else-if="role.canHideProfileByUser" v-tooltip="i18n.ts.roleHideProfileTip" class="_button" :class="$style.roleHide" @click="hideRole(role, $event)"><i class="ti ti-eye"></i></button>
				</div>
			</div>
		</div>
	</FormSection>
	<FormSection>
		<template #label>{{ i18n.ts._role.policies }}</template>
		<div class="_gaps_s">
			<div v-for="policy in Object.keys($i.policies)" :key="policy">
				{{ policy }} ... {{ $i.policies[policy] }}
			</div>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import * as os from '@/os.js';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n.js';
import { signinRequired } from '@/account.js';
import { definePage } from '@/page.js';
import MkRolePreview from '@/components/MkRolePreview.vue';
import { misskeyApi } from '@/scripts/misskey-api.js';

const $i = signinRequired();

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

const roles = ref([] as any[]);
roles.value = $i.roles;

async function refreshUser() {
	await misskeyApi('i', {}).then(res => {
		roles.value = res.roles;
	});
}

async function hideRole(role: any, event: MouseEvent) {
	await os.apiWithDialog('roles/profile-hide',
		{ roleId: role.id, hide: true },
	).then(refreshUser);
}

async function showRole(role: any, event: MouseEvent) {
	await os.apiWithDialog('roles/profile-hide',
		{ roleId: role.id, hide: false },
	).then(refreshUser);
}

definePage(() => ({
	title: i18n.ts.roles,
	icon: 'ti ti-badges',
}));
</script>

<style lang="scss" module>

.role {
	flex: 1;
	min-width: 0;
	margin-right: 8px;
}

.roleItemMain {
	display: flex;
}
.roleHide {
	width: 32px;
	height: 32px;
	margin-left: 8px;
	align-self: center;
}
</style>
