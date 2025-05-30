<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div :class="$style.header">
		<FormSlot>
			<template #label>{{ i18n.ts.navbar }}</template>
			<MkContainer :showHeader="false">
				<Sortable
					v-model="modelValue"
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
									<button class="_button" :class="$style.itemHandle"><i class="ti ti-menu"></i></button>
									<span>Lv. {{ getTotalLevel(modelValue.findIndex(el => el === element)) }}</span>
									<MkInput
										v-model="element.level"
										:min="modelValue[0]===element ? 0 : 1"
										:readonly="modelValue[0]===element"
										type="number"
										:class="$style.itemBase"
										@input="updateModelValue([...modelValue])"
									>
										<template #suffix>level</template>
									</MkInput>
									<MkSelect v-model="element.type" :class="$style.itemSelect" @update:modelValue="updateModelValue([...modelValue])">
										<option value="const">固定値</option>
										<option value="linear">直線増加</option>
										<option value="exponential">指数増加</option>
									</MkSelect>
									<button v-if="modelValue[0] !== element" class="_button" :class="$style.itemRemove" @click="remove(index)"><i class="ti ti-x"></i></button>
								</div>
								<div :class="$style.itemInfo">
									<MkInput v-model="element.base" type="number" :class="$style.itemConst" @input="updateModelValue([...modelValue])">
										<template #suffix>const</template>
									</MkInput>
									<MkInput v-if="element.type==='linear'" v-model="element.additional" type="number" :class="$style.itemLevel" @input="updateModelValue([...modelValue])">
										<template #suffix>value</template>
									</MkInput>
									<MkInput v-if="element.type==='exponential'" v-model="element.exponential" type="number" :class="$style.itemLevel" @input="updateModelValue([...modelValue])">
										<template #suffix>exponential</template>
									</MkInput>
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
		id: string; // UI上のドラッグ用。保存時は除外してもOK
		level: number;
		type: 'const' | 'linear' | 'exponential';
		base: number;
		additional?: number;
		exponential?: number;
	}[]
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
		type: 'const' | 'linear' | 'exponential';
		base: number;
		additional?: number;
		exponential?: number;
	} = {
		id: uuid(), // Always a string
		level: modelValue.value.length > 0 ? 10 : 0,
		type: 'const',
		base: 100,
	};
	const current = Array.isArray(modelValue.value) ? modelValue.value : [];
	modelValue.value = [...current, newItem];
	console.log(modelValue.value);
}

function getTotalLevel(index: number) {
	const arr = modelValue.value;
	if (index < 0 || index >= arr.length) return 0;
	return arr.slice(0, index + 1).reduce((sum, item) => sum + item.level, 0);
}

function remove(idx: number) {
	const arr = [...modelValue.value];
	arr.splice(idx, 1);
	modelValue.value = arr;
}
</script>

<style module lang="scss">
.item {
  border: solid 2px var(--MI_THEME-divider);
  border-radius: var(--MI-radius);
  padding: 12px;
  margin-bottom: 8px;
}
.itemInfo {
	position: relative;
	line-height: 2.85rem;
	display: flex;
	gap: 8px;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	color: var(--MI_THEME-navFg);
}
</style>
