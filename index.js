// index.js (raiz)
const express = require("express");

const { evolucaoMensalClientes, clientesInativos } = require("./src/modules/vendas");

const app = express();
app.use(express.json());

// Root: útil para não ficar “rota não encontrada”
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "omie-middleware",
    message: "Middleware no ar",
    routes: [
      "GET /",
      "GET /health",
      "POST /audit/clientes/buscar",
      "POST /vendas/clientes/evolucao-mensal",
      "POST /vendas/clientes/inativos",
    ],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "omie-middleware" });
});

// Mantém seu endpoint de auditoria de clientes (mock por enquanto)
app.post("/audit/clientes/buscar", (req, res) => {
  const { cnpj_cpf = "", email = "", telefone = "" } = req.body || {};
  res.json({
    audit: {
      modulo: "clientes",
      operacao: "buscar",
      criterios: { cnpj_cpf, email, telefone },
      fonte: "mock",
    },
    resultado: {
      encontrado: true,
      cliente: {
        codigo: "CLI-0001",
        nome: "Cliente Exemplo LTDA",
        cnpj_cpf: cnpj_cpf || "12.345.678/0001-90",
        email: email || "financeiro@clienteexemplo.com.br",
        telefone: telefone || "(11) 99999-9999",
        status: "ATIVO",
      },
    },
  });
});

// Vendas: evolução mensal (3 meses fechados + mês atual)
app.post("/vendas/clientes/evolucao-mensal", async (req, res) => {
  try {
    const body = req.body || {};
    const out = await evolucaoMensalClientes(body);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "Falha interna", message: e.message });
  }
});

// Vendas: clientes inativos
app.post("/vendas/clientes/inativos", async (req, res) => {
  try {
    const body = req.body || {};
    const out = await clientesInativos(body);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: "Falha interna", message: e.message });
  }
});

// Porta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
