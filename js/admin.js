let adminEvent = null;
let adminPassword = '';
function msg(html, type='notice') { document.getElementById('message').innerHTML = `<div class="${type}">${html}</div>`; }
async function loadEvent() {
  adminEvent = await TimeGridApi.post('getEvent', { eventId: TimeGridApi.qs('id') });
}
function renderAdmin() {
  const e = adminEvent.event;
  document.getElementById('adminArea').style.display = 'block';
  document.getElementById('adminArea').innerHTML = `<h1>管理：${TimeGridApi.escapeHtml(e.title)}</h1><p>${TimeGridApi.escapeHtml(e.description || '').replace(/\n/g,'<br>')}</p><p><span class="badge">${e.status}</span></p><div class="form-row"><label for="finalCandidateId">決定日時</label><select id="finalCandidateId"><option value="">未設定</option>${adminEvent.candidates.map(c => `<option value="${c.candidateId}" ${e.finalCandidateId===c.candidateId?'selected':''}>${TimeGridApi.candidateLabel(c)}</option>`).join('')}</select></div><div class="actions"><button class="btn secondary" id="saveFinalBtn">決定日時を登録</button><button class="btn secondary" id="closeBtn">回答受付を停止</button><button class="btn danger" id="deleteBtn">イベント削除</button></div><hr><h2>回答状況</h2><p>${adminEvent.responses.length}件の回答があります。</p><div class="table-scroll"><table><thead><tr><th class="left">名前</th><th class="left">コメント</th>${adminEvent.candidates.map(c => `<th>${TimeGridApi.candidateLabel(c)}</th>`).join('')}</tr></thead><tbody>${adminEvent.responses.map(r => `<tr><td class="left">${TimeGridApi.escapeHtml(r.name)}</td><td class="left">${TimeGridApi.escapeHtml(r.comment || '')}</td>${adminEvent.candidates.map(c => `<td>${TimeGridApi.markMap[(r.details || {})[c.candidateId] || ''] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  document.getElementById('saveFinalBtn').onclick = async () => {
    try { await TimeGridApi.post('setFinalCandidate', { eventId: TimeGridApi.qs('id'), password: adminPassword, finalCandidateId: document.getElementById('finalCandidateId').value }); msg('決定日時を登録しました。'); await loadEvent(); renderAdmin(); } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
  document.getElementById('closeBtn').onclick = async () => {
    if (!confirm('回答受付を停止しますか？')) return;
    try { await TimeGridApi.post('closeEvent', { eventId: TimeGridApi.qs('id'), password: adminPassword }); msg('回答受付を停止しました。'); await loadEvent(); renderAdmin(); } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
  document.getElementById('deleteBtn').onclick = async () => {
    if (!confirm('イベントを削除します。通常画面では表示できなくなります。よろしいですか？')) return;
    try { await TimeGridApi.post('deleteEvent', { eventId: TimeGridApi.qs('id'), password: adminPassword }); msg('イベントを削除しました。'); await loadEvent(); renderAdmin(); } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
}
document.addEventListener('DOMContentLoaded', () => {
  const id = TimeGridApi.qs('id');
  document.getElementById('eventLink').href = `event.html?id=${encodeURIComponent(id || '')}`;
  document.getElementById('loginBtn').onclick = async () => {
    try {
      adminPassword = document.getElementById('password').value;
      await TimeGridApi.post('verifyAdminPassword', { eventId: id, password: adminPassword });
      await loadEvent(); document.getElementById('loginArea').style.display = 'none'; renderAdmin();
    } catch (err) { msg(TimeGridApi.escapeHtml(err.message), 'error'); }
  };
});
