/* Bez frameworka i bez analityki. Preferencje oraz ukończone punkty pozostają lokalnie. */
(() => {
  'use strict';
  const G = window.GUIDE;
  if (!G) return;
  const $ = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(`sarajevo.${key}`)); return v ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(`sarajevo.${key}`, JSON.stringify(value)); } catch { /* Tryb prywatny: interfejs nadal działa. */ } };
  const pl = (value, digits = 2) => Number(value).toLocaleString('pl-PL', {minimumFractionDigits:digits, maximumFractionDigits:digits});
  const km = (value) => `${pl(value, Number.isInteger(Number(value)) ? 0 : 2)} KM`;
  const niceDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('.') : 'brak daty';
  const today = (() => { const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sarajevo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const get=t=>parts.find(p=>p.type===t).value; return `${get('year')}-${get('month')}-${get('day')}`; })();
  const validFx = (v) => v && Number.isFinite(v.eur) && v.eur > 1 && v.eur < 20 && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && v.date <= today;
  const savedFx = read('fx', null);
  let fx = validFx(savedFx) && savedFx.date >= G.fx.date ? savedFx : {...G.fx};
  let currency = read('currency', 'BAM') === 'PLN' ? 'PLN' : 'BAM';
  let favorites = new Set((Array.isArray(read('favorites', [])) ? read('favorites', []) : []).filter(id => G.places.some(p => p.id === id)));
  let done = new Set(Array.isArray(read('done', [])) ? read('done', []) : []);
  let activeDay = G.days.find(d => d.date === today)?.id || 'thu';
  let activeTab = 'plan', filter = 'all', map, mapLoading = false, mapMode = 'local', mapLayer, userMarker;
  let busyRate = false, toastTimer;
  const rate = () => fx.eur / G.fx.peg;
  const primaryMoney = (amount) => currency === 'PLN' ? `≈ ${pl(amount * rate())} zł` : km(amount);
  const secondaryMoney = (amount) => currency === 'PLN' ? km(amount) : `≈ ${pl(amount * rate())} zł`;
  const label = {base:'Baza', travel:'Dojazd', see:'Zwiedzanie', food:'Jedzenie', shop:'Zakupy / SIM'};
  const kind = {agenda:'Agenda', own:'Propozycja', option:'Opcja', check:'Do ustalenia', flight:'Lot'};
  const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const sourceLinks = (ids = []) => ids.filter(id => G.sources[id]).map(id => `<a href="${esc(G.sources[id][1])}" target="_blank" rel="noopener noreferrer">${esc(G.sources[id][0])} ↗</a>`).join('');
  const findPlace = (id) => G.places.find(p => p.id === id);
  const destination = (p) => p.pos ? p.pos.join(',') : `${p.name.replace(/ ·.*/, '')}, ${p.address}, ${p.area === 'Ilidža' ? 'Ilidža' : p.area === 'Dalej' ? '' : 'Sarajevo'}, Bosnia and Herzegovina`;
  const mapsUrl = (p) => 'https://www.google.com/maps/search/?' + new URLSearchParams({api:'1',query:destination(p)});
  const routeUrl = (p, mode = 'walking') => 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',origin:G.hotel.join(','),destination:destination(p),travelmode:mode});
  function distance(p) {
    if (!p.pos) return null;
    const rad = x => x * Math.PI / 180;
    const [a,b] = G.hotel.map(rad), [c,d] = p.pos.map(rad);
    const h = Math.sin((c-a)/2)**2 + Math.cos(a)*Math.cos(c)*Math.sin((d-b)/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0,1-h)));
  }
  function distanceText(p) {
    const d = distance(p);
    if (d === null) return 'Trasę i odległość sprawdź w Mapach';
    if (p.id === 'hotel') return 'Punkt startowy';
    return `${d < 1 ? `${Math.round(d*1000/10)*10} m` : `${pl(d,1)} km`} od hotelu · w linii prostej`;
  }
  function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden=false; toastTimer=setTimeout(()=>{$('toast').hidden=true;},3200); }
  function renderDays() {
    $('days').innerHTML = G.days.map(d => `<button class="day-btn ${d.id===activeDay?'active':''} ${d.date===today?'today':''}" data-day="${d.id}" aria-pressed="${d.id===activeDay}" aria-label="${esc(d.short)} ${d.number} września"><span>${esc(d.short)}</span><strong class="mono">${d.number}</strong></button>`).join('');
  }
  function renderPlan() {
    const d = G.days.find(d => d.id === activeDay) || G.days[0];
    const completed = d.events.filter((_,i)=>done.has(`${d.id}-${i}`)).length;
    $('plan-content').innerHTML = `<div class="event-top"><span class="eyebrow">${niceDate(d.date)}</span><span class="small">${completed}/${d.events.length} odhaczone</span></div><h3>${esc(d.title)}</h3><p class="small">${esc(d.subtitle)}</p><div class="timeline">${d.events.map((e,i)=>{const key=`${d.id}-${i}`; const p=findPlace(e.place); return `<article class="event ${done.has(key)?'done':''}"><input type="checkbox" data-done="${key}" aria-label="Odhacz: ${esc(e.title)}" ${done.has(key)?'checked':''}><div><div class="event-top"><span class="event-time mono">${esc(e.time)}</span><span class="badge ${e.kind}">${kind[e.kind]}</span></div><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p>${p?`<a href="${esc(routeUrl(p,p.cat==='travel'&&p.id==='airport'?'driving':p.id==='tunnel'?'driving':'walking'))}" target="_blank" rel="noopener noreferrer">${esc(p.name)} · trasa z hotelu ↗</a>`:''}</div></article>`;}).join('')}</div>`;
    renderDays();
  }
  function renderPrintPlan() {
    $('print-plan').innerHTML=G.days.map(d=>`<article class="print-day"><h3>${niceDate(d.date)} · ${esc(d.title)}</h3><p class="small">${esc(d.subtitle)}</p><ol>${d.events.map(e=>`<li><strong>${esc(e.time)} · ${esc(e.title)}</strong> [${kind[e.kind]}]<br>${esc(e.text)}</li>`).join('')}</ol></article>`).join('');
  }
  function matches(p) {
    const query = normalize($('search').value.trim());
    const area = $('area').value;
    return (!query || normalize([p.name,p.address,p.desc,p.area].join(' ')).includes(query)) && (area==='all' || p.area===area || (area==='Dalej' && p.area==='Poza Ilidžą')) && (filter==='all' || (filter==='favorites'?favorites.has(p.id):filter==='travel'?['travel','base'].includes(p.cat):p.cat===filter));
  }
  function placeCard(p) {
    const hasPrice=Number.isFinite(p.price);
    return `<article class="place-card" id="place-${p.id}"><div class="place-card-top"><span class="badge">${label[p.cat]} · ${esc(p.area)}</span><button class="fav" data-fav="${p.id}" aria-pressed="${favorites.has(p.id)}" aria-label="${favorites.has(p.id)?'Usuń z':'Dodaj do'} ulubionych: ${esc(p.name)}">${favorites.has(p.id)?'★':'☆'}</button></div><h3>${esc(p.name)}</h3><p class="address">${esc(p.address)}<br><span>${esc(distanceText(p))}</span></p><p class="description">${esc(p.desc)}</p>${hasPrice?`<div class="place-price">${primaryMoney(p.price)}<small>${secondaryMoney(p.price)} · ${esc(p.unit||'osoba')}${Number.isFinite(p.student)?` · student ${km(p.student)} / ≈ ${pl(p.student*rate())} zł`:''}</small></div>`:`<p class="small" style="margin-top:14px">${['food','see'].includes(p.cat)?'Brak potwierdzonej ceny w przewodniku.':'Sprawdź szczegóły przed wyjściem.'}</p>`}${Number.isFinite(p.pair)?`<div class="pair"><strong>${primaryMoney(p.pair)}</strong> <span>(${secondaryMoney(p.pair)})</span><br>${esc(p.pairlabel)} · dla dwóch</div>`:''}<details><summary>Szczegóły, godziny i źródła</summary>${p.hours?`<p><strong>Godziny:</strong> ${esc(p.hours)}</p>`:''}${p.time?`<p><strong>Nasz zapas czasu:</strong> ${esc(p.time)}</p>`:''}${p.notice?`<p class="notice">${esc(p.notice)}</p>`:''}${p.phone?`<p><a href="tel:${esc(p.phone)}">Zadzwoń: ${esc(p.phone)}</a></p>`:''}<div class="source-links">${sourceLinks(p.sources)}</div><p>Weryfikacja: 06.09.2026. Nie jest to potwierdzenie „otwarte teraz”.</p></details><div class="btn-row"><a class="btn primary" href="${esc(mapsUrl(p))}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a><a class="btn" href="${esc(routeUrl(p))}" target="_blank" rel="noopener noreferrer">Z hotelu pieszo ↗</a><a class="btn" href="${esc(routeUrl(p,'driving'))}" target="_blank" rel="noopener noreferrer">Autem ↗</a></div></article>`;
  }
  function renderPlaces() {
    const found=G.places.filter(matches);
    $('places').innerHTML=found.length?found.map(placeCard).join(''):'<p class="empty">Brak miejsc dla tych filtrów. Wyczyść wyszukiwanie lub wybierz „Wszystko”.</p>';
    $('place-count').textContent=`${found.length} z ${G.places.length} miejsc · ★ zapisuje ulubione tylko na tym urządzeniu.`;
    all('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
  }
  function showPlace(id) {
    const p=findPlace(id); if(!p) return;
    filter='all'; $('search').value=p.name; $('area').value='all'; renderPlaces(); showTab('places');
  }
  function renderMeals() {
    const meals=[['sokak',20,'Dwa duże döner kebaby','Kurczak · bez napojów'],['montana',19,'Dwie pizze Margarita','Bez napojów i dostawy'],['hodzic',39,'Ćevapi, kajmak i woda × 2','Po 10 sztuk, kajmak i woda dla każdego'],['smash',39,'Dwa zestawy burgerowe','Pokazana promocja; frytki i napój w zestawie']];
    $('meal-options').innerHTML=meals.map(([id,amount,title,note])=>`<article class="meal-card"><span class="eyebrow">${esc(findPlace(id).name)}</span><h3 style="margin-top:10px">${esc(title)}</h3><p class="small">${esc(note)}</p><div class="amount">${primaryMoney(amount)}</div><p class="small">${secondaryMoney(amount)} · razem</p><div class="compact-links"><button class="btn" data-meal="${amount}">Do budżetu</button><button class="btn" data-place="${id}">Lokal ↗</button></div></article>`).join('');
  }
  function renderMoney() {
    $('hero-rate').textContent=`1 KM ≈ ${pl(rate())} zł`;
    $('hero-rate-date').textContent=`NBP · ${niceDate(fx.date)} · orientacyjny`;
    $('rate-main').textContent=`1 KM ≈ ${pl(rate(),4)} zł`;
    $('rate-meta').textContent=`EUR/PLN NBP: ${pl(fx.eur,4)} z ${niceDate(fx.date)}. 1 EUR = 1,95583 BAM.`;
    $('currency-toggle').textContent=currency==='BAM'?'KM / zł':'zł / KM';
    $('currency-toggle').setAttribute('aria-label',`Główna waluta: ${currency==='BAM'?'marki':'złotówki'}. Naciśnij, aby zmienić.`);
    all('[data-bam]').forEach(el=>el.textContent=primaryMoney(Number(el.dataset.bam)));
    const amount=Number($('bam').value); $('pln').value=$('bam').value!==''&&Number.isFinite(amount)&&amount>=0?(amount*rate()).toFixed(2):'';
    renderPlaces(); renderMeals(); updateBudget(); if(map) drawMarkers(false);
  }
  const safeAmount = (id) => { const v=Number($(id).value); return Number.isFinite(v)&&v>=0?v:0; };
  function updateBudget() {
    const student=$('budget-student').checked;
    const tunnel=student?16:40, childhood=student?24:30;
    $('tunnel-budget-label').textContent=primaryMoney(tunnel);
    $('childhood-budget-label').textContent=primaryMoney(childhood);
    const travel=safeAmount('budget-travel');
    const total=($('budget-park').checked?12:0)+($('budget-tunnel').checked?tunnel:0)+safeAmount('budget-cable')+($('budget-avaz').checked?10:0)+($('budget-childhood').checked?childhood:0)+safeAmount('budget-food')+safeAmount('budget-drinks')+travel;
    $('budget-total').textContent=`${km(total)} ≈ ${pl(total*rate())} zł`;
    $('budget-per-person').textContent=`Na osobę: ${km(total/2)} ≈ ${pl(total*rate()/2)} zł. Bez noclegu i lotów.`;
    $('budget-warning').textContent=travel===0?'Transport ustawiony na 0: dopisz bilety, kursy taxi lub dostawę. Podane kwoty jedzenia i napojów są Twoim założeniem.':'Kwota transportu jest założeniem, nie potwierdzonym cennikiem. Sprawdź, czy obejmuje wszystkie kursy, bilety i opłaty dostawy.';
  }
  async function refreshRate() {
    if(busyRate)return; busyRate=true; $('refresh-rate').disabled=true;
    $('rate-status').textContent='Sprawdzanie najnowszej opublikowanej tabeli NBP…';
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json',{signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error('NBP HTTP '+response.status);
      const data=await response.json(); const r=data.rates?.[0]; const next={eur:r?.mid,date:r?.effectiveDate};
      if(data.code!=='EUR'||!validFx(next)||next.date<fx.date)throw new Error('Nieprawidłowa lub starsza tabela NBP');
      fx=next;write('fx',fx);renderMoney();
      $('rate-status').textContent=`Pobrano z NBP. Najnowsza dostępna tabela: ${niceDate(fx.date)}. Nie jest to kurs rozliczenia karty.`;
    } catch {
      $('rate-status').textContent=`Nie udało się odświeżyć online. Używany jest zapisany kurs z ${niceDate(fx.date)}; nie przedstawiamy go jako kursu na żywo.`;
    } finally {clearTimeout(timeout);busyRate=false;$('refresh-rate').disabled=false;}
  }
  function themeUpdate() {
    const dark=document.documentElement.dataset.theme==='dark';
    $('theme-toggle').setAttribute('aria-label',dark?'Włącz jasny motyw':'Włącz ciemny motyw');
    $('theme-toggle').setAttribute('aria-pressed',String(dark));
    $('theme-toggle').querySelector('span').textContent=dark?'☀':'☾';
    $('theme-color').content=dark?'#111b22':'#f5f3ec';
  }
  function showTab(tab, scroll=true, saveHash=true) {
    if(!['plan','map','places','wallet','info'].includes(tab))return;
    activeTab=tab;
    all('main > .panel').forEach(el=>{el.hidden=el.id!==`panel-${tab}`;});
    all('[data-tab]').forEach(b=>{if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(saveHash){try{history.replaceState(null,'',`#${tab}${tab==='plan'?'/'+activeDay:''}`);}catch{}}
    if(scroll)$('main').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(tab==='map'){ renderMapList(); ensureMap().then(()=>{if(map)setTimeout(()=>map.invalidateSize(),100);}); }
  }
  function renderMapList() {
    const list=G.places.filter(p=>mapMode==='favorites'?favorites.has(p.id):p.pos||['atm','airport'].includes(p.id));
    $('map-list').innerHTML=list.length?list.map(p=>`<div class="map-item"><span class="marker-mini" aria-hidden="true">${p.pos?'★':'↗'}</span><div><div class="name">${esc(p.name)}</div><div class="distance">${esc(distanceText(p))}${!p.pos?' · bez precyzyjnej gwiazdki':''}</div></div><a href="${esc(mapsUrl(p))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.name)} w Google Maps">↗</a></div>`).join(''):'<p class="empty">Najpierw dodaj miejsca do ulubionych gwiazdką na karcie w sekcji Miejsca.</p>';
  }
  let leafletPromise;
  function loadLeaflet() {
    if(window.L)return Promise.resolve();
    if(leafletPromise)return leafletPromise;
    leafletPromise=new Promise((resolve,reject)=>{
      let loaded=0;const finish=()=>{loaded++;if(loaded===2){clearTimeout(timer);resolve();}};
      const fail=()=>{clearTimeout(timer);leafletPromise=null;reject(new Error('Nie pobrano biblioteki mapy'));};
      const timer=setTimeout(fail,12000);
      const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.onload=finish;css.onerror=fail;document.head.append(css);
      const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=finish;js.onerror=fail;document.head.append(js);
    });return leafletPromise;
  }
  async function ensureMap() {
    if(map||mapLoading)return;mapLoading=true;
    try {
      await loadLeaflet();
      $('map').innerHTML='';
      map=L.map('map',{scrollWheelZoom:false,zoomControl:true}).setView(G.hotel,14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
      mapLayer=L.layerGroup().addTo(map);drawMarkers();
    } catch {
      $('map').innerHTML='<div class="map-loading"><strong>✦</strong><span>Nie udało się pobrać mapy online.<br>Wszystkie linki Google Maps poniżej nadal są dostępne.</span><button id="retry-map">Spróbuj ponownie</button></div>';
    } finally {mapLoading=false;}
  }
  function drawMarkers(fit=true) {
    if(!map||!mapLayer)return;mapLayer.clearLayers();
    const list=G.places.filter(p=>p.pos&&(mapMode!=='favorites'||favorites.has(p.id)));
    list.forEach(p=>{
      const marker=L.marker(p.pos,{title:p.name,alt:p.name,keyboard:true,icon:L.divIcon({className:'map-stars',html:`<span class="star-pin ${p.cat}" aria-hidden="true">★</span>`,iconSize:[35,35],iconAnchor:[17,35],popupAnchor:[0,-35]})});
      marker.bindPopup(`<b>${esc(p.name)}</b><p style="margin:5px 0 8px">${esc(p.address)}<br><small>${esc(distanceText(p))}</small></p>${Number.isFinite(p.price)?`<strong>${primaryMoney(p.price)}</strong> · ${esc(p.unit||'osoba')}<br>`:''}<a class="btn primary" href="${esc(mapsUrl(p))}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a> <a class="btn" href="${esc(routeUrl(p))}" target="_blank" rel="noopener noreferrer">Z hotelu pieszo ↗</a><br><a class="btn" href="${esc(routeUrl(p,'driving'))}" target="_blank" rel="noopener noreferrer">Z hotelu autem ↗</a>`,{maxWidth:290});
      marker.addTo(mapLayer);
    });
    if(fit){
      if(mapMode==='local')map.setView(G.hotel,14);
      else if(mapMode==='center')map.setView([43.8585,18.423],14);
      else if(list.length)map.fitBounds(L.latLngBounds(list.map(p=>p.pos)),{padding:[35,35],maxZoom:16});
      else toast('Nie ma jeszcze ulubionych z potwierdzonym punktem mapy.');
    }
    renderMapList();
  }
  async function locate() {
    if(!navigator.geolocation){toast('Przeglądarka nie udostępnia lokalizacji.');return;}
    await ensureMap();if(!map)return;
    $('locate').disabled=true;
    navigator.geolocation.getCurrentPosition(pos=>{
      $('locate').disabled=false;
      const coords=[pos.coords.latitude,pos.coords.longitude];
      if(userMarker)map.removeLayer(userMarker);
      userMarker=L.circleMarker(coords,{radius:8,color:'#ffffff',weight:3,fillColor:'#376adc',fillOpacity:1}).addTo(map).bindPopup('Twoja pozycja, tylko w tej sesji. Dokładność około '+Math.round(pos.coords.accuracy)+' m.');
      map.setView(coords,15);userMarker.openPopup();
    },()=>{$('locate').disabled=false;toast('Brak dostępu do lokalizacji. Możesz nadal użyć tras z hotelu.');},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
  }
  function networkState(){ $('offline').hidden=navigator.onLine; }
  function preparePrint(){all('.place-card details,.info-grid details').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});}
  function afterPrint(){all('details[data-was-open]').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});}
  function printGuide(){preparePrint();window.print();}
  document.addEventListener('click', e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.tab)showTab(button.dataset.tab);
    if(button.dataset.day){activeDay=button.dataset.day;renderPlan();try{history.replaceState(null,'',`#plan/${activeDay}`);}catch{}}
    if(button.dataset.filter){filter=button.dataset.filter;renderPlaces();}
    if(button.dataset.fav){const id=button.dataset.fav;if(favorites.has(id))favorites.delete(id);else favorites.add(id);write('favorites',[...favorites]);renderPlaces();renderMapList();if(map&&mapMode==='favorites')drawMarkers();toast(favorites.has(id)?'Dodano do ulubionych na tym urządzeniu.':'Usunięto z ulubionych.');}
    if(button.dataset.place)showPlace(button.dataset.place);
    if(button.dataset.amount){$('bam').value=button.dataset.amount;$('pln').value=(Number(button.dataset.amount)*rate()).toFixed(2);}
    if(button.dataset.meal){$('budget-food').value=button.dataset.meal;updateBudget();toast('Wpisano jedzenie dla dwóch. Sprawdź osobno napoje i dostawę.');}
    if(button.dataset.mapView){mapMode=button.dataset.mapView;ensureMap().then(()=>drawMarkers());renderMapList();}
    if(button.id==='retry-map')ensureMap();
  });
  document.addEventListener('change',e=>{if(e.target.dataset.done){const key=e.target.dataset.done;if(e.target.checked)done.add(key);else done.delete(key);write('done',[...done]);renderPlan();}});
  $('search').addEventListener('input',renderPlaces);$('area').addEventListener('change',renderPlaces);
  $('theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('sarajevo.theme',theme);}catch{}themeUpdate();});
  $('currency-toggle').addEventListener('click',()=>{currency=currency==='BAM'?'PLN':'BAM';write('currency',currency);renderMoney();toast(currency==='BAM'?'Główne ceny w markach, złotówki obok.':'Główne ceny w złotówkach, marki obok.');});
  $('bam').addEventListener('input',()=>{const v=Number($('bam').value);$('pln').value=$('bam').value!==''&&Number.isFinite(v)&&v>=0?(v*rate()).toFixed(2):'';});
  $('pln').addEventListener('input',()=>{const v=Number($('pln').value);$('bam').value=$('pln').value!==''&&Number.isFinite(v)&&v>=0?(v/rate()).toFixed(2):'';});
  all('[id^="budget-"]').filter(el=>['INPUT','SELECT'].includes(el.tagName)).forEach(el=>el.addEventListener('input',updateBudget));
  $('refresh-rate').addEventListener('click',refreshRate);$('locate').addEventListener('click',locate);
  $('print').addEventListener('click',printGuide);$('print-bottom').addEventListener('click',printGuide);
  window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',afterPrint);
  window.addEventListener('online',networkState);window.addEventListener('offline',networkState);
  const loadHash=()=>{const [tab,day]=location.hash.replace('#','').split('/');if(G.days.some(d=>d.id===day)){activeDay=day;renderPlan();}showTab(['plan','map','places','wallet','info'].includes(tab)?tab:'plan',false,false);};
  window.addEventListener('hashchange',loadHash);
  all('[data-sources]').forEach(el=>el.innerHTML=sourceLinks(el.dataset.sources.split(',')));
  $('sources-list').innerHTML=Object.values(G.sources).map(([name,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`).join('');
  themeUpdate();renderPlan();renderPrintPlan();renderMoney();renderMapList();networkState();loadHash();$('load-error').hidden=true;
  refreshRate();
  if('serviceWorker' in navigator && location.protocol==='https:'){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready).then(async()=>{
      const required=['index.html','app.js','data.js'];
      const present=await Promise.all(required.map(path=>caches.match(new URL(path,location.href).href)));
      $('offline-ready').textContent=present.every(Boolean)?'Podstawowy przewodnik zapisany w pamięci tej przeglądarki. Mapa i nawigacja wymagają sieci.':'Przewodnik nie potwierdził kompletnego zapisu offline. Otwórz go ponownie z internetem; nie polegaj jeszcze na trybie offline.';
    }).catch(()=>{$('offline-ready').textContent='Zapis offline nie jest dostępny w tej sesji. Korzystaj online lub wydrukuj przewodnik do PDF.';});
  } else {$('offline-ready').textContent='Automatyczny zapis offline działa po publikacji przez HTTPS w obsługiwanej przeglądarce. Lokalny plik nie instaluje pamięci offline.';}
})();
