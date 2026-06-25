// src/constants/colors.js
export const COLORS = {
  navy:       '#1A2540',
  navyLight:  '#243352',
  steel:      '#4A6FA5',
  steelLight: '#6B8FC4',
  orange:     '#E8813A',
  orangeLight:'#F0A060',
  gray50:     '#F2F4F7',
  gray100:    '#E4E7ED',
  gray300:    '#B0B8C8',
  gray500:    '#6B7A94',
  gray700:    '#3A4558',
  white:      '#FFFFFF',
  green:      '#2ECC8A',
  red:        '#E8503A',
  yellow:     '#F5B946',
};

// src/constants/mockData.js — використовується поки немає реального 1С
export const MOCK_DATA = {
  owner: {
    fullName: 'Ковальчук Олег Михайлович',
    garageNumber: 'А-47',
    cooperative: 'ГСК «Автомобіліст»',
    phone: '+380 67 123 45 67',
    memberSince: '2019',
  },
  balance: {
    balance: -1240,
    debt: 1240,
    debtMonths: 2,
    penalty: 120,
    lastPaymentDate: '2026-05-15',
    nextDueDate: '2026-07-01',
  },
  charges: [
    { id: '1', name: 'Членський внесок', amount: 620, dueDate: '2026-06-01', status: 'overdue', period: 'Травень 2026' },
    { id: '2', name: 'Членський внесок', amount: 620, dueDate: '2026-07-01', status: 'pending', period: 'Червень 2026' },
    { id: '3', name: 'Пеня за прострочення', amount: 120, dueDate: '2026-06-01', status: 'overdue', period: 'Травень 2026' },
  ],
  payments: [
    { id: '1', date: '2026-05-15', amount: 620, type: 'Членський внесок', period: 'Квітень 2026', status: 'paid' },
    { id: '2', date: '2026-04-14', amount: 620, type: 'Членський внесок', period: 'Березень 2026', status: 'paid' },
    { id: '3', date: '2026-03-10', amount: 420, type: 'Електроенергія',   period: 'Лютий 2026',   status: 'paid' },
  ],
  electricity: {
    currentReading:  245.8,
    previousReading: 198.4,
    consumed: 47.4,
    rate: 4.32,
    amount: 204.77,
    lastReadDate: '2026-06-01',
  },
  notices: [
    { id: '1', date: '2026-06-18', title: 'Збори кооперативу', text: 'Загальні збори членів ГСК відбудуться 28.06.2026 о 17:00 в приміщенні правління.', type: 'meeting', isRead: false },
    { id: '2', date: '2026-06-01', title: 'Нарахування за травень', text: 'Нараховано членський внесок 620 ₴ та пеню 120 ₴ за прострочення оплати.', type: 'finance', isRead: false },
    { id: '3', date: '2026-05-15', title: 'Планові роботи', text: '25.05.2026 планується відключення електроенергії для проведення профілактичних робіт.', type: 'info', isRead: true },
  ],
};
