/**
 * GeminiText Background Service Worker
 * 
 * Handles:
 * - API key storage and retrieval
 * - Gemini API calls (secure, no data logging)
 * - Message passing from content script
 * - Context menu integration
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODEL = 'gemini-2.0-flash';

// Command definitions (duplicated for reference)
const COMMANDS = {
  m: 'Improve this text for clarity, grammar, and impact. Preserve meaning. Return only improved text, nothing else.',
  r: 'Rephrase this text differently while keeping the core message. Return only rephrased text, nothing else.',
  f: 'Convert to professional formal tone suitable for business. Return only formal version, nothing else.',
  c: 'Convert to casual conversational tone. Return only casual version, nothing else.',
  s: 'Shorten by 40% keeping key points. Return only shortened text, nothing else.',
  l: 'Expand with relevant details and examples. Return only expanded text, nothing else.',
  t: 'Translate to [TARGET_LANG]. Return only translation, nothing else.',
  e: 'Explain simply for general audience. Return only explanation, nothing else.'
};

/**
 * Get next API key from rotation pool
 */
async function getNextApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKeys', 'currentKeyIndex'], (data) => {
      const apiKeys = data.apiKeys || [];
      let currentIndex = data.currentKeyIndex || 0;

      if (apiKeys.length === 0) {
        resolve('');
        return;
      }

      // Rotate to next key
      currentIndex = (currentIndex + 1) % apiKeys.length;
      chrome.storage.sync.set({ currentKeyIndex: currentIndex });

      resolve(apiKeys[currentIndex]);
    });
  });
}

/**
 * Get current API key without rotation
 */
async function getCurrentApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKeys', 'currentKeyIndex'], (data) => {
      const apiKeys = data.apiKeys || [];
      const currentIndex = data.currentKeyIndex || 0;

      if (apiKeys.length === 0) {
        resolve('');
        return;
      }

      resolve(apiKeys[Math.min(currentIndex, apiKeys.length - 1)]);
    });
  });
}

/**
 * Get all API keys
 */
async function getAllApiKeys() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('apiKeys', (data) => {
      resolve(data.apiKeys || []);
    });
  });
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(apiKey, systemPrompt, userText) {
  if (!apiKey) {
    throw new Error('API key not configured. Please set it in extension settings.');
  }

  // Get selected model from storage
  const modelData = await new Promise((resolve) => {
    chrome.storage.sync.get('aiModel', (data) => {
      resolve(data.aiModel || DEFAULT_MODEL);
    });
  });

  const apiEndpoint = `${GEMINI_API_BASE_URL}${modelData}:generateContent`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: userText
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: systemPrompt
        }
      ]
    }
  };

  const response = await fetch(`${apiEndpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract text from response
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    const text = data.candidates[0].content.parts.map(p => p.text).join('');
    return text.trim();
  }

  throw new Error('Invalid API response format');
}

/**
 * Handle message from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processText') {
    handleProcessText(request, sendResponse);
    return true; // Keep channel open for async response
  }
  if (request.action === 'getApiKeyCount') {
    getAllApiKeys().then((keys) => {
      sendResponse({ count: keys.length });
    });
    return true;
  }
});

/**
 * Process text request with API key rotation
 */
async function handleProcessText(request, sendResponse) {
  try {
    const { command, text } = request;

    if (!COMMANDS[command]) {
      sendResponse({ error: `Unknown command: ${command}` });
      return;
    }

    // Get next API key for rotation
    const apiKey = await getNextApiKey();
    let systemPrompt = COMMANDS[command];
    
    // Handle translation language
    if (command === 't') {
      const settings = await new Promise((resolve) => {
        chrome.storage.sync.get('translationLanguage', (data) => {
          resolve(data.translationLanguage || 'Spanish');
        });
      });
      systemPrompt = systemPrompt.replace('[TARGET_LANG]', settings);
    }
    
    const result = await callGeminiAPI(apiKey, systemPrompt, text);

    sendResponse({ result });
  } catch (error) {
    console.error('GeminiText API Error:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Create context menu for selected text
 */
chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu
  chrome.contextMenus.create({
    id: 'gemini-text-parent',
    title: 'GeminiText',
    contexts: ['selection']
  });

  // Create command submenus
  Object.entries(COMMANDS).forEach(([key, prompt]) => {
    const commandName = {
      m: 'Improve',
      r: 'Rephrase',
      f: 'Formal',
      c: 'Casual',
      s: 'Shorten',
      l: 'Lengthen',
      t: 'Translate',
      e: 'Explain'
    }[key];

    chrome.contextMenus.create({
      id: `gemini-${key}`,
      parentId: 'gemini-text-parent',
      title: commandName,
      contexts: ['selection']
    });
  });
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith('gemini-')) return;

  const command = info.menuItemId.replace('gemini-', '');
  const selectedText = info.selectionText;

  try {
    const apiKey = await getNextApiKey();
    let systemPrompt = COMMANDS[command];
    
    // Handle translation language
    if (command === 't') {
      const settings = await new Promise((resolve) => {
        chrome.storage.sync.get('translationLanguage', (data) => {
          resolve(data.translationLanguage || 'Spanish');
        });
      });
      systemPrompt = systemPrompt.replace('[TARGET_LANG]', settings);
    }
    
    const result = await callGeminiAPI(apiKey, systemPrompt, selectedText);

    // Copy result to clipboard
    await navigator.clipboard.writeText(result);

    // Show notification via content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: `✓ Result copied to clipboard`,
      type: 'success'
    }).catch(() => {
      // Notification failed, but result is in clipboard
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNotification',
      message: `✗ Error: ${error.message}`,
      type: 'error'
    }).catch(() => {
      // Notification failed
    });
  }
});

/**
 * Handle notification requests from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    // Content script handles notifications directly
    sendResponse({ received: true });
  }
});

/**
 * Migrate old single API key to new multiple keys format
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['geminiApiKey', 'apiKeys'], (data) => {
    // If old format exists and new format doesn't, migrate
    if (data.geminiApiKey && !data.apiKeys) {
      chrome.storage.sync.set({
        apiKeys: [data.geminiApiKey],
        currentKeyIndex: 0
      });
      // Remove old format
      chrome.storage.sync.remove('geminiApiKey');
    }
  });
});
