/**
 * GeminiText Popup Script - REDESIGNED
 * 
 * Handles:
 * - Multiple API key management
 * - API key rotation for rate limit management
 * - Settings modal
 * - Command history display
 * - Status indicator
 * - Enhanced notifications with Apple-style design
 * - Loading shimmer animation for text transformations
 */

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsFooterBtn = document.getElementById('settingsFooterBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeysList = document.getElementById('apiKeysList');
const newApiKeyInput = document.getElementById('newApiKeyInput');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');
const extensionEnabledCheckbox = document.getElementById('extensionEnabledCheckbox');
const translationLanguage = document.getElementById('translationLanguage');
const aiModel = document.getElementById('aiModel');
const copyCommandsBtn = document.getElementById('copyCommandsBtn');
const historyList = document.getElementById('historyList');

// Command definitions
const COMMANDS = {
  m: 'Improve',
  r: 'Rephrase',
  f: 'Formal',
  c: 'Casual',
  s: 'Shorten',
  l: 'Lengthen',
  t: 'Translate',
  e: 'Explain'
};

/**
 * Check API key status
 */
async function checkApiKeyStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('apiKeys', (data) => {
      const hasKeys = data.apiKeys && data.apiKeys.length > 0;
      resolve(hasKeys);
    });
  });
}

/**
 * Update status indicator with smooth transitions
 */
async function updateStatus() {
  const hasKeys = await checkApiKeyStatus();
  const isEnabled = await new Promise((resolve) => {
    chrome.storage.sync.get('extensionEnabled', (data) => {
      resolve(data.extensionEnabled !== false);
    });
  });

  // Add fade transition
  statusIndicator.style.opacity = '0.7';
  statusIndicator.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

  setTimeout(() => {
    if (!isEnabled) {
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Extension disabled';
    } else if (hasKeys) {
      statusIndicator.className = 'status-indicator connected';
      statusText.textContent = '✓ Connected';
    } else {
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = '✗ No API keys';
    }
    statusIndicator.style.opacity = '1';
  }, 100);
}

/**
 * Load settings into modal
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ['apiKeys', 'extensionEnabled', 'translationLanguage', 'aiModel'],
      (data) => {
        newApiKeyInput.value = '';
        extensionEnabledCheckbox.checked = data.extensionEnabled !== false;
        translationLanguage.value = data.translationLanguage || 'Spanish';
        aiModel.value = data.aiModel || 'gemini-2.0-flash';
        displayApiKeys(data.apiKeys || []);
        resolve();
      }
    );
  });
}

/**
 * Display API keys list with enhanced styling
 */
function displayApiKeys(keys) {
  if (keys.length === 0) {
    apiKeysList.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); padding: var(--spacing-md); background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 8px; text-align: center;">No API keys added yet</div>';
    return;
  }

  apiKeysList.innerHTML = keys
    .map(
      (key, index) => `
    <div class="api-key-item">
      <span>Key ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 5)}</span>
      <button class="delete-key-btn" data-index="${index}" title="Delete this key">✕</button>
    </div>
  `
    )
    .join('');

  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-key-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      deleteApiKey(index);
    });
  });
}

/**
 * Add new API key with validation
 */
async function addApiKey() {
  const newKey = newApiKeyInput.value.trim();
  if (!newKey) {
    showNotification('Please enter an API key', 'error');
    newApiKeyInput.focus();
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get('apiKeys', (data) => {
      const keys = data.apiKeys || [];
      if (keys.includes(newKey)) {
        showNotification('This API key is already added', 'error');
        resolve();
        return;
      }
      keys.push(newKey);
      chrome.storage.sync.set({ apiKeys: keys }, () => {
        newApiKeyInput.value = '';
        displayApiKeys(keys);
        showNotification('API key added successfully', 'success');
        updateStatus();
        resolve();
      });
    });
  });
}

/**
 * Delete API key with confirmation feedback
 */
async function deleteApiKey(index) {
  return new Promise((resolve) => {
    chrome.storage.sync.get('apiKeys', (data) => {
      const keys = data.apiKeys || [];
      keys.splice(index, 1);
      chrome.storage.sync.set({ apiKeys: keys }, () => {
        displayApiKeys(keys);
        showNotification('API key removed', 'success');
        updateStatus();
        resolve();
      });
    });
  });
}

/**
 * Save settings with validation
 */
async function saveSettings() {
  const settings = {
    extensionEnabled: extensionEnabledCheckbox.checked,
    translationLanguage: translationLanguage.value,
    aiModel: aiModel.value
  };

  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      updateStatus();
      closeSettingsModal();
      showNotification('Settings saved', 'success');
      resolve();
    });
  });
}

/**
 * Open settings modal with smooth animation
 */
async function openSettingsModal() {
  await loadSettings();
  settingsModal.style.display = 'flex';
  settingsModal.style.animation = 'fadeIn 0.2s ease-out';
  // Focus on the new API key input
  setTimeout(() => newApiKeyInput.focus(), 100);
}

/**
 * Close settings modal with smooth animation
 */
function closeSettingsModal() {
  settingsModal.style.animation = 'fadeOut 0.2s ease-out';
  setTimeout(() => {
    settingsModal.style.display = 'none';
  }, 200);
}

/**
 * Load command history
 */
async function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get('commandHistory', (data) => {
      const history = data.commandHistory || [];
      resolve(history);
    });
  });
}

/**
 * Display command history with staggered animation
 */
async function displayHistory() {
  const history = await loadHistory();

  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No recent commands</div>';
    return;
  }

  // Show last 5 commands
  const recentHistory = history.slice(-5).reverse();
  historyList.innerHTML = recentHistory
    .map((item, index) => {
      const commandName = COMMANDS[item.command] || item.command;
      const preview = item.text.substring(0, 30) + (item.text.length > 30 ? '...' : '');
      return `
        <div class="history-item stagger-item" style="animation-delay: ${index * 50}ms;">
          <strong>?${item.command}</strong> on "${preview}"
        </div>
      `;
    })
    .join('');
}

/**
 * Copy command list to clipboard with feedback
 */
function copyCommandsToClipboard() {
  const commandList = Object.entries(COMMANDS)
    .map(([key, name]) => `?${key} - ${name}`)
    .join('\n');

  navigator.clipboard.writeText(commandList).then(() => {
    showNotification('Commands copied to clipboard', 'success');
    // Add visual feedback to button
    copyCommandsBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      copyCommandsBtn.style.transform = 'scale(1)';
    }, 200);
  }).catch(() => {
    showNotification('Failed to copy commands', 'error');
  });
}

/**
 * Show notification with Apple-style design
 * Replaces old inline notification system
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Apply Apple-style colors
  const colors = {
    success: { bg: '#34C759', text: '#ffffff' },
    error: { bg: '#FF3B30', text: '#ffffff' },
    info: { bg: '#007AFF', text: '#ffffff' },
    warning: { bg: '#FF9500', text: '#ffffff' }
  };
  
  const color = colors[type] || colors.info;
  
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${color.bg};
    color: ${color.text};
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    letter-spacing: -0.2px;
  `;

  document.body.appendChild(notification);

  // Auto-remove after 2.5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

/**
 * Add animation styles for notifications
 */
function injectAnimationStyles() {
  if (document.getElementById('popup-animations')) return;

  const style = document.createElement('style');
  style.id = 'popup-animations';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    @keyframes slideInUp {
      from {
        transform: translateY(16px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutDown {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(16px);
        opacity: 0;
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize popup with staggered animations
 */
document.addEventListener('DOMContentLoaded', async () => {
  injectAnimationStyles();
  
  // Animate sections on load
  const sections = document.querySelectorAll('.status-section, .commands-section, .history-section');
  sections.forEach((section, index) => {
    section.style.animation = `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 50}ms backwards`;
  });
  
  updateStatus();
  displayHistory();
  
  // Migrate old format if needed
  chrome.storage.sync.get(['geminiApiKey', 'apiKeys'], (data) => {
    if (data.geminiApiKey && !data.apiKeys) {
      chrome.storage.sync.set({ apiKeys: [data.geminiApiKey] });
      chrome.storage.sync.remove('geminiApiKey');
      updateStatus();
    }
  });
});

/**
 * Event Listeners
 */
settingsBtn.addEventListener('click', openSettingsModal);
settingsFooterBtn.addEventListener('click', openSettingsModal);
closeSettingsBtn.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);
saveSettingsBtn.addEventListener('click', saveSettings);
copyCommandsBtn.addEventListener('click', copyCommandsToClipboard);

// Add API key button
addApiKeyBtn.addEventListener('click', addApiKey);

// Allow Enter key to add API key
newApiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addApiKey();
  }
});

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
});

// Update status every 2 seconds
setInterval(updateStatus, 2000);
