<script>
	import { t } from '$lib/i18n/i18n';
	import Button, { Group, Label, Icon } from '@smui/button';
	import { dropboxAuthURL, accessToken, mobileSheetsPath, browseToDatabase, unAuthorize } from '$lib/dropbox';
	import { Dropbox } from 'dropbox';
import { dropboxState } from '../stores';


	// initially trying to get accessToken from hash

	//$: $dropboxState.accessToken, browseDropbox($dropboxState.accessToken);

	//var dbx = new Dropbox({ accessToken: 'YOUR_ACCESS_TOKEN_HERE' });
	/*import Dropbox from 'https://www.dropbox.com/static/api/2/dropins.js';
	Dropbox.appKey = 'unu900mosmf31ky'; 
	Dropbox.appSecret = 'ez0f83t91t9z6t7';*/
</script>

{#if !$dropboxState.authorized}
	Cloud access is not Authorized
	<!--a href={authURL(window.location.origin)}>Authorize</a-->
	<Button
	class="button-shaped-round"
	style="padding: 0; margin-inline: 4px 0px; margin-block: 8px 0px; flex: 1;"
	color="secondary"
	variant="raised"
		on:click={() => {
			dropboxAuthURL();
		}}>Authorize</Button
	>
{:else}
	Authorized!
	{#if $dropboxState.path}
		{$dropboxState.path}
	{/if}
	<Button
	class="button-shaped-round"
	style="padding: 0; margin-inline: 4px 0px; margin-block: 8px 0px; flex: 1;"
	color="secondary"
	variant="raised"
		on:click={() => {
			unAuthorize();
		}}>Unauth</Button
	>
	<Button
	class="button-shaped-round"
	style="padding: 0; margin-inline: 4px 0px; margin-block: 8px 0px; flex: 1;"
	color="secondary"
	variant="raised"
		on:click={() => {
			browseToDatabase();
		}}>Browse</Button
	>
{/if}
<p class="mdc-typography--body2">{$t('no_options')}</p>
