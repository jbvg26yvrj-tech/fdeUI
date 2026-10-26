const http = require('http');

const PORT = 8080;

const MOCK_SCHEDULE = {
  id: "00000000-0000-0000-0000-000000000001",
  pipelineId: "00000000-0000-0000-0000-000000000001",
  cronExpression: "0 0 * * * ?",
  enabled: true,
  description: "Mock schedule"
};

function buildResponse(method, url, body) {
  if (url.startsWith('/api/v1/schedules')) {
    const parts = url.split('/');
    const pipelineId = parts[4] || null;

    if (method === 'GET' && pipelineId) {
      return { status: 200, body: { ...MOCK_SCHEDULE, pipelineId } };
    }
    if (method === 'POST') {
      const parsed = body ? JSON.parse(body) : {};
      return { status: 201, body: { ...MOCK_SCHEDULE, ...parsed, id: "00000000-0000-0000-0000-000000000099" } };
    }
    if (method === 'PUT' && pipelineId) {
      const parsed = body ? JSON.parse(body) : {};
      return { status: 200, body: { ...MOCK_SCHEDULE, ...parsed, pipelineId } };
    }
    if (method === 'DELETE' && pipelineId) {
      return { status: 204, body: null };
    }
  }

  if (url === '/api/v1/triggers/manual' && method === 'POST') {
    const parsed = body ? JSON.parse(body) : {};
    return { status: 200, body: { message: "Pipeline triggered", pipelineId: parsed.pipelineId, sessionId: "00000000-0000-0000-0000-000000000077" } };
  }

  if (url === '/api/v1/triggers/stop' && method === 'POST') {
    return { status: 200, body: { message: "Execution stop requested" } };
  }

  // Health check
  if (url === '/actuator/health' || url === '/health') {
    return { status: 200, body: { status: "UP" } };
  }

  return { status: 404, body: { error: "Not found", path: url } };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (body) {
      console.log(`  Body: ${body}`);
    }
    console.log(`  Headers: ${JSON.stringify(req.headers)}`);

    const result = buildResponse(req.method, req.url, body);

    console.log(`  -> Response: ${result.status}`);
    if (result.body) {
      console.log(`  -> Body: ${JSON.stringify(result.body)}`);
    }
    console.log('');

    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(result.body ? JSON.stringify(result.body) : '');
  });
});

server.listen(PORT, () => {
  console.log(`Mock fde-dispatcher listening on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET/POST/PUT/DELETE /api/v1/schedules/{pipelineId}');
  console.log('  POST /api/v1/triggers/manual');
  console.log('  POST /api/v1/triggers/stop');
  console.log('  GET /actuator/health');
  console.log('');
});
