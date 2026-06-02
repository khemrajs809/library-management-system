const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { initSessionDb } = require('../features/sessions/session.service');

const syncProcedures = async () => {
    try {
        const proceduresDir = path.resolve(__dirname, '../../database/procedures');
        if (!fs.existsSync(proceduresDir)) return;

        const files = fs.readdirSync(proceduresDir).filter(f => f.endsWith('.sql'));
        console.log(`📂 Syncing ${files.length} SQL files...`);

        for (const file of files) {
            const filePath = path.join(proceduresDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Clean content: remove DELIMITER and comments that might interfere
            content = content.replace(/DELIMITER \/\/|DELIMITER ;/g, '');
            
            // Split by our unique block separator
            const blocks = content.split(/\/\* NEXT_PROCEDURE \*\//);

            for (let block of blocks) {
                const trimmedSql = block.trim();
                if (!trimmedSql || trimmedSql.length < 10) continue;

                // Extract procedure name safely
                const nameMatch = trimmedSql.match(/CREATE PROCEDURE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
                if (nameMatch) {
                    const procName = nameMatch[1];
                    try {
                        await pool.query(`DROP PROCEDURE IF EXISTS ${procName}`);
                        await pool.query(trimmedSql);
                        console.log(`✅ Synced: ${procName}`);
                    } catch (procErr) {
                        console.error(`❌ SQL Error in ${procName}:`, procErr.message);
                    }
                }
            }
        }
        console.log('🏁 Procedures Re-Synchronized Successfully.');
    } catch (err) {
        console.error('❌ Critical sync error:', err.message);
    }
};

const initDB = async () => {
    try {
        await syncProcedures();
        await pool.query('CALL initialize_database_schema()');
        console.log('Database synchronized and historical data healed successfully.');
        await initSessionDb();
    } catch (err) {
        console.error('❌ Database initialization error:', err);
    }
};

module.exports = initDB;
