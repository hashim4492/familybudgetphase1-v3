const KEY='familyBudgetV2';
/* Imported messages wait in Review until the user saves them; categories are chosen by the user, never guessed. */
const REVIEW_FIRST=true,AUTO_CATEGORY=false,SUGGEST_CATEGORY=true;
const cats=['Rent','Groceries','Fuel','Car','Tolls','Insurance','School','Personal','Home/Family','Bills','Transport','Food','Medical','Education','Shopping','Travel','Entertainment','Home','Personal Care','Pets','Technology','Banking/Finance','Government/Services','Gifts','Delivery','Other','Uncategorized','Unassigned'];
const ICO={cash:'<svg class="ic ic-cash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/></svg>',card:'<svg class="ic ic-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',credit:'<svg class="ic ic-credit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20"/><path d="M6 14h3M12 14h2"/><path d="M17.5 13.5a2 2 0 0 1 0 3"/></svg>'};
const CURS={AED:'AED ',SAR:'SAR ',QAR:'QAR ',KWD:'KWD ',BHD:'BHD ',OMR:'OMR ',INR:'₹',PKR:'PKR ',USD:'$',EUR:'€',GBP:'£'};
const CNAME={AED:'UAE Dirham (AED)',SAR:'Saudi Riyal (SAR)',QAR:'Qatari Riyal (QAR)',KWD:'Kuwaiti Dinar (KWD)',BHD:'Bahraini Dinar (BHD)',OMR:'Omani Rial (OMR)',INR:'Indian Rupee (₹)',PKR:'Pakistani Rupee (PKR)',USD:'US Dollar ($)',EUR:'Euro (€)',GBP:'British Pound (£)'};
let data={budget:0,tx:[]};
try{const s=localStorage.getItem(KEY);if(s)data=JSON.parse(s)}catch(e){}
const SCHEMA=3;
function normData(){
 data.tx=Array.isArray(data.tx)?data.tx:[];data.pending=Array.isArray(data.pending)?data.pending:[];
 data.currency=CURS[data.currency]?data.currency:'AED';data.alerts=Array.isArray(data.alerts)?data.alerts:[];data.cards=Array.isArray(data.cards)?data.cards:[];
 data.ignored=Array.isArray(data.ignored)?data.ignored:[];                      /* v3: remembers deleted imported transactions */
 const isD=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
 data.periods=Array.isArray(data.periods)?data.periods.filter(p=>p&&p.id&&isD(p.from)&&isD(p.to)).map(p=>({id:String(p.id),name:String(p.name||'Period').slice(0,40),from:p.from,to:p.to,created:p.created||''})):[];   /* saved periods */
 if(!data.profile||typeof data.profile!=='object')data.profile={name:(data.tx.length||data.budget)?'Mr. Hashim':''};      /* greeting name; seeded once for an existing install, editable in Backup */
 data.profile.name=String(data.profile.name||'').slice(0,40);
 if(data.setupDone===undefined)data.setupDone=data.tx.length>0||data.budget>0;        /* first-run welcome only for a brand new install */
 [...data.tx,...data.pending].forEach(x=>{if(x.source==='message'&&x.merchant==='Unknown merchant'&&!x.userEdited){x.merchant='';x.autoMerchant='';x.needsReview=true;x.reviewReason='Merchant could not be identified'}});   /* old mis-parsed rows -> Needs Review (original message kept) */
 data.cards.forEach(c=>{if(c.nickname==null)c.nickname='';if(c.notes==null)c.notes=''});
 [...data.tx,...data.pending].forEach(x=>{if(!x.cardLast4&&x.card4)x.cardLast4=x.card4});   /* v3: old card4 -> cardLast4 (old field kept) */
 data.schema=SCHEMA}
normData();            /* runs the data migration on every start (fresh install and upgrade) */
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
function today(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
let month=today().slice(0,7), editId=null, pendId=null;
/* Data lives on this device only: localStorage is the main store, IndexedDB keeps a second copy
   so entries can be recovered if the browser ever clears localStorage. */
function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('familyBudget',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function idbPut(v){try{idbOpen().then(db=>{db.transaction('kv','readwrite').objectStore('kv').put(v,'data')}).catch(()=>{})}catch(e){}}
function idbGet(){try{return idbOpen().then(db=>new Promise(res=>{const q=db.transaction('kv').objectStore('kv').get('data');q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})).catch(()=>null)}catch(e){return Promise.resolve(null)}}
function save(){const j=JSON.stringify(data);try{localStorage.setItem(KEY,j)}catch(e){}idbPut(j);render()}
function setCur(v){if(CURS[v]){data.currency=v;save()}}
function P(){return CURS[data.currency]||'AED '}
function LOC(){return data.currency==='INR'?'en-IN':'en-US'}
function money(n){return P()+Number(n).toLocaleString(LOC(),{minimumFractionDigits:2,maximumFractionDigits:2})}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function mv(d){let [y,m]=month.split('-').map(Number);m+=d;if(m<1){m=12;y--}if(m>12){m=1;y++}month=y+'-'+pad(m);render()}
function mName(x){return x.merchant||(x.needsReview?'Needs review':(x.type==='income'?'Money in':(x.method==='cash'?'Cash Expense':(x.source==='message'?'Card transaction':'Transaction'))))}
function payLine(x){const has=x.source==='message'||x.method||x.cardLast4||x.card4||x.cardType;if(!has)return '';
 if(x.type==='income'&&!(x.cardLast4||x.card4))return '';const ci=cardInfo(x);return ci.icon+esc(ci.text)}
function leftBlock(x){const tag=x.needsReview?'<span class="tag warn">Needs review</span>':(x.source==='message'?'<span class="tag">Imported</span>':''),pay=payLine(x);
 return `<div class="mer">${esc(mName(x))}${tag}</div><div class="meta"><span class="cc">${esc(x.category)}</span>${pay?' \u2022 '+pay:''}</div><div class="meta">${fd(x.date)}${x.time&&!(x.timeEst&&x.source==='message')?' \u2022 '+(x.timeEst?'entered ':'')+x.time:''}</div>${x.notes?'<div class="meta">'+esc(x.notes)+'</div>':''}`}
function amtText(x){return x.source==='message'?fmtAmt(x):money(x.amount)}
function txHTML(x){const u=catUI(x.category);return `<div class="tx trow" style="--c:${u[1]}" onclick="${x.needsReview?'openReview':'openEdit'}('${x.id}')"><div class="ti" style="--c:${u[1]}"><span>${u[0]}</span></div><div class="tbody">${leftBlock(x)}</div><strong class="amt ${x.type==='income'?'g':'r'}">${x.type==='income'?'+':'-'}${amtText(x)}</strong></div>`}
function render(){
 const [y,m]=month.split('-').map(Number);
 $('mlabel').textContent=new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const tx=data.tx.filter(x=>x.date.slice(0,7)===month).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')));
 const inc=tx.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0), exp=tx.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0);
 const has=data.budget>0,left=data.budget-exp;
 $('hl').textContent=has?(left>=0?'Remaining':'Over limit by'):'';
 $('bal').textContent=has?P()+n0(Math.abs(left)):'Set limit';$('bal').className='hv '+(has?(left<0?'r':'g'):'');
 gauge(has,left,exp);
 $('btxt').textContent=has?'of '+P()+n0(data.budget)+' limit':'';
 $('binput').value=data.budget||'';
 renderCmp();renderPending();renderAlerts();renderDetails();renderDonut();applyPanel();renderCap();renderCards();$('cursel').value=data.currency;$('amount').placeholder='0.00';renderUI();
 $('list').innerHTML=(rangeOn()?rtx():tx).map(txHTML).join('')||'<div class="empty">'+(rangeOn()?'No transactions in this range':'No transactions this month')+'</div>';renderRange();
 const t={};tx.filter(x=>x.type==='expense').forEach(x=>t[x.category]=(t[x.category]||0)+x.amount);
 $('top').innerHTML=catCards(t,5);
 $('cats').innerHTML=catCards(t,0);
 renderNR();renderStack();renderPeriodList();renderWelcome();fillProfile();if(curPeriodOn)renderPeriodDetail();
}
function ml(m){const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
function ct(m){const t={};data.tx.forEach(x=>{if(x.type==='expense'&&x.date.slice(0,7)===m)t[x.category]=(t[x.category]||0)+x.amount});return t}
const n0=v=>Math.round(v).toLocaleString(LOC());
function renderCmp(){
 const cur=today().slice(0,7);
 const ms=[...new Set(data.tx.map(x=>x.date.slice(0,7)))].filter(m=>m!==cur).sort().reverse();
 const sel=$('cmp'),old=sel.value;
 sel.innerHTML=ms.map(m=>`<option value="${m}">${ml(m)}</option>`).join('');
 if(!ms.length){sel.style.display='none';$('cmpOut').innerHTML='<div class="empty">Add transactions in another month to compare</div>';return}
 sel.style.display='';if(ms.includes(old))sel.value=old;
 const a=ct(sel.value),b=ct(cur),sum=o=>Object.values(o).reduce((x,y)=>x+y,0);
 const ta=sum(a),tb=sum(b),d=tb-ta;
 const pc=(x,y)=>{const v=y-x;if(Math.abs(v)<0.005)return '0.0%';if(!x)return 'new';return (v>0?'+':'-')+Math.abs(v/x*100).toFixed(1)+'%'};
 const dl=(x,y)=>{const v=y-x;if(Math.abs(v)<0.005)return '<span>–</span>';return `<span class="${v>0?'r':'g'}">${v>0?'+':'-'}${n0(Math.abs(v))}<br><small>${pc(x,y)}</small></span>`};
 const names=[...new Set([...cats,...Object.keys(a),...Object.keys(b)])].sort((x,y)=>((b[y]||0)+(a[y]||0))-((b[x]||0)+(a[x]||0)));
 const line=Math.abs(d)<0.005?'Same spending as '+ml(sel.value)+'.':`This month you have spent <strong class="${d>0?'r':'g'}">${money(Math.abs(d))} (${pc(ta,tb)}) ${d>0?'more':'less'}</strong> than in ${ml(sel.value)}.`;
 $('cmpOut').innerHTML=`<div class="grid"><div class="mini"><div class="lbl">${ml(sel.value)} spent</div><div class="val r">${money(ta)}</div></div><div class="mini"><div class="lbl">This month spent</div><div class="val r">${money(tb)}</div></div></div>
 <p style="margin:12px 0 10px">${line}</p><div class="small">Amounts in ${data.currency}</div>
 <div class="cg h"><span>Category</span><span>${ml(sel.value)}</span><span>This month</span><span>Change</span></div>
 <div class="cg t"><span>Total</span><span>${n0(ta)}</span><span>${n0(tb)}</span>${dl(ta,tb)}</div>`+
 names.map(c=>{const x=a[c]||0,y=b[c]||0;return `<div class="cg"${x||y?'':' style="opacity:.45"'}><span>${esc(c)}</span><span>${n0(x)}</span><span>${n0(y)}</span>${dl(x,y)}</div>`}).join('');
}
function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));$(id).classList.add('on');
 document.querySelectorAll('nav button').forEach(b=>b.classList.remove('on'));const n=$('n-'+id);if(n)n.classList.add('on');window.scrollTo(0,0)}
let curCard=null,curEst=false,estTime='',curImport=null,curBank='';
function cardLabelOf(c){const n=c.nickname||c.bank||'';return (n?n+' ':'')+'••••'+c.last4}
function matchCard(t,l4){if(!l4)return null;const L=t.toLowerCase();let c=data.cards.filter(x=>x.last4===l4);   /* matched by the last 4 digits only */
 if(c.length>1){const b=c.filter(x=>x.bank&&L.includes(x.bank.toLowerCase()));if(b.length)c=b}
 return c[0]||null}
function updateCardSel(){const m=$('method').value,ty=m==='credit'?'credit':(m==='card'?'debit':''),list=ty?data.cards.filter(c=>c.type===ty):[],sel=$('cardsel');
 sel.style.display=list.length&&$('type').value==='expense'?'':'none';
 sel.innerHTML='<option value="">Which card? (optional)</option>'+list.map(c=>`<option value="${esc(c.id)}">${esc(cardLabelOf(c))}</option>`).join('');
 if(curCard&&curCard.cardId&&list.some(c=>c.id===curCard.cardId))sel.value=curCard.cardId;
 const b=$('savecardbtn'),unk=!!(curCard&&curCard.card4&&!data.cards.some(c=>c.last4===curCard.card4))&&$('type').value==='expense';
 b.style.display=unk?'':'none';if(unk)b.textContent='Save card ••••'+curCard.card4+' to My Cards'}
function pickCard(id){const c=id?data.cards.find(x=>x.id===id):null;curCard=c?{card4:c.last4,cardLabel:cardLabelOf(c),cardId:c.id,cardType:c.type}:null;updateCardSel()}
function prefillCard(){if(!curCard)return;show('budget');$('clast').value=curCard.card4;$('cbank').value=curBank;$('ctype').value=curCard.cardType==='credit'?'credit':'debit';$('cmsg').textContent='Check the details, then tap Add card.'}
function pickMethod(v){curCard=null;setMethod(v)}
function addCard(e){e.preventDefault();const d=$('clast').value.replace(/\s/g,''),m=$('cmsg');
 if(!/^\d{4}$/.test(d)){m.textContent='Enter only the last 4 digits of the card, never the full number.';return}
 const bank=$('cbank').value.trim(),type=$('ctype').value,nick=$('cnick').value.trim(),notes=$('cnotes').value.trim();
 if(/\d{8,}/.test((bank+nick+notes).replace(/[\s-]/g,''))){m.textContent='Do not enter card, account or other long numbers here. Only the last 4 digits are saved.';return}
 if(data.cards.some(c=>c.last4===d&&c.type===type&&c.bank.toLowerCase()===bank.toLowerCase())){m.textContent='That card is already saved.';return}
 data.cards.push({id:newId(),bank,nickname:nick,last4:d,type,notes});relinkCards();
 ['cbank','clast','cnick','cnotes'].forEach(i=>$(i).value='');m.textContent='';save()}
function relinkCards(){data.tx.forEach(x=>{if(!x.cardId&&(x.cardLast4||x.card4)){const c=savedCardFor(x);if(c&&(!x.cardType||x.cardType==='unknown'||x.cardType===c.type))x.cardId=c.id}})}
function delCard(id){data.cards=data.cards.filter(c=>c.id!==id);data.tx.forEach(x=>{if(x.cardId===id)x.cardId=null});save()}   /* transactions are kept */
function cardSpend(c){return data.tx.filter(x=>{if(x.type!=='expense'||x.date.slice(0,7)!==month)return false;const s=savedCardFor(x);return s&&s.id===c.id}).reduce((a,x)=>a+x.amount,0)}
function renderCards(){$('clist').innerHTML=data.cards.map(c=>`<div class="tx" style="cursor:default"><div><div class="mer">${esc(c.nickname||c.bank||'Card')}${c.nickname&&c.bank?' <span class="small">· '+esc(c.bank)+'</span>':''}</div><div class="meta">${c.type==='credit'?ICO.credit+'Credit card':ICO.card+'Debit card'} · ••••${esc(c.last4)} · ${money(cardSpend(c))} in ${ml(month)}</div>${c.notes?'<div class="small">'+esc(c.notes)+'</div>':''}</div><button class="sm b2" onclick="delCard('${c.id}')">✕</button></div>`).join('')||'<div class="empty">No cards saved yet</div>'}
function setMethod(v){$('method').value=v;document.querySelectorAll('#seg .mb').forEach(b=>b.classList.toggle('on',b.dataset.m===v));updateCardSel()}
function segVis(){$('seg').style.display=$('type').value==='income'?'none':'';updateCardSel();syncType()}
function fill(x){curEst=!!x.timeEst;estTime=x.time||'';
 const l4=x.cardLast4||x.card4||'';
 curCard=l4?{card4:l4,cardLabel:x.cardLabel||('••••'+l4),cardId:x.cardId||null,cardType:x.cardType||''}:null;
 curImport=x.source==='message'?x:null;curBank=x.bank||'';
 $('type').value=x.type;setMethod(['cash','card','credit'].includes(x.method)?x.method:'card');segVis();
 $('merchant').value=x.merchant;$('amount').value=x.amount;$('category').value=x.category;$('date').value=x.date;$('time').value=x.time||'';
 $('notes').value=x.notes||'';$('fmsg').textContent='';
 const ob=$('origBox');
 if(x.originalDescription){ob.style.display='';ob.open=false;$('origTxt').textContent='Message:\n'+x.originalDescription+(x.autoMerchant?'\n\nOriginal merchant: '+x.autoMerchant:'')+(x.autoCategory?'\nOriginal category: '+x.autoCategory:'')+(x.externalTransactionId?'\nReference: '+x.externalTransactionId:'')+(x.bank?'\nBank: '+x.bank:'')+(x.importedAt?'\nImported: '+x.importedAt.slice(0,16).replace('T',' '):'')}
 else ob.style.display='none';syncCat()}
function openAdd(t,m2){editId=null;pendId=null;$('smsCard').style.display='';$('sms').value='';$('smsMsg').textContent='';$('addTitle').textContent='Add transaction';$('delBtn').style.display='none';
 fill({time:nowTime(),timeEst:true,type:t||'expense',method:m2||'card',merchant:'',amount:'',category:cats[0],date:month===today().slice(0,7)?today():month+'-01'});show('add')}
function openEdit(id){pendId=null;$('smsCard').style.display='none';const x=data.tx.find(t=>t.id===id);if(!x)return;editId=id;$('addTitle').textContent='Edit transaction';$('delBtn').style.display='block';fill(x);show('add')}
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
/* ===== BEGIN import-core (no DOM access: this block is unit-tested) ===== */
/* Local merchant -> category rules. Add a line here to teach the app a new merchant. First match wins. */
const MERCHANT_RULES=[
 ['Groceries',/carrefour|\blulu\b|spinneys|union\s?coop|choithrams|waitrose|\bnesto\b|al\s?maya|grocer|supermarket|hypermarket|farm\s?fresh/],
 ['Fuel',/\badnoc\b|\benoc\b|eppco|\bemarat\b|petrol|\bfuel\b|service station/],
 ['Transport',/\bdarb\b|\bsalik\b|careem|\buber\b|\btaxi\b|\brta\b|\bmetro\b|\bnol\b|parking|mawaqif|\bbus\b/],
 ['Food',/restaurant|\bcafe\b|caf\u00e9|coffee|starbucks|mcdonald|\bkfc\b|burger|pizza|shawarma|bakery|talabat|deliveroo|zomato|kitchen|\bgrill\b|diner|tim hortons/],
 ['Medical',/pharmacy|clinic|hospital|medical|\baster\b|\bnmc\b|dental|medicine|\bhealth/],
 ['Education',/school|nursery|university|college|tuition|academy|education/],
 ['Bills',/\bdewa\b|\baddc\b|\bsewa\b|etisalat|\bdu\b|e&|utility|telecom|\bbill\b/],
 ['Insurance',/insurance|takaful/],
 ['Rent',/\brent\b|ejari/],
 ['Car',/garage|\btyre\b|\btire\b|car wash|service centre|\bautos?\b/]
];
function guessCat(t){t=String(t||'').toLowerCase();for(const [c,re] of MERCHANT_RULES)if(re.test(t))return c;return 'Uncategorized'}

const BANKS=[['ADCB',/\badcb\b/],['FAB',/\bfab\b|first abu dhabi/],['Emirates NBD',/\benbd\b|emirates nbd/],['Mashreq',/\bmashreq\b/],['DIB',/\bdib\b|dubai islamic/],['ADIB',/\badib\b/],['RAKBANK',/\brakbank\b/],['CBD',/\bcbd\b|commercial bank of dubai/],['NBF',/\bnbf\b/],['HSBC',/\bhsbc\b/],['Citi',/\bciti(?:bank)?\b/],['Standard Chartered',/standard chartered|\bscb\b/],['Emirates Islamic',/emirates islamic/],['Wio',/\bwio\b/],['HDFC',/\bhdfc\b/],['ICICI',/\bicici\b/],['SBI',/\bsbi\b/],['Axis',/\baxis bank\b/],['Kotak',/\bkotak\b/]];
function detectBank(t){const L=t.toLowerCase();for(const [n,re] of BANKS)if(re.test(L))return n;
 const m=t.match(/^\s*([A-Za-z][A-Za-z .&]{1,20}?)\s*:\s/);
 if(m&&!/^(your|dear|alert|purchase|transaction|notification|info|otp|hi|hello|thank|card|debit|credit|aed|sms|message)\b/i.test(m[1]))return m[1].trim();
 return ''}
const CURTOK={AED:'AED',DH:'AED',DHS:'AED',INR:'INR',RS:'INR','\u20b9':'INR',SAR:'SAR',QAR:'QAR',KWD:'KWD',BHD:'BHD',OMR:'OMR',PKR:'PKR',USD:'USD','$':'USD',EUR:'EUR','\u20ac':'EUR',GBP:'GBP','\u00a3':'GBP'};
function curOf(tok){return CURTOK[String(tok).replace(/\./g,'').toUpperCase()]||''}
const BRAND={adnoc:'ADNOC',enoc:'ENOC',kfc:'KFC',darb:'DARB',rta:'RTA',dewa:'DEWA',addc:'ADDC',sewa:'SEWA',nol:'NOL',lulu:'Lulu',nmc:'NMC',uae:'UAE',ikea:'IKEA',tamm:'TAMM',moi:'MOI',dhl:'DHL',aadc:'AADC',fedex:'FedEx',du:'du',atm:'ATM'};
function niceName(s){s=String(s||'').trim();if(!s||/[a-z]/.test(s))return s;return s.toLowerCase().replace(/[a-z0-9']+/g,w=>BRAND[w]||w.charAt(0).toUpperCase()+w.slice(1))}
/* The original message is kept, but never with a full card/account number, OTP, CVV or PIN. */
function cleanOriginal(t){let s=String(t||'').replace(/\s+/g,' ').trim().slice(0,1000);
 s=s.replace(/\b(otp|cvv|cvc|pin|password|passcode)\b([^0-9]{0,20})\d{3,8}/gi,'$1$2\u2022\u2022\u2022\u2022');
 s=s.replace(/\b(?:\d[ -]?){12,19}\b/g,m=>'\u2022\u2022\u2022\u2022'+m.replace(/\D/g,'').slice(-4));
 s=s.replace(/\b\d{10,11}\b/g,m=>'\u2022\u2022\u2022\u2022'+m.slice(-4));
 return s}
function findRef(t){const m=t.match(/\b(?:ref(?:erence)?|txn|trx|transaction|rrn|utr)\b[\s.:#]*(?:(?:no|number|id|code)\b[\s.:#]*)*([A-Za-z0-9][A-Za-z0-9-]{4,24})/i);
 if(!m)return '';const v=m[1].toUpperCase();return /\d{3,}/.test(v)?v:''}
const KIND_TITLE={card_purchase:'Card Transaction',atm_withdrawal:'ATM Withdrawal',transfer:'Transfer',income:'Money Received',refund:'Refund'};
function txKind(t,type){const L=t.toLowerCase();
 if(type==='income')return /refund|reversal|reversed/.test(L)?'refund':'income';
 if(/\batm\b|cash withdrawal|withdrawn|withdrawal/.test(L))return 'atm_withdrawal';
 if(/\btransfer(?:red)?\b|\biban\b|sent to/.test(L))return 'transfer';
 return 'card_purchase'}
function cardTypeIn(t){const c=t.search(/credit\s*card|\bcc\b/i),d=t.search(/debit\s*card|\bdc\b|\batm card\b/i);
 if(c<0&&d<0)return '';if(d<0)return 'credit';if(c<0)return 'debit';return c<d?'credit':'debit'}

function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
const mnorm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const exactTime=x=>x.source==='message'&&!!x.time&&!x.timeEst;       /* the time came from the bank message */
const sameBank=(a,b)=>{a=(a||'').toLowerCase();b=(b||'').toLowerCase();return !a||!b||a===b};

/* DUPLICATES.  Strong = same bank reference ID, or (no ID) the same fingerprint of
   date+time+amount+merchant+card last4+type+bank.  Two different reference IDs are never duplicates. */
function strongDup(r,list){return list.find(x=>{
 if(r.externalTransactionId&&x.externalTransactionId)return r.externalTransactionId===x.externalTransactionId&&sameBank(x.bank,r.bank);
 return !!r.dedupeKey&&x.dedupeKey===r.dedupeKey})}
/* Weak = same day, amount and merchant but no exact time on one side: could be a repeat or a legitimate second purchase -> the user decides. */
function weakDup(r,list){const mn=mnorm(r.merchant),l4=r.cardLast4||'';
 return list.find(x=>x.type===r.type&&Math.abs(x.amount-r.amount)<0.005&&x.date===r.date&&(mnorm(x.merchant)===mn||mnorm(x.autoMerchant)===mn)&&!(exactTime(x)&&r.timeFound)&&!(l4&&(x.cardLast4||x.card4)&&l4!==(x.cardLast4||x.card4)))}
/* Legacy tombstones from deleted imports are retained for compatibility, but never block re-import. Duplicate checks use current saved transactions and current Review queue only. */
function tomb(x){return{ref:x.externalTransactionId||'',bank:x.bank||'',fp:x.dedupeKey||'',wk:{date:x.autoDate||x.date,amount:x.autoAmount||x.amount,mn:mnorm(x.autoMerchant||x.merchant),c4:x.cardLast4||x.card4||''},deletedAt:new Date().toISOString()}}
function ignoredHit(r){return data.ignored.find(g=>{
 if(r.externalTransactionId&&g.ref)return r.externalTransactionId===g.ref&&sameBank(g.bank,r.bank);
 if(r.dedupeKey&&g.fp)return r.dedupeKey===g.fp;
 if(r.timeFound&&g.fp)return false;
 return !!g.wk&&g.wk.date===r.date&&Math.abs(g.wk.amount-r.amount)<0.005&&g.wk.mn===mnorm(r.merchant)&&(!g.wk.c4||!r.cardLast4||g.wk.c4===r.cardLast4)})}

function savedCardFor(x){if(x.cardId){const c=data.cards.find(c=>c.id===x.cardId);if(c)return c}
 const l4=x.cardLast4||x.card4;if(!l4)return null;const m=data.cards.filter(c=>c.last4===l4);
 if(m.length>1&&x.bank){const b=m.filter(c=>c.bank&&c.bank.toLowerCase()===x.bank.toLowerCase());if(b.length)return b[0]}
 return m[0]||null}
/* What the card line says. Works with no saved cards at all. */
function cardInfo(x){const c4=x.cardLast4||x.card4||'',saved=savedCardFor(x);
 let t=x.cardType;if(t!=='credit'&&t!=='debit'&&t!=='unknown')t=x.method==='credit'?'credit':(x.method==='card'?'debit':'');
 if(t==='unknown'&&saved)t=saved.type;
 const nm=t==='credit'?'Credit Card':t==='debit'?'Debit Card':(c4?'Unknown Card':'');
 const ic=t==='credit'?ICO.credit:ICO.card;
 if(x.method==='cash'&&!c4)return{text:'Cash',icon:ICO.cash};
 if(c4)return{text:nm+' \u2022\u2022\u2022\u2022'+c4,icon:ic};
 if(nm)return{text:nm,icon:ic};
 return{text:'Card: Not specified',icon:ICO.card}}
function fmtAmt(x){const own=x.currency&&x.currency!==data.currency&&CURS[x.currency],n=Number(x.amount);
 const s=Number.isInteger(n)?n.toLocaleString(LOC()):n.toLocaleString(LOC(),{minimumFractionDigits:2,maximumFractionDigits:2});
 return (own?CURS[x.currency]:P())+s}

function importMeta(r){return{source:'message',originalDescription:r.originalDescription||'',externalTransactionId:r.externalTransactionId||'',dedupeKey:r.dedupeKey||'',bank:r.bank||'',currency:r.currency||data.currency,transactionType:r.transactionType||'card_purchase',autoCategory:r.autoCategory||r.category,autoMerchant:r.autoMerchant||r.merchant,autoAmount:r.autoAmount||r.amount,autoDate:r.autoDate||r.date,importedAt:r.importedAt||new Date().toISOString(),status:'confirmed',sourceAccount:'',dateEst:!!r.dateEst}}
function removeTx(id){const x=data.tx.find(t=>t.id===id);if(!x)return false;
 if(x.source==='message'){data.ignored.push(tomb(x));if(data.ignored.length>500)data.ignored.splice(0,data.ignored.length-500)}
 data.tx=data.tx.filter(t=>t.id!==id);return true}
/* IMPORT: parse -> check CURRENT saved/pending transactions -> save. Deleted history must not block a deliberate re-import. */
function importMessage(text,opts){opts=opts||{};
 const r=parseSms(text);if(!r)return{status:'invalid'};
 const live=[...data.tx,...data.pending];
 if(strongDup(r,live))return{status:'duplicate',r};
 /* No time and no reference ID: the identical message text is the only identifier, so the same text again = the same message processed again. */
 if(!opts.force&&!r.dedupeKey&&!r.externalTransactionId&&live.find(x=>x.originalDescription&&x.originalDescription===r.originalDescription))return{status:'duplicate',r,weak:true};
 if(!opts.force){const w=weakDup(r,live);
  if(w){if(data.pending.includes(w))return{status:'duplicate',r,weak:true};   /* already waiting for review: do not pile up copies */
   if(opts.received)applyReceived(r,opts.received);
   addPending(r,true);return{status:'review',r}}}
 if(opts.received)applyReceived(r,opts.received);
 if(REVIEW_FIRST){addPending(r,false);return{status:'review',r,fresh:true}}
 const m=r.date.slice(0,7),b0=expTotal(m),tx={...r,id:newId()};
 data.tx.push(tx);month=m;save();afterCross(m,b0);
 return{status:'added',tx,r}}
/* ===== END import-core ===== */
function nowTime(){const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function parseWhen(t){
 let date='',m;const yr=v=>+v<100?2000+ +v:+v,ok=(mo,d)=>mo>=1&&mo<=12&&d>=1&&d<=31;
 if((m=t.match(/\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/))&&ok(+m[2],+m[3]))date=m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);
 if(!date)for(const x of t.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?[-\/ .]*([A-Za-z]{3})[a-z]*\.?[-\/ ,.']*(\d{2,4})\b/g)){const mo=MON[x[2].toLowerCase()];if(mo&&ok(mo,+x[1])){date=yr(x[3])+'-'+pad(mo)+'-'+pad(+x[1]);break}}
 if(!date)for(const x of t.matchAll(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)){const mo=MON[x[1].toLowerCase()];if(mo&&ok(mo,+x[2])){date=x[3]+'-'+pad(mo)+'-'+pad(+x[2]);break}}
 if(!date&&(m=t.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/))){let a=+m[1],b=+m[2];if(b>12&&a<=12)[a,b]=[b,a];if(ok(b,a))date=yr(m[3])+'-'+pad(b)+'-'+pad(a)}
 let time='';m=t.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?/);
 if(m){let h=+m[1];const mi=+m[2];if(h<24&&mi<60){if(m[3]){const pm=/p/i.test(m[3]);if(pm&&h<12)h+=12;if(!pm&&h===12)h=0}time=pad(h)+':'+String(mi).padStart(2,'0')}}
 return {date,time}}
/* Merchant when the message has no "at ..." wording: remove everything that is NOT a merchant (amount, date, time, card, reference, bank,
   filler words) and see what is left. Exactly one clean candidate = the merchant. Several / none = unknown (never guessed). */
const GM_NON=new Set('account statement withdrawal atm transfer salary refund fee fees charge charges reversal deposit emi installment cashback points reward rewards customer message sms call contact helpline visit branch ready due minimum outstanding overdue bill balance available thank welcome offer sale update important today tomorrow yesterday now'.split(' '));
const GM_FILL=new Set(('card cards transaction transactions txn trx purchase purchased spent spend paid pay payment payments pos debited debit credited credit using used use with via on at of for to from your you a an the has have been was is are were successful successfully thank thanks bank alert notification notice avl available balance bal ref reference no number ending end xx account acct dear customer sir madam amount amt aed dhs dh inr rs sar qar kwd bhd omr pkr usd eur gbp id ok online contactless tap declined failed unsuccessful insufficient funds reversed cancelled canceled limit exceeded pending hold approved authorised authorized otp code').split(' '));
function guessMerchant(t,bank){
 let s=' '+String(t||'')+' ';
 s=s.replace(/https?:\/\/\S+|www\.\S+/gi,' | ');
 s=s.replace(/(?:AED|DHS?\.?|INR|RS\.?|\u20b9|SAR|QAR|KWD|BHD|OMR|PKR|USD|\$|EUR|\u20ac|GBP|\u00a3)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:AED|DHS?|INR|RS|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\b/gi,' | ');
 s=s.replace(/\b\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}\b|\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?[-\/ .]*[A-Za-z]{3,9}\.?[-\/ ,.']*\d{2,4}\b|\b[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/g,' | ');
 s=s.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?/g,' | ');
 s=s.replace(/\b(?:(?:debit|credit)\s+)?card\b(?:\s*(?:no\.?|number|ending(?:\s+(?:with|in))?))?\s*(?:[x*\u2022]{2,}[ -]*)*(?:\d{4}[ -]){0,3}\d{4}\b/gi,' | ');
 s=s.replace(/\b(?:ref(?:erence)?|txn|trx|rrn)\.?\s*(?:no\.?|number|id)?\s*[:#]?\s*[A-Za-z0-9-]{5,}/gi,' | ');
 if(bank)s=s.replace(new RegExp('\\b'+bank.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),' | ');
 const cands=[],isF=x=>GM_FILL.has(x.toLowerCase().replace(/[^a-z\/]/g,''));
 for(const seg of s.split(/[|,;:\n\u2013\u2014]+|\s-\s|\s-(?=\s*$)|^\s*-\s/)){
  const w=seg.replace(/[()\[\]"'.!?]+/g,' ').trim().split(/\s+/).filter(Boolean);
  while(w.length&&isF(w[0]))w.shift();while(w.length&&isF(w[w.length-1]))w.pop();
  const c=w.join(' ');
  if(c.length>=2&&c.length<=40&&w.length<=6&&/[A-Za-z]{2}/.test(c)&&!/^(?:mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i.test(c)&&!/^[x*\u2022\d\s-]+$/.test(c)&&/^[A-Z0-9]/.test(c)&&!w.some(x=>GM_NON.has(x.toLowerCase().replace(/[^a-z]/g,''))))cands.push(c)}
 const uniq=[...new Set(cands)];
 return uniq.length===1?uniq[0]:''}   /* exactly one clean piece of text left = it is the merchant; anything else = no merchant (never chosen by category) */
/* ===== CATEGORY SUGGESTION: keyword match on the MERCHANT NAME only (never on the whole message, never changes the merchant) =====
   Case-insensitive, whole words/phrases. The LONGEST matching keyword wins (so "Careem Food" is Delivery, not Transport);
   Fuel always wins if any fuel keyword is present; a tie goes to the category listed first. Merchant found but no keyword = Other.
   No merchant in the message = Unassigned. The user can change it in Review. */
const CAT_KW={
 Groceries:['Supermarket','Hypermarket','Hyper Mkt','Hyper MKT','Hypermarket','Baqala','Grocery','Groceries','Carrefour','Lulu','Spinneys','Nesto','Waitrose','Grandiose','Choithrams','Al Maya','Viva','West Zone','Spar','Market','Minimart','Mini Mart'],
 Fuel:['ADNOC','ENOC','Emarat','Petrol','Fuel','Gas Station','Filling Station','Service Station'],
 Food:['Restaurant','Cafe','Café','Food','Dining','Coffee','Bakery','Biryani','Pizza','Burger','Grill','Kitchen','Catering','Juice','Sweets','Shawarma'],
 Transport:['DARB','Toll','Salik','Parking','Mawaqif','Taxi','Cab','Uber','Careem','Bus','Metro','RTA'],
 Medical:['Pharmacy','Medical','Clinic','Hospital','Doctor','Dental','Dentist','Laboratory','Lab','Medicine','Healthcare'],
 Education:['School','Nursery','Tuition','Education','Academy','Training','College','University'],
 Shopping:['Amazon','Noon','Shopping','Mall','Fashion','Clothing','Shoes','Electronics'],
 Bills:['Electricity','Water','ADDC','DEWA','SEWA','AADC','Etisalat','du','Telecom','Internet','Mobile','Telephone','Bill'],
 Travel:['Hotel','Airbnb','Accommodation','Resort','Booking','Agoda','Flight','Airline','Airport','Travel','Tourism'],
 Entertainment:['Cinema','Entertainment','Games','Movie','Gaming','Theme Park','Netflix','Spotify','Subscription'],
 Home:['Home Centre','Home Box','IKEA','Hardware','Furniture','Appliance','Maintenance','Plumbing','Electrical'],
 'Personal Care':['Salon','Barber','Haircut','Beauty','Spa','Massage','Cosmetics','Skincare','Nails'],
 Pets:['Pet','Veterinary','Vet','Pet Shop','Animal Clinic','Pet Food'],
 Technology:['Computer','Laptop','Mobile','Phone','Apple','Samsung','Software','IT','Accessories','Gadgets'],
 'Banking/Finance':['Bank','ATM','Transfer','Cash Withdrawal','Deposit','Credit Card Fee','Bank Fee','Interest'],
 'Government/Services':['Government','TAMM','MOI','Police','Traffic','Municipality','Immigration','Emirates ID','License'],
 Gifts:['Gift','Flowers','Florist','Toys','Jewellery','Jewelry'],
 Delivery:['Delivery','Courier','DHL','FedEx','Aramex','Talabat','Deliveroo','Careem Food']};
const kwNorm=v=>' '+String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const CAT_KW_N=Object.entries(CAT_KW).map(([c,l])=>[c,[...new Set(l.map(kwNorm))]]);
function suggestCategory(name){const t=kwNorm(name);if(!t.trim())return 'Other';let best='',bl=0;
 for(const [c,l] of CAT_KW_N)for(const k of l)if(t.includes(k)){if(c==='Fuel')return 'Fuel';if(k.length>bl){bl=k.length;best=c}}
 return best||'Other'}
function parseSms(t){
 t=String(t||'');
 let m=t.match(/(?:^|[^A-Za-z])(AED|DHS?\.?|INR|RS\.?|\u20b9|SAR|QAR|KWD|BHD|OMR|PKR|USD|\$|EUR|\u20ac|GBP|\u00a3)\s*([\d,]+(?:\.\d+)?)/i),cur='',num='';
 if(m){cur=curOf(m[1]);num=m[2]}
 else{m=t.match(/([\d,]+(?:\.\d+)?)\s*(AED|DHS?|INR|RS|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\b/i);if(!m)return null;num=m[1];cur=curOf(m[2])}
 const amount=parseFloat(num.replace(/,/g,''));if(!(amount>0))return null;
 const type=/credited|credit of|received|deposited|deposit of|salary|refund|reversal/i.test(t)?'income':'expense';
 const kind=txKind(t,type);
 const stop='(?=\\s+(?:on|dated|date|using|with|via|avail|available|bal|balance|ref|txn|for|has)\\b|\\s+(?:(?:and|then|also|plus)\\s+)?(?:AED|DHS?\\.?|INR|RS\\.?|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\\s*[\\d,]+(?:\\.\\d+)?|[.,;]|\\s+\\d{1,4}[-\\/]|\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]{3}|\\s+\\d{1,2}:\\d{2}|$)';
 /* Bank templates often use labelled fields like `At: MERCHANT, CITY`; handle these before prose-style `at MERCHANT`. */
 let mm=t.match(/(?:^|\n)\s*(?:At|Merchant|Location)\s*:\s*([^\n]+)/i);
 if(mm){mm[1]=mm[1].replace(/\s*,\s*(?:ABUDHABI|ABU DHABI|DUBAI|SHARJAH|AJMAN|UAE)\b.*$/i,'').trim();}
 if(!mm)mm=t.match(new RegExp('\\b(?:at|@)\\s+(.+?)'+stop,'i'))||(type==='income'?t.match(new RegExp('\\bfrom\\s+(?!your\\b)(.+?)'+stop,'i')):null);
 if(mm&&/^\d{1,2}[:.\/-]\d/.test(mm[1].trim()))mm=null;
 let raw=mm?mm[1].trim().replace(/\\s+(?:and|then|also|plus)$/i,'').trim():'';
 if(!raw&&type==='expense'&&kind!=='atm_withdrawal')raw=guessMerchant(t,detectBank(t));
 const merchant=raw?niceName(raw):'';   /* never a made-up label such as "Income" or "Unknown merchant" */   /* never "Unknown merchant": it becomes Needs Review */
 const merchantUnknown=type==='expense'&&!merchant;
 let category='Unassigned';
 if(type==='expense'&&merchant&&SUGGEST_CATEGORY)category=suggestCategory(merchant);   /* suggest from the extracted merchant only; unknown merchant = Unassigned, never infer from unrelated SMS words */
 /* last 4 digits of the card: works for "ending 4821", "XX4821", "**** **** 2233" and a full spaced number (always takes the LAST group) */
 const cs=(t.match(/card[^\d]{0,30}?(?:\d{4}[ -])?(?:(?:x{2,}|\*{2,}|\u2022{2,})[ -]*)+(\d{4})\b/i)||t.match(/card[^\d]{0,20}\d{4}[ -]\d{4}[ -]\d{4}[ -](\d{4})\b/i)||t.match(/card[^\d]{0,20}(\d{4})\b(?![ -]*(?:x{2,}|\*{2,}|\u2022{2,}))/i)||[])[1]||'';
 const ca=(t.match(/(?:a\/c|acct|account)[^\d]{0,20}(\d{4})\b/i)||t.match(/(?:x{2,}|\*{2,}|ending(?:\s+with|\s+in)?)\s*(\d{4})\b/i)||[])[1]||'';
 const bank=detectBank(t),txt=cardTypeIn(t);
 const mc=type==='expense'?matchCard(t,cs||ca):null;
 const c4=mc?mc.last4:(type==='expense'?cs:'');
 let cardType=c4?(txt||(mc?mc.type:'unknown')):(type==='expense'?txt:'');
 const cardId=mc&&(!txt||txt===mc.type)?mc.id:null;
 const method=cardType==='credit'?'credit':(cardType==='debit'||cardType==='unknown'?'card':'');
 const w=parseWhen(t),date=w.date||today(),mn=mnorm(merchant);
 const ref=findRef(t);
 const fp=w.time?[date,w.time,amount.toFixed(2),mn,c4||'-',kind,(bank||'-').toLowerCase()].join('|'):'';
 return {source:'message',type,transactionType:kind,amount,autoAmount:amount,currency:cur||data.currency,merchant,autoMerchant:merchant,category,autoCategory:category,
  date,autoDate:date,time:w.time||nowTime(),timeEst:!w.time,timeFound:!!w.time,dateFound:!!w.date,dateEst:!w.date,
  method,cardType,cardLast4:c4,card4:c4,cardId,cardLabel:c4?(mc?cardLabelOf(mc):'\u2022\u2022\u2022\u2022'+c4):'',
  bank,externalTransactionId:ref,dedupeKey:fp,originalDescription:cleanOriginal(t),importedAt:new Date().toISOString(),status:'confirmed',sourceAccount:'',notes:'',...(merchantUnknown?{needsReview:true,reviewReason:'Merchant could not be identified'}:{})}}
function detect(){const r=parseSms($('sms').value);
 if(!r){$('smsMsg').textContent='Could not find an amount. The message needs something like "'+data.currency+' 123.45".';return}
 fill(r);const wh=(r.dateFound?'Date taken from the message: '+fd(r.date)+(r.timeFound?', '+r.time:''):'No date found in the message, so today was used. Please check the date')+(r.timeFound?'':'. No time in the message, so the time you pasted it ('+r.time+') was used');
 $('smsMsg').textContent='Filled in below'+(r.cardLabel?' (card '+r.cardLabel+')':'')+'. '+wh+'. Then press Save.';$('merchant').scrollIntoView({block:'center'})}
async function pasteClip(){try{$('sms').value=await navigator.clipboard.readText();detect()}catch(e){$('smsMsg').textContent='Could not read the clipboard. Paste into the box and press Detect.'}}
function expTotal(m){return data.tx.filter(x=>x.type==='expense'&&x.date.slice(0,7)===m).reduce((a,x)=>a+x.amount,0)}
function afterCross(m,b){const a=expTotal(m),msgs=[];
 data.alerts.forEach(l=>{if(b<l&&a>=l)msgs.push('Alert: '+ml(m)+' spending reached '+P()+n0(l)+' (now '+P()+n0(a)+')')});
 if(data.budget>0&&b<=data.budget&&a>data.budget)msgs.push('Over your monthly budget of '+P()+n0(data.budget)+' by '+P()+n0(a-data.budget));
 if(msgs.length){const t=$('toast');t.innerHTML='⚠️ '+msgs.join('<br>⚠️ ')+'<div style="font-size:11px;font-weight:500;margin-top:6px;opacity:.85">Tap to dismiss</div>';t.style.display='block';try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}}
function addAlert(e){e.preventDefault();const v=Number($('ainput').value);if(v>0&&!data.alerts.includes(v)){data.alerts.push(v);data.alerts.sort((x,y)=>x-y)}$('ainput').value='';save()}
function delAlert(v){data.alerts=data.alerts.filter(x=>x!==v);save()}
function renderAlerts(){
 const exp=expTotal(month),lv=[...data.alerts].sort((x,y)=>x-y),hit=lv.filter(l=>exp>=l),next=lv.find(l=>exp<l),lines=[];
 if(data.budget>0&&exp>data.budget)lines.push('Over budget by '+P()+n0(exp-data.budget));
 if(hit.length)lines.push('Passed your '+P()+n0(hit[hit.length-1])+' alert (spent '+P()+n0(exp)+')');
 let h='';
 if(lines.length)h+=`<div class="card warn"><strong>⚠️ ${lines.join('<br>⚠️ ')}</strong></div>`;
 if(next)h+=`<div class="chip" style="margin:12px 14px"><span class="small">Next alert at ${P()}${n0(next)} · ${P()}${n0(next-exp)} to go</span></div>`;
 $('abanner').innerHTML=h;
 if(data.budget>0){const left=data.budget-exp;$('brem').innerHTML=`<div class="row"><span>${left>=0?'Remaining':'Over budget by'}</span><strong class="${left>=0?'g':'r'}">${money(Math.abs(left))}</strong></div><div class="small" style="margin-top:4px">Spent ${money(exp)} of ${money(data.budget)} (${Math.round(exp/data.budget*100)}%) in ${ml(month)}</div>`}
 else $('brem').innerHTML='<div class="small">Set a monthly budget above to see what is remaining.</div>';
 $('alist').innerHTML=lv.map(l=>`<div class="tx" style="cursor:default"><div><div class="mer">${P()}${n0(l)}</div><div class="meta ${exp>=l?'r':''}">${exp>=l?'Reached in '+ml(month):P()+n0(l-exp)+' to go in '+ml(month)}</div></div><button class="sm b2" onclick="delAlert(${l})">✕</button></div>`).join('')||'<div class="empty">No alerts yet</div>'}
function renderDetails(){
 const tx=data.tx.filter(x=>x.date.slice(0,7)===month),sm=f=>tx.filter(f).reduce((a,x)=>a+x.amount,0),A=v=>P()+n0(v);
 const inc=sm(x=>x.type==='income'),ex=sm(x=>x.type==='expense'),cash=sm(x=>x.type==='expense'&&x.method==='cash'),card=sm(x=>x.type==='expense'&&x.method==='card'),credit=sm(x=>x.type==='expense'&&x.method==='credit'),other=ex-cash-card-credit;
 const R=(l,v,c)=>`<div class="tx"><span>${l}</span><strong class="${c||''}">${v}</strong></div>`;
 let h='';
 if(data.budget>0){const left=data.budget-ex;h+=R('Budget',A(data.budget))+R('Overall spend',A(ex),'r')+R(left>=0?'Left':'Over by',A(Math.abs(left)),left>=0?'g':'r')}
 else h+=R('Budget','Not set')+R('Overall spend',A(ex),'r');
 h+=R('Income',A(inc),'g')+R('Income − spent',(inc-ex<0?'-':'')+A(Math.abs(inc-ex)),inc-ex>=0?'g':'r')+R(ICO.cash+'Cash spend',A(cash))+R(ICO.card+'Card spend',A(card))+R(ICO.credit+'Credit card spend',A(credit));
 if(other>0.004)h+=R('Not marked',A(other));
 [...data.alerts].sort((a,b)=>a-b).forEach(l=>{h+=R('Alert '+n0(l),ex>=l?'Reached':A(l-ex)+' to go',ex>=l?'r':'')});
 $('adet').innerHTML='<strong>Limit details · '+ml(month)+'</strong>'+h+`<button class="b2 sm" style="margin-top:10px" onclick="show('budget')">${data.budget>0?'Change limit':'Set limit'}</button>`}
function renderDonut(){
 const t=ct(month),en=Object.entries(t).sort((a,b)=>b[1]-a[1]),tot=en.reduce((a,x)=>a+x[1],0),C=351.86;
 const col=['#4f7cff','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#64748b','#a16207'];
 let cum=0,g='';
 en.forEach(([c,v],i)=>{const len=v/tot*C;g+=`<circle cx="70" cy="70" r="56" fill="none" stroke="${catUI(c)[1]}" stroke-width="11" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-cum}"/>`;cum+=len});
 $('dseg').innerHTML=g;
 const mt=data.tx.filter(x=>x.date.slice(0,7)===month),sm=f=>mt.filter(f).reduce((a,x)=>a+x.amount,0),A=v=>P()+n0(v);
 const inc=sm(x=>x.type==='income'),cash=sm(x=>x.type==='expense'&&x.method==='cash'),card=sm(x=>x.type==='expense'&&x.method==='card'),credit=sm(x=>x.type==='expense'&&x.method==='credit'),other=tot-cash-card-credit;
 const R=(l,v,c)=>`<div class="tx"><span>${l}</span><strong class="${c||''}">${v}</strong></div>`;
 const sum=R('Overall spend',A(tot),'r')+R('Income',A(inc),'g')+R(ICO.cash+'Cash spend',A(cash))+R(ICO.card+'Card spend',A(card))+R(ICO.credit+'Credit card spend',A(credit))+(other>0.004?R('Not marked',A(other)):'');$('dtot').textContent=P()+n0(tot);$('dmon').textContent=ml(month);
 $('dleg').innerHTML='<strong>Spending details · '+ml(month)+'</strong>'+sum+'<div class="small" style="margin-top:12px">By category</div>'+(en.map(([c,v],i)=>`<div class="tx"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${catUI(c)[1]};margin-right:6px"></i>${esc(c)}</span><strong>${n0(v)} <span class="small">${Math.round(v/tot*100)}%</span></strong></div>`).join('')||'<div class="small" style="margin-top:8px">No expenses this month</div>')}
let rng={from:'',to:'',m:''};
const rangeOn=()=>!!(rng.from||rng.to);
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fd(s){const [y,m,d]=s.split('-').map(Number);return d+' '+MN[m-1]+' '+y}
function rtx(){return data.tx.filter(x=>(!rng.from||x.date>=rng.from)&&(!rng.to||x.date<=rng.to)&&(!rng.m||(x.type==='expense'&&x.method===rng.m))).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')))}
function preset(k){const n=new Date(),f=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());let a,b;
 if(k==='m0'){a=new Date(n.getFullYear(),n.getMonth(),1);b=n}
 else if(k==='m1'){a=new Date(n.getFullYear(),n.getMonth()-1,1);b=new Date(n.getFullYear(),n.getMonth(),0)}
 else{a=new Date(n.getFullYear(),n.getMonth(),n.getDate()-29);b=n}
 $('rf').value=f(a);$('rt').value=f(b);setRange()}
function setRange(){rng.from=$('rf').value;rng.to=$('rt').value;rng.m=$('rm').value;render()}
function clearRange(){rng={from:'',to:'',m:''};$('rf').value='';$('rt').value='';$('rm').value='';render()}
function renderRange(){
 const on=rangeOn();$('rclr').style.display=on?'':'none';
 if(!on){$('rsum').innerHTML='<div class="small" style="margin-top:10px">Pick From and To dates to see everything spent in between, for example a credit card billing cycle.</div>';return}
 if(rng.from&&rng.to&&rng.from>rng.to){$('rsum').innerHTML='<div class="small r" style="margin-top:10px">The From date must be before the To date.</div>';return}
 const r=rtx(),ex=r.filter(x=>x.type==='expense'),sm=(a,f)=>a.filter(f).reduce((q,x)=>q+x.amount,0);
 const spent=sm(ex,()=>true),inc=sm(r,x=>x.type==='income'),card=sm(ex,x=>x.method==='card'),cash=sm(ex,x=>x.method==='cash'),credit=sm(ex,x=>x.method==='credit'),oth=spent-card-cash-credit;
 const t={};ex.forEach(x=>t[x.category]=(t[x.category]||0)+x.amount);
 const R=(l,v,c)=>`<div class="tx" style="cursor:default;padding:8px 0"><span>${l}</span><strong class="${c||''}">${v}</strong></div>`;
 const lab=(rng.from?fd(rng.from):'Start')+' – '+(rng.to?fd(rng.to):'today');
 $('rsum').innerHTML=`<div style="margin-top:12px"><strong>${lab}</strong><div class="small">${r.length} transaction${r.length===1?'':'s'}</div>`+R('Total spent',money(spent),'r')+(rng.m?'':R('Income',money(inc),'g'))+R(ICO.card+'Card / transfer',money(card))+R(ICO.credit+'Credit card',money(credit))+R(ICO.cash+'Cash',money(cash))+(oth>0.004?R('Not marked',money(oth)):'')+(Object.keys(t).length?'<div class="small" style="margin-top:10px">By category</div>'+Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([c,v])=>R(esc(c),money(v))).join(''):'')+'</div>'}
let draft=null;
function confirmDraft(){if(draft===null)return;data.budget=draft;draft=null;save()}
function cancelDraft(){draft=null;render()}
function renderCap(){const c=$('lcap');if(draft===null){c.textContent='Limit · tap for details';return}
 c.innerHTML=`<div style="font-weight:600;color:var(--ink)">New limit ${P()}${n0(draft)}</div><div class="row f" style="margin-top:6px;gap:6px"><button class="sm" onclick="event.stopPropagation();confirmDraft()">Set</button><button class="sm b2" onclick="event.stopPropagation();cancelDraft()">✕</button></div>`}
function frac(v){return Math.sqrt(Math.min(Math.max(v,0),1e6)/1e6)}
function gauge(has,left,exp){
 const C=351.86,col=!has?'var(--acc)':(left<0?'var(--r)':'var(--g)'),fl=frac(draft!==null?draft:(has?data.budget:0)),fs=has?frac(exp):0,th=fl*2*Math.PI,x=70+56*Math.sin(th),y=70-56*Math.cos(th);
 [['larc',fl],['sarc',fs]].forEach(([id,f])=>{const e=$(id);e.setAttribute('stroke-dasharray',(f*C)+' '+C);e.style.stroke=col});
 ['dot','dotHit'].forEach(id=>{$(id).setAttribute('cx',x);$(id).setAttribute('cy',y)});$('dot').style.stroke=col}
function snap(v){const st=v<10000?100:v<100000?500:5000;return Math.min(1000000,Math.max(100,Math.round(v/st)*st))}
function initDrag(){const h=$('dotHit');let on=false,last=0;
 h.addEventListener('click',e=>e.stopPropagation());
 h.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();on=true;last=frac(draft!==null?draft:(data.budget>0?data.budget:0))*360;try{h.setPointerCapture(e.pointerId)}catch(x){}});
 h.addEventListener('pointermove',e=>{if(!on)return;const r=$('lsvg').getBoundingClientRect();
  let a=Math.atan2(e.clientX-(r.left+r.width/2),-(e.clientY-(r.top+r.height/2)))*180/Math.PI;if(a<0)a+=360;
  if(last>300&&a<60)a=360;else if(last<60&&a>300)a=0;last=a;
  const v=snap(1e6*Math.pow(a/360,2));if(v!==draft){draft=v;render()}});
 const end=()=>{on=false};h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end)}
let panel=null;
function togglePanel(k){panel=panel===k?null:k;applyPanel()}
function applyPanel(){$('dpanel').style.display=panel?'':'none';$('adet').style.display=panel==='limit'?'':'none';$('dleg').style.display=panel==='exp'?'':'none';$('c-limit').classList.toggle('on',panel==='limit');$('c-exp').classList.toggle('on',panel==='exp')}
function pdfSan(s){return String(s==null?'':s).replace(/••/g,'xx').replace(/[–—−]/g,'-').replace(/₹/g,'Rs').replace(/[^\x20-\x7E]/g,'?')}
function pdfEsc(s){return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfBytes(pages){
 const n=pages.length,o=[];o[1]='<< /Type /Catalog /Pages 2 0 R >>';
 o[2]='<< /Type /Pages /Kids ['+pages.map((_,i)=>(6+2*i)+' 0 R').join(' ')+'] /Count '+n+' >>';
 o[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';o[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';o[5]='<< >>';
 pages.forEach((ops,i)=>{
  const st=ops.map(q=>q.ln!==undefined?'0.5 w 36 '+q.ln.toFixed(1)+' m 559 '+q.ln.toFixed(1)+' l S':'BT /F'+(q.b?2:1)+' '+q.z+' Tf '+q.x.toFixed(1)+' '+q.y.toFixed(1)+' Td ('+pdfEsc(q.s)+') Tj ET').join('\n');
  o[5+2*i]='<< /Length '+st.length+' >>\nstream\n'+st+'\nendstream';
  o[6+2*i]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+(5+2*i)+' 0 R >>'});
 let out='%PDF-1.4\n';const off=[];
 for(let i=1;i<o.length;i++){off[i]=out.length;out+=i+' 0 obj\n'+o[i]+'\nendobj\n'}
 const xr=out.length;out+='xref\n0 '+o.length+'\n0000000000 65535 f \n'+off.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+o.length+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';
 const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return u}
async function makePdf(){
 const pm=$('pmsg2'),f=$('ef').value,t=$('et').value;
 if(f&&t&&f>t){pm.textContent='The From date must be before the To date.';return}
 const list=data.tx.filter(x=>(!f||x.date>=f)&&(!t||x.date<=t)).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 if(!list.length){pm.textContent='There are no entries in that period.';return}
 const cur=data.currency,fmt=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),A=v=>cur+' '+fmt(v);
 const ex=list.filter(x=>x.type==='expense'),sm=(a,g)=>a.filter(g).reduce((q,x)=>q+x.amount,0);
 const spent=sm(ex,()=>true),inc=sm(list,x=>x.type==='income'),cash=sm(ex,x=>x.method==='cash'),card=sm(ex,x=>x.method==='card'),cred=sm(ex,x=>x.method==='credit'),oth=spent-cash-card-cred;
 const cats={};ex.forEach(x=>cats[x.category]=(cats[x.category]||0)+x.amount);
 const pages=[];let ops,y,inTable=false;
 const tx=(x,yy,s,z,b)=>ops.push({x,y:yy,s:pdfSan(s),z,b}),tr=(s,k)=>{s=pdfSan(s);return s.length>k?s.slice(0,k-1)+'.':s},wd=(s,z)=>s.length*0.53*z;
 const colHead=()=>{tx(36,y,'Date / time',8.5,1);tx(128,y,'Description',8.5,1);tx(262,y,'Category',8.5,1);tx(334,y,'Payment',8.5,1);const h='Amount ('+cur+')';tx(559-wd(h,8.5),y,h,8.5,1);y-=5;ops.push({ln:y});y-=12};
 const np=()=>{ops=[];pages.push(ops);y=800;if(inTable)colHead()};
 np();
 tx(36,y,'Family Budget report',18,1);y-=20;
 tx(36,y,'Period: '+((!f&&!t)?'All entries':(f?fd(f):'Start')+' to '+(t?fd(t):'Latest'))+'    Created: '+fd(today())+' '+nowTime(),9);y-=24;
 tx(36,y,'Summary',12,1);y-=6;ops.push({ln:y});y-=15;
 const sum=[['Total spent',A(spent)],['Income',A(inc)],['Income minus spent',(inc-spent<0?'-':'')+A(Math.abs(inc-spent))]];
 if(cash)sum.push(['Cash',A(cash)]);if(card)sum.push(['Card',A(card)]);if(cred)sum.push(['Credit card',A(cred)]);if(oth>0.004)sum.push(['Not marked',A(oth)]);
 if(data.budget>0)sum.push(['Monthly limit',A(data.budget)]);sum.push(['Number of entries',String(list.length)]);
 sum.forEach(r=>{tx(36,y,r[0],10);tx(200,y,r[1],10,1);y-=15});
 y-=8;tx(36,y,'Spending by category',12,1);y-=6;ops.push({ln:y});y-=15;
 Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([c,v])=>{if(y<60)np();tx(36,y,c,10);tx(200,y,A(v),10);tx(340,y,spent?Math.round(v/spent*100)+'%':'',10);y-=15});
 if(!ex.length){tx(36,y,'No expenses in this period.',10);y-=15}
 y-=8;if(y<120)np();tx(36,y,'Transactions',12,1);y-=6;ops.push({ln:y});y-=15;inTable=true;colHead();
 let est=false;
 list.forEach(x=>{if(y<60)np();
  const dt=fd(x.date)+(x.time?' '+x.time+(x.timeEst?'*':''):'');if(x.timeEst)est=true;
  const pay=x.type==='income'?'Income':(x.source==='message'?cardInfo(x).text:(x.method==='credit'?'Credit':x.method==='card'?'Card':x.method==='cash'?'Cash':'')+(x.cardLabel?' '+x.cardLabel:''));
  const amt=(x.type==='income'?'+ ':'- ')+fmt(x.amount);
  tx(36,y,dt,8.5);tx(128,y,tr(mName(x),25),8.5);tx(262,y,tr(x.category,14),8.5);tx(334,y,tr(pay.trim(),30),8.5);tx(559-wd(amt,8.5),y,amt,8.5);y-=13});
 if(est){y-=6;if(y<60)np();tx(36,y,'* Time not in the bank message; this is the time the entry was added.',8)}
 pages.forEach((p,i)=>{ops=p;tx(36,24,'Page '+(i+1)+' of '+pages.length,8)});
 const name='FamilyBudget_'+(f||'all')+'_to_'+(t||today())+'.pdf',blob=new Blob([pdfBytes(pages)],{type:'application/pdf'});
 try{const file=new File([blob],name,{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Family Budget report'});pm.textContent='In the share sheet, choose Save to Files.';return}}
 catch(e){if(e&&e.name==='AbortError')return}
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
 pm.textContent='PDF created ('+list.length+' entries). If nothing downloaded, try again in Safari or Chrome.'}
function addPending(r,dup){data.pending.push({...r,dup:!!dup,id:newId()});save();return true}
/* ===== UI LAYER: presentation only. It reads the data to draw things and never changes it. ===== */
const CAT_UI={Unassigned:['\u{1F3F7}\uFE0F','#98a2b3'],Rent:['🏠','#6172f3'],Groceries:['🛒','#12b76a'],Fuel:['⛽','#f79009'],Car:['🚗','#2e90fa'],Tolls:['🛣️','#5d7fb8'],Insurance:['🛡️','#667085'],School:['🎓','#7a5af8'],Personal:['🧴','#ee46bc'],'Home/Family':['👨‍👩‍👧','#66c61c'],Bills:['💡','#0e9384'],Transport:['🚗','#0ba5ec'],Food:['🍽️','#fb6514'],Medical:['💊','#d444f1'],Education:['📚','#9e77ed'],Other:['💳','#98a2b3'],Uncategorized:['🗂️','#98a2b3'],Shopping:['🛍️','#c026d3'],Travel:['🏨','#0891b2'],Entertainment:['🎮','#7c3aed'],Home:['🏠','#66c61c'],'Personal Care':['💇','#ec4899'],Pets:['🐾','#a16207'],Technology:['💻','#475569'],'Banking/Finance':['🏦','#0f766e'],'Government/Services':['🏛️','#1d4ed8'],Gifts:['🎁','#db2777'],Delivery:['📦','#0d9488']};
function catUI(c){return CAT_UI[c]||['💳','#98a2b3']}
function tidy(v){const r=Math.round(Number(v)*100)/100;return Number.isInteger(r)?P()+r.toLocaleString(LOC()):money(r)}
function greetText(){const h=new Date().getHours(),g=h<5?'Good Night':h<12?'Good Morning':h<17?'Good Afternoon':h<21?'Good Evening':'Good Night',n=(data.profile&&data.profile.name||'').trim();return g+(n?', '+n:'')+' \u{1F44B}'}
function saveProfile(){data.profile.name=$('pname').value.trim().slice(0,40);save()}
let catAll=false;function toggleCats(){catAll=!catAll;render()}
function catCards(t,limit){const en=Object.entries(t).sort((a,b)=>b[1]-a[1]),tot=en.reduce((a,x)=>a+x[1],0);
 if(!en.length)return '<div class="empty">No expenses this month</div>';
 let h=((limit&&!catAll)?en.slice(0,limit):en).map(([c,v])=>{const u=catUI(c),sp=tot?Math.round(v/tot*100):0,lm=data.budget>0?Math.round(v/data.budget*100):null;
  return `<div class="cat" style="--c:${u[1]}"><div class="cat-i"><span>${u[0]}</span></div><div class="cat-b"><div class="cat-n">${esc(c)}</div><div class="cat-bar"><i style="width:${sp}%"></i></div><div class="cat-s">${sp}% of spending${lm!==null?' \u00b7 '+lm+'% of limit':''}</div></div><div class="cat-a">${tidy(v)}</div></div>`}).join('');
 if(limit&&en.length>limit)h+=`<button class="b2 sm wide" onclick="toggleCats()">${catAll?'Show less':'Show all '+en.length}</button>`;
 return h}
/* healthy < 75% of the limit used, close to limit 75-100%, over limit > 100% */
function budgetState(){const exp=expTotal(month),has=data.budget>0,used=has?exp/data.budget:0;return{exp,has,used,st:!has?'none':used>1?'over':used>=.75?'warn':'ok'}}
const ST_TXT={none:'No limit set',ok:'Healthy',warn:'Close to limit',over:'Over limit'};
function renderUI(){
 const S=budgetState(),inc=data.tx.filter(x=>x.type==='income'&&x.date.slice(0,7)===month).reduce((a,x)=>a+x.amount,0);
 $('greet').textContent=greetText();
 const avail=S.has?data.budget-S.exp:(inc>0?inc-S.exp:null);
 const rows=[['💵','#2e90fa','MONEY IN',inc>0?tidy(inc):'—',''],['🎯','#a6b0ff','PLANNED LIMIT',S.has?tidy(data.budget):'Not set',"show('budget')"],['🛍️','#f79009','SPENT',tidy(S.exp),''],
  ['🌱',avail==null?'#98a2b3':avail<0?'#f04438':'#12b76a',S.has?'AVAILABLE':'AVAILABLE (MONEY IN − SPENT)',avail==null?'—':(avail<0?'−':'')+tidy(Math.abs(avail)),'']];
 $('fl-steps').innerHTML=rows.map((r,i)=>`<div class="fstep${i===3?' last':''}"${r[4]?` onclick="${r[4]}" style="cursor:pointer"`:''}><div class="fs-i" style="--c:${r[1]}"><span>${r[0]}</span></div><div class="fs-n">${r[2]}</div><div class="fs-a">${r[3]}</div></div>`).join('');
 const base=S.has?data.budget:inc,sp=base>0?Math.min(100,S.exp/base*100):0;
 $('fb-a').style.width=sp+'%';$('fb-b').style.width=(base>0?100-sp:0)+'%';$('fb-a').style.background=S.st==='over'?'#f04438':S.st==='warn'?'#eaaa08':'#f79009';
 ['none','ok','warn','over'].forEach(k=>{$('flowcard').classList.toggle('st-'+k,k===S.st);$('c-limit').classList.toggle('st-'+k,k===S.st)});
 $('fl-pill').textContent=ST_TXT[S.st];
 $('fl-note').textContent=!S.has?'Set a monthly limit to see how much of it is left.':S.st==='over'?'You are over your limit by '+tidy(S.exp-data.budget)+'.':'You have used '+Math.round(S.used*100)+'% of your limit.';
 $('limval').textContent=S.has?tidy(data.budget):'Not set';
 $('limstat').innerHTML=S.has?`<div class="tb"><i style="width:${Math.min(100,S.used*100)}%;background:${S.st==='over'?'var(--red)':S.st==='warn'?'var(--yellow)':'var(--green)'}"></i></div><div class="small" style="margin-top:6px">${tidy(S.exp)} spent \u00b7 ${Math.round(S.used*100)}% used \u00b7 <b style="color:${S.st==='over'?'var(--r)':S.st==='warn'?'var(--ytxt)':'var(--gt)'}">${ST_TXT[S.st]}</b></div>`:'<div class="small">Use + and \u2212, or type an exact amount below.</div>';
 $('amtcur').textContent=P().trim();
 renderGrowth(S)}
/* Budget Growth: a small tree that grows through the month while spending stays healthy, slows near the limit and wilts when over. */
function renderGrowth(S){
 const now=new Date(),cur=today().slice(0,7);let p=month===cur?now.getDate()/new Date(now.getFullYear(),now.getMonth()+1,0).getDate():(month<cur?1:0);
 let stage=!S.has?0:p<.08?1:p<.3?2:p<.65?3:4;if(S.st==='warn'||S.st==='over')stage=Math.min(stage,3);
 const sc=[0,.34,.52,.78,1][stage],T=$('g-tree');
 T.style.transform='scale('+sc+')'+(S.st==='over'&&stage>0?' rotate(7deg)':'');
 $('g-seed').style.opacity=stage===0?1:0;$('g-bloom').style.opacity=(stage===4&&S.st==='ok')?1:0;
 $('gsvg').setAttribute('class','gs-'+S.st);
 const pct=Math.round(S.used*100);
 const msg={none:['Plant your seed','Set a monthly limit and your tree starts to grow.'],
  ok:stage>=4?['Full bloom','You are on track: '+pct+'% of your limit used.']:stage>=2?['Growing well','Spending is healthy: '+pct+'% of your limit used.']:['A sprout is up','Early in the month and well within your limit.'],
  warn:['Growth is slowing','You have used '+pct+'% of your limit. A little care keeps the tree healthy.'],
  over:['Growth paused','You are over your limit by '+tidy(S.exp-data.budget)+'. Staying under it next month lets the tree recover.']}[S.st];
 $('g-title').textContent=msg[0];$('g-text').textContent=msg[1]}
/* Limit screen: + / - use the existing saveBudget() */
function bump(dir){const cur=data.budget||0,step=cur<5000?500:cur<20000?1000:cur<100000?5000:25000;
 $('binput').value=String(Math.min(1000000,Math.max(0,cur+dir*step))||'');saveBudget({preventDefault(){}})}
/* Add screen: coloured category cards + Expense/Income switch drive the existing (hidden) form fields */
function buildCatGrid(){$('catgrid').innerHTML=cats.map(c=>{const u=catUI(c);return `<button type="button" class="cpick" data-c="${esc(c)}" style="--c:${u[1]}" onclick="pickCat(this.dataset.c)"><em>${u[0]}</em><span>${esc(c)}</span></button>`}).join('')}
function syncCat(){const v=$('category').value;document.querySelectorAll('#catgrid .cpick').forEach(b=>b.classList.toggle('on',b.dataset.c===v))}
function pickCat(c){$('category').value=c;syncCat()}
function syncType(){const v=$('type').value;$('add').dataset.type=v;document.querySelectorAll('#tseg button').forEach(b=>b.classList.toggle('on',b.dataset.t===v))}
function setType(v){$('type').value=v;segVis()}
/* ===== END UI LAYER ===== */
function renderPending(){const p=data.pending;$('pcard').style.display='none';   /* replaced by the single Review card on Home */$('pcount').textContent=p.length;
 $('plist').innerHTML=p.map(x=>`<div class="tx" style="cursor:default"><div>${leftBlock(x)}${x.reason?'<div class="small" style="color:var(--ytxt)">Please check: '+esc(x.reason)+'</div>':''}${x.dup?'<div class="small" style="color:var(--ytxt)">Looks the same as an earlier entry. Add it only if it is a separate purchase.</div>':''}</div><div style="text-align:right"><strong class="${x.type==='income'?'g':'r'}">${x.type==='income'?'+':'-'}${amtText(x)}</strong><div style="margin-top:6px"><button class="sm" onclick="acceptPend('${x.id}')">Add</button> <button class="sm b2" onclick="editPend('${x.id}')">Edit</button> <button class="sm b2" onclick="skipPend('${x.id}')">\u2715</button></div></div></div>`).join('')}
function acceptPend(id){const p=data.pending.find(x=>x.id===id);if(!p)return;const m=p.date.slice(0,7),b=expTotal(m);{const {dup,reason,...q}=p;data.tx.push(q)}data.pending=data.pending.filter(x=>x.id!==id);save();afterCross(m,b)}
function acceptAll(){const ms=[...new Set(data.pending.map(x=>x.date.slice(0,7)))],bs=ms.map(expTotal);data.tx.push(...data.pending.map(({dup,reason,...q})=>q));data.pending=[];save();ms.forEach((m,i)=>afterCross(m,bs[i]))}
function skipPend(id){data.pending=data.pending.filter(x=>x.id!==id);save()}
function editPend(id){const p=data.pending.find(x=>x.id===id);if(!p)return;editId=null;pendId=id;$('addTitle').textContent='Review transaction';$('delBtn').style.display='none';$('smsCard').style.display='none';fill(p);show('add')}
let lastMsgText='',lastTarget='pmsg';
function importFeedback(res,text){lastMsgText=text;const r=res.r||{};
 if(res.status==='invalid')return 'No amount found in that message.';
 if(res.status==='duplicate')return 'Already imported, so it was not added again.'+(res.weak?' <button class="sm" onclick="addAnyway()">It is a separate purchase: add anyway</button>':'');
 if(res.status==='ignored')return 'This message was not imported. <button class="sm" onclick="addAnyway()">Try again</button>';
 if(res.status==='review')return res.fresh?'Ready to review: '+fmtAmt(r)+' \u00b7 '+(r.dateFound?fd(r.date):'date not in the message')+(r.timeFound?' \u2022 '+r.time:'')+'. Open <b>Review</b> on Home to check it, choose a category and save.':'Looks the same as an earlier entry. It is waiting in <b>Review</b> on Home.';
 const x=res.tx;return 'Added: '+esc(x.category)+' \u00b7 '+fmtAmt(x)+' \u00b7 '+fd(x.date)+(r.timeFound?' \u2022 '+x.time:'')+(r.dateFound?'':' (no date in the message, today used)')+(r.timeFound?'':' (no time in the message)')}
function addAnyway(){const res=importMessage(lastMsgText,{force:true});$(lastTarget).innerHTML=importFeedback(res,lastMsgText)}
async function pasteToPending(){const m=$('pmsg');lastTarget='pmsg';
 try{const t=await navigator.clipboard.readText();m.innerHTML=importFeedback(importMessage(t),t)}
 catch(e){m.textContent='Could not read the clipboard. Paste the message into Test import (Backup tab) instead.'}}
/* ===== AUTOMATIC IMPORT (iPhone Shortcuts -> messages file -> this app) =====
   iOS never lets a web app read the SMS inbox. A Shortcut automation can append every bank message to a text file on the phone;
   this code reads that file with the SAME parser, duplicate checks and deleted-import memory as the paste import.
   Messages the parser is not sure about are NOT saved: they wait in "New from messages" for the user to confirm. */
const TXN_VERB=/\b(spent|purchase[ds]?|used|debited|credited|paid|payment|withdrawn|withdrawal|received|refund(?:ed)?|reversed|transferred|deposit(?:ed)?|charged|pos|transaction)\b/i;
const OTP_CODE=/\b(?:otp|one[- ]?time\s+(?:password|pin|code)|verification\s+code|authentication\s+code|passcode)\b[^.\n]{0,60}?(?:\bis\b|:|=)\s*\d{4,8}\b|\b(?:otp|one[- ]?time\s+(?:password|pin|code)|verification\s+code|passcode)\b\s*[:\-]?\s*\d{4,8}\b|\b\d{4,8}\b[^.\n]{0,25}\b(?:is|as)\s+your\s+(?:otp|one[- ]?time|verification|code)/i;   /* a security CODE: the word OTP/code followed by "is 123456", or "123456 is your OTP". A warning like "never share your OTP" is not matched. */
const PROMO_RE=/\b(?:offer|win|congratulations|cashback|apply now|limited time|pre-?approved|loan|reward points?|redeem|coupon|discount|lucky draw)\b|https?:\/\/|www\./i;
const BAL_RE=/\b(?:available|avl|avail|current|ledger)\.?\s*(?:balance|bal)\b|\bbalance\s+(?:is|enquiry)\b/i;
const CUR_RE=/\b(?:AED|DHS?\.?|INR|RS\.?|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)(?![A-Za-z])|[\u20b9$\u20ac\u00a3]/i;
const AMT_LINE=/(?:AED|DHS?|INR|RS|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\.?\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:AED|DHS?|INR|RS|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\b/i;
/* ok = save it | review = wait for the user | reject = not a transaction */
function autoGate(text,r,rcv){
 if(OTP_CODE.test(text))return{level:'reject',reason:'security-code (OTP) message'};
 const verb=TXN_VERB.test(text);
 if(!verb&&PROMO_RE.test(text))return{level:'reject',reason:'offer or promotional message'};
 if(!verb&&BAL_RE.test(text))return{level:'reject',reason:'balance notification, not a transaction'};
 const why=[];
 if(!CUR_RE.test(text))why.push('no currency found');
 if(!verb)why.push('no clear payment wording');
 if(!r.dateFound&&!(rcv&&rcv.date))why.push('no date in the message');
 return why.length?{level:'review',reason:why.join(', ')}:{level:'ok'}}
/* A message with no date/time of its own may use the time the phone RECEIVED it (written by the Shortcut). Never invented. */
function applyReceived(r,rc){if(!rc)return;
 if(!r.dateFound&&rc.date){r.date=rc.date;r.autoDate=rc.date;r.dateFound=true;r.dateEst=false}
 if(!r.timeFound&&rc.time){r.time=rc.time;r.timeEst=false;r.timeFound=true}}
/* Same checks importMessage uses, for messages that are going to the review list instead. */
function dupState(r){const live=[...data.tx,...data.pending];
 if(strongDup(r,live))return'duplicate';
 if(!r.dedupeKey&&!r.externalTransactionId&&live.find(x=>x.originalDescription&&x.originalDescription===r.originalDescription))return'duplicate';
 if(weakDup(r,live))return'duplicate';
 return null}
function autoImport(text,rcv){
 const r=parseSms(text);if(!r)return{status:'invalid',reason:'no amount found'};
 const g=autoGate(text,r,rcv);
 if(g.level==='reject')return{status:'rejected',reason:g.reason};
 if(g.level==='review'){const d=dupState(r);if(d)return{status:d,r};
  applyReceived(r,rcv);addPending({...r,reason:g.reason},false);return{status:'review',reason:g.reason,r,fresh:true}}
 return importMessage(text,{received:rcv})}
/* Accept the normal <<<FB>>> export, older files separated by Received: headers,
   and plain messages separated by blank lines. Keep each SMS together where possible. */
function splitMessages(txt){txt=String(txt||'').replace(/\r\n?/g,'\n').replace(/^Text(?=(?:Your card ending|Credit Card Purchase|Credit Card Mini Statement|Credit Card Payment|Card Purchase|Card Transaction|Transaction Alert|Debit Card Purchase)\b)/gim,'');
 let blocks;
 if(/^[ \t]*<<<FB>>>[ \t]*$/m.test(txt)){
  blocks=txt.split(/^[ \t]*<<<FB>>>[ \t]*$/m).map(b=>b.trim()).filter(Boolean);
 }else if(/^\s*Received:\s*\d{4}-\d{2}-\d{2}/im.test(txt)){
  /* A Received header is an unambiguous boundary even if the marker is absent. */
  blocks=txt.split(/(?=^[ \t]*Received:\s*\d{4}-\d{2}-\d{2})/im).map(b=>b.trim()).filter(Boolean);
 }else{
  /* Some Shortcuts exports concatenate Messages without blank lines or <<<FB>>> markers.
     Split at recognizable SMS starts while preserving each multi-line bank message. */
  const starts=/^(?=(?:Your card ending\b|Your card ending with\b|Credit Card Purchase\b|Credit Card Mini Statement\b|Credit Card Payment\b|Card Purchase\b|Card Transaction\b|Dear Customer\b|Transaction Alert\b|Debit Card Purchase\b|SMS Alert\b))/im;
  const candidate=txt.split(starts).map(b=>b.trim()).filter(Boolean);
  if(candidate.length>1 && candidate.some(b=>/\b(?:Amount|AED|spent|used|purchase)\b/i.test(b))) blocks=candidate;
  else blocks=txt.split(/^[ \t]*(?:={3,}|-{3,})[ \t]*$/m).map(b=>b.trim()).filter(Boolean);
  if(blocks.length<=1){
   const paragraphs=txt.split(/\n[ \t]*\n+/).map(b=>b.trim()).filter(Boolean);
   if(paragraphs.length>1)blocks=paragraphs;
   else {const lines=txt.split('\n').map(l=>l.trim()).filter(Boolean);if(lines.length>1&&lines.every(l=>AMT_LINE.test(l)))blocks=lines}
  }
 }
 const more=Math.max(0,blocks.length-5000),out=blocks.slice(0,5000).map(b=>{let rcv=null;const m=b.match(/^\s*Received:\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?[^\n]*\n?/i);
  if(m){rcv={date:m[1],time:m[2]||''};b=b.slice(m[0].length).trim()}return{text:b,rcv}}).filter(x=>x.text);out.more=more;return out}
/* Split a single bank SMS that clearly contains multiple separate transactions.
   Split only when every currency/amount segment independently looks like a transaction
   and yields a merchant. Otherwise keep the original SMS intact to avoid false entries. */
function splitTransactionText(text){
 text=String(text||'');
 const amountRe=/(?:\b(?:AED|DHS?\.?|INR|RS\.?|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:AED|DHS?|INR|RS|SAR|QAR|KWD|BHD|OMR|PKR|USD|EUR|GBP)\b|[$€£]\s*[\d,]+(?:\.\d+)?)/gi;
 const matches=[...text.matchAll(amountRe)];
 if(matches.length<2||matches.length>12)return [text];
 const first=matches[0].index, prefix=text.slice(0,first), last=matches[matches.length-1];
 /* Share only a trailing date/time suffix with earlier segments; do not copy the last merchant into every transaction. */
 const dateRe=/(?:\b\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}\b|\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?[-/ .]*[A-Za-z]{3,9}\.?[-/ ,.']*\d{2,4}\b|\b[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b)/i;
 const tail=text.slice(last.index+last[0].length), dm=dateRe.exec(tail);
 const sharedSuffix=dm?tail.slice(dm.index):'';
 const out=[];
 for(let i=0;i<matches.length;i++){
  const start=matches[i].index, end=i+1<matches.length?matches[i+1].index:text.length;
  let core=text.slice(start,end).trim();
  if(i+1<matches.length)core=core.replace(/[\s,;|]*(?:and|then|also|plus)?[\s,;|.]*$/i,'').trim();
  if(!core)return [text];
  let candidate;
  if(i+1<matches.length&&sharedSuffix)candidate=(prefix+' '+core+' '+sharedSuffix).replace(/\s+/g,' ').trim();
  else candidate=(prefix+' '+core).replace(/\s+/g,' ').trim();
  /* Transaction wording can appear before the FIRST amount, not inside each amount segment.
     Validate the complete candidate, otherwise legitimate multi-purchase SMS messages are kept as one. */
  const parsed=parseSms(candidate);
  if(!parsed||!parsed.merchant)return [text];
  out.push({text:candidate,rcv:null});
 }
 if(out.length<2)return [text];
 /* A single SMS reference identifies the message, not each purchase. Strip it so each purchase gets its own fingerprint. */
 for(const it of out){it.text=it.text.replace(/\b(?:ref(?:erence)?|txn|trx|transaction|rrn|utr)\b[\s.:#]*(?:(?:no|number|id|code)\b[\s.:#]*)*[A-Za-z0-9][A-Za-z0-9-]{4,24}/ig,'');}
 return out;
}
function runAutoImport(items){const res={added:0,duplicate:0,ignored:0,review:0,rejected:0,invalid:0,notes:[]};
 const rs=save,rr=render,rc=afterCross;save=function(){};render=function(){};afterCross=function(){};   /* thousands of messages: save ONCE at the end, not after every message */
 try{for(const original of items){const parts=splitTransactionText(original.text).map(p=>typeof p==='string'?({text:p,rcv:original.rcv}):({text:p.text,rcv:p.rcv||original.rcv}));for(const it of parts){let r;try{r=autoImport(it.text,it.rcv)}catch(e){r={status:'invalid',reason:'could not be read'}}
  const k=res[r.status]===undefined?'invalid':r.status;res[k]++;if(k==='review'&&r.fresh)res.fresh=(res.fresh||0)+1;if(k==='added'&&r.tx&&r.tx.needsReview)res.needsReview=(res.needsReview||0)+1;
  if((k==='review'||k==='rejected'||k==='invalid')&&res.notes.length<8)res.notes.push((k==='rejected'?'Ignored':k==='review'?'Needs review':'Not recognised')+' ('+(r.reason||'')+')'+(k==='rejected'?'':': '+cleanOriginal(it.text).slice(0,60)))}}}
 finally{save=rs;render=rr;afterCross=rc}
 if(res.fresh||res.added||res.review)save();
 return res}
function autoSummary(res,n){const p=[],nrr=res.needsReview||0;
 if(res.added-nrr)p.push((res.added-nrr)+' added');if(res.duplicate)p.push(res.duplicate+' already imported');
 if(res.review+nrr)p.push((res.review+nrr)+' ready to review');if(res.rejected)p.push(res.rejected+' ignored (not a purchase)');if(res.invalid)p.push(res.invalid+' not recognised');
 return '<strong>Read '+n+' message'+(n===1?'':'s')+'.</strong> '+(p.join(', ')||'Nothing to add.')+(res.review+nrr?'<br>Open <b>Review</b> on Home to check each one, choose a category and save.':'')+
  (res.notes.length?'<ul style="margin:6px 0 0;padding-left:18px">'+res.notes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')}
function pickAutoFile(){$('afile').click()}
async function onAutoFile(inp){const f=inp.files&&inp.files[0],o=$('aires');if(!f)return;
 if(f.size>2000000){o.textContent='That file is too large (over 2 MB).';return}
 let t;try{t=await f.text()}catch(e){o.textContent='Could not read that file.';return}
 inp.value='';const items=splitMessages(t);
 if(!items.length){o.textContent='No messages found in that file.';return}
 const m0=month,res=runAutoImport(items);month=m0;render();o.innerHTML=autoSummary(res,items.length)}
/* ===== END automatic import ===== */
/* ===== NEEDS REVIEW (merchant could not be identified) ===== */
let rvId=null;
function nrItems(){return [...data.pending,...data.tx.filter(x=>x.needsReview)]}
function nrList(){return nrItems()}
function findNR(id){return data.pending.find(x=>x.id===id)||data.tx.find(x=>x.id===id&&x.needsReview)}
function renderNR(){const l=nrItems(),c=$('nrcard'),rdy=readyItems().length;if(!l.length){c.style.display='none';c.innerHTML='';return}
 c.style.display='';
 c.innerHTML=`<div class="nr-h"><span>\u{1F4DD}</span><div><strong>${l.length} transaction${l.length===1?'':'s'} to review</strong><div class="small">Check the details, choose a category and save</div></div></div>${rdy>=2?`<div style="margin-top:10px"><button type="button" class="sm" onclick="saveAllReady()">Save all ready (${rdy})</button> <span class="small">with merchant, date and suggested category</span></div>`:''}`+
  l.slice(0,5).map(x=>`<div class="nr-row"><div><div class="nr-a">${amtText(x)}</div><div class="small">${x.merchant?esc(x.merchant)+' \u2022 ':''}${x.dateFound===false?'Date not in the message':fd(x.date)}${x.time&&!x.timeEst?' \u2022 '+x.time:''}</div></div><button type="button" class="sm" onclick="openReview('${x.id}')">Review</button></div>`).join('')+
  (l.length>5?`<div class="small" style="margin-top:8px">+ ${l.length-5} more: tap Review, then Save &amp; next</div>`:'')}
function readyItems(){return data.pending.filter(x=>x.dateFound!==false&&x.merchant&&!x.dup&&!x.reason)}
function saveAllReady(){const l=readyItems();if(!l.length)return;
 if(!confirm('Save '+l.length+' transactions that have a merchant, a date and a suggested category? You can still edit any of them afterwards. Messages that are missing something stay here for review.'))return;
 const months=[...new Set(l.map(x=>x.date.slice(0,7)))],b0=months.map(expTotal);
 for(const x of l){const {dup,reason,needsReview,reviewReason,...q}=x;q.status='confirmed';data.tx.push(q)}
 data.pending=data.pending.filter(x=>!l.includes(x));save();months.forEach((m,i)=>afterCross(m,b0[i]))}
function openReview(id){const x=findNR(id);if(!x)return;rvId=id;
 $('rvorig').textContent=x.originalDescription||'(The original message was not saved for this transaction.)';
 const kv=(k,v)=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`,ci=payLine(x),noDate=x.dateFound===false;
 $('rvinfo').innerHTML=kv('Amount',amtText(x))+(KIND_TITLE[x.transactionType]?kv('Type',esc(KIND_TITLE[x.transactionType])):'')+(noDate?kv('Date','not in the message'):kv('Date',fd(x.date)))+(x.time&&!x.timeEst?kv('Time',x.time):'')+(ci?kv('Card',ci):'')+(x.bank?kv('Bank',esc(x.bank)):'')+(x.externalTransactionId?kv('Reference',esc(x.externalTransactionId)):'');
 $('rvdup').style.display=x.dup?'':'none';$('rvwhy').style.display=x.reason?'':'none';$('rvwhy').textContent=x.reason?'Please check: '+x.reason:'';
 $('rvdatewrap').style.display=noDate?'':'none';$('rvdate').value=noDate?x.date:'';
 $('rvmerch').value=x.merchant||'';$('rvcat').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');$('rvcat').value=cats.includes(x.category)?x.category:'Unassigned';
 $('rvnext').style.display=nrItems().length>1?'':'none';$('rvmsg').textContent='';$('rvmodal').style.display='flex'}
function closeReview(){rvId=null;$('rvmodal').style.display='none'}
function confirmReview(goNext){const x=findNR(rvId);if(!x){closeReview();return}
 const m=$('rvmerch').value.trim(),msg=$('rvmsg'),noDate=x.dateFound===false;
 if(/\d{9,}/.test(m.replace(/[\s-]/g,''))){msg.textContent='Please do not type card or account numbers.';return}
 let d=x.date;if(noDate){d=$('rvdate').value;if(!d){msg.textContent='Please choose the date (it is not in the message).';return}}
 const cat=$('rvcat').value||'Unassigned',wasPending=data.pending.includes(x),mo=d.slice(0,7),b0=expTotal(mo);
 const changed=m!==(x.merchant||'')||cat!==x.category||d!==x.date;
 if(wasPending){const {dup,reason,needsReview,reviewReason,...q}=x;Object.assign(q,{merchant:m,category:cat,date:d,status:'confirmed'});if(noDate){q.dateFound=true;q.dateEst=false}if(changed)q.userEdited=true;
  data.pending=data.pending.filter(t=>t!==x);data.tx.push(q)}
 else{x.merchant=m;x.category=cat;x.date=d;x.userEdited=true;delete x.needsReview;x.reviewReason='';x.status='confirmed';if(noDate){x.dateFound=true;x.dateEst=false}}
 save();afterCross(mo,b0);
 const nx=goNext===true?nrItems()[0]:null;if(nx)openReview(nx.id);else closeReview()}
function dismissReview(){const x=findNR(rvId);if(!x)return;if(!confirm('Remove this from the review list? It will not be imported again.'))return;
 if(data.pending.includes(x)){data.ignored.push(tomb(x));if(data.ignored.length>500)data.ignored.splice(0,data.ignored.length-500);data.pending=data.pending.filter(t=>t!==x)}else removeTx(x.id);
 save();closeReview()}
function fillProfile(){const e=$('pname');if(e&&(typeof document.activeElement==='undefined'||document.activeElement!==e))e.value=data.profile.name||''}

/* ===== SAVED PERIODS (named date ranges; the Check by date search itself never saves anything) ===== */
let pedit=null,curPeriod=null,curPeriodOn=false,periodBack='transactions';
function periodTx(p){return data.tx.filter(x=>x.date>=p.from&&x.date<=p.to)}
function periodStats(p){const t={};let total=0,count=0;periodTx(p).forEach(x=>{if(x.type==='expense'){total+=x.amount;count++;t[x.category]=(t[x.category]||0)+x.amount}});return{total,count,cats:t}}
function periodDonut(p){const st=periodStats(p),C=2*Math.PI*30,en=Object.entries(st.cats).sort((a,b)=>b[1]-a[1]);let off=0,segs='';
 en.forEach(([c,v])=>{const len=v/st.total*C;segs+=`<circle cx="40" cy="40" r="30" fill="none" stroke="${catUI(c)[1]}" stroke-width="9" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 40 40)"/>`;off+=len});
 const num=st.total>=1e6?(st.total/1e6).toFixed(1)+'M':n0(st.total),fs=num.length<=6?13:num.length<=8?11:9;
 return `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="9"/>${segs}<text x="40" y="33" text-anchor="middle" font-size="7" font-weight="600" fill="currentColor" opacity=".7">${esc(data.currency)}</text><text x="40" y="${33+fs}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="currentColor">${num}</text></svg>`}
function homePeriods(){const t=today(),on=p=>p.from<=t&&t<=p.to;
 return [...data.periods.filter(on).sort((a,b)=>a.to.localeCompare(b.to)),...data.periods.filter(p=>!on(p)).sort((a,b)=>b.to.localeCompare(a.to))].slice(0,3)}
function renderStack(){const el=$('pstack'),l=homePeriods();
 el.style.display='block';
 if(!l.length){el.innerHTML=`<div class="pstack-head"><strong>Card spending cycles</strong><span class="small">Track each billing period</span></div><div class="pstack-empty"><div><strong>No saved card cycles yet</strong><div class="small">Save a date range such as your card’s 11th–11th billing cycle to see its spending here.</div></div><button type="button" class="sm" onclick="show('transactions');openPeriodForm()">＋ Add cycle</button></div>`;return}
 el.innerHTML=`<div class="pstack-head"><strong>Card spending cycles</strong><span class="small">Tap a card for details</span></div><div class="pstack-rail">`+l.map((p,i)=>{const st=periodStats(p);return `<button type="button" class="pcardh pc${i}" onclick="openPeriod('${p.id}','home')" aria-label="${esc(p.name)}, total spent ${esc(P())}${n0(st.total)}"><span class="pcard-top"><span class="pcard-name">${esc(p.name)}</span><span class="pcard-dates">${fd(p.from)} – ${fd(p.to)}</span></span><span class="pcard-bottom"><span class="pcard-total"><small>Total spent</small><strong>${esc(P())}${n0(st.total)}</strong></span><span class="pcard-donut">${periodDonut(p)}</span></span></button>`}).join('')+`</div>`}

function renderPeriodList(){const el=$('plist2');
 el.innerHTML=data.periods.map(p=>`<div class="prow"><div style="min-width:0"><div class="pn">${esc(p.name)}</div><div class="pd">${fd(p.from)} \u2013 ${fd(p.to)} \u00b7 ${P()}${n0(periodStats(p).total)}</div></div><div class="pb"><button type="button" class="sm b2" onclick="openPeriod('${p.id}','transactions')">View</button><button type="button" class="sm b2" onclick="openPeriodForm('${p.id}')">Edit</button><button type="button" class="sm b2" onclick="delPeriod('${p.id}')">Delete</button></div></div>`).join('')||'<div class="small" style="padding:10px 0">No saved periods yet. Tap + next to Check by date to save one, for example a credit card billing cycle.</div>'}
function openPeriodForm(id){pedit=id||null;const p=id&&data.periods.find(x=>x.id===id);
 $('pftitle').textContent=p?'Edit saved period':'New saved period';$('pfn').value=p?p.name:'';$('pff').value=p?p.from:(rng.from||'');$('pft').value=p?p.to:(rng.to||'');$('pfmsg').textContent='';
 $('pform').style.display='';try{$('pform').scrollIntoView({block:'center',behavior:'smooth'})}catch(e){}}
function closePeriodForm(){pedit=null;$('pform').style.display='none'}
function savePeriod(){const n=$('pfn').value.trim(),f=$('pff').value,t=$('pft').value,m=$('pfmsg');
 if(!n){m.textContent='Please give the period a name.';return}if(!f||!t){m.textContent='Please choose both dates.';return}if(f>t){m.textContent='The From date must be before the To date.';return}
 if(pedit){const p=data.periods.find(x=>x.id===pedit);if(p){p.name=n.slice(0,40);p.from=f;p.to=t}}else data.periods.push({id:newId(),name:n.slice(0,40),from:f,to:t,created:new Date().toISOString()});
 closePeriodForm();save()}
function delPeriod(id){const p=data.periods.find(x=>x.id===id);if(!p||!confirm('Delete the saved period "'+p.name+'"? Your transactions are not affected.'))return;
 data.periods=data.periods.filter(x=>x.id!==id);if(curPeriod===id){curPeriodOn=false;show(periodBack)}save()}
function openPeriod(id,from){const p=data.periods.find(x=>x.id===id);if(!p)return;curPeriod=id;curPeriodOn=true;periodBack=from||'transactions';renderPeriodDetail();show('period');
 const nb=$('n-'+periodBack);if(nb)nb.classList.add('on')}
function closePeriod(){curPeriodOn=false;show(periodBack)}
function renderPeriodDetail(){const p=data.periods.find(x=>x.id===curPeriod);if(!p){curPeriodOn=false;return}
 const st=periodStats(p),en=Object.entries(st.cats).sort((a,b)=>b[1]-a[1]);
 $('pdname').textContent=p.name;$('pdrange').textContent=fd(p.from)+' \u2013 '+fd(p.to);$('pdtotal').textContent=P()+n0(st.total);$('pdcount').textContent=st.count+' expense transaction'+(st.count===1?'':'s');
 $('pdcats').innerHTML=en.map(([c,v])=>{const u=catUI(c),pc=st.total?Math.round(v/st.total*100):0;return `<div class="pcat"><div class="ti" style="--c:${u[1]}"><span>${u[0]}</span></div><div style="min-width:0"><div>${esc(c)} <span class="small">${pc}%</span></div><div class="bar"><i style="width:${pc}%;background:${u[1]}"></i></div></div><strong>${P()}${n0(v)}</strong></div>`}).join('')||'<div class="empty">No expenses in this period</div>';
 $('pdlist').innerHTML=periodTx(p).filter(x=>x.type==='expense').sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))).map(txHTML).join('')||'<div class="empty">No transactions in this period</div>'}

/* ===== AUTOLOG SETUP ENTRY =====
   This is an in-app launcher, not a claim that a web page can silently install iOS Shortcuts.
   Apple Shortcuts must be created/installed and authorized on the device. */
function openAutoLogSetup(){const m=$('autologmodal');if(m)m.style.display='flex';const s=$('autolognewstatus');if(s)s.textContent='On iPhone, this opens Shortcuts. Your existing automation remains unchanged.'}
function closeAutoLogSetup(){const m=$('autologmodal');if(m)m.style.display='none'}
function openShortcutsForAutoLog(){const out=$('autolognewstatus');const ua=navigator.userAgent||'';const ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);if(!ios){if(out)out.textContent='Apple Shortcuts is available on iPhone/iPad. Existing file import still works on this device.';return}if(out)out.textContent='Opening Apple Shortcuts. iOS controls setup and permission prompts; this button does not install a Shortcut by itself.';window.location.href='shortcuts://'}

/* ===== IMPORT PREVIOUS TRANSACTIONS =====
   The web app cannot read Messages directly. On iOS, a separately created/authorized Shortcut can use Find Messages and export a local text file.
   This flow launches that named Shortcut, then previews the exported file before saving; existing transactions are protected by the import/dedup logic. */
let hiState=null,hiLoaded=null;
function renderWelcome(){const e=$('welcome');if(e)e.style.display=(!data.setupDone&&!data.tx.length&&!data.pending.length)?'':'none'}
function skipWelcome(){data.setupDone=true;save()}
function openHistory(){hiState=null;hiLoaded=null;$('hiloaded').textContent='';$('hi1').style.display='';$('hi2').style.display='none';$('himsg').textContent='';if($('hishortcutmsg'))$('hishortcutmsg').textContent='';$('himodal').style.display='flex'}
function launchHistoryShortcut(){const out=$('hishortcutmsg');const ua=navigator.userAgent||'';const ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);if(!ios){out.textContent='This launches Apple Shortcuts and is available only on an iPhone or iPad. You can still select an already-exported text file below.';return}out.textContent='Opening Shortcuts… If the shortcut is installed, let it finish, then return to Family Budget and choose FamilyBudget-history.txt below.';window.location.href='shortcuts://run-shortcut?name=Export%20bank%20messages'}
function closeHistory(){$('himodal').style.display='none';hiState=null}
function hiBack(){hiState=null;$('hi1').style.display='';$('hi2').style.display='none'}
async function hiFile(inp){const f=inp.files&&inp.files[0],m=$('himsg');if(!f)return;if(f.size>8000000){m.textContent='That file is too large (over 8 MB).';inp.value='';return}
 try{const t=await f.text(),n=splitPasted(t).length;hiLoaded={name:f.name,text:t};
  $('hiloaded').innerHTML=n?'Loaded <b>'+esc(f.name)+'</b>: '+n+' message'+(n===1?'':'s')+' found. Tap <b>Check messages</b>.':'';m.textContent=n?'':'No messages were found in that file.'}
 catch(e){hiLoaded=null;m.textContent='Could not read that file.'}inp.value=''}
function hiClearLoaded(){hiLoaded=null;$('hiloaded').textContent=''}
/* Many messages in one paste: blank lines or one message per line separate them; otherwise a sentence that brings a second amount starts a new message. */
function splitPasted(txt){const base=splitMessages(txt);if(base.length>1)return base;
 const t=String(txt||'').replace(/\r\n?/g,'\n').trim();if(!t)return[];
 const amts=(t.match(new RegExp(AMT_LINE.source,'gi'))||[]).length;if(amts<=1)return base;
 const blocks=t.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);if(blocks.length>1){const o=blocks.slice(0,5000).map(b=>({text:b,rcv:null}));o.more=Math.max(0,blocks.length-5000);return o}
 const parts=t.split(/([.!?])\s+(?=[A-Z0-9])/),sent=[];for(let i=0;i<parts.length;i+=2)sent.push((parts[i]||'')+(parts[i+1]||''));
 const out=[];let cur='',n=0;for(const q of sent){const has=AMT_LINE.test(q);if(has&&n>=1){out.push(cur);cur=q;n=1}else{cur=cur?cur+' '+q:q;if(has)n++}}if(cur)out.push(cur);
 return out.slice(0,5000).map(b=>({text:b.trim(),rcv:null})).filter(x=>x.text)}
function hiCutoff(r){if(!r||r==='all')return '';const d=new Date();d.setDate(d.getDate()-Number(r));return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
/* Run the real import on a throw-away copy of the data, so the preview is exactly what the import will do and nothing is saved. */
function hiSimulate(items){const rd=data,rs=save,rr=render,rc=afterCross,rm=month;data=JSON.parse(JSON.stringify(rd));save=function(){};render=function(){};afterCross=function(){};
 try{return runAutoImport(items)}finally{data=rd;save=rs;render=rr;afterCross=rc;month=rm}}
async function hiScan(){const m=$('himsg'),txt=hiLoaded?hiLoaded.text:'';if(!txt.trim()){m.textContent='First run the export Shortcut, then choose FamilyBudget-history.txt above.';return}
 m.textContent='';$('hi1').style.display='none';$('hi2').style.display='';$('hiprog').textContent='Checking the messages\u2026';$('hires').innerHTML='';$('hicommit').style.display='none';
 await new Promise(r=>setTimeout(r,40));
 const all=splitPasted(txt),skipped=0;
 /* Historical import must expand multi-transaction SMS into the same individual
    transaction items used by automatic import BEFORE previewing and committing.
    Preserve each SMS's Received timestamp for every split transaction. */
 const items=all.flatMap(original=>splitTransactionText(original.text).map(part=>
  typeof part==='string'?({text:part,rcv:original.rcv}):({text:part.text,rcv:part.rcv||original.rcv})
  ));
 const res=hiSimulate(items),imp=(res.fresh||0)+res.added,nr=res.review-(res.fresh||0),det=imp+nr+res.duplicate+res.ignored;
 hiState={items,res,all:all.length,skipped};
 const kv=(k,v,bold)=>`<div class="kv"><span>${k}</span><b${bold?' style="color:var(--gt)"':''}>${v}</b></div>`;
 $('hiprog').textContent='Check finished. Nothing has been saved yet.';
 $('hires').innerHTML=kv('Messages checked',all.length)+kv('Transactions detected',det)+kv('New (will wait in Review)',imp,1)+(nr?kv('Look like an existing entry',nr):'')+kv('Already imported',res.duplicate)+(res.ignored?kv('Deleted earlier (skipped)',res.ignored):'')+
  kv('Not a purchase or not recognised',res.rejected+res.invalid)+(all.more?kv('Not read (limit 5,000)',all.more):'')+(skipped?kv('Skipped (outside the dates, or no date)',skipped):'')+
  `<div class="small" style="margin-top:10px">${det?'Check the numbers. If they look wrong, go Back and put a blank line between messages.':'No transactions were found. Make sure you copied the bank messages, then go Back.'}</div>`;
 $('hicommit').style.display=(imp+nr)?'':'none';$('hicommit').textContent='Send to Review'}
function hiCommit(){if(!hiState)return;const m0=month,res=runAutoImport(hiState.items);month=m0;data.setupDone=true;save();
 const waiting=(res.fresh||0)+res.added;hiState=null;$('hiprog').textContent='Done.';
 $('hires').innerHTML=`<div class="kv"><span>Waiting in Review</span><b style="color:var(--gt)">${waiting}</b></div><div class="kv"><span>Already imported</span><b>${res.duplicate}</b></div><div class="small" style="margin-top:10px">${waiting?'Open <b>Review</b> at the top of Home. Check each one, choose a category and tap Save (or Save &amp; next).':'Nothing new to review.'}</div>`;
 $('hicommit').style.display='none'}

/* ---- Test import (V1): sample messages only. There is no bank connection. ---- */
const TEST_MSGS=[
 ['1. Carrefour (Groceries)','ADCB: AED 100 spent at CARREFOUR using Debit Card ending 4821 on 30/09/2026 at 18:42.'],
 ['2. ADNOC (Fuel)','FAB: AED 1,920.00 spent at ADNOC using Credit Card ending 7392 on 28/09/2026 at 19:05.'],
 ['3. DARB (Transport)','ADCB: AED 4 spent at DARB using Debit Card ending 4821 on 29/09/2026 at 08:15. Ref: DRB2026092908'],
 ['4. Restaurant (Food)','Emirates NBD: AED 85.50 spent at AL SAFADI RESTAURANT using Credit Card ending 1122 on 27/09/2026 at 21:30.'],
 ['5. Card last 4 (Pharmacy)','ADCB: AED 42 spent at LIFE PHARMACY using Debit Card ending 4821 on 26/09/2026 at 11:10.'],
 ['6. No card information','AED 60 spent at SPINNEYS on 25/09/2026 at 17:20.'],
 ['7. Unknown card','AED 33 spent at STARBUCKS using Card ending 9999 on 24/09/2026 at 09:05.']];
function renderExamples(){$('texamples').innerHTML=TEST_MSGS.map((m,i)=>`<button class="sm b2" style="margin:6px 6px 0 0" onclick="useExample(${i})">${esc(m[0])}</button>`).join('')+
 '<button class="sm b2" style="margin:6px 6px 0 0" onclick="runDupTest()">8. Duplicate (runs by itself)</button><button class="sm b2" style="margin:6px 6px 0 0" onclick="runDeletedTest()">9. Deleted, then imported again (runs by itself)</button>'+
 '<div class="small" style="margin-top:10px">Sample messages are saved as real entries. Delete them in Transactions when you finish testing.</div>'}
function runDupTest(){const t=TEST_MSGS[0][1],a=importMessage(t),b=importMessage(t),n=data.tx.filter(x=>x.originalDescription===cleanOriginal(t)).length;lastMsgText=t;lastTarget='tres';
 $('tres').innerHTML='Duplicate test: first import = '+a.status+', second import = '+b.status+'. Copies of that transaction: '+n+(n===1?' (correct).':' (should be 1).')}
function runDeletedTest(){const t=TEST_MSGS[1][1],beforeTx=data.tx.length,beforePend=data.pending.length,a=importMessage(t);let x=data.tx.find(y=>y.originalDescription===cleanOriginal(t));if(x){removeTx(x.id);data.tx=data.tx.filter(y=>y.id!==x.id)}else{const q=data.pending.find(y=>y.originalDescription===cleanOriginal(t));if(q)data.pending=data.pending.filter(y=>y.id!==q.id)}
 const b=importMessage(t);lastMsgText=t;lastTarget='tres';
 $('tres').textContent='Deleted/re-import test: first import = '+a.status+', re-import after deletion = '+b.status+'. It should be review/added again, not ignored. (This test uses a sample message; check and remove its sample row afterward.)';save()}
function useExample(i){$('tmsg').value=TEST_MSGS[i][1];$('tres').textContent='Example filled in. Press Import message.'}
function testImport(){const t=$('tmsg').value;lastTarget='tres';$('tres').innerHTML=importFeedback(importMessage(t),t)}
function testAgain(){const t=lastMsgText||$('tmsg').value;if(!t){$('tres').textContent='Import a message first.';return}lastTarget='tres';$('tres').innerHTML=importFeedback(importMessage(t),t)}
function intake(){try{const q=(location.hash||'').match(/[#&]sms=([^&]*)/)||(location.search||'').match(/[?&]sms=([^&]*)/);if(!q)return;
 const t=decodeURIComponent(q[1].replace(/\+/g,' '));try{history.replaceState(null,'',location.pathname)}catch(e){}importMessage(t)}catch(e){}}
function saveTx(e){e.preventDefault();const fm=$('fmsg');fm.textContent='';
 const isExp=$('type').value==='expense',method=$('method').value,keep=!!(curCard&&isExp&&method!=='cash');
 const o={type:$('type').value,merchant:$('merchant').value.trim(),amount:Number($('amount').value),category:$('category').value,date:$('date').value,time:$('time').value,timeEst:curEst&&$('time').value===estTime,method,notes:$('notes').value.trim(),
  card4:keep?curCard.card4:'',cardLast4:keep?curCard.card4:'',cardLabel:keep?curCard.cardLabel:'',cardId:keep?(curCard.cardId||null):null,
  cardType:keep?(curCard.cardType||(method==='credit'?'credit':'debit')):''};
 if(/\d{9,}/.test(o.notes.replace(/[\s-]/g,''))){fm.textContent='Please do not put card, account or other long numbers in notes.';return}
 const b0=expTotal(o.date.slice(0,7));
 if(editId){const i=data.tx.findIndex(t=>t.id===editId),prev=data.tx[i];
  data.tx[i]={...prev,...o,id:editId,...(prev.source==='message'?{userEdited:true}:{})};if(data.tx[i].needsReview&&data.tx[i].merchant){delete data.tx[i].needsReview;data.tx[i].reviewReason=''}}      /* original message / auto fields are never overwritten */
 else{
  if(curImport&&!pendId){const cand={...curImport,type:o.type,amount:o.amount,date:o.date,merchant:o.merchant},live=[...data.tx,...data.pending];
   if(strongDup(cand,live)){fm.textContent='This transaction was already imported, so it was not added again.';return}
   /* Deleted-history is not a duplicate. Only a currently saved/pending match blocks re-import. */
   if(weakDup(cand,live)&&!confirm('This looks the same as an earlier entry. Add it anyway?'))return}
  data.tx.push({...o,...(curImport?importMeta(curImport):{}),id:newId()})}
 if(pendId){data.pending=data.pending.filter(t=>t.id!==pendId);pendId=null}
 month=o.date.slice(0,7);save();afterCross(month,b0);show('transactions')}
function delTx(){const x=data.tx.find(t=>t.id===editId);if(!x)return;
 if(!confirm(x.source==='message'?'Delete this transaction? You can import it again later from your bank-message file.':'Delete this transaction?'))return;
 removeTx(editId);save();show('transactions')}
function saveBudget(e){e.preventDefault();data.budget=Math.min(1000000,Math.max(0,Number($('binput').value)||0));draft=null;save()}
function exportData(){$('bk').value=JSON.stringify(data)}
async function copyData(){exportData();try{await navigator.clipboard.writeText($('bk').value);$('msg').textContent='Copied.'}catch(e){$('bk').select();$('msg').textContent='Select the text and copy it manually.'}}
function importData(){try{const d=JSON.parse($('bk').value);if(!d||!Array.isArray(d.tx))throw 0;const cl=s=>String(s==null?'':s);
 data={budget:Number(d.budget)||0,currency:CURS[d.currency]?d.currency:data.currency,pending:[],
  cards:Array.isArray(d.cards)?d.cards.filter(c=>c&&/^\d{4}$/.test(String(c.last4))).map(c=>({id:c.id||newId(),bank:cl(c.bank),nickname:cl(c.nickname),last4:String(c.last4),type:c.type==='credit'?'credit':'debit',notes:cl(c.notes)})):data.cards,
  alerts:Array.isArray(d.alerts)?d.alerts.map(Number).filter(n=>n>0):[],ignored:Array.isArray(d.ignored)?d.ignored.slice(-500):[],periods:Array.isArray(d.periods)?d.periods:[],profile:d.profile&&typeof d.profile==='object'?{name:cl(d.profile.name).slice(0,40)}:data.profile,setupDone:true,
  tx:d.tx.map(x=>({...x,id:x.id||newId(),type:x.type==='income'?'income':'expense',method:['cash','card','credit'].includes(x.method)?x.method:'',card4:cl(x.card4).replace(/\D/g,'').slice(-4),cardLast4:cl(x.cardLast4||x.card4).replace(/\D/g,'').slice(-4),cardLabel:cl(x.cardLabel),merchant:cl(x.merchant),amount:Number(x.amount)||0,category:cl(x.category||'Other'),date:cl(x.date||today()),time:/^\d{2}:\d{2}$/.test(x.time)?x.time:'',timeEst:!!x.timeEst,originalDescription:x.originalDescription?cleanOriginal(x.originalDescription):undefined}))};
 normData();save();$('msg').textContent='Restored '+data.tx.length+' transactions.'}catch(e){$('msg').textContent='That text is not a valid backup.'}}
function clearAll(){if(confirm('Delete all budget data?')){data={budget:0,currency:data.currency,tx:[],pending:[],alerts:[],cards:data.cards,ignored:[],periods:data.periods,profile:data.profile,setupDone:true};normData();save()}}
document.addEventListener('touchstart',function(){},{passive:true});
(function(){let cur=null;try{cur=localStorage.getItem(KEY)}catch(e){}
 if(cur){idbPut(cur);return}
 idbGet().then(v=>{if(!v||data.tx.length||data.budget)return;try{const d=JSON.parse(v);if(d&&Array.isArray(d.tx)){data=d;normData();try{localStorage.setItem(KEY,v)}catch(e){}render()}}catch(e){}})})();
$('category').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');buildCatGrid();
$('cursel').innerHTML=Object.keys(CURS).map(c=>`<option value="${c}">${CNAME[c]}</option>`).join('');
renderExamples();
initDrag();
intake();window.addEventListener('hashchange',intake);render();

/* ---- Offline support ---- */
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(function(){})}
/* ---- Updates: this must equal VERSION in service-worker.js (change both on every deploy) ---- */
const APP_VERSION='2026-10-14-5';
document.addEventListener('DOMContentLoaded',function(){var e=document.getElementById('verrun');if(e)e.textContent=APP_VERSION});if(document.readyState!=='loading'){var _e=document.getElementById('verrun');if(_e)_e.textContent=APP_VERSION}
function showUpdateBar(){if(document.getElementById('updbar'))return;const b=document.createElement('button');b.id='updbar';b.textContent='New version ready \u00b7 tap to refresh';
 b.onclick=function(){location.reload()};b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:20;background:#2e90fa;color:#fff;border:0;border-radius:999px;padding:10px 18px;min-height:44px;font-weight:650;box-shadow:0 8px 24px rgba(0,0,0,.3)';document.body.appendChild(b)}
async function latestVersion(){try{const r=await fetch('service-worker.js',{cache:'no-store'});const m=(await r.text()).match(/VERSION = '([^']+)'/);return m?m[1]:''}catch(e){return ''}}
async function checkUpdate(){const o=$('verout');o.textContent='Checking...';
 try{const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update()}catch(e){}
 const late=await latestVersion();
 o.innerHTML='Running: <b>'+esc(APP_VERSION)+'</b><br>Latest on your site: <b>'+esc(late||'could not check (no internet?)')+'</b><br>'+
  (!late?'':late===APP_VERSION?'You have the latest version.':'A newer version is on your site. It is being saved now: tap <b>Refresh</b> below, or close the app completely and open it again.')}
if('serviceWorker' in navigator){
 const had=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',function(){if(had)showUpdateBar()});
 window.addEventListener('load',function(){navigator.serviceWorker.register('service-worker.js',{scope:'./'}).then(function(reg){
  /* an iPhone Home Screen app that is only resumed never re-checks by itself, so check every time it comes back to the front */
  document.addEventListener('visibilitychange',function(){if(!document.hidden)reg.update().catch(function(){})});reg.update().catch(function(){})}).catch(function(){})})}

