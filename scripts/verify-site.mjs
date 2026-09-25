import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const canonicalBase=process.env.TEST_CANONICAL_URL || 'http://localhost:3000';
const indexable=process.env.TEST_INDEXABLE === 'true';
const verifiedLinks=new Set();
const paths=['/','/hakkimizda','/projeler','/projeler/sehit-kutuphaneleri','/projeler/egitime-destek','/projeler/sosyal-ve-kulturel-calismalar','/bagis','/gonullu-ol','/iletisim','/gizlilik'];
const results=[];
for(const path of paths){
 const start=performance.now();const res=await fetch(base+path);const html=await res.text();
 assert.equal(res.status,200,path);assert.match(res.headers.get('content-type'),/text\/html/);
 const main=html.match(/<main[^>]*>(.*?)<\/main>/s)?.[1] || '';
 assert.match(html,/<html lang="tr"/);assert.equal([...html.matchAll(/<h1[\s>]/g)].length,1,path);
 assert.match(main,/<h1[\s>]/,`${path}: H1 must be present in the initial main HTML`);
 assert.doesNotMatch(main,/Sayfa yükleniyor/,`${path}: initial main HTML must contain the page content`);
 assert.match(html,/<meta charSet="utf-8"/i);assert.match(html,/<meta name="description" content="[^"]{30,}"/);
 assert.equal(new URL(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).href,new URL(path,canonicalBase).href);
 assert.match(html,/<meta property="og:locale" content="tr_TR"/);
 assert.equal(html.match(/<meta name="robots" content="([^"]+)"/)?.[1],indexable?'index, follow':'noindex, nofollow');
 assert.match(html,/Alpagu Derneği<\/title>/);
 const schema=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
 assert.ok(schema.some(s=>s['@type']==='NGO'));
 for(const m of html.matchAll(/href="(\/[^"#?]*)"/g)){
  if(m[1].startsWith('/_next/') || verifiedLinks.has(m[1]))continue;
  verifiedLinks.add(m[1]);
  const link=await fetch(base+m[1]);assert.ok(link.ok,`${path}: broken link ${m[1]}`);
 }
 results.push({path,status:res.status,h1:1,structuredData:schema.map(s=>s['@type']),milliseconds:Math.round(performance.now()-start)});
}
assert.equal((await fetch(base+'/bulunmayan-sayfa')).status,404);
assert.equal((await fetch(base+'/projeler/bulunmayan-proje')).status,404);
const robots=await (await fetch(base+'/robots.txt')).text();
assert.match(robots,indexable?/Allow: \//:/Disallow: \//);
const sitemap=await (await fetch(base+'/sitemap.xml')).text();
assert.equal([...sitemap.matchAll(/<loc>/g)].length,indexable?paths.length:0);
if(indexable){
 assert.ok(robots.includes(canonicalBase+'/sitemap.xml'));
 assert.equal([...sitemap.matchAll(/<lastmod>/g)].length,paths.length);
 assert.ok(results[0].structuredData.includes('FAQPage'));
 assert.ok(results[0].structuredData.includes('WebSite'));
}
const image=await fetch(base+'/_next/image?url=%2Fimages%2Freading.webp&w=640&q=75', {headers:{Accept:'image/webp'}});
assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');
const iban='TR900006400000134082638469';
const numeric=(iban.slice(4)+iban.slice(0,4)).replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
assert.equal(BigInt(numeric)%97n,1n,'IBAN checksum');
await writeFile(process.env.TEST_REPORT || 'verification.json',JSON.stringify({checkedAt:new Date().toISOString(),base,results,notFound:404,imageOptimizer:'WebP 200',ibanChecksum:'valid',indexing:indexable?'enabled':'disabled',canonicalBase},null,2));
console.table(results.map(({path,status,h1})=>({path,status,h1})));
console.log('10 pages, internal links, metadata, structured data, image optimizer, IBAN checksum and 404 behavior: PASS');
