import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import type { Event } from '../types';

interface AdminEventFilterContextType {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  events: Event[];
  isLoadingEvents: boolean;
}

const AdminEventFilterContext = createContext<AdminEventFilterContextType | undefined>(undefined);

export const AdminEventFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  const events = data?.events ?? [];
  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(null);

  // Sync to localStorage
  const setSelectedEventId = (id: string | null) => {
    setSelectedEventIdState(id);
    if (id) {
      localStorage.setItem('admin_selected_event_id', id);
    } else {
      localStorage.removeItem('admin_selected_event_id');
    }
  };

  useEffect(() => {
    if (events.length === 0) return;

    // Check if there is a saved selection in localStorage and if it is still valid
    const savedId = localStorage.getItem('admin_selected_event_id');
    if (savedId && events.some((e) => e.id === savedId)) {
      setSelectedEventIdState(savedId);
      return;
    }

    // Determine the default upcoming event
    const now = new Date();
    // Sort events by startTime ascending
    const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // Find the next upcoming event (startTime >= now)
    const upcoming = sorted.find((e) => new Date(e.startTime) >= now);
    
    if (upcoming) {
      setSelectedEventId(upcoming.id);
    } else if (sorted.length > 0) {
      // If no upcoming, fall back to the first available event
      setSelectedEventId(sorted[0].id);
    }
  }, [events]);

  return (
    <AdminEventFilterContext.Provider value={{ selectedEventId, setSelectedEventId, events, isLoadingEvents }}>
      {children}
    </AdminEventFilterContext.Provider>
  );
};

export const useAdminEventFilter = () => {
  const context = useContext(AdminEventFilterContext);
  if (!context) {
    throw new Error('useAdminEventFilter must be used within an AdminEventFilterProvider');
  }
  return context;
};
