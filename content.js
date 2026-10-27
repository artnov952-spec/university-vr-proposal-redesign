export const scenarios = [
  { id: 'courtyard', title: 'Обход махалли', points: [
    { title: 'Обзор территории', hint: 'Ориентирование в учебной среде', description: 'В демонстрации курсант осматривает доступную территорию и отмечает начало маршрута.' },
    { title: 'Наблюдение за обстановкой', hint: 'Фиксация заметной детали', description: 'В учебной сцене появляется контрольная точка. Зафиксируйте наблюдение или оставьте его для обсуждения.' },
    { title: 'Завершение маршрута', hint: 'Регистрация завершения упражнения', description: 'Маршрут пройден. Отметьте завершение и перейдите к истории действий.' }
  ] },
  { id: 'entrance', title: 'Осмотр подъезда', points: [
    { title: 'Осмотр входной зоны', hint: 'Ориентирование и начало осмотра', description: 'Зафиксируйте начало осмотра общей зоны в учебном журнале.' },
    { title: 'Внимание к деталям', hint: 'Наблюдение за учебной отметкой', description: 'Отметьте деталь, указанную преподавателем в сценарии. Это пример контрольной точки, а не нормативная процедура.' },
    { title: 'Регистрация наблюдений', hint: 'Завершение упражнения', description: 'Сохраните завершение осмотра и откройте последовательность событий.' }
  ] },
  { id: 'traffic', title: 'Дорожная обстановка', points: [
    { title: 'Обзор перекрестка', hint: 'Ориентирование в среде', description: 'Рассмотрите дорожную сцену и отметьте начало наблюдения.' },
    { title: 'Изменение обстановки', hint: 'Фиксация контрольного события', description: 'Зарегистрируйте учебное событие, чтобы преподаватель мог вернуться к этому моменту при разборе.' },
    { title: 'Итог наблюдения', hint: 'Завершение и переход к разбору', description: 'Отметьте завершение упражнения. Выбранные действия появятся в истории попытки.' }
  ] },
  { id: 'market', title: 'Людная общественная зона: базар', points: [
    { title: 'Обзор торгового пространства', hint: 'Ориентирование в людной среде', description: 'Рассмотрите расположение проходов и торговых точек. Зафиксируйте начало учебного наблюдения.' },
    { title: 'Выбор объекта внимания', hint: 'Наблюдение по заданию преподавателя', description: 'Отметьте объект, указанный в учебной задаче. Конкретные условия и методику согласует университет.' },
    { title: 'Регистрация наблюдений', hint: 'Переход к общему разбору', description: 'Зафиксируйте завершение и откройте последовательность наблюдений.' }
  ] }
];
export const moduleGroups = [
  { title: 'Обзор', ids: [1] },
  { title: 'Подготовка занятия', ids: [2, 3, 5, 6, 13] },
  { title: 'Проведение', ids: [8, 7, 9] },
  { title: 'Разбор и результаты', ids: [10, 11, 12] },
  { title: 'Настройки', ids: [14, 15] }
];
export const modules = [
  { id: 1, title: 'Обзор занятий', description: 'Ближайшее занятие, готовность группы и результаты, ожидающие проверки.' },
  { id: 2, title: 'Группы и курсанты', description: 'Состав группы, история подготовки и назначенные упражнения каждого участника.' },
  { id: 3, title: 'Каталог сценариев', description: 'Готовые учебные ситуации: цель, версия, условия и контрольные точки. Добавление и обновление выполняет разработчик.' },
  { id: 5, title: 'Методика и оценивание', description: 'Критерии, веса и влияние действий на результат. Академическую методику утверждает университет.' },
  { id: 6, title: 'Подготовка занятия', description: 'Выбор группы, участника и готового сценария. Инструктаж и проверка готовности перед началом.' },
  { id: 7, title: 'Практика курсанта', description: 'Назначенное задание, учебная среда и последовательность действий участника.' },
  { id: 8, title: 'Проведение занятия', description: 'Наблюдение, пауза, продолжение и комментарии к событиям текущей попытки.' },
  { id: 9, title: 'Экран аудитории', description: 'Задание и события выбранной попытки для группового наблюдения и обсуждения.' },
  { id: 10, title: 'Разбор и результаты', description: 'Выполненные действия, пропуски и комментарии. Проверка расчета и подтверждение результата.' },
  { id: 11, title: 'Аналитика подготовки', description: 'История попыток, повторяющиеся ошибки и динамика группы. Основа для корректировки обучения, а не только итоговый балл.' },
  { id: 12, title: 'Интеграция с E-reyting', description: 'Сопоставление учебных данных, проверка результатов, состав пакета и история обработки. В демонстрации все операции локальные.' },
  { id: 13, title: 'Учебные материалы', description: 'Инструктаж, памятки и материалы для подготовки к упражнению и разбора результатов.' },
  { id: 14, title: 'Настройки интерфейса', description: 'Русский и узбекский языки и параметры локальной демонстрации.' },
  { id: 15, title: 'Администрирование и аудит', description: 'Пользователи, права, состояние компонентов и журнал действий. Техническое управление отделено от подтверждения академической оценки.' }
];
export const roleContent = {
  teacher: { label: 'МЕТОДИКА И УПРАВЛЕНИЕ', title: 'Видеть не только итог,<br>но и ход решения.', tasks: ['Готовит сценарий и критерии', 'Назначает упражнения и наблюдает за практикой', 'Разбирает события и подтверждает результат'], boundary: 'Преподаватель остается ответственным за учебную методику и оценивание.' },
  cadet: { label: 'ПРАКТИКА И ОБРАТНАЯ СВЯЗЬ', title: 'Действовать в среде.<br>Учиться на своей попытке.', tasks: ['Получает назначенные упражнения', 'Проходит ситуацию в VR', 'Видит свой результат и возвращается к практике'], boundary: 'Курсант работает с собственными заданиями и результатами в пределах своих прав.' },
  admin: { label: 'ДОСТУП И РАБОТОСПОСОБНОСТЬ', title: 'Поддерживать систему.<br>Не вмешиваться в оценку.', tasks: ['Управляет учетными записями и доступом', 'Контролирует состояние системы', 'Проверяет журнал технических действий'], boundary: 'Администратор не подменяет преподавателя и не подтверждает учебную оценку.' }
};
export const hardwareContent = {
  standalone: { title: 'Программа работает внутри шлема', description: 'Больше свободы движения и меньше оборудования на рабочем месте. Сложность сцены, освещение и количество объектов адаптируются под возможности выбранного устройства.', properties: ['Свобода движения', 'Упрощенное рабочее место', 'Оптимизация графики'] },
  pc: { title: 'Сцену рассчитывает компьютер', description: 'ПК берет на себя обработку более насыщенной среды и света. Режим подключения, безопасная зона движения и обслуживание рабочих мест требуют отдельного проектирования.', properties: ['Более сложная среда', 'Дополнительная инфраструктура', 'Проверка совместимости'] }
};

const moduleUz = {
  1: ["Mashg'ulotlar sharhi", "Navbatdagi mashg'ulot, guruh tayyorligi va tekshirilishi kerak bo'lgan natijalar."],
  2: ['Guruhlar va kursantlar', "Guruh tarkibi, tayyorgarlik tarixi va har bir ishtirokchiga tayinlangan mashqlar."],
  3: ['VR-ssenariylar katalogi', "O'quv maqsadi, shartlari va bajarish variantlari ko'rsatilgan tayyor vaziyatlar kutubxonasi."],
  5: ['Metodika va baholash mezonlari', "Tasdiqlangan metodikaga muvofiq mezonlar va baholash qoidalari. Namoyish akademik me’yorlarni belgilamaydi."],
  6: ["Mashg'ulotga tayyorgarlik", "Guruh, ssenariy, rejim va jihozlarni tanlash. Boshlashdan oldin tayyorlik tekshiruvi va yo'riqnoma."],
  7: ['Kursant amaliyoti', "Tayinlangan vaziyatni o'rganish, muhitni kuzatish va urinish davomida harakatlarni qayd etish."],
  8: ["Mashg'ulotni o'tkazish", "O'qituvchi mashq jarayonini kuzatadi, tanaffus qiladi va o'quv jarayoniga izoh beradi."],
  9: ['Auditoriya ekrani', "Tanlangan urinishni guruhga namoyish etish va harakatlarni birgalikda muhokama qilish."],
  10: ['Tahlil va natijalar', "Hodisalar ketma-ketligi, harakatlar va o'tkazib yuborilgan nuqtalar. Tahlil va o'quv natijasini tasdiqlash."],
  11: ['Tayyorgarlik tahlili', "Urinishlar tarixi, takrorlanadigan xatolar va guruh dinamikasi. Keyingi tayyorgarlik uchun asos."],
  12: ['E-reyting bilan integratsiya', "O'quv ma’lumotlarini moslashtirish, natijalarni tekshirish, paket tarkibi va qayta ishlash tarixi."],
  13: ["O'quv materiallari", "Mashqlarga bog'langan yo'riqnoma, eslatma va metodik materiallar."],
  14: ['Interfeys sozlamalari', "Rus va o'zbek tillari hamda mahalliy namoyish parametrlari."],
  15: ['Boshqaruv va audit', "Foydalanuvchilar, huquqlar, komponentlar holati va harakatlar jurnali. Texnik boshqaruv baholashdan ajratilgan."]
};
modules.forEach(item => { [item.uzTitle, item.uzDescription] = moduleUz[item.id]; });
const scenarioUz = {
  courtyard: ['Mahallani kuzatish', "Hududni kuzatish va kuzatuvlarni ketma-ket qayd etish.", [
    ['Hududni kuzatish', "O'quv hududi chegaralarini va asosiy harakat yo'nalishlarini aniqlang."],
    ['Vaziyatni kuzatish', "Topshiriqdagi obyektni tanlang va kuzatuvni jurnalga qayd eting."],
    ["Yo'nalishni yakunlash", "Qaydlar to'liqligini tekshiring va urinishni tahlilga topshiring."]]],
  entrance: ["Kirish yo'lagini kuzatish", "Turar joyning umumiy hududini ketma-ket kuzatish.", [
    ['Kirish hududini kuzatish', "Kirish, zinapoya va kuzatish yo'nalishlarini belgilang."],
    ['Tafsilotlarga e’tibor', "Topshiriqdagi tafsilotni qayd eting. Bu o'quv misoli, me’yoriy tartib emas."],
    ['Kuzatuvlarni qayd etish', "Kuzatuvlarni nazorat nuqtalari bilan solishtiring va urinishni yakunlang."]]],
  traffic: ["Yo'l harakati vaziyati", "Chorrahani kuzatish va vaziyatdagi o'zgarishlarni qayd etish.", [
    ['Chorrahani kuzatish', "Piyodalar o'tish joyi, trotuarlar va harakat yo'laklarini aniqlang."],
    ['Vaziyatning o‘zgarishi', "O'qituvchi belgilagan hodisani va kuzatuvlar ketma-ketligini qayd eting."],
    ['Kuzatuv yakuni', 'Kuzatuvni yakunlang va hodisalar jurnalini tekshiring.']]],
  market: ['Gavjum jamoat hududi: bozor', "Savdo hududidagi harakat yo'nalishlari va diqqat obyektlarini kuzatish.", [
    ['Savdo hududini kuzatish', "Asosiy o'tish yo'llari, savdo rastalari va kuzatish nuqtalarini aniqlang."],
    ['Diqqat obyektini tanlash', "Topshiriqdagi obyektni tanlang va uning joylashuvini qayd eting."],
    ['Kuzatuvlarni qayd etish', "Qaydlarni tekshiring va kuzatuvlarni muhokamaga tayyorlang."]]]
};
scenarios.forEach(item => {
  const [title, summary, points] = scenarioUz[item.id];
  item.uzTitle = title; item.uzSummary = summary;
  item.summary = {courtyard:'Наблюдение за территорией и последовательная регистрация наблюдений.', entrance:'Последовательный осмотр общей зоны жилого дома.', traffic:'Обзор перекрестка и фиксация изменений обстановки.', market:'Наблюдение за торговым пространством и объектами внимания.'}[item.id];
  item.points.forEach((point, index) => { [point.uzTitle, point.uzDescription] = points[index]; point.uzHint = points[index][0]; });
});
