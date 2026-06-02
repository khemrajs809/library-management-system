const https = require('https');

https.get('https://localhost:5005/api/issues/lookup/BK-5021-3', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log(data));
}).on('error', e => console.log('Error:', e.message));
