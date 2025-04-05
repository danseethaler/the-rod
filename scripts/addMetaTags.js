const fs = require('fs');
const path = './dist/index.html';

const html = fs.readFileSync(path, 'utf8');
const metaTags = `
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="The Rod" />
  <link rel="apple-touch-icon" href="/assets/icon.png" />
`;

const updated = html.replace('</head>', `${metaTags}\n</head>`);
fs.writeFileSync(path, updated);
console.log('✅ Meta tags injected into index.html');
