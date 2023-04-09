import { describe, test, expect } from 'vitest';
import {
	initDB,
	execDB,
	getArtistId,
	getKeyId,
	insertSong,
	createSong,
	getDBBuffer
} from '../src/lib/database';
import { readFile, writeFile } from 'fs/promises';

describe('Test database', async () => {
	let songId, artistId, keyId;
	let dbFile = await readFile('./test/mobilesheets.db');
	initDB(dbFile);
	test('Initialize Database', async () => {});

	test('Nonexistend Artist', () => {
		expect(() => getArtistId('Unrealistic nonexistent Artist name')).toThrowError();
	});

	test('Create Artist', async () => {
		artistId = getArtistId('Unrealistic nonexistent Artist name', true);
		expect(artistId).toBeGreaterThan(1);
	});

	test('Now artist exists', async () => {
		expect(() => getArtistId('Unrealistic nonexistent Artist name').to.equal(artistId));
	});

	test('insertSong', async () => {
		[songId, artistId, keyId] = createSong('new_title', 'new_artist', 'new_key', [
			'/MobileSheets/BAP/Aff_un_zo_C/Aff_un_zo.pdf',
			'/MobileSheets/BAP/Aff_un_zo_C/Aff_un_zo-Posaune.pdf'
		], [1,1]);
		expect(() => {
			[songId, artistId, keyId].forEach((id) => id.toBeGreaterThan(0));
		});
		expect(() => getArtistId('new_artist') == artistId);
		expect(() => getKeyId('new_key') == keyId);
	});

	test('write DB', async () => {
		const dbPath2 = './test/mobilesheets2.db';
		await writeFile(dbPath2, getDBBuffer());
		let dbFile = await readFile(dbPath2);
		initDB(dbFile);
		console.log(getArtistId('new_artist'));
		console.log(getKeyId('new_key'));
		expect(() => getArtistId('new_artist') == artistId);
		expect(() => getKeyId('new_key') == keyId);
	});
});
