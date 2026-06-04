const pool = require('./server/src/config/db');
const initDB = require('./server/src/config/initDB');

async function run() {
    try {
        console.log("Running initDB...");
        await initDB();
        console.log("Done.");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
