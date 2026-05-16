import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Save } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import { eventsApi } from "../../api/events";
import { PageSpinner } from "../../components/ui/Spinner";
import type { Event } from "../../types";

type EventForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string;
};

type TierForm = { 
  name: string; 
  price: string; 
  totalCapacity: string;
  description: string;
  features: string[];
  maxPerPerson: string;
};

const emptyEvent: EventForm = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  location: "",
  imageUrl: "",
};

const emptyTier: TierForm = { 
  name: "", 
  price: "", 
  totalCapacity: "",
  description: "",
  features: [],
  maxPerPerson: "1"
};

export function AdminEventsPage() {
  const qc = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tierForms, setTierForms] = useState<Record<string, TierForm>>({});
  const [currentFeature, setCurrentFeature] = useState("");
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingTierForm, setEditingTierForm] = useState<TierForm>(emptyTier);

  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: EventForm) => adminApi.createEvent(d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["events"] }); 
      toast.success("Event created"); 
      setShowEventForm(false); 
      setEventForm(emptyEvent); 
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventForm }) => adminApi.updateEvent(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["events"] }); 
      toast.success("Event updated"); 
      setEditingEvent(null); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEvent(id),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["events"] }); 
      toast.success("Event deleted"); 
    },
  });

  const createTierMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: TierForm }) =>
      adminApi.createTier(eventId, {
        name: data.name,
        description: data.description || undefined,
        price: parseFloat(data.price),
        totalCapacity: parseInt(data.totalCapacity),
        features: data.features,
        maxPerPerson: parseInt(data.maxPerPerson),
      }),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Tier added");
      setTierForms((prev) => ({ ...prev, [eventId]: emptyTier }));
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ tierId, data }: { tierId: string; data: TierForm }) =>
      adminApi.updateTier(tierId, {
        name: data.name,
        description: data.description || undefined,
        price: parseFloat(data.price),
        totalCapacity: parseInt(data.totalCapacity),
        features: data.features,
        maxPerPerson: parseInt(data.maxPerPerson),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Tier updated");
      closeTierModal();
    },
  });

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.startTime || !eventForm.endTime) {
      toast.error("Please fill in required fields");
      return;
    }
    if (new Date(eventForm.endTime) <= new Date(eventForm.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

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
      description: event.description || "",
      startTime: event.startTime.slice(0, 16),
      endTime: event.endTime.slice(0, 16),
      location: event.location || "",
      imageUrl: event.imageUrl || "",
    });
    setShowEventForm(true);
  };

  const openEditTier = (tier: any) => {
    setEditingTierId(tier.id);
    setEditingTierForm({
      name: tier.name,
      price: tier.price.toString(),
      totalCapacity: tier.totalCapacity.toString(),
      description: tier.description || "",
      features: [...(tier.features || [])],
      maxPerPerson: tier.maxPerPerson.toString(),
    });
    setCurrentFeature("");
  };

  const closeTierModal = () => {
    setEditingTierId(null);
    setEditingTierForm(emptyTier);
    setCurrentFeature("");
  };

  const addFeature = (eventId: string) => {
    if (!currentFeature.trim()) return;
    setTierForms((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        features: [...(prev[eventId]?.features || []), currentFeature],
      },
    }));
    setCurrentFeature("");
  };

  const removeFeature = (eventId: string, index: number) => {
    setTierForms((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        features: prev[eventId].features.filter((_, i) => i !== index),
      },
    }));
  };

  if (isLoading) return <PageSpinner />;
  const events = data?.events ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Events</h2>
        <button 
          className="btn-primary py-2 text-sm" 
          onClick={() => { 
            setShowEventForm(true); 
            setEditingEvent(null); 
            setEventForm(emptyEvent); 
          }}
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {showEventForm && (
        <div className="card border-primary-800">
          <h3 className="font-semibold text-white mb-4">{editingEvent ? "Edit Event" : "New Event"}</h3>
          <form onSubmit={handleSaveEvent} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Title *</label>
                <input 
                  className="input" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input 
                  className="input" 
                  value={eventForm.location} 
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} 
                />
              </div>
              <div>
                <label className="label">Start Time *</label>
                <input 
                  type="datetime-local" 
                  className="input" 
                  value={eventForm.startTime} 
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="label">End Time *</label>
                <input 
                  type="datetime-local" 
                  className="input" 
                  value={eventForm.endTime} 
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} 
                  required 
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cover Image URL (optional)</label>
              <input
                className="input"
                placeholder="https://example.com/image.jpg"
                value={eventForm.imageUrl}
                onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
              />
              {eventForm.imageUrl && (
                <img
                  src={eventForm.imageUrl}
                  alt="Preview"
                  className="mt-2 h-24 w-full object-cover rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button 
                type="submit" 
                className="btn-primary text-sm" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingEvent ? "Update" : "Create"}
              </button>
              <button 
                type="button" 
                className="btn-secondary text-sm" 
                onClick={() => setShowEventForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
                    <p className="text-sm text-gray-400">
                      {format(new Date(event.startTime), "MMM d, yyyy")} • {event.location}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{event.ticketTiers.length} tier(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white" 
                      onClick={() => openEditEvent(event)}
                      title="Edit event"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-red-900 text-gray-400 hover:text-red-300" 
                      onClick={() => { 
                        if (confirm("Delete this event?")) deleteMutation.mutate(event.id); 
                      }}
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white" 
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      title="Expand tier details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-gray-800 pt-4 space-y-4">
                    {event.ticketTiers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300">Existing Tiers</h4>
                        {event.ticketTiers.map((tier: any) => (
                          <div key={tier.id} className="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-white font-medium">{tier.name}</span>
                                {tier.description && (
                                  <p className="text-gray-400 text-xs mt-1">{tier.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className="text-gray-400">${tier.price}</span>
                                <button 
                                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                                  onClick={() => openEditTier(tier)}
                                  title="Edit tier"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                              <div>Availability: {tier.availableQty}/{tier.totalCapacity}</div>
                              <div>Max per person: {tier.maxPerPerson}</div>
                            </div>
                            {tier.features && tier.features.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tier.features.map((feature: string, idx: number) => (
                                  <span key={idx} className="bg-primary-700 text-primary-100 px-2 py-1 rounded text-xs">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-gray-800 pt-4">
                      <p className="text-sm font-medium text-gray-300 mb-3">Add Ticket Tier</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label text-xs">Name *</label>
                            <input 
                              className="input text-sm" 
                              placeholder="e.g., Standard" 
                              value={tierForm.name} 
                              onChange={(e) => setTierForms((p) => ({ 
                                ...p, 
                                [event.id]: { ...tierForm, name: e.target.value } 
                              }))} 
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Price *</label>
                            <input 
                              className="input text-sm" 
                              placeholder="0.00" 
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={tierForm.price} 
                              onChange={(e) => setTierForms((p) => ({ 
                                ...p, 
                                [event.id]: { ...tierForm, price: e.target.value } 
                              }))} 
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Total Capacity *</label>
                            <input 
                              className="input text-sm" 
                              placeholder="100" 
                              type="number" 
                              min="1" 
                              value={tierForm.totalCapacity} 
                              onChange={(e) => setTierForms((p) => ({ 
                                ...p, 
                                [event.id]: { ...tierForm, totalCapacity: e.target.value } 
                              }))} 
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Max per Person</label>
                            <input 
                              className="input text-sm" 
                              placeholder="1" 
                              type="number" 
                              min="1" 
                              value={tierForm.maxPerPerson} 
                              onChange={(e) => setTierForms((p) => ({ 
                                ...p, 
                                [event.id]: { ...tierForm, maxPerPerson: e.target.value } 
                              }))} 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label text-xs">Description (Optional)</label>
                          <textarea 
                            className="input text-sm" 
                            placeholder="e.g., Includes VIP access" 
                            rows={2}
                            value={tierForm.description} 
                            onChange={(e) => setTierForms((p) => ({ 
                              ...p, 
                              [event.id]: { ...tierForm, description: e.target.value } 
                            }))} 
                          />
                        </div>

                        <div>
                          <label className="label text-xs mb-2">Features (Optional)</label>
                          <div className="flex gap-2 mb-2">
                            <input 
                              className="input text-sm flex-1" 
                              placeholder="e.g., VIP Access" 
                              value={currentFeature}
                              onChange={(e) => setCurrentFeature(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addFeature(event.id);
                                }
                              }}
                            />
                            <button 
                              type="button"
                              className="btn-secondary text-sm px-3"
                              onClick={() => addFeature(event.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          {tierForm.features.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tierForm.features.map((feature, idx) => (
                                <div 
                                  key={idx}
                                  className="bg-primary-700 text-primary-100 px-3 py-1 rounded text-xs flex items-center gap-2"
                                >
                                  {feature}
                                  <button
                                    type="button"
                                    onClick={() => removeFeature(event.id, idx)}
                                    className="hover:text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button 
                          type="button"
                          className="btn-primary text-sm w-full" 
                          onClick={() => createTierMutation.mutate({ eventId: event.id, data: tierForm })} 
                          disabled={createTierMutation.isPending || !tierForm.name || !tierForm.price || !tierForm.totalCapacity}
                        >
                          <Plus className="w-3 h-3" /> Add Tier
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Tier Modal */}
      {editingTierId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeTierModal(); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="font-semibold text-white text-lg">Edit Ticket Tier</h3>
              <button
                onClick={closeTierModal}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Name *</label>
                  <input
                    className="input"
                    placeholder="e.g., Standard"
                    value={editingTierForm.name}
                    onChange={(e) => setEditingTierForm({ ...editingTierForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Price (£) *</label>
                  <input
                    className="input"
                    placeholder="0.00"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editingTierForm.price}
                    onChange={(e) => setEditingTierForm({ ...editingTierForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Total Capacity *</label>
                  <input
                    className="input"
                    placeholder="100"
                    type="number"
                    min="1"
                    value={editingTierForm.totalCapacity}
                    onChange={(e) => setEditingTierForm({ ...editingTierForm, totalCapacity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Max per Person</label>
                  <input
                    className="input"
                    placeholder="1"
                    type="number"
                    min="1"
                    value={editingTierForm.maxPerPerson}
                    onChange={(e) => setEditingTierForm({ ...editingTierForm, maxPerPerson: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Description (Optional)</label>
                <textarea
                  className="input"
                  placeholder="e.g., Includes VIP access"
                  rows={2}
                  value={editingTierForm.description}
                  onChange={(e) => setEditingTierForm({ ...editingTierForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs mb-2">Features (Optional)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g., VIP Access"
                    value={currentFeature}
                    onChange={(e) => setCurrentFeature(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (currentFeature.trim()) {
                          setEditingTierForm({ ...editingTierForm, features: [...editingTierForm.features, currentFeature.trim()] });
                          setCurrentFeature("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary px-3"
                    onClick={() => {
                      if (currentFeature.trim()) {
                        setEditingTierForm({ ...editingTierForm, features: [...editingTierForm.features, currentFeature.trim()] });
                        setCurrentFeature("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {editingTierForm.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingTierForm.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="bg-primary-700 text-primary-100 px-3 py-1 rounded text-sm flex items-center gap-2"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => setEditingTierForm({
                            ...editingTierForm,
                            features: editingTierForm.features.filter((_, i) => i !== idx)
                          })}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-800">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => updateTierMutation.mutate({ tierId: editingTierId, data: editingTierForm })}
                disabled={updateTierMutation.isPending || !editingTierForm.name || !editingTierForm.price || !editingTierForm.totalCapacity}
              >
                {updateTierMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">Saving...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </span>
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeTierModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
