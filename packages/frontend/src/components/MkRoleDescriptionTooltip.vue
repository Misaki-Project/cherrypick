<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkTooltip ref="tooltip" :showing="showing" :targetElement="targetElement" :maxWidth="250" direction="top" @closed="emit('closed')">
	<div :class="$style.root">
		<div v-if="role.experience" style="margin-bottom: 1px;">
			<span style="font-size: 1.5em;">{{ i18n.tsx._experience.levelShort({value: role.experience.currentLevel}) }}</span> (<span>{{ role.experience.currentExp }}</span><span v-if="role.experience.nextLevelExp"> / {{ role.experience.nextLevelExp }}</span>)
		</div>
		<div v-if="role.experience" style="margin-bottom: 6px;">
			<div
				:style="{
					background: 'var(--MI_THEME-accentedBg)',
					borderRadius: '4px',
					height: '5px',
					width: '100%',
					overflow: 'hidden'
				}"
			>
				<div
					:style="{
						background: 'var(--MI_THEME-accent)',
						width: role.experience.nextLevelExp ? Math.min((role.experience.currentExp / role.experience.nextLevelExp) * 100, 100) + '%' : '100%',
						height: '100%',
						transition: 'width 0.3s'
					}"
				></div>
			</div>
		</div>
		<Mfm :text="role.description"/>
	</div>
</MkTooltip>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as mfm from 'mfc-js';
import { i18n } from '@/i18n.js';
import MkTooltip from '@/components/MkTooltip.vue';

defineProps<{
	showing: boolean;
	targetElement?: HTMLElement;
	role: {
		description: string;
		experience: {
			baseLevel: number;
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
