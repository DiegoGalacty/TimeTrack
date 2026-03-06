const timerState = { running:false, paused:false, seconds:0, startTime:null, project:null, interval:null, weekSeconds:0, todaySeconds:0, sessions:0 };

const pad      = n => String(n).padStart(2,'0');
const secToHMS = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
const secToHM  = s => `${Math.floor(s/3600)}h ${pad(Math.floor((s%3600)/60))}m`;

function setRing(id,pct){ const el=document.getElementById(id); if(el) el.style.strokeDashoffset=515.2-(515.2*Math.min(pct,1)); }

function syncModalDigits() {
  const s=timerState.seconds;
  const e=id=>document.getElementById(id);
  if(e('tmH')) e('tmH').textContent=pad(Math.floor(s/3600));
  if(e('tmM')) e('tmM').textContent=pad(Math.floor((s%3600)/60));
  if(e('tmS')) e('tmS').textContent=pad(s%60);
}

function syncModalBtn() {
  const btn=document.getElementById('tmStartBtn'); if(!btn) return;
  btn.innerHTML = timerState.running?'▶ Corriendo':timerState.paused?'▶ Reanudar':'▶ Start';
  ['tmCircleH','tmCircleM','tmCircleS'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    timerState.running?el.classList.add('pulsing'):el.classList.remove('pulsing');
  });
}

function openTimerModal(){ document.getElementById('timerModalOverlay').classList.remove('hidden'); syncModalDigits(); syncModalBtn(); }
function closeTimerModal(){ document.getElementById('timerModalOverlay').classList.add('hidden'); }
document.getElementById('timerModalOverlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeTimerModal(); });

/* ── localStorage ── */
function saveTimerLocal() {
  if(!timerState.running && !timerState.paused) return;
  localStorage.setItem('tt_timer', JSON.stringify({ seconds:timerState.seconds, startTime:timerState.startTime, paused:timerState.paused, project:timerState.project, note:document.getElementById('noteInput')?.value||'' }));
}
function clearTimerLocal(){ localStorage.removeItem('tt_timer'); }
function restoreTimerLocal() {
  const raw=localStorage.getItem('tt_timer'); if(!raw) return;
  try {
    const s=JSON.parse(raw); if(!s.project) return;
    timerState.seconds   = !s.paused&&s.startTime ? Math.max(Math.floor((Date.now()-new Date(s.startTime).getTime())/1000),s.seconds||0) : s.seconds||0;
    timerState.project   = s.project;
    timerState.startTime = s.startTime ? new Date(s.startTime) : null;
    timerState.paused    = s.paused||false;
    const noteEl=document.getElementById('noteInput'); if(noteEl&&s.note) noteEl.value=s.note;
    const p=s.project;
    document.getElementById('activeProjectInfo').innerHTML=`<span class="active-project-dot" style="background:${p.color}"></span><div><div class="active-project-name">${p.nombre}</div><div class="active-project-client">${p.cliente}</div></div><div style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--muted)">$${p.tarifa_hora}/h</div>`;
    document.getElementById('timerProjectName').textContent=p.nombre;
    document.getElementById('timerDisplay').textContent=secToHMS(timerState.seconds);
    setRing('timerRing',timerState.seconds/3600);
    if(!s.paused){ timerState.running=true; document.getElementById('startBtn').textContent='▶ Corriendo'; timerState.interval=setInterval(tick,5); }
    else { timerState.paused=true; document.getElementById('startBtn').textContent='▶ Reanudar'; }
    syncModalBtn();
  } catch(e){ clearTimerLocal(); }
}

/* ── Stats semanales ── */
function updateWeeklyUI() {
  const h=timerState.weekSeconds/3600;
  document.getElementById('weeklyDisplay').textContent=h.toFixed(1)+'h';
  document.getElementById('weekHours').textContent=secToHM(timerState.weekSeconds);
  document.getElementById('todayHours').textContent=secToHM(timerState.todaySeconds);
  document.getElementById('sessionCount').textContent=timerState.sessions;
  document.getElementById('avgHours').textContent=(h/7).toFixed(1)+'h';
  setRing('weeklyRing',h/40);
}
async function loadWeeklyStats() {
  try {
    const [semana,hoy]=await Promise.all([apiGet('/sesiones/semana'),apiGet('/sesiones/hoy')]);
    timerState.weekSeconds =(Array.isArray(semana)?semana:[]).reduce((a,r)=>a+(Number(r.total_segundos)||0),0);
    timerState.todaySeconds=(Array.isArray(hoy)?hoy:[]).reduce((a,r)=>a+(Number(r.total_segundos)||0),0);
    if(timerState.running||timerState.paused){ timerState.weekSeconds+=timerState.seconds; timerState.todaySeconds+=timerState.seconds; }
    updateWeeklyUI();
  } catch(e){ console.error('Error stats:',e); }
}

/* ── Proyecto ── */
function selectProject(proj) {
  if(timerState.running&&!confirm('Timer corriendo. ¿Cambiar proyecto?')) return;
  if(timerState.running) stopTimer(false);
  timerState.project=proj;
  document.getElementById('activeProjectInfo').innerHTML=`<span class="active-project-dot" style="background:${proj.color}"></span><div><div class="active-project-name">${proj.nombre}</div><div class="active-project-client">${proj.cliente}</div></div><div style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--muted)">$${proj.tarifa_hora}/h</div>`;
  document.getElementById('timerProjectName').textContent=proj.nombre;
  document.querySelectorAll('#projectsTable tr').forEach(tr=>tr.classList.remove('selected'));
  document.querySelector(`#projectsTable tr[data-id="${proj.id}"]`)?.classList.add('selected');
}

/* ── Tick ── */
function tick() {
  timerState.seconds++; timerState.weekSeconds++; timerState.todaySeconds++;
  document.getElementById('timerDisplay').textContent=secToHMS(timerState.seconds);
  setRing('timerRing',timerState.seconds/3600);
  updateWeeklyUI();
  if(!document.getElementById('timerModalOverlay').classList.contains('hidden')) syncModalDigits();
  if(timerState.seconds%5===0) saveTimerLocal();
}

/* ── Controles ── */
function toggleTimer() {
  if(!timerState.project){ alert('Selecciona un proyecto primero.'); return; }
  if(!timerState.running){ timerState.running=true; timerState.paused=false; timerState.startTime=timerState.startTime||new Date(); document.getElementById('startBtn').textContent='▶ Corriendo'; timerState.interval=setInterval(tick,1000); saveTimerLocal(); }
  syncModalBtn();
}
function pauseTimer() {
  if(!timerState.running) return;
  clearInterval(timerState.interval); timerState.running=false; timerState.paused=true;
  document.getElementById('startBtn').textContent='▶ Reanudar'; saveTimerLocal(); syncModalBtn();
}
async function stopTimer(save=true) {
  if(!timerState.running&&!timerState.paused) return;
  clearInterval(timerState.interval);
  if(save&&timerState.project&&timerState.seconds>0) {
    try {
      await apiPost('/sesiones',{ proyecto_id:timerState.project.id, start_time:timerState.startTime.toISOString().slice(0,19).replace('T',' '), end_time:new Date().toISOString().slice(0,19).replace('T',' '), duracion:timerState.seconds, notas:document.getElementById('noteInput').value });
      timerState.sessions++; document.getElementById('noteInput').value=''; loadProjects(); loadBilling();
    } catch(e){ console.error('Error guardando sesión:',e); }
  }
  clearTimerLocal();
  Object.assign(timerState,{running:false,paused:false,seconds:0,startTime:null});
  document.getElementById('timerDisplay').textContent='00:00:00';
  document.getElementById('startBtn').textContent='▶ Start';
  setRing('timerRing',0); updateWeeklyUI(); syncModalDigits(); syncModalBtn();
}

/* ── Proyectos CRUD ── */
let allProjects=[];
async function loadProjects() {
  try { allProjects=await apiGet('/proyectos'); if(!Array.isArray(allProjects)) throw new Error(); renderProjects(allProjects); }
  catch(e){ document.querySelector('#projectsTable').innerHTML='<tr><td colspan="6" class="loading-row">Error cargando proyectos</td></tr>'; }
}
function renderProjects(projects) {
  const tbody=document.getElementById('projectsTable');
  if(!projects.length){ tbody.innerHTML='<tr><td colspan="6" class="loading-row">Sin proyectos. Crea uno.</td></tr>'; return; }
  tbody.innerHTML=projects.map(p=>{
    const horas=(Number(p.total_segundos||0)/3600).toFixed(1);
    const sel=timerState.project?.id===p.id?'selected':'';
    const pJson=JSON.stringify(p).replace(/"/g,'&quot;');
    return `<tr data-id="${p.id}" class="${sel}" onclick="selectProject(${pJson})">
      <td><span class="proj-color-dot" style="background:${p.color}"></span>${p.cliente}</td>
      <td>${p.nombre}</td><td>$${p.tarifa_hora}</td>
      <td style="font-family:'JetBrains Mono',monospace">${horas}h</td>
      <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
      <td onclick="event.stopPropagation()">
        <button class="action-btn start-proj" onclick="selectProject(${pJson})">▶</button>
        <button class="action-btn edit" onclick="openModal(${pJson})">✎</button>
        <button class="action-btn del" onclick="deleteProject(${p.id})">✕</button>
      </td></tr>`;
  }).join('');
}
function filterProjects(q) {
  const t=q.toLowerCase().trim();
  renderProjects(t ? allProjects.filter(p=>p.nombre.toLowerCase().includes(t)||p.cliente.toLowerCase().includes(t)) : allProjects);
}

function openModal(proj=null) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('modalTitle').textContent=proj?'Editar Proyecto':'Nuevo Proyecto';
  document.getElementById('editId').value=proj?.id??'';
  document.getElementById('fCliente').value=proj?.cliente??'';
  document.getElementById('fNombre').value=proj?.nombre??'';
  document.getElementById('fTarifa').value=proj?.tarifa_hora??25;
  document.getElementById('fColor').value=proj?.color??'#c8f060';
  document.getElementById('fEstado').value=proj?.estado??'activo';
}
function closeModal(){ document.getElementById('modalOverlay').classList.add('hidden'); }
document.getElementById('modalOverlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });

async function saveProject() {
  const id=document.getElementById('editId').value;
  const data={ cliente:document.getElementById('fCliente').value.trim(), nombre:document.getElementById('fNombre').value.trim(), tarifa_hora:parseFloat(document.getElementById('fTarifa').value)||25, color:document.getElementById('fColor').value, estado:document.getElementById('fEstado').value };
  if(!data.cliente||!data.nombre){ alert('Cliente y nombre son requeridos.'); return; }
  try { id?await apiPut('/proyectos/'+id,data):await apiPost('/proyectos',data); closeModal(); loadProjects(); loadBilling(); }
  catch(e){ alert('Error guardando proyecto.'); }
}

async function deleteProject(id) {
  if(!confirm('¿Borrar este proyecto y sus sesiones?')) return;
  try {
    await apiDelete('/proyectos/'+id);
    if(timerState.project?.id===id){
      clearInterval(timerState.interval); clearTimerLocal();
      Object.assign(timerState,{running:false,paused:false,seconds:0,project:null,startTime:null});
      document.getElementById('timerDisplay').textContent='00:00:00';
      document.getElementById('startBtn').textContent='▶ Start';
      document.getElementById('timerProjectName').textContent='—';
      document.getElementById('activeProjectInfo').innerHTML='<span class="no-project-msg">← Selecciona un proyecto desde la tabla</span>';
      setRing('timerRing',0); await loadWeeklyStats(); syncModalDigits(); syncModalBtn();
    }
    loadProjects(); loadBilling();
  } catch(e){ alert('Error borrando proyecto.'); }
}

restoreTimerLocal();
loadWeeklyStats();
loadProjects();