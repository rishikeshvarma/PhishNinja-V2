/**
 * ExtensionSync Utility
 * Handles communication between the PhishNinja Web Dashboard and the Chrome Extension.
 */

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

/**
 * Checks if the PhishNinja extension is installed and reachable.
 * @returns {Promise<boolean>}
 */
export const checkExtensionConnection = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
      try {
        // Send a ping message to the extension
        window.chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (response) => {
          if (window.chrome.runtime.lastError) {
            // Extension not found or not responding
            console.warn('[ExtensionSync] Extension not found or lastError:', window.chrome.runtime.lastError.message);
            resolve(false);
          } else if (response && response.success) {
            // Extension responded successfully
            console.log('[ExtensionSync] Extension handshake successful:', response.version);
            resolve(true);
          } else {
            console.warn('[ExtensionSync] Extension responded but failed handshake:', response);
            resolve(false);
          }
        });
      } catch (err) {
        console.error('Error checking extension connection:', err);
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
};

export const syncWithExtension = (user, token) => {
  if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
    const authToken = token || user?.token || null;
    const userData = user || null;
    
    console.log(`[ExtensionSync] Attempting sync with ID: ${EXTENSION_ID}`, {
      type: 'SYNC_AUTH',
      user: userData ? { ...userData, token: '***' } : null,
      hasToken: !!authToken
    });

    try {
      const apiBaseUrl = window.location.origin + '/api';
      
      window.chrome.runtime.sendMessage(EXTENSION_ID, {
        type: 'SYNC_AUTH',
        user: userData,
        token: authToken,
        dashboardUrl: window.location.origin,
        apiBaseUrl: apiBaseUrl
      }, (response) => {
        if (window.chrome.runtime.lastError) {
          console.warn('[ExtensionSync] Extension sync failed:', window.chrome.runtime.lastError.message);
          console.warn('[ExtensionSync] Verify VITE_EXTENSION_ID matches your local extension ID in chrome://extensions');
        } else {
          console.log('[ExtensionSync] Successfully synced with extension:', response);
        }
      });
    } catch (err) {
      console.error('[ExtensionSync] Fatal error during sync:', err);
    }
  } else {
    console.warn('[ExtensionSync] Chrome extension API not available or window not defined.');
  }
};
export const syncSettingsWithExtension = (allowlist, bin) => {
  if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
    try {
      window.chrome.runtime.sendMessage(EXTENSION_ID, {
        type: 'SYNC_SETTINGS',
        allowlist: allowlist || [],
        bin: bin || []
      }, (response) => {
        if (window.chrome.runtime.lastError) {
          console.warn('[ExtensionSync] Settings sync failed:', window.chrome.runtime.lastError.message);
        } else {
          console.log('[ExtensionSync] Settings synced with extension:', response);
        }
      });
    } catch (err) {
      console.error('[ExtensionSync] Error during settings sync:', err);
    }
  }
};
