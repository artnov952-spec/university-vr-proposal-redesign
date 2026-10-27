import assert from 'node:assert/strict';
import { renderProposal, SALES_SECTIONS } from '../proposal-template.js';
import { scenarioLibrary } from '../scenario-library.js';
import { environmentIds,createEnvironmentExamples,reduceEnvironmentExample,renderEnvironmentExample } from '../proposal-environments.js';

for (const language of ['ru','uz']) {
  const html=renderProposal(language);
  let previous=-1;
  for(const id of SALES_SECTIONS) {
    const position=html.indexOf(`id="${id}"`);
    assert.ok(position>previous,`${id} follows the proposal narrative`);previous=position;
  }
  const hero=html.slice(html.indexOf('id="purpose"'),html.indexOf('id="experience"'));
  assert.equal((hero.match(/data-hero-layer=/g)||[]).length,2);
  assert.ok(hero.includes('id="hero-play"')&&hero.includes('id="hero-film-progress"'));
  assert.ok(!hero.includes('<iframe')&&!hero.includes('data-open-scene'));
  assert.equal((html.match(/class="sales-environment"/g)||[]).length,4);
  assert.equal((html.match(/id="environment-content-/g)||[]).length,1,'Only one full example on the primary page');
  assert.ok(html.includes('<details class="sales-technical" id="technical-details">'),'Operating detail is initially collapsed');
  assert.equal((html.match(/<section\b/g)||[]).length,7);
  assert.ok(html.includes('id="open-pilot"'));
  assert.ok(!html.includes('dyfed-powys.police.uk')&&!html.includes('fpi.omb.gov/program/16.054.html'),'Removed international references do not reappear');
  assert.ok(!html.includes('10 курсантов одновременно'));
  assert.equal((html.match(/id="expand-workspace"/g)||[]).length,1);
  assert.ok(html.slice(0,html.indexOf('<main ')).includes('id="expand-workspace"'),'Program entry is visible in the sticky header');
  assert.ok(html.includes('href="#demo"'));
  assert.ok(html.includes('id="integration-example"'));
  const initialImages=new Set();
  for(const item of scenarioLibrary) {
    let state={caseId:item.id,points:[],review:false};
    const initial=renderEnvironmentExample(item.sceneId,state,language);
    const initialSrc=initial.match(/class="scenario-frame" src="([^"]+)"/)?.[1];
    assert.ok(initialSrc?.includes(item.id),'Selecting a case immediately shows that case, even at 0/5');
    initialImages.add(initialSrc);
    const other=createEnvironmentExamples();
    assert.equal(reduceEnvironmentExample(state,{type:'point',index:3}),state);
    assert.equal(reduceEnvironmentExample(state,{type:'case',value:environmentIds.find(id=>id!==item.sceneId)+'-01'}),state);
    for(let index=0;index<5;index++) {
      state=reduceEnvironmentExample(state,{type:'point',index});
      assert.equal(state.points.length,index+1);
      assert.equal(reduceEnvironmentExample(state,{type:'point',index}),state);
      const rendered=renderEnvironmentExample(item.sceneId,state,language);
      assert.ok(rendered.includes(`data-visual-step="${index+1}"`));
      assert.equal((rendered.match(/data-env-action="case"/g)||[]).length,5);
      assert.equal((rendered.match(/data-env-action="point"/g)||[]).length,5);
      assert.ok(!/undefined|NaN/.test(rendered));
    }
    assert.deepEqual(other,createEnvironmentExamples(),'Examples do not mutate other environments or saved workspace');
    state=reduceEnvironmentExample(state,{type:'review'});
    assert.ok(renderEnvironmentExample(item.sceneId,state,language).includes('data-env-action="assessment"'));
    state=reduceEnvironmentExample(state,{type:'reset'});
    assert.deepEqual(state.points,[]);
    for(const point of item.points) {
      assert.ok(point.title.length<=65&&point.description.length<=220,'Short, concrete RU copy');
      assert.ok(!/гипотез|временные линии|предмет обращения|пределы установленного|согласовать два разных/i.test(point.title+' '+point.description));
      assert.ok(point.uzTitle&&point.uzDescription);
    }
  }
  assert.equal(initialImages.size,20);
}
console.log(JSON.stringify({result:'passed',proposalPages:7,primaryExamples:1,compactEnvironments:4,independentEnvironments:4,scenarios:20,plainLanguageActions:100,languages:2,fullProgramEntrances:1},null,2));
