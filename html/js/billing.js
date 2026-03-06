async function loadBilling() {
  try {
    const data = await apiGet('/facturas/proyectada');
    if (!Array.isArray(data)) throw new Error('Respuesta inválida');
    renderBilling(data);
  } catch(e) {
    console.error('Error cargando facturación:', e);
  }
}

function renderBilling(data) {
  // Total real: horas trabajadas este mes × tarifa (sin proyección)
  let totalReal = 0;
  data.forEach(p => {
    const horas = Number(p.segundos_mes || 0) / 3600;
    totalReal += horas * p.tarifa_hora;
  });

  document.getElementById('billingTotal').textContent = '$' + totalReal.toFixed(2);

  // Legend
  document.getElementById('billingLegend').innerHTML = data.map(p => `
    <div class="legend-item">
      <span class="dot" style="background:${p.color}"></span>${p.cliente}
    </div>
  `).join('');

  // Barras
  const chart = document.getElementById('barChart');
  chart.innerHTML = '';
  if (!data.length) return;

  const maxH = Math.max(...data.map(p => Number(p.segundos_mes || 0) / 3600), 1);

  data.forEach(p => {
    const h = Number(p.segundos_mes || 0) / 3600;

    const grp  = document.createElement('div');
    grp.className = 'bar-group';

    const bars = document.createElement('div');
    bars.className = 'bars';

    const bar  = document.createElement('div');
    bar.className = 'bar';
    bar.style.background = p.color;
    bar.style.height = '0px';
    bars.appendChild(bar);

    const lbl  = document.createElement('span');
    lbl.className = 'bar-label';
    lbl.textContent = p.cliente.split(' ')[0];

    grp.appendChild(bars);
    grp.appendChild(lbl);
    chart.appendChild(grp);

    setTimeout(() => { bar.style.height = (h / maxH * 85) + 'px'; }, 300);
  });
}

// Actualiza el total en vivo mientras corre el timer (sin recargar la BD)
function updateBillingLive() {
  if (!timerState.project) return;
  const horasTimer = timerState.seconds / 3600;
  const gananciaTimer = horasTimer * timerState.project.tarifa_hora;

  // Sumar lo del timer al total guardado en BD
  const base = parseFloat(document.getElementById('billingTotal')
    .textContent.replace('$', '')) || 0;

  // Solo actualizar si el timer está corriendo para evitar doble conteo
  if (timerState.running) {
    document.getElementById('billingTotal').textContent =
      '$' + (base + gananciaTimer).toFixed(2);
  }
}

// Init
loadBilling();