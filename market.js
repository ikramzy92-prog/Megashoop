const Market = (() => {
 const translations={
  questions:['Вопросы о товаре','კითხვები პროდუქტზე','Product questions'],ask:['Задать вопрос','კითხვის დასმა','Ask a question'],
  waiting:['Ожидает ответа','პასუხის მოლოდინში','Awaiting reply'],answer:['Ответить','პასუხის გაცემა','Reply'],
  returns:['Возвраты','დაბრუნებები','Returns'],reason:['Причина возврата','დაბრუნების მიზეზი','Reason for return'],
  request:['Оформить возврат','დაბრუნების მოთხოვნა','Request return'],pending:['На рассмотрении','განხილვაშია','Pending'],
  approved:['Одобрено','დამტკიცებულია','Approved'],declined:['Отклонено','უარყოფილია','Declined'],
  approve:['Одобрить','დამტკიცება','Approve'],decline:['Отклонить','უარყოფა','Decline'],
  note:['Ответ покупателю','პასუხი მყიდველს','Message to buyer'],empty:['Пока нет записей','ჩანაწერები ჯერ არ არის','No entries yet'],
  report:['Аналитика за 30 дней','ბოლო 30 დღის ანალიტიკა','Last 30 days'],
  product:['Товар','პროდუქტი','Product'],query:['Поисковый запрос','საძიებო ფრაზა','Search term'],
  searches:['Показы в поиске','ძიებაში ჩვენებები','Search impressions'],views:['Просмотры карточки','ბარათის ნახვები','Product views'],
  carts:['Добавления в корзину','კალათაში დამატება','Adds to cart'],orders:['Заказы','შეკვეთები','Orders'],units:['Заказано, шт.','შეკვეთილი ერთეულები','Units ordered'],
  amount:['Сумма заказов, ₾','შეკვეთების თანხა, ₾','Order value, ₾'],direct:['Без запроса','საძიებო ფრაზის გარეშე','No search term'],
  loading:['Загрузка…','იტვირთება…','Loading…'],refresh:['Обновить','განახლება','Refresh'],login:['Войдите, чтобы задать вопрос','კითხვის დასასმელად გაიარეთ ავტორიზაცია','Sign in to ask'],
  ads:['Продвижение товаров','პროდუქტების რეკლამა','Product promotion'],sponsored:['Реклама','რეკლამა','Sponsored']
 };
 function t(key){const i={ru:0,ka:1,en:2}[document.documentElement.lang]??1;return translations[key]?.[i]??key}
 function el(tag,text){const n=document.createElement(tag);if(text!=null)n.textContent=text;return n}
 function button(text,action){
  const b=el('button',text);b.type='button';
  b.onclick=async()=>{b.disabled=true;try{await action()}catch(e){let out=b.parentElement?.querySelector('[data-feedback]');if(!out&&b.parentElement){out=el('p');out.dataset.feedback='';out.setAttribute('role','alert');b.after(out)}if(out)out.textContent=e.message||String(e)}finally{b.disabled=false}};
  return b;
 }
 async function rpc(db,name,args={}){if(!db)throw Error('Supabase unavailable');const {data,error}=await db.rpc('tvx_'+name,args);if(error)throw error;return data}
 function field(label,max=1000){const box=el('label',label),input=el('textarea');input.required=true;input.maxLength=max;box.append(input);return {box,input}}
 function read(input){if(!input.value.trim()){input.focus();input.reportValidity();throw Error(t('empty'))}return input.value.trim()}
 async function questions(host,p){
  if(!p.tovex_seller_product)return;
  const db=window.mmBuyerDb,pid=p.seller_product_id;
  async function draw(){
   host.replaceChildren(el('h3',t('questions')));
   try{const rows=await rpc(db,'questions',{pid});for(const row of rows)host.append(el('p',row.question),el('strong',row.answer||t('waiting')));
    if(window.mmBuyerUser){const f=field(t('ask'));host.append(f.box,button(t('ask'),async()=>{await rpc(db,'ask',{pid,question_text:read(f.input)});await draw()}))}
    else host.append(button(t('login'),()=>{host.closest('dialog')?.close();document.getElementById('mmAccountOpen')?.click()}));
   }catch(e){host.append(el('p',e.message),button(t('refresh'),draw))}
  }
  await draw();
 }
 async function returns(host,orders,items,deliveries,db){
  const previous=await rpc(db,'my_returns');
  for(const panel of host.querySelectorAll('[data-return-order]')){
   const oid=panel.dataset.returnOrder;
   for(const item of new Map(items.filter(i=>String(i.order_id)===oid&&i.seller_product_id!=null).map(i=>[i.seller_product_id,i])).values()){
    const pid=item.seller_product_id,prior=previous.find(r=>String(r.order_id)===oid&&String(r.product)===String(pid));
    const completed=deliveries.some(d=>String(d.order_id)===oid&&d.status==='delivered'&&(item.store_id==null||String(item.store_id)===String(d.store_id)));
    if(!prior&&!completed)continue;
    const details=el('details');details.append(el('summary',t('returns')+' · '+item.product_name));panel.append(details);
    if(prior){details.append(el('p',t(prior.decision)),el('p',prior.response));continue}
    const f=field(t('reason'));details.append(f.box,button(t('request'),async()=>{
     await rpc(db,'return',{oid,pid,reason_text:read(f.input)});
     details.replaceChildren(el('summary',t('returns')+' · '+item.product_name),el('p',t('pending')));
    }));
   }
  }
 }
 const terms=new Map();
 function term(){return document.getElementById('search')?.value.trim().toLowerCase().slice(0,100)||''}
 function record(kind,pids,query=term()){
  if(!pids.length||!window.mmBuyerDb||!globalThis.crypto?.randomUUID)return;
  rpc(window.mmBuyerDb,'event',{eid:crypto.randomUUID(),pids,kind,term:query}).catch(console.warn)
 }
 function cart(p){if(!p.seller_product_id)return;const q=term();terms.set(String(p.seller_product_id),q);
  try{sessionStorage.setItem('tvx.term.'+p.seller_product_id,q)}catch{}
  record('cart',[p.seller_product_id],q);
 }
 async function attribute(db,orders,items){
  const calls=[];for(const {order_id:oid} of orders)for(const {seller_product_id:pid} of items){
   let q=terms.get(String(pid));try{q??=sessionStorage.getItem('tvx.term.'+pid)}catch{}
   if(q)calls.push(rpc(db,'attribute',{oid,pid,term:q}));
  }await Promise.allSettled(calls);
 }
 let version=0;
 async function office(tab,shop,items,db){
  const current=++version;
  if(tab==='dashboard'&&shop){
   const metrics=[...document.querySelectorAll('#dashboard .dash-metric')].slice(0,3);
   const chart=document.querySelector('.dash-chart');
   for(const m of metrics){m.querySelector('strong').textContent='…';m.querySelector('.good').textContent=''}
   chart.querySelector('[data-daily]')?.remove();
   try{
    const daily=await rpc(db,'daily',{store_key:String(shop.id)});if(current!==version)return;
    const count=daily.reduce((n,r)=>n+Number(r.orders),0),total=daily.reduce((n,r)=>n+Number(r.amount),0);
    const money=n=>n.toFixed(2)+' ₾';
    [money(total),count,count?money(total/count):'—'].forEach((value,i)=>{metrics[i].querySelector('strong').textContent=value;metrics[i].querySelector('.good').textContent=t('report')});
    metrics[0].querySelector('small').textContent=t('amount');document.getElementById('salesChartTitle').textContent=t('amount');
    document.getElementById('salesChartNote').textContent=t('report');document.getElementById('chartEmpty').textContent=count?'':t('empty');
    const svg='http://www.w3.org/2000/svg',group=document.createElementNS(svg,'g');group.dataset.daily='';
    const peak=Math.max(1,...daily.map(r=>Number(r.amount)));
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tbilisi'});
    for(const r of daily){const age=Math.round((Date.parse(today)-Date.parse(r.day))/86400000),height=178*Number(r.amount)/peak;
     const bar=document.createElementNS(svg,'rect');bar.setAttribute('x',45+(29-age)*16.6);bar.setAttribute('width',12);bar.setAttribute('height',height);bar.setAttribute('y',200-height);bar.setAttribute('fill','#187354');
     const title=document.createElementNS(svg,'title');title.textContent=r.day+' · '+money(Number(r.amount));bar.append(title);group.append(bar)}
    chart.append(group);
   }catch(e){if(current===version){metrics.forEach(m=>m.querySelector('strong').textContent='—');document.getElementById('salesChartNote').textContent=e.message}}
   return;
  }
  const host=document.getElementById('tvx-'+tab);if(!host||!shop)return;
  host.replaceChildren(el('p',t('loading')));
  const reload=()=>office(tab,shop,items,db);
  try{
   const panel=el('div');
   if(tab==='orders'){
    const data=await rpc(db,'inbox',{store_key:String(shop.id)});
    panel.append(el('h3',t('questions')));
    if(!data.questions.length)panel.append(el('p',t('empty')));
    for(const q of data.questions){const row=el('article');row.append(el('strong',q.name),el('p',q.question));panel.append(row);
     const f=field(t('answer'),2000);f.input.value=q.answer||'';row.append(f.box,button(t('answer'),async()=>{await rpc(db,'answer',{qid:q.id,answer_text:read(f.input)});await reload()}))}
    panel.append(el('h3',t('returns')));
    if(!data.returns.length)panel.append(el('p',t('empty')));
    for(const r of data.returns){const row=el('article');panel.append(row);row.append(el('strong',r.name+' · #'+r.order_id.slice(0,8)),el('p',r.reason),el('p',t(r.decision)));
     if(r.decision!=='pending'){row.append(el('p',r.response));continue}
     const f=field(t('note'));row.append(f.box);for(const [label,result] of [['approve','approved'],['decline','declined']])row.append(button(t(label),async()=>{
      const note=result==='declined'?read(f.input):f.input.value.trim();await rpc(db,'decide',{rid:r.id,result,note});await reload()}))}
   }else if(tab==='reports'){
    const rows=await rpc(db,'report',{store_key:String(shop.id)});panel.append(el('h3',t('report')));
    if(!rows.length)panel.append(el('p',t('empty')));else{
     const table=el('table'),head=table.createTHead().insertRow();for(const key of ['product','query','searches','views','carts','orders','units','amount'])head.append(el('th',t(key)));
     const body=table.createTBody();for(const r of rows){const tr=body.insertRow();for(const val of [r.product_name,r.query||t('direct'),r.searches,r.views,r.carts,r.orders,r.units,Number(r.amount).toFixed(2)])tr.insertCell().textContent=val}panel.append(table)
    }
   }else if(tab==='promotions'){await adOffice(panel,shop,items,db,reload)}
   if(current===version)host.replaceChildren(panel,button(t('refresh'),reload));
  }catch(e){if(current===version)host.replaceChildren(el('p',e.message),button(t('refresh'),reload))}
 }
 Object.assign(translations,{
  days:['Дней показа','ჩვენების დღეები','Days to promote'],apply:['Запросить размещение','განთავსების მოთხოვნა','Request placement'],
  requested:['Заявка отправлена','მოთხოვნა გაგზავნილია','Requested'],invoiced:['Ожидает оплаты','გადახდის მოლოდინში','Awaiting payment'],
  active:['Реклама активна','რეკლამა აქტიურია','Active'],ended:['Завершена','დასრულებულია','Ended'],cancelled:['Отменена','გაუქმებულია','Cancelled'],
  clicks:['Клики','დაწკაპუნებები','Clicks'],impressions:['Показы','ჩვენებები','Impressions'],until:['До','დასრულება','Until'],
  price:['Стоимость, ₾','ფასი, ₾','Price, ₾'],noProduct:['Нет опубликованных товаров','გამოქვეყნებული პროდუქტი არ არის','No published products']
 });
 async function adOffice(panel,shop,items,db,reload){
  panel.append(el('h3',t('ads')));
  const eligible=items.filter(p=>p.status==='approved'),rows=await rpc(db,'ad_list',{store_key:String(shop.id)});
  if(eligible.length){
   const choice=el('select'),label=el('label',t('product'));label.append(choice);
   for(const p of eligible)choice.add(new Option(p.name,String(p.id)));
   const duration=el('input'),days=el('label',t('days'));duration.type='number';duration.min='1';duration.max='90';duration.required=true;duration.value='7';days.append(duration);
   panel.append(label,days,button(t('apply'),async()=>{if(!duration.reportValidity())return;await rpc(db,'ad_request',{pid:choice.value,days:Number(duration.value)});await reload()}))
  }else panel.append(el('p',t('noProduct')));
  for(const c of rows){const row=el('article');panel.append(row);row.append(el('strong',c.name+' · '+t(c.state)),el('p','#'+c.id+' · '+t('days')+' '+c.days));
   if(c.amount)row.append(el('p',t('price')+' '+c.amount));
   if(c.payment_details&&c.state==='invoiced')row.append(el('p',c.payment_details));
   if(c.ends)row.append(el('p',t('until')+' '+new Date(c.ends).toLocaleDateString()));
   row.append(el('p',t('impressions')+' '+c.views+' · '+t('clicks')+' '+c.clicks));
  }
 }
 async function ads(host){
  const db=window.mmBuyerDb;if(!db)return;
  const rows=await rpc(db,'ads');if(!rows.length)return;
  const title=el('h3',t('sponsored'));host.append(title);host.hidden=false;
  new MutationObserver(()=>title.textContent=t('sponsored')).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&e.intersectionRatio>=0.5){observer.unobserve(e.target);adEvent(e.target.dataset.campaign,'view')}},{threshold:0.5});
  function adEvent(cid,kind){rpc(db,'ad_event',{cid,eid:crypto.randomUUID(),kind}).catch(console.warn)}
  for(const {campaign,product:p} of rows){
   const card=button(p.name,async()=>{
    const {data,error}=await db.from('seller_products').select('*,stores!inner(status,name)').eq('id',p.id).eq('status','approved').eq('stores.status','approved').single();
    if(error)throw error;
    adEvent(campaign,'click');window.tovexShowProduct({...data,id:'seller-'+data.id,seller_product_id:data.id,price:data.price_gel,quantity:data.stock,tovex_seller_product:true});
   });
   if(p.image_url){const img=el('img');img.alt='';img.src=p.image_url;card.prepend(img)}
   card.dataset.campaign=campaign;host.append(card);observer.observe(card);
  }
 }
 return {office,questions,returns,cart,record,attribute,ads};
})();
