import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check,
  Calendar, AlertTriangle, Clock, Pencil, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { eventsApi } from '../../api/events';
import type { PromoCode, Event } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoForm {
  code: string;
  influencerName: string;
  socialMedia: string;
  discountAmount: string;
  eventIds: string[];
  startDate: string;
  endDate: string;
  isGroupPromo: boolean;
  minTickets: string;
  groupDiscounts: Record<string, string>;
}

const EMPTY_FORM: PromoForm = {
  code: '',
  influencerName: '',
  socialMedia: '',
  discountAmount: '',
  eventIds: [],
  startDate: '',
  endDate: '',
  isGroupPromo: false,
  minTickets: '10',
  groupDiscounts: {},
};

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type PromoStatus = 'active' | 'inactive' | 'scheduled' | 'expired';

function getPromoStatus(pc: PromoCode): PromoStatus {
  if (!pc.isActive) return 'inactive';
  const now = new Date();
  if (pc.startDate && new Date(pc.startDate) > now) return 'scheduled';
  if (pc.endDate   && new Date(pc.endDate)   < now) return 'expired';
  return 'active';
}

const STATUS_STYLES: Record<PromoStatus, string> = {
  active:    'bg-green-900/60 text-green-300 ring-1 ring-green-700',
  inactive:  'bg-gray-700 text-gray-500 ring-1 ring-gray-600',
  scheduled: 'bg-blue-900/60 text-blue-300 ring-1 ring-blue-700',
  expired:   'bg-red-900/60 text-red-400 ring-1 ring-red-800',
};

const STATUS_LABELS: Record<PromoStatus, string> = {
  active:    'Active',
  inactive:  'Inactive',
  scheduled: 'Scheduled',
  expired:   'Expired',
};

function StatusBadge({ pc }: { pc: PromoCode }) {
  const status = getPromoStatus(pc);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status === 'scheduled' && <Clock className="h-3 w-3" />}
      {status === 'expired'   && <AlertTriangle className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Shared warning toast ─────────────────────────────────────────────────────

function showWarnings(warnings: string[]) {
  warnings.forEach((w) =>
    toast(w, {
      icon: '⚠️',
      duration: 8000,
      style: {
        background: '#451a03',
        color: '#fed7aa',
        border: '1px solid #c2410c',
        fontSize: '13px',
        maxWidth: '480px',
      },
    })
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function PromoFormFields({
  form,
  setForm,
  events,
  isEdit = false,
}: {
  form: PromoForm;
  setForm: React.Dispatch<React.SetStateAction<PromoForm>>;
  events: Event[];
  isEdit?: boolean;
}) {
  function handleEventToggle(eventId: string) {
    setForm((f) => ({
      ...f,
      eventIds: f.eventIds.includes(eventId)
        ? f.eventIds.filter((id) => id !== eventId)
        : [...f.eventIds, eventId],
    }));
  }

  return (
    <div className="space-y-4">
      {/* Code (create only) */}
      {!isEdit && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Promo Code <span className="text-red-400">*</span>
          </label>
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
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Influencer Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Influencer / Partner Name <span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="e.g. John Doe"
          value={form.influencerName}
          onChange={(e) => setForm((f) => ({ ...f, influencerName: e.target.value }))}
        />
      </div>

      {/* Social Media */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300">
          Social Media <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="@handle or https://instagram.com/…"
          value={form.socialMedia}
          onChange={(e) => setForm((f) => ({ ...f, socialMedia: e.target.value }))}
        />
      </div>

      {/* Group Promo Toggle */}
      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id="isGroupPromo"
          checked={form.isGroupPromo}
          onChange={(e) => setForm((f) => ({ ...f, isGroupPromo: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="isGroupPromo" className="text-sm font-medium text-gray-300 cursor-pointer">
          Is Group Promo (Valid for bulk 10+ tickets)
        </label>
      </div>

      {form.isGroupPromo ? (
        <div className="space-y-3 rounded-lg border border-purple-900/60 bg-purple-950/10 p-3 ring-1 ring-purple-900/30">
          <div>
            <label className="mb-1 block text-xs font-medium text-purple-300">
              Minimum Tickets Required <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="2"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.minTickets}
              onChange={(e) => setForm((f) => ({ ...f, minTickets: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-purple-300">
              Tier-Specific Discounts (£)
            </label>
            {form.eventIds.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Select at least one event below to configure tier discounts.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-gray-700/60 pr-1">
                {form.eventIds.map((eventId) => {
                  const ev = events.find((e) => e.id === eventId);
                  if (!ev) return null;
                  return (
                    <div key={ev.id} className="pt-2 first:pt-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{ev.title}</p>
                      <div className="space-y-1.5">
                        {ev.ticketTiers.map((tier) => (
                          <div key={tier.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-gray-300 flex-1 truncate">{tier.name} (£{Number(tier.price).toFixed(2)})</span>
                            <div className="relative w-28">
                              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">£</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full rounded border border-gray-600 bg-gray-700 py-1 pl-5 pr-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                value={form.groupDiscounts[tier.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((f) => ({
                                    ...f,
                                    groupDiscounts: {
                                      ...f.groupDiscounts,
                                      [tier.id]: val,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Discount Amount */
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Discount Amount (£) <span className="text-gray-500 font-normal">(per ticket)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2 pl-7 pr-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. 10.00"
              value={form.discountAmount}
              onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to use the per-tier discount set on the Events page.
          </p>
        </div>
      )}

      {/* Validity Period */}
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-300">
          <Calendar className="h-4 w-4 text-gray-400" />
          Validity Period{' '}
          <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start Date</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End Date</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Code only redeemable within this window. Leave blank for no expiry.
        </p>
      </div>

      {/* Events */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Applies To Events <span className="text-red-400">*</span>
        </label>
        <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-600 bg-gray-700 divide-y divide-gray-600">
          {events.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">No events available.</p>
          )}
          {events.map((event) => (
            <label
              key={event.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-600 transition-colors"
            >
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
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  pc,
  events,
  onClose,
}: {
  pc: PromoCode;
  events: Event[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PromoForm>({
    code: pc.code,
    influencerName: pc.influencerName,
    socialMedia: pc.socialMedia ?? '',
    discountAmount: pc.discountAmount != null ? String(pc.discountAmount) : '',
    eventIds: pc.events?.map((e) => e.event.id) ?? [],
    startDate: pc.startDate ? new Date(pc.startDate).toISOString().slice(0, 16) : '',
    endDate:   pc.endDate   ? new Date(pc.endDate).toISOString().slice(0, 16)   : '',
    isGroupPromo: pc.groupPromos !== undefined && pc.groupPromos.length > 0,
    minTickets: pc.groupPromos && pc.groupPromos.length > 0 ? String(pc.groupPromos[0].minTickets) : '10',
    groupDiscounts: pc.groupPromos && pc.groupPromos.length > 0
      ? pc.groupPromos.reduce((acc, gp) => ({ ...acc, [gp.ticketTierId]: String(gp.discountAmount) }), {})
      : {},
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updatePromoCode(pc.id, {
        influencerName: form.influencerName.trim(),
        socialMedia: form.socialMedia.trim() || null,
        discountAmount: form.isGroupPromo ? null : (form.discountAmount !== '' ? Number(form.discountAmount) : null),
        eventIds: form.eventIds,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isGroupPromo: form.isGroupPromo,
        minTickets: form.isGroupPromo ? parseInt(form.minTickets) : 10,
        groupDiscounts: form.isGroupPromo
          ? Object.entries(form.groupDiscounts)
              .filter(([_, amt]) => amt !== '')
              .map(([tierId, amt]) => ({ tierId, discountAmount: Number(amt) }))
          : [],
      }),
    onSuccess: (res) => {
      toast.success('Promo code updated!');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      onClose();
      if (res.data.warnings?.length) showWarnings(res.data.warnings);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to update promo code.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.influencerName.trim()) return toast.error('Influencer name is required.');
    if (form.eventIds.length === 0) return toast.error('Select at least one event.');
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      return toast.error('End date must be after start date.');
    }
    updateMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Promo Code</h2>
            <p className="mt-0.5 font-mono text-sm text-purple-300">{pc.code}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <PromoFormFields form={form} setForm={setForm} events={events} isEdit />
          </div>

          {/* Modal footer */}
          <div className="flex gap-3 border-t border-gray-700 px-6 py-4">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
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
        discountAmount: form.isGroupPromo ? null : (form.discountAmount !== '' ? Number(form.discountAmount) : null),
        eventIds: form.eventIds,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isGroupPromo: form.isGroupPromo,
        minTickets: form.isGroupPromo ? parseInt(form.minTickets) : 10,
        groupDiscounts: form.isGroupPromo
          ? Object.entries(form.groupDiscounts)
              .filter(([_, amt]) => amt !== '')
              .map(([tierId, amt]) => ({ tierId, discountAmount: Number(amt) }))
          : [],
      }),
    onSuccess: (res) => {
      toast.success('Promo code created!');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      if (res.data.warnings?.length) showWarnings(res.data.warnings);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to create promo code.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.togglePromoCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] }),
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

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Promo code is required.');
    if (!form.influencerName.trim()) return toast.error('Influencer name is required.');
    if (form.eventIds.length === 0) return toast.error('Select at least one event.');
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      return toast.error('End date must be after start date.');
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editTarget && (
        <EditModal
          pc={editTarget}
          events={events}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Promo Codes</h1>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Promo Code
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-white">Create Promo Code</h2>
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <PromoFormFields form={form} setForm={setForm} events={events} />
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Promo Code'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                className="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">Loading…</div>
        ) : promoCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Tag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No promo codes yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-700/60 border-b border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Influencer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Events</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Discount</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Valid Period</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Uses</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-300">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {promoCodes.map((pc) => (
                <tr key={pc.id} className="hover:bg-gray-700/40 transition-colors">
                  {/* Code */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded tracking-wider">
                        {pc.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(pc.code)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        title="Copy code"
                      >
                        {copied === pc.code
                          ? <Check className="h-3.5 w-3.5 text-green-400" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {pc.socialMedia && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[160px]">{pc.socialMedia}</p>
                    )}
                  </td>

                  {/* Influencer */}
                  <td className="px-4 py-3 text-gray-300 font-medium">{pc.influencerName}</td>

                  {/* Events */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pc.events && pc.events.length > 0 ? (
                        pc.events.map((pe) => (
                          <span
                            key={pe.event.id}
                            className="rounded bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-800"
                          >
                            {pe.event.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </div>
                  </td>

                  {/* Discount */}
                  <td className="px-4 py-3 text-center">
                    {pc.groupPromos && pc.groupPromos.length > 0 ? (
                      <div className="flex flex-col gap-0.5 items-center">
                        <span className="rounded bg-purple-900/60 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 uppercase tracking-wide ring-1 ring-purple-700">
                          Group ({pc.groupPromos[0].minTickets}+)
                        </span>
                        <div className="text-[10px] text-gray-400 max-w-[120px] truncate" title={pc.groupPromos.map(gp => `${gp.ticketTier?.name || 'Tier'}: £${Number(gp.discountAmount).toFixed(0)}`).join(', ')}>
                          {pc.groupPromos.map(gp => `${gp.ticketTier?.name || 'Tier'}: £${Number(gp.discountAmount).toFixed(0)}`).join(', ')}
                        </div>
                      </div>
                    ) : pc.discountAmount != null ? (
                      <span className="font-semibold text-green-400">
                        £{Number(pc.discountAmount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Per tier</span>
                    )}
                  </td>

                  {/* Valid Period */}
                  <td className="px-4 py-3">
                    {pc.startDate || pc.endDate ? (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3 shrink-0 text-gray-500" />
                        <span>
                          {pc.startDate ? formatDate(pc.startDate) : '—'}
                          {' → '}
                          {pc.endDate ? formatDate(pc.endDate) : 'No expiry'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 italic">No expiry</span>
                    )}
                  </td>

                  {/* Uses */}
                  <td className="px-4 py-3 text-center font-medium text-gray-300">{pc.usageCount}</td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <StatusBadge pc={pc} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditTarget(pc)}
                        className="text-gray-500 hover:text-purple-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(pc.id)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        title={pc.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {pc.isActive
                          ? <ToggleRight className="h-5 w-5 text-green-400" />
                          : <ToggleLeft className="h-5 w-5" />}
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
