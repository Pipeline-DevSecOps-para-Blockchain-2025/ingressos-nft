import { create } from 'zustand';
import type { Event } from '../types';

interface EventStore {
  events: Event[];
  selectedEvent: Event | null;
  setEvents: (events: Event[]) => void;
  setSelectedEvent: (event: Event | null) => void;
  updateEvent: (eventId: number, updates: Partial<Event>) => void;
}

const useEventStore = create<EventStore>((set) => ({
  events: [],
  selectedEvent: null,

  setEvents: (events) => set({ events }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  updateEvent: (eventId, updates) => set((state) => ({
    events: state.events.map(event =>
      event.eventId === eventId ? { ...event, ...updates } : event
    ),
  })),
}));

export default useEventStore;
