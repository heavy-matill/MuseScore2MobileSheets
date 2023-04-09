import { Dropbox, DropboxAuth } from 'dropbox';
import { get, set } from 'idb-keyval';
import dropboxPicker from 'dropbox-file-picker';
import { dropboxState } from '../stores';

function updateAuthorized(value) {
    dropboxState.update((state) => {
        return {
            ...state, authorized: value
        }
    })
}

function updatePath(value) {
    dropboxState.update((state) => {
        return {
            ...state, path: value
        }
    })
}

function updateDBBlob(value) {
    dropboxState.update((state) => {
        return {
            ...state, dbBlob: value
        }
    })
}

export const dropboxAuth = new DropboxAuth({ clientId: 'b1k4ymmys0wygpy' });
var dropboxClient;
const hash = window.location.hash.slice(1); // remove the "#" symbol from the hash
window.location.hash = '';
const params = new URLSearchParams(hash); // create a URLSearchParams object from the hash
export var accessToken = params.get('access_token'); // get the value of the "access_token" parameter
export var mobileSheetsPath = "";
export var dbLink = "";
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

export function browseToDatabase(newAccessToken) {
    if (!newAccessToken) newAccessToken = accessToken;
    dropboxPicker
        .open({
            accessToken: newAccessToken, // user's accessToken
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
            mobileSheetsPath = result.path_display;
        });
}

async function verifyAndStoreAccessToken(newAccessToken) {
    dropboxAuth.setAccessToken(newAccessToken);
    console.log('check and refresh', await dropboxAuth.checkAndRefreshAccessToken());
    newAccessToken = dropboxAuth.getAccessToken();
    console.log('accessToken', newAccessToken);
    if (newAccessToken) {
        accessToken = newAccessToken;
        updateAuthorized(true)
        set('accessToken', newAccessToken);
        get('path').then((path) => {
            if (path) {
                mobileSheetsPath = path;
                browseDropbox(newAccessToken);
            }
        });
    }
}

export async function uploadFile(buffer, path) {
    dropboxClient = new Dropbox({ accessToken: accessToken });
    const sessionId = (await dropboxClient.filesUploadSessionStart({ close: false, contents: buffer })).result.session_id;
    let cursor = { session_id: sessionId, offset: buffer.byteLength };
    const commit = { path: path, mode: 'overwrite', autorename: true, mute: false };
    //@ts-ignore
    const result = await dropboxClient.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: {} });
    return result
    return await dropboxClient.filesUploadSessionFinish({
        commit: { path: path, mode: 'overwrite' },
        contents: {}
    });

}

function browseDropbox(newAccessToken) {
    console.log('browseDropbox with accessToken', newAccessToken);
    dropboxClient = new Dropbox({ accessToken: newAccessToken });
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
    dropboxClient
        .filesGetTemporaryLink({ path: mobileSheetsPath })
        .then(function (response) {
            console.log('filesGetTemporaryLink', response);
            dbLink = response.result.link;
        })
        .catch(function (error) {
            console.log('filesGetTemporaryLink', error);
            accessToken = '';
            set('accessToken', '');
            dropboxAuth.setAccessToken('');
        });

    dropboxClient
        .filesDownload({ path: mobileSheetsPath })
        .then(function (response) {
            console.log('filesDownload', response);
            // @ts-ignore
            updateDBBlob(response.result.fileBlob);
        })
        .catch(function (error) {
            console.log('filesDownload', error);
            //$dropboxState.accessToken = '';
            //set('accessToken', '');
            //auth.setAccessToken('');
        });
}

export async function dropboxAuthURL() {
    // @ts-ignore
    window.location.href = await dropboxAuth.getAuthenticationUrl(window.location.origin)
};

export async function unAuthorize() {

    updateAuthorized(false)
    accessToken = '';
    await set('accessToken', '');
}
