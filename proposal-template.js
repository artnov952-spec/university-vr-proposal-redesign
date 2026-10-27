import { proposalContent } from './proposal-content.js?v=sales20261027-r7local';
import { PANORAMA_MEDIA } from './panorama/media.js?v=sales20261027-r7local';
import { SCENARIO_FRAMES } from './scenario-visuals.js?v=sales20261027-r7local';
import { scenarioLibrary } from './scenario-library.js?v=sales20261027-r7local';
import { renderClassroomPlan } from './classroom-plan.js?v=sales20261027-r7local';
import { renderTechnicalDetails } from './proposal-technical.js?v=sales20261027-r7local';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const icon = name => `<svg class="i" aria-hidden="true"><use href="./assets/ui-icons/sprite.svg#i-${name}"></use></svg>`;
export const SALES_SECTIONS = ['purpose','experience','environments','benefits','workflow','classroom','next-step'];

export function renderProposal(language) {
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const local = item => escapeHtml(language === 'uz' ? item.uzTitle : item.title);
  const data = proposalContent(language);
  const nav = [t('О системе','Tizim'),t('Попробовать','Sinab ko‘rish'),t('Среды','Muhitlar'),t('Польза','Foyda'),t('Занятие','Mashg‘ulot'),t('Класс','Xona'),t('Пробное занятие','Sinov mashg‘uloti')];
  const heading = (number, label, title, body = '') => `<div class="sales-section-heading"><div><p class="eyebrow">${number} / ${label}</p><h2>${title}</h2></div>${body ? `<p>${body}</p>` : ''}</div>`;
  const heroCase = scenarioLibrary.find(item => item.id === 'entrance-01');
  const heroFrame = SCENARIO_FRAMES[heroCase.id][0];
  const benefits = [
    ['shield-check',t('Сложная ситуация. Без выезда в город.','Murakkab vaziyat. Shaharga chiqmasdan.'),t('Курсант учится замечать опасность и помогать людям в учебной среде.','Kursant o‘quv muhitida xavfni payqash va odamlarga yordam berishni o‘rganadi.')],
    ['history',t('Повторить. И сделать лучше.','Takrorlash. Yaxshiroq bajarish.'),t('Одно упражнение можно пройти снова и сравнить действия в разных попытках.','Bir mashqni qayta bajarish va urinishlardagi harakatlarni solishtirish mumkin.')],
    ['check-check',t('Оценка по действиям, не по впечатлению.','Baho taassurotga emas, harakatlarga.'),t('Общие критерии для группы. Видны пропуски и порядок действий; итог проверяет преподаватель.','Guruh uchun umumiy mezonlar. O‘tkazilgan nuqtalar va tartib ko‘rinadi; yakunni o‘qituvchi tekshiradi.')],
    ['arrow-up-down',t('Результат остается в учебном учете.','Natija o‘quv hisobida qoladi.'),t('В проекте предусмотрена передача подтвержденных результатов в E-reyting.','Loyihada tasdiqlangan natijalarni E-reytingga uzatish ko‘zda tutilgan.')]
  ];
  return `
  <a class="skip-link" href="#purpose">${t('К предложению','Taklifga o‘tish')}</a>
  <header class="header wrap sales-header">
    <div class="header-top">
      <a class="identity" href="#purpose"><img src="./assets/university-logo.webp" width="44" height="44" alt="${t('Эмблема университета','Universitet gerbi')}"><span>${t('Университет общественной безопасности','Jamoat xavfsizligi universiteti')}<small>${t('Республика Узбекистан','O‘zbekiston Respublikasi')}</small></span></a>
      <div class="header-actions"><div class="language-switch" role="group" aria-label="${t('Язык предложения и программы','Taklif va dastur tili')}">${['ru','uz'].map(value => `<button type="button" data-language="${value}" aria-pressed="${value===language}" aria-label="${value==='ru'?t('Русский язык','Rus tili'):t('Узбекский язык','O‘zbek tili')}">${value.toUpperCase()}</button>`).join('')}</div><a class="btn btn--primary demo-entry" id="expand-workspace" href="#demo">${icon('monitor')}${t('Демо программы','Dastur demosi')}</a></div>
    </div>
    <nav class="navigation" aria-label="${t('Разделы предложения','Taklif bo‘limlari')}">${SALES_SECTIONS.map((id,index)=>`<a href="#${id}">${nav[index]}</a>`).join('')}</nav>
  </header>
  <main class="sales-main">
    <section class="sales-hero" id="purpose" aria-labelledby="sales-title">
      <div class="sales-hero-scene" id="hero-scene">
        <div class="hero-film-images"><img data-hero-layer="0" class="hero-film-frame is-active" src="${heroFrame.src}" width="1774" height="887" alt="${t('Учебная сцена: жительница у электрощита в подъезде','O‘quv sahnasi: kirish yo‘lagida elektr shkafi yonidagi ayol')}" fetchpriority="high"><img data-hero-layer="1" class="hero-film-frame" src="${heroFrame.src}" width="1774" height="887" alt="" aria-hidden="true"></div>
        <div class="hero-viewfinder" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="hero-scene-tag">${icon('eye')}<span>${t('Учебная сцена','O‘quv sahnasi')}</span><span>${t('Подъезд','Kirish yo‘lagi')}</span></div>
        <div class="hero-decision">
          <div class="hero-decision-heading"><span id="hero-film-phase">${t('Учебная ситуация','O‘quv vaziyati')}</span><span id="hero-film-count">0 / 5</span></div>
          <strong id="hero-film-caption">${local(heroCase)}</strong>
          <p id="hero-film-detail">${t('Увидеть. Выбрать действие. Разобрать результат.','Ko‘rish. Amalni tanlash. Natijani tahlil qilish.')}</p>
          <div class="hero-film-progress" aria-hidden="true"><span id="hero-film-progress"></span></div>
          <button id="hero-play" type="button" aria-pressed="false">${icon('arrow-right')}<span>${t('Смотреть 10 секунд','10 soniya ko‘rish')}</span></button>
          <span id="hero-film-status" class="sr-only" role="status"></span>
        </div>
      </div>
      <div class="sales-hero-copy">
        <p class="eyebrow">CLOUDPLUS / ${t('УЧЕБНЫЙ VR-КОМПЛЕКС','O‘QUV VR-KOMPLEKSI')}</p>
        <h1 id="sales-title">${t('Сначала в VR.<br><span>Потом на службе.</span>','Avval VR’da.<br><span>Keyin xizmatda.</span>')}</h1>
        <p class="lead">${t('Курсант отрабатывает ситуации улиц Узбекистана до встречи с ними в жизни. Преподаватель видит действия, пропуски и ошибки.','Kursant O‘zbekiston ko‘chalaridagi vaziyatlarni hayotda uchratishdan oldin mashq qiladi. O‘qituvchi harakatlar, o‘tkazilgan nuqtalar va xatolarni ko‘radi.')}</p>
        <a class="btn btn--primary btn--lg" href="#experience">${t('Попробовать ситуацию','Vaziyatni sinab ko‘rish')}${icon('arrow-right')}</a>
        <span class="sales-hero-signature">${t('Для практической подготовки курсантов университета','Universitet kursantlarining amaliy tayyorgarligi uchun')}</span>
      </div>
    </section>
    <div class="sales-facts wrap" role="group" aria-label="${t('Состав предложения','Taklif tarkibi')}">
      <a href="#environments"><b>20</b><span>${t('учебных ситуаций','o‘quv vaziyati')}<small>${t('Махалля, подъезд, дорога и базар','Mahalla, kirish yo‘lagi, yo‘l va bozor')}</small></span></a>
      <a href="#classroom"><b>10</b><span>${t('VR-мест в проекте класса','xona loyihasida VR-joy')}<small>${t('У каждого курсанта свой комплект','Har bir kursantning o‘z to‘plami')}</small></span></a>
      <a href="#workflow"><b class="fact-word">E-reyting</b><span>${t('результаты в учебном учете','natijalar o‘quv hisobida')}<small>${t('Обмен предусмотрен проектом','Almashuv loyihada ko‘zda tutilgan')}</small></span></a>
    </div>
    <section class="sales-section wrap" id="experience">
      ${heading('01',t('ПОПРОБУЙТЕ САМИ','O‘ZINGIZ SINAB KO‘RING'),t('На базаре нужна помощь.<br><span>Что вы сделаете?</span>','Bozorda yordam kerak.<br><span>Nima qilasiz?</span>'),t('Выберите ситуацию и пройдите пять действий. Сцена меняется вместе с вашими решениями.','Vaziyatni tanlang va beshta amalni bajaring. Qarorlaringiz bilan sahna ham o‘zgaradi.'))}
      <div id="environment-content-market" class="sales-live-example"></div>
    </section>
    <section class="sales-section wrap" id="environments">
      ${heading('02',t('СРЕДЫ И СИТУАЦИИ','MUHITLAR VA VAZIYATLAR'),t('Четыре пространства.<br><span>Двадцать ситуаций из жизни.</span>','To‘rtta makon.<br><span>Hayotdan yigirmata vaziyat.</span>'))}
      <div class="sales-environment-grid">${Object.entries(data.scenes).map(([id,item],index)=>`<article class="sales-environment"><div class="sales-environment-image"><img src="${PANORAMA_MEDIA[id].preview}" width="1774" height="887" alt="" loading="lazy"><span>0${index+1} / 5 ${t('ситуаций','vaziyat')}</span></div><div class="sales-environment-copy"><h3>${item.title}</h3><ul>${scenarioLibrary.filter(x=>x.sceneId===id).slice(0,3).map(x=>`<li>${local(x)}</li>`).join('')}</ul><button type="button" class="text-button" data-open-environment="${id}" aria-haspopup="${id==='market'?'false':'dialog'}">${id==='market'?t('Попробовать выше','Yuqorida sinash'):t('Открыть ситуации','Vaziyatlarni ochish')}${icon('arrow-up-right')}</button></div></article>`).join('')}</div>
    </section>
    <section class="sales-section sales-benefits" id="benefits"><div class="wrap">
      ${heading('03',t('ДЛЯ УНИВЕРСИТЕТА','UNIVERSITET UCHUN'),t('Больше практики.<br><span>Понятнее результат.</span>','Ko‘proq amaliyot.<br><span>Aniqroq natija.</span>'))}
      <div class="sales-benefit-grid">${benefits.map(([ico,title,text],index)=>`<article><span class="benefit-number">0${index+1}</span>${icon(ico)}<h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
    </div></section>
    <section class="sales-section wrap" id="workflow">
      ${heading('04',t('КАК ПРОХОДИТ ЗАНЯТИЕ','MASHG‘ULOT QANDAY O‘TADI'),t('Назначить. Пройти.<br><span>Сохранить результат.</span>','Tayinlash. Bajarish.<br><span>Natijani saqlash.</span>'))}
      <div class="sales-workflow">${[
        ['users',t('Преподаватель назначил','O‘qituvchi tayinladi'),t('Выбрал группу, ситуацию и критерии.','Guruh, vaziyat va mezonlarni tanladi.')],
        ['eye',t('Курсант прошел в VR','Kursant VR’da bajardi'),t('Выполнил задание. Система сохранила действия и ошибки.','Topshiriqni bajardi. Tizim harakat va xatolarni saqladi.')],
        ['check-check',t('Результат в E-reyting','Natija E-reytingda'),t('После проверки преподавателем и подключения обмена.','O‘qituvchi tekshiruvi va almashuv ulangandan so‘ng.')]
      ].map(([ico,title,text],index)=>`<article><div><span>0${index+1}</span>${icon(ico)}</div><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      <details class="sales-technical" id="technical-details"><summary>${t('Подробнее: программа, оценивание и обмен','Batafsil: dastur, baholash va almashuv')}${icon('plus')}</summary>${renderTechnicalDetails(language)}</details>
    </section>
    <section class="sales-section wrap" id="classroom">
      ${heading('05',t('КЛАСС И ВНЕДРЕНИЕ','XONA VA JORIY ETISH'),t('Рабочее место.<br><span>Свой VR-комплект.</span>','Ish joyi.<br><span>O‘z VR-to‘plami.</span>'),t('Десять мест, преподаватель и общий экран. Без отдельной площадки для перемещения.','O‘nta joy, o‘qituvchi va umumiy ekran. Harakatlanish uchun alohida maydonsiz.'))}
      <div class="sales-room-grid"><div class="sales-room-photo"><img src="${PANORAMA_MEDIA.classroom.preview}" width="1774" height="887" alt="${t('CG-класс на десять рабочих мест с VR','O‘nta VR ish joyli CG-xona')}" loading="lazy"><button type="button" class="btn btn--soft" data-open-scene="classroom">${icon('eye')}${t('Панорама аудитории','Auditoriya panoramasi')}</button></div><div class="sales-room-plan"><div class="sales-plan-heading"><strong>${t('10 рабочих мест с VR','VR bilan 10 ta ish joyi')}</strong><span>${t('Преподаватель и общий экран','O‘qituvchi va umumiy ekran')}</span></div>${renderClassroomPlan(language,{interactive:false,compact:true})}<button type="button" class="text-button" data-open-room aria-haspopup="dialog">${t('Рассмотреть схему','Sxemani ko‘rish')}${icon('arrow-up-right')}</button></div></div>
      <div class="sales-rollout-heading"><h3>${t('Четыре шага до учебного класса','O‘quv xonasigacha to‘rtta qadam')}</h3><p>${t('От учебной задачи до первого занятия. Выберите этап.','O‘quv vazifasidan birinchi mashg‘ulotgacha. Bosqichni tanlang.')}</p></div><div class="delivery-steps sales-rollout" role="group" aria-label="${t('Этапы внедрения','Joriy etish bosqichlari')}">${[
        ['book-open',t('Согласовать ситуации','Vaziyatlarni kelishish'),t('20 ситуаций и понятные критерии','20 vaziyat va aniq mezonlar')],
        ['monitor',t('Проверить на оборудовании','Jihozda tekshirish'),t('Один полный пример в VR','VR’da bitta to‘liq namuna')],
        ['database',t('Собрать комплекс','Kompleksni yig‘ish'),t('Программа, сценарии и результаты','Dastur, ssenariylar va natijalar')],
        ['users',t('Обучить преподавателей','O‘qituvchilarni o‘qitish'),t('Практика, инструкции и поддержка','Amaliyot, yo‘riqnoma va yordam')]
      ].map(([ico,title,detail],index)=>`<button type="button" class="delivery-step-button" data-delivery="${index}" aria-pressed="${index===0}" aria-controls="delivery-output"><span class="delivery-card-top"><span>0${index+1}</span>${icon(ico)}</span><span class="delivery-card-title">${title}</span><span class="delivery-card-detail">${detail}</span><span class="delivery-card-link">${t('Результат этапа','Bosqich natijasi')}${icon('arrow-right')}</span></button>`).join('')}</div><div class="delivery-output" id="delivery-output" aria-live="polite"></div>
    </section>
    <section class="sales-section sales-next" id="next-step"><div class="wrap sales-next-layout"><div><p class="eyebrow">${t('СЛЕДУЮЩИЙ ШАГ','KEYINGI QADAM')}</p><h2>${t('Начнем с одной группы.<br><span>И одной реальной задачи.</span>','Bitta guruhdan boshlaymiz.<br><span>Va bitta haqiqiy vazifadan.</span>')}</h2><p>${t('Выберем ситуацию, покажем путь курсанта и разберем результат вместе с преподавателем.','Vaziyatni tanlaymiz, kursant yo‘lini ko‘rsatamiz va natijani o‘qituvchi bilan tahlil qilamiz.')}</p></div><div class="sales-next-action"><button type="button" id="open-pilot" class="btn btn--lg" aria-haspopup="dialog">${t('Выбрать пробное занятие','Sinov mashg‘ulotini tanlash')}${icon('arrow-right')}</button><span>${t('Сценарий, группа и план показа. Без лишних шагов.','Ssenariy, guruh va namoyish rejasi. Ortiqcha qadamlarsiz.')}</span></div></div></section>
  </main>
  <footer class="sales-footer wrap"><div><b>CLOUDPLUS</b><button type="button" class="text-button" id="open-about">${t('О демонстрации и источниках','Namoyish va manbalar haqida')}</button></div><p>${t('Интерактивная концепция на учебных данных. CG-сцены и баллы показаны на примере. Класс рассчитан в проекте на 10 мест; реальная одновременная работа и обмен с E-reyting требуют разработки, подключения и проверки на оборудовании.','O‘quv ma’lumotlaridagi interaktiv konsepsiya. CG-sahnalar va ballar namuna sifatida ko‘rsatilgan. Xona loyihasi 10 joyli; haqiqiy bir vaqtda ishlash va E-reyting almashuvi ishlab chiqish, ulash va jihozda tekshirishni talab qiladi.')}</p></footer>`;
}
