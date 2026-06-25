const SLOTS = buildSlots('06:00', '24:00');
const selectedDates = new Set();
const selectedSlots = new Map(); // date -> Set(slot)
let dragMode = null;
let calendarBase = firstDayOfMonth(new Date());

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
function nextTime(t) { const i = SLOTS.indexOf(t); return i >= 0 ? (SLOTS[i + 1] || '24:00') : t; }
function msg(html, type='notice') { document.getElementById('message').innerHTML = `<div class="${type}">${html}</div>`; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function firstDayOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function dayLabel(dateStr) { return TimeGridApi.formatDate(dateStr); }

function fillSelects() {
  const s = document.getElementById('bulkStart'), e = document.getElementById('bulkEnd');
  s.innerHTML = SLOTS.map(t => `<option>${t}</option>`).join('');
  e.innerHTML = [...SLOTS.slice(1), '24:00'].map(t => `<option>${t}</option>`).join('');
  s.value = '10:00'; e.value = '12:00';
}

function renderCalendars() {
  const wrap = document.getElementById('monthCalendars');
  wrap.innerHTML = [0, 1].map(offset => renderMonth(addMonths(calendarBase, offset))).join('');
  wrap.querySelectorAll('.cal-day.current').forEach(btn => {
    btn.onclick = () => {
      const date = btn.dataset.date;
      if (selectedDates.has(date)) { selectedDates.delete(date); selectedSlots.delete(date); }
      else { selectedDates.add(date); if (!selectedSlots.has(date)) selectedSlots.set(date, new Set()); }
      renderCalendars(); renderDateSummary(); renderTimelines();
    };
  });
}

function renderMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const title = `${year}年${month + 1}月`;
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const date = ymd(d);
    const current = d.getMonth() === month;
    const selected = selectedDates.has(date);
    cells += `<button type="button" class="cal-day ${current ? 'current' : 'outside'} ${selected ? 'selected' : ''}" data-date="${date}" ${current ? '' : 'disabled'}>${d.getDate()}</button>`;
  }
  return `<div class="mini-calendar"><div class="calendar-title">${title}</div><div class="calendar-week"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div class="calendar-days">${cells}</div></div>`;
}

function renderDateSummary() {
  const el = document.getElementById('selectedDateSummary');
  const dates = [...selectedDates].sort();
  el.textContent = dates.length ? dates.map(dayLabel).join('、') : 'なし';
}

function renderTimelines() {
  const wrap = document.getElementById('timelines');
  const dates = [...selectedDates].sort();
  if (!dates.length) {
    wrap.innerHTML = '<p class="help compact-help">STEP 2で日付を選択すると、ここに時間選択のタイムラインが表示されます。</p>';
    return;
  }
  wrap.innerHTML = `<div class="time-table" style="--cols:${SLOTS.length}">
    <div class="time-head sticky-left"></div>
    ${SLOTS.map(slot => `<div class="hour-head">${slot.endsWith(':00') ? slot.slice(0,2) : ''}</div>`).join('')}
    ${dates.map(date => renderTimelineRow(date)).join('')}
  </div>`;
  bindGridEvents(wrap);
}

function renderTimelineRow(date) {
  const set = selectedSlots.get(date) || new Set();
  return `<div class="date-cell sticky-left"><div>${dayLabel(date)}</div><div class="row-tools"><button type="button" class="link-btn row-reset" data-date="${date}">リセット</button><button type="button" class="link-btn row-all" data-date="${date}">終日</button></div></div>${SLOTS.map(slot => `<div class="time-dot ${set.has(slot) ? 'selected' : ''}" data-date="${date}" data-slot="${slot}" title="${dayLabel(date)} ${slot}"></div>`).join('')}`;
}

function setSlot(date, slot, value) {
  if (!selectedSlots.has(date)) selectedSlots.set(date, new Set());
  const set = selectedSlots.get(date);
  value ? set.add(slot) : set.delete(slot);
}
function bindGridEvents(root) {
  root.querySelectorAll('.time-dot').forEach(cell => {
    cell.addEventListener('pointerdown', e => {
      e.preventDefault();
      const date = cell.dataset.date, slot = cell.dataset.slot;
      const set = selectedSlots.get(date) || new Set();
      dragMode = !set.has(slot);
      setSlot(date, slot, dragMode);
      renderTimelines();
    });
    cell.addEventListener('pointerenter', () => {
      if (dragMode === null) return;
      setSlot(cell.dataset.date, cell.dataset.slot, dragMode);
      cell.classList.toggle('selected', dragMode);
    });
  });
  root.querySelectorAll('.row-reset').forEach(btn => btn.onclick = () => { selectedSlots.set(btn.dataset.date, new Set()); renderTimelines(); });
  root.querySelectorAll('.row-all').forEach(btn => btn.onclick = () => { selectedSlots.set(btn.dataset.date, new Set(SLOTS)); renderTimelines(); });
  window.onpointerup = () => { dragMode = null; };
}
function collectCandidates() {
  const candidates = [];
  [...selectedDates].sort().forEach(date => {
    const slots = [...(selectedSlots.get(date) || new Set())].sort((a,b) => SLOTS.indexOf(a) - SLOTS.indexOf(b));
    slots.forEach(slot => candidates.push({ date, startTime: slot, endTime: nextTime(slot) }));
  });
  return candidates;
}

document.addEventListener('DOMContentLoaded', () => {
  fillSelects(); renderCalendars(); renderDateSummary(); renderTimelines();
  document.getElementById('prevMonthBtn').onclick = () => { calendarBase = addMonths(calendarBase, -1); renderCalendars(); };
  document.getElementById('nextMonthBtn').onclick = () => { calendarBase = addMonths(calendarBase, 1); renderCalendars(); };
  document.getElementById('todayBtn').onclick = () => { calendarBase = firstDayOfMonth(new Date()); renderCalendars(); };
  document.getElementById('bulkApplyBtn').onclick = () => {
    const start = document.getElementById('bulkStart').value, end = document.getElementById('bulkEnd').value;
    if (start >= end) return msg('終了時刻は開始時刻より後にしてください。', 'error');
    selectedDates.forEach(date => SLOTS.filter(t => t >= start && t < end).forEach(t => setSlot(date, t, true)));
    renderTimelines();
  };
  document.getElementById('resetBtn').onclick = () => { selectedSlots.clear(); selectedDates.forEach(d => selectedSlots.set(d, new Set())); renderTimelines(); };
  document.getElementById('createForm').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '登録中...';
    }
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
    } catch (err) {
      msg(TimeGridApi.escapeHtml(err.message), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText || '登録';
      }
    }
  };
});
