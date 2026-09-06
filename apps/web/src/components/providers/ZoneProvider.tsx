'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/components/providers/AuthProvider';

export type Zone = {
    id: string;
    label: string;
    lat: number;
    lng: number;
    radius_m: number;
};

type ZoneContextType = {
    zones: Zone[];
    selectedZoneId: string | null;
    selectedZone: Zone | null;
    setSelectedZoneId: (id: string) => void;
    isLoading: boolean;
    addZone: (payload: { label: string; lat: number; lng: number; radius_m: number }) => Promise<void>;
    deleteZone: (id: string) => Promise<void>;
};

const ZoneContext = createContext<ZoneContextType>({
    zones: [],
    selectedZoneId: null,
    selectedZone: null,
    setSelectedZoneId: () => {},
    isLoading: false,
    addZone: async () => {},
    deleteZone: async () => {},
});

export const useZone = () => useContext(ZoneContext);

export default function ZoneProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // 1. Fetch Zones
    const { data: zones = [], isLoading } = useQuery({
        queryKey: ['user-zones', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const res = await fetch(`${API_BASE_URL}/user/places?user_id=${user.id}`);
             if (!res.ok) {
                 // Fallback if backend is empty or fails, return empty list or mock default
                 return [];
             }
             return res.json() as Promise<Zone[]>;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 2. State for Selection
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // 3. Hydrate from LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem('vigilant_selected_zone');
            if (saved) {
                setSelectedZoneId(saved);
            }
        }
    }, []);

    // 4. Auto-select: first zone if available, otherwise 'all' (Indonesia)
    useEffect(() => {
        if (!selectedZoneId) {
            if (zones.length > 0) {
                setSelectedZoneId(zones[0].id);
            } else if (!isLoading) {
                // No zones available, default to "All Indonesia"
                setSelectedZoneId('all');
            }
        }
    }, [zones, selectedZoneId, isLoading]);

    // 5. Persist Selection
    const handleSetZone = (id: string) => {
        setSelectedZoneId(id);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('vigilant_selected_zone', id);
        }
    };

    const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

    // Mutation: Add Zone
    const addZone = async (payload: Omit<Zone, 'id' | 'user_id'>) => {
        if (!user?.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/user/places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, user_id: user.id })
            });
            
            const result = await res.json();
            
            if (!res.ok) {
                console.error('Create Zone Failed', result);
                throw new Error(result.message || 'Failed to create zone');
            }

            // Invalidate and refetch zones
            await queryClient.invalidateQueries({ queryKey: ['user-zones', user.id] });

            // Select the newly added zone
            if (result.id) {
                handleSetZone(result.id);
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    // Mutation: Delete Zone
    const deleteZone = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/user/places/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete zone');

            // Invalidate and refetch zones
            await queryClient.invalidateQueries({ queryKey: ['user-zones', user?.id] });

            if (selectedZoneId === id) {
                setSelectedZoneId(null);
                localStorage.removeItem('vigilant_selected_zone');
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <ZoneContext.Provider value={{ zones, selectedZoneId, selectedZone, setSelectedZoneId: handleSetZone, isLoading, addZone, deleteZone }}>
            {children}
        </ZoneContext.Provider>
    );
}


