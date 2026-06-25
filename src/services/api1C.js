// src/services/api1C.js — Шар підключення до 1С (контракт v2: телефон+OTP, Bearer-токен)
//
// Точні формати запитів/відповідей — у файлі API_1C_CONTRACT.md (корінь garage-app).
// Базовий URL 1С: https://<сервер>/<база>/hs/gsk
//
// Дві фази авторизації:
//   1) POST /auth/request-otp {phone}            — без токена (тех. користувач Basic Auth публікації)
//   2) POST /auth/verify-otp  {phone, code}      — повертає token
//   3) усі інші запити: заголовок Authorization: Bearer <token>

const CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_1C_BASE_URL || 'https://YOUR_1C_SERVER/gsk_base/hs/gsk',
  // Basic Auth технічного користувача публікації (НЕ власник). Опційно, якщо проксі не знімає його сам.
  TECH_USER: process.env.EXPO_PUBLIC_1C_TECH_USER || '',
  TECH_PASS: process.env.EXPO_PUBLIC_1C_TECH_PASS || '',
  TIMEOUT_MS: 10000,
};

function baseHeaders() {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (CONFIG.TECH_USER) {
    headers['Authorization'] = `Basic ${btoa(`${CONFIG.TECH_USER}:${CONFIG.TECH_PASS}`)}`;
  }
  return headers;
}

// Базовий запит. token — Bearer-токен власника (для захищених методів).
async function request(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  const headers = baseHeaders();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok || data.error) {
      const err = new Error(data.message || `Помилка 1С: ${res.status}`);
      err.code = data.code || 'HTTP_' + res.status;
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const e = new Error('Сервер 1С не відповідає. Перевірте мережу.');
      e.code = 'TIMEOUT';
      throw e;
    }
    throw err;
  }
}

// ─── Авторизація ───────────────────────────────────────────

// POST /auth/request-otp → { sent, maskedPhone, expiresIn }
export const requestOtp = (phone) =>
  request('/auth/request-otp', { method: 'POST', body: { phone } });

// POST /auth/verify-otp → { token, garageNumber, fullName }
export const verifyOtp = (phone, code) =>
  request('/auth/verify-otp', { method: 'POST', body: { phone, code } });

// ─── Захищені методи (потрібен token) ──────────────────────

// GET /me → { fullName, garageNumber, cooperative, phone, memberSince }
export const getMe          = (token) => request('/me',          { token });

// GET /balance → { balance, debt, debtMonths, penalty, lastPaymentDate, nextDueDate }
export const getBalance     = (token) => request('/balance',     { token });

// GET /charges → [ { id, name, amount, dueDate, status, period } ]
export const getCharges     = (token) => request('/charges',     { token });

// GET /payments → [ { id, date, amount, type, period, status } ]
export const getPayments    = (token) => request('/payments?limit=20', { token });

// GET /electricity → { currentReading, previousReading, consumed, rate, amount, lastReadDate }
export const getElectricity = (token) => request('/electricity', { token });

// GET /notices → [ { id, date, title, text, type, isRead } ]
export const getNotices     = (token) => request('/notices',     { token });

// POST /electricity/submit → { success, accepted, consumed, message }
export const submitElectricityReading = (token, reading, date) =>
  request('/electricity/submit', { method: 'POST', token, body: { reading: Number(reading), date } });
