let eventData = null;
let currentMark = 'ok';
let answerMap = new Map();
let dragApply = false;

function msg(html, type='notice') { document.getElementById('message').innerHTML = `<div class="${type}">${html}</div>`; }
function statusClass(s) { return s ? `mark-${s}` : ''; }
function groupedCandidates() {
  const groups = new Map();
  eventData.candidates.forEach(c => { if (!groups.has(c.date)) groups.set(c.date, []); groups.get(c.date).push(c); });
  return [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0]));
}
async function load() {
  const id = TimeGridApi.qs('id');
  document.getElementById('adminLink').href = `admin.html?id=${encodeURIComponent(id || '')}`;
  if (!id) return msg('イベントIDが指定されていません。', 'error');
  try { eventData = await TimeGridApi.post('getEvent', { eventId: id }); renderAll(); }
  catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
}
function renderAll() { renderEvent(); renderSummary(); renderResponses(); renderComments(); renderMarkPicker(); renderAnswerTimeline(); }
function renderEvent() {
  const e = eventData.event;
  const closed = e.status === 'closed';
  document.getElementById('eventArea').innerHTML = `<div class="actions" style="justify-content:space-between"><div><h1>${TimeGridApi.escapeHtml(e.title)}</h1><p>${TimeGridApi.escapeHtml(e.description || '').replace(/\n/g,'<br>')}</p><span class="badge">${closed ? '回答受付停止中' : '回答受付中'}</span></div><button class="btn" id="openModalBtn" ${closed ? 'disabled' : ''}>回答を追加する</button></div>`;
  document.getElementById('openModalBtn').onclick = () => openModal();
}
function renderSummary() {
  const counts = {};
  eventData.candidates.forEach(c => counts[c.candidateId] = { best:0, ok:0, maybe:0, ng:0 });
  eventData.responses.forEach(r => Object.entries(r.details || {}).forEach(([cid, st]) => { if (counts[cid] && st) counts[cid][st]++; }));
  document.getElementById('summaryArea').innerHTML = `<h2>候補時間ごとの集計</h2><div class="table-scroll"><table><thead><tr><th class="left">候補時間</th><th>◎</th><th>○</th><th>△</th><th>×</th></tr></thead><tbody>${eventData.candidates.map(c => `<tr><td class="left">${TimeGridApi.candidateLabel(c)}</td><td>${counts[c.candidateId].best}</td><td>${counts[c.candidateId].ok}</td><td>${counts[c.candidateId].maybe}</td><td>${counts[c.candidateId].ng}</td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('.edit-response').forEach(btn => btn.onclick = () => openEditModal(btn.dataset.rid));
}
function renderResponses() {
  document.getElementById('responsesArea').innerHTML = `<h2>参加者ごとの回答一覧</h2><div class="table-scroll"><table><thead><tr><th class="left">名前</th><th class="left">コメント</th>${eventData.candidates.map(c => `<th>${TimeGridApi.candidateLabel(c)}</th>`).join('')}</tr></thead><tbody>${eventData.responses.map(r => `<tr><td class="left">${TimeGridApi.escapeHtml(r.name)}<br><button type="button" class="btn secondary small edit-response" data-rid="${r.responseId}">編集</button></td><td class="left">${TimeGridApi.escapeHtml(r.comment || '')}</td>${eventData.candidates.map(c => `<td>${TimeGridApi.markMap[(r.details || {})[c.candidateId] || ''] || ''}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${eventData.candidates.length + 2}">まだ回答はありません。</td></tr>`}</tbody></table></div>`;
  document.querySelectorAll('.edit-response').forEach(btn => btn.onclick = () => openEditModal(btn.dataset.rid));
}
function renderComments() {
  document.getElementById('commentsArea').innerHTML = `<h2>コメント一覧</h2>${eventData.responses.filter(r => r.comment).map(r => `<div class="notice"><strong>${TimeGridApi.escapeHtml(r.name)}</strong><br>${TimeGridApi.escapeHtml(r.comment).replace(/\n/g,'<br>')}</div>`).join('') || '<p class="help">コメントはまだありません。</p>'}`;
}
function renderMarkPicker() {
  const items = [['best','◎ 強く希望'],['ok','○ 参加可能'],['maybe','△ 未定'],['ng','× 不可']];
  document.getElementById('markPicker').innerHTML = items.map(([k,l]) => `<button type="button" class="mark-btn ${currentMark===k?'active':''}" data-mark="${k}">${l}</button>`).join('');
  document.querySelectorAll('.mark-btn').forEach(b => b.onclick = () => { currentMark = b.dataset.mark; renderMarkPicker(); });
}
function renderAnswerTimeline() {
  document.getElementById('answerTimeline').innerHTML = groupedCandidates().map(([date, list]) => `<div class="timeline-day"><p class="timeline-title">${TimeGridApi.formatDate(date)}</p><div class="timeline-grid" style="--cols:${list.length}">${list.map(c => { const st = answerMap.get(c.candidateId) || ''; return `<div class="time-cell ${statusClass(st)}" data-cid="${c.candidateId}"><span class="time">${c.startTime}</span><span class="mark">${TimeGridApi.markMap[st] || ''}</span></div>`; }).join('')}</div></div>`).join('');
  document.querySelectorAll('#answerTimeline .time-cell').forEach(cell => {
    cell.addEventListener('pointerdown', e => { e.preventDefault(); cell.setPointerCapture(e.pointerId); dragApply = true; answerMap.set(cell.dataset.cid, currentMark); renderAnswerTimeline(); });
    cell.addEventListener('pointerenter', () => { if (!dragApply) return; answerMap.set(cell.dataset.cid, currentMark); renderAnswerTimeline(); });
  });
  window.onpointerup = () => { dragApply = false; };
}
function openModal() { answerMap = new Map(); document.getElementById('responseForm').reset(); document.getElementById('responseId').value = ''; document.getElementById('responseModal').classList.add('open'); renderAnswerTimeline(); }
function openEditModal(responseId) {
  const r = eventData.responses.find(x => x.responseId === responseId);
  if (!r) return;
  answerMap = new Map(Object.entries(r.details || {}));
  document.getElementById('responseId').value = r.responseId;
  document.getElementById('name').value = r.name || '';
  document.getElementById('comment').value = r.comment || '';
  document.getElementById('editPassword').value = '';
  document.getElementById('responseModal').classList.add('open');
  renderAnswerTimeline();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closeModalBtn').onclick = () => document.getElementById('responseModal').classList.remove('open');
  document.getElementById('responseForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const details = [...answerMap.entries()].filter(([,status]) => status).map(([candidateId, status]) => ({ candidateId, status }));
      const payload = { eventId: TimeGridApi.qs('id'), name: document.getElementById('name').value.trim(), comment: document.getElementById('comment').value.trim(), editPassword: document.getElementById('editPassword').value, details };
      const responseId = document.getElementById('responseId').value;
      if (responseId) {
        payload.responseId = responseId;
        await TimeGridApi.post('updateResponse', payload);
        msg('回答を更新しました。主催者へ通知しました。');
      } else {
        await TimeGridApi.post('submitResponse', payload);
        msg('回答を登録しました。主催者へ通知しました。');
      }
      document.getElementById('responseModal').classList.remove('open'); await load();
    } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
  load();
});
