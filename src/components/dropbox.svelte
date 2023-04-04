<script>
	import { t } from '$lib/i18n/i18n';
	import { get, set } from 'idb-keyval';
	import Button, { Group, Label, Icon } from '@smui/button';
	import { Dropbox, DropboxAuth } from 'dropbox';
	import { dropboxState } from '../stores.js';

	const auth = new DropboxAuth({ clientId: 'b1k4ymmys0wygpy' });
	var dbx;
	var authURL;
	auth.getAuthenticationUrl(window.location.origin).then((val) => {
		console.log(val);
		authURL = val;
	});

	// initially trying to get accessToken from hash
	const hash = window.location.hash.slice(1); // remove the "#" symbol from the hash
	window.location.hash = '';
	const params = new URLSearchParams(hash); // create a URLSearchParams object from the hash
	let accessToken = params.get('access_token'); // get the value of the "access_token" parameter
	if (accessToken) {
		console.log('accessToken from hash', accessToken);
		browseToDatabase(accessToken);
		verifyAndStoreAccessToken(accessToken);
		// get path to database??
	} else {
		console.log('no accessToken in Hash');
		get('accessToken').then((accessToken) => {
			verifyAndStoreAccessToken(accessToken);
		});
	}

	//$: $dropboxState.accessToken, browseDropbox($dropboxState.accessToken);

	async function verifyAndStoreAccessToken(accessToken) {
		auth.setAccessToken(accessToken);
		console.log('check and refresh', await auth.checkAndRefreshAccessToken());
		accessToken = auth.getAccessToken();
		console.log('accessToken', accessToken);
		if (accessToken) {
			$dropboxState.accessToken = accessToken;
			set('accessToken', accessToken);
			get('path').then((path) => {
				if (path) {
					$dropboxState.path = path;
					browseDropbox(accessToken);
				}
			});
		}
	}

	function browseDropbox(accessToken) {
		console.log('browseDropbox with accessToken', accessToken);
		dbx = new Dropbox({ accessToken: accessToken });
		/*dbx
			.filesListFolder({ path: '' })
			.then(function (response) {
				console.log('filesListFolder', response);
			})
			.catch(function (error) {
				console.log('filesListFolder', error);
				//$dropboxState.accessToken = '';
				//set('accessToken', '');
				//auth.setAccessToken('');
			});*/
		dbx
			.filesGetTemporaryLink({ path: $dropboxState.path })
			.then(function (response) {
				console.log('filesGetTemporaryLink', response);
				$dropboxState.dbLink = response.result.link;
			})
			.catch(function (error) {
				console.log('filesGetTemporaryLink', error);
				$dropboxState.accessToken = '';
				set('accessToken', '');
				auth.setAccessToken('');
			});

		dbx
			.filesDownload({ path: $dropboxState.path })
			.then(function (response) {
				console.log('filesDownload', response);
				// @ts-ignore
				$dropboxState.dbBlob = response.result.fileBlob;
			})
			.catch(function (error) {
				console.log('filesDownload', error);
				//$dropboxState.accessToken = '';
				//set('accessToken', '');
				//auth.setAccessToken('');
			});
	}

	//var dbx = new Dropbox({ accessToken: 'YOUR_ACCESS_TOKEN_HERE' });
	/*import Dropbox from 'https://www.dropbox.com/static/api/2/dropins.js';
	Dropbox.appKey = 'unu900mosmf31ky'; 
	Dropbox.appSecret = 'ez0f83t91t9z6t7';*/

	import dropboxPicker from 'dropbox-file-picker';
	function browseToDatabase(accessToken) {
		if (!accessToken) accessToken = $dropboxState.accessToken;
		dropboxPicker
			.open({
				accessToken: accessToken, // user's accessToken
				allowedExtensions: ['db'], // like ['png', 'jpg', '.gif'] (with or without dot)
				allowFolderSelection: false, // folder selection
				isMultiple: false, // multiple entries (files/folders) selection
				loadPreviews: false, // load preview for supported image formats ('jpg', 'jpeg', 'png', 'tiff', 'tif', 'gif', 'bmp')
				hideCountLabel: true, // show or hide label 'You've selected * entries' (defaults to 'false')
				hideCheckboxes: true, // hide checkboxes (defaults to 'false')
				rows: 4, // rows count in grid mode (defaults to 4, min 1, max 10)
				defaultLayout: 'list', // layout mode (defaults to 'list', supported values: 'list', 'grid')
				disableLayoutSelection: true, // ability to select layout mode (defaults to 'false')
				//width: '700px', // custom width (defaults to '50%', supported values: any css width value)
				previewSettings: {
					size: 'w256h256' // preview size (default "w64h64")
				},
				localization: {
					// translation values
					title: 'Dropbox', // main title
					cancel: 'Cancel', // cancel button
					choose: 'Choose', // choose button
					entriesSelectionLabel: "You've selected {0} entries" // entries selection label
				}
			}) // user's accessToken
			.then((result) => {
				// promise with selected files/folders info
				console.log('picked dropbox path:', result);
				set('path', result.path_display);
				$dropboxState.path = result.path_display;
			});
	}
</script>

{#if !$dropboxState.accessToken}
	Cloud access is not Authorized
	<a href={authURL}>Authorize</a>
	<Button on:click={(window.location.href = authURL)}>Authorize</Button>
{:else}
	Authorized!
	{#if $dropboxState.path}
		{$dropboxState.path}
	{/if}
	<Button on:click={browseToDatabase}>Browse</Button>
{/if}
<p class="mdc-typography--body2">{$t('no_options')}</p>
