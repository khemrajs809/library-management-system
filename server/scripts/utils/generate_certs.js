const fs = require('fs');
const selfsigned = require('selfsigned');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const options = { days: 365, keySize: 2048 };

// selfsigned.generate() can return a promise in newer versions
const result = selfsigned.generate(attrs, options);

if (result && result.then) {
    result.then((pems) => {
        fs.writeFileSync('./certs/localhost.key', pems.private);
        fs.writeFileSync('./certs/localhost.crt', pems.cert);
        console.log('Self-signed certificates generated successfully (async)!');
    }).catch(err => {
        console.error('Error generating certs:', err);
    });
} else {
    fs.writeFileSync('./certs/localhost.key', result.private);
    fs.writeFileSync('./certs/localhost.crt', result.cert);
    console.log('Self-signed certificates generated successfully (sync)!');
}
