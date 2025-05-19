<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkTooltip ref="tooltip" :showing="showing" :targetElement="targetElement" :maxWidth="250" direction="top" @closed="emit('closed')">
	<div :class="$style.root">
		<div v-if="role.experience" style="margin-bottom: 1px;">
			<span>Lv. {{ role.experience.currentLevel }}</span> (<span>{{ role.experience.currentExp }}</span><span v-if="role.experience.nextLevelExp"> / {{ role.experience.nextLevelExp }}</span>)
		</div>
		<div v-if="role.experience" style="margin-bottom: 6px;">
			<div style="background: #eee; border-radius: 4px; height: 2px; width: 100%; overflow: hidden;">
				<div
					:style="{
						background: '#4caf50',
						width: Math.min((role.experience.currentExp / (role.experience.nextLevelExp || role.experience.totalExp)) * 100, 100) + '%',
						height: '100%',
						transition: 'width 0.3s'
					}"
				></div>
			</div>
		</div>
		{{ role.description }}
	</div>
</MkTooltip>
</template>

<script lang="ts" setup>
import { } from 'vue';
import MkTooltip from '@/components/MkTooltip.vue';

defineProps<{
	showing: boolean;
	role: {
		description: string;
		experience: {
			minLevel: number;
			maxLevel: number;
			currentLevel: number;
			currentExp: number;
			nextLevelExp: number;
			totalExp: number;
		} | undefined
	}
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();
</script>

<style lang="scss" module>
.root {
	font-size: 1em;
	text-align: left;
	text-wrap: normal;
}
</style>
