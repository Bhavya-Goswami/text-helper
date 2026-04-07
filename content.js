/**
 * GeminiText Content Script - REDESIGNED
 * 
 * Detects command triggers in ANY text-input-like element.
 * Handles: input, textarea, contenteditable, role="textbox", and rich text editors.
 * Includes ULTRA-DRAMATIC shimmer loading animation for visual feedback.
 */

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

// Global state
let isProcessing = false;
let lastActiveElement = null;

/**
 * Check if the extension context is still valid
 */
function isContextValid() {
  return !!chrome.runtime && !!chrome.runtime.id;
}

/**
 * Get text from element regardless of type
 */
function getElementText(element) {
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return element.value;
  } else {
    // For rich editors, innerText is usually better than textContent
    return element.innerText || element.textContent || "";
  }
}

/**
 * Set text to element regardless of type
 */
function setElementText(element, text) {
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.value = text;
  } else {
    // For contenteditable, try to preserve some structure if possible, 
    // but for these commands, plain text replacement is usually safer.
    element.innerText = text;
  }
  
  // Trigger events for frameworks (like React/Angular/Vue)
  const events = ['input', 'change', 'blur', 'keyup'];
  events.forEach(eventType => {
    element.dispatchEvent(new Event(eventType, { bubbles: true }));
  });
}

/**
 * Detect command trigger pattern: ?[a-z]
 */
function detectCommandTrigger(text) {
  // Match ?[a-z] at the end of text, possibly followed by a space or newline
  const match = text.match(/\?([a-z])[\s\n]*$/);
  if (!match) return null;

  const command = match[1];
  if (!COMMANDS[command]) return null;

  // Extract text before the trigger
  const textBeforeTrigger = text.replace(/\?([a-z])[\s\n]*$/, '').trim();
  if (!textBeforeTrigger) return null;

  return {
    command,
    text: textBeforeTrigger
  };
}

/**
 * Send text to Gemini API via background script
 */
async function processTextWithGemini(command, text) {
  if (!isContextValid()) {
    throw new Error('Extension updated. Please refresh the page to continue.');
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'processText',
          command,
          text
        },
        (response) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            if (errorMsg.includes('context invalidated')) {
              reject(new Error('Extension updated. Please refresh the page.'));
            } else {
              reject(new Error(errorMsg));
            }
          } else if (response && response.error) {
            reject(new Error(response.error));
          } else if (response && response.result) {
            resolve(response.result);
          } else {
            reject(new Error('Invalid response from background script'));
          }
        }
      );
    } catch (e) {
      if (e.message.includes('context invalidated')) {
        reject(new Error('Extension updated. Please refresh the page.'));
      } else {
        reject(e);
      }
    }
  });
}

/**
 * Inject ULTRA-DRAMATIC shimmer animation keyframes if not already present
 */
function injectShimmerAnimation() {
  if (document.getElementById('gemini-shimmer-styles')) return;

  const style = document.createElement('style');
  style.id = 'gemini-shimmer-styles';
  style.textContent = `
    @keyframes gemini-shimmer-ultra {
      0% {
        background-position: -300% 0;
      }
      50% {
        background-position: 0% 0;
      }
      100% {
        background-position: 300% 0;
      }
    }

    @keyframes gemini-pulse-ultra {
      0%, 100% {
        opacity: 1;
        text-shadow: 0 0 4px rgba(0, 122, 255, 0.4), 0 0 12px rgba(0, 122, 255, 0.6), 0 0 20px rgba(0, 122, 255, 0.4);
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        text-shadow: 0 0 8px rgba(0, 122, 255, 0.8), 0 0 20px rgba(0, 122, 255, 0.9), 0 0 32px rgba(0, 122, 255, 0.6);
        transform: scale(1.02);
      }
    }

    @keyframes gemini-background-pulse-ultra {
      0%, 100% {
        background-color: rgba(0, 122, 255, 0.1);
        box-shadow: 0 0 8px rgba(0, 122, 255, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.2);
      }
      50% {
        background-color: rgba(0, 122, 255, 0.25);
        box-shadow: 0 0 20px rgba(0, 122, 255, 0.6), inset 0 0 12px rgba(255, 255, 255, 0.4);
      }
    }

    @keyframes gemini-glow-pulse {
      0%, 100% {
        box-shadow: 0 0 12px rgba(0, 122, 255, 0.4), 0 0 24px rgba(0, 122, 255, 0.2);
      }
      50% {
        box-shadow: 0 0 24px rgba(0, 122, 255, 0.8), 0 0 48px rgba(0, 122, 255, 0.4), 0 0 60px rgba(0, 122, 255, 0.2);
      }
    }

    @keyframes gemini-float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes gemini-spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .gemini-loading-state {
      animation: gemini-pulse-ultra 0.8s ease-in-out infinite !important;
      color: #0051D5;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .gemini-shimmer-text {
      display: inline-block;
      background: linear-gradient(
        90deg,
        rgba(0, 122, 255, 0.05) 0%,
        rgba(0, 122, 255, 0.3) 15%,
        rgba(255, 255, 255, 0.95) 50%,
        rgba(0, 122, 255, 0.3) 85%,
        rgba(0, 122, 255, 0.05) 100%
      );
      background-size: 300% 100%;
      animation: gemini-shimmer-ultra 0.8s ease-in-out infinite, gemini-background-pulse-ultra 0.8s ease-in-out infinite;
      border-radius: 8px;
      padding: 4px 8px;
      color: #0051D5;
      font-weight: 700;
      box-shadow: 0 0 16px rgba(0, 122, 255, 0.5), inset 0 0 12px rgba(255, 255, 255, 0.4);
      text-shadow: 0 0 8px rgba(0, 122, 255, 0.6), 0 0 16px rgba(0, 122, 255, 0.3);
      letter-spacing: 0.5px;
    }

    .gemini-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 2147483646;
    }

    .gemini-loading-indicator {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #007AFF 0%, #0051D5 50%, #003D99 100%);
      color: white;
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      z-index: 2147483647;
      box-shadow: 0 0 20px rgba(0, 122, 255, 0.5), 0 8px 32px rgba(0, 122, 255, 0.3);
      animation: gemini-shimmer-ultra 0.8s ease-in-out infinite, gemini-float 2s ease-in-out infinite;
      letter-spacing: 0.3px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .gemini-loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: gemini-spin 1s linear infinite;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create an ULTRA-DRAMATIC shimmer overlay specifically for the changed text
 */
function createShimmerOverlay(element, originalText) {
  injectShimmerAnimation();

  // Show dramatic loading indicator at bottom
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'gemini-loading-indicator';
  loadingIndicator.innerHTML = '<span class="gemini-loading-spinner"></span>✨ Transforming text...';
  document.body.appendChild(loadingIndicator);

  // For input/textarea, we'll apply shimmer effect directly to element
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.classList.add('gemini-loading-state');
    return () => {
      element.classList.remove('gemini-loading-state');
      try {
        loadingIndicator.remove();
      } catch (e) {}
    };
  }

  // For contenteditable elements, create a DRAMATIC shimmer wrapper
  const shimmerWrapper = document.createElement('span');
  shimmerWrapper.className = 'gemini-shimmer-text';
  shimmerWrapper.textContent = originalText;

  // Replace the original text with shimmer wrapper
  const originalContent = element.innerHTML;
  element.innerHTML = '';
  element.appendChild(shimmerWrapper);

  // Return cleanup function
  return () => {
    element.innerHTML = originalContent;
    try {
      loadingIndicator.remove();
    } catch (e) {}
  };
}

/**
 * Animate text with ULTRA-DRAMATIC shimmer effect while processing
 */
async function animateShimmerLoading(element, originalText) {
  if (!element) return () => {};

  // Create ULTRA-DRAMATIC shimmer effect on the text being changed
  const cleanupAnimation = createShimmerOverlay(element, originalText);

  // Return a function to clean up
  return cleanupAnimation;
}

/**
 * Handle the processing logic with ULTRA-DRAMATIC loading animation
 */
async function handleTrigger(element) {
  if (isProcessing || !element) return;

  const currentText = getElementText(element);
  const trigger = detectCommandTrigger(currentText);

  if (!trigger) return;

  isProcessing = true;
  lastActiveElement = element;
  
  // Store original cursor and text
  const originalCursor = element.style.cursor;
  const originalText = trigger.text;
  
  // Visual feedback - start ULTRA-DRAMATIC shimmer animation
  element.style.cursor = 'wait';
  const cleanupAnimation = await animateShimmerLoading(element, originalText);

  try {
    const result = await processTextWithGemini(trigger.command, trigger.text);
    
    // Clean up animation
    cleanupAnimation();
    
    // Set new text
    setElementText(element, result);
    
    // Show success notification
    showNotification(`✓ ${COMMANDS[trigger.command]} completed`, 'success');
  } catch (error) {
    console.error('GeminiText Error:', error);
    cleanupAnimation();
    showNotification(`✗ ${error.message}`, 'error');
  } finally {
    element.style.cursor = originalCursor;
    isProcessing = false;
  }
}

/**
 * Global keydown listener to catch triggers
 */
document.addEventListener('keydown', (e) => {
  // We look for Space or Enter as the final trigger after typing ?x
  if (e.key === ' ' || e.key === 'Enter') {
    const element = e.target;
    
    // Check if it's an input-like element
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
    const isContentEditable = element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true' || element.role === 'textbox';
    
    // Some rich text editors use specific classes or attributes
    const isRichEditor = element.classList.contains('ql-editor') || // Quill
                         element.classList.contains('ProseMirror') || // Tiptap/ProseMirror
                         element.classList.contains('cke_editable') || // CKEditor
                         element.classList.contains('mce-content-body'); // TinyMCE

    if (isInput || isContentEditable || isRichEditor) {
      // Use a small timeout to let the character be inserted into the DOM/value
      setTimeout(() => {
        handleTrigger(element);
      }, 50);
    }
  }
}, true); // Use capture phase to ensure we catch it

/**
 * Show notification to user with Apple-style design
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  
  const bgColor = type === 'success' ? '#34C759' : type === 'error' ? '#FF3B30' : '#007AFF';
  const textColor = '#FFFFFF';
  
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: ${textColor};
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-size: 13px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    transform: translateY(0);
    opacity: 1;
    letter-spacing: -0.2px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(8px)';
    setTimeout(() => {
      try {
        notification.remove();
      } catch (e) {
        // Element already removed
      }
    }, 300);
  }, 3000);
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    showNotification(request.message, request.type);
    sendResponse({ received: true });
  }
});

console.log('GeminiText REDESIGNED: Content script loaded with ULTRA-DRAMATIC shimmer loading animation.');
