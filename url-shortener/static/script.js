const form = document.getElementById('shortenForm');
const urlInput = document.getElementById('urlInput');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');

const toggleCustomBtn = document.getElementById('toggleCustom');
const customRow = document.getElementById('customRow');
const customCode = document.getElementById('customCode');
const customPrefix = document.getElementById('customPrefix');

const resultCard = document.getElementById('resultCard');
const shortLink = document.getElementById('shortLink');
const originalLink = document.getElementById('originalLink');
const copyBtn = document.getElementById('copyBtn');

const meterBefore = document.getElementById('meterBefore');
const meterAfter = document.getElementById('meterAfter');
const countBefore = document.getElementById('countBefore');
const countAfter = document.getElementById('countAfter');
const meterRatio = document.getElementById('meterRatio');

const historyBody = document.getElementById('historyBody');
const refreshBtn = document.getElementById('refreshBtn');

const mongoStatus = document.getElementById('mongoStatus');
async function checkHealth() {
  const dot = mongoStatus.querySelector('.dot');
  const text = mongoStatus.querySelector('.status-text');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.mongo_connected) {
      dot.className = 'dot online';
      text.textContent = 'mongodb connected';
    } else {
      dot.className = 'dot offline';
      text.textContent = 'mongodb unreachable';
    }
  } catch (e) {
    dot.className = 'dot offline';
    text.textContent = 'backend unreachable';
  }
}

customPrefix.textContent = `${window.location.host}/`;

toggleCustomBtn.addEventListener('click', () => {
  const showing = !customRow.hidden;
  customRow.hidden = showing;
  toggleCustomBtn.textContent = showing ? '+ custom code' : '– custom code';
  if (!showing) customCode.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const url = urlInput.value.trim();
  const custom = customCode.value.trim();

  if (!url) return;

  setLoading(true);

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, custom_code: custom }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    showResult(data);
    customCode.value = '';
    loadHistory();
  } catch (err) {
    showError('Could not reach the server. Is Flask running?');
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector('.btn-label').textContent = isLoading ? 'compressing…' : 'Generate';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function hideError() {
  errorMsg.hidden = true;
}

function showResult(data) {
  resultCard.hidden = false;

  shortLink.href = data.short_url;
  shortLink.textContent = data.short_url.replace(/^https?:\/\//, '');
  originalLink.textContent = data.original_url;

  const beforeLen = data.original_url.length;
  const afterLen = data.short_url.replace(/^https?:\/\//, '').length;
  const maxLen = Math.max(beforeLen, afterLen, 1);

  meterBefore.style.width = '0%';
  meterAfter.style.width = '0%';
  countBefore.textContent = '0';
  countAfter.textContent = '0';

  requestAnimationFrame(() => {
    setTimeout(() => {
      meterBefore.style.width = `${(beforeLen / maxLen) * 100}%`;
      meterAfter.style.width = `${(afterLen / maxLen) * 100}%`;
    }, 30);
  });

  animateCount(countBefore, beforeLen);
  animateCount(countAfter, afterLen);

  const pct = beforeLen > 0 ? Math.round((1 - afterLen / beforeLen) * 100) : 0;
  meterRatio.textContent = `${pct}% shorter (${beforeLen} → ${afterLen} characters)`;

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function animateCount(el, target) {
  const duration = 500;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortLink.href);
    copyBtn.textContent = 'copied ✓';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'copy';
      copyBtn.classList.remove('copied');
    }, 1500);
  } catch (e) {
    showError('Could not copy automatically — copy the link manually.');
  }
});

async function loadHistory() {
  try {
    const res = await fetch('/api/urls');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      historyBody.innerHTML = `<tr class="empty-row"><td colspan="4">No links yet — shorten your first one above.</td></tr>`;
      return;
    }

    historyBody.innerHTML = data.map(rowHtml).join('');
  } catch (e) {
    historyBody.innerHTML = `<tr class="empty-row"><td colspan="4">Couldn't load history.</td></tr>`;
  }
}

function rowHtml(item) {
  const created = new Date(item.created_at);
  const createdStr = isNaN(created) ? '—' : created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `
    <tr>
      <td class="code-cell">${escapeHtml(item.short_code)}</td>
      <td class="dest-cell" title="${escapeHtml(item.original_url)}">${escapeHtml(item.original_url)}</td>
      <td>${item.clicks}</td>
      <td>${createdStr}</td>
    </tr>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

refreshBtn.addEventListener('click', loadHistory);

checkHealth();
loadHistory();
