/**
 * ExtensionSync Utility
 * Handles communication between the PhishNinja Web Dashboard and the Chrome Extension.
 * Supports multiple extension IDs for broadcast sync.
 */

// Pull Extension IDs from environment variables (comma-separated string)
const EXTENSION_IDS = Array.from(new Set((
  import.meta.env.VITE_EXTENSION_IDS || 
  import.meta.env.VITE_EXTENSION_ID || 
  ''
).split(',')
  .map(id => id.trim())
  .filter(id => id && id.length > 10))); // Filter out garbage and short strings

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
                console.log(`[ExtensionSync] Active extension identified: ${id}`);
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

    // Wait for all checks to complete
    await Promise.all(checks);
    resolve(!!foundId);
  });
};

/**
 * Syncs authentication state with the active extension or all configured extensions.
 * @param {Object} user - User object from AuthContext
 */
export const syncWithExtension = (user) => {
  if (typeof window === 'undefined' || !window.chrome || !window.chrome.runtime || !window.chrome.runtime.sendMessage) {
    return;
  }

  // Robust payload mapping
  const authToken = user?.jwt || user?.token || null;
  const userProfile = user?.user || user || null;

  if (!authToken) {
    console.warn('[ExtensionSync] No auth token found for sync. Sending logout signal.');
  }

  // Explicit Identity Payload as requested
  const payload = {
    type: 'SYNC_AUTH',
    token: authToken,
    userProfile: userProfile,
    dashboardUrl: window.location.origin,
    apiBaseUrl: import.meta.env.VITE_API_URL || (window.location.origin + '/api')
  };

  console.log(`[ExtensionSync] Force-pushing auth sync to ${EXTENSION_IDS.length} extensions...`);

  // PROACTIVE SYNC: Loop through all IDs and Force-Push
  EXTENSION_IDS.forEach(id => {
    try {
      window.chrome.runtime.sendMessage(id, payload, (response) => {
        if (!window.chrome.runtime.lastError && response?.success) {
          if (!activeExtensionId) {
            activeExtensionId = id;
            localStorage.setItem('phishninja_active_extension_id', id);
          }
          console.log(`[ExtensionSync] Sync successful with extension: ${id}`);
        }
      });
    } catch (e) {
      // Silent fail for non-existent IDs
    }
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
