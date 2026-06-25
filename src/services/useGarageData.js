// src/services/useGarageData.js — Завантаження даних кабінету за токеном власника.
import { useState, useEffect, useCallback } from 'react';
import * as api from './api1C';
import { MOCK_DATA } from '../constants';

// Мок-режим: EXPO_PUBLIC_USE_MOCK=false вмикає реальний 1С.
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

// token — Bearer-токен власника (з auth.js). Гараж визначає СЕРВЕР за токеном.
export function useGarageData(token) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [syncTime, setSyncTime] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      setData(MOCK_DATA);
      setSyncTime(new Date());
      setLoading(false);
      return;
    }

    try {
      const [owner, balance, charges, payments, electricity, notices] = await Promise.all([
        api.getMe(token),
        api.getBalance(token),
        api.getCharges(token),
        api.getPayments(token),
        api.getElectricity(token),
        api.getNotices(token),
      ]);
      setData({ owner, balance, charges, payments, electricity, notices });
      setSyncTime(new Date());
    } catch (err) {
      setError(err.message);
      setData((prev) => prev || MOCK_DATA); // fallback на кеш/мок
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const submitReading = async (reading) => {
    const today = new Date().toISOString().slice(0, 10);
    if (USE_MOCK) { await new Promise((r) => setTimeout(r, 600)); return { success: true }; }
    return api.submitElectricityReading(token, reading, today);
  };

  return { data, loading, error, syncTime, refresh: load, submitReading };
}
