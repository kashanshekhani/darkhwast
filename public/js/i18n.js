// Bilingual UI strings. Urdu is the DEFAULT experience (DESIGN.md principle 2);
// English is the toggle. Translated elements carry lang="ur" so Nastaliq
// sizing rules apply automatically.

export const STRINGS = {
  en: {
    lang_name: 'اردو',
    skip: 'Skip to content',
    tagline: 'AI complaint router for local government',
    offline: "You're offline. Keep writing; your complaint is saved on this device and will send when you're back online.",
    loading1: 'Reading your complaint...',
    loading2: 'Finding the responsible office...',
    loading3: 'Drafting your formal complaint...',
    cancel: 'Cancel',
    copy: 'Copy',
    copied: 'Tracking ID copied',
    back_home: 'Back to home',

    // landing
    hero_title: 'Tell us the problem. We\u2019ll take it to the right office.',
    hero_sub: 'Describe any civic issue in your own words. DarKhwast turns it into a formal complaint and emails it to the responsible department. You stay anonymous unless you choose otherwise.',
    trust1: 'No login',
    trust2: 'Anonymous by default',
    trust3: 'Free',
    step1_t: 'Describe it',
    step1_d: 'Type the problem in Urdu or English. Messy is fine.',
    step2_t: 'We draft and route',
    step2_d: 'AI classifies the issue, writes the formal letter and finds the responsible office for your city.',
    step3_t: 'You get a receipt',
    step3_d: 'Your complaint is emailed on your behalf. Track it anytime with your ID.',
    cta_file: 'File a complaint',
    cta_track: 'Track a complaint',
    track_label: 'Tracking ID',
    track_ph: 'DK-2026-...',
    track_go: 'Track',
    track_invalid: 'No complaint found for this ID.',
    cities_line: 'Now serving: Karachi, Lahore, Islamabad, Faisalabad',
    disclaimer: 'DarKhwast drafts, routes and tracks your complaint up to the department. Departments act on their own authority.',

    // intake
    step1: 'Step 1 of 2',
    q_title: "What's the problem?",
    q_helper: 'Write in Urdu or English, however is easy.',
    q_ph: 'e.g. Our street light has been broken for two weeks and the street is completely dark at night.',
    city_label: 'City',
    city_ph: 'Search your city...',
    city_unsupported: 'Another city (not yet supported)',
    unsupported_note: "We're not operating in that city yet. DarKhwast expands city by city; try again soon.",
    area_label: 'Area / neighbourhood',
    area_ph: 'e.g. Gulshan-e-Iqbal Block 5',
    area_helper: 'Optional, but it helps the department find the exact spot.',
    char_left: 'more characters needed',
    submit: 'Draft my complaint',
    submit_disabled: 'Describe the problem and choose your city',
    err_title: 'Please fix the following:',

    // review
    step2: 'Step 2 of 2',
    classified_as: 'Classified as',
    not_right: 'Not right? Change it',
    pick_category: 'Pick the closest category',
    not_sure: "We're not fully sure which category fits. Please pick the closest one.",
    no_route: 'No department could be matched in our knowledge base yet. Your complaint is saved and will be reviewed by an operator.',
    summary_ur: 'Summary',
    your_letter: 'Your formal complaint',
    letter_note: 'This exact letter will be emailed to the department on your behalf.',
    edit_letter: 'Edit letter',
    done_edit: 'Done editing',
    routed_to: 'To be sent to',
    anon_label: 'File anonymously',
    anon_help: 'Your name and contact will not be attached. Departments can often act faster when they can reach you.',
    identify_help: 'Add a phone number or email so the department can reply to you directly.',
    name_l: 'Your name',
    name_ph: 'e.g. Farhan Ahmed',
    phone_l: 'Phone',
    phone_ph: '03xx-xxxxxxx',
    email_l: 'Email',
    email_ph: 'you@example.com',
    send: 'Send my complaint',
    confirm_t: 'Send this complaint?',
    confirm_b: 'It will be emailed to the department below on your behalf.',
    confirm_anon: 'You are sending anonymously. No contact details will be attached.',
    confirm_send: 'Yes, send it',
    updating: 'Updating...',

    // sent
    sent_t: 'Your complaint has been filed',
    your_id: 'Your tracking ID',
    sent_to: 'Sent to',
    at_time: 'at',
    simulated_note: 'Demo mode: on this server the email dispatch is simulated and logged.',
    fail_banner: "We couldn't deliver your email yet. Your complaint is saved under this ID and will be retried. Keep the ID safe.",
    pending: 'Delivery pending',
    next_t: 'What happens next',
    next1: 'The department receives your complaint by email.',
    next2: 'An officer updates its status.',
    next3: 'Check this page anytime with your tracking ID.',
    view_track: 'View tracking page',
    file_another: 'File another complaint',

    // track
    track_title: 'Complaint status',
    last_updated: 'Last updated',
    invalid_title: 'No complaint found',
    invalid_help: 'Check the ID and try again. It looks like DK-2026-XXXXXX.',
    dept_l: 'Department',
    loc_l: 'Location',
    filed_l: 'Filed',
  },

  ur: {
    lang_name: 'English',
    skip: 'مواد پر جائیں',
    tagline: 'مقامی حکومت کے لیے اے آئی شکایت سروس',
    offline: 'انٹرنیٹ بند ہے۔ لکھتے رہیں، آپ کی شکایت اس ڈیوائس پر محفوظ ہے اور انٹرنیٹ آنتے ہی بھیج دی جائے گی۔',
    loading1: 'آپ کی شکایت پڑھی جا رہی ہے...',
    loading2: 'ذمہ دار دفتر تلاش کیا جا رہا ہے...',
    loading3: 'آپ کی رسمی درخواست تیار کی جا رہی ہے...',
    cancel: 'منسوخ کریں',
    copy: 'کاپی',
    copied: 'ٹریکنگ آئی ڈی کاپی ہو گئی',
    back_home: 'واپس مرکزی صفحے پر',

    hero_title: 'مسئلہ بتائیں، درخواست صحیح دفتر تک پہنچائیں گے',
    hero_sub: 'اپنے الفاظ میں کوئی بھی شہری مسئلہ لکھیں۔ دارخواست اسے رسمی شکایت بنا کر ذمہ دار محکمے کو ای میل کر دیتی ہے۔ آپ چاہیں تو گمنام رہ سکتے ہیں۔',
    trust1: 'اکاؤنٹ کی ضرورت نہیں',
    trust2: 'پہلے سے گمنام',
    trust3: 'مفت',
    step1_t: 'مسئلہ بتائیں',
    step1_d: 'اردو یا انگریزی میں مسئلہ لکھیں، کچھ بھی چلے گا۔',
    step2_t: 'ہم درخواست بناتے اور پہنچاتے ہیں',
    step2_d: 'اے آئی مسئلے کی قسم پہچان کر رسمی خط تیار کرتا ہے اور آپ کے شہر کا ذمہ دار دفتر تلاش کرتا ہے۔',
    step3_t: 'آپ کو رسید ملتی ہے',
    step3_d: 'آپ کی شکایت آپ کی طرف سے ای میل کر دی جاتی ہے۔ آئی ڈی سے کسی بھی وقت حال دیکھیں۔',
    cta_file: 'شکایت درج کریں',
    cta_track: 'شکایت کا حال معلوم کریں',
    track_label: 'ٹریکنگ آئی ڈی',
    track_ph: 'DK-2026-...',
    track_go: 'دیکھیں',
    track_invalid: 'اس آئی ڈی کی کوئی شکایت نہیں ملی۔',
    cities_line: 'فی الحال دستیاب: کراچی، لاہور، اسلام آباد، فیصل آباد',
    disclaimer: 'دارخواست آپ کی شکایت محکمے تک تیار کر کے پہنچاتی ہے اور اس کا ریکارڈ رکھتی ہے۔ کارروائی محکمے کی اپنی ذمہ داری ہے۔',

    step1: 'مرحلہ 1 از 2',
    q_title: 'کیا مسئلہ ہے؟',
    q_helper: 'اردو یا انگریزی، جیسا آسان لگے لکھیں۔',
    q_ph: 'مثلاً: ہماری گلی کی اسٹریٹ لائٹ دو ہفتے سے خراب ہے اور رات میں پورا راستہ اندھیرا رہتا ہے۔',
    city_label: 'شہر',
    city_ph: 'اپنا شہر تلاش کریں...',
    city_unsupported: 'کوئی اور شہر (فی الحال دستیاب نہیں)',
    unsupported_note: 'ہم ابھی اس شہر میں نہیں ہیں۔ دارخواست شہر بہ شہر بڑھ رہی ہے، جلد دوبارہ کوشش کریں۔',
    area_label: 'علاقہ / محلہ',
    area_ph: 'مثلاً: گلشن اقبال بلاک 5',
    area_helper: 'اختیاری ہے، مگر محکمے کے لیے درست جگہ ملنا آسان کر دیتا ہے۔',
    char_left: 'حروف اور درکار ہیں',
    submit: 'میری درخواست تیار کریں',
    submit_disabled: 'مسئلہ لکھیں اور شہر منتخب کریں',
    err_title: 'براہ کرم یہ درستیاں کریں:',

    step2: 'مرحلہ 2 از 2',
    classified_as: 'قسم',
    not_right: 'غلط ہے؟ تبدیل کریں',
    pick_category: 'قریب ترین قسم منتخب کریں',
    not_sure: 'ہمیں پوری طرح یقین نہیں کہ کون سی قسم ہے۔ براہ کرم قریب ترین چنیں۔',
    no_route: 'ہمارے علم میں ابھی کوئی محکمہ نہیں ملا۔ آپ کی شکایت محفوظ ہے اور نظر ثانی کے بعد بھیجی جائے گی۔',
    summary_ur: 'خلاصہ',
    your_letter: 'آپ کی رسمی شکایت',
    letter_note: 'یہی خط آپ کی طرف سے محکمے کو ای میل کیا جائے گا۔',
    edit_letter: 'خط میں ترمیم کریں',
    done_edit: 'ترمیم مکمل',
    routed_to: 'بھیجی جائے گی',
    anon_label: 'گمنام شکایت بھیجیں',
    anon_help: 'آپ کا نام اور رابطہ شامل نہیں ہوگا۔ رابطہ ہونے پر محکمے اکثر جلد کارروائی کر پاتے ہیں۔',
    identify_help: 'جواب ملنے کے لیے فون نمبر یا ای میل دیں۔',
    name_l: 'آپ کا نام',
    name_ph: 'مثلاً: فرحان احمد',
    phone_l: 'فون',
    phone_ph: '03xx-xxxxxxx',
    email_l: 'ای میل',
    email_ph: 'you@example.com',
    send: 'میری شکایت بھیجیں',
    confirm_t: 'یہ شکایت بھیجیں؟',
    confirm_b: 'یہ نیچے دیے گئے محکمے کو آپ کی طرف سے ای میل کی جائے گی۔',
    confirm_anon: 'آپ گمنام بھیج رہے ہیں۔ کوئی رابطہ شامل نہیں ہوگا۔',
    confirm_send: 'جی ہاں، بھیجیں',
    updating: 'اپ ڈیٹ ہو رہا ہے...',

    sent_t: 'آپ کی شکایت درج کر دی گئی ہے',
    your_id: 'آپ کی ٹریکنگ آئی ڈی',
    sent_to: 'بھیجی گئی',
    at_time: 'بجے',
    simulated_note: 'ڈیمو موڈ: اس سرور پر ای میل کی بھیجنا نقل کیا جاتا ہے۔',
    fail_banner: 'ابھی ای میل نہیں بھیجی جا سکی۔ آپ کی شکایت اس آئی ڈی کے تحت محفوظ ہے اور دوبارہ کوشش ہوگی۔ آئی ڈی محفوظ رکھیں۔',
    pending: 'بھیجنے کی کوشش جاری ہے',
    next_t: 'آگے کیا ہوگا',
    next1: 'محکمے کو شکایت ای میل سے مل جاتی ہے۔',
    next2: 'افسر اس کی صورتحال اپ ڈیٹ کرتا ہے۔',
    next3: 'کسی بھی وقت آئی ڈی سے یہاں حال دیکھیں۔',
    view_track: 'ٹریکنگ صفحہ دیکھیں',
    file_another: 'ایک اور شکایت درج کریں',

    track_title: 'شکایت کی صورتحال',
    last_updated: 'آخری اپ ڈیٹ',
    invalid_title: 'کوئی شکایت نہیں ملی',
    invalid_help: 'آئی ڈی جانچ کر دوبارہ کوشش کریں۔ یہ DK-2026-XXXXXX جیسی ہوتی ہے۔',
    dept_l: 'محکمہ',
    loc_l: 'مقام',
    filed_l: 'درج شدہ',
  },
};

// shared vocab (both languages, used across pages)
export const VOCAB = {
  categories: {
    en: { garbage: 'Garbage & waste', streetlight: 'Streetlight & electricity', water: 'Water supply', sewage: 'Sewage & drainage', road: 'Road damage', other: 'Other civic issue' },
    ur: { garbage: 'کچرا صفائی', streetlight: 'اسٹریٹ لائٹ و بجلی', water: 'پانی کی فراہمی', sewage: 'گندا پانی و نکاسی', road: 'سڑک کی خرابی', other: 'دیگر شہری مسئلہ' },
  },
  severities: {
    en: { low: 'Low', medium: 'Medium', high: 'High' },
    ur: { low: 'کم', medium: 'درمیانی', high: 'زیادہ' },
  },
  statuses: {
    en: {
      draft: 'Draft', needs_review: 'Needs review', sent: 'Sent', send_failed: 'Send failed',
      acknowledged: 'Acknowledged', in_progress: 'In progress', resolved: 'Resolved', rejected: 'Rejected',
    },
    ur: {
      draft: 'مسودہ', needs_review: 'نظر ثانی درکار', sent: 'بھیج دی گئی', send_failed: 'بھیجنے میں مسئلہ',
      acknowledged: 'موصول ہو گئی', in_progress: 'کارروائی جاری', resolved: 'حل ہو گئی', rejected: 'مسترد',
    },
  },
  cities: {
    en: { karachi: 'Karachi', lahore: 'Lahore', islamabad: 'Islamabad', faisalabad: 'Faisalabad' },
    ur: { karachi: 'کراچی', lahore: 'لاہور', islamabad: 'اسلام آباد', faisalabad: 'فیصل آباد' },
  },
  // tracking stepper vocabulary
  steps: {
    en: { filed: 'Complaint filed', sent: 'Sent to department', acknowledged: 'Acknowledged', in_progress: 'Work in progress', resolved: 'Resolved' },
    ur: { filed: 'شکایت درج ہوئی', sent: 'محکمے کو بھیج دی گئی', acknowledged: 'موصول کر لی گئی', in_progress: 'کارروائی جاری ہے', resolved: 'حل ہو گئی' },
  },
};

let current = null;

export function initLang() {
  const saved = localStorage.getItem('dk_lang');
  setLang(saved || 'ur');
}

export function setLang(lang, rerender = true) {
  current = lang;
  localStorage.setItem('dk_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  if (rerender) applyI18n();
}

export function lang() { return current; }

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = STRINGS[current]?.[el.dataset.i18n];
    if (v !== undefined) { el.textContent = v; el.lang = current; }
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const v = STRINGS[current]?.[el.dataset.i18nPh];
    if (v !== undefined) el.placeholder = v;
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const v = STRINGS[current]?.[el.dataset.i18nAria];
    if (v !== undefined) el.setAttribute('aria-label', v);
  });
}

export function t(key, vars) {
  let s = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export const tv = (dict, key) => VOCAB[dict]?.[current]?.[key] ?? VOCAB[dict]?.en?.[key] ?? key;
