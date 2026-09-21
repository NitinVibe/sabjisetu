// Talks to the Express + Postgres backend.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const AUTH_TOKEN_KEY = "sabzisetu-admin-token";

async function request(path, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`${options.method || "GET"} ${path} failed (${res.status}): ${text}`);
    err.status = res.status;
    if (res.status === 401) window.dispatchEvent(new Event("sabzisetu-auth-expired"));
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/auth/me"),
  changePassword: (currentPassword, newPassword, confirmPassword) => request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  list: (resource) => request(`/${resource}`),
  create: (resource, body) => request(`/${resource}`, { method: "POST", body: JSON.stringify(body) }),
  update: (resource, id, body) => request(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: "DELETE" }),
  checkPurchaseDelete: (resource, id) => request(`/${resource}/check-delete/${id}`),
  checkStockDelete: (id) => request(`/stock/check-delete/${id}`),
  markAllNotificationsRead: () => request("/notifications/mark-all-read", { method: "PATCH" }),
  getSettings: () => request("/settings"),
  saveSettings: (body) => request("/settings", { method: "PUT", body: JSON.stringify(body) }),
  setWhatsAppSendAll: async (enabled) => {
    const value = enabled === true;
    try { return await request("/settings/whatsapp-send-all", { method: "PUT", body: JSON.stringify({ enabled: value }) }); }
    catch (err) {
      if (String(err?.message || "").includes("(404)")) {
        const current = await request("/settings");
        return await request("/settings", { method: "PUT", body: JSON.stringify({ name: current?.name || "SabziSetu", owner: current?.owner || "Owner", tagline: current?.tagline || "", currency: current?.currency || "₹", whatsappSendAllEnabled: value }) });
      }
      throw err;
    }
  },
  getTrend: () => request("/reports/trend"),
  getSummary: () => request("/reports/summary"),
  getOverview: (from, to) => request(`/reports/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  listPayments: () => request("/payments"),
  createPayment: (body) => request("/payments", { method: "POST", body: JSON.stringify(body) }),
  removePayment: (id) => request(`/payments/${id}`, { method: "DELETE" }),
  logWhatsAppReminder: (body) => request("/whatsapp-bills/reminder-opened", { method: "POST", body: JSON.stringify(body) }),
  logWhatsAppPayment: (body) => request("/whatsapp-bills/payment-recorded", { method: "POST", body: JSON.stringify(body) }),
  health: () => request("/health"),
  getMasters: () => request("/masters"),
  createMaster: (type, body) => request(`/masters/${type}`, { method:"POST", body:JSON.stringify(body) }),
  updateItemMaster: (id, body) => request(`/masters/items/${id}`, { method:"PATCH", body:JSON.stringify(body) }),
  deleteItemMaster: (id) => request(`/masters/items/${id}`, { method:"DELETE" }),
  addItemSpecification: (id, body) => request(`/masters/items/${id}/specifications`, { method:"POST", body:JSON.stringify(body) }),
  removeSpecification: (id) => request(`/masters/specifications/${id}`, { method:"DELETE" }),
};
