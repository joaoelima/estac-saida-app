// src/services/api.js
import { BASE_URL } from "../config/env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

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
    const err = new Error(msg);
    // anexa status quando possível
    try {
      err.status = res.status;
    } catch {}
    throw err;
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

async function getUserIdInternal() {
  try {
    const sid = await SecureStore.getItemAsync("user_id");
    if (sid) return sid;
  } catch {}
  try {
    const raw = await AsyncStorage.getItem("@user");
    if (raw) {
      const u = JSON.parse(raw);
      return u?.user?.id || u?.id || null;
    }
  } catch {}
  return null;
}

// Serviços específicos do Estacionamento
export const estacionamentos = {
  async getByPlaca(placa) {
    const user_id = await getUserIdInternal();
    if (!user_id) throw new Error("Usuário não identificado.");
    const p = String(placa)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    return apiGet(`/api/estacionamento/por-placa`, { placa: p, user_id });
  },

  async getAbertos() {
    const user_id = await getUserIdInternal();
    if (!user_id) throw new Error("Usuário não identificado.");
    return apiGet(`/api/estacionamento/abertos`, { user_id });
  },

  async fechar(idTicket, { forma_pagamento, convenio_id } = {}) {
    const user_id = await getUserIdInternal();
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

export { BASE_URL };
