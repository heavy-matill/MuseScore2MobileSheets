import initSqlJs from 'sql.js';
import { Buffer } from 'buffer';

const SQL = await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
    // You can omit locateFile completely when running in node
    locateFile: (file) => `https://sql.js.org/dist/${file}`
});
var db = new SQL.Database()

export async function initDB(dbArrayBuffer) {
    console.log("initDB")
    if (dbArrayBuffer.length) {
        db = new SQL.Database(dbArrayBuffer);
        console.log("initDB")
        return true;
    } else return false;
}

export function execDB(query) {
    try {
        return db.exec(query);
    } catch (e) {
        throw e + ', unable to query. Is db initialized?';
    }
}
export function runDB(query) {
    try {
        return db.run(query);
    } catch (e) {
        throw e + ', unable to query. Is db initialized?';
    }
}

export function getArtistId(name, create = false) {
    return getSomeId("Artists", name, create);
}

export function getKeyId(name, create = false) {
    name = name.split('/')[0]
    return getSomeId("Key", name, create);
}

export function insertRelation(table, name1, id1, name2, id2) {
    runDB(`INSERT INTO "${table}" ("${name1}", "${name2}") VALUES ("${id1}", "${id2}")`)
}

export function getSomeId(table, name, create = false, name_column = "Name") {
    let contents = execDB(`SELECT "Id", "${name_column}" FROM "${table}" WHERE "${name_column}" = "${name}";`)
    console.log("contents", contents)
    try {
        if (contents.length) {
            console.log("values", contents[0].values)
            return contents[0].values.slice(-1)[0][0]
        } else {
            if (create) {
                runDB(`INSERT INTO "${table}" ("${name_column}", "DateCreated", "LastModified") VALUES ("${name}", ${Date.now()}, ${Date.now()})`)
                return getSomeId(table, name, false, name_column)
            } else {
                throw 'create=false'
            }
        }
    } catch (e) {
        throw `${e}, ${name} does not exist in ${table}, pass create=true to create entry`

    }
}

export function insertFile(songId, path, numPage, fileSize = 0) {
    runDB(`INSERT INTO "Files" ("SongId", "Path","PageOrder","FileSize", "LastModified", "Source", "Type") VALUES ("${songId}", "${path}", "1-${numPage}", "${fileSize}", ${Date.now()}, 1, 1)`)
}

export function insertSong(title) {
    runDB(`INSERT INTO "Songs" ("Title", "Difficulty", "LastPage", "OrientationLock", "Duration", "CreationDate", "LastModified", "AutoStartAudio", "SongId" ) 
    VALUES ("${title}", 0, 0, 0, 0, ${Date.now()}, ${Date.now()}, 0,0)`)
}

export function createSong(title, artist, key, paths, numPages) {
    insertSong(title)
    let songId = getSomeId("Songs", title, false, "Title");
    let artistId = getArtistId(artist, true);
    insertRelation("ArtistsSongs", "ArtistId", artistId, "SongId", songId)
    let keyId = getKeyId(key, true);
    insertRelation("KeySongs", "KeyId", keyId, "SongId", songId)
    paths.forEach((path, i) => { insertFile(songId, path, numPages[i]) })
    return [songId, artistId, keyId];
}
// @ts-ignore
window.Buffer = Buffer;
export function getDBBuffer() {
    return Buffer.from(db.export());
}