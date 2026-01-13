const { parseRequest, sendJson } = require('./utils/http');

const rootRoutes = require('./routes/root.routes');
const healthRoutes = require('./routes/health.routes');
const auditClientesRoutes = require('./routes/auditClientes.routes');

function createApp() {
  // Junta todas as rotas
  const routes = [
    ...rootRoutes(),
    ...healthRoutes(),
    ...auditClientesRoutes()
  ];

  // Handler HTTP (compatível com http.createServer)
  return async (req, res) => {
    const ctx = parseRequest(req);

    // Procura rota correspondente
    for (const r of routes) {
      if (r.method === ctx.method && r.path === ctx.path) {
        try {
          return await r.handler(req, res, ctx);
        } catch (err) {
          return sendJson(res, 500, { error: err.message || 'Erro interno' });
        }
      }
    }

    // Fallback
    return sendJson(res, 404, { error: 'Rota não encontrada' });
  };
}

module.exports = { createApp };
