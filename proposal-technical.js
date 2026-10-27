import { proposalContent } from './proposal-content.js?v=sales20261027-r7local';
const icon = name => `<svg class="i" aria-hidden="true"><use href="./assets/ui-icons/sprite.svg#i-${name}"></use></svg>`;

// The full operating walkthrough remains available without dominating the proposal.
export function renderTechnicalDetails(language) {
  const t = (ru, uz) => language === 'uz' ? uz : ru;
  const data = proposalContent(language);
  const heading = (number, label, title, text) => `<div class="technical-heading"><h3>${title}</h3><p>${text}</p></div>`;
  return `<div id="workspace" class="technical-workspace">
      <div id="process" class="program-workflow">            <p class="interaction-hint">${icon('info')}${t('У каждого этапа свой интерактивный экран','Har bir bosqichning o‘z interaktiv ekrani bor')}</p>
      <div class="process-layout"><div class="process-steps" role="tablist" aria-label="${t('Этапы занятия','Mashg‘ulot bosqichlari')}" aria-orientation="vertical"></div><div id="process-content" role="tabpanel"></div></div></div>
      <details class="module-details assessment-details"><summary>${t('Как оцениваются действия','Harakatlar qanday baholanadi')}${icon('plus')}</summary><div class="program-assessment" id="assessment">            <div class="assessment-layout"><div class="assessment-principles">${[
        [t('Критерии упражнения','Mashq mezonlari'),t('Контрольные точки, последовательность и вес показателей.','Nazorat nuqtalari, ketma-ketlik va ko‘rsatkichlar ulushi.')],
        [t('События попытки','Urinish hodisalari'),t('Выполненные действия, время и пропуски доступны для разбора.','Bajarilgan harakatlar, vaqt va o‘tkazib yuborilgan nuqtalar tahlil uchun mavjud.')],
        [t('Решение преподавателя','O‘qituvchi qarori'),t('Комментарий, подтверждение или повторная подготовка.','Izoh, tasdiqlash yoki qayta tayyorgarlik.')]
      ].map(([title,text],i)=>`<article><span class="step-dot">0${i+1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}<button type="button" class="btn btn--soft" data-inline-stage="5">${t('Попробовать расчет','Hisobni sinab ko‘rish')} ${icon('arrow-right')}</button></div><div class="assessment-live"><p class="eyebrow">${t('Пример карточки / учебные данные','Karta namunasi / o‘quv ma’lumotlari')}</p><div id="assessment-summary"></div><a class="text-button" href="#integration">${t('Подготовка результата для E-reyting','Natijani E-reyting uchun tayyorlash')} ${icon('arrow-right')}</a></div></div></div></details>
      <details class="module-details"><summary>${t('Состав программы: 14 модулей','Dastur tarkibi: 14 modul')}${icon('plus')}</summary><div id="module-overview" class="module-overview"></div></details>

      <div id="workspace-slot" hidden></div>

      <div class="role-block" id="roles"><p class="eyebrow">${t('Ответственность участников','Ishtirokchilar mas’uliyati')}</p><div class="role-tabs" role="tablist" aria-label="${t('Роли пользователей','Foydalanuvchi rollari')}">${Object.entries(data.roles).map(([id,item],i)=>`<button type="button" id="role-${id}" role="tab" aria-selected="${i===0}" aria-controls="role-panel" data-role="${id}">${item[0]}</button>`).join('')}</div><div class="role-panel" id="role-panel" role="tabpanel" aria-labelledby="role-teacher"></div></div>
    <div class="technical-integration" id="integration">
      ${heading('07',t('Интеграция','Integratsiya'),t('VR-практика в учебном учете E-reyting','VR-amaliyot E-reyting o‘quv hisobida'),t('Подтвержденный результат связывается с курсантом, группой, дисциплиной и версией упражнения. Преподаватель видит, что готово к передаче и какой ответ получен.','Tasdiqlangan natija kursant, guruh, fan va mashq versiyasi bilan bog‘lanadi. Tizim ma’lumotlar tarkibini tekshiradi va qayta ishlash holatini saqlaydi.'))}
      <div class="exchange-flow">${[
        ['users',t('Связать данные','Ma’lumotlarni bog‘lash'),t('Курсант, группа, дисциплина','Kursant, guruh, fan')],
        ['check-check',t('Проверка','Tekshirish'),t('Подтверждение и обязательные поля','Tasdiq va majburiy maydonlar')],
        ['arrow-up-down',t('Пакет результатов','Natijalar paketi'),t('Состав и способ передачи','Tarkib va uzatish usuli')],
        ['history',t('Получить ответ','Javob olish'),t('Ответ, ошибка, повтор','Javob, xato, qayta urinish')]
      ].map(([ico,title,text],i)=>`<article>${icon(ico)}<span class="exchange-number">0${i+1}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      <div class="exchange-panel"><div><p class="eyebrow">${t('Способ передачи','Uzatish usuli')}</p><div class="exchange-tabs" role="tablist" aria-label="${t('Способ обмена','Almashuv usuli')}"><button type="button" id="exchange-api" role="tab" aria-selected="true" aria-controls="exchange-detail" data-exchange="api">API</button><button type="button" id="exchange-file" role="tab" aria-selected="false" aria-controls="exchange-detail" data-exchange="file">Excel / CSV</button></div><div id="exchange-detail" role="tabpanel" aria-labelledby="exchange-api"></div><button type="button" class="btn btn--primary" data-open-exchange>${t('Проверить пример пакета','Paket namunasini tekshirish')} ${icon('arrow-right')}</button></div><div class="exchange-record"><h3>${t('Какие данные передаем','Qanday ma’lumot uzatiladi')}</h3><dl>${[
        [t('Участник','Ishtirokchi'),t('Код курсанта и учебная группа','Kursant kodi va o‘quv guruhi')],
        [t('Учебная связь','O‘quv bog‘lanishi'),t('Дисциплина и упражнение','Fan va mashq')],
        [t('Основание','Asos'),t('Версия сценария и номер попытки','Ssenariy versiyasi va urinish raqami')],
        [t('Результат','Natija'),t('Баллы, дата и подтверждение преподавателя','Ball, sana va o‘qituvchi tasdig‘i')],
        [t('Контроль','Nazorat'),t('Идентификатор пакета и статус обработки','Paket identifikatori va qayta ishlash holati')]
      ].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl></div></div>
      <div class="exchange-checks"><div>${icon('shield-check')}<strong>${t('Непроверенные результаты не передаются','Tekshirilmagan natijalar uzatilmaydi')}</strong></div><div>${icon('history')}<strong>${t('Повторы и ошибки видны в журнале','Takrorlar va xatolar jurnalda ko‘rinadi')}</strong></div></div>
      <p class="note">${t('В демонстрации работают локальные сопоставления, проверка и подготовка пакета. Реальный API не подключен; формат и доступ согласуются с владельцем E-reyting.','Namoyishda mahalliy moslashtirish, tekshirish va paket tayyorlash ishlaydi. Haqiqiy API ulanmagan; format va kirish E-reyting egasi bilan kelishiladi.')}</p>
      <details class="module-details"><summary>${t('Попробовать подготовку результата для E-reyting','E-reyting uchun natija tayyorlashni sinash')}${icon('plus')}</summary><div class="program-assessment" id="integration-example"></div></details>
    </div>
<div id="architecture" class="technical-architecture"><h3>${t('Компоненты комплекса','Kompleks tarkibi')}</h3>
      <div class="architecture-map">${Object.entries(data.architecture).map(([id,item])=>`<button type="button" data-arch="${id}" aria-pressed="${id==='teacher'}">${icon(item[4])}<strong>${item[0]}</strong><small>${item[1]}</small></button>`).join('')}</div><article id="architecture-detail"></article>
</div></div>`;
}
