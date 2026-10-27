const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const INTERNATIONAL_EXAMPLES = [
  { code:'UK', country:['Великобритания','Buyuk Britaniya'], organization:'Dyfed-Powys Police', status:['Практика / 2025','Amaliyot / 2025'],
    description:['VR и видео 360° применяют в начальной подготовке полицейских.','VR va 360° video politsiyachilarning boshlang‘ich tayyorgarligida ishlatiladi.'],
    benefit:['Можно показать ситуации, которые сложно воссоздать в обычном классе.','Oddiy xonada yaratish qiyin bo‘lgan vaziyatlarni ko‘rsatish mumkin.'],
    url:'https://www.dyfed-powys.police.uk/foi-ai/dyfed-powys-police/disclosure-2025/november/virtual-realitymixed-reality-10512025/' },
  { code:'US', country:['США','AQSh'], organization:'DOJ / 16.054', status:['Федеральная программа','Federal dastur'],
    description:['Программа поддерживает сценарное VR-обучение общению с людьми в кризисе.','Dastur inqirozdagi odamlar bilan muloqot bo‘yicha vaziyatli VR-ta’limni qo‘llab-quvvatlaydi.'],
    benefit:['Цель: отрабатывать спокойное разрешение конфликтов.','Maqsad: nizolarni xotirjam hal qilishni mashq qilish.'],
    url:'https://fpi.omb.gov/program/16.054.html' },
  { code:'DE', country:['Германия','Germaniya'], organization:'HöMS / Hessen', status:['Учебный тренажер / 2025','O‘quv trenajyori / 2025'],
    description:['VR-тренажер дополняет подготовку полицейских в Гессене.','VR-trenajyor Gessendagi politsiya tayyorgarligini to‘ldiradi.'],
    benefit:['Преподаватель меняет условия и разбирает выполненную попытку.','O‘qituvchi sharoitlarni o‘zgartiradi va bajarilgan urinishni tahlil qiladi.'],
    url:'https://innen.hessen.de/presse/neue-virtual-reality-trainingsanlage-fuer-polizeiliches-situationstraining-an-der-hoems-eroeffnet' },
  { code:'NL', country:['Нидерланды','Niderlandiya'], organization:'Politie / Vrije Universiteit', status:['Исследование SHOTPROS','SHOTPROS tadqiqoti'],
    description:['Полиция и университет исследовали VR как дополнение к действующей подготовке.','Politsiya va universitet VR’ni mavjud tayyorgarlikka qo‘shimcha sifatida o‘rgandi.'],
    benefit:['VR проверяют на задачах полицейской подготовки.','VR politsiya tayyorgarligi vazifalarida tekshiriladi.'],
    url:'https://aiss.nl/project/vr-politie/' },
  { code:'AT', country:['Австрия','Avstriya'], organization:'SIAK / SHOTPROS', status:['Пилотные тренировки / 2022','Sinov mashg‘ulotlari / 2022'],
    description:['Команды отрабатывали принятие решений в сложной обстановке.','Jamoalar murakkab vaziyatda qaror qabul qilishni mashq qildi.'],
    benefit:['Ситуации можно повторять с меньшим числом статистов и реквизита.','Vaziyatlarni kamroq yordamchi aktyor va jihoz bilan takrorlash mumkin.'],
    url:'https://www.bmi.gv.at/magazinfiles/2022/05_06/28_virtuelles_training.pdf' },
  { code:'SG', country:['Сингапур','Singapur'], organization:'Singapore Police Force / MobiC', status:['Мобильный класс / 2025','Mobil sinf / 2025'],
    description:['Мобильный класс доставляет VR-сценарии к месту подготовки полицейских.','Mobil sinf VR-ssenariylarni politsiyachilar tayyorlanadigan joyga olib boradi.'],
    benefit:['Учебные ситуации доступны в мобильном формате.','O‘quv vaziyatlari mobil shaklda mavjud.'],
    url:'https://www.mha.gov.sg/stories/stories-collection/reflections-from-the-home-team-part-1--the-future-firefighter-and-the-tech-amplifier/' }
];

export const INTERNATIONAL_VISUALS = {
  UK: { src:'./assets/international/uk-r5.jpg', headline:['Начальная подготовка в VR','VR’da boshlang‘ich tayyorgarlik'], alt:['Занятие в VR с видом на жилую улицу Великобритании','Buyuk Britaniya turar joy ko‘chasi aks etgan VR-mashg‘ulot'] },
  US: { src:'./assets/international/us-r5.jpg', headline:['Отрабатывать спокойный разговор','Xotirjam muloqotni mashq qilish'], alt:['VR-сценарий спокойного общения с гражданином','Fuqaro bilan xotirjam muloqot qilish VR-ssenariysi'] },
  DE: { src:'./assets/international/de-r5.jpg', headline:['Менять условия. Разбирать действия.','Sharoitni o‘zgartirish. Amallarni tahlil qilish.'], alt:['Преподаватель наблюдает за VR-тренировкой','O‘qituvchi VR-mashqni kuzatmoqda'] },
  NL: { src:'./assets/international/nl-r5.jpg', headline:['Исследовать VR вместе с университетом','VR’ni universitet bilan o‘rganish'], alt:['Исследователи наблюдают за учебной попыткой в VR','Tadqiqotchilar VR’dagi o‘quv urinishini kuzatmoqda'] },
  AT: { src:'./assets/international/at-r5.jpg', headline:['Тренировать решения всей команды','Butun jamoa qarorlarini mashq qilish'], alt:['Совместная VR-тренировка принятия решений','Birgalikda qaror qabul qilish VR-mashqi'] },
  SG: { src:'./assets/international/sg-r5.jpg', headline:['Привезти учебный класс к сотрудникам','O‘quv xonasini xodimlar yoniga olib borish'], alt:['Занятие в мобильном классе с VR-комплектами','VR-to‘plamli mobil xonada mashg‘ulot'] }
};

export function renderInternationalEvidence(language='ru') {
  const index=language==='uz'?1:0, t=(ru,uz)=>index?uz:ru;
  const icon=name=>`<svg class="i" aria-hidden="true"><use href="./assets/ui-icons/sprite.svg#i-${name}"></use></svg>`;
  return `<aside class="international-evidence" id="international-experience" aria-labelledby="international-title" data-language="${language}">
    <div class="international-heading"><div><p class="eyebrow">${t('МЕЖДУНАРОДНЫЙ ОПЫТ','XALQARO TAJRIBA')}</p><h2 id="international-title">${t('VR уже используют<br><span>в подготовке полиции.</span>','VR politsiya tayyorgarligida<br><span>allaqachon qo‘llanmoqda.</span>')}</h2></div><p>${t('Шесть стран. Разные учебные задачи. Практика, программы и исследования с первичными источниками.','Olti mamlakat. Turli o‘quv vazifalari. Amaliyot, dasturlar va tadqiqotlar birlamchi manbalar bilan.')}</p></div>
    <div class="international-stage" aria-roledescription="${t('слайдер','slayder')}">
      ${INTERNATIONAL_EXAMPLES.map((item,position)=>{const visual=INTERNATIONAL_VISUALS[item.code];return `<article class="international-slide" data-evidence-country="${item.code}" id="country-panel-${item.code}" aria-labelledby="country-heading-${item.code}"${position?' hidden':''}><figure class="international-visual"><img src="${visual.src}" width="1672" height="941" alt="${escape(visual.alt[index])}" loading="lazy" decoding="async"><span class="international-visual-code" aria-hidden="true">${item.code}<small>0${position+1} / 06</small></span><figcaption>${t('Тематическая CG-иллюстрация','Mavzuga oid CG-illyustratsiya')}</figcaption></figure><div class="international-story"><div class="international-country"><span>${escape(item.country[index])}</span><small>${escape(item.status[index])}</small></div><h3 id="country-heading-${item.code}">${escape(visual.headline[index])}</h3><p>${escape(item.description[index])}</p><div class="international-benefit">${icon('check-check')}<p>${escape(item.benefit[index])}</p></div><a class="international-source" href="${item.url}" target="_blank" rel="noopener"><span><small>${t('ПЕРВИЧНЫЙ ИСТОЧНИК','BIRLAMCHI MANBA')}</small>${escape(item.organization)}</span>${icon('arrow-up-right')}</a></div></article>`;}).join('')}
    </div>
    <div class="international-controls"><p>${t('Выберите страну','Mamlakatni tanlang')}</p><div><span id="country-slide-count">01 / 06</span><button type="button" data-country-previous aria-label="${t('Предыдущая страна','Oldingi mamlakat')}">${icon('arrow-right')}</button><button type="button" data-country-next aria-label="${t('Следующая страна','Keyingi mamlakat')}">${icon('arrow-right')}</button><button type="button" data-country-play aria-pressed="false">${icon('refresh-cw')}<span>${t('Автопоказ','Avtonamoyish')}</span></button></div></div>
    <div class="international-choices" role="group" aria-label="${t('Страны международного опыта','Xalqaro tajriba mamlakatlari')}">${INTERNATIONAL_EXAMPLES.map((item,position)=>`<button type="button" data-country="${item.code}" aria-controls="country-panel-${item.code}" aria-pressed="${position===0}"><img src="${INTERNATIONAL_VISUALS[item.code].src}" width="1672" height="941" alt="" loading="lazy"><span><small>${item.code}</small><strong>${escape(item.country[index])}</strong></span></button>`).join('')}</div>
    <p id="country-slide-status" class="sr-only" role="status"></p>
    <div class="international-outcomes"><div><span class="eyebrow">${t('ДЛЯ НАШЕГО КОМПЛЕКСА','BIZNING KOMPLEKS UCHUN')}</span><h3>${t('Эффект проверим<br>на учебной группе.','Natijani o‘quv<br>guruhida tekshiramiz.')}</h3></div><div><p>${t('Сравним первую и повторную попытку: сколько действий пропущено, в каком порядке они выполнены и как изменился результат.','Birinchi va takroriy urinishni solishtiramiz: nechta amal o‘tkazildi, ular qaysi tartibda bajarildi va natija qanday o‘zgardi.')}</p><p class="international-research">${t('Единого доказанного процента для всех VR-систем нет. RAND/NIJ отдельно отмечает необходимость проверки переноса навыков в реальную работу.','Barcha VR-tizimlar uchun yagona isbotlangan foiz yo‘q. RAND/NIJ ko‘nikmalarning haqiqiy ishga o‘tishini tekshirish zarurligini alohida ta’kidlaydi.')} <a href="https://ojp.gov/pdffiles1/nij/grants/309395.pdf" target="_blank" rel="noopener">RAND / NIJ, 2024 ${icon('arrow-up-right')}</a></p></div></div>
    <p class="international-note">${t('Иллюстрации передают тему обучения, а не реальные объекты организаций. Примеры не являются партнерами проекта или гарантией его результатов.','Illyustratsiyalar tashkilotlarning haqiqiy obyektlarini emas, ta’lim mavzusini ko‘rsatadi. Misollar loyiha hamkorlari yoki uning natijalari kafolati emas.')}</p>
  </aside>`;
}
