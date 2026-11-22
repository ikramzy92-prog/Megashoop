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
   let message=chart.parentElement.querySelector('[data-chart-message]');
   if(!message){
    message=el('p');message.dataset.chartMessage='';message.setAttribute('role','status');
    message.style.cssText='padding:28px 12px;text-align:center;font:inherit;color:inherit';
    chart.before(message);
   }
   chart.style.display='none';
   chart.querySelectorAll('text').forEach(label=>label.style.display='none');
   message.hidden=false;message.textContent=t('loading');
   chart.querySelector('[data-daily]')?.remove();
   try{
    const daily=await rpc(db,'daily',{store_key:String(shop.id)});if(current!==version)return;
    const count=daily.reduce((n,r)=>n+Number(r.orders),0),total=daily.reduce((n,r)=>n+Number(r.amount),0);
    const money=n=>n.toFixed(2)+' ₾';
    [money(total),count,count?money(total/count):'—'].forEach((value,i)=>{metrics[i].querySelector('strong').textContent=value;metrics[i].querySelector('.good').textContent=t('report')});
    metrics[0].querySelector('small').textContent=t('amount');document.getElementById('salesChartTitle').textContent=t('amount');
    document.getElementById('salesChartNote').textContent=t('report');message.textContent=count?'':({ru:'За последние 30 дней заказов не было.',ka:'ბოლო 30 დღეში შეკვეთები არ ყოფილა.',en:'No orders in the last 30 days.'}[document.documentElement.lang]||t('empty'));
    message.hidden=Boolean(count);chart.style.display=count?'block':'none';
    const svg='http://www.w3.org/2000/svg',group=document.createElementNS(svg,'g');group.dataset.daily='';
    const peak=Math.max(1,...daily.map(r=>Number(r.amount)));
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tbilisi'});
    for(const r of daily){const age=Math.round((Date.parse(today)-Date.parse(r.day))/86400000),height=178*Number(r.amount)/peak;
     const bar=document.createElementNS(svg,'rect');bar.setAttribute('x',45+(29-age)*16.6);bar.setAttribute('width',12);bar.setAttribute('height',height);bar.setAttribute('y',200-height);bar.setAttribute('fill','#187354');
     const title=document.createElementNS(svg,'title');title.textContent=r.day+' · '+money(Number(r.amount));bar.append(title);group.append(bar)}
    chart.append(group);
   }catch(e){if(current===version){metrics.forEach(m=>m.querySelector('strong').textContent='—');message.textContent=e.message;message.hidden=false;chart.style.display='none'}}
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
   }else if(tab==='settings'){await Shipping.settings(panel,shop,db)}else if(tab==='promotions'){await adOffice(panel,shop,items,db,reload)}
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

const Shipping=(()=>{
 const places={en:['Tbilisi','Batumi','Kutaisi','Rustavi','Gori','Zugdidi'],ru:['Тбилиси','Батуми','Кутаиси','Рустави','Гори','Зугдиди'],ka:['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი']};
 const words={
  ru:['Условия доставки','Город доставки','Доставка, ₾','Срок, дней','Сохранить','Сохранено','Укажите город и проверьте условия доставки','Доставка в этот город пока не настроена','Итого с доставкой','Товары','Останутся в корзине','дн.','Доставка','Заказать','Обновить расчёт'],
  en:['Delivery terms','Delivery city','Delivery fee, ₾','Days to deliver','Save','Saved','Choose a city and review delivery','Delivery to this city is not configured','Total including delivery','Goods','Stay in the cart','days','Delivery','Place order','Refresh quote'],
  ka:['მიწოდების პირობები','მიწოდების ქალაქი','მიწოდების საფასური, ₾','ვადა, დღე','შენახვა','შენახულია','აირჩიეთ ქალაქი და შეამოწმეთ პირობები','ამ ქალაქში მიწოდება ჯერ არ არის დაყენებული','სულ მიწოდებით','საქონელი','კალათაში დარჩება','დღე','მიწოდება','შეკვეთა','განახლება']
 };
 const lang=()=>Object.hasOwn(words,document.documentElement.lang)?document.documentElement.lang:'ka';
 const t=i=>words[lang()][i];
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
 function cities(selected){const input=el('select');places.en.forEach((key,i)=>input.add(new Option(places[lang()][i],key)));input.value=places.en.includes(selected)?selected:places.en[0];return input}
 function label(text,input){const n=el('label',text);n.append(input);return n}
 async function settings(host,shop,db){
  const key=String(shop.id),result=await db.rpc('tvx_get_rates',{store_key:key});if(result.error)throw result.error;
  const rows=result.data||[],city=cities(),fee=el('input'),days=el('input'),save=el('button',t(4)),message=el('p');save.type='button';
  for(const input of [fee,days]){input.type='number';input.min='0';input.required=true}
  fee.step='0.01';days.max='365';days.step='1';message.setAttribute('role','status');
  const show=()=>{const r=rows.find(r=>r.city===city.value);fee.value=r?.fee??'';days.value=r?.days??'';message.textContent=''};
  city.onchange=show;show();
  save.onclick=async()=>{if(!fee.reportValidity()||!days.reportValidity())return;
   const args={store_key:key,city:city.value,fee:fee.value,days:Number(days.value)};save.disabled=city.disabled=fee.disabled=days.disabled=true;
   try{const {error}=await db.rpc('tvx_set_rate',args);if(error)throw error;const old=rows.find(r=>r.city===args.city);if(old)Object.assign(old,args);else rows.push(args);message.textContent=t(5)}
   catch(e){message.textContent=e.message}finally{save.disabled=city.disabled=fee.disabled=days.disabled=false}
  };host.append(el('h3',t(0)),label(t(1),city),label(t(2),fee),label(t(3),days),save,message)
 }
 let quote=null,version=0,cityKey;
 function signature(rows){return JSON.stringify(rows.map(r=>[r.id,r.price,r.quantity]))}
 async function refresh(){
  const form=document.getElementById('mmOrderForm'),host=document.getElementById('deliveryQuoteNote'),submit=document.getElementById('mmPrepareOrder');
  if(!form||!host||document.getElementById('mmCheckoutDialog').hidden)return;
  const seq=++version;quote=null;submit.disabled=true;
  if(!cityKey){try{cityKey=sessionStorage.getItem('tovex-delivery-city')}catch{}}
  const city=cities(cityKey),details=el('span',t(6)),retry=el('button',t(14));retry.type='button';retry.onclick=refresh;
  host.replaceChildren(label(t(1),city),details,retry);cityKey=city.value;city.onchange=()=>{cityKey=city.value;refresh()};
  const all=window.mmGetCart(),rows=eligibleCart(all),goods=rows.reduce((sum,r)=>sum+Math.round(r.price*100)*r.quantity,0);
  document.getElementById('goodsOnReceipt').textContent=t(9)+' · '+(goods/100).toFixed(2)+' ₾';
  if(!rows.length)return;
  try{
   const res=await window.mmBuyerDb.rpc('tvx_shipping',{pids:[...new Set(rows.map(orderProductId))],city:cityKey});
   if(seq!==version)return;if(res.error)throw res.error;
   const entries=res.data||[],lines=entries.map(r=>r.store_name+' · '+(r.fee==null?t(7):Number(r.fee).toFixed(2)+' ₾ · '+r.days+' '+t(11)));
   if(all.length>rows.length)lines.push(t(10)+': '+all.filter(r=>!orderProductId(r)).map(r=>r.name).join(', '));
   if(entries.length&&entries.every(r=>r.fee!=null&&r.days!=null)){
    const cents=entries.reduce((sum,r)=>sum+Math.round(r.fee*100),goods);
    lines.push(t(8)+' · '+(cents/100).toFixed(2)+' ₾');quote={city:cityKey,entries,signature:signature(rows)};submit.disabled=false
   }
   details.textContent=lines.join('\n')||t(7);details.style.whiteSpace='pre-line';details.style.display='block'
  }catch(e){if(seq===version)details.textContent=e.message}
 }
 function confirmed(rows){if(!quote||quote.signature!==signature(rows))throw Error(t(6));return {p_city:quote.city,p_quote:quote.entries}}
 function summary(order){if(order.shipping_fee_gel==null)return '';const i=places.en.indexOf(order.shipping_city);return t(12)+' · '+(places[lang()][i]||order.shipping_city)+' · '+Number(order.shipping_fee_gel).toFixed(2)+' ₾ · '+order.shipping_days+' '+t(11)}
 return {settings,refresh,confirmed,summary,t};
})();
