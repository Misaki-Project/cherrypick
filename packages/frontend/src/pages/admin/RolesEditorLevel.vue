<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div>
		<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px; width: 100%;">
			<MkInput v-model="modelValue.baseLevel" type="number" @input="updateModelValue({...modelValue})">
				<template #label>{{ i18n.ts._experience.baseLevel }}</template>
			</MkInput>
			<MkInput v-model="computedMaxLevel" type="number" readonly>
				<template #label>{{ i18n.ts._experience.maxLevel }}</template>
			</MkInput>
		</div>
		<div :class="$style.header">
			<FormSlot>
				<template #label>{{ i18n.ts.navbar }}</template>
				<MkContainer :showHeader="false">
					<Sortable
						v-model="modelValue.experiencePolicies"
						itemKey="id"
						:animation="150"
						:handle="'.' + $style.itemHandle"
						@start="e => e.item.classList.add('active')"
						@end="e => e.item.classList.remove('active')"
					>
						<template #item="{element,index}">
							<div
								:class="$style.item"
							>
								<div>
									<div :class="$style.itemInfo">
										<div style="display: flex; gap: 8px; width: 100%; padding-bottom: 8px;">
											<MkInput v-model="element.level" :min="1" type="number" :class="$style.itemBase" style="width: 100%;" @input="updateModelValue({...modelValue})">
												<template #prefix>{{ i18n.tsx._experience.levelShort({value:getTotalLevel(modelValue.experiencePolicies.findIndex(el => el === element))}) }} <i class="ti ti-arrow-right"></i> +</template>
												<template #suffix><i class="ti ti-arrow-right"></i> {{ i18n.tsx._experience.levelShort({value:getTotalLevel(modelValue.experiencePolicies.findIndex(el => el === element)) + element.level - 1}) }}</template>
											</MkInput>
											<MkSelect
												v-model="element.type" :class="$style.itemSelect"
												:items="[{ label: i18n.ts._experience._rules.const, value: 'const' },
													{ label: i18n.ts._experience._rules.linear, value: 'linear'},
													{ label: i18n.ts._experience._rules.exponential, value: 'exponential'}
												]"
												style="width: 120px;" @update:modelValue="updateModelValue({...modelValue})"
											>
											</MkSelect>
											<button v-if="modelValue.experiencePolicies.length > 1" class="_button" :class="$style.itemRemove" style="margin-left: auto;" @click="remove(index)"><i class="ti ti-x"></i></button>
										</div>
									</div>
									<div :class="$style.itemInfo">
										<div style="display: flex; align-items: center; gap: 8px;">
											<MkInput v-model="element.base" type="number" :class="$style.itemConst" @input="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts._experience._values.base }}</template>
											</MkInput>
											<span v-if="element.type!=='const'"> + </span>
											<MkInput v-if="element.type!=='const'" v-model="element.additional" type="number" :class="$style.itemLevel" @input="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts._experience._values.additional }}</template>
											</MkInput>
											<span v-if="element.type==='exponential'"> * ( </span>
											<MkInput v-if="element.type==='exponential'" v-model="element.exponential" type="number" step="0.001" :class="$style.itemLevel" @input="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts._experience._values.exponential }}</template>
											</MkInput>
											<span v-if="element.type==='linear'"> * </span>
											<span v-if="element.type==='exponential'"> ^ </span>
											<span v-if="element.type==='linear' || element.type==='exponential'"> level </span>
											<span v-if="element.type==='exponential'"> ) </span>
										</div>
									</div>
								</div>
							</div>
						</template>
					</Sortable>
				</MkContainer>
			</FormSlot>
			<div class="_buttons">
				<MkButton rounded style="margin: 0 auto;" @click="add"><i class="ti ti-plus"></i> {{ i18n.ts.addItem }}</MkButton>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, toRefs } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	modelValue: {
		baseLevel: number;
		experiencePolicies: {
			id: string; // UI上のドラッグ用。保存時は除外してもOK
			level: number;
			type: 'const' | 'linear' | 'exponential';
			base: number;
			additional?: number;
			exponential?: number;
		}[];
	}
}>();
const emit = defineEmits(['update:modelValue']);
const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const { modelValue } = toRefs(props);

const computedMaxLevel = computed(() => modelValue.value.experiencePolicies.reduce((acc, item) => acc + item.level, 0) + modelValue.value.baseLevel);

function updateModelValue(newValue: typeof modelValue.value) {
	modelValue.value = newValue;
	emit('update:modelValue', newValue);
}

function random() {
	return Math.random().toString(36).substring(2, 15);
}

;

function add() {
	const newItem: {
		id: string;
		level: number;
		type: 'const' | 'linear' | 'exponential';
		base: number;
		additional?: number;
		exponential?: number;
	} = {
		id: random(), // Always a string
		level: 10,
		type: 'const',
		base: 100,
		additional: 50,
		exponential: 1,
	};
	const current = Array.isArray(modelValue.value.experiencePolicies) ? modelValue.value.experiencePolicies : [];
	modelValue.value.experiencePolicies = [...current, newItem];
	updateModelValue({ ...modelValue.value });
}

function remove(idx: number) {
	const arr = [...modelValue.value.experiencePolicies];
	arr.splice(idx, 1);
	modelValue.value.experiencePolicies = arr;
	updateModelValue({ ...modelValue.value });
}

function getTotalLevel(index: number) {
	const arr = modelValue.value.experiencePolicies;
	if (index < 0 || index >= arr.length) return 0;
	return arr.slice(0, index).reduce((sum, item) => sum + item.level, 0) + modelValue.value.baseLevel;
}
</script>

<style module lang="scss">
.item {
  border: solid 2px var(--MI_THEME-divider);
  border-radius: var(--MI-radius);
  padding: 12px;
  margin-bottom: 8px;
	#span {
		align-content: center;
	}
}
.itemInfo {
	position: relative;
	display: flex;
	gap: 8px;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	color: var(--MI_THEME-navFg);
}
.mk-input {
	margin: 0; /* Remove excessive margin */
	padding: 0; /* Remove excessive padding */
}
.mk-input label {
	margin-bottom: 4px; /* Adjust spacing between label and input */
}

</style>
