import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { googleLogout } from '@react-oauth/google';
import { syncWithExtension, checkExtensionConnection } from '../utils/extensionSync';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [extensionConnected, setExtensionConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState(0);

  const signalActivity = () => {
    setLastActivity(Date.now());
    setExtensionConnected(true);
  };

  useEffect(() => {
    // Check if user is stored in local storage
    const savedUser = localStorage.getItem('phishninja_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Sync with extension on load if user exists
        syncWithExtension(parsedUser);
      } catch (e) {
        localStorage.removeItem('phishninja_user');
      }
    }
    setLoading(false);

    // Extension connection check
    const verifyConnection = async () => {
      try {
        const isConnected = await checkExtensionConnection();
        
        // If handshake succeeds, always force connected = true
        if (isConnected) {
          setExtensionConnected(true);
          return;
        }

        // If browser handshake fails, check if we've had recent activity (within last 5 mins)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (lastActivity > fiveMinutesAgo) {
          setExtensionConnected(true);
        } else {
          setExtensionConnected(false);
        }
      } catch (err) {
        setExtensionConnected(false);
      }
    };
    
    verifyConnection();
    const interval = setInterval(verifyConnection, 5000);
    return () => clearInterval(interval);
  }, [lastActivity]);

  const login = async (credential) => {
    try {
      const decoded = jwtDecode(credential);
      
      const userData = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        token: credential // Store the raw JWT for backend auth
      };

      // Sync user with backend database
      try {
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            profile_pic: userData.picture
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn('Backend sync failed:', errorData.error || response.statusText);
        }
      } catch (syncError) {
        console.error('Network error during backend sync:', syncError);
      }

      // Proceed with setting user state and localStorage
      setUser(userData);
      localStorage.setItem('phishninja_user', JSON.stringify(userData));
      syncWithExtension(userData);
    } catch (error) {
      console.error('Failed to decode Google credential:', error);
    }
  };

  const logout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('phishninja_user');
    syncWithExtension(null);
  };

  const updateUser = (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    localStorage.setItem('phishninja_user', JSON.stringify(updatedUser));
    syncWithExtension(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, extensionConnected, setExtensionConnected, signalActivity }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
