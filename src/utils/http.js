function parseRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries())
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

module.exports = { parseRequest, readJsonBody, sendJson };
