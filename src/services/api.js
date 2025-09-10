// src/services/api.js
import { BASE_URL } from "../config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(msg);
    try {
      err.status = res.status;
    } catch {}
    throw err;
  }
  return data;
}

// GET com querystring
export const apiGet = (path, params = {}) => {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return api(`${path}${qs ? `?${qs}` : ""}`);
};

// pega o user_id salvo pelo login
export async function getUserId() {
  const raw = await AsyncStorage.getItem("@user");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj?.user?.id || obj?.id || null;
  } catch {
    return null;
  }
}

// Serviços específicos do Estacionamento (se quiser usar via import)
export const estacionamentos = {
  async getByPlaca(placa) {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Usuário não identificado.");
    const p = String(placa)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return apiGet(`/api/estacionamento/por-placa`, { placa: p, user_id });
  },

  async getAbertos() {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Usuário não identificado.");
    return apiGet(`/api/estacionamento/abertos`, { user_id });
  },

  async fechar(idTicket, { forma_pagamento, convenio_id } = {}) {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Usuário não identificado.");
    return api(`/api/estacionamento/${idTicket}/saida`, {
      method: "PATCH",
      body: {
        user_id,
        forma_pagamento,
        ...(convenio_id ? { convenio_id } : {}),
      },
    });
  },
};
