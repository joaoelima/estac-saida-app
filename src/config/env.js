// Ajuste ESTA URL para o seu backend (Render/Heroku/etc.)
export const BASE_URL = "https://lavacar-bot.onrender.com";
export const USER_ID = "6889c4a922ac1c1fa33365b4";

// Tempo (ms) entre revalidações simples de status de placa, quando exibindo contagem
export const POLLING_MS = 10_000;

// Normalizador simples de placa
export function normalizePlate(p) {
  return (p || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
