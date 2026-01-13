// src/services/omieClient.js
// Cliente HTTP genérico para falar com a API do Omie via JSON (POST).
// Lê credenciais do Render via process.env.OMIE_APP_KEY / OMIE_APP_SECRET.

const DEFAULT_TIMEOUT_MS = 25000;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

async function omiePost({ url, call, param }) {
  const app_key = requireEnv("OMIE_APP_KEY");
  const app_secret = requireEnv("OMIE_APP_SECRET");

  const payload = {
    call,                 // Nome do método (ex.: "ListarPedidos", etc.)
    app_key,
    app_secret,
    param: Array.isArray(param) ? param : [param],
  };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      const err = new Error(`Omie HTTP ${resp.status}`);
      err.details = data;
      throw err;
    }

    // A API do Omie costuma devolver falhas no próprio JSON também.
    if (data && (data.faultstring || data.faultcode)) {
      const err = new Error(data.faultstring || "Falha Omie");
      err.details = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

module.exports = { omiePost };
