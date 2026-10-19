/**
 * ChroMusic — Service Worker (Manifest V3)
 * ==========================================
 * Handles:
 *  • Extension lifecycle events
 *  • Badge updates
 *  • Optional future: context menu for manual re-scan
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ChroMusic installed — version', chrome.runtime.getManifest().version);

    // Set default storage values
    chrome.storage.local.set({
      chromusic_enabled: true,
      chromusic_autoOpen: false,   // Auto-open panel on detection
      chromusic_theme: 'dark',
    });
  }
});

const SUPPORTED_HOSTS = ['chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com'];
const CONTENT_SCRIPT_FILES = [
  'shared/music-theory.js',
  'shared/schema.js',
  'shared/chord-parser.js',
  'shared/voicing-generator.js',
  'content/components/guitar-fretboard.js',
  'content/components/piano-keyboard.js',
  'content/components/chromusic-panel.js',
  'content/content.js',
];

function isSupportedUrl(url) {
  return !!url && SUPPORTED_HOSTS.some((host) => url.includes(host));
}

async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve({ ok: true, response });
    });
  });
}

// Listen for tab updates to re-inject if needed (SPA navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isSupportedSite = isSupportedUrl(tab.url);

    if (isSupportedSite) {
      // Update badge to show extension is active on this tab
      chrome.action.setBadgeText({ text: '♪', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#9B59B6', tabId });
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'rescan') {
    (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ status: 'no-tab' });
        return;
      }

      if (!isSupportedUrl(tab.url)) {
        sendResponse({ status: 'unavailable', active: false, reason: 'unsupported-page' });
        return;
      }

      const result = await sendMessageToTab(tab.id, { action: 'chromusic-rescan' });
      sendResponse(result.response || {
        status: 'unavailable',
        active: false,
        reason: result.error || 'content-script-unavailable',
      });
    })();
    return true; // async
  }

  if (msg.action === 'getStatus') {
    (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ active: false, reason: 'no-tab' });
        return;
      }

      if (!isSupportedUrl(tab.url)) {
        sendResponse({ active: false, reason: 'unsupported-page' });
        return;
      }

      const result = await sendMessageToTab(tab.id, { action: 'chromusic-status' });
      sendResponse(result.response || {
        active: false,
        reason: result.error || 'content-script-unavailable',
      });
    })();
    return true;
  }
});
