
const points = [35,32,30,28,26,24,22,20,18,16,14,12,10,8,6];
let driverData = {};
let rows = [];
let leagueConfig = {};
let activeLeagueId = localStorage.getItem('d23_active_league') || 'pgtc';

async function init(){
  driverData = await fetch(`data/${activeLeagueId}/drivers.json`).then(r=>r.json());
  leagueConfig = await fetch('leagues.json').then(r=>r.json());

 document.getElementById('loadDrivers').onclick = loadDrivers;
  document.getElementById('leagueSelect').onchange = ()=>{
    loadDrivers();
    document.getElementById('tableLeagueSelect').value=currentLeague();
    updateDashboard();
  };
  document.getElementById('addGuest').onclick = addGuest;
  document.getElementById('calculate').onclick = calculate;
  document.getElementById('saveRace').onclick = saveRace;
  document.getElementById('showChampionship').onclick = ()=>{
    showChampionship();
    showPage('tables');
  };
  document.getElementById('deleteCurrentRace').onclick = deleteCurrentRace;
  document.getElementById('resetSeason').onclick = resetSeason;
  document.getElementById('formatSelect').onchange = ()=>{ if(window.lastGraphicData) drawGraphic(window.lastGraphicData); };
  document.getElementById('downloadGraphic').onclick = downloadGraphic;
  document.getElementById('refreshTable').onclick = ()=>{
    document.getElementById('leagueSelect').value=document.getElementById('tableLeagueSelect').value;
    loadDrivers();
    showChampionship();
  };
  document.getElementById('tableLeagueSelect').onchange = ()=>{
    document.getElementById('leagueSelect').value=document.getElementById('tableLeagueSelect').value;
  };

  document.getElementById('globalLeagueSelect').value=activeLeagueId;
  document.getElementById('globalLeagueSelect').onchange=(event)=>selectLeague(event.target.value);

 document.querySelectorAll('[data-page]').forEach(button => {
  button.onclick = () => {
    const league = leagueConfig[activeLeagueId];
    const allowedPages = ['leagues', 'calendar', 'drivers'];

    if (
      league &&
      !league.configured &&
      !allowedPages.includes(button.dataset.page)
    ) {
      showPage('leagues');
      return;
    }

    showPage(button.dataset.page);
  };
});

document.querySelectorAll('[data-open-page]').forEach(button => {
  button.onclick = () => {
    const league = leagueConfig[activeLeagueId];
    const allowedOpenPages = ['leagues', 'calendar', 'drivers'];

    if (
      league &&
      !league.configured &&
      !allowedOpenPages.includes(button.dataset.openPage)
    ) {
      showPage('leagues');
      return;
    }

    showPage(button.dataset.openPage);
  };
});

  loadDrivers();
  renderDriverLists();
  updateSeasonStatus();
  renderLeagueCards();
  applyLeagueTheme();
  renderSelectedLeaguePanel();
  updateDashboard();
  showPage(activeLeagueId==='pgtc'?'dashboard':'leagues');
}



async function selectLeague(id){
  const league = leagueConfig[id];
  if(!league) return;

  activeLeagueId = id;
  localStorage.setItem('d23_active_league', id);

  try{
    driverData = await fetch(`data/${activeLeagueId}/drivers.json`)
      .then(response => {
        if(!response.ok){
          throw new Error(`Fahrerdaten konnten nicht geladen werden: ${response.status}`);
        }
        return response.json();
      });
  }catch(error){
    console.error(error);
    driverData = {};
  }

  applyLeagueTheme();
  renderLeagueCards();
  renderSelectedLeaguePanel();
  renderDriverLists();
  updateDashboard();

  if(league.configured){
    showPage('dashboard');
  }else if(league.calendarImage){
    showPage('calendar');
  }else{
    showPage('leagues');
  }
}

function applyLeagueTheme(){
  const league=leagueConfig[activeLeagueId] || leagueConfig.pgtc;
  const root=document.documentElement;

  root.style.setProperty('--league-primary',league.primary);
  root.style.setProperty('--league-secondary',league.secondary);
  root.style.setProperty('--league-bg',league.background);

  document.body.classList.toggle('non-configured-league',!league.configured);

  const selector=document.getElementById('globalLeagueSelect');
  selector.value=activeLeagueId;

  const logo=document.getElementById('activeLeagueLogo');
  logo.src=`${league.logo}?v=081-${activeLeagueId}`;
  logo.alt=`${league.name} Logo`;

  document.getElementById('activeLeagueEyebrow').textContent=
    `${league.name.toUpperCase()} · ${league.season.toUpperCase()}`;
}

function renderSelectedLeaguePanel(){
  const root=document.getElementById('selectedLeaguePanel');
  if(!root) return;

const allowedForUnconfigured =
  button.dataset.page === 'leagues' ||
  (
    button.dataset.page === 'calendar' &&
    league?.calendarImage
  );

if(
  league &&
  !league.configured &&
  !allowedForUnconfigured
){
  showPage('leagues');
  return;
}

  root.innerHTML=`
    <img src="${league.logo}?v=081-panel-${activeLeagueId}" alt="${league.name} Logo">
    <div>
      <p class="eyebrow">${league.short} · ${league.season}</p>
      <h2>${league.name}</h2>
      <p>Dieses Liga-Modul ist bereits angelegt und verwendet sein eigenes Logo sowie sein eigenes Farbschema.</p>
      <p>Als Nächstes ergänzen wir Fahrerlisten, Kalender, Punktesystem, Wertungen und Tabellenvorlagen.</p>
      <span class="coming-soon">MODUL WIRD EINGERICHTET</span>
    </div>
  `;
  root.classList.add('visible');
}

function renderLeagueCards(){
  const root=document.getElementById('leagueCards');
  if(!root) return;
  root.innerHTML=Object.entries(leagueConfig).map(([id,league])=>`
    <article class="league-select-card ${id===activeLeagueId?'active':''}"
      style="--card-accent:${league.primary}" data-league-id="${id}">
      <img src="${league.logo}" alt="${league.name} Logo">
      <div>
        <h3>${league.name}</h3>
        <p>${league.season}</p>
        <p>${league.short}</p>
        <span class="league-status">${league.status}</span>
      </div>
    </article>
  `).join('');

  root.querySelectorAll('[data-league-id]').forEach(card=>{
    card.onclick=()=>selectLeague(card.dataset.leagueId);
  });
}

const pageMeta={
  dashboard:['Dashboard','Deine Saison auf einen Blick.'],
  leagues:['Ligen','Meisterschaften und Serien verwalten.'],
  drivers:['Fahrer','Stammfahrer, Teams und Startnummern.'],
  races:['Rennergebnis erfassen','Fahrer sortieren, Gaststarter markieren und Punkte berechnen.'],
  calendar:['Rennkalender','Termine und Strecken der Saison.'],
  tables:['Tabellen & Grafiken','Gesamtwertung prüfen und als PNG exportieren.']
};

function showPage(page){
  const activeLeague = leagueConfig[activeLeagueId];

  const calendarAllowed =
    page === 'calendar' && activeLeague?.calendarImage;
    const driversAllowed =
  page === 'drivers' &&
  Object.keys(driverData || {}).length > 0;

if(
  activeLeague &&
  !activeLeague.configured &&
  page !== 'leagues' &&
  !calendarAllowed &&
  !driversAllowed
){
  page = 'leagues';
}
  document
    .querySelectorAll('.app-page')
    .forEach(section => section.classList.remove('active'));

  document
    .getElementById(`page-${page}`)
    ?.classList.add('active');

  document
    .querySelectorAll('#mainNav button')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.page === page
      );
    });

  const meta = pageMeta[page] || pageMeta.dashboard;

  document.getElementById('pageTitle').textContent = meta[0];
  document.getElementById('pageSubtitle').textContent = meta[1];

  if(page === 'dashboard'){
    updateDashboard();
  }

  if(page === 'calendar'){
    renderCalendarPage();
  }

  if(page === 'tables'){
    document.getElementById('tableLeagueSelect').value = currentLeague();
    showChampionship();
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
function renderCalendarPage(){
  const league = leagueConfig[activeLeagueId];

  const image = document.getElementById('calendarImage');
  const imageWrap = document.getElementById('calendarImageWrap');
  const emptyState = document.getElementById('calendarEmptyState');
  const title = document.getElementById('calendarLeagueTitle');
  const subtitle = document.getElementById('calendarLeagueSubtitle');
  const originalLink = document.getElementById('calendarOpenOriginal');

  if(
    !league ||
    !image ||
    !imageWrap ||
    !emptyState ||
    !title ||
    !subtitle ||
    !originalLink
  ){
    return;
  }

  title.textContent = `${league.name} – ${league.season}`;
  subtitle.textContent = 'Offizieller Rennkalender als Originalgrafik.';

  if(league.calendarImage){
    const imagePath = `${league.calendarImage}?v=${Date.now()}`;

    image.src = imagePath;
    image.alt =
      league.calendarAlt ||
      `${league.name} Rennkalender`;

    originalLink.href = imagePath;

    imageWrap.hidden = false;
    emptyState.hidden = true;
    originalLink.hidden = false;
  }else{
    image.removeAttribute('src');
    image.alt = '';

    originalLink.removeAttribute('href');

    imageWrap.hidden = true;
    emptyState.hidden = false;
    originalLink.hidden = true;
  }
}

function renderDriverLists(){
  ['Liga 1','Liga 2'].forEach((league,index)=>{
    const root=document.getElementById(`driverList${index+1}`);
    root.innerHTML=driverData[league].map(driver=>`
      <div class="driver-list-item">
        <strong>${driver.psn}</strong>
        <small>#${driver.number} · ${driver.team}</small>
      </div>
    `).join('');
  });
}

function updateDashboard(){
  if(!leagueConfig[activeLeagueId]) return;
  const league=leagueConfig[activeLeagueId];

  if(!league.configured){
    document.getElementById('dashboardSavedRaces').textContent='–';
    document.getElementById('dashboardLeagueLabel').textContent=league.short;
    document.getElementById('dashboardLeader').textContent='Noch nicht eingerichtet';
    document.getElementById('dashboardLeaderPoints').textContent=league.season;
    document.getElementById('dashboardNextRace').textContent='Kalender folgt';
    return;
  }

  if(!driverData['Liga 1']) return;
  const season=getSeason();
  const saved=Object.keys(season.races).map(Number).sort((a,b)=>a-b);
  const standings=calculateChampionship();
  const leader=standings[0];
  const next=[1,2,3,4,5,6,7,8,9,10].find(r=>!saved.includes(r));

  document.getElementById('dashboardSavedRaces').textContent=`${saved.length} / 10`;
  document.getElementById('dashboardLeagueLabel').textContent=currentLeague();
  document.getElementById('dashboardLeader').textContent=saved.length && leader ? leader.psn : 'Noch offen';
  document.getElementById('dashboardLeaderPoints').textContent=saved.length && leader ? `${leader.points} Punkte` : '0 Punkte';
  document.getElementById('dashboardNextRace').textContent=next ? `Rennen ${next}` : 'Saison abgeschlossen';
}
function currentLeague(){ return document.getElementById('leagueSelect').value; }

function loadDrivers(){
  const league = currentLeague();
  const list = [...driverData[league]];
  rows = list.map((d,i)=>({...d, guest:false, position:i+1}));
  renderRows();
  fillBonusSelects();
  updateSeasonStatus();
}

function addGuest(){
  const name = prompt('PSN-Name des Gaststarters:');
  if(!name) return;
  rows.push({psn:name.trim(), number:'-', team:'-', guest:true, position:rows.length+1});
  normalizePositions();
  renderRows();
  fillBonusSelects();
}


function normalizePositions(){
  rows.forEach((r,i)=>r.position=i+1);
}

function moveRow(index,direction){
  const target=index+direction;
  if(target<0 || target>=rows.length) return;
  [rows[index],rows[target]]=[rows[target],rows[index]];
  normalizePositions();
  renderRows();
}

function toggleGuest(index,checked){
  rows[index].guest=checked;
  renderRows();
  fillBonusSelects();
}

function renderRows(){
  const root = document.getElementById('resultRows');
  root.innerHTML = '';

  if(!rows.length){
    root.innerHTML='<div class="empty-state">Noch keine Fahrer geladen.</div>';
    return;
  }

  rows.forEach((row,index)=>{
    const el=document.createElement('div');
    el.className=`result-row ${row.guest?'is-guest':''}`;
    el.innerHTML=`
      <div class="position-badge">P${index+1}</div>
      <button class="move-btn up" ${index===0?'disabled':''} title="Eine Position hoch">↑</button>
      <button class="move-btn down" ${index===rows.length-1?'disabled':''} title="Eine Position runter">↓</button>
      <select data-index="${index}" class="driver-select"></select>
      <label class="guest-toggle">
        <input type="checkbox" ${row.guest?'checked':''}>
        Gast
      </label>
      <div class="status ${row.guest?'guest':''}">${row.guest?'GASTSTARTER':'STAMMFAHRER'}</div>
      <button class="remove" title="Zeile entfernen">×</button>
    `;

    const sel=el.querySelector('.driver-select');
    const leagueDrivers=driverData[currentLeague()].map(d=>({...d,guest:false}));
    const guestDrivers=rows.filter(r=>r.guest);
    const all=[...leagueDrivers,...guestDrivers];
    const seen=new Set();

    all.forEach(d=>{
      if(seen.has(d.psn)) return;
      seen.add(d.psn);
      const opt=document.createElement('option');
      opt.value=d.psn;
      opt.textContent=d.psn;
      if(d.psn===row.psn) opt.selected=true;
      sel.appendChild(opt);
    });

    sel.onchange=()=>{
      const found=all.find(d=>d.psn===sel.value);
      rows[index]={...found,position:index+1};
      renderRows();
      fillBonusSelects();
    };

    el.querySelector('.up').onclick=()=>moveRow(index,-1);
    el.querySelector('.down').onclick=()=>moveRow(index,1);
    el.querySelector('.guest-toggle input').onchange=(e)=>toggleGuest(index,e.target.checked);
    el.querySelector('.remove').onclick=()=>{
      rows.splice(index,1);
      normalizePositions();
      renderRows();
      fillBonusSelects();
    };

    root.appendChild(el);
  });
}

function fillBonusSelects(){
  const ids=['poleSelect','flSprintSelect','flMainSelect'];
  ids.forEach(id=>{
    const s=document.getElementById(id);
    const old=s.value;
    s.innerHTML='<option value="">– niemand –</option>';
    rows.filter(r=>!r.guest).forEach(r=>{
      const o=document.createElement('option');o.value=r.psn;o.textContent=r.psn;s.appendChild(o);
    });
    s.value=old;
  });
  const a=document.getElementById('absenceSelect');
  a.innerHTML='';
  driverData[currentLeague()].forEach(r=>{
    const o=document.createElement('option');o.value=r.psn;o.textContent=r.psn;a.appendChild(o);
  });
  const race = Number(document.getElementById('raceSelect').value);
  document.getElementById('poleSelect').disabled = race !== 1;
  if(race !== 1) document.getElementById('poleSelect').value='';
}
document.getElementById('raceSelect').onchange = fillBonusSelects;


function buildRaceData(){
  const clean = rows.filter(r=>!r.guest);
  const scoreMap = {};
  clean.forEach((r,i)=>scoreMap[r.psn]=(points[i]||0));

  const race = Number(document.getElementById('raceSelect').value);
  const pole = document.getElementById('poleSelect').value;
  const fls = document.getElementById('flSprintSelect').value;
  const flm = document.getElementById('flMainSelect').value;
  if(race===1 && pole) scoreMap[pole]=(scoreMap[pole]||0)+1;
  if(fls) scoreMap[fls]=(scoreMap[fls]||0)+1;
  if(flm) scoreMap[flm]=(scoreMap[flm]||0)+1;

  const abs=[...document.getElementById('absenceSelect').selectedOptions].map(o=>o.value);
  abs.forEach(name=>scoreMap[name]=(scoreMap[name]||0)+3);

  return {
    league: currentLeague(),
    race,
    clean,
    scoreMap,
    guests: rows.filter(r=>r.guest).map(r=>r.psn),
    pole,
    fls,
    flm,
    abs,
    savedAt: new Date().toISOString()
  };
}

function renderPreview(data){
  const tbody=document.getElementById('standingsBody');
  tbody.innerHTML='';
  data.clean.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${r.psn}</td><td>${r.number}</td><td>${r.team}</td><td><strong>${data.scoreMap[r.psn]||0}</strong></td>`;
    tbody.appendChild(tr);
  });

  data.abs.filter(name=>!data.clean.some(r=>r.psn===name)).forEach(name=>{
    const d=driverData[currentLeague()].find(x=>x.psn===name);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>–</td><td>${name} <small>(abgemeldet)</small></td><td>${d?.number||'-'}</td><td>${d?.team||'-'}</td><td><strong>3</strong></td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('summary').innerHTML =
    `<strong>${data.clean.length}</strong> Stammfahrer gewertet · <strong>${data.guests.length}</strong> Gaststarter entfernt` +
    (data.guests.length ? ` (${data.guests.join(', ')})` : '');

  window.lastGraphicData = data;
  drawGraphic(data);
}

function calculate(){
  renderPreview(buildRaceData());
}

function storageKey(){
  return `d23racecontrol_pgtc_${currentLeague().replace(' ','_')}`;
}

function getSeason(){
  try{
    return JSON.parse(localStorage.getItem(storageKey())) || {races:{}};
  }catch{
    return {races:{}};
  }
}

function setSeason(season){
  localStorage.setItem(storageKey(),JSON.stringify(season));
  updateSeasonStatus();
  updateDashboard();
}

function saveRace(){
  const data=buildRaceData();
  const season=getSeason();
  season.races[String(data.race)]=data;
  setSeason(season);
  alert(`Rennen ${data.race} wurde gespeichert.`);
  showChampionship();
}

function calculateChampionship(){
  const season=getSeason();
  const standings={};
  driverData[currentLeague()].forEach(d=>{
    standings[d.psn]={
      ...d, points:0, wins:0, podiums:0, poles:0,
      fastestLaps:0, starts:0, absences:0
    };
  });

  Object.values(season.races)
    .sort((a,b)=>a.race-b.race)
    .forEach(race=>{
      race.clean.forEach((r,i)=>{
        const s=standings[r.psn];
        if(!s) return;
        s.points += Number(race.scoreMap[r.psn]||0);
        s.starts += 1;
        if(i===0) s.wins += 1;
        if(i<3) s.podiums += 1;
      });
      race.abs.forEach(name=>{
        if(standings[name]){
          standings[name].points += race.clean.some(r=>r.psn===name) ? 0 : 3;
          standings[name].absences += 1;
        }
      });
      if(race.pole && standings[race.pole]) standings[race.pole].poles += 1;
      [race.fls,race.flm].filter(Boolean).forEach(name=>{
        if(standings[name]) standings[name].fastestLaps += 1;
      });
    });

  return Object.values(standings).sort((a,b)=>
    b.points-a.points ||
    b.wins-a.wins ||
    b.podiums-a.podiums ||
    a.psn.localeCompare(b.psn)
  );
}

function showChampionship(){
  const standings=calculateChampionship();
  const season=getSeason();
  const savedRaces=Object.keys(season.races).map(Number).sort((a,b)=>a-b);
  const latestRace=savedRaces.length ? Math.max(...savedRaces) : 0;

  const tbody=document.getElementById('standingsBody');
  tbody.innerHTML='';
  standings.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${r.psn}</td><td>${r.number}</td><td>${r.team}</td><td><strong>${r.points}</strong></td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('summary').innerHTML =
    savedRaces.length
      ? `<strong>${savedRaces.length}</strong> Rennen gespeichert · Meisterschaft nach Rennen ${latestRace}`
      : 'Noch keine Rennen gespeichert.';

  const scoreMap={};
  standings.forEach(r=>scoreMap[r.psn]=r.points);
  const graphicData={
    league:currentLeague(),
    race:latestRace || Number(document.getElementById('raceSelect').value),
    clean:standings,
    scoreMap,
    guests:[],
    pole:'',
    fls:'',
    flm:'',
    abs:[]
  };
  window.lastGraphicData=graphicData;
  drawGraphic(graphicData);
}

function deleteCurrentRace(){
  const race=String(document.getElementById('raceSelect').value);
  const season=getSeason();
  if(!season.races[race]){
    alert(`Rennen ${race} ist nicht gespeichert.`);
    return;
  }
  if(!confirm(`Rennen ${race} wirklich aus der Saison löschen?`)) return;
  delete season.races[race];
  setSeason(season);
  showChampionship();
}

function resetSeason(){
  if(!confirm(`Gesamte ${currentLeague()}-Saison auf diesem Gerät zurücksetzen?`)) return;
  localStorage.removeItem(storageKey());
  updateSeasonStatus();
  updateDashboard();
  showChampionship();
}

function updateSeasonStatus(){
  const root=document.getElementById('seasonStatus');
  if(!root) return;
  const season=getSeason();
  const saved=new Set(Object.keys(season.races).map(Number));
  root.innerHTML='';
  for(let i=1;i<=10;i++){
    const chip=document.createElement('span');
    chip.className=`race-chip ${saved.has(i)?'saved':''}`;
    chip.textContent=`R${i} ${saved.has(i)?'✓':'–'}`;
    root.appendChild(chip);
  }
}


function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function fitText(ctx,text,maxWidth){
  if(ctx.measureText(text).width<=maxWidth) return text;
  let t=text;
  while(t.length>3 && ctx.measureText(t+'…').width>maxWidth) t=t.slice(0,-1);
  return t+'…';
}

async function drawGraphic(data){
  const canvas=document.getElementById('tableCanvas');
  const ctx=canvas.getContext('2d');
  const file=data.league==='Liga 2'?'liga2.jpg':'liga1.jpg';
  const img=await loadImage(`assets/templates/pgtc/${file}`);

  canvas.width=img.naturalWidth;
  canvas.height=img.naturalHeight;
  const w=canvas.width;
  const h=canvas.height;

  // Original design
  ctx.drawImage(img,0,0,w,h);

  // Dynamic title "Nach Rennen X"
  const titleY = h * 0.347;
  ctx.fillStyle='rgba(255,255,255,0.985)';
  ctx.fillRect(w*0.30,h*0.326,w*0.40,h*0.052);

  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle='#d40000';
  ctx.font=`900 ${Math.round(w*0.030)}px Arial`;
  ctx.fillText(`NACH RENNEN ${data.race}`,w*0.50,titleY);

  // Table geometry derived from the uploaded template
  const xPos = w*0.045;
  const xTrophy = w*0.140;
  const xDriver = w*0.230;
  const xPoints = w*0.785;
  const tableRight = w*0.950;

  const headerTop = h*0.372;
  const headerBottom = h*0.408;
  const firstRowTop = h*0.408;
  const rowH = h*0.0323;

  // Clear old table content only, preserving the complete outer artwork
  ctx.fillStyle='rgba(255,255,255,0.985)';
  ctx.fillRect(xPos, firstRowTop, tableRight-xPos, rowH*15 + 2);

  // Rebuild header so labels stay crisp
  ctx.fillStyle='#050505';
  ctx.fillRect(xPos,headerTop,xPoints-xPos,headerBottom-headerTop);
  ctx.fillStyle='#d60000';
  ctx.fillRect(xPoints,headerTop,tableRight-xPoints,headerBottom-headerTop);

  ctx.textBaseline='middle';
  ctx.font=`900 ${Math.round(w*0.021)}px Arial`;
  ctx.fillStyle='#ffffff';
  ctx.textAlign='center';
  ctx.fillText('POS.',(xPos+xTrophy)/2, (headerTop+headerBottom)/2);
  ctx.fillText('FAHRER',(xDriver+xPoints)/2, (headerTop+headerBottom)/2);
  ctx.fillText('PUNKTE',(xPoints+tableRight)/2, (headerTop+headerBottom)/2);

  const rows=[...data.clean];
  data.abs.filter(name=>!rows.some(r=>r.psn===name)).forEach(name=>{
    const d=driverData[currentLeague()].find(x=>x.psn===name);
    rows.push({...d,psn:name,absence:true});
  });

  for(let i=0;i<15;i++){
    const y=firstRowTop+i*rowH;
    const r=rows[i];

    // Position block
    ctx.fillStyle=i<3?'#c90000':'#050505';
    ctx.fillRect(xPos,y,xTrophy-xPos,rowH-1);

    // Trophy block
    ctx.fillStyle='#050505';
    ctx.fillRect(xTrophy,y,xDriver-xTrophy,rowH-1);

    // Driver / points cells
    ctx.fillStyle='rgba(255,255,255,0.98)';
    ctx.fillRect(xDriver,y,xPoints-xDriver,rowH-1);
    ctx.fillRect(xPoints,y,tableRight-xPoints,rowH-1);

    // Lines
    ctx.strokeStyle='rgba(0,0,0,0.23)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(xDriver,y+rowH-1);
    ctx.lineTo(tableRight,y+rowH-1);
    ctx.stroke();
    ctx.strokeRect(xPoints,y,tableRight-xPoints,rowH-1);

    if(!r) continue;

    // Position
    ctx.textAlign='center';
    ctx.fillStyle='#ffffff';
    ctx.font=`900 ${Math.round(w*0.023)}px Arial`;
    ctx.fillText(String(i+1),(xPos+xTrophy)/2,y+rowH/2);

    // Trophy icons
    if(i<3){
      const trophyColor=['#f4c300','#d0d0d0','#c86c16'][i];
      ctx.fillStyle=trophyColor;
      ctx.font=`${Math.round(w*0.026)}px Arial`;
      ctx.fillText('🏆',(xTrophy+xDriver)/2,y+rowH/2+1);
    }

    // Driver
    ctx.textAlign='left';
    ctx.fillStyle='#111111';
    ctx.font=`900 ${Math.round(w*0.0215)}px Arial`;
    const driverText=fitText(ctx,r.psn,(xPoints-xDriver)-w*0.05);
    ctx.fillText(driverText,xDriver+w*0.026,y+rowH/2);

    // Points
    const pts=r.absence?3:(data.scoreMap[r.psn]||0);
    ctx.textAlign='center';
    ctx.fillStyle='#111111';
    ctx.font=`900 ${Math.round(w*0.025)}px Arial`;
    ctx.fillText(String(pts),(xPoints+tableRight)/2,y+rowH/2);
  }

  // Small status line above footer
  ctx.fillStyle='rgba(255,255,255,0.97)';
  ctx.fillRect(w*0.04,h*0.895,w*0.92,h*0.026);
  ctx.textAlign='left';
  ctx.fillStyle='#555555';
  ctx.font=`700 ${Math.round(w*0.0135)}px Arial`;
  let info=`${data.clean.length} Stammfahrer gewertet`;
  if(data.guests.length) info+=` · ${data.guests.length} Gaststarter außer Wertung`;
  if(data.abs.length) info+=` · ${data.abs.length} fristgerecht abgemeldet`;
  ctx.fillText(info,w*0.055,h*0.911);

  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';
}
function downloadGraphic(){
  if(!window.lastGraphicData){alert('Bitte zuerst das Ergebnis berechnen.');return;}
  const canvas=document.getElementById('tableCanvas');
  const link=document.createElement('a');
  link.download=`PGTC_${currentLeague().replace(' ','_')}_Tabelle_nach_Rennen_${window.lastGraphicData.race}.png`;
  link.href=canvas.toDataURL('image/png');
  link.click();
}

init();
