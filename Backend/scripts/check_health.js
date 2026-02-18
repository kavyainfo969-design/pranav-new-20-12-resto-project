const http = require('http');
const url = 'http://localhost:5000/api/health';

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const obj = JSON.parse(data);
      console.log('HEALTH:', JSON.stringify(obj, null, 2));
      process.exit(0);
    } catch (e) {
      console.error('Non-JSON response:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(2);
});
