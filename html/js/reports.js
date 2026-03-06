const pad      = n => String(n).padStart(2,'0');
const hFmt     = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h?`${h}h ${pad(m)}m`:`${pad(m)}m` };
const hDec     = s => (s/3600).toFixed(1)+'h';
const fmtDate  = d => d.toISOString().slice(0,10);
const fmtDisp  = d => d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
const $        = id => document.getElementById(id);
const setText  = (id,v) => $(id).textContent = v;
const apiAll   = (...urls) => Promise.all(urls.map(u => apiGet(u)));

const DAYS   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let tsLoaded=false, facLoaded=false, flLoaded=false;

/* ── TABS ── */
function switchTab(name) {
  const names = ['timesheet','facturacion','freelancer'];
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', names[i]===name));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $('panel-'+name).classList.add('active');
  if (name==='timesheet'   && !tsLoaded)  { loadTimesheet();  tsLoaded=true  }
  if (name==='facturacion' && !facLoaded) { loadFacturacion();facLoaded=true }
  if (name==='freelancer'  && !flLoaded)  { loadFreelancer(); flLoaded=true  }
}

/* ── SEMANA ── */
function getWeekStart(offset=0) {
  const d = new Date(), day = d.getDay()||7;
  d.setDate(d.getDate()-day+1+offset*7);
  d.setHours(0,0,0,0);
  return d;
}

function fillWeekSelector() {
  const sel = $('ts-week-select');
  for (let i=0; i>=-11; i--) {
    const ws=getWeekStart(i), we=new Date(ws);
    we.setDate(we.getDate()+6);
    const opt = Object.assign(document.createElement('option'), {
      value: i,
      textContent: i===0 ? `Esta semana (${fmtDisp(ws)}–${fmtDisp(we)})` : `${fmtDisp(ws)} – ${fmtDisp(we)}`
    });
    sel.appendChild(opt);
  }
}

function fillMonthSelector() {
  const sel = $('fac-month-select'), now = new Date();
  for (let i=0; i<12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const opt = Object.assign(document.createElement('option'), {
      value: `${d.getFullYear()}-${pad(d.getMonth()+1)}`,
      textContent: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    });
    sel.appendChild(opt);
  }
}

/* ── Acumulador de sesiones por proyecto ── */
function buildMap(sesiones, keyFn = s => s.proyecto_id) {
  const map = {};
  sesiones.forEach(s => { map[keyFn(s)] = (map[keyFn(s)]||0) + Number(s.duracion||0) });
  return map;
}

/* ════════════════════════
   TIMESHEET SEMANAL
════════════════════════ */
async function loadTimesheet() {
  const offset = parseInt($('ts-week-select').value)||0;
  const ws = getWeekStart(offset), we = new Date(ws);
  we.setDate(we.getDate()+6);
  setText('ts-week-label', `${fmtDisp(ws)} — ${fmtDisp(we)}`);

  const wrap = $('ts-grid-wrap');
  wrap.innerHTML = '<div class="loading-row">Cargando...</div>';

  try {
    const [proyectos, sesiones] = await apiAll('/proyectos', `/sesiones/rango?desde=${fmtDate(ws)}&hasta=${fmtDate(we)}`);
    const map={}, dayTotals=[0,0,0,0,0,0,0];
    let totalSeg=0, totalSes=0;

    sesiones.forEach(s => {
      const dow = (new Date(s.start_time).getDay()+6)%7;
      if (!map[s.proyecto_id]) map[s.proyecto_id]=[0,0,0,0,0,0,0];
      const dur = Number(s.duracion)||0;
      map[s.proyecto_id][dow] += dur;
      dayTotals[dow] += dur;
      totalSeg += dur; totalSes++;
    });

    const projs = proyectos.filter(p => map[p.id]);
    const bestIdx = dayTotals.indexOf(Math.max(...dayTotals));

    setText('ts-total-h',   hFmt(totalSeg));
    setText('ts-proyectos', projs.length);
    setText('ts-sesiones',  totalSes);
    setText('ts-best-day',  totalSeg>0 ? `${DAYS[bestIdx]} (${hFmt(dayTotals[bestIdx])})` : '—');

    if (!projs.length) { wrap.innerHTML='<div class="loading-row">Sin sesiones esta semana.</div>'; return; }

    const dayHeaders = DAYS.map((d,i) => {
      const dd = new Date(ws); dd.setDate(dd.getDate()+i);
      return `${d}<br><span style="font-weight:400;opacity:.65;font-size:.62rem">${fmtDisp(dd)}</span>`;
    });

    const rows = projs.map(p => {
      const days = map[p.id], rowTot = days.reduce((a,b)=>a+b,0);
      return `<div class="ts-cell proj"><span class="ts-dot" style="background:${p.color}"></span>
        <div>${p.nombre}<div class="ts-proj-sub">${p.cliente}</div></div></div>
        ${days.map(s=>`<div class="ts-cell day ${s>0?'on':''}">${s>0?hDec(s):'—'}</div>`).join('')}
        <div class="ts-cell tot">${hDec(rowTot)}</div>`;
    }).join('');

    wrap.innerHTML = `<div class="ts-grid">
      <div class="ts-head" style="text-align:left">Proyecto</div>
      ${dayHeaders.map(d=>`<div class="ts-head">${d}</div>`).join('')}
      <div class="ts-head">Total</div>
      ${rows}
      <div class="ts-cell" style="font-weight:700;color:var(--text)">TOTAL</div>
      ${dayTotals.map(s=>`<div class="ts-cell tot">${s>0?hDec(s):'—'}</div>`).join('')}
      <div class="ts-cell tot" style="color:var(--accent)">${hDec(totalSeg)}</div>
    </div>`;

  } catch(e) { wrap.innerHTML='<div class="loading-row">Error cargando datos.</div>'; }
}

/* ════════════════════════
   FACTURACIÓN MENSUAL
════════════════════════ */
async function loadFacturacion() {
  const [yr,mo] = $('fac-month-select').value.split('-').map(Number);
  const desde=`${yr}-${pad(mo)}-01`, hasta=`${yr}-${pad(mo)}-${new Date(yr,mo,0).getDate()}`;
  const tbody = $('fac-tbody');
  tbody.innerHTML='<tr><td colspan="6" class="loading-row">Cargando...</td></tr>';

  try {
    const [proyectos, sesiones] = await apiAll('/proyectos', `/sesiones/rango?desde=${desde}&hasta=${hasta}`);
    const map = buildMap(sesiones);
    const rows = proyectos.filter(p=>map[p.id])
      .map(p=>({ ...p, seg:map[p.id], horas:map[p.id]/3600, total:(map[p.id]/3600)*p.tarifa_hora }))
      .sort((a,b)=>b.total-a.total);

    if (!rows.length) {
      tbody.innerHTML='<tr><td colspan="6" class="loading-row">Sin sesiones este mes.</td></tr>';
      ['fac-total','fac-horas','fac-clientes','fac-tarifa-avg'].forEach(id=>setText(id,'—'));
      return;
    }

    const totFac = rows.reduce((a,r)=>a+r.total,0);
    const totSeg = rows.reduce((a,r)=>a+r.seg,0);
    setText('fac-total',      `$${totFac.toFixed(2)}`);
    setText('fac-horas',      hFmt(totSeg));
    setText('fac-clientes',   new Set(rows.map(r=>r.cliente)).size);
    setText('fac-tarifa-avg', `$${(totFac/(totSeg/3600)).toFixed(0)}/h`);

    tbody.innerHTML = rows.map(r=>`<tr>
      <td><span style="width:8px;height:8px;border-radius:50%;background:${r.color};display:inline-block;margin-right:6px;vertical-align:middle"></span>${r.cliente}</td>
      <td>${r.nombre}</td>
      <td style="font-family:var(--mono)">${hFmt(r.seg)}</td>
      <td style="font-family:var(--mono)">$${r.tarifa_hora}</td>
      <td style="font-family:var(--mono);font-weight:700;color:var(--green)">$${r.total.toFixed(2)}</td>
      <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
    </tr>`).join('')
    + `<tr style="background:rgba(26,127,212,.04)">
      <td colspan="2" style="font-weight:700;color:var(--text)">TOTAL</td>
      <td style="font-family:var(--mono);font-weight:700">${hFmt(totSeg)}</td>
      <td></td>
      <td style="font-family:var(--mono);font-weight:700;color:var(--green)">$${totFac.toFixed(2)}</td>
      <td></td></tr>`;

  } catch(e) { tbody.innerHTML='<tr><td colspan="6" class="loading-row">Error cargando datos.</td></tr>'; }
}

/* ════════════════════════
   RESUMEN FREELANCER
════════════════════════ */
async function loadFreelancer() {
  const dias  = parseInt($('fl-period-select').value);
  const hasta = new Date(), desde = new Date();
  desde.setDate(desde.getDate()-dias);

  const list = $('fl-list');
  list.innerHTML='<div class="loading-row">Cargando...</div>';

  try {
    const [proyectos, sesiones] = await apiAll('/proyectos', `/sesiones/rango?desde=${fmtDate(desde)}&hasta=${fmtDate(hasta)}`);
    const map = buildMap(sesiones);
    const rows = proyectos.filter(p=>map[p.id])
      .map(p=>({ ...p, seg:map[p.id], facturado:(map[p.id]/3600)*p.tarifa_hora }))
      .sort((a,b)=>b.facturado-a.facturado);

    if (!rows.length) {
      list.innerHTML='<div class="loading-row">Sin datos en este período.</div>';
      ['fl-horas-total','fl-ingresos','fl-proyectos','fl-tarifa-ef'].forEach(id=>setText(id,'—'));
      return;
    }

    const maxSeg = Math.max(...rows.map(r=>r.seg));
    const totSeg = rows.reduce((a,r)=>a+r.seg,0);
    const totFac = rows.reduce((a,r)=>a+r.facturado,0);
    setText('fl-horas-total', hFmt(totSeg));
    setText('fl-ingresos',    `$${totFac.toFixed(2)}`);
    setText('fl-proyectos',   rows.length);
    setText('fl-tarifa-ef',   `$${totSeg>0?(totFac/(totSeg/3600)).toFixed(0):0}/h`);

    list.innerHTML = rows.map(r => {
      const pct = maxSeg>0 ? (r.seg/maxSeg*100).toFixed(1) : 0;
      return `<div class="fl-row">
        <div class="fl-name">
          <span style="width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0"></span>
          <div>${r.nombre}<div class="fl-sub">${r.cliente}</div></div>
        </div>
        <div class="prog-wrap">
          <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${r.color}"></div></div>
          <span class="prog-pct">${pct}%</span>
        </div>
        <div class="fl-num"><strong>${hFmt(r.seg)}</strong>trabajadas</div>
        <div class="fl-num"><strong style="color:var(--green)">$${r.facturado.toFixed(2)}</strong>facturado</div>
      </div>`;
    }).join('');

  } catch(e) { list.innerHTML='<div class="loading-row">Error cargando datos.</div>'; }
}

/* ── INIT ── */
fillWeekSelector();
fillMonthSelector();
loadTimesheet();
tsLoaded=true;