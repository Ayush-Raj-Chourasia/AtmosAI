'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import GoogleIcon from '@/components/ui/GoogleIcon';

interface UserPlace {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
  notify_enabled: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    isSupported,
    isConfigured,
    isSubscribed,
    permission,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  // Fetch user places
  const { data: places = [], isLoading: placesLoading } = useQuery<UserPlace[]>({
    queryKey: ['user-places', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`${API_BASE_URL}/user/places?user_id=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch places');
      const data = await res.json();
      // Default notify_enabled to true if not present
      return data.map((p: any) => ({ ...p, notify_enabled: p.notify_enabled ?? true }));
    },
    enabled: !!user?.id,
  });

  // Toggle notification for a specific place
  const togglePlaceMutation = useMutation({
    mutationFn: async ({ placeId, enabled }: { placeId: string; enabled: boolean }) => {
      const res = await fetch(`${API_BASE_URL}/user/places/${placeId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_enabled: enabled }),
      });
      if (!res.ok) throw new Error('Failed to update preference');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-places', user?.id] });
    },
    onError: () => {
      toast({
        title: ns.toast?.error || 'Error',
        description: ns.toast?.errorDesc || 'Failed to update preference',
        variant: 'destructive',
      });
    },
  });

  // Get translations
  const ns = (t as any)('profile.notificationSettings') || {};

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const result = await unsubscribe();
      if (result.success) {
        toast({
          title: ns.toast?.disabled || 'Notifications Disabled',
          description: ns.toast?.disabledDesc || 'You will not receive push notifications',
        });
      } else {
        toast({
          title: ns.toast?.error || 'Error',
          description: ns.toast?.errorDesc || 'Failed to update settings',
          variant: 'destructive',
        });
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        toast({
          title: ns.toast?.enabled || 'Notifications Enabled',
          description: ns.toast?.enabledDesc || 'You will receive disaster alerts',
          variant: 'success',
        });
      } else {
        toast({
          title: ns.toast?.error || 'Error',
          description: ns.toast?.errorDesc || 'Failed to enable notifications',
          variant: 'destructive',
        });
      }
    }
  };

  const handlePlaceToggle = (placeId: string, currentEnabled: boolean) => {
    togglePlaceMutation.mutate({ placeId, enabled: !currentEnabled });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <GoogleIcon name="arrow_back" size={20} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            {t('profile.notifications')}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Push Notifications Toggle */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <GoogleIcon name="smartphone" size={18} className="text-blue-500" />
              {ns.pushTitle || 'Push Notifications'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {ns.pushDesc || 'Receive real-time notifications when disasters occur'}
            </p>
          </div>

          <div className="p-4">
            {!isSupported ? (
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl">
                <GoogleIcon name="warning" size={20} />
                <span className="text-sm">{ns.notSupported || 'Browser not supported'}</span>
              </div>
            ) : !isConfigured ? (
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl">
                <GoogleIcon name="warning" size={20} />
                <div>
                  <p className="text-sm font-medium">{ns.notConfigured || 'Not configured'}</p>
                  <p className="text-xs text-amber-500">{ns.notConfiguredDesc || 'Configuration needed'}</p>
                </div>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl">
                <GoogleIcon name="notifications_off" size={20} />
                <div>
                  <p className="text-sm font-medium">{ns.blocked || 'Blocked'}</p>
                  <p className="text-xs text-red-500">{ns.blockedDesc || 'Enable in browser'}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePushToggle}
                disabled={pushLoading}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  isSubscribed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GoogleIcon 
                    name={isSubscribed ? 'notifications_active' : 'notifications_off'} 
                    size={20} 
                    className={isSubscribed ? 'text-green-600' : 'text-slate-400'} 
                  />
                  <div className="text-left">
                    <p className={`font-medium ${isSubscribed ? 'text-green-700' : 'text-slate-700'}`}>
                      {isSubscribed ? (ns.active || 'Active') : (ns.inactive || 'Inactive')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isSubscribed ? (ns.activeDesc || 'Receiving alerts') : (ns.inactiveDesc || 'Click to enable')}
                    </p>
                  </div>
                </div>
                {pushLoading ? (
                  <GoogleIcon name="progress_activity" size={20} className="animate-spin text-slate-400" />
                ) : (
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      isSubscribed ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        isSubscribed ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                )}
              </button>
            )}

            {pushError && (
              <p className="text-sm text-red-500 mt-2">{pushError}</p>
            )}
          </div>
        </div>

        {/* User Places for Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <GoogleIcon name="location_on" size={18} className="text-blue-500" />
              {ns.monitoredLocations || 'Monitored Locations'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {ns.monitoredLocationsDesc || 'Receive notifications for these locations'}
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {placesLoading ? (
              <div className="p-8 flex items-center justify-center">
                <GoogleIcon name="progress_activity" size={24} className="animate-spin text-slate-400" />
              </div>
            ) : places.length === 0 ? (
              <div className="p-8 text-center">
                <GoogleIcon name="location_off" size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">{ns.noLocations || 'No locations'}</p>
                <p className="text-slate-400 text-xs mt-1">{ns.addLocationHint || 'Add from Map page'}</p>
              </div>
            ) : (
              places.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <GoogleIcon name="location_on" size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{place.label}</p>
                      {/* <p className="text-xs text-slate-500">
                        {(place.radius_m / 1000).toFixed(1)} km
                      </p> */}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlaceToggle(place.id, place.notify_enabled)}
                    disabled={togglePlaceMutation.isPending}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      place.notify_enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {place.notify_enabled ? (ns.enabled || 'Enabled') : (ns.disabled || 'Disabled')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2 flex items-center gap-2">
            <GoogleIcon name="info" size={16} />
            {ns.howItWorks || 'How It Works'}
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            {(ns.howItWorksList || [
              'Receive alerts when disasters are detected',
              'Notifications based on your saved locations',
              'Enable browser notifications'
            ]).map((item: string, i: number) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
