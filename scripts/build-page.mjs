import { readFile, writeFile } from 'node:fs/promises';
import { renderProposal } from '../proposal-template.js';
const path=new URL('../index.html',import.meta.url);
const source=await readFile(path,'utf8');
const start='<!-- proposal:begin -->',end='<!-- proposal:end -->';
if(!source.includes(start)||!source.includes(end))throw new Error('Prerender markers missing');
const content=`${start}\n  <div id="proposal" data-initial-language="ru">${renderProposal('ru')}</div>\n  ${end}`;
await writeFile(path,source.slice(0,source.indexOf(start))+content+source.slice(source.indexOf(end)+end.length));
console.log('Prerendered the unchanged Russian proposal for immediate first paint.');
