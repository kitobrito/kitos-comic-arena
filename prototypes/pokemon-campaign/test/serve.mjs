// Local test harness only. Production always resolves the real signed account
// through server.js; this fixture binds exclusively to localhost.
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),handler=require('../access.cjs')({
 repositoryRoot:fileURLToPath(new URL('../../../',import.meta.url)),
 resolveUser:async req=>{const cookie=req.headers.cookie??'';return cookie.includes('campaign-test=admin')?{username:'preview-admin',role:'admin'}:cookie.includes('campaign-test=player')?{username:'player',role:'user'}:null;},
});
const server=http.createServer((req,res)=>handler(req,res));
server.listen(Number(process.env.PORT??4195),'127.0.0.1',()=>console.log(`Campaign test server http://127.0.0.1:${server.address().port}/pokemon-campaign/`));
