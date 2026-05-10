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

// Local cache for the identified active extension
let activeExtensionId = localStorage.getItem('phishninja_active_extension_id') || null;

/**
 * Checks if any PhishNinja extension is installed and reachable.
 * Identifies the first responding ID as the 'Active Extension'.
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

    // If we have an active ID, check it first for speed
    if (activeExtensionId) {
      const isStillActive = await new Promise((res) => {
        try {
          window.chrome.runtime.sendMessage(activeExtensionId, { type: 'HANDSHAKE' }, (response) => {
            if (window.chrome.runtime.lastError || !response || response.status !== 'PONG') {
              res(false);
            } else {
              res(true);
            }
          });
        } catch (err) {
          res(false);
        }
      });

      if (isStillActive) {
        return resolve(true);
      }
      
      // If it failed, clear it and fall back to broadcast
      activeExtensionId = null;
      localStorage.removeItem('phishninja_active_extension_id');
    }

    // Broadcast Handshake to find the active one
    let foundId = null;
    const checks = EXTENSION_IDS.map(id => {
      return new Promise((res) => {
        try {
          window.chrome.runtime.sendMessage(id, { type: 'HANDSHAKE' }, (response) => {
            if (!window.chrome.runtime.lastError && response && response.status === 'PONG') {
              if (!foundId) {
                foundId = id;
                activeExtensionId = id;
                localStorage.setItem('phishninja_active_extension_id', id);
                console.log(`[ExtensionSync] Active extension found: ${id}`);
              }
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

    // Wait for all checks to complete (or could use Promise.any if we want to be faster)
    await Promise.all(checks);
    resolve(!!foundId);
  });
};

/**
 * Syncs authentication state with the active extension or all configured extensions.
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

  const payload = {
    type: 'SYNC_AUTH',
    user: userData,
    token: authToken,
    dashboardUrl: window.location.origin,
    apiBaseUrl: apiBaseUrl
  };

  // If we have an active ID, sync only with it
  if (activeExtensionId) {
    try {
      window.chrome.runtime.sendMessage(activeExtensionId, payload, () => {
        if (window.chrome.runtime.lastError) {
          activeExtensionId = null; // Reset if it fails
        }
      });
      return;
    } catch (e) {}
  }

  // Fallback to broadcast if no active ID
  EXTENSION_IDS.forEach(id => {
    try {
      window.chrome.runtime.sendMessage(id, payload, () => {
        if (!window.chrome.runtime.lastError) {
          activeExtensionId = id; // Identify it during sync if possible
        }
      });
    } catch (err) {}
  });
};

/**
 * Syncs settings with the active extension or all configured extensions.
 * @param {Array} allowlist - List of allowed URLs
 * @param {Array} bin - List of blocked URLs
 */
export const syncSettingsWithExtension = (allowlist, bin) => {
  if (typeof window === 'undefined' || !window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
    return;
  }

  const payload = {
    type: 'SYNC_SETTINGS',
    allowlist: allowlist || [],
    bin: bin || []
  };

  if (activeExtensionId) {
    try {
      window.chrome.runtime.sendMessage(activeExtensionId, payload, () => {
        if (window.chrome.runtime.lastError) activeExtensionId = null;
      });
      return;
    } catch (e) {}
  }

  EXTENSION_IDS.forEach(id => {
    try {
      window.chrome.runtime.sendMessage(id, payload, () => {
        if (!window.chrome.runtime.lastError) activeExtensionId = id;
      });
    } catch (err) {}
  });
};
