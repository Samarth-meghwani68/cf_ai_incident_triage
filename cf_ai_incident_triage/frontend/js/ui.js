/**
 * UI rendering module — all DOM manipulation goes through here.
 */
import { escapeHtml, formatDate, renderMarkdown } from './utils.js';

// Cached DOM references
const $ = (id) => document.getElementById(id);

const els = {
  sectionInput: $('section-input'),
  sectionLoading: $('section-loading'),
  sectionResult: $('section-result'),
  sectionChat: $('section-chat'),
  sectionReport: $('section-report'),
  inputLogs: $('input-logs'),
  charCount: $('char-count'),
  btnAnalyze: $('btn-analyze'),
  btnSend: $('btn-send'),
  btnReport: $('btn-report'),
  btnNewSession: $('btn-new-session'),
  btnHistory: $('btn-history'),
  btnCloseHistory: $('btn-close-history'),
  btnCopyReport: $('btn-copy-report'),
  inputChat: $('input-chat'),
  chatMessages: $('chat-messages'),
  chatCount: $('chat-count'),
  triageSummary: $('triage-summary'),
  triageSeverity: $('triage-severity'),
  triageType: $('triage-type'),
  triageConfidenceFill: $('triage-confidence-fill'),
  triageConfidenceText: $('triage-confidence-text'),
  triageCauses: $('triage-causes'),
  triageSteps: $('triage-steps'),
  triageAssumptions: $('triage-assumptions'),
  rawOutputCard: $('raw-output-card'),
  rawOutputText: $('raw-output-text'),
  reportContent: $('report-content'),
  modalHistory: $('modal-history'),
  historyList: $('history-list'),
  errorToast: $('error-toast'),
  errorToastMessage: $('error-toast-message'),
};

/** Show/hide sections */
export function showSection(name) {
  const section = els[`section${name.charAt(0).toUpperCase() + name.slice(1)}`];
  if (section) section.classList.remove('hidden');
}

export function hideSection(name) {
  const section = els[`section${name.charAt(0).toUpperCase() + name.slice(1)}`];
  if (section) section.classList.add('hidden');
}

/** Update character count display */
export function updateCharCount(count, max) {
  els.charCount.textContent = `${count.toLocaleString()} / ${max.toLocaleString()}`;
  els.charCount.classList.toggle('near-limit', count > max * 0.9);
  els.charCount.classList.toggle('at-limit', count >= max);
}

/** Enable/disable the analyze button */
export function setAnalyzeEnabled(enabled) {
  els.btnAnalyze.disabled = !enabled;
}

/** Enable/disable chat send button */
export function setSendEnabled(enabled) {
  els.btnSend.disabled = !enabled;
}

/** Enable/disable report button */
export function setReportEnabled(enabled) {
  els.btnReport.disabled = !enabled;
}

/** Show loading state */
export function showLoading() {
  hideSection('input');
  showSection('loading');
  hideSection('result');
  hideSection('chat');
  hideSection('report');
}

/** Show triage result */
export function showTriageResult(result, parsedSuccessfully, rawOutput) {
  hideSection('loading');

  if (parsedSuccessfully && result) {
    renderTriageCard(result);
    els.rawOutputCard.classList.add('hidden');
    els.triageCard = document.getElementById('triage-card');
    if (els.triageCard) els.triageCard.style.display = '';
  } else {
    // Show raw output fallback, hide structured card
    const triageCard = document.getElementById('triage-card');
    if (triageCard) triageCard.style.display = 'none';
    els.rawOutputCard.classList.remove('hidden');
    els.rawOutputText.textContent = rawOutput || 'No output received.';
  }

  showSection('result');
  showSection('chat');

  // Collapse input section but keep visible
  showSection('input');
  els.inputLogs.style.minHeight = '80px';
  els.inputLogs.disabled = true;
  els.btnAnalyze.disabled = true;

  // Scroll to result
  els.sectionResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Render the structured triage card */
function renderTriageCard(result) {
  els.triageSummary.textContent = result.summary;

  // Severity
  els.triageSeverity.textContent = result.severity;
  els.triageSeverity.className = `severity-badge severity-${result.severity}`;

  // Issue type
  els.triageType.textContent = result.issue_type.replace(/_/g, ' ');

  // Confidence
  const pct = Math.round(result.confidence * 100);
  els.triageConfidenceFill.style.width = `${pct}%`;
  els.triageConfidenceText.textContent = `${pct}%`;

  // Color confidence bar based on level
  if (pct >= 70) {
    els.triageConfidenceFill.style.background = 'var(--success)';
  } else if (pct >= 40) {
    els.triageConfidenceFill.style.background = 'var(--warning)';
  } else {
    els.triageConfidenceFill.style.background = 'var(--error)';
  }

  // Lists
  renderList(els.triageCauses, result.likely_causes);
  renderList(els.triageSteps, result.debugging_steps);
  renderList(els.triageAssumptions, result.assumptions_or_unknowns);
}

/** Render a list of strings into a <ul> or <ol> */
function renderList(container, items) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'None identified.';
    li.style.color = 'var(--text-muted)';
    container.appendChild(li);
    return;
  }
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    container.appendChild(li);
  });
}

/** Add a chat message to the chat area */
export function addChatMessage(role, content) {
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;

  const roleLabel = document.createElement('span');
  roleLabel.className = 'chat-role';
  roleLabel.textContent = role === 'user' ? 'You' : 'AI Assistant';

  const textDiv = document.createElement('div');
  textDiv.className = 'chat-text';
  textDiv.textContent = content;

  div.appendChild(roleLabel);
  div.appendChild(textDiv);
  els.chatMessages.appendChild(div);

  // Auto-scroll to bottom
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

/** Update chat message count badge */
export function updateChatCount(count) {
  els.chatCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
}

/** Show the generated report */
let lastReportRawText = '';
export function showReport(reportText) {
  lastReportRawText = reportText || '';
  els.reportContent.innerHTML = renderMarkdown(reportText);
  showSection('report');
  els.sectionReport.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Get raw report text for clipboard copy */
export function getReportRawText() {
  return lastReportRawText;
}

/** Show error toast */
let toastTimer = null;
export function showError(message) {
  els.errorToastMessage.textContent = message;
  els.errorToast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.errorToast.classList.add('hidden');
  }, 6000);
}

/** Show history modal with cases */
export function showHistoryModal(cases) {
  els.historyList.innerHTML = '';

  if (!cases || cases.length === 0) {
    els.historyList.innerHTML = '<p class="empty-state">No past cases found.</p>';
  } else {
    cases.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.dataset.caseId = c.id;

      const severityText = escapeHtml(c.severity || '');
      const severity = c.severity
        ? `<span class="severity-badge severity-${escapeHtml(c.severity)}" style="font-size:0.7rem;padding:1px 6px;">${severityText}</span>`
        : '';

      item.innerHTML = `
        <div class="history-item-meta">
          <div class="history-item-title">${escapeHtml(c.title)}</div>
          <div class="history-item-date">${formatDate(c.created_at)} ${severity}</div>
        </div>
      `;
      els.historyList.appendChild(item);
    });
  }

  els.modalHistory.classList.remove('hidden');
}

/** Hide history modal */
export function hideHistoryModal() {
  els.modalHistory.classList.add('hidden');
}

/** Reset UI to initial state */
export function resetUI() {
  // Show input
  showSection('input');
  hideSection('loading');
  hideSection('result');
  hideSection('chat');
  hideSection('report');

  // Reset input
  els.inputLogs.value = '';
  els.inputLogs.style.minHeight = '';
  els.inputLogs.disabled = false;
  els.btnAnalyze.disabled = true;
  updateCharCount(0, 15000);

  // Clear chat
  els.chatMessages.innerHTML = '';
  els.inputChat.value = '';
  updateChatCount(0);

  // Clear report
  els.reportContent.innerHTML = '';

  // Clear raw output
  els.rawOutputCard.classList.add('hidden');
}

/** Copy text to clipboard */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Get DOM element references for event binding */
export function getElements() {
  return els;
}
