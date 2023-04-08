<script lang="ts">
	import { t } from '$lib/i18n/i18n';
	import {execDB, initDB} from '$lib/database.js';
	import DataTable, { Head, Body, Row, Cell, Label, SortValue } from '@smui/data-table';
	import Tooltip, { Wrapper } from '@smui/tooltip';
	import TextField from '@smui/textfield';
	import HelperText from '@smui/textfield/helper-text';
	import IconButton, { Icon } from '@smui/icon-button';
	import Checkbox from '@smui/checkbox';

	import { dropboxState } from '../stores.js';


	import initSqlJs from 'sql.js';
	var db: any = false;


	const mobileSheetKeys = {
		Artist: 'composer',
		Composer: 'composer',
		Song: 'title',
		Key: 'keysig',
		Tempo: 'tempo' // Duration?
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
	export var outputMetaData: any = {};
	export var metaData;
	for (let key in mobileSheetKeys) {
		if (key == 'Key') {
			outputMetaData[key] = musicalKeys[7 + metaData[mobileSheetKeys[key]]];
		} else {
			outputMetaData[key] = metaData[mobileSheetKeys[key]];
		}
	}
	const mobileSheetsDataOriginal = Object.assign({}, outputMetaData);

	$: $dropboxState.dbBlob, onDBBlob();
	async function onDBBlob() {
		console.log('initializing DB');
		initDB(new Uint8Array(await $dropboxState.dbBlob.arrayBuffer())).then((b) => {
			console.log(db);
			if (b) scanDB();
		});
	}
	async function scanDB() {
		var contents = execDB(`SELECT Songs.Title, Songs.Id, 
KeySongs.SongId, KeySongs.KeyId,
Key.Id, Key.Name AS KeyName,
ArtistsSongs.SongId, ArtistsSongs.ArtistId,
Artists.Id, Artists.Name AS ArtistsName,
SourceTypeSongs.SongId, SourceTypeSongs.SourceTypeId,
SourceType.Id, SourceType.Type AS SourceTypeName,
GROUP_CONCAT(SourceType.Type,', ') TypeList
FROM Songs 
LEFT JOIN KeySongs ON Songs.Id = KeySongs.SongId
LEFT JOIN "Key" ON Key.Id = KeySongs.KeyId
LEFT JOIN ArtistsSongs ON Songs.Id = ArtistsSongs.SongId
LEFT JOIN Artists ON Artists.Id = ArtistsSongs.ArtistId
LEFT JOIN SourceTypeSongs ON Songs.Id = SourceTypeSongs.SongId
LEFT JOIN SourceType ON SourceType.Id = SourceTypeSongs.SourceTypeId
GROUP BY 
    Songs.Id
`);
		if ((await contents).length) {
			console.log('DB:', contents);
			//var contents = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
			items = [];
			contents[0].values.forEach((row) => {
				items.push(<Song>(<unknown>{
					id: Number(row[contents[0].columns.findIndex((s) => s == 'Id')]),
					Song: noNullString(row[contents[0].columns.findIndex((s) => s == 'Title')]),
					Artist: noNullString(row[contents[0].columns.findIndex((s) => s == 'ArtistsName')]),
					Key: noNullString(row[contents[0].columns.findIndex((s) => s == 'KeyName')]),
					Type: noNullString(row[contents[0].columns.findIndex((s) => s == 'TypeList')])
					//Tempo: Number(row[contents[0].columns.findIndex((s) => s == 'Tempo')])
				}));
			});
			console.log('items:', items);

			// contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]*/
			// assuming arrayBuffer contains the result of the above operation...
		}
	}
	
	let selectedMeta = [];
	let selectedDB = [];
	function noNullString(s) {
		return s ? String(s) : '';
	}
	interface Song {
		id: number;
		Song: string;
		Artist: string;
		Key: string;
		Type: string;
		//Tempo: number;
	}
	let items: Song[] = [];
	$: filteredItems = items.filter(
		(item) =>
			selectedDB.includes(item.id) ||
			selectedMeta.every((key) => {
				const searchWords = outputMetaData[key].split('/').filter((s) => s);
				return (
					!searchWords.length ||
					searchWords.some((s) => item[key].toLowerCase().includes(s.toLowerCase()))
				);
			})
	);
	$: filteredSelected = selectedDB.filter((s) =>
		Array.from(filteredItems, (i) => i.id).includes(s)
	);
	let prevSelectedDB = [...selectedDB];
	$: selectedDB, selectionChanged();
	function selectionChanged() {
		let added = selectedDB.filter((i) => !prevSelectedDB.includes(i));
		if (added.length) {
			//console.log('also add', querySongsWithSamePaths(querySelectedPaths(added)));
			selectedDB = selectedDB.concat(
				querySongsWithSamePaths(querySelectedPaths(added)).filter((i) => !selectedDB.includes(i))
			);
		}
		let removed = prevSelectedDB.filter((i) => !selectedDB.includes(i));
		if (removed.length) {
			//console.log('also remove', querySongsWithSamePaths(querySelectedPaths(removed)));
			selectedDB = selectedDB.filter(
				(i) => !querySongsWithSamePaths(querySelectedPaths(removed)).includes(i)
			);
		}
		//console.log("selectionChanged", prevSelectedDB,selectedDB,"added", added, "removed", removed)
		prevSelectedDB = [...selectedDB];
	}
	$: selectedTypes = querySelectedTypes(filteredSelected);
	function querySelectedTypes(ids) {
		try {
			let contents = execDB(`SELECT SongId, SourceTypeId, 
SourceType.Id, SourceType.Type AS SourceTypeName
FROM "SourceTypeSongs" 
LEFT JOIN SourceType ON SourceType.Id = SourceTypeSongs.SourceTypeId
 WHERE SongId IN (${ids.join(',')})
 GROUP BY 
SourceTypeId`);
			return Array.from(
				contents[0].values,
				(row) => row[contents[0].columns.findIndex((s) => s == 'SourceTypeName')]
			);
		} catch {
			return [];
		}
	}
	$: selectedPaths = querySelectedPaths(filteredSelected);
	function querySelectedPaths(ids) {
		try {
			let contents = execDB(`SELECT Id, SongId, Path
FROM Files 
WHERE SongId IN (${ids.join(',')})`);
			return Array.from(
				contents[0].values,
				(row) => row[contents[0].columns.findIndex((s) => s == 'Path')]
			);
		} catch {
			return [];
		}
	}
	function queryNotSelectedSongsWithSamePaths(paths) {
		try {
			console.log('queryNotSelectedSongsWithSamePaths', paths);
			let contents = execDB(`SELECT SongId, Path
FROM Files 
WHERE Path IN ("${paths.join('", "')}")`);
			return Array.from(
				contents[0].values,
				(row) => row[contents[0].columns.findIndex((s) => s == 'SongId')]
			).filter((id) => !filteredSelected.includes(id));
		} catch {
			return [];
		}
	}

	function querySongsWithSamePaths(paths) {
		try {
			console.log('querySongsWithSamePaths', paths);
			let contents = execDB(`SELECT SongId, Path
FROM Files 
WHERE Path IN ("${paths.join('", "')}")`);
			return Array.from(
				contents[0].values,
				(row) => row[contents[0].columns.findIndex((s) => s == 'SongId')]
			);
		} catch {
			return [];
		}
	}

	$: allTypes = queryAllTypes(db);
	function queryAllTypes(database) {
		try {
			let contents = database.exec('SELECT Type FROM SourceType');
			return Array.from(contents[0].values, (row) => row[0]);
		} catch {
			return [];
		}
	}

	let sort: keyof Song = 'id';
	let sortDirection: Lowercase<keyof typeof SortValue> = 'ascending';

	function handleSort() {
		items.sort((a, b) => {
			const [aVal, bVal] = [a[sort], b[sort]][
				sortDirection === 'ascending' ? 'slice' : 'reverse'
			]();
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return aVal.localeCompare(bVal);
			}
			return Number(aVal) - Number(bVal);
		});
		items = items;
	}
</script>

<h1>File Metadata</h1>
Create a new entry based on parsed Metadata or use it to filter database for existing entries to overwrite.
<DataTable>
	<Head>
		<Row>
			<Cell style="text-align:right;">Filter all</Cell>
			<Cell checkbox>
				<Checkbox />
			</Cell>
		</Row>
	</Head>
	<Body>
		{#each Object.entries(outputMetaData) as [key, val]}
			<Row>
				<Cell
					><TextField bind:value={outputMetaData[key]} style="width:100%" label={key}>
						<div slot="trailingIcon">
							{#if key == 'Composer'}
								{#if outputMetaData['Composer'] != outputMetaData['Artist']}
									<Icon
										on:click={() => {
											outputMetaData['Composer'] = outputMetaData['Artist'];
										}}
										style="margin-right:10px"
										class="material-icons-outlined"
										>subdirectory_arrow_left
									</Icon>
								{:else}
									<Icon style="margin-right:10px; opacity:20%" class="material-icons-outlined">
										subdirectory_arrow_left</Icon
									>
								{/if}
							{/if}
							{#if outputMetaData[key]}
								<Icon
									on:click={() => {
										outputMetaData[key] = '';
									}}
									style="margin-right:10px;"
									class="material-icons-outlined"
									>backspace
								</Icon>
							{:else}
								<Icon style="margin-right:10px; opacity:20%" class="material-icons-outlined"
									>backspace</Icon
								>
							{/if}
							{#if outputMetaData[key] != mobileSheetsDataOriginal[key]}
								<Icon
									on:click={() => {
										outputMetaData[key] = mobileSheetsDataOriginal[key];
									}}
									class="material-icons-outlined"
									>replay
								</Icon>
							{:else}
								<Icon style="opacity:20%" class="material-icons-outlined">replay</Icon>
							{/if}
						</div>
					</TextField>
				</Cell>
				{#if ['Artist', 'Song', 'Key'].indexOf(key) > -1}
					<Cell checkbox>
						<Checkbox bind:group={selectedMeta} value={key} valueKey={key} />
					</Cell>
				{:else}
					<Cell />
				{/if}
			</Row>
		{/each}
	</Body>
</DataTable>
<h1>Database</h1>
Filter Database by checking the rows above.
<DataTable
	sortable
	bind:sort
	bind:sortDirection
	on:SMUIDataTable:sorted={handleSort}
	table$aria-label="Database list"
>
	<Head>
		<Row>
			<!--
        Note: whatever you supply to "columnId" is
        appended with "-status-label" and used as an ID
        for the hidden label that describes the sort
        status to screen readers.
 
        You can localize those labels with the
        "sortAscendingAriaLabel" and
        "sortDescendingAriaLabel" props on the DataTable.
      -->
			<!--Cell numeric columnId="id">
				<IconButton class="material-icons">arrow_upward</IconButton>
				<Label>ID</Label>
			</Cell-->
			<Cell checkbox>
				<Checkbox />
			</Cell>
			<Cell columnId="Song">
				<Label>Song</Label>
				<!-- For non-numeric columns, icon comes second. -->
				<IconButton class="material-icons">arrow_upward</IconButton>
			</Cell>
			<Cell columnId="Artist">
				<Label>Artist</Label>
				<IconButton class="material-icons">arrow_upward</IconButton>
			</Cell>
			<Cell columnId="Key">
				<Label>Key</Label>
				<IconButton class="material-icons">arrow_upward</IconButton>
			</Cell>
			<Cell columnId="Type">
				<Label>Type</Label>
				<IconButton class="material-icons">arrow_upward</IconButton>
			</Cell>
			<!--Cell numeric columnId="Tempo">
				<IconButton class="material-icons">arrow_upward</IconButton>
				<Label>Tempo</Label>
			</Cell-->
			<!-- You can turn off sorting for a column. 
			<Cell sortable={false}>Website</Cell>-->
		</Row>
	</Head>
	<Body>
		{#each filteredItems as item (item.id)}
			<Row
				on:click={() => {
					Object.keys(outputMetaData).forEach((key) => {
						outputMetaData[key] = item[key] ?? '';
					});
				}}
			>
				<!--Cell numeric>{item.id}</Cell-->

				<Cell checkbox>
					<Checkbox bind:group={selectedDB} value={item.id} valueKey={'id'} />
				</Cell>
				<Wrapper>
					<Cell class="ellipsis-until-hover"><p>{item.Song}</p></Cell>
					{#if item.Song.length > 20}<Tooltip yPos="below">{item.Song}.</Tooltip>{/if}
				</Wrapper>
				<Wrapper>
					<Cell class="ellipsis-until-hover"><p>{item.Artist}</p></Cell>
					{#if item.Artist.length > 20}<Tooltip yPos="below">{item.Artist}</Tooltip>{/if}
				</Wrapper>
				<Cell>{item.Key}</Cell>
				<Wrapper>
					<Cell class="ellipsis-until-hover"><p>{item.Type}</p></Cell>
					{#if item.Type.length > 20}<Tooltip yPos="below">{item.Type}</Tooltip>{/if}
				</Wrapper>
				<!--Cell numeric>{item.Tempo}</Cell-->
			</Row>
		{/each}
	</Body>
</DataTable>
{selectedDB}
{filteredSelected}
{selectedTypes}
{allTypes}
{selectedPaths}
<p class="mdc-typography--body2">{$t('no_options')}</p>

<style>
	:global(.ellipsis-until-hover) p {
		max-width: 120px;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
	/*:global(.ellipsis-until-hover:hover) p {
		overflow: visible;
		white-space: normal;
		height: auto;
	} */
</style>
