const { parseRequest, sendJson } = require('./utils/http');

const rootRoutes = require('./routes/root.routes');
const healthRoutes = require('./routes/health.routes');
const auditClientesRoutes = require('./routes/auditClientes.routes');
const vendasRoutes = require('./routes/vendas.routes');

function createApp() {
  const routes = [
    ...rootRoutes(),
    ...healthRoutes(),
    ...auditClientesRoutes(),
    ...vendasRoutes()
  ];

  return async (req, res) => {
    const ctx = parseRequest(req);

    for (const r of routes) {
      if (r.method === ctx.method && r.path === ctx.path) {
        try {
          return await r.handler(req, res, ctx);
        } catch (err) {
          return sendJson(res, 500, { error: err.message || 'Erro interno' });
        }
      }
    }

    return sendJson(res, 404, { error: 'Rota não encontrada' });
  };
}

module.exports = { createApp };
