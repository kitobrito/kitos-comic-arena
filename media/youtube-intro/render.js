const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');
(async()=>{
 const mode=process.argv[2]||'preview';
 const b=await chromium.launch({args:['--allow-file-access-from-files']});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 p.on('console',m=>console.log('page:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('file://'+__dirname+'/intro.html');await p.waitForFunction('window.ready');
 const grab=async t=>{const d=await p.evaluate(t=>{render(t);return document.getElementById('c').toDataURL('image/jpeg',0.95)},t);return Buffer.from(d.split(',')[1],'base64')};
 if(mode==='preview'){fs.mkdirSync('prev',{recursive:true});
  for(const t of process.argv.slice(3).map(Number)) fs.writeFileSync(`prev/f_${t.toFixed(2)}.jpg`,await grab(t));
 } else {
  const fps=30,END=await p.evaluate('END');
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-ss','3.15','-t',''+END,'-i',process.argv[3],
   '-filter_complex','[1:a]afade=t=in:d=0.3,afade=t=out:st='+(END-1.6)+':d=1.6[a]','-map','0:v','-map','[a]','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-movflags','+faststart','-shortest',process.argv[4]],{stdio:['pipe','inherit','inherit']});
  const n=Math.round(END*fps);
  for(let i=0;i<n;i++){const buf=await grab(i/fps); if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));
 }
 await b.close();
})();
