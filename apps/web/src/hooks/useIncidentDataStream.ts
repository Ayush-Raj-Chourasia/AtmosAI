import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';

export function useIncidentDataStream() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const eventSource = new EventSource(`${API_BASE_URL}/sse/events`);

        eventSource.onopen = () => {
            console.log('SSE Connected');
        };

        const handleUpdate = (event: MessageEvent) => {
            console.log('Received Incident Update via SSE', event.data);
            // Invalidate queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['hero-incident'] });
            queryClient.invalidateQueries({ queryKey: ['feed-incidents'] });
            queryClient.invalidateQueries({ queryKey: ['map-incidents'] });
            // If data contains ID, could invalidate specific incident too
        };

        const handleSignal = (event: MessageEvent) => {
            console.log('Received Signal via SSE', event.data);
            queryClient.invalidateQueries({ queryKey: ['ticker-signals'] });
        };

        // Listen for specific event type
        eventSource.addEventListener('incident_update', handleUpdate);
        eventSource.addEventListener('signal_processed', handleSignal);

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [queryClient]);
}
