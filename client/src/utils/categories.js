// Single source of truth for categories and their icons.
export const CATEGORIES = [
  { name: 'General', icon: '📌' },
  { name: 'Food', icon: '🍔' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills', icon: '🧾' },
  { name: 'Salary', icon: '💼' },
  { name: 'Transfer', icon: '🔁' },
  { name: 'Other', icon: '📦' }
];

export const iconFor = (category) =>
  (CATEGORIES.find((c) => c.name === category) || { icon: '📌' }).icon;
