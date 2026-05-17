import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { eventsApi } from '../../api/events';
import type { PromoCode, Event } from '../../types';

const EMPTY_FORM = { code: '', influencerName: '', socialMedia: '', eventIds: [] as string[] };

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: promoData, isLoading } = useQuery({
    queryKey: ['admin', 'promo-codes'],
    queryFn: () => adminApi.listPromoCodes().then((r) => r.data),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list().then((r) => r.data),
  });

  const events: Event[] = eventsData?.events ?? [];
  const promoCodes: PromoCode[] = promoData?.promoCodes ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createPromoCode({
        code: form.code.trim().toUpperCase(),
        influencerName: form.influencerName.trim(),
        socialMedia: form.socialMedia.trim() || undefined,
        eventIds: form.eventIds,
      }),
    onSuccess: () => {
      toast.success('Promo code created!');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to create promo code.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.togglePromoCode(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
    },
    onError: () => toast.error('Failed to toggle promo code.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePromoCode(id),
    onSuccess: () => {
      toast.success('Promo code deleted.');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
    },
    onError: () => toast.error('Failed to delete promo code.'),
  });

  function handleEventToggle(eventId: string) {
    setForm((f) => ({
      ...f,
      eventIds: f.eventIds.includes(eventId)
        ? f.eventIds.filter((id) => id !== eventId)
        : [...f.eventIds, eventId],
    }));
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Promo code is required.');
    if (!form.influencerName.trim()) return toast.error('Influencer name is required.');
    if (form.eventIds.length === 0) return toast.error('Select at least one event.');
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Promo Code
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Create Promo Code</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Promo Code *</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. INFLUENCER20"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, code: generateCode() }))}
                  className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Influencer Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Influencer Name *</label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. John Doe"
                value={form.influencerName}
                onChange={(e) => setForm((f) => ({ ...f, influencerName: e.target.value }))}
              />
            </div>

            {/* Social Media */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Social Media <span className="text-gray-500">(optional)</span></label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. @johndoe or https://instagram.com/johndoe"
                value={form.socialMedia}
                onChange={(e) => setForm((f) => ({ ...f, socialMedia: e.target.value }))}
              />
            </div>

            {/* Events */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Applies To Events *</label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700 divide-y divide-gray-600">
                {events.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">No events available.</p>
                )}
                {events.map((event) => (
                  <label key={event.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-600">
                    <input
                      type="checkbox"
                      checked={form.eventIds.includes(event.id)}
                      onChange={() => handleEventToggle(event.id)}
                      className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-200">{event.title}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Discount amount is set per tier on the Events page (Promo Discount Amount field).
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Promo Code'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        ) : promoCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Tag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No promo codes yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Influencer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Social Media</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Events</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Uses</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {promoCodes.map((pc) => (
                <tr key={pc.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-purple-300 bg-gray-700 px-2 py-0.5 rounded">
                        {pc.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(pc.code)}
                        className="text-gray-500 hover:text-gray-300"
                        title="Copy code"
                      >
                        {copied === pc.code ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{pc.influencerName}</td>
                  <td className="px-4 py-3 text-gray-500">{pc.socialMedia || <span className="text-gray-700">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pc.events && pc.events.length > 0 ? (
                        pc.events.map((pe) => (
                          <span
                            key={pe.event.id}
                            className="rounded bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-300"
                          >
                            {pe.event.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-700 text-xs">No events</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-300">{pc.usageCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        pc.isActive
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {pc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleMutation.mutate(pc.id)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        title={pc.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {pc.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete promo code "${pc.code}"?`)) {
                            deleteMutation.mutate(pc.id);
                          }
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
