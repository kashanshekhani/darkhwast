// Canonical city + category lists for the citizen pages and the dashboard.
// Mirrors CATEGORIES / CITIES in lib/seed.js on the server: adding a city or
// category means updating both files, nothing else.

export const CITIES = [
  { id: 'karachi', en: 'Karachi', ur: 'کراچی' },
  { id: 'lahore', en: 'Lahore', ur: 'لاہور' },
  { id: 'islamabad', en: 'Islamabad', ur: 'اسلام آباد' },
  { id: 'faisalabad', en: 'Faisalabad', ur: 'فیصل آباد' },
];

export const CATS = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];

export const CAT_LABEL = {
  garbage: 'Garbage & waste', streetlight: 'Streetlight', water: 'Water supply',
  sewage: 'Sewage & drainage', road: 'Road damage', other: 'Other',
};

export const CITY_LABEL = Object.fromEntries(CITIES.map((c) => [c.id, c.en]));
