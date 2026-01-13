const { sendJson } = require('../utils/http');

module.exports = function rootRoutes() {
  return [
    {
      method: 'GET',
      path: '/',
      handler: async (_req, res) => {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'omie-middleware',
          message: 'Middleware no ar',
          routes: [
            'GET /health',
            'POST /audit/clientes/buscar',
            'POST /vendas/clientes/evolucao-mensal',
            'POST /vendas/clientes/inativos'
          ]
        });
      }
    }
  ];
};
