/**
 * Main application controller.
 * Manages state transitions and wires up event handlers.
 */
import * as api from './api.js';
import * as ui from './ui.js';
import { getSessionId, newSessionId, debounce } from './utils.js';

const MAX_INPUT_LENGTH = 15000;
let chatMessageCount = 0;
let isProcessing = false;

/** Initialize the app */
function init() {
  const els = ui.getElements();

  // ─── Input handling ──────────────────────────────────────────
  els.inputLogs.addEventListener('input', debounce(() => {
    const len = els.inputLogs.value.length;
    ui.updateCharCount(len, MAX_INPUT_LENGTH);
    ui.setAnalyzeEnabled(len >= 10 && len <= MAX_INPUT_LENGTH);
  }, 50));

  // ─── Analyze button ──────────────────────────────────────────
  els.btnAnalyze.addEventListener('click', handleAnalyze);

  // Allow Ctrl+Enter to submit
  els.inputLogs.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !els.btnAnalyze.disabled) {
      handleAnalyze();
    }
  });

  // ─── Chat ────────────────────────────────────────────────────
  els.btnSend.addEventListener('click', handleChat);
  els.inputChat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !els.btnSend.disabled) {
      e.preventDefault();
      handleChat();
    }
  });
  els.inputChat.addEventListener('input', () => {
    ui.setSendEnabled(els.inputChat.value.trim().length > 0 && !isProcessing);
  });

  // ─── Report ──────────────────────────────────────────────────
  els.btnReport.addEventListener('click', handleReport);

  // ─── Copy report ─────────────────────────────────────────────
  els.btnCopyReport.addEventListener('click', async () => {
    const text = ui.getReportRawText();
    if (!text) {
      ui.showError('No report to copy.');
      return;
    }
    const success = await ui.copyToClipboard(text);
    const btnText = els.btnCopyReport.querySelector('span');
    if (success) {
      btnText.textContent = 'Copied!';
      setTimeout(() => { btnText.textContent = 'Copy'; }, 2000);
    } else {
      ui.showError('Failed to copy. Please select and copy manually.');
    }
  });

  // ─── New session ─────────────────────────────────────────────
  els.btnNewSession.addEventListener('click', () => {
    newSessionId();
    chatMessageCount = 0;
    isProcessing = false;
    ui.resetUI();
  });

  // ─── History ─────────────────────────────────────────────────
  els.btnHistory.addEventListener('click', handleHistory);
  els.btnCloseHistory.addEventListener('click', () => ui.hideHistoryModal());

  // Close modal on backdrop click
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => ui.hideHistoryModal());
  }

  // Initial char count
  ui.updateCharCount(0, MAX_INPUT_LENGTH);
}

/** Handle analyze button click */
async function handleAnalyze() {
  if (isProcessing) return;
  isProcessing = true;

  const sessionId = getSessionId();
  const input = ui.getElements().inputLogs.value.trim();

  ui.showLoading();

  try {
    const result = await api.submitTriage(sessionId, input);
    ui.showTriageResult(result.result, result.parsedSuccessfully, result.rawOutput);
    ui.setReportEnabled(true);
    chatMessageCount = 0;
    ui.updateChatCount(chatMessageCount);
  } catch (error) {
    ui.showError(error.message || 'Analysis failed. Please try again.');
    // Show input section again
    ui.hideSection('loading');
    ui.showSection('input');
    ui.setAnalyzeEnabled(true);
  } finally {
    isProcessing = false;
  }
}

/** Handle chat send */
async function handleChat() {
  if (isProcessing) return;

  const els = ui.getElements();
  const message = els.inputChat.value.trim();
  if (!message) return;

  isProcessing = true;
  ui.setSendEnabled(false);

  const sessionId = getSessionId();

  // Show user message immediately
  ui.addChatMessage('user', message);
  els.inputChat.value = '';
  chatMessageCount++;
  ui.updateChatCount(chatMessageCount);

  try {
    const result = await api.sendChatMessage(sessionId, message);
    ui.addChatMessage('assistant', result.reply);
    chatMessageCount++;
    ui.updateChatCount(chatMessageCount);
  } catch (error) {
    ui.showError(error.message || 'Chat failed. Please try again.');
  } finally {
    isProcessing = false;
    ui.setSendEnabled(els.inputChat.value.trim().length > 0);
  }
}

/** Handle report generation */
async function handleReport() {
  if (isProcessing) return;
  isProcessing = true;
  ui.setReportEnabled(false);

  const sessionId = getSessionId();
  const btnText = ui.getElements().btnReport.querySelector('span');
  btnText.textContent = 'Generating...';

  try {
    const result = await api.generateReport(sessionId);
    ui.showReport(result.report);
  } catch (error) {
    ui.showError(error.message || 'Report generation failed. Please try again.');
    ui.setReportEnabled(true);
  } finally {
    isProcessing = false;
    btnText.textContent = 'Generate Incident Report';
  }
}

/** Handle history button click */
async function handleHistory() {
  try {
    const cases = await api.listCases();
    ui.showHistoryModal(cases);
  } catch (error) {
    ui.showError(error.message || 'Failed to load case history.');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
