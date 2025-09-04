// services/api.js
export const BASE_URL = "https://lavacar-bot.onrender.com";

async function request(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }

  if (!res.ok) {
    const message =
      (json && (json.error || json.message)) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

// Um único objeto `api` – sem duplicar nomes
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path, body) => request(path, { method: "DELETE", body }),
};

export default api;
