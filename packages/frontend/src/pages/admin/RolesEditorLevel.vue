<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div>
		<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px; width: 100%;">
			<MkInput v-model="modelValue.baseLevel" type="number" @input="updateModelValue({...modelValue})">
				<template #label>最小レベル</template>
			</MkInput>
			<MkInput v-model="computedMaxLevel" type="number" readonly>
				<template #label>最大レベル</template>
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
										<div style="display: flex; align-items: center; gap: 8px; padding-bottom: 8px;">
											<MkInput v-model="element.level" :min="1" type="number" :class="$style.itemBase" @input="updateModelValue({...modelValue})">
												<template #prefix>Lv. {{ getTotalLevel(modelValue.experiencePolicies.findIndex(el => el === element)) }} → +</template>
												<template #suffix>→ Lv. {{ getTotalLevel(modelValue.experiencePolicies.findIndex(el => el === element)) + element.level - 1 }}</template>
											</MkInput>
											<MkSelect v-model="element.type" :class="$style.itemSelect" @update:modelValue="updateModelValue({...modelValue})">
												<option value="const">固定値</option>
												<option value="linear">直線増加</option>
												<option value="exponential">指数増加</option>
											</MkSelect>
											<button v-if="modelValue[0] !== element" class="_button" :class="$style.itemRemove" @click="remove(index)"><i class="ti ti-x"></i></button>
										</div>
									</div>
									<div :class="$style.itemInfo">
										<div style="display: flex; align-items: center; gap: 8px;">
											<MkInput v-model="element.base" type="number" :class="$style.itemConst" @input="updateModelValue({...modelValue})">
												<template #label>ベース値</template>
											</MkInput>
											<span v-if="element.type!=='const'"> + </span>
											<MkInput v-if="element.type!=='const'" v-model="element.additional" type="number" :class="$style.itemLevel" @input="updateModelValue({...modelValue})">
												<template #label>加算値</template>
											</MkInput>
											<span v-if="element.type==='exponential'"> * ( </span>
											<MkInput v-if="element.type==='exponential'" v-model="element.exponential" type="number" step="0.001" :class="$style.itemLevel" @input="updateModelValue({...modelValue})">
												<template #label>乗算値</template>
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
import { computed, defineAsyncComponent, ref, watch, toRefs } from 'vue';
import { v4 as uuid } from 'uuid';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { deepClone } from '@/scripts/clone.js';
import { rolesCache } from '@/cache.js';

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

function add() {
	const newItem: {
		id: string;
		level: number;
		type: 'const' | 'linear' | 'exponential';
		base: number;
		additional?: number;
		exponential?: number;
	} = {
		id: uuid(), // Always a string
		level: modelValue.value.experiencePolicies.length > 0 ? 10 : 0,
		type: 'const',
		base: 100,
		additional: 50,
		exponential: 1,
	};
	const current = Array.isArray(modelValue.value.experiencePolicies) ? modelValue.value.experiencePolicies : [];
	modelValue.value.experiencePolicies = [...current, newItem];
	console.log(modelValue.value);
	modelValue.value.maxLevel = modelValue.value.experiencePolicies.reduce((acc, item) => acc + item.level, 0) + modelValue.value.baseLevel;
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
