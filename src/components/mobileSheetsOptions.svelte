<script>
	import { t } from '$lib/i18n/i18n';
	import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
	import Checkbox from '@smui/checkbox';

	import { dropboxState } from '../stores.js';
	//import sqlite3 from 'node-sqlite3';
	//import sqlite3 from 'sqlite3';
	/*import { sqlite3InitModule } '$lib/jswasm/sqlite3.js';
	var sqlite3;
	sqlite3InitModule().then(function (sql) {
		// The module is now loaded and the sqlite3 namespace
		// object was passed to this function.
		console.log('sqlite3:', sql);
		sqlite3 = sql;
	});*/
	import initSqlJs from 'sql.js';
	//const SQL = initSqlJs();

	//import Database from 'better-sqlite3';

	//const db = new sqlite3.Database('./mobilesheets.db');

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

	$: $dropboxState.dbBlob, scanDB();
	async function scanDB() {
		console.log($dropboxState.dbBlob.length)
		// sql.js
		const SQL = await initSqlJs({
			// Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
			// You can omit locateFile completely when running in node
			locateFile: (file) => `https://sql.js.org/dist/${file}`
		});
		console.log(SQL)
		var uInt8Array = new Uint8Array(await $dropboxState.dbBlob.arrayBuffer());
		var db = new SQL.Database(uInt8Array);
		console.log(uInt8Array.length)
		var contents = db.exec('SELECT * FROM Songs');
		//var contents = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
		console.log("DB:", contents);
		// contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]*/
		// assuming arrayBuffer contains the result of the above operation...

		/*//sqlite3 jswasm
		var arrayBuffer = await $dropboxState.dbBlob.arrayBuffer();
		const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
		const db = new sqlite3.oo1.DB();
		const rc = sqlite3.capi.sqlite3_deserialize(
			db.pointer,
			'main',
			p,
			arrayBuffer.byteLength,
			arrayBuffer.byteLength,
			sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
			// Optionally:
			// | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
		);
		db.checkRc(rc);*/
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
