const { classifySegment, onlyDigits, isCnpj } = require('../domain/classify');

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(date, delta) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

// Retorna os últimos N meses fechados (ex.: Out/Nov/Dez) a partir da data atual.
function lastClosedMonths(now, n) {
  const firstOfThisMonth = startOfMonth(now);
  const months = [];
  for (let i = n; i >= 1; i--) {
    const m = addMonths(firstOfThisMonth, -i);
    months.push(toMonthKey(m));
  }
  return months;
}

// Mês atual (competência) e intervalo MTD (do dia 1 até hoje)
function currentMonthInfo(now) {
  return {
    monthKey: toMonthKey(now),
    start: startOfMonth(now),
    end: new Date(now) // até agora
  };
}

// Mock: eventos de venda normalizados
// - canal: PDV ou PEDIDO
// - documento: CPF/CNPJ (ou vazio no PDV)
// - valor: valor da venda
// - data: data da venda
function mockSalesEvents(now) {
  // Observação: usamos datas relativas para o mock se comportar bem sempre
  const d = new Date(now);

  // Helpers: cria datas "d dias atrás"
  const daysAgo = (n) => new Date(d.getTime() - n * 24 * 60 * 60 * 1000);

  return [
    // Cliente B2B (CNPJ) - compra via PEDIDO e também PDV
    { canal: 'PEDIDO', documento: '12.345.678/0001-90', valor: 8200.00, data: daysAgo(75) },
    { canal: 'PEDIDO', documento: '12.345.678/0001-90', valor: 4100.50, data: daysAgo(45) },
    { canal: 'PDV',    documento: '12.345.678/0001-90', valor: 840.00,  data: daysAgo(3) },

    // Cliente B2C (CPF) - PDV
    { canal: 'PDV', documento: '123.456.789-09', valor: 320.00, data: daysAgo(70) },
    { canal: 'PDV', documento: '123.456.789-09', valor: 510.00, data: daysAgo(35) },
    { canal: 'PDV', documento: '123.456.789-09', valor: 110.00, data: daysAgo(10) },

    // Cliente B2B (CNPJ) - inativo (última compra há > 30 dias)
    { canal: 'PEDIDO', documento: '98.765.432/0001-11', valor: 5600.00, data: daysAgo(120) },
    { canal: 'PEDIDO', documento: '98.765.432/0001-11', valor: 2100.00, data: daysAgo(65) },

    // PDV sem identificação (venda balcão) => B2C (sem doc)
    { canal: 'PDV', documento: '', valor: 89.90, data: daysAgo(20) },
    { canal: 'PDV', documento: '', valor: 59.90, data: daysAgo(5) }
  ];
}

// Mock: cadastro mínimo de clientes para enriquecer o relatório.
// Na vida real isso virá do Omie (cadastro) + consolidação.
function mockClientDirectory() {
  return {
    [onlyDigits('12.345.678/0001-90')]: {
      nome: 'Cliente Exemplo LTDA',
      email: 'financeiro@clienteexemplo.com.br',
      telefone: '(11) 99999-9999'
    },
    [onlyDigits('123.456.789-09')]: {
      nome: 'Consumidor Final (CPF)',
      email: '',
      telefone: ''
    },
    [onlyDigits('98.765.432/0001-11')]: {
      nome: 'Cliente Inativo SA',
      email: 'contato@inativo.com.br',
      telefone: '(11) 90000-0000'
    },
    // documento vazio (PDV balcão)
    ['']: {
      nome: 'Balcão (sem identificação)',
      email: '',
      telefone: ''
    }
  };
}

function normalizeDoc(doc) {
  return onlyDigits(doc || '');
}

function filterByCanal(event, canal) {
  if (!canal || canal === 'AMBOS') return true;
  return event.canal === canal;
}

function filterBySegmento(event, segmento) {
  if (!segmento || segmento === 'AMBOS') return true;
  const seg = classifySegment(event.documento);
  return seg === segmento;
}

// Agrega por cliente e por mês (3 meses fechados + MTD opcional)
function buildMonthlyEvolution({ now, mesesFechados = 3, incluirMesAtual = true, canal = 'AMBOS', segmento = 'AMBOS', limit = 200 }) {
  const events = mockSalesEvents(now)
    .filter(e => filterByCanal(e, canal))
    .filter(e => filterBySegmento(e, segmento));

  const closedMonths = lastClosedMonths(now, mesesFechados);
  const { monthKey: currentMonthKey, start: mtdStart, end: mtdEnd } = currentMonthInfo(now);

  const directory = mockClientDirectory();

  // Estrutura por cliente
  const byClient = new Map();

  function ensureClient(docNormalized) {
    if (!byClient.has(docNormalized)) {
      const originalDoc = docNormalized; // já normalizado
      const seg = classifySegment(originalDoc);
      const info = directory[docNormalized] || { nome: '', email: '', telefone: '' };

      byClient.set(docNormalized, {
        cliente: {
          documento: docNormalized ? docNormalized : '',
          segmento: seg,
          tipo_documento: docNormalized ? (isCnpj(docNormalized) ? 'CNPJ' : 'CPF') : 'SEM_DOC',
          nome: info.nome || (docNormalized ? 'Cliente (sem cadastro mock)' : 'Balcão (sem identificação)'),
          email: info.email || '',
          telefone: info.telefone || ''
        },
        faturamento_mensal_fechado: closedMonths.map(m => ({ competencia: m, valor: 0 })),
        faturamento_mes_atual: incluirMesAtual ? { competencia: currentMonthKey, valor_ate_hoje: 0, data_referencia: new Date(now).toISOString().slice(0, 10) } : null,
        ultima_compra: null,
        _ultima_compra_ts: 0
      });
    }
    return byClient.get(docNormalized);
  }

  function addToClosedMonths(rec, monthKey, value) {
    const idx = closedMonths.indexOf(monthKey);
    if (idx >= 0) rec.faturamento_mensal_fechado[idx].valor += value;
  }

  // Processa eventos
  for (const ev of events) {
    const docNorm = normalizeDoc(ev.documento);
    const rec = ensureClient(docNorm);

    const evDate = new Date(ev.data);
    const evMonthKey = toMonthKey(evDate);

    // meses fechados
    addToClosedMonths(rec, evMonthKey, ev.valor);

    // MTD
    if (incluirMesAtual) {
      if (evDate >= mtdStart && evDate <= mtdEnd && evMonthKey === currentMonthKey) {
        rec.faturamento_mes_atual.valor_ate_hoje += ev.valor;
      }
    }

    // última compra
    const ts = evDate.getTime();
    if (ts > rec._ultima_compra_ts) {
      rec._ultima_compra_ts = ts;
      rec.ultima_compra = {
        data: evDate.toISOString().slice(0, 10),
        valor: ev.valor,
        canal: ev.canal,
        segmento: classifySegment(ev.documento)
      };
    }
  }

  // calcula tendência com base nos 3 meses fechados (m3 vs m2, m2 vs m1)
  const result = [];
  for (const rec of byClient.values()) {
    const m = rec.faturamento_mensal_fechado.map(x => x.valor);

    // Evita divisão por zero: se mês anterior for 0, variação fica null
    const varPct = (a, b) => {
      if (b === 0) return null;
      return Number((((a - b) / b) * 100).toFixed(2));
    };

    const v_m2_vs_m1 = m.length >= 2 ? varPct(m[m.length - 2], m[m.length - 3]) : null;
    const v_m3_vs_m2 = m.length >= 2 ? varPct(m[m.length - 1], m[m.length - 2]) : null;

    let direcao = 'ESTAVEL';
    if (v_m3_vs_m2 !== null) {
      if (v_m3_vs_m2 > 3) direcao = 'SUBINDO';
      else if (v_m3_vs_m2 < -3) direcao = 'CAINDO';
    }

    // remove campo interno
    delete rec._ultima_compra_ts;

    rec.tendencia = {
      variacao_pct_m3_vs_m2: v_m3_vs_m2,
      variacao_pct_m2_vs_m1: v_m2_vs_m1,
      direcao
    };

    result.push(rec);
  }

  // ordenação padrão: maior faturamento no mês mais recente fechado
  result.sort((a, b) => {
    const aLast = a.faturamento_mensal_fechado[a.faturamento_mensal_fechado.length - 1]?.valor || 0;
    const bLast = b.faturamento_mensal_fechado[b.faturamento_mensal_fechado.length - 1]?.valor || 0;
    return bLast - aLast;
  });

  return result.slice(0, limit);
}

function buildInativos({ now, diasSemCompra = 30, mesesFechados = 3, incluirMesAtual = true, canal = 'AMBOS', segmento = 'AMBOS', limit = 200 }) {
  const portfolio = buildMonthlyEvolution({ now, mesesFechados, incluirMesAtual, canal, segmento, limit: 10000 });

  const cutoff = new Date(now.getTime() - diasSemCompra * 24 * 60 * 60 * 1000);

  const inativos = portfolio.filter(rec => {
    if (!rec.ultima_compra) return true; // nunca comprou (no mock, pode existir)
    const last = new Date(rec.ultima_compra.data);
    return last < cutoff;
  });

  // ordena pelos mais “antigos” (mais tempo sem comprar)
  inativos.sort((a, b) => {
    const aDt = a.ultima_compra ? new Date(a.ultima_compra.data).getTime() : 0;
    const bDt = b.ultima_compra ? new Date(b.ultima_compra.data).getTime() : 0;
    return aDt - bDt;
  });

  return inativos.slice(0, limit);
}

module.exports = {
  buildMonthlyEvolution,
  buildInativos
};
