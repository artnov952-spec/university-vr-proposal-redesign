export const LANGUAGES = Object.freeze(['ru', 'uz']);
export const normalizeLanguage = (value, fallback = 'ru') => LANGUAGES.includes(value) ? value : LANGUAGES.includes(fallback) ? fallback : 'ru';

export const COPY = Object.freeze({
  ru: Object.freeze({
    title: 'Панорамная CG-концепция | Учебные пространства',
    spaces: 'УЧЕБНЫЕ ПРОСТРАНСТВА',
    overview: 'Панорамный обзор',
    concept: 'CG-концепция',
    onePoint: 'Одна точка наблюдения',
    viewport: 'Панорамная CG-концепция',
    canvasHint: 'Обзор панорамы: перетащите изображение или используйте стрелки',
    hotspots: 'Точки перехода',
    preparing: 'Подготовка панорамы...',
    retry: 'Повторить загрузку',
    viewHelp: 'Перетащите для осмотра. Стрелки: обзор, + и −: масштаб.',
    controls: 'Управление панорамой',
    panoramaQuality: 'Панорама показывает увеличенный фрагмент исходника. Приближение не добавляет деталей.',
    zoomOut: 'Уменьшить масштаб',
    zoomIn: 'Увеличить масштаб',
    reset: 'Сбросить вид',
    auto: 'Автообзор',
    fullscreen: 'На весь экран',
    exitFullscreen: 'Выйти из полного экрана',
    waitingImage: 'Изображение ожидается',
    dimensions: '{width} × {height} px',
    gallery: 'Учебные панорамы',
    footer: 'Панорамная CG-концепция · обзор из одной точки',
    preliminary: 'Привязка точек перехода предварительная.',
    teacher: 'ЗОНА ПРЕПОДАВАТЕЛЯ',
    infoTitle: 'Управление занятием',
    closeInfo: 'Закрыть информацию о занятии',
    close: 'Закрыть',
    infoSummary: 'Преподаватель задает учебную задачу, наблюдает за работой и проводит разбор.',
    assignment: 'Назначение',
    assignmentBody: 'Выбрать среду, учебную задачу и критерии наблюдения перед началом занятия.',
    observation: 'Наблюдение',
    observationBody: 'Следить за ходом выполнения и отмечать значимые действия в учебном журнале.',
    review: 'Разбор',
    reviewBody: 'Обсудить результаты, сопоставить действия с критериями и назначить повторную попытку при необходимости.',
    infoNote: 'Это описание учебного процесса. Панорама не подключена к реальному занятию.',
    openModule: 'Показать управление занятием',
    moduleSent: 'Запрос на открытие управления передан основному сайту.',
    moduleStandalone: 'В отдельном просмотре доступна эта информационная панель. Управление занятием открывается из основного сайта.',
    openScene: 'Открыть панораму: {label}',
    noTransitions: 'Обзор из одной точки. Переходы в этой сцене не заданы.',
    calibrated: 'Точка перехода привязана к изображению.',
    announcement: 'Панорамная CG-концепция, обзор из одной точки.',
    webglUnavailable: 'Панорама недоступна: браузер не поддерживает WebGL. Откройте страницу в браузере с поддержкой WebGL.',
    webglLost: 'Панорама остановлена: браузер потерял графический контекст. Обновите страницу, чтобы открыть ее снова.',
    aspectWarning: 'Пропорции исходника отличаются от 2:1. Сферический показ может искажать изображение.',
    textureWarning: 'Исходник больше предела текстуры устройства, при показе он уменьшен.',
    loadingImage: 'Загрузка изображения...',
    loadError: 'Не удалось загрузить {asset}. Изображение пока недоступно.',
    fullscreenError: 'Полноэкранный режим недоступен в этом окне.',
    bootError: 'Не удалось подготовить просмотр панорамы.',
  }),
  uz: Object.freeze({
    title: "Panoramali CG-konsepsiya | O'quv makonlari",
    spaces: "O'QUV MAKONLARI",
    overview: "Panoramali ko'rinish",
    concept: 'CG-konsepsiya',
    onePoint: 'Bitta kuzatuv nuqtasi',
    viewport: 'Panoramali CG-konsepsiya',
    canvasHint: "Panoramani ko'rish: tasvirni sudrang yoki yo'nalish tugmalaridan foydalaning",
    hotspots: "O'tish nuqtalari",
    preparing: 'Panorama tayyorlanmoqda...',
    retry: 'Qayta yuklash',
    viewHelp: "Ko'rish uchun sudrang. Yo'nalish tugmalari: ko'rish, + va −: masshtab.",
    controls: 'Panoramani boshqarish',
    panoramaQuality: "Panorama asl tasvirning kattalashtirilgan qismini ko'rsatadi. Yaqinlashtirish yangi tafsilot qo'shmaydi.",
    zoomOut: 'Kichraytirish',
    zoomIn: 'Kattalashtirish',
    reset: "Ko'rinishni tiklash",
    auto: "Avtomatik ko'rish",
    fullscreen: "To'liq ekran",
    exitFullscreen: "To'liq ekrandan chiqish",
    waitingImage: 'Tasvir kutilmoqda',
    dimensions: '{width} × {height} px',
    gallery: "O'quv panoramalari",
    footer: "Panoramali CG-konsepsiya · bitta nuqtadan ko'rish",
    preliminary: "O'tish nuqtalarining joylashuvi dastlabki.",
    teacher: "O'QITUVCHI HUDUDI",
    infoTitle: "Mashg'ulotni boshqarish",
    closeInfo: "Mashg'ulot haqidagi ma'lumotni yopish",
    close: 'Yopish',
    infoSummary: "O'qituvchi o'quv vazifasini belgilaydi, ish jarayonini kuzatadi va natijalarni tahlil qiladi.",
    assignment: 'Belgilash',
    assignmentBody: "Mashg'ulot boshlanishidan oldin muhit, o'quv vazifasi va kuzatuv mezonlarini tanlash.",
    observation: 'Kuzatish',
    observationBody: "Bajarish jarayonini kuzatish va muhim harakatlarni o'quv jurnaliga qayd etish.",
    review: 'Tahlil',
    reviewBody: "Natijalarni muhokama qilish, harakatlarni mezonlar bilan solishtirish va zarur bo'lsa qayta urinishni belgilash.",
    infoNote: "Bu o'quv jarayonining tavsifi. Panorama haqiqiy mashg'ulotga ulanmagan.",
    openModule: "Mashg'ulot boshqaruvini ko'rsatish",
    moduleSent: "Boshqaruvni ochish so'rovi asosiy saytga yuborildi.",
    moduleStandalone: "Alohida ko'rish rejimida ushbu ma'lumot paneli mavjud. Mashg'ulot boshqaruvi asosiy saytdan ochiladi.",
    openScene: 'Panoramani ochish: {label}',
    noTransitions: "Bitta nuqtadan ko'rish. Bu sahnada o'tishlar belgilanmagan.",
    calibrated: "O'tish nuqtasi tasvirga bog'langan.",
    announcement: "Panoramali CG-konsepsiya, bitta nuqtadan ko'rish.",
    webglUnavailable: "Panorama mavjud emas: brauzer WebGL'ni qo'llab-quvvatlamaydi. Sahifani WebGL mavjud brauzerda oching.",
    webglLost: "Panorama to'xtadi: brauzer grafik kontekstni yo'qotdi. Qayta ochish uchun sahifani yangilang.",
    aspectWarning: "Asl tasvir nisbati 2:1 dan farq qiladi. Sferik ko'rinish tasvirni buzishi mumkin.",
    textureWarning: "Asl tasvir qurilmaning tekstura chegarasidan katta, ko'rsatishda kichraytirildi.",
    loadingImage: 'Tasvir yuklanmoqda...',
    loadError: '{asset} yuklanmadi. Tasvir hozircha mavjud emas.',
    fullscreenError: "Bu oynada to'liq ekran rejimi mavjud emas.",
    bootError: "Panoramani ko'rish rejimini tayyorlab bo'lmadi.",
  }),
});

const SCENE_COPY = {
  ru: {
    courtyard: { label: 'Махалля', hotspots: { 'courtyard-door': { label: 'Перейти в подъезд' } } },
    entrance: { label: 'Подъезд', hotspots: { 'entrance-exit': { label: 'Перейти во двор' } } },
    traffic: { label: 'Перекресток' }, market: { label: 'Базар' },
    classroom: { label: 'Учебный класс', hotspots: { 'teaching-area': { label: 'Зона преподавателя',
      description: 'Назначение занятия, наблюдение за выполнением и разбор результатов.' } } },
  },
  uz: {
    courtyard: { label: 'Mahalla', hotspots: { 'courtyard-door': { label: "Kirish yo'lagiga o'tish" } } },
    entrance: { label: "Kirish yo'lagi", hotspots: { 'entrance-exit': { label: "Hovliga o'tish" } } },
    traffic: { label: 'Chorraha' }, market: { label: 'Bozor' },
    classroom: { label: "O'quv xonasi", hotspots: { 'teaching-area': { label: "O'qituvchi hududi",
      description: "Mashg'ulotni belgilash, bajarish jarayonini kuzatish va natijalarni tahlil qilish." } } },
  },
};

export function translate(language, key, values = {}) {
  const copy = COPY[normalizeLanguage(language)];
  if (!Object.hasOwn(copy, key)) throw new RangeError(`Unknown panorama translation: ${key}`);
  return copy[key].replace(/\{(\w+)\}/g, (_, name) => Object.hasOwn(values, name) ? String(values[name]) : `{${name}}`);
}

export function localizeScene(scene, language) {
  const copy = SCENE_COPY[normalizeLanguage(language)][scene.id];
  return { ...scene, label: copy.label, hotspots: scene.hotspots.map(anchor => ({ ...anchor,
    ...copy.hotspots?.[anchor.id], ...(anchor.info ? { info: { ...anchor.info } } : {}) })) };
}

export function applyViewerLanguage(document, language) {
  const selected = normalizeLanguage(language);
  document.documentElement.lang = selected;
  for (const [marker, attribute] of [['data-i18n', null], ['data-i18n-aria-label', 'aria-label']]) {
    for (const element of document.querySelectorAll(`[${marker}]`)) {
      const text = translate(selected, element.getAttribute(marker));
      if (attribute) element.setAttribute(attribute, text); else element.textContent = text;
    }
  }
  document.documentElement.classList.remove('is-localizing');
  return selected;
}
