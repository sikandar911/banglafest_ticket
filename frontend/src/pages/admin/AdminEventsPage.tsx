import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { eventsApi } from '../../api/events';
import { PageSpinner } from '../../components/ui/Spinner';
import type { Event } from '../../types';

type EventForm = { title: string; description: string; startTime: string; endTime: string; location: string };
type TierForm = { name: string; price: string; totalCapacity: string };

const emptyEvent: EventForm = { title: '', description: '', startTime: '', endTime: '', location: '' };
const emptyTier: TierForm = { name: '', price: '', totalCapacity: '' };

export function AdminEventsPage() {
  const qc = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tierForms, setTierForms] = useState<Record<string, TierForm>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: EventForm) => adminApi.createEvent(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event created'); setShowEventForm(false); setEventForm(emptyEvent); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventForm }) => adminApi.updateEvent(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event updated'); setEditingEvent(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEvent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event deleted'); },
  });

  const createTierMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: TierForm }) =>
      adminApi.createTier(eventId, { name: data.name, price: parseFloat(data.price), totalCapacity: parseInt(data.totalCapacity) }),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Tier added');
      setTierForms((prev) => ({ ...prev, [eventId]: emptyTier }));
    },
  });

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventForm });
    } else {
      createMutation.mutate(eventForm);
    }
  };

  const openEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      startTime: event.startTime.slice(0, 16),
      endTime: event.endTime.slice(0, 16),
      location: event.location,
    });
    setShowEventForm(true);
  };

  if (isLoading) return <PageSpinner />;
  const events = data?.events ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Events</h2>
        <button className="btn-primary py-2 text-sm" onClick={() => { setShowEventForm(true); setEditingEvent(null); setEventForm(emptyEvent); }}>
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {/* Event form */}
      {showEventForm && (
        <div className="card border-primary-800">
          <h3 className="font-semibold text-white mb-4">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
          <form onSubmit={handleSaveEvent} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Title</label>
                <input className="input" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
              </div>
              <div>
                <label className="label">Start Time</label>
                <input type="datetime-local" className="input" value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} required />
              </div>
              <div>
                <label className="label">End Time</label>
                <input type="datetime-local" className="input" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary text-sm" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowEventForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">No events yet.</div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = expandedId === event.id;
            const tierForm = tierForms[event.id] ?? emptyTier;
            return (
              <div key={event.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-white">{event.title}</p>
                    <p className="text-sm text-gray-400">{format(new Date(event.startTime), 'MMM d, yyyy')} • {event.location}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.ticketTiers.length} tier(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white" onClick={() => openEditEvent(event)}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-red-900 text-gray-400 hover:text-red-300" onClick={() => { if (confirm('Delete this event?')) deleteMutation.mutate(event.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white" onClick={() => setExpandedId(isExpanded ? null : event.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-gray-800 pt-4 space-y-4">
                    {/* Tiers */}
                    {event.ticketTiers.length > 0 && (
                      <div className="space-y-2">
                        {event.ticketTiers.map((tier) => (
                          <div key={tier.id} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-sm">
                            <span className="text-white font-medium">{tier.name}</span>
                            <span className="text-gray-400">${tier.price} · {tier.availableQty}/{tier.totalCapacity}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add tier form */}
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">Add Ticket Tier</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input className="input text-sm" placeholder="Name" value={tierForm.name} onChange={(e) => setTierForms((p) => ({ ...p, [event.id]: { ...tierForm, name: e.target.value } }))} />
                        <input className="input text-sm" placeholder="Price" type="number" min="0" step="0.01" value={tierForm.price} onChange={(e) => setTierForms((p) => ({ ...p, [event.id]: { ...tierForm, price: e.target.value } }))} />
                        <input className="input text-sm" placeholder="Capacity" type="number" min="1" value={tierForm.totalCapacity} onChange={(e) => setTierForms((p) => ({ ...p, [event.id]: { ...tierForm, totalCapacity: e.target.value } }))} />
                      </div>
                      <button className="btn-secondary text-sm mt-2" onClick={() => createTierMutation.mutate({ eventId: event.id, data: tierForm })} disabled={createTierMutation.isPending}>
                        <Plus className="w-3 h-3" /> Add Tier
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
