import { readFile, writeFile } from 'node:fs/promises';
const { build, transform } = await import(process.env.ESBUILD_MODULE || 'esbuild');
const root = new URL('../', import.meta.url);
await build({ entryPoints:[new URL('app.js',root).pathname],outfile:new URL('site.js',root).pathname,bundle:true,format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'eof',logLevel:'warning' });
const css=await readFile(new URL('styles.css',root),'utf8');
const result=await transform(css,{loader:'css',minify:true,target:'es2022',legalComments:'eof'});
await writeFile(new URL('styles.css',root),result.code);
console.log('Bundled site.js and minified styles.css.');
