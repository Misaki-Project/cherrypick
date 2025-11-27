<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Transition
	:enterActiveClass="$style.transition_zoom_enterActive"
	:leaveActiveClass="$style.transition_zoom_leaveActive"
	:enterFromClass="$style.transition_zoom_enterFrom"
	:leaveToClass="$style.transition_zoom_leaveTo"
	:moveClass="$style.transition_zoom_move"
	mode="out-in"
>
	<div v-if="!gameStarted" class="_spacer" style="--MI_SPACER-w: 800px;">
		<div :class="$style.root">
			<div class="_gaps">
				<div class="_woodenFrame" style="text-align: center;">
					<div class="_woodenFrameInner">
						<img src="/client-assets/drop-and-fusion/logo.png" style="display: block; max-width: 100%; max-height: 200px; margin: auto;"/>
					</div>
				</div>
				<div class="_woodenFrame" style="text-align: center;">
					<div class="_woodenFrameInner">
						<div class="_gaps" style="padding: 16px;">
							<MkSelect v-model="gameMode" :items="gameModeDef"></MkSelect>
							<MkButton primary gradate large rounded inline @click="start">{{ i18n.ts.start }}</MkButton>
						</div>
					</div>
					<div class="_woodenFrameInner">
						<div class="_gaps" style="padding: 16px;">
							<div style="font-size: 90%;"><i class="ti ti-music"></i> {{ i18n.ts.soundWillBePlayed }}</div>
							<MkSwitch v-model="mute">
								<template #label>{{ i18n.ts.mute }}</template>
							</MkSwitch>
						</div>
					</div>
				</div>
				<div class="_woodenFrame">
					<div class="_woodenFrameInner">
						<div class="_gaps_s" style="padding: 16px;">
							<div style="display: flex;">
								<div style="height: auto; align-content: center;">
									<b>{{ i18n.ts.ranking }}</b> ({{ gameMode.toUpperCase() }})
								</div>
								<div style="width: auto; margin-left: auto; text-align: right;">
									<MkSelect v-model="rankingSince" style="margin-left: 8px;">
										<option value="1h">{{ getHourLocalize("1h") }}</option>
										<option value="6h">{{ getHourLocalize("6h") }}</option>
										<option value="24h">{{ getHourLocalize("24h") }}</option>
										<option value="7d">{{ getHourLocalize("7d") }}</option>
										<option value="30d">{{ getHourLocalize("30d") }}</option>
										<option value="1y">{{ getHourLocalize("1y") }}</option>
										<!--<option value="all">{{ getHourLocalize("all") }}</option>-->
									</MkSelect>
								</div>
							</div>
							<div v-if="ranking" class="_gaps_s">
								<div v-for="r in ranking" :key="r.id" :class="$style.rankingRecord">
									<MkAvatar v-if="r.user" :link="true" style="width: 24px; height: 24px; margin-right: 4px;" :user="r.user"/>
									<MkUserName v-if="r.user" :user="r.user" :nowrap="true"/>
									<b style="margin-left: auto;">{{ r.score.toLocaleString() }} {{ getScoreUnit(gameMode) }}</b>
									<div style="margin-left: 8px; width: 50px; font-size: 80%; text-align: right;">
										<div><MkTime :time="r.registeredAt" :mode="prefer.s.enableAbsoluteTime ? 'absolute' : 'relative'"/></div>
									</div>
								</div>
							</div>
							<div v-else>{{ i18n.ts.loading }}</div>
						</div>
					</div>
				</div>
				<div class="_woodenFrame">
					<div class="_woodenFrameInner" style="padding: 16px;">
						<div style="font-weight: bold;">{{ i18n.ts._bubbleGame.howToPlay }}</div>
						<ol>
							<li>{{ i18n.ts._bubbleGame._howToPlay.section1 }}</li>
							<li>{{ i18n.ts._bubbleGame._howToPlay.section2 }}</li>
							<li>{{ i18n.ts._bubbleGame._howToPlay.section3 }}</li>
						</ol>
					</div>
				</div>
				<div class="_woodenFrame">
					<div class="_woodenFrameInner">
						<div class="_gaps_s" style="padding: 16px;">
							<div><b>Credit</b></div>
							<div>
								<div>Ai-chan illustration: @poteriri@misskey.io</div>
								<div>BGM: HURT RECORD ABM-047</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<XGame v-else :gameMode="gameMode" :mute="mute" @end="onGameEnd"/>
</Transition>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import XGame from './drop-and-fusion.game.vue';
import { store } from '@/store.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import { useMkSelect } from '@/composables/use-mkselect.js';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { misskeyApiGet } from '@/utility/misskey-api.js';
import { prefer } from '@/preferences';

const gameMode = ref<'normal' | 'square' | 'yen' | 'sweets' | 'space'>('normal');
const rankingSince = ref<'1h' | '6h' | '24h' | '7d' | '30d' | '1y' | 'all'>('7d');
const gameStarted = ref(false);
const mute = ref(false);
const ranking = ref<Misskey.entities.BubbleGameRankingResponse | null>(null);

watch(gameMode, async () => {
	await updateRanking();
}, { immediate: true });
watch(rankingSince, async () => {
	await updateRanking();
}, { immediate: true });

async function updateRanking() {
	ranking.value = await misskeyApiGet('bubble-game/ranking', { gameMode: gameMode.value, sinceHour: getSinceHours(rankingSince.value) });
}

function getHourLocalize(time: string) {
	if (time === 'all') {
		return i18n.ts.all;
	}
	const num = time.slice(0, -1);
	if (time.endsWith('y')) {
		return i18n.tsx.lastNYears({ n: num });
	} else if (time.endsWith('w')) {
		return i18n.tsx.lastNWeeks({ n: num });
	} else if (time.endsWith('d')) {
		return i18n.tsx.lastNDays({ n: num });
	} else if (time.endsWith('h')) {
		return i18n.tsx.lastNHours({ n: num });
	} else {
		return time;
	}
}

function getSinceHours(rankingSince: string) {
	try {
		if (rankingSince === 'all') {
			return 0;
		}	else if (rankingSince.endsWith('y')) {
			const num = parseInt(rankingSince.slice(0, -1));
			return num * 365 * 24;
		}	else if (rankingSince.endsWith('w')) {
			const num = parseInt(rankingSince.slice(0, -1));
			return num * 7 * 24;
		}	else if (rankingSince.endsWith('d')) {
			const num = parseInt(rankingSince.slice(0, -1));
			return num * 24;
		}	else if (rankingSince.endsWith('h')) {
			const num = parseInt(rankingSince.slice(0, -1));
			return num;
		} else {
			return 0 as never;
		}
	} catch {
		return 0 as never;
	}
}

function getScoreUnit(gameMode: string) {
	return gameMode === 'normal' ? 'pt' :
		gameMode === 'square' ? 'pt' :
		gameMode === 'yen' ? '円' :
		gameMode === 'sweets' ? 'kcal' :
		gameMode === 'space' ? 'pt' :
		'' as never;
}

async function start() {
	gameStarted.value = true;
}

function onGameEnd() {
	gameStarted.value = false;
}

definePage(() => ({
	title: i18n.ts.bubbleGame,
	icon: 'ti ti-device-gamepad',
}));
</script>

<style lang="scss" module>
.transition_zoom_move,
.transition_zoom_enterActive,
.transition_zoom_leaveActive {
	transition: opacity 0.5s cubic-bezier(0,.5,.5,1), transform 0.5s cubic-bezier(0,.5,.5,1) !important;
}
.transition_zoom_enterFrom,
.transition_zoom_leaveTo {
	opacity: 0;
	transform: scale(0.8);
}

.root {
	margin: 0 auto;
	max-width: 600px;
	user-select: none;

	* {
		user-select: none;
	}
}

.rankingRecord {
	display: flex;
	line-height: 24px;
	padding-top: 4px;
	white-space: nowrap;
	overflow: visible;
	text-overflow: ellipsis;
}
</style>
