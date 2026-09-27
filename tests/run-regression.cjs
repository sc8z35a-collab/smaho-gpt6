'use strict';
// Runs tests/index.html (regression.js) headlessly and prints failures and the summary.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto((process.env.AURA_TEST_URL||'http://127.0.0.1:8765/')+'tests/index.html');
await p.waitForSelector('body[data-test-complete="true"]',{timeout:400000});
const text=await p.locator('#results').innerText();console.log(text.split('\n').filter(l=>/FAIL|RESULT/.test(l)).join('\n'));await b.close();})();
