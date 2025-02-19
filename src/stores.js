import { writable } from 'svelte/store';

export const exportOptions = writable({
	drawPageBackground: true,
	transparent: true,
	midiExpandRepeats: true,
	exportRPNs: true,
	compress: true,
	outdated: false,
	ofSegments: false
});

export const homeState = writable({ importIsDisabled: true, downloadIsDisabled: true });

export const languageState = writable({ locale: 'en', direction: 'ltr' });

export const dropboxState = writable({ authorized: false, path: '', dbLink: '', dbBlob: new Blob})
