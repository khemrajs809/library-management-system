const https = require('https');

const data = JSON.stringify({
  memberId: 'MEM-138',
  bookId: 'BK-5020'
});

const options = {
  hostname: 'localhost',
  port: 5005,
  path: '/api/issues',
  method: 'POST',
  rejectUnauthorized: false,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();
