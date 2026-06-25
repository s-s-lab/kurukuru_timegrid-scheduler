const TimeGridApi = (() => {
  const config = window.TIMEGRID_CONFIG || {};

  async function post(action, payload = {}) {
    if (!config.GAS_WEB_APP_URL || config.GAS_WEB_APP_URL.includes('XXXXXXXX')) {
      throw new Error('config.js に GAS_WEB_APP_URL を設定してください。');
    }
    const res = await fetch(config.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('APIレスポンスをJSONとして読めません: ' + text); }
    if (!data.ok) throw new Error(data.error || 'APIエラーが発生しました。');
    return data;
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`;
  }

  const markMap = { best: '◎', ok: '○', maybe: '△', ng: '×', '': '' };
  const markLabelMap = { best: '強く希望', ok: '参加可能', maybe: '未定', ng: '不可' };

  function candidateLabel(c) {
    return `${formatDate(c.date)} ${c.startTime}`;
  }

  return { post, qs, escapeHtml, formatDate, candidateLabel, markMap, markLabelMap };
})();
