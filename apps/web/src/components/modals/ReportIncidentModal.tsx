import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CloudRain, Zap, Flame, Mountain, Loader2, MapPin, Camera, Image as ImageIcon, Video, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';

import { useLanguage } from '@/components/providers/LanguageProvider';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';

type ReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type IncidentType = 'flood' | 'landslide' | 'fire' | 'earthquake' | 'whirlwind' | 'tornado' | 'volcano' | 'tsunami' | 'other';

type MediaFile = {
    file: File;
    preview: string;
    type: 'image' | 'video';
};

export default function ReportIncidentModal({ isOpen, onClose }: ReportModalProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [eventType, setEventType] = useState<IncidentType | null>(null);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [media, setMedia] = useState<MediaFile | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Cleanup media preview URL on unmount
    useEffect(() => {
        return () => {
            if (media?.preview) {
                URL.revokeObjectURL(media.preview);
            }
        };
    }, [media]);

    // Reverse geocode to get location name
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'disaster-pulse/1.0',
                        'Accept-Language': 'id,en'
                    }
                }
            );

            if (!res.ok) return null;

            const data = await res.json();
            const addr = data.address ?? {};

            // Build location string: District/Suburb, City, Province
            const parts: string[] = [];

            // District level
            if (addr.suburb || addr.village || addr.neighbourhood) {
                parts.push(addr.suburb || addr.village || addr.neighbourhood);
            }

            // City level
            if (addr.city || addr.town || addr.municipality || addr.county) {
                parts.push(addr.city || addr.town || addr.municipality || addr.county);
            }

            // Province level
            if (addr.state) {
                parts.push(addr.state);
            }

            return parts.length > 0 ? parts.join(', ') : null;
        } catch (err) {
            console.error('Reverse geocoding failed:', err);
            return null;
        }
    };

    const detectLocation = () => {
        setIsLocating(true);
        setLocationError(null);
        setLocationName(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setLocation({ lat, lng });

                // Get location name
                const name = await reverseGeocode(lat, lng);
                setLocationName(name);

                setIsLocating(false);
            },
            (error) => {
                console.error('Geolocation Error:', error);
                let msg = 'Unable to retrieve location';
                if (error.code === 1) msg = 'Location permission denied';
                else if (error.code === 2) msg = 'Position unavailable (try retrying)';
                else if (error.code === 3) msg = 'Location request timed out';

                setLocationError(msg);
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Get location on open
    useEffect(() => {
        if (isOpen && !location) {
            detectLocation();
        }
    }, [isOpen]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            toast({
                title: t('common.error'),
                description: t('report.media.invalidType'),
                variant: 'destructive'
            });
            return;
        }

        // Validate file size (10MB for images, 50MB for videos)
        const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            toast({
                title: t('common.error'),
                description: isImage ? t('report.media.imageTooLarge') : t('report.media.videoTooLarge'),
                variant: 'destructive'
            });
            return;
        }

        // Clean up previous preview
        if (media?.preview) {
            URL.revokeObjectURL(media.preview);
        }

        // Create preview
        const preview = URL.createObjectURL(file);
        setMedia({
            file,
            preview,
            type: isImage ? 'image' : 'video'
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeMedia = () => {
        if (media?.preview) {
            URL.revokeObjectURL(media.preview);
        }
        setMedia(null);
    };

    const mutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await fetch(`${API_BASE_URL}/reports`, {
                method: 'POST',
                body: formData, // No Content-Type header - browser sets it with boundary
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to submit report');
            }
            return res.json();
        },
        onSuccess: () => {
            // Reset and close
            setEventType(null);
            setDescription('');
            setLocationName(null);
            removeMedia();
            onClose();
            // Optionally trigger a toast or refresh
            toast({
                title: t('report.success'),
                variant: 'success',
                duration: 4000
            });
        },
        onError: (err) => {
            toast({
                title: t('common.error'),
                description: err.message,
                variant: 'destructive'
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !description || !location || !user?.id) return;

        const formData = new FormData();
        formData.append('user_id', user.id);
        formData.append('event_type', eventType);
        formData.append('description', description);
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
        formData.append('confidence', 'direct_observation');

        if (media?.file) {
            formData.append('media', media.file);
        }

        mutation.mutate(formData);
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="font-semibold text-slate-900">{t('report.title')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Location Status */}
                    <div className="flex items-center gap-2 text-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${location ? 'bg-green-100 text-green-600' : locationError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            {isLocating ? (
                                <p className="text-slate-500">{t('report.location.detecting')}</p>
                            ) : locationError ? (
                                <div className="flex items-center gap-2">
                                    <p className="text-red-500 font-medium">{locationError}</p>
                                    <button
                                        type="button"
                                        onClick={detectLocation}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md text-slate-600 transition-colors"
                                    >
                                            {t('common.retry')}
                                    </button>
                                </div>
                                ) : location ? (
                                    <div>
                                        <p className="text-green-600 font-medium">{t('report.location.detected')}</p>
                                            {locationName && (
                                                <p className="text-xs text-slate-600 truncate">{locationName}</p>
                                            )}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Incident Type Grid */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('report.selectType')}</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'flood', icon: CloudRain, label: 'Flood', color: 'blue' },
                                { id: 'fire', icon: Flame, label: 'Fire', color: 'red' },
                                { id: 'earthquake', icon: Zap, label: 'Quake', color: 'amber' },
                                { id: 'landslide', icon: Mountain, label: 'Slide', color: 'orange' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setEventType(type.id as IncidentType)}
                                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                                        eventType === type.id
                                            ? `bg-${type.color}-50 border-${type.color}-500 ring-1 ring-${type.color}-500`
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`${eventType === type.id ? `text-${type.color}-600` : 'text-slate-500'}`}>
                                        <type.icon size={22} />
                                    </div>
                                    <span className={`text-[10px] font-medium ${eventType === type.id ? `text-${type.color}-700` : 'text-slate-600'}`}>
                                        {type.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Media Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {t('report.media.label')}
                        </label>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            capture="environment"
                        />

                        {media ? (
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                {media.type === 'image' ? (
                                    <img
                                        src={media.preview}
                                        alt="Preview"
                                        className="w-full h-32 object-cover"
                                    />
                                ) : (
                                    <video
                                        src={media.preview}
                                        className="w-full h-32 object-cover"
                                        controls
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={removeMedia}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md flex items-center gap-1">
                                    {media.type === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                                    {(media.file.size / 1024 / 1024).toFixed(1)} MB
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 transition-all"
                                >
                                    <Camera size={20} />
                                    <span className="text-sm font-medium">{t('report.media.addPhoto')}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('report.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('report.descriptionPlaceholder')}
                            className="w-full h-20 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!eventType || !description || !location || !media || mutation.isPending}
                        className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {t('report.submitting')}
                            </>
                        ) : (
                                t('report.submit')
                        )}
                    </button>
                    {!location && !isLocating && !locationError && (
                        <p className="text-[10px] text-center text-slate-400">{t('report.location.required')}</p>
                    )}
                </form>
            </div>
        </div>,
        document.body
    );
}
