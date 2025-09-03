// src/services/api.js
export const BASE_URL = "https://lavacar-bot.onrender.com";

export async function api(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Trata JSON e códigos de erro de forma padrão
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

// -------- serviços específicos do Estacionamento --------
const USER_ID = "6889c4a922ac1c1fa33365b4"; // mesmo user_id usado no bot

export const estacionamentos = {
  async getByPlaca(placa) {
    const p = String(placa)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return api(
      `/api/estacionamento/por-placa?placa=${encodeURIComponent(
        p
      )}&user_id=${USER_ID}`
    );
  },

  async getAbertos() {
    return api(`/api/estacionamento/abertos?user_id=${USER_ID}`);
  },

  async fechar(idTicket, { forma_pagamento, convenio_id } = {}) {
    return api(`/api/estacionamento/${idTicket}/saida`, {
      method: "PATCH",
      body: {
        user_id: USER_ID,
        forma_pagamento,
        ...(convenio_id ? { convenio_id } : {}),
      },
    });
  },
};
