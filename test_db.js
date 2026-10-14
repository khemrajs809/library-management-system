const pool = require('./server/src/config/db');
const caseConverter = require('./server/src/middlewares/caseConverter.middleware');

async function test() {
    try {
        const id = 'MEM-102';
        const [rows] = await pool.query('CALL proc_get_member(?)', [id]);
        const member = rows[0];
        
        let req = {};
        let res = {
            json: function(body) {
                console.log('Original JSON called with:', typeof body, Array.isArray(body));
            }
        };
        
        caseConverter(req, res, () => {
            console.log('Middleware next() called');
        });
        
        console.log('Calling res.json(member)');
        res.json({ success: true, data: member });
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
test();
