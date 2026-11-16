// Every campaign page, source module and art asset passes through the same
// authenticated role check. Raw campaign source paths are denied by server.js.
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const PUBLIC_FILES = new Set(['index.html','app.mjs','campaign.mjs','roster.mjs','talents.mjs','style.css','forest.svg',
 ...['mudkip','treecko','torchic','zigzagoon','slugma','pineco','swinub','zangoose','seviper','poochyena','wurmple','lotad'].map(id=>`assets/${id}.png`)]);
const ENGINE_FILES = new Set(['engine.mjs','roster.mjs','skill-art.mjs','production-skill-descriptions-current.mjs',
 ...Array.from({length:8},(_,i)=>`production-skill-descriptions-part-${i+1}.mjs`)]);
const MIME={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',svg:'image/svg+xml'};
module.exports=function createCampaignPreviewHandler({resolveUser,repositoryRoot=join(__dirname,'..','..')}){
 if(typeof resolveUser!=='function')throw new Error('Campaign preview requires account verification.');
 return async function campaignPreview(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Cookie');
  try{
   const user=await resolveUser(req);
   if(!user||String(user.role??'').trim().toLowerCase()!=='admin'){
    res.statusCode=user?403:401;res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><title>Admin preview</title><h1>Admin preview</h1><p>Sign in with your administrator account to test this campaign.</p><a href="/pokemon-home.html">Return to Pokémon Arena</a>');return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');res.end();return;}
   const original=new URL(req.originalUrl??req.url,'http://localhost');
   if(original.pathname==='/pokemon-campaign'){res.statusCode=302;res.setHeader('Location','/pokemon-campaign/'+original.search);res.end();return;}
   let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.startsWith('/pokemon-campaign/'))pathname=pathname.slice('/pokemon-campaign'.length);
   if(pathname==='/session'){
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({username:String(user.username??user._id)}));return;
   }
   const name=pathname.replace(/^\//,'')||'index.html';let file;
   if(name.startsWith('engine/')&&ENGINE_FILES.has(name.slice(7)))file=join(repositoryRoot,'prototypes','pokemon-unison','reference',name.slice(7));
   else if(PUBLIC_FILES.has(name))file=join(repositoryRoot,'prototypes','pokemon-campaign',name);
   else{res.statusCode=404;res.end('Not found.');return;}
   const content=await readFile(file);res.setHeader('Content-Type',MIME[file.split('.').at(-1)]??'application/octet-stream');
   res.setHeader('Content-Length',content.length);res.end(req.method==='HEAD'?undefined:content);
  }catch(error){res.statusCode=error.code==='ENOENT'?404:503;res.end(error.code==='ENOENT'?'Not found.':'Campaign preview is temporarily unavailable.');}
 };
};

module.exports.isCampaignSourcePath = function isCampaignSourcePath(requestPath = '') {
 try {
  const decoded = decodeURIComponent(String(requestPath)).replace(/\\/g, '/').replace(/\/+/g, '/');
  const pathname = new URL(decoded, 'http://localhost').pathname.replace(/\/+/g, '/').toLowerCase();
  return pathname === '/prototypes/pokemon-campaign' || pathname.startsWith('/prototypes/pokemon-campaign/');
 } catch { return true; }
};
