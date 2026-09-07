const fs = require('fs');
const content = fs.readFileSync('public/a1109a6e893d27842e1a57a5f5c9d9749d424e2e6605714b301221fce68d799d.html', 'utf-8');

// Find all onclick/onchange/onkeyup attributes
const eventAttrRegex = /on\w+\s*=\s*["']([^"']+)["']/g;
let m;
const handlers = new Set();
while ((m = eventAttrRegex.exec(content)) !== null) {
  const handler = m[1].trim();
  handlers.add(handler);
}
console.log('Unique Event Handlers in Admin HTML (' + handlers.size + '):');
for (const h of handlers) {
  console.log('  ' + h);
}
