import initSqlJs from 'sql.js';

const SQL = await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
    // You can omit locateFile completely when running in node
    locateFile: (file) => `https://sql.js.org/dist/${file}`
});
export var db = new SQL.Database()

export async function initDB(dbArrayBuffer) {
    if (dbArrayBuffer.length) {
        db = new SQL.Database(dbArrayBuffer);
        return true;
    } else return false;
}

export function execDB(query) {
    try {
        return db.exec(query);
    } catch {
        throw 'unable to query. Is db initialized?';
    }
}

export function getArtistId(artist, create = false) {
    let contents = execDB(`SELECT Id, Name FROM "Artists" WHERE Name = "${artist}";`)
    if(contents[0].values.length) {
        return contents[0].values[0][0]
    } else {
        if (create) {
            execDB(`INSERT INTO "Artists" ("Name", "DateCreated", "LastModified") VALUES ("${artist}", ${Date.now()}, ${Date.now()})`)
            return getArtistId(artist)
        } else {
            throw 'Artist does not exist, pass create=true to create entry'
        }
    }
}