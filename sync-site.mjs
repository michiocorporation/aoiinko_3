import fs from 'node:fs/promises';
const htmlPath = new URL('./index.html', import.meta.url);
let html = await fs.readFile(htmlPath, 'utf8');
for(const [id, file] of [['site-config','site-config.js'],['site-runtime','script.js']]) {
  const source = (await fs.readFile(new URL('./'+file,import.meta.url),'utf8')).replaceAll('</script','<\\/script');
  const inline = `<script id="${id}">\n${source}\n</script>`;
  const pattern = new RegExp(`<script id="${id}">[\\s\\S]*?<\\/script>`);
  html = pattern.test(html) ? html.replace(pattern,()=>inline) : html.replace(`<script src="./${file}"></script>`,()=>inline);
}
html = html.replace("  <script>document.body.dataset.runtimeCheck = 'inline';</script>\n",'');
await fs.writeFile(htmlPath,html);
console.log('Synced editable configuration and behavior into the standalone HTML.');
