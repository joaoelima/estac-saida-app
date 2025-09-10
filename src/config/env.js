// src/env.js
// URL do backend (Render)
export const BASE_URL = "https://lavacar-bot.onrender.com";

// Intervalo (ms) para polling quando necessário
export const POLLING_MS = 10_000;

// Normalizador simples de placa
export function normalizePlate(p) {
  return (p || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
