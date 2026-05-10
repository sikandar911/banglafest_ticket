import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ScanLine, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { scannerApi } from '../../api/scanner';
import { Spinner } from '../../components/ui/Spinner';
import type { ScanResponse, Ticket } from '../../types';

export function ScannerPage() {
  const [uuid, setUuid] = useState('');
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);

  const scanMutation = useMutation({
    mutationFn: (id: string) => scannerApi.scan(id).then((r) => r.data),
    onSuccess: (data) => { setLastResult(data); setUuid(''); },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid.trim()) return;
    scanMutation.mutate(uuid.trim());
  };

  const resultIcon = lastResult
    ? lastResult.result === 'VALID'
      ? <CheckCircle2 className="w-16 h-16 text-green-400" />
      : lastResult.result === 'ALREADY_USED'
      ? <AlertCircle className="w-16 h-16 text-yellow-400" />
      : <XCircle className="w-16 h-16 text-red-400" />
    : null;

  const resultColor = lastResult
    ? lastResult.result === 'VALID'
      ? 'border-green-700 bg-green-950'
      : lastResult.result === 'ALREADY_USED'
      ? 'border-yellow-700 bg-yellow-950'
      : 'border-red-700 bg-red-950'
    : '';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ScanLine className="w-7 h-7 text-primary-400" /> Ticket Scanner
        </h1>
        <p className="text-gray-400 mt-1">Scan or enter a ticket UUID to verify entry</p>
      </div>

      {/* Scan form */}
      <form onSubmit={handleScan} className="card space-y-4">
        <div>
          <label className="label">Ticket UUID / QR Code</label>
          <input
            className="input font-mono"
            placeholder="Enter UUID or scan QR code..."
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={scanMutation.isPending || !uuid.trim()}>
          {scanMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Verify Ticket'}
        </button>
      </form>

      {/* Result */}
      {lastResult && (
        <div className={`card border-2 ${resultColor} text-center space-y-3`}>
          <div className="flex justify-center">{resultIcon}</div>
          <p className="text-xl font-bold text-white">{lastResult.message}</p>
          {lastResult.ticket && (
            <div className="text-sm text-gray-400 space-y-1">
              <p>Event: <span className="text-white">{lastResult.ticket.event}</span></p>
              <p>Tier: <span className="text-white">{lastResult.ticket.tier}</span></p>
              {lastResult.ticket.holderName && (
                <p>Holder: <span className="text-white">{lastResult.ticket.holderName}</span></p>
              )}
              {lastResult.ticket.scannedAt && (
                <p className="text-yellow-400">Scanned at: {format(new Date(lastResult.ticket.scannedAt), 'MMM d, h:mm:ss a')}</p>
              )}
            </div>
          )}
          <button className="btn-secondary text-sm" onClick={() => setLastResult(null)}>Clear</button>
        </div>
      )}

      {/* Search */}
      <TicketSearch />
    </div>
  );
}

function TicketSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Ticket[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setIsSearching(true);
    try {
      const res = await scannerApi.search(q.trim());
      setResults(res.data.tickets);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" /> Search Tickets
      </h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Search by email or name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          minLength={2}
        />
        <button type="submit" className="btn-secondary" disabled={isSearching || q.trim().length < 2}>
          {isSearching ? <Spinner className="w-4 h-4" /> : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((ticket) => (
            <div key={ticket.id} className="card text-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-mono text-gray-400 text-xs">{ticket.uuid}</p>
                {ticket.scannedAt
                  ? <span className="badge-sold-out">Used</span>
                  : <span className="badge-available">Valid</span>}
              </div>
              <p className="text-white font-medium">{ticket.order?.tier?.event?.title}</p>
              <p className="text-gray-400">{ticket.order?.tier?.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
