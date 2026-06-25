// src/services/auth.js — Авторизація власника (телефон + OTP) і зберігання токена.
// Залежність: @react-native-async-storage/async-storage
//   npx expo install @react-native-async-storage/async-storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api1C';

const KEY_TOKEN   = 'gsk.token';
const KEY_GARAGE  = 'gsk.garageNumber';
const KEY_NAME    = 'gsk.fullName';

// Чи увімкнено мок-режим (без реального 1С).
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

// Надіслати OTP на телефон. Повертає { maskedPhone, expiresIn }.
export async function requestOtp(phone) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { sent: true, maskedPhone: '+380•• ••• 45 67', expiresIn: 300 };
  }
  return api.requestOtp(phone);
}

// Підтвердити код. Зберігає токен у сховищі. Повертає { token, garageNumber, fullName }.
export async function verifyOtp(phone, code) {
  let result;
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    if (code !== '1234') {
      const e = new Error('Невірний код (у демо-режимі очікується 1234)');
      e.code = 'OTP_INVALID';
      throw e;
    }
    result = { token: 'mock-token', garageNumber: 'А-47', fullName: 'Ковальчук Олег Михайлович' };
  } else {
    result = await api.verifyOtp(phone, code);
  }
  await AsyncStorage.multiSet([
    [KEY_TOKEN, result.token],
    [KEY_GARAGE, result.garageNumber || ''],
    [KEY_NAME, result.fullName || ''],
  ]);
  return result;
}

// Прочитати збережену сесію (після перезапуску застосунку). Повертає { token } або null.
export async function getSession() {
  const token = await AsyncStorage.getItem(KEY_TOKEN);
  if (!token) return null;
  const [garageNumber, fullName] = await AsyncStorage.multiGet([KEY_GARAGE, KEY_NAME])
    .then((pairs) => pairs.map(([, v]) => v));
  return { token, garageNumber, fullName };
}

// Вийти: стерти токен.
export async function logout() {
  await AsyncStorage.multiRemove([KEY_TOKEN, KEY_GARAGE, KEY_NAME]);
}
