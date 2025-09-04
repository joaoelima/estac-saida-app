// src/services/api.js
export const BASE_URL = "https://lavacar-bot.onrender.com";

// chamada genérica
export async function api(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// --- helpers ---
export const apiGet = (path, params = {}) => {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return api(`${path}${qs ? `?${qs}` : ""}`);
};

export const USER_ID = "6889c4a922ac1c1fa33365b4";

// serviços específicos do Estacionamento
export const estacionamentos = {
  async getByPlaca(placa) {
    const p = String(placa)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return apiGet(`/api/estacionamento/por-placa`, {
      placa: p,
      user_id: USER_ID,
    });
  },

  async getAbertos() {
    return apiGet(`/api/estacionamento/abertos`, { user_id: USER_ID });
  },

  async fechar(idTicket, { forma_pagamento, convenio_id } = {}) {
    return api(`/api/estacionamento/${idTicket}/saida`, {
      method: "PATCH",
      body: {
        user_id: USER_ID,
        forma_pagamento,
        ...(convenio_id ? { convenio_id } : {}), // <- spread CORRETO
      },
    });
  },
};
