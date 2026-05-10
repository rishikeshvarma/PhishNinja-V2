/**
 * ExtensionSync Utility
 * Handles communication between the PhishNinja Web Dashboard and the Chrome Extension.
 * Supports multiple extension IDs for broadcast sync.
 */

// Pull Extension IDs from environment variables (comma-separated string)
const EXTENSION_IDS = (
  import.meta.env.VITE_EXTENSION_IDS || 
  import.meta.env.VITE_EXTENSION_ID || 
  ''
).split(',').map(id => id.trim()).filter(id => id);

/**
 * Checks if any PhishNinja extension is installed and reachable.
 * @returns {Promise<boolean>}
 */
export const checkExtensionConnection = () => {
  return new Promise(async (resolve) => {
    if (typeof window === 'undefined' || !window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
      return resolve(false);
    }

    if (EXTENSION_IDS.length === 0) {
      console.warn('[ExtensionSync] No Extension IDs configured in VITE_EXTENSION_IDS');
      return resolve(false);
    }

    let connected = false;
    const checks = EXTENSION_IDS.map(id => {
      return new Promise((res) => {
        try {
          window.chrome.runtime.sendMessage(id, { type: 'PING' }, (response) => {
            if (window.chrome.runtime.lastError) {
              // Silent fail for each ID
              res(false);
            } else if (response && response.success) {
              connected = true;
              res(true);
            } else {
              res(false);
            }
          });
        } catch (err) {
          res(false);
        }
      });
    });

    await Promise.all(checks);
    resolve(connected);
  });
};

/**
 * Syncs authentication state with all configured extensions.
 * @param {Object} user - User object
 * @param {string} token - Auth token
 */
export const syncWithExtension = (user, token) => {
  if (typeof window === 'undefined' || !window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
    return;
  }

  const authToken = token || user?.token || null;
  const userData = user || null;
  const apiBaseUrl = window.location.origin + '/api';

  EXTENSION_IDS.forEach(id => {
    try {
      window.chrome.runtime.sendMessage(id, {
        type: 'SYNC_AUTH',
        user: userData,
        token: authToken,
        dashboardUrl: window.location.origin,
        apiBaseUrl: apiBaseUrl
      }, (response) => {
        // Silent fail: handle chrome.runtime.lastError silently
        if (window.chrome.runtime.lastError) {
          // No log here to keep it clean
        } else {
          console.log(`[ExtensionSync] Synced with extension: ${id}`);
        }
      });
    } catch (err) {
      // Silent fail
    }
  });
};

/**
 * Syncs settings with all configured extensions.
 * @param {Array} allowlist - List of allowed URLs
 * @param {Array} bin - List of blocked URLs
 */
export const syncSettingsWithExtension = (allowlist, bin) => {
  if (typeof window === 'undefined' || !window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
    return;
  }

  EXTENSION_IDS.forEach(id => {
    try {
      window.chrome.runtime.sendMessage(id, {
        type: 'SYNC_SETTINGS',
        allowlist: allowlist || [],
        bin: bin || []
      }, (response) => {
        if (window.chrome.runtime.lastError) {
          // Silent fail
        } else {
          console.log(`[ExtensionSync] Settings synced with extension: ${id}`);
        }
      });
    } catch (err) {
      // Silent fail
    }
  });
};
