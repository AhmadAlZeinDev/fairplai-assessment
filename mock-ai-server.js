const http = require('http');
const crypto = require('crypto');

const PORT = 4000;
const APP_WEBHOOK_URL = 'http://localhost:3000/api/v1/analysis/webhook';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'your-webhook-secret';
const CALLBACK_DELAY_MS = 3000;

function sendWebhookCallback(jobId) {
  const payload = JSON.stringify({
    externalJobId: jobId,
    status: 'success',
    result: { score: 95, highlights: ['goal_01', 'foul_03'] },
  });

  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const url = new URL(APP_WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-webhook-signature': signature,
    },
  };

  const req = http.request(options, (res) => {
    console.log(`[mock-ai] Webhook callback sent for ${jobId} → HTTP ${res.statusCode}`);
  });

  req.on('error', (err) => {
    console.error(`[mock-ai] Webhook callback failed for ${jobId}:`, err.message);
  });

  req.write(payload);
  req.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const jobId = `ext-job-${crypto.randomUUID()}`;
      console.log(`[mock-ai] Job accepted → ${jobId}`);
      console.log(`[mock-ai] Will call webhook in ${CALLBACK_DELAY_MS}ms...`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jobId }));

      setTimeout(() => sendWebhookCallback(jobId), CALLBACK_DELAY_MS);
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Mock AI server running on http://localhost:${PORT}`);
  console.log(`Webhook callbacks → ${APP_WEBHOOK_URL}`);
  console.log(`Callback delay: ${CALLBACK_DELAY_MS}ms\n`);
});
