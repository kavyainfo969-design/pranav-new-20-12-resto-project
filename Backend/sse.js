// Simple SSE broadcaster for orders
const clients = [];

function addClient(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('\n');

  const client = res;
  clients.push(client);

  client.on('close', () => {
    const idx = clients.indexOf(client);
    if (idx !== -1) clients.splice(idx, 1);
  });
}

function sendEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(payload);
    } catch (e) {
      // ignore write errors
    }
  });
}

module.exports = { addClient, sendEvent };
