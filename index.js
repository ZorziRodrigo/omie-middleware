const http = require('http');

const PORT = process.env.PORT || 3000;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Rota: saúde do serviço
  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  // Rota: auditoria (mock) - buscar cliente
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

      // Resposta simulada (mock). Próximo passo: trocar por consulta real ao Omie.
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
      return sendJson(res, 400, { error: err.message || 'Erro ao ler JSON' });
    }
  }

  // Fallback: rota não existe
  return sendJson(res, 404, { error: 'Rota não encontrada' });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
