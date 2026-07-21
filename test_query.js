const http = require('http');
const fs = require('fs');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: body
            }));
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log('Fetching /api/list-core...');
        const core = await fetchUrl('http://localhost:3000/api/list-core');
        console.log('Core Status:', core.status);
        console.log('Core Body:', core.body);

        console.log('\nFetching /api/list-fixed...');
        const fixed = await fetchUrl('http://localhost:3000/api/list-fixed');
        console.log('Fixed Status:', fixed.status);
        console.log('Fixed Body:', fixed.body);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
