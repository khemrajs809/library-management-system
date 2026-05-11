const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:3000/api/issues/history');
        if (res.data.success && res.data.data.length > 0) {
            console.log('Sample History Item:', JSON.stringify(res.data.data[0], null, 2));
            if (res.data.data[0].created_at) {
                console.log('SUCCESS: created_at field found!');
            } else {
                console.log('FAILURE: created_at field NOT found!');
            }
        } else {
            console.log('No history found or API failed.');
        }
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

test();
