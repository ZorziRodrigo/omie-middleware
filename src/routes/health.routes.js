const { sendJson } = require('../utils/http');

module.exports = function healthRoutes() {
  return [
    {
      method: 'GET',
      path: '/health',
      handler: async (_req, res) => {
        return sendJson(res, 200, { status: 'ok' });
      }
    }
  ];
};
