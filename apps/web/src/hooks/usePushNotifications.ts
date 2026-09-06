'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { API_BASE_URL } from '@/lib/config';
import { requestNotificationPermission, onForegroundMessage, isFirebaseConfigured } from '@/lib/firebase';

const SUBSCRIPTION_KEY = 'push_notifications_subscribed';

type PushNotificationState = {
  isSupported: boolean;
  isConfigured: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  isLoading: boolean;
  error: string | null;
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isConfigured: false,
    isSubscribed: false,
    permission: null,
    isLoading: false,
    error: null,
  });

  // Check if push notifications are supported and configured
  useEffect(() => {
    const isSupported = 
      typeof window !== 'undefined' && 
      'Notification' in window && 
      'serviceWorker' in navigator;
    
    const isConfigured = isFirebaseConfigured();

    // Get subscription status from localStorage
    const storedSubscribed = typeof window !== 'undefined'
      ? localStorage.getItem(SUBSCRIPTION_KEY) === 'true'
      : false;

    setState((prev) => ({
      ...prev,
      isSupported,
      isConfigured,
      permission: isSupported ? Notification.permission : null,
      // Only show as subscribed if permission granted AND localStorage says subscribed
      isSubscribed: isSupported && isConfigured && Notification.permission === 'granted' && storedSubscribed,
    }));
  }, []);

  // Foreground message handler - returns unsubscribe function
  const setupForegroundListener = useCallback((
    onMessage: (payload: { title: string; body: string }) => void
  ) => {
    if (!state.isSupported || !state.isConfigured || state.permission !== 'granted') {
      return () => { };
    }

    return onForegroundMessage((payload) => {
      onMessage({
        title: payload.notification?.title || 'Disaster Alert',
        body: payload.notification?.body || 'New incident reported',
      });
    });
  }, [state.isSupported, state.isConfigured, state.permission]);

  // Subscribe to push notifications - returns success boolean
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'login_required' };
    }

    if (!state.isConfigured) {
      return { success: false, error: 'not_configured' };
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Register service worker first
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
          console.warn('Service worker registration failed:', swError);
        }
      }

      const token = await requestNotificationPermission();
      
      if (!token) {
        const error = Notification.permission === 'denied' ? 'permission_denied' : 'token_failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          permission: Notification.permission,
          error,
        }));
        return { success: false, error };
      }

      // Save token to backend
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fcmToken: token,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('save_failed');
      }

      // Persist subscription status
      localStorage.setItem(SUBSCRIPTION_KEY, 'true');

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSubscribed: true,
        permission: 'granted',
        error: null,
      }));

      return { success: true };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [user, state.isConfigured]);

  // Unsubscribe from push notifications - returns success boolean
  const unsubscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'login_required' };

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('unsubscribe_failed');
      }

      // Remove subscription status from localStorage
      localStorage.removeItem(SUBSCRIPTION_KEY);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSubscribed: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    setupForegroundListener,
  };
}
