/*
 * SPDX-FileCopyrightText: noridev and cherrypick-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as os from '@/os.js';

export function donateServer(ev: MouseEvent) {
	os.popupMenu([{
		text: 'pixivFANBOX',
		icon: 'ti ti-pig-money',
		action: () => {
			window.open('https://misaki0331.fanbox.cc/plans', '_blank');
		},
	}, {
		text: 'GitHub Sponsers',
		icon: 'ti ti-pig-money',
		action: () => {
			window.open('https://github.com/sponsors/misaki-project', '_blank');
		},
	}], ev.currentTarget ?? ev.target);
}
