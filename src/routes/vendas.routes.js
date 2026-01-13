const { readJsonBody, sendJson } = require('../utils/http');
const { buildMonthlyEvolution, buildInativos } = require('../services/vendasMock.service');

module.exports = function vendasRoutes() {
  return [
    // Evolução mensal por cliente (3 meses fechados + mês atual até hoje)
    {
      method: 'POST',
      path: '/vendas/clientes/evolucao-mensal',
      handler: async (req, res) => {
        const body = await readJsonBody(req);

        const meses_fechados = Number(body.meses_fechados ?? 3);
        const incluir_mes_atual = body.incluir_mes_atual !== false; // padrão true
        const canal = (body.canal || 'AMBOS').toUpperCase(); // PDV | PEDIDO | AMBOS
        const segmento = (body.segmento || 'AMBOS').toUpperCase(); // B2B | B2C | AMBOS
        const limit = Number(body.limit ?? 200);

        // validações mínimas
        if (![1,2,3,4,5,6,12].includes(meses_fechados) && meses_fechados > 0) {
          // não bloqueia; apenas evita valores absurdos
        }

        const now = new Date();

        const data = buildMonthlyEvolution({
          now,
          mesesFechados: meses_fechados,
          incluirMesAtual: incluir_mes_atual,
          canal,
          segmento,
          limit
        });

        return sendJson(res, 200, {
          audit: {
            modulo: 'vendas',
            operacao: 'clientes.evolucao_mensal',
            criterios: { meses_fechados, incluir_mes_atual, canal, segmento, limit },
            fonte: 'mock',
            data_referencia: now.toISOString().slice(0, 10)
          },
          resultado: data
        });
      }
    },

    // Clientes inativos (não comprou nos últimos N dias)
    {
      method: 'POST',
      path: '/vendas/clientes/inativos',
      handler: async (req, res) => {
        const body = await readJsonBody(req);

        const dias_sem_compra = Number(body.dias_sem_compra ?? 30);
        const meses_fechados = Number(body.meses_fechados ?? 3);
        const incluir_mes_atual = body.incluir_mes_atual !== false; // padrão true
        const canal = (body.canal || 'AMBOS').toUpperCase();
        const segmento = (body.segmento || 'AMBOS').toUpperCase();
        const limit = Number(body.limit ?? 200);

        const now = new Date();

        const data = buildInativos({
          now,
          diasSemCompra: dias_sem_compra,
          mesesFechados: meses_fechados,
          incluirMesAtual: incluir_mes_atual,
          canal,
          segmento,
          limit
        });

        return sendJson(res, 200, {
          audit: {
            modulo: 'vendas',
            operacao: 'clientes.inativos',
            criterios: { dias_sem_compra, meses_fechados, incluir_mes_atual, canal, segmento, limit },
            fonte: 'mock',
            data_referencia: now.toISOString().slice(0, 10)
          },
          resultado: data
        });
      }
    }
  ];
};
