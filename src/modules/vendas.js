// src/modules/vendas.js
const { omiePost } = require("../services/omieClient");

// Endpoints (módulos) do Omie usados em vendas.
// Você confirma os métodos (call) e parâmetros finais na documentação do serviço.
const OMIE_URL_PEDIDO_VENDA = "https://app.omie.com.br/api/v1/produtos/pedidovenda/";
const OMIE_URL_CUPOM_FISCAL = "https://app.omie.com.br/api/v1/produtos/cupomfiscal/";

// Helpers simples de data/mês
function yyyyMm(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

// Aqui é onde você vai “fechar” a regra B2B/B2C:
// - B2B: venda com CNPJ informado
// - B2C: venda com CPF ou sem doc
function inferSegmento({ cnpjCpf }) {
  if (!cnpjCpf) return "B2C";
  const digits = String(cnpjCpf).replace(/\D/g, "");
  if (digits.length === 14) return "B2B";
  return "B2C";
}

async function evolucaoMensalClientes({ meses_fechados = 3, incluir_mes_atual = true, canal = "AMBOS", segmento = "B2B" }) {
  // Meses fechados: ex. últimos 3 meses fechados + (opcional) mês atual parcial
  const now = new Date();
  const months = [];
  for (let i = meses_fechados; i >= 1; i--) {
    months.push(yyyyMm(addMonths(now, -i)));
  }
  if (incluir_mes_atual) months.push(yyyyMm(now));

  // 1) Tenta buscar no Omie (aqui você vai ajustar os "call" e "param" ao método exato).
  // 2) Se der erro (call incorreto, permissão, etc.), devolve mock coerente.
  try {
    // EXEMPLO: ajuste o "call" para o método real que você escolher na doc do Omie.
    // A forma exata do filtro depende do método selecionado no Omie.
    const pedidos = await omiePost({
      url: OMIE_URL_PEDIDO_VENDA,
      call: "ListarPedidos", // <- AJUSTAR conforme documentação do serviço
      param: {
        // <- AJUSTAR conforme documentação do serviço
        pagina: 1,
        registros_por_pagina: 50,
      },
    });

    // TODO: transformar "pedidos" em uma lista por cliente e somar por mês.
    // A estrutura do retorno varia por método. Por isso deixo o parse aqui para a próxima iteração.

    return {
      fonte: "omie",
      filtros: { meses_fechados, incluir_mes_atual, canal, segmento },
      meses: months,
      observacao: "Integração Omie ativa; falta mapear o retorno do método escolhido para agregar por cliente/mês.",
      bruto: pedidos,
    };
  } catch (err) {
    return {
      fonte: "mock",
      filtros: { meses_fechados, incluir_mes_atual, canal, segmento },
      meses: months,
      clientes: [
        {
          codigo: "CLI-0001",
          nome: "Cliente Exemplo LTDA",
          segmento_inferido: inferSegmento({ cnpjCpf: "12.345.678/0001-90" }),
          evolucao: months.map((m, idx) => ({ mes: m, faturamento: (idx + 1) * 1000 })),
          ultimo_pedido: { data: "2026-01-10", valor: 1450.0 },
          faturamento_mes_atual_ate_hoje: incluir_mes_atual ? 650.0 : 0,
        },
      ],
      erro_omie: {
        message: err.message,
        details: err.details || null,
      },
    };
  }
}

async function clientesInativos({ dias = 30, canal = "AMBOS", segmento = "B2B" }) {
  // Regra: “inativo” = não comprou nos últimos X dias
  // Aqui, mesma estratégia: tenta Omie, senão mock.

  try {
    // Ajuste "call" e "param" para método real (ex: listagem + filtro por período)
    const cupons = await omiePost({
      url: OMIE_URL_CUPOM_FISCAL,
      call: "ListarCupons", // <- AJUSTAR conforme documentação do serviço
      param: { pagina: 1, registros_por_pagina: 50 },
    });

    return {
      fonte: "omie",
      filtros: { dias, canal, segmento },
      observacao: "Integração Omie ativa; falta mapear o retorno do método escolhido para detectar última compra por cliente.",
      bruto: cupons,
    };
  } catch (err) {
    return {
      fonte: "mock",
      filtros: { dias, canal, segmento },
      clientes_inativos: [
        {
          codigo: "CLI-0099",
          nome: "Supermercado Exemplo",
          segmento_inferido: "B2B",
          dias_sem_comprar: dias + 5,
          ultima_compra: { data: "2025-12-01", valor: 980.0 },
        },
      ],
      erro_omie: {
        message: err.message,
        details: err.details || null,
      },
    };
  }
}

module.exports = { evolucaoMensalClientes, clientesInativos };
