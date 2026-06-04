const pool = require('./server/src/db');

async function dumpSchema() {
    try {
        const tablesResult = await pool.query("SHOW TABLES");
        const tables = tablesResult.map(row => Object.values(row)[0]);
        
        let schemaDump = "";
        for (const table of tables) {
            const createTableResult = await pool.query(`SHOW CREATE TABLE \`${table}\``);
            schemaDump += `\n\n-- Table: ${table}\n`;
            schemaDump += createTableResult[0]['Create Table'] + ';';
            
            const indexesResult = await pool.query(`SHOW INDEX FROM \`${table}\``);
            if (indexesResult.length > 0) {
                schemaDump += `\n-- Indexes for ${table}:\n`;
                schemaDump += JSON.stringify(indexesResult, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                , 2);
            }
        }
        
        const fs = require('fs');
        fs.writeFileSync('db_schema_dump.txt', schemaDump);
        console.log("Dump saved to db_schema_dump.txt");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dumpSchema();
