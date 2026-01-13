const { readJsonBody, sendJson } = require('../utils/http');

module.exports = function auditClientesRoutes() {
  return [
    {
      method: 'POST',
      path: '/audit/clientes/buscar',
      handler: async (req, res) => {
        const body = await readJsonBody(req);

        const cnpj_cpf = (body.cnpj_cpf || '').toString().trim();
        const email = (body.email || '').toString().trim();
        const telefone = (body.telefone || '').toString().trim();

        if (!cnpj_cpf && !email && !telefone) {
          return sendJson(res, 400, {
            error: 'Informe pelo menos um filtro: cnpj_cpf, email ou telefone'
          });
        }

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
      }
    }
  ];
};
