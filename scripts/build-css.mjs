import { readFile, writeFile } from 'node:fs/promises';
const files = ['assets/ui-kit/kit.css','proposal-theme.css','style.css','presentation-demo.css','scenario-visuals.css','workspace.css','e-reyting-theme.css','proposal-pages.css','sales.css','sales-visuals.css','editorial.css'];
const parts = [];
for (const file of files) {
  let css = await readFile(new URL('../'+file, import.meta.url), 'utf8');
  if (file === 'assets/ui-kit/kit.css') css = css.replaceAll('url(fonts/','url(./assets/ui-kit/fonts/');
  parts.push(`/* Source: ${file} */\n${css}`);
}
await writeFile(new URL('../styles.css', import.meta.url),parts.join('\n'));
console.log('Built styles.css from '+files.length+' local stylesheets.');
