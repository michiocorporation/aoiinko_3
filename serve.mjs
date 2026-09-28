import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url));
const port=Number(process.env.PORT||4175);
const publicFiles=new Set(['index.html','styles.css','script.js','site-config.js','favicon.svg','og.png','robots.txt']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,target);const segments=relative.split(path.sep);
  const allowed=publicFiles.has(relative)||(segments[0]==='assets'&&segments.length>1&&!relative.includes('-source.'));
  if(!allowed||segments.some(s=>s.startsWith('.'))||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Walking-path preview: http://127.0.0.1:${port}/`));
