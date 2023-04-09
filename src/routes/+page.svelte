<script lang="ts">
	import { exportOptions, homeState, languageState } from '../stores.js';
	import Button, { Group, Label, Icon } from '@smui/button';
	import Select, { Option } from '@smui/select';
	import List, { Item } from '@smui/list';
	import Checkbox from '@smui/checkbox';
	import Card, { Content } from '@smui/card';
	import CircularProgress from '@smui/circular-progress';
	import LinearProgress from '@smui/linear-progress';
	import Snackbar, { Actions } from '@smui/snackbar';
	import IconButton from '@smui/icon-button';
	import { fileOpen } from 'browser-fs-access';
	import MobileSheetsOptions from '../components/mobileSheetsOptions.svelte';
	import WebMscore from 'webmscore';
	import { t } from '$lib/i18n/i18n';
	import { uploadFile } from '$lib/dropbox';
	import { createSong, getDBBuffer } from '$lib/database';

	WebMscore.setLogLevel(2);
	let scores: WebMscore[] = [];
	let metaDataFinal;
	let titles: String[] = [];
	let blob: Blob = new Blob();
	let buf: ArrayBuffer = new ArrayBuffer(0);
	//@ts-ignore
	let files: FileWithHandle[] = [blob];
	// $: files = [blob];
	//@ts-ignore
	let oldFiles: FileWithHandle[] = [blob];
	// $: oldFiles = [];
	//@ts-ignore
	let msczMetadatas: String[];
	// $: msczMetadatas = [$t('no_file_metadata')];
	let inputFileNames: String[] = [$t('no_file_loaded')];
	$: inputFileNames = isFileLoaded === false ? [$t('no_file_loaded')] : inputFileNames;
	let filePaths: String[] = [];
	let errorMessage = $t('unknown_error');
	let npages: number[] = [1];
	let progress = 0;
	let loadingSnackbar;
	let items = [
		{
			id: -1,
			parts: [
				{
					harmonyCount: 0,
					hasDrumStaff: '',
					hasPitchedStaff: '',
					hasTabStaff: '',
					instrumentId: '',
					instrumentName: '',
					isVisible: '',
					lyricCount: 0,
					name: '',
					program: 0
				}
			],
			title: $t('full_score')
		}
	];
	$: items[items.findIndex((part) => part.id === -1)].title = $t('full_score');
	let selectedParts = [items[items.findIndex((part) => part.id === -1)].id];

	let isFileLoaded: boolean = false;
	let batchMode: boolean = false;
	// $homeState.convertIsDisabled = true;
	let oldConvertIsDisabled: boolean = true;
	// $homeState.downloadIsDisabled = true;
	let optionsAreDisabled: boolean = true;
	let fileIsLoading: boolean = false;
	let convertIsProcessing: boolean = false;

	function selectAllParts() {
		selectedParts = items.map((item) => item.id);
	}

	function clearPartsSelection() {
		selectedParts = [];
	}

	async function handleMscz() {
		oldConvertIsDisabled = $homeState.importIsDisabled;
		$homeState.importIsDisabled = true;
		//@ts-ignore
		files = await fileOpen([
			{
				mimeTypes: [
					'application/x-musescore',
					'application/vnd.recordare.musicxml',
					'application/vnd.recordare.musicxml+xml',
					'audio/midi',
					'audio/x-gtp',
					'audio/x-ptb',
					'application/x-musescore+xml'
				],
				extensions: [
					'.mscz',
					'.mxl',
					'.musicxml',
					'.xml',
					'.mid',
					'.midi',
					'.kar',
					'.gtp',
					'.gp3',
					'.gp4',
					'.gp5',
					'.gpx',
					'.gp',
					'.ptb',
					'.mscx'
				],
				description: $t('all_supported_files'),
				id: 'uploads',
				multiple: true
			},
			{
				mimeTypes: ['application/x-musescore'],
				extensions: ['.mscz'],
				description: $t('musescore_files')
			},
			{
				mimeTypes: ['application/vnd.recordare.musicxml', 'application/vnd.recordare.musicxml+xml'],
				extensions: ['.mxl', '.musicxml', '.xml'],
				description: $t('musicxml_files')
			},
			{
				mimeTypes: ['audio/midi'],
				extensions: ['.mid', '.midi', '.kar'],
				description: $t('midi_files')
			},
			// {
			// 	mimeTypes: ['application/x-musedata'],
			// 	extensions: ['.md'],
			// 	description: $t('musedata_files')
			// },
			// {
			// 	mimeTypes: ['application/x-capella'],
			// 	extensions: ['.cap', '.capx'],
			// 	description: $t('capella_files')
			// },
			// {
			// 	mimeTypes: ['application/x-biab'],
			// 	extensions: ['.mgu', '.sgu'],
			// 	description: $t('bb_files') + $t('experimental')
			// },
			// {
			// 	mimeTypes: ['application/x-overture'],
			// 	extensions: ['.ove', '.scw'],
			// 	description: $t('overture_score_writer_files') + $t('experimental')
			// },
			// {
			// 	mimeTypes: ['application/x-bww'],
			// 	extensions: ['.bmw', '.bww'],
			// 	description: $t('bagpipe_music_writer_files') + $t('experimental')
			// },
			{
				mimeTypes: ['audio/x-gtp'],
				extensions: ['.gtp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp'],
				description: $t('guitar_pro_files')
			},
			{
				mimeTypes: ['audio/x-ptb'],
				extensions: ['.ptb'],
				description: $t('power_tab_editor_files') + $t('experimental')
			}
			// {
			// 	mimeTypes: ['application/x-musescore+xml'],
			// 	extensions: ['.mscx'],
			// 	description: $t('musescore_folder_files') + $t('experimental')
			// },
			// {
			// 	extensions: ['.mscs'],
			// 	description: $t('musescore_developer_files')
			// },
			// {
			// 	mimeTypes: ['application/x-musescore'],
			// 	extensions: ['.mscz~'],
			// 	description: $t('musescore_backup_files')
			// }
		]).catch(() => {
			$homeState.importIsDisabled = oldConvertIsDisabled;
			return oldFiles;
		});

		if (oldFiles === files) {
			return;
		}

		return handleFileSelection(files);
	}

	async function handleFileSelection(inputFiles: File[]) {
		scores = [];
		titles = [];
		msczMetadatas = [];
		inputFileNames = [];
		let tempScores = [];

		batchMode = inputFiles.length > 1 ? true : false;

		oldFiles = inputFiles;

		for (let [index, blobs] of inputFiles.entries()) {
			let fileExt = blobs.name.substring(blobs.name.lastIndexOf('.') + 1);
			console.log(fileExt);
			if (fileExt === 'mid') {
				fileExt = 'midi';
			}
			if (
				![
					'gp',
					'gp3',
					'gp4',
					'gp5',
					'gpx',
					'gtp',
					'kar',
					'midi',
					'mscx',
					'mscz',
					'musicxml',
					'mxl',
					'ptb',
					'xml'
				].includes(fileExt)
			) {
				errorMessage = $t('invalid_file_extension_error');
				loadingSnackbar.open();
				return;
			}

			inputFileNames = [...inputFileNames, blobs.name];
			isFileLoaded = true;

			WebMscore.ready.then(async () => {
				fileIsLoading = true;
				tempScores.push({
					scoreBlob: await WebMscore.load(
						fileExt as any,
						new Uint8Array(await blobs.arrayBuffer())
					).then(async (loaded) => {
						await loaded.setSoundFont(
							new Uint8Array(await (await fetch('./MS_Basic.sf3')).arrayBuffer())
						);
						if (!batchMode) {
							await loaded.generateExcerpts();
							await loaded.metadata().then(async (meta) => {
								msczMetadatas.push(JSON.stringify(meta));
								items = [items[0]];
								meta.excerpts.forEach((part) => items.push(part));
							});
							npages.push(await loaded.npages());
						} else {
							msczMetadatas.push(JSON.stringify(await loaded.metadata()));
						}
						titles.push(await loaded.title());
						return loaded;
					}),
					scoreIndex: index
				});
				if (tempScores.length === inputFiles.length) {
					msczMetadatas.sort(
						(a, b) =>
							tempScores[msczMetadatas.indexOf(a)].scoreIndex -
							tempScores[msczMetadatas.indexOf(b)].scoreIndex
					);
					titles.sort(
						(a, b) =>
							tempScores[titles.indexOf(a)].scoreIndex - tempScores[titles.indexOf(b)].scoreIndex
					);
					scores = tempScores
						.sort((a, b) => a.scoreIndex - b.scoreIndex)
						.map((value) => value.scoreBlob);
					fileIsLoading = false;
					optionsAreDisabled = false;
					$homeState.importIsDisabled = false;
					}
			});
		}
	}

	async function importFiles() {
		let fileExtension = '.';
		let partsLength = selectedParts.length;
		let partsPages: number[] = [];
		$homeState.importIsDisabled = true;
		$homeState.downloadIsDisabled = true;
		convertIsProcessing = true;
		progress = 0;

		console.log('scores', scores);
		console.log('selected', selectedParts);
		for (let excerptId of selectedParts) {
			scores[0].setExcerptId(excerptId);

			fileExtension = '.pdf';
			let fileSuffix = '-' + items[items.findIndex((part) => part.id === excerptId)].title;
			if (excerptId === -1) {
				fileSuffix = '';
			}
			let outputFileName =
				inputFileNames[0].substring(0, inputFileNames[0].lastIndexOf('.')) +
				fileSuffix +
				fileExtension;
			let filePath = Array.from(
				[
					'',
					`MobileSheets`,
					metaDataFinal['Artist'],
					`${metaDataFinal['Song']}_${metaDataFinal['Key']}`,
					outputFileName
				],
				(s) => s.replace(/[\\/:"*?<>|]/g, '_')
			).join('/');
			console.log(filePath);
			filePaths.push(filePath);
			partsPages.push(await scores[0].npages());

			buf = await (await scores[0].savePdf()).buffer;
			let result = await uploadFile(buf, filePath);
			console.log(result);
			progress += 1 / partsLength;
		}

		createSong(
			metaDataFinal['Song'],
			metaDataFinal['Artist'],
			metaDataFinal['Key'],
			filePaths,
			partsPages
		);
		await uploadFile(getDBBuffer(), `/MobileSheets/mobilesheets.db`);
		progress = 1;
	}

	// make `handleUploads` globally available
	// TODO: use `globalThis`
	window['handleUploads'] = handleFileSelection;

	// have preloaded files
	if (window?.['preloadedUploads']?.length > 0) {
		handleFileSelection(window['preloadedUploads']);
	}
	window['preloadedUploads'] = [] as File[];
</script>

<Snackbar bind:this={loadingSnackbar}>
	<Label>{errorMessage}</Label>
	<Actions>
		<IconButton class="material-icons-outlined" title={$t('dismiss')}>close</IconButton>
	</Actions>
</Snackbar>

<div class="convert">
	<div class="fileHandling">
		<Button variant="outlined" on:click={handleMscz}>
			<Icon class="material-icons-outlined">file_upload</Icon>
			<Label>{$t('select_files_label')}</Label>
		</Button>
		<div class="buttons">
			<div
				style="margin-inline: 0px 4px; margin-block: 8px 0px; display: flex; flex-flow: column nowrap; flex: 1;"
			>
				<Button
					style="padding: 0;"
					variant="raised"
					bind:disabled={$homeState.importIsDisabled}
					on:click={importFiles}
				>
					{#if $languageState.direction === 'rtl'}
						<Icon class="material-icons-outlined" style="transform: scaleX(-1);">swap_horiz</Icon>
					{:else}
						<Icon class="material-icons-outlined">swap_horiz</Icon>
					{/if}
					<Label>{$t('convert_label')}</Label>
				</Button>
				{#if convertIsProcessing}
					<LinearProgress {progress} buffer={0} />
				{/if}
			</div>
		</div>
		{#if !fileIsLoading}
			{#if !convertIsProcessing}
				<p class="mdc-typography--subtitle1">
					{#each inputFileNames as fileName}
						{fileName}<br />
					{/each}
				</p>
			{:else}
				<p class="mdc-typography--subtitle1" style="margin-inline: 0px; margin-block: 12px 16px;">
					{#each inputFileNames as fileName}
						{fileName}<br />
					{/each}
				</p>
			{/if}
		{:else}
			<CircularProgress
				style="block-size: 28px; inline-size: 28px; margin-inline: 0px; margin-block: 16px;"
				indeterminate
			/>
		{/if}
	</div>
	{#if !optionsAreDisabled}
		<div class="options">
			<div class="fileOptions">
				<Card class="fileOption" variant="outlined" style="flex: 1;">
					<Content class="mdc-typography--subtitle2">{$t('export_options')}</Content>
					<div class="optionsRoot">
						<MobileSheetsOptions
							bind:outputMetaData={metaDataFinal}
							metaData={JSON.parse(msczMetadatas.toString())}
						/>
					</div>
					End of Card
				</Card>
			</div>
			{#if !batchMode}
				<div class="partOptions">
					<Card variant="outlined" style="flex: 1;">
						<Content class="mdc-typography--subtitle2">{$t('what_to_export')} S</Content>
						<List checkList>
							{#each items as item}
								<Item>
									<Checkbox bind:group={selectedParts} value={item.id} />
									<Label>{item.title}</Label>
								</Item>
							{/each}
						</List>
						<Group variant="outlined" style="display: flex;">
							<Button on:click={selectAllParts} variant="outlined" style="flex: auto;"
								><Label>{$t('select_all_label')}</Label></Button
							>
							<Button on:click={clearPartsSelection} variant="outlined" style="flex: auto;"
								><Label>{$t('clear_selection_label')}</Label></Button
							>
						</Group>
						End of selection Card
					</Card>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.convert {
		align-self: center;
		max-inline-size: 1024px;
		inline-size: 100%;
	}

	.fileHandling {
		display: flex;
		flex-flow: column wrap;
		justify-content: space-around;
	}

	.options {
		display: flex;
		flex-flow: row wrap;
		justify-content: space-around;
	}

	.partOptions,
	.fileOptions {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.optionsRoot {
		display: flex;
		flex-direction: column;
		padding: 16px;
	}

	.buttons {
		display: flex;
		flex-flow: row wrap;
		align-items: stretch;
		justify-content: space-around;
	}
</style>
