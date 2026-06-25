// index.js local event history 2026-06-26
(function () {
  const STORAGE_KEY = 'timegrid_created_events_v1';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function getEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveEvents(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // localStorage が使えない環境では何もしない
    }
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function render() {
    const area = document.getElementById('localEventList');
    const empty = document.getElementById('localEventEmpty');
    const clearBtn = document.getElementById('clearLocalEventsBtn');
    if (!area || !empty || !clearBtn) return;

    const events = getEvents().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (!events.length) {
      area.innerHTML = '';
      empty.style.display = 'block';
      clearBtn.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    clearBtn.style.display = 'inline-flex';
    area.innerHTML = events.map(ev => `
      <div class="local-event-item">
        <div class="local-event-main">
          <strong>${escapeHtml(ev.title || '無題のイベント')}</strong>
          <span>${escapeHtml(formatDateTime(ev.createdAt))}</span>
        </div>
        <div class="local-event-actions">
          <a class="btn small" href="${escapeHtml(ev.eventUrl || ('event.html?id=' + encodeURIComponent(ev.eventId || '')))}">回答画面</a>
          <a class="btn secondary small" href="admin.html?id=${encodeURIComponent(ev.eventId || '')}">管理画面</a>
        </div>
      </div>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    const clearBtn = document.getElementById('clearLocalEventsBtn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (!confirm('このブラウザに保存された作成履歴を削除しますか？')) return;
        saveEvents([]);
        render();
      };
    }
  });
})();
