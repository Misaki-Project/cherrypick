<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<MkStickyContainer>
		<template #header></template>
		<MkSpacer :contentMax="900">
			<div class="_gaps">
				<div :class="$style.inputs">
					<MkInput v-model="searchIp" style="flex: 1;" type="text" :spellcheck="false">
						<template #prefix>IP: </template>
						<template #label>{{ i18n.ts.ipAddress }}</template>
					</MkInput>
				</div>

				<MkPagination v-slot="{items}" ref="paginationComponent" :pagination="pagination">
					<div :class="$style.users">
						<MkA v-for="user in items" :key="user.user.id" v-tooltip.mfm="`IP: ${user.ip}\nLatest Accessed: ${dateString(user.accessedAt)}`" :class="$style.user" :to="`/admin/user/${user.id}`">
							<MkUserCardMini :user="user.user"/>
						</MkA>
					</div>
				</MkPagination>
			</div>
		</MkSpacer>
	</MkStickyContainer>
</div>
</template>

<script lang="ts" setup>
import { computed, shallowRef, ref, watchEffect } from 'vue';
import { defaultMemoryStorage } from '@/memory-storage';
import MkInput from '@/components/MkInput.vue';
import MkPagination from '@/components/MkPagination.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import { dateString } from '@/filters/date.js';

type SearchQuery = {
	ip?: string;
};

const paginationComponent = shallowRef<InstanceType<typeof MkPagination>>();
const storedQuery = JSON.parse(defaultMemoryStorage.getItem('admin-users-ip-query') ?? '{}') as SearchQuery;

const searchIp = ref(storedQuery.ip ?? '');
const pagination = {
	endpoint: 'admin/get-users-from-ip' as const,
	limit: 100,
	params: computed(() => ({
		query: searchIp.value,
	})),
	offsetMode: false,
};

function searchUser() {
	os.selectUser({ includeSelf: true }).then(user => {
		show(user);
	});
}

function show(user) {
	os.pageWindow(`/admin/user/${user.id}`);
}

function resetQuery() {
	searchIp.value = '';
}

const headerTabs = computed(() => []);

watchEffect(() => {
	defaultMemoryStorage.setItem('admin-users-ip-query', JSON.stringify({
		ip: searchIp.value,
	}));
});

definePage(() => ({
	title: i18n.ts.users,
	icon: 'ti ti-users',
}));
</script>

<style lang="scss" module>
.inputs {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.users {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
	grid-gap: 12px;

	> .user:hover {
		text-decoration: none;
	}
}
</style>
