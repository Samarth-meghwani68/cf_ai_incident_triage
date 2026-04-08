/**
 * Utility functions for the frontend.
 */

/** Generate a UUID v4 for session IDs */
export function generateSessionId() {
  return crypto.randomUUID();
}

/** Get or create session ID from sessionStorage */
export function getSessionId() {
  let id = sessionStorage.getItem('currentSessionId');
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem('currentSessionId', id);
  }
  return id;
}

/** Create a new session ID */
export function newSessionId() {
  const id = generateSessionId();
  sessionStorage.setItem('currentSessionId', id);
  return id;
}

/** Escape HTML to prevent XSS */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Format a date string for display */
export function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString || '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString || '';
  }
}

/**
 * Safe markdown-to-HTML renderer for reports.
 * Escapes HTML first, then converts markdown syntax to safe HTML tags.
 * This is safe because we escape ALL HTML before applying transforms,
 * so user-injected HTML tags become escaped entities before any innerHTML assignment.
 */
export function renderMarkdown(text) {
  if (!text) return '';

  // Escape HTML first — this is the XSS prevention step
  let html = escapeHtml(text);

  // Code blocks (must come before single-line transforms)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Headers (order matters: h3 before h2 before h1)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists — collect consecutive lines
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Paragraph breaks
  html = html.replace(/\n\n/g, '</p><p>');
  // Single line breaks
  html = html.replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

/** Debounce function */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
