// App.js — Головний файл React Native Expo додатку
// Встановіть залежності: npx expo install @react-navigation/native @react-navigation/bottom-tabs react-native-safe-area-context react-native-screens

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Modal,
  StatusBar, Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, MOCK_DATA } from './src/constants';
import { useGarageData } from './src/services/useGarageData';
import * as auth from './src/services/auth';

// ─── Допоміжні компоненти ──────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    paid:    { label: 'Оплачено',    bg: COLORS.green + '25', color: COLORS.green },
    overdue: { label: 'Прострочено', bg: COLORS.red   + '25', color: COLORS.red },
    pending: { label: 'До оплати',   bg: COLORS.yellow+ '25', color: COLORS.yellow },
  };
  const s = map[status] || map.pending;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function SyncBar({ syncTime, error }) {
  return (
    <View style={styles.syncBar}>
      <View style={[styles.syncDot, { backgroundColor: error ? COLORS.red : COLORS.green }]} />
      <Text style={styles.syncText}>
        {error
          ? 'Помилка з\'єднання з 1С · Показані кешовані дані'
          : `Синхронізовано з 1С · ${syncTime ? syncTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '—'}`
        }
      </Text>
      <Text style={styles.syncBaf}>BAF ✓</Text>
    </View>
  );
}

// ─── Екран: Головна ────────────────────────────────────────

function HomeScreen({ data, syncTime, error, onRefresh, loading, onNav }) {
  const [payModal, setPayModal] = useState(false);
  const { owner, balance, charges } = data;
  const isDebt = balance.balance < 0;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.steel} />}
    >
      {/* Привітання */}
      <View style={styles.row}>
        <View>
          <Text style={styles.greeting}>Вітаємо,</Text>
          <Text style={styles.ownerName}>{owner.fullName.split(' ').slice(0,2).join(' ')}</Text>
        </View>
        <View style={styles.avatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
      </View>

      {/* Карточка гаражу */}
      <View style={styles.garageCard}>
        <View style={styles.garagePattern}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.garageLine} />
          ))}
        </View>
        <View style={styles.row}>
          <View>
            <Text style={styles.garageLabel}>ГАРАЖ</Text>
            <Text style={styles.garageNumber}>{owner.garageNumber}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text>🔒</Text>
            <Text style={styles.statusPillText}>Зачинено</Text>
          </View>
        </View>
        <Text style={styles.cooperativeName}>{owner.cooperative}</Text>
      </View>

      {/* Баланс */}
      <View style={[styles.balanceCard, { borderColor: isDebt ? COLORS.red + '44' : COLORS.green + '44', backgroundColor: isDebt ? COLORS.red + '12' : COLORS.green + '12' }]}>
        <Text style={styles.balanceLabel}>СТАН РОЗРАХУНКІВ</Text>
        <Text style={[styles.balanceAmount, { color: isDebt ? COLORS.red : COLORS.green }]}>
          {isDebt ? '−' : '+'}{Math.abs(balance.balance).toLocaleString('uk-UA')} ₴
        </Text>
        {isDebt && (
          <View style={styles.row}>
            <View style={styles.debtChip}>
              <Text style={styles.debtChipLabel}>Прострочено</Text>
              <Text style={[styles.debtChipValue, { color: COLORS.red }]}>{balance.debtMonths} міс.</Text>
            </View>
            <View style={styles.debtChip}>
              <Text style={styles.debtChipLabel}>Пеня</Text>
              <Text style={[styles.debtChipValue, { color: COLORS.red }]}>{balance.penalty} ₴</Text>
            </View>
          </View>
        )}
      </View>

      {/* Швидкі дії */}
      <View style={[styles.row, { gap: 10, marginBottom: 20 }]}>
        {[
          { icon: '💳', label: 'Сплатити борг',     action: () => setPayModal(true) },
          { icon: '⚡', label: 'Показники лічильника', action: () => onNav('electricity') },
          { icon: '📞', label: 'Правління',          action: () => {} },
        ].map(a => (
          <TouchableOpacity key={a.label} style={styles.quickAction} onPress={a.action}>
            <Text style={{ fontSize: 22 }}>{a.icon}</Text>
            <Text style={styles.quickActionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Нарахування */}
      <View style={[styles.row, { marginBottom: 12 }]}>
        <Text style={styles.sectionTitle}>Останні нарахування</Text>
        <TouchableOpacity onPress={() => onNav('payments')}>
          <Text style={styles.seeAll}>Всі →</Text>
        </TouchableOpacity>
      </View>
      {charges.map(c => (
        <View key={c.id} style={styles.chargeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chargeName}>{c.name}</Text>
            <Text style={styles.chargeMeta}>{c.period} · до {c.dueDate}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={styles.chargeAmount}>{c.amount} ₴</Text>
            <StatusBadge status={c.status} />
          </View>
        </View>
      ))}

      <SyncBar syncTime={syncTime} error={error} />
      <View style={{ height: 20 }} />

      {/* Модалка оплати */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPayModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Оплата заборгованості</Text>
            {charges.filter(c => c.status === 'overdue').map(c => (
              <View key={c.id} style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>{c.name} ({c.period})</Text>
                <Text style={styles.modalRowAmount}>{c.amount} ₴</Text>
              </View>
            ))}
            <View style={[styles.modalRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
              <Text style={[styles.modalRowLabel, { fontWeight: '700', fontSize: 15 }]}>Разом</Text>
              <Text style={[styles.modalRowAmount, { color: COLORS.red, fontSize: 18 }]}>1 240 ₴</Text>
            </View>
            <View style={[styles.row, { gap: 10, marginVertical: 12 }]}>
              {['Картка', 'IBAN', 'QR-код'].map(m => (
                <TouchableOpacity key={m} style={styles.payMethodBtn}>
                  <Text style={styles.payMethodText}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.payBtn}>
              <Text style={styles.payBtnText}>Перейти до оплати</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// ─── Екран: Платежі ────────────────────────────────────────

function PaymentsScreen({ data }) {
  const [tab, setTab] = useState('charges');
  const { charges, payments } = data;

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.pageTitle}>Платежі</Text>
      <View style={styles.tabs}>
        {[['charges', 'Нарахування'], ['history', 'Історія']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[styles.tab, tab === id && styles.tabActive]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'charges' && charges.map(c => (
        <View key={c.id} style={[styles.card, c.status === 'overdue' && { borderColor: COLORS.red + '55' }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chargeName}>{c.name}</Text>
              <Text style={styles.chargeMeta}>{c.period}</Text>
            </View>
            <StatusBadge status={c.status} />
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.chargeMeta}>Термін: {c.dueDate}</Text>
            <Text style={[styles.chargeAmount, { color: c.status === 'overdue' ? COLORS.red : COLORS.navy, fontSize: 18 }]}>{c.amount} ₴</Text>
          </View>
          {c.status !== 'paid' && (
            <TouchableOpacity style={[styles.payBtn, { marginTop: 12, backgroundColor: c.status === 'overdue' ? COLORS.orange : COLORS.steel }]}>
              <Text style={styles.payBtnText}>Сплатити {c.amount} ₴</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {tab === 'history' && payments.map((p, i) => (
        <View key={p.id} style={[styles.historyRow, i < payments.length - 1 && styles.historyRowBorder]}>
          <View style={styles.historyIcon}><Text style={{ fontSize: 18 }}>✅</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chargeName}>{p.type}</Text>
            <Text style={styles.chargeMeta}>{p.period} · {p.date}</Text>
          </View>
          <Text style={[styles.chargeAmount, { color: COLORS.green }]}>+{p.amount} ₴</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.exportBtn}>
        <View>
          <Text style={styles.exportTitle}>Вивантаження в 1С</Text>
          <Text style={styles.exportSub}>Звіт за червень 2026</Text>
        </View>
        <View style={styles.exportAction}><Text style={{ color: COLORS.white, fontWeight: '700' }}>Експорт</Text></View>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Екран: Лічильник ──────────────────────────────────────

function ElectricityScreen({ data, submitReading }) {
  const e = data.electricity;
  const [reading, setReading] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reading) return;
    setSubmitting(true);
    try {
      await submitReading(reading);
      setSubmitted(true);
    } catch (err) {
      alert('Помилка передачі: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.pageTitle}>Електролічильник</Text>

      <View style={styles.meterCard}>
        <Text style={styles.meterLabel}>ПОТОЧНІ ПОКАЗНИКИ</Text>
        <Text style={styles.meterValue}>{e.currentReading} <Text style={styles.meterUnit}>кВт·год</Text></Text>
        <View style={[styles.row, { gap: 10 }]}>
          {[
            ['Попередній', `${e.previousReading} кВт`, COLORS.gray300],
            ['Спожито',    `${e.consumed} кВт`,        COLORS.orange],
            ['Сума',       `${e.amount} ₴`,             COLORS.green],
          ].map(([l, v, c]) => (
            <View key={l} style={styles.meterChip}>
              <Text style={styles.meterChipLabel}>{l}</Text>
              <Text style={[styles.meterChipValue, { color: c }]}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Передати показники</Text>
        <Text style={[styles.chargeMeta, { marginBottom: 12 }]}>Передайте показники до 5 числа кожного місяця</Text>
        {!submitted ? (
          <>
            <TextInput
              value={reading}
              onChangeText={setReading}
              placeholder="Введіть показники (кВт·год)"
              keyboardType="numeric"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: reading ? COLORS.steel : COLORS.gray100 }]}
              onPress={handleSubmit}
              disabled={!reading || submitting}
            >
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={[styles.payBtnText, { color: reading ? COLORS.white : COLORS.gray300 }]}>Надіслати показники</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successBox}>
            <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>✅</Text>
            <Text style={styles.successTitle}>Показники передано!</Text>
            <Text style={styles.successSub}>Дані відправлено до бухгалтерії · Синхронізовано з BAF</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Тариф</Text>
        {[
          ['Ставка (до 250 кВт)', `${e.rate} ₴/кВт·год`],
          ['Дата останнього зняття', e.lastReadDate],
        ].map(([l, v]) => (
          <View key={l} style={[styles.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 }]}>
            <Text style={styles.chargeMeta}>{l}</Text>
            <Text style={styles.chargeName}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Екран: Оголошення ────────────────────────────────────

function NoticesScreen({ data }) {
  const icons = { meeting: '📢', finance: '💰', info: 'ℹ️' };
  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.pageTitle}>Оголошення</Text>
      {data.notices.map(n => (
        <View key={n.id} style={[styles.card, !n.isRead && { borderColor: COLORS.steel + '55' }]}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 22 }}>{icons[n.type]}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.chargeName, !n.isRead && { fontWeight: '700' }]}>{n.title}</Text>
              <Text style={styles.chargeMeta}>{n.date}</Text>
            </View>
            {!n.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.noticeText}>{n.text}</Text>
        </View>
      ))}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Bottom Navigation ────────────────────────────────────

const NAV_ITEMS = [
  { id: 'home',        label: 'Головна',    icon: '🏠' },
  { id: 'payments',    label: 'Платежі',    icon: '💳' },
  { id: 'electricity', label: 'Лічильник',  icon: '⚡' },
  { id: 'notices',     label: 'Сповіщення', icon: '🔔', badge: 2 },
];

// ─── Кореневий компонент ──────────────────────────────────

// ─── Екран входу (телефон → OTP) ──────────────────────────

function LoginScreen({ onLoggedIn }) {
  const [step, setStep]       = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone]     = useState('');
  const [code, setCode]       = useState('');
  const [masked, setMasked]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState(null);

  const sendOtp = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await auth.requestOtp(phone);
      setMasked(r.maskedPhone || phone);
      setStep('code');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await auth.verifyOtp(phone, code);
      onLoggedIn(r.token);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.loginRoot}>
      <View style={styles.loginIcon}><Text style={{ fontSize: 36 }}>🏠</Text></View>
      <Text style={styles.loginTitle}>Мій Гараж</Text>
      <Text style={styles.loginSub}>Особистий кабінет власника</Text>

      <View style={styles.loginCard}>
        {step === 'phone' ? (
          <>
            <Text style={styles.loginLabel}>Номер телефону</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+380 67 123 45 67"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: phone ? COLORS.steel : COLORS.gray100 }]}
              onPress={sendOtp}
              disabled={!phone || busy}
            >
              {busy ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={[styles.payBtnText, { color: phone ? COLORS.white : COLORS.gray300 }]}>Отримати код</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.loginLabel}>Код з SMS надіслано на {masked}</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="• • • •"
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 22 }]}
            />
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: code ? COLORS.orange : COLORS.gray100 }]}
              onPress={verify}
              disabled={!code || busy}
            >
              {busy ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={[styles.payBtnText, { color: code ? COLORS.white : COLORS.gray300 }]}>Увійти</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('phone'); setCode(''); setErr(null); }}>
              <Text style={styles.loginBack}>← Змінити номер</Text>
            </TouchableOpacity>
          </>
        )}
        {err && <Text style={styles.loginError}>{err}</Text>}
      </View>
      <Text style={styles.loginHint}>Вхід за номером, указаним у картці гаража</Text>
    </View>
  );
}

// ─── Автентифікований застосунок ──────────────────────────

function MainApp({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const { data, loading, error, syncTime, refresh, submitReading } = useGarageData(token);

  if (loading && !data) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🏠</Text>
        <Text style={styles.loadingText}>Завантаження даних з 1С...</Text>
        <ActivityIndicator color={COLORS.steel} style={{ marginTop: 12 }} />
      </View>
    );
  }

  const screenProps = { data, syncTime, error, onRefresh: refresh, loading, submitReading, onNav: setActiveTab };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <SafeAreaView style={styles.root} edges={['top']}>

        {/* Хедер */}
        <View style={styles.header}>
          <View style={styles.headerIcon}><Text style={{ fontSize: 18 }}>🏠</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Мій Гараж</Text>
            <Text style={styles.headerSub}>{data?.owner?.cooperative}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Вийти</Text>
          </TouchableOpacity>
        </View>

        {/* Контент */}
        <View style={{ flex: 1 }}>
          {activeTab === 'home'        && <HomeScreen        {...screenProps} />}
          {activeTab === 'payments'    && <PaymentsScreen    {...screenProps} />}
          {activeTab === 'electricity' && <ElectricityScreen {...screenProps} />}
          {activeTab === 'notices'     && <NoticesScreen     {...screenProps} />}
        </View>

        {/* Нижня навігація */}
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          {NAV_ITEMS.map(({ id, label, icon, badge }) => {
            const active = activeTab === id;
            return (
              <TouchableOpacity key={id} style={styles.tabItem} onPress={() => setActiveTab(id)}>
                {badge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>}
                <Text style={{ fontSize: 20, opacity: active ? 1 : 0.4 }}>{icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Кореневий компонент: шлюз авторизації ────────────────

export default function App() {
  const [token, setToken]       = useState(null);
  const [checking, setChecking] = useState(true);

  // Відновити збережену сесію при запуску.
  useEffect(() => {
    auth.getSession()
      .then((s) => { if (s) setToken(s.token); })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => { await auth.logout(); setToken(null); };

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🏠</Text>
        <ActivityIndicator color={COLORS.steel} />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <LoginScreen onLoggedIn={setToken} />
      </SafeAreaProvider>
    );
  }

  return <MainApp token={token} onLogout={handleLogout} />;
}

// ─── Стилі ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: COLORS.navy },
  loadingScreen:   { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  loadingText:     { color: COLORS.gray300, fontSize: 15 },

  header:          { backgroundColor: COLORS.navy, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 14 },
  headerIcon:      { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  headerSub:       { color: COLORS.gray300, fontSize: 11 },
  logoutBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.steel },
  logoutText:      { color: COLORS.steelLight, fontSize: 12, fontWeight: '600' },

  loginRoot:       { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginIcon:       { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loginTitle:      { color: COLORS.white, fontSize: 24, fontWeight: '700' },
  loginSub:        { color: COLORS.gray300, fontSize: 14, marginBottom: 28 },
  loginCard:       { width: '100%', backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  loginLabel:      { fontSize: 13, color: COLORS.gray500, marginBottom: 8 },
  loginBack:       { color: COLORS.steel, fontSize: 13, textAlign: 'center', marginTop: 14 },
  loginError:      { color: COLORS.red, fontSize: 13, marginTop: 12, textAlign: 'center' },
  loginHint:       { color: COLORS.gray500, fontSize: 12, marginTop: 20, textAlign: 'center' },

  screen:          { flex: 1, backgroundColor: COLORS.gray50, padding: 16 },
  pageTitle:       { fontSize: 19, fontWeight: '700', color: COLORS.navy, marginBottom: 16 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  seeAll:          { fontSize: 13, fontWeight: '600', color: COLORS.steel },

  row:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting:        { fontSize: 12, color: COLORS.gray500 },
  ownerName:       { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  avatar:          { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.steel, alignItems: 'center', justifyContent: 'center' },

  garageCard:      { borderRadius: 16, padding: 20, marginBottom: 16, overflow: 'hidden',
                     backgroundColor: COLORS.navyLight,
                     backgroundImage: `linear-gradient(135deg, ${COLORS.navyLight}, ${COLORS.steel})` },
  garagePattern:   { position: 'absolute', right: -10, top: -10, opacity: 0.07, gap: 6 },
  garageLine:      { width: 120, height: 14, backgroundColor: COLORS.white, borderRadius: 2 },
  garageLabel:     { color: COLORS.gray300, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 4 },
  garageNumber:    { color: COLORS.white, fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  cooperativeName: { color: COLORS.steelLight, fontSize: 13, marginTop: 4 },
  statusPill:      { backgroundColor: COLORS.orange, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPillText:  { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  balanceCard:     { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  balanceLabel:    { color: COLORS.gray500, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  balanceAmount:   { fontSize: 30, fontWeight: '700', marginBottom: 10, fontVariant: ['tabular-nums'] },
  debtChip:        { backgroundColor: COLORS.red + '20', borderRadius: 8, padding: 8, alignItems: 'center', flex: 1, marginRight: 8 },
  debtChipLabel:   { fontSize: 11, color: COLORS.gray500, marginBottom: 3 },
  debtChipValue:   { fontSize: 14, fontWeight: '700' },

  quickAction:     { flex: 1, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.gray100, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 6 },
  quickActionLabel:{ fontSize: 11, fontWeight: '600', color: COLORS.gray700, textAlign: 'center', lineHeight: 14 },

  card:            { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.gray100, borderRadius: 14, padding: 16, marginBottom: 10 },
  chargeRow:       { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.gray100, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chargeName:      { fontSize: 14, fontWeight: '600', color: COLORS.navy, marginBottom: 2 },
  chargeMeta:      { fontSize: 12, color: COLORS.gray500 },
  chargeAmount:    { fontSize: 15, fontWeight: '700', color: COLORS.navy },

  badge:           { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:       { fontSize: 11, fontWeight: '700' },

  syncBar:         { backgroundColor: COLORS.navy + '10', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  syncDot:         { width: 8, height: 8, borderRadius: 4 },
  syncText:        { flex: 1, fontSize: 11, color: COLORS.gray500 },
  syncBaf:         { fontSize: 12, fontWeight: '600', color: COLORS.steel },

  tabs:            { flexDirection: 'row', backgroundColor: COLORS.gray100, borderRadius: 10, padding: 4, marginBottom: 16 },
  tab:             { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive:       { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText:         { fontSize: 14, fontWeight: '500', color: COLORS.gray500 },
  tabTextActive:   { fontWeight: '700', color: COLORS.navy },

  historyRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  historyRowBorder:{ borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  historyIcon:     { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.green + '20', alignItems: 'center', justifyContent: 'center' },

  exportBtn:       { backgroundColor: COLORS.navy, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  exportTitle:     { color: COLORS.white, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  exportSub:       { color: COLORS.gray300, fontSize: 11 },
  exportAction:    { backgroundColor: COLORS.orange, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },

  meterCard:       { backgroundColor: COLORS.navy, borderRadius: 16, padding: 20, marginBottom: 16 },
  meterLabel:      { color: COLORS.gray300, fontSize: 12, letterSpacing: 1.5, marginBottom: 6 },
  meterValue:      { color: COLORS.white, fontSize: 40, fontWeight: '700', letterSpacing: 2, marginBottom: 16, fontVariant: ['tabular-nums'] },
  meterUnit:       { fontSize: 16, color: COLORS.gray300 },
  meterChip:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8 },
  meterChipLabel:  { color: COLORS.gray300, fontSize: 10, marginBottom: 3 },
  meterChipValue:  { fontSize: 13, fontWeight: '700' },

  input:           { borderWidth: 1.5, borderColor: COLORS.gray100, borderRadius: 10, padding: 13, fontSize: 16, color: COLORS.navy, marginBottom: 12, fontVariant: ['tabular-nums'] },
  payBtn:          { backgroundColor: COLORS.orange, borderRadius: 12, padding: 15, alignItems: 'center' },
  payBtnText:      { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  successBox:      { backgroundColor: COLORS.green + '15', borderWidth: 1.5, borderColor: COLORS.green + '44', borderRadius: 10, padding: 16 },
  successTitle:    { color: COLORS.green, fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  successSub:      { color: COLORS.gray500, fontSize: 13, textAlign: 'center' },

  noticeText:      { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange },

  tabBar:          { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100, flexDirection: 'row' },
  tabItem:         { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  tabLabel:        { fontSize: 10, fontWeight: '500', color: COLORS.gray300, marginTop: 2 },
  tabLabelActive:  { fontWeight: '700', color: COLORS.steel },
  tabIndicator:    { position: 'absolute', bottom: 0, width: 24, height: 3, borderRadius: 2, backgroundColor: COLORS.steel },
  tabBadge:        { position: 'absolute', top: 4, right: '30%', width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabBadgeText:    { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHandle:     { width: 36, height: 4, backgroundColor: COLORS.gray100, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 16 },
  modalRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  modalRowLabel:   { fontSize: 14, color: COLORS.gray700 },
  modalRowAmount:  { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  payMethodBtn:    { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.gray100, alignItems: 'center' },
  payMethodText:   { fontSize: 13, fontWeight: '600', color: COLORS.navy },
});
