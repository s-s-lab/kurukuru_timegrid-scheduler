// event.js compact timeline version 2026-06-25-fix1
const EVENT_SLOTS = buildEventSlots('06:00', '24:00');
let eventData = null;
let currentMark = 'ok';
let answerMap = new Map();
let dragApply = false;
let candidateByDateSlot = new Map();

function buildEventSlots(start, end) {
  const out = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h < eh || (h === eh && m < em)) {
    out.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return out;
}
function msg(html, type='notice') {
  document.getElementById('message').innerHTML = `<div class="${type}">${html}</div>`;
}
function normalizeDateValue(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  }
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return str;
}
function normalizeTimeValue(value) {
  if (!value) return '';
  const str = String(value);
  const m = str.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${String(Number(m[1])).padStart(2,'0')}:${m[2]}`;
  return str;
}
function normalizeEventData(data) {
  data.candidates = (data.candidates || []).map(c => ({
    ...c,
    date: normalizeDateValue(c.date),
    startTime: normalizeTimeValue(c.startTime),
    endTime: normalizeTimeValue(c.endTime)
  }));
  data.responses = data.responses || [];
  return data;
}
function formatEventDate(dateStr) {
  const clean = normalizeDateValue(dateStr);
  const d = new Date(clean + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return TimeGridApi.escapeHtml(clean);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}
function slotKey(date, startTime) { return `${normalizeDateValue(date)}__${normalizeTimeValue(startTime)}`; }
function statusClass(s) { return s ? `mark-${s}` : ''; }
function groupedCandidates() {
  const groups = new Map();
  eventData.candidates.forEach(c => {
    if (!groups.has(c.date)) groups.set(c.date, []);
    groups.get(c.date).push(c);
  });
  return [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0]));
}
function rebuildCandidateIndex() {
  candidateByDateSlot = new Map();
  eventData.candidates.forEach(c => candidateByDateSlot.set(slotKey(c.date, c.startTime), c));
}
function getCandidate(date, slot) { return candidateByDateSlot.get(slotKey(date, slot)); }

async function load() {
  const id = TimeGridApi.qs('id');
  document.getElementById('adminLink').href = `admin.html?id=${encodeURIComponent(id || '')}`;
  if (!id) return msg('イベントIDが指定されていません。', 'error');
  try {
    eventData = normalizeEventData(await TimeGridApi.post('getEvent', { eventId: id }));
    rebuildCandidateIndex();
    renderAll();
  } catch (err) {
    msg(TimeGridApi.escapeHtml(err.message), 'error');
  }
}
function renderAll() {
  renderEvent();
  renderComments();
  renderResponses();
  renderMarkPicker();
  renderAnswerTimeline();
}
function renderEvent() {
  const e = eventData.event;
  const closed = e.status === 'closed';
  document.getElementById('eventArea').innerHTML = `
    <div class="event-title-line"><span></span><h1>${TimeGridApi.escapeHtml(e.title)}</h1></div>
    ${e.description ? `<p class="event-description">${TimeGridApi.escapeHtml(e.description).replace(/\n/g,'<br>')}</p>` : '<p class="event-description muted-text">説明・補足はありません。</p>'}
    <div class="mini-meta"><span class="mini-label">状態</span><span>${closed ? '回答受付停止中' : '回答受付中'}</span></div>`;
  const btn = document.getElementById('openModalBtn');
  btn.disabled = closed;
  btn.textContent = closed ? '回答受付は停止中です' : '＋ あなたの予定を追加する';
  btn.onclick = () => openModal();
}
function renderComments() {
  const comments = eventData.responses.filter(r => r.comment);
  document.getElementById('commentsArea').innerHTML = comments.length
    ? comments.map(r => `<div class="comment-line"><strong>${TimeGridApi.escapeHtml(r.name)}</strong><span>${TimeGridApi.escapeHtml(r.comment).replace(/\n/g,'<br>')}</span></div>`).join('')
    : '<p class="compact-note">コメントはまだありません。</p>';
}
function renderResponses() {
  const groups = groupedCandidates();
  const responses = eventData.responses || [];
  document.getElementById('responsesArea').innerHTML = groups.map(([date]) => renderPublicTimeline(date, responses)).join('');
  document.querySelectorAll('.edit-response').forEach(btn => btn.onclick = () => openEditModal(btn.dataset.rid));
}
function renderPublicTimeline(date, responses) {
  const rows = responses.map(r => renderPublicResponseRow(date, r)).join('');
  return `<div class="public-day-block">
    <div class="public-time-table" style="--cols:${EVENT_SLOTS.length}">
      <div class="public-date-cell sticky-left">${formatEventDate(date)}</div>
      ${EVENT_SLOTS.map(slot => `<div class="public-hour-head">${slot.endsWith(':00') ? slot.slice(0,2) : ''}</div>`).join('')}
      <div class="public-name-cell sticky-left candidate-label">候補</div>
      ${EVENT_SLOTS.map(slot => `<div class="public-slot ${getCandidate(date, slot) ? 'candidate' : 'blocked'}"></div>`).join('')}
      ${rows || `<div class="public-name-cell sticky-left empty-row">未回答</div>${EVENT_SLOTS.map(() => '<div class="public-slot empty-row"></div>').join('')}`}
    </div>
  </div>`;
}
function renderPublicResponseRow(date, response) {
  const comment = response.comment ? ` title="${TimeGridApi.escapeHtml(response.comment)}"` : '';
  return `<div class="public-name-cell sticky-left participant-name"${comment}>
    <span>${TimeGridApi.escapeHtml(response.name)}</span>
    <button type="button" class="link-btn edit-response" data-rid="${response.responseId}">編集</button>
  </div>${EVENT_SLOTS.map(slot => {
    const c = getCandidate(date, slot);
    if (!c) return '<div class="public-slot blocked"></div>';
    const st = (response.details || {})[c.candidateId] || '';
    return `<div class="public-slot answer ${statusClass(st)}"><span>${TimeGridApi.markMap[st] || ''}</span></div>`;
  }).join('')}`;
}
function renderMarkPicker() {
  const items = [
    ['best','◎','強く希望'],
    ['ok','○','参加可能'],
    ['maybe','△','未定'],
    ['ng','×','不可']
  ];
  document.getElementById('markPicker').innerHTML = items.map(([k,m,l]) => `
    <label class="mark-radio ${currentMark===k?'active':''}">
      <input type="radio" name="mark" value="${k}" ${currentMark===k?'checked':''}>
      <span class="mark-sample mark-${k}">${m}</span><span>${l}</span>
    </label>`).join('');
  document.querySelectorAll('input[name="mark"]').forEach(r => r.onchange = () => { currentMark = r.value; renderMarkPicker(); });
}
function renderAnswerTimeline() {
  const groups = groupedCandidates();
  const html = groups.map(([date]) => `<div class="answer-day-block">
    <div class="answer-time-table" style="--cols:${EVENT_SLOTS.length}">
      <div class="public-date-cell sticky-left">${formatEventDate(date)}</div>
      ${EVENT_SLOTS.map(slot => `<div class="public-hour-head">${slot.endsWith(':00') ? slot.slice(0,2) : ''}</div>`).join('')}
      <div class="public-name-cell sticky-left candidate-label">入力</div>
      ${EVENT_SLOTS.map(slot => {
        const c = getCandidate(date, slot);
        if (!c) return '<div class="answer-slot blocked"></div>';
        const st = answerMap.get(c.candidateId) || '';
        return `<div class="answer-slot candidate ${statusClass(st)}" data-cid="${c.candidateId}"><span>${TimeGridApi.markMap[st] || ''}</span></div>`;
      }).join('')}
    </div>
  </div>`).join('');
  document.getElementById('answerTimeline').innerHTML = html;
  document.querySelectorAll('#answerTimeline .answer-slot.candidate').forEach(cell => {
    cell.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { cell.setPointerCapture(e.pointerId); } catch (_) {}
      dragApply = true;
      answerMap.set(cell.dataset.cid, currentMark);
      renderAnswerTimeline();
    });
    cell.addEventListener('pointerenter', () => {
      if (!dragApply) return;
      answerMap.set(cell.dataset.cid, currentMark);
      cell.className = `answer-slot candidate ${statusClass(currentMark)}`;
      cell.innerHTML = `<span>${TimeGridApi.markMap[currentMark]}</span>`;
    });
  });
  window.onpointerup = () => { dragApply = false; };
}
function openModal() {
  answerMap = new Map();
  document.getElementById('responseForm').reset();
  document.getElementById('responseId').value = '';
  document.getElementById('responseModal').classList.add('open');
  renderMarkPicker();
  renderAnswerTimeline();
}
function openEditModal(responseId) {
  const r = eventData.responses.find(x => x.responseId === responseId);
  if (!r) return;
  answerMap = new Map(Object.entries(r.details || {}));
  document.getElementById('responseId').value = r.responseId;
  document.getElementById('name').value = r.name || '';
  document.getElementById('comment').value = r.comment || '';
  document.getElementById('editPassword').value = '';
  document.getElementById('responseModal').classList.add('open');
  renderMarkPicker();
  renderAnswerTimeline();
}
function closeModal() { document.getElementById('responseModal').classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closeModalBtn').onclick = closeModal;
  document.getElementById('cancelModalBtn').onclick = closeModal;
  document.getElementById('responseForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const details = [...answerMap.entries()].filter(([,status]) => status).map(([candidateId, status]) => ({ candidateId, status }));
      const payload = {
        eventId: TimeGridApi.qs('id'),
        name: document.getElementById('name').value.trim(),
        comment: document.getElementById('comment').value.trim(),
        editPassword: document.getElementById('editPassword').value,
        details
      };
      const responseId = document.getElementById('responseId').value;
      if (responseId) {
        payload.responseId = responseId;
        await TimeGridApi.post('updateResponse', payload);
        msg('回答を更新しました。主催者へ通知しました。');
      } else {
        await TimeGridApi.post('submitResponse', payload);
        msg('回答を登録しました。主催者へ通知しました。');
      }
      closeModal();
      await load();
    } catch (err) {
      msg(TimeGridApi.escapeHtml(err.message), 'error');
    }
  };
  load();
});
