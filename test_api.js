const https = require('https');

const req = https.request({
    hostname: 'localhost',
    port: 5005,
    path: '/api/members/MEM-102',
    method: 'GET',
    rejectUnauthorized: false
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log('GET Member Response Code:', res.statusCode);
        console.log('GET Member Response Body:', body);
    });
});

req.on('error', e => console.error(e));
req.end();
