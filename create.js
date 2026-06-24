const SLOTS = buildSlots('09:00', '22:00');
const selectedDates = new Set();
const selectedSlots = new Map(); // date -> Set(slot)
let dragMode = null;

function buildSlots(start, end) {
  const out = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h < eh || (h === eh && m < em)) {
    out.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += 30; if (m >= 60) { h++; m = 0; }
  }
  return out;
}
function nextTime(t) { const i = SLOTS.indexOf(t); return i >= 0 ? (SLOTS[i + 1] || '22:00') : t; }
function msg(html, type='notice') { document.getElementById('message').innerHTML = `<div class="${type}">${html}</div>`; }
function fillSelects() {
  const s = document.getElementById('bulkStart'), e = document.getElementById('bulkEnd');
  s.innerHTML = SLOTS.map(t => `<option>${t}</option>`).join('');
  e.innerHTML = [...SLOTS.slice(1), '22:00'].map(t => `<option>${t}</option>`).join('');
  s.value = '10:00'; e.value = '12:00';
}
function renderDates() {
  const list = document.getElementById('dateList');
  list.innerHTML = [...selectedDates].sort().map(d => `<div class="date-pill"><span>${TimeGridApi.formatDate(d)}</span><button type="button" data-date="${d}">×</button></div>`).join('');
  list.querySelectorAll('button').forEach(b => b.onclick = () => { selectedDates.delete(b.dataset.date); selectedSlots.delete(b.dataset.date); renderDates(); renderTimelines(); });
}
function renderTimelines() {
  const wrap = document.getElementById('timelines');
  wrap.innerHTML = [...selectedDates].sort().map(date => {
    const set = selectedSlots.get(date) || new Set();
    return `<div class="timeline-day"><p class="timeline-title">${TimeGridApi.formatDate(date)}</p><div class="timeline-grid" style="--cols:${SLOTS.length}" data-date="${date}">${SLOTS.map(slot => `<div class="time-cell ${set.has(slot) ? 'selected' : ''}" data-date="${date}" data-slot="${slot}"><span class="time">${slot}</span></div>`).join('')}</div></div>`;
  }).join('') || '<p class="help">候補日を追加してください。</p>';
  bindGridEvents(wrap);
}
function setSlot(date, slot, value) {
  if (!selectedSlots.has(date)) selectedSlots.set(date, new Set());
  const set = selectedSlots.get(date);
  value ? set.add(slot) : set.delete(slot);
}
function bindGridEvents(root) {
  root.querySelectorAll('.time-cell').forEach(cell => {
    cell.addEventListener('pointerdown', e => {
      e.preventDefault(); cell.setPointerCapture(e.pointerId);
      const date = cell.dataset.date, slot = cell.dataset.slot;
      const set = selectedSlots.get(date) || new Set();
      dragMode = !set.has(slot);
      setSlot(date, slot, dragMode); renderTimelines();
    });
    cell.addEventListener('pointerenter', () => {
      if (dragMode === null) return;
      setSlot(cell.dataset.date, cell.dataset.slot, dragMode); renderTimelines();
    });
  });
  window.onpointerup = () => { dragMode = null; };
}
function collectCandidates() {
  const candidates = [];
  [...selectedDates].sort().forEach(date => {
    const slots = [...(selectedSlots.get(date) || new Set())].sort();
    slots.forEach(slot => candidates.push({ date, startTime: slot, endTime: nextTime(slot) }));
  });
  return candidates;
}

document.addEventListener('DOMContentLoaded', () => {
  fillSelects(); renderTimelines();
  document.getElementById('addDateBtn').onclick = () => {
    const d = document.getElementById('dateInput').value;
    if (!d) return msg('候補日を選択してください。', 'error');
    selectedDates.add(d); if (!selectedSlots.has(d)) selectedSlots.set(d, new Set()); renderDates(); renderTimelines();
  };
  document.getElementById('bulkApplyBtn').onclick = () => {
    const start = document.getElementById('bulkStart').value, end = document.getElementById('bulkEnd').value;
    if (start >= end) return msg('終了時刻は開始時刻より後にしてください。', 'error');
    selectedDates.forEach(date => SLOTS.filter(t => t >= start && t < end).forEach(t => setSlot(date, t, true)));
    renderTimelines();
  };
  document.getElementById('resetBtn').onclick = () => { selectedSlots.clear(); selectedDates.forEach(d => selectedSlots.set(d, new Set())); renderTimelines(); };
  document.getElementById('createForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const candidates = collectCandidates();
      if (candidates.length === 0) throw new Error('候補時間を1つ以上選択してください。');
      const payload = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        organizerEmail: document.getElementById('organizerEmail').value.trim(),
        organizerPassword: document.getElementById('adminPassword').value,
        frontendBaseUrl: window.TIMEGRID_CONFIG.FRONTEND_BASE_URL,
        candidates
      };
      const data = await TimeGridApi.post('createEvent', payload);
      const url = `${window.TIMEGRID_CONFIG.FRONTEND_BASE_URL}/event.html?id=${encodeURIComponent(data.eventId)}`;
      msg(`作成しました。<br><input value="${url}" readonly onclick="this.select()"><p><a class="btn" href="${url}">回答画面を開く</a></p>`);
    } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
});
