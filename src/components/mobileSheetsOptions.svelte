<script>
	import { t } from '$lib/i18n/i18n';
	import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
	import Checkbox from '@smui/checkbox';
	export let metaData = {};
	console.log(metaData);
	const mobileSheetKeys = {
		Artist: 'composer',
		Composer: 'composer',
		Song: 'title',
		Tempo: 'tempo',
		Key: 'keysig'
	};
	const musicalKeys = [
		'Cb/Abm',
		'Gb/Ebm',
		'Db/Bbm',
		'Ab/Fm',
		'Eb/Cm',
		'Bb/Gm',
		'F/Dm',
		'C/Am',
		'G/Em',
		'D/Bm',
		'A/F#m',
		'E/C#m',
		'B/G#m',
		'F#/D#m',
		'C#/A#m'
	];
	var mobileSheetsData = {};
	for (let key in mobileSheetKeys) {
		if (key == 'Key') {
			mobileSheetsData[key] = musicalKeys[7 + metaData[mobileSheetKeys[key]]];
		} else {
			mobileSheetsData[key] = metaData[mobileSheetKeys[key]];
		}
	}

	let selected = [];
</script>
<h1>File Metadata</h1>
<DataTable style="max-width: 100%;">
	<Head>
		<Row>
			<Cell checkbox>
				<Checkbox />
			</Cell>
			<Cell>Key</Cell>
			<Cell>Value</Cell>
		</Row>
	</Head>
	<Body>
		{#each Object.entries(mobileSheetsData) as [key, value]}
			<Row>
				<Cell checkbox>
					<Checkbox bind:group={selected} value={key} valueKey={key} />
				</Cell>
				<Cell>{key}</Cell>
				<Cell>{value}</Cell>
			</Row>
		{/each}
	</Body>
</DataTable>
<h1>Database</h1>
<p class="mdc-typography--body2">{$t('no_options')}</p>
