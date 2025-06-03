<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div>
		<div :class="$style.header">
			<FormSlot>
				<template #label>{{ i18n.ts.navbar }}</template>
				<MkContainer :showHeader="false">
					<Sortable
						v-model="modelValue.CondFormula"
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
										<div style="display: flex; align-items: center; gap: 8px; width: 100%;padding-bottom: 8px;">
											<MkInput
												v-if="modelValue.CondFormula.findIndex(el => el === element) !== modelValue.CondFormula.length-1"
												v-model="element.level" :min="1" type="number" :class="$style.itemBase" style="width: 100%;"
												@input="updateModelValue({...modelValue})"
											>
												<template #prefix>{{ i18n.tsx._experience.levelShort({value:getTotalLevel(modelValue.CondFormula.findIndex(el => el === element))}) }} <i class="ti ti-arrow-right"></i> +</template>
												<template #suffix><i class="ti ti-arrow-right"></i> {{ i18n.tsx._experience.levelShort({value: getTotalLevel(modelValue.CondFormula.findIndex(el => el === element)) + element.level - 1 }) }}</template>
											</MkInput>
											<MkInput v-else :class="$style.itemBase" type="text" readonly style="width: 100%;">
												<template #prefix>{{ i18n.tsx._experience.levelShort({value:getTotalLevel(modelValue.CondFormula.findIndex(el => el === element))}) }} <i class="ti ti-arrow-right"></i></template>
												<template #suffix><i class="ti ti-arrow-right"></i>{{ i18n.ts._experience.maxLevel }}</template>
											</MkInput>
											<MkSelect v-model="element.type" :class="$style.itemSelect" style="width: 150px;" @update:modelValue="updateModelValue({...modelValue})">
												<option value="base">{{ i18n.ts._experience._rules.base }}</option>
												<option value="const">{{ i18n.ts._experience._rules.const }}</option>
												<option v-if="modelValue.type === 'number'" value="multiplier">{{ i18n.ts._experience._rules.multiplier }}</option>
											</MkSelect>
											<button v-if="modelValue.CondFormula.length > 1" class="_button" :class="$style.itemRemove" @click="remove(index)"><i class="ti ti-x"></i></button>
										</div>
									</div>
									<div :class="$style.itemInfo">
										<div style="display: flex; align-items: center; gap: 8px;">
											<span v-if="element.type==='base'">{{ i18n.ts._role.useBaseValue }}</span>
											<MkInput v-if="modelValue.type==='number' && element.type!=='base'" v-model="element.base" type="number" :class="$style.itemConst" @input="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts._experience._values.base }}</template>
											</MkInput>
											<MkSwitch v-if="modelValue.type==='boolean' && element.type!=='base'" v-model="element.base" @update:modelValue="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts.enable }}</template>
											</MkSwitch>
											<span v-if="element.type==='multiplier'"> + </span>
											<MkInput v-if="element.type==='multiplier'" v-model="element.additional" type="number" :class="$style.itemLevel" @input="updateModelValue({...modelValue})">
												<template #label>{{ i18n.ts._experience._values.additional }}</template>
											</MkInput>
											<span v-if="element.type==='multiplier'"> *  level </span>
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
import { defineAsyncComponent, toRefs } from 'vue';
import { v4 as uuid } from 'uuid';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	modelValue: {
		type: 'boolean' | 'number' | 'string';
		defaultValue: number | boolean;
		baseLevel: number;
		CondFormula: {
			id: string; // UI上のドラッグ用。保存時は除外してもOK
			level: number;
			type: string;
			base: number | boolean;
			additional: number;
		}[];
	}
}>();
const emit = defineEmits(['update:modelValue']);
const Sortable = defineAsyncComponent(() => import('vuedraggable').then(x => x.default));

const { modelValue } = toRefs(props);

function updateModelValue(newValue: typeof modelValue.value) {
	modelValue.value = newValue;
	emit('update:modelValue', newValue);
}

function add() {
	const newItem: {
		id: string;
		level: number;
		type: 'const' | 'multiplier' | 'base';
		base: number | boolean;
		additional?: number;
	} = {
		id: uuid(), // Always a string
		level: 10,
		type: 'base',
		base: modelValue.value.defaultValue,
		additional: 50,
	};
	const current = Array.isArray(modelValue.value.CondFormula ) ? modelValue.value.CondFormula : [];
	modelValue.value.CondFormula = [...current, newItem];
	updateModelValue({ ...modelValue.value });
}

function remove(idx: number) {
	const arr = Array.isArray(modelValue.value.CondFormula) ? [...modelValue.value.CondFormula] : [];
	arr.splice(idx, 1);
	modelValue.value.CondFormula = arr;
	updateModelValue({ ...modelValue.value });
}

function getTotalLevel(index: number) {
	const arr = modelValue.value.CondFormula;
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
