export const BASE_URL = "https://lavacar-bot.onrender.com";

export async function api(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = "Erro de rede";
    try {
      const data = await res.json();
      msg = data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}
