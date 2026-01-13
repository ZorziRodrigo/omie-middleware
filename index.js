const http = require('http');

const PORT = process.env.PORT || 3000;

// =========================
// Utilitários
// =========================
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
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

// =========================
// Servidor
// =========================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // -------------------------
  // Rota raiz (melhoria)
  // -------------------------
  if (req.method === 'GET' && path === '/') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'omie-middleware',
      message: 'Middleware no ar',
      routes: [
        'GET /health',
        'POST /audit/clientes/buscar'
      ]
    });
  }

  // -------------------------
  // Health check
  // -------------------------
  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  // -------------------------
  // Auditoria mock - Clientes
  // -------------------------
  if (req.method === 'POST' && path === '/audit/clientes/buscar') {
    try {
      const body = await readJsonBody(req);

      const cnpj_cpf = (body.cnpj_cpf || '').toString().trim();
      const email = (body.email || '').toString().trim();
      const telefone = (body.telefone || '').toString().trim();

      if (!cnpj_cpf && !email && !telefone) {
        return sendJson(res, 400, {
          error: 'Informe pelo menos um filtro: cnpj_cpf, email ou telefone'
        });
      }

      // Resposta MOCK (simulada)
      return sendJson(res, 200, {
        audit: {
          modulo: 'clientes',
          operacao: 'buscar',
          criterios: { cnpj_cpf, email, telefone },
          fonte: 'mock'
        },
        resultado: {
          encontrado: true,
          cliente: {
            codigo: 'CLI-0001',
            nome: 'Cliente Exemplo LTDA',
            cnpj_cpf: cnpj_cpf || '00.000.000/0001-00',
            email: email || 'financeiro@clienteexemplo.com.br',
            telefone: telefone || '(11) 99999-9999',
            status: 'ATIVO'
          }
        }
      });

    } catch (err) {
      return sendJson(res, 400, {
        error: err.message || 'Erro ao processar requisição'
      });
    }
  }

  // -------------------------
  // Fallback
  // -------------------------
  return sendJson(res, 404, { error: 'Rota não encontrada' });
});

// =========================
// Start
// =========================
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
