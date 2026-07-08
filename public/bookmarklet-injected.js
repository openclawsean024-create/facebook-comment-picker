javascript:(function(){
var D='fb-pb20';
var old=document.getElementById(D);if(old)old.remove();
// 允許正式 FB 網域 + 測試模式(?__pb_test=1)+ 含 "facebook" 的網域
var isFB=/facebook\.com/.test(location.href);
var isTest=/[?&]__pb_test=1/.test(location.search||'');
var isFBHost=/facebook/i.test(location.hostname||'');
var isEmbed=/[?&]__pb_embed=1/.test(location.search||'');
// 開關加 'PB_ALLOW_ANYWHERE' 全域標記：在測試環境可被注入
if(typeof window!=='undefined' && window.__PB_ALLOW_ANYWHERE){isFB=true;isTest=true;isFBHost=true;}
if(!isFB && !isTest && !isFBHost && !isEmbed){alert('請到 Facebook 貼文頁使用');return;}

var allComments=[];
var seen={};
var stopFlag=false;

// ============================================================================
// UI Panel
// ============================================================================
var showPanel=function(){
var old=document.getElementById(D);if(old)old.remove();
var div=document.createElement('div');div.id=D;
div.style.cssText='position:fixed;bottom:24px;right:24px;z-index:999999;background:linear-gradient(135deg,#ff6666,#ff8b8b);color:white;padding:18px 22px;border-radius:20px;box-shadow:0 18px 50px rgba(255,102,102,0.4);font:14px -apple-system,BlinkMacSystemFont,sans-serif;max-width:380px;z-index:999999;';
div.innerHTML='<div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;opacity:0.85;">FB 留言抽獎助手 v2.0</div><div id="m" style="font-size:18px;font-weight:900;margin:6px 0;">啟動中...</div><div style="font-size:11px;opacity:0.85;margin-top:4px;" id="phase">自動滾動 + 點擊「查看更多」</div><div id="row" style="display:none;gap:8px;margin-top:12px;"><button id="cp" style="flex:1;padding:10px;background:white;color:#ff6666;border:none;border-radius:999px;font-weight:900;cursor:pointer;font-size:13px;">📋 複製留言 JSON</button><button id="st" style="padding:10px 14px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:999px;font-weight:900;cursor:pointer;font-size:13px;">停止</button></div>';
document.body.appendChild(div);

document.getElementById('cp').onclick=function(){
var json=JSON.stringify({source:location.href,fetched_at:new Date().toISOString(),total:allComments.length,data:allComments},null,2);
navigator.clipboard.writeText(json).then(function(){
var b=document.getElementById('cp');b.textContent='✓ 已複製 '+allComments.length+' 則';b.style.background='#51CF66';b.style.color='white';
setTimeout(function(){b.textContent='📋 複製留言 JSON';b.style.background='white';b.style.color='#ff6666';},4000);
},function(){
prompt('複製失敗，請手動複製 ↓',json);
});
};
document.getElementById('st').onclick=function(){stopFlag=true;document.getElementById('st').textContent='停止中...';document.getElementById('st').style.opacity='0.5';};

window.__updatePB=function(){
var n=allComments.length;
document.getElementById('m').innerHTML='已抓 <span style="font-size:28px;">'+n+'</span> 則留言';
if(n>0)document.getElementById('row').style.display='flex';
};
window.__getPBData=function(){return allComments;};
window.__updatePB();
};
showPanel();
window.__fbpbAllComments=allComments;

// ============================================================================
// Helper: is text just UI noise?
// ============================================================================
var isUIElement=function(t){
if(!t)return true;
t=t.trim();
if(t.length<1)return true;
// 按鈕文字
if(/^(Like|Reply|Share|讚|回覆|分享|查看更多|View more|See more|檢視更多|顯示更多|編輯|刪除|檢舉|更多|React|Reactions|Translate|翻譯)$/i.test(t))return true;
// 時間
if(/^\d+\s*(秒|分鐘|小時|天|週|月|年|seconds?|minutes?|hours?|days?|weeks?|months?|yr|mo)\s*(ago)?$/i.test(t))return true;
if(/^\d+[hHdDmMwWyr](\s*ago)?$/i.test(t))return true;
// "1 of 14" pagination
if(/^\d+\s*of\s*\d+$/i.test(t))return true;
if(/^[·•・.]$/.test(t))return true;
if(t==='·'||t==='.'||t==='・')return true;
// React counts
if(/^\d+[KMB]?$/i.test(t))return true;
return false;
};

// ============================================================================
// Strategy: extract one comment from a container element
// ============================================================================
var extractFromBlock=function(block){
try{
var ariaLabel=block.getAttribute&&block.getAttribute('aria-label');
if(ariaLabel){
if(/^(誰按了讚|誰說這則留言|誰對這則留言|reactions|reactors|likes|Who reacted|按讚的用戶|reaction)/i.test(ariaLabel))return null;
if(/^(由.+建立|時間軸單位|新增相片|活動|Start conversation|撰寫留言|Write|reactions|comment\.reactors\.list)/i.test(ariaLabel))return null;
}

// === 核心策略：所有 [dir="auto"] 列舉在同一個 block 內 ===
// 真實 FB DOM：
//   <div role="article" aria-label="留言 by 張三">
//     <div><a>張三</a></div>             ← 作者容器
//     <div><span dir="auto">留言內容</span></div>  ← 留言容器
//   </div>
// [dir=auto] 在 block 內只有「留言內容」是真正的 dir=auto（作者包在 <a> 內，不是 dir=auto）
// 但實務上：
//   - 舊版 UFI：作者容器內可能包 h3 dir=auto 或只是純文本
//   - 新版 React：作者用 <a>，留言用 <span dir=auto>
// 兩者共通：block 內找「不含作者名字 + 文字 > 1 個字元」的第一個 [dir=auto]

var allDirs=block.querySelectorAll('[dir="auto"]');
var msg='';
for(var i=0;i<allDirs.length;i++){
var t=allDirs[i].textContent.trim();
if(!t||t.length<2)continue;
if(isUIElement(t))continue;
if(/^留言$|^Comments$/i.test(t))continue;
if(/^按讚的用戶|^reactions$/i.test(t))continue;
// 跳過「看看更多」按鈕
if(/^查看更多|See more|View more|檢視更多|顯示更多|Load more/i.test(t))continue;
// 第一個通過的就是留言內容
msg=t;
break;
}

// 偶爾 dir=auto 是被嵌套在 <h3> 等裡；備援
if(!msg){
// 找 block 內「不是 <a>」的第一個文字 node
var textEls=block.querySelectorAll('div, span, p');
for(var j=0;j<textEls.length;j++){
var t=textEls[j].textContent.trim();
if(!t||t.length<2||t.length>2000)continue;
if(isUIElement(t))continue;
msg=t;
break;
}
}
if(!msg)return null;

// 作者：用 aria-label 拆（最準確）
var name='';
if(ariaLabel){
// 去掉「留言 by」「Comment by」前綴與「Comment by」「留言by」變體，取後半部為名字
// 例：「留言 by 張三」 → 「張三」；「Comment by Allen Hsieh」 → 「Allen Hsieh」
var stripped=ariaLabel
.replace(/^留言\s*(?:by\s*)?/i,'')
.replace(/^Comment\s*(?:by\s*)?/i,'')
.replace(/^留言\s+/i,'')
.replace(/^Comments?\s+/i,'')
.trim();
if(stripped&&stripped.length<=50&&!/^(按讚的用戶|reactions|反應)$/i.test(stripped)){
name=stripped;
}
}

if(!name){
// 退路：從所有連結中找第一個不像 UI 的
var authorEls=block.querySelectorAll('a[role="link"], a[href*="/user/"], a[href*="profile.php?id="]');
for(var k=0;k<authorEls.length;k++){
var at=(authorEls[k].textContent||'').trim();
if(!at||at.length<1||at.length>50)continue;
if(isUIElement(at))continue;
name=at;
break;
}
}

if(!name||name.length<1||name.length>50)return null;

var uid='unknown';
var authorLinkEls=block.querySelectorAll('a[role="link"], a[href*="/user/"], a[href*="profile.php?id="]');
if(authorLinkEls[0]){
var href=authorLinkEls[0].href||'';
var idMatch=href.match(/[?&]id=(\d+)/)||href.match(/\/user\/([^/?]+)/);
if(idMatch)uid=idMatch[1];
}

if(!/^\d+$/.test(uid)&&uid!=='unknown')uid='user_'+uid;

return {
id:'c_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
message:msg,
created_time:new Date().toISOString(),
from:{id:uid,name:name},
like_count:0
};
}catch(e){
console.error('pb20 extract error',e);
return null;
}
};

// ============================================================================
// Strategy: scan all candidate containers
// ============================================================================
var scan=function(){
var found=0;

// 策略 1：aria-label="留言 by X" 或 "Comment by X" 的 article
var sels=[
'[role="article"][aria-label^="留言 by "]',
'[role="article"][aria-label^="Comment by "]',
'[role="article"][aria-label^="留言 "]',
'[role="article"][aria-label^="Comment "]',
// 沒有 role 的 container
'[aria-label^="留言 by "][data-testid]',
'[aria-label^="Comment by "][data-testid]',
// 留言迴紋針
'div[data-pagelet^="Comment"] div[role="article"]',
'div[data-pagelet*="Comments"] div[role="article"]',
// 舊版 UFI 結構
'.UFIComment',
'.UFI2CommentContent'
];

sels.forEach(function(s){
try{
var containers=document.querySelectorAll(s);
containers.forEach(function(block){
var c=extractFromBlock(block);
if(!c)return;
var key=c.from.id+'|'+c.message.slice(0,50);
if(seen[key])return;
seen[key]=1;
allComments.push(c);
found++;
});
}catch(e){}
});

// 策略 2：找所有「含 [dir=auto] 文字容器內有 a[href*=user|profile.php]」的 leaf block
if(allComments.length<5){
var allArticles=document.querySelectorAll('[role="article"]');
var tmp=[];
allArticles.forEach(function(a){
var aria=a.getAttribute('aria-label')||'';
// 跳過貼文本身
if(aria.match(/^由.+建立|時間軸單位|新增相片|活動|Start conversation|撰寫留言|Write/i))return;
// 跳過 reactions 區
if(aria.match(/^誰按了讚|誰說這則留言|誰對這則留言|reactions|reactors|likes/i))return;
// 跳過過大的 article（可能是整個留言 section）
if(a.querySelectorAll('[role="article"]').length>0)return;
tmp.push(a);
});
tmp.forEach(function(a){
var c=extractFromBlock(a);
if(!c)return;
var key=c.from.id+'|'+c.message.slice(0,50);
if(seen[key])return;
seen[key]=1;
allComments.push(c);
found++;
});
}

// 策略 3：暴力掃 [dir=auto] — 抓「找得到 user/profile.php 連結且不重複的」
if(allComments.length<3){
var allDirs=document.querySelectorAll('[dir="auto"]');
var seenNames={};
allDirs.forEach(function(dir){
var msg=dir.textContent.trim();
if(!msg||msg.length<2||msg.length>2000)return;
if(isUIElement(msg))return;
// 找最近的 user/profile.php 連結（同容器往上 5 層）
var p=dir.parentElement;
var name=null;
for(var d=0;d<5&&p;d++){
var links=p.querySelectorAll('a[href*="/user/"], a[href*="profile.php?id="]');
for(var li=0;li<links.length;li++){
var lt=links[li].textContent.trim();
if(lt&&lt.length>=1&&lt.length<=50&&!isUIElement(lt)){
name=lt;
break;
}
}
if(name)break;
p=p.parentElement;
}
if(!name)return;
var uid=name;
var key=name+'|'+msg.slice(0,50);
if(seen[key])return;
seen[key]=1;
allComments.push({
id:'c_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
message:msg,
created_time:new Date().toISOString(),
from:{id:uid,name:name},
like_count:0
});
found++;
});
}

if(typeof window.__updatePB==='function')window.__updatePB();
return 0;
};

// 點擊「查看更多留言」按鈕 — 廣義版
var clickMore=function(){
var keywordPatterns=[
/查看更多留言/,
/View more comments?/i,
/See more comments?/i,
/顯示更多留言/,
/檢視更多留言/,
/查看更多回應/,
/View (more|all|previous) replies?/i,
/See (more|previous|all) comments?/i,
/^\s*See\s+more\s*$/i,
/^\s*View\s+more\s*$/i,
/^\s*Load\s+more\s*$/i,
/^\s*顯示更多\s*$/i,
/^\s*查看更多\s*$/i,
/^\s*檢視更多\s*$/i
];

var clicked=0;
document.querySelectorAll('div,span,a,button,[role="button"],[role="link"]').forEach(function(el){
var t=(el.textContent||'').trim();
if(!t||t.length>30)return; // 過長表示容器，不是按鈕
for(var i=0;i<keywordPatterns.length;i++){
if(keywordPatterns[i].test(t)){
try{el.click();clicked++;return;}catch(e){}
}
}
});
return clicked;
};

var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};

// ============================================================================
// MAIN LOOP — 自動滾動 + 點擊 + 觀察
// ============================================================================
var observer=null;
if(window.MutationObserver){
observer=new MutationObserver(function(){
clearTimeout(window.__pbDebounce);
window.__pbDebounce=setTimeout(scan,300);
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
}

(async function mainLoop(){
var phaseEl=document.getElementById('phase');
var startTime=Date.now();
var MAX_RUNTIME=90000; // 90 秒
var iterations=0;

phaseEl.textContent='🚀 階段 1/3：自動滾動載入留言...';

while(!stopFlag&&(Date.now()-startTime)<MAX_RUNTIME){
iterations++;

// 階段 1：滾動到最底
window.scrollTo(0,document.body.scrollHeight);
await sleep(800);

// 階段 2：點擊「查看更多留言」按鈕
if(iterations%2===0){
var n=clickMore();
phaseEl.textContent='🔄 階段 2/3：點擊「查看更多留言」共 '+n+' 個...';
await sleep(1200);
}

// 階段 3：掃描
scan();

// 判斷結束：滾動高度沒增加 + scan 沒新發現
var h=document.body.scrollHeight;
if(h===window.__lastH&&iterations>5){
phaseEl.textContent='✓ 階段 3/3：已無新留言（等待中...）';
if(iterations>10)break;
}else{
window.__lastH=h;
}
}

// 完成
if(observer)observer.disconnect();
phaseEl.textContent='✓ 完成！共抓到 '+allComments.length+' 則';
if(typeof window.__updatePB==='function')window.__updatePB();
})();
})();