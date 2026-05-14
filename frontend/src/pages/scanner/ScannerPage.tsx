import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, CameraOff, Search, X, CheckCircle2, XCircle, AlertTriangle, Keyboard } from 'lucide-react';
import { format } from 'date-fns';
import jsQR from 'jsqr';
import { scannerApi } from '../../api/scanner';

type ScanResult = {
  valid: boolean;
  reason: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID_TICKET';
  message: string;
  ticket?: {
    id?: string;
    holder?: string;
    email?: string;
    tier?: string;
    event?: string;
    isBypassed?: boolean;
    scannedAt?: string;
    checkedInAt?: string;
    eventDate?: string;
    location?: string;
  };
};

type SearchResult = {
  ticketId: string;
  holder: string;
  email: string;
  tier: string;
  event: string;
  eventDate: string;
  isBypassed?: boolean;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  scannedAt?: string;
};

export function ScannerPage() {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');

  const scanMutation = useMutation({
    mutationFn: (id: string) => scannerApi.scan(id).then((r) => r.data),
    onSuccess: (data) => { setScanResult(data); setIsScanning(false); },
    onError: (err: any) => {
      const d = err?.response?.data;
      setScanResult(d ?? { valid: false, reason: 'INVALID_TICKET', message: 'Ticket not found.' });
      setIsScanning(false);
    },
  });

  const doScan = useCallback((ticketId: string) => {
    if (isScanning || ticketId === lastScannedRef.current) return;
    lastScannedRef.current = ticketId;
    setIsScanning(true);
    scanMutation.mutate(ticketId);
    // Allow re-scanning same ticket after 5s
    setTimeout(() => { lastScannedRef.current = ''; }, 5000);
  }, [isScanning, scanMutation]);

  // Camera loop
  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code?.data && !isScanning) {
          doScan(code.data);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [isScanning, doScan]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          startScanLoop();
        };
      }
    } catch (e) {
      setCameraError('Camera access denied. Use manual entry below.');
      setMode('manual');
    }
  }, [startScanLoop]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (mode === 'camera') startCamera();
    return () => stopCamera();
  }, [mode]);

  // Restart scan loop when isScanning changes
  useEffect(() => {
    if (cameraActive && !isScanning && !scanResult) {
      cancelAnimationFrame(rafRef.current);
      startScanLoop();
    }
  }, [isScanning, cameraActive, scanResult]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    doScan(manualInput.trim());
    setManualInput('');
  };

  const dismissResult = () => {
    setScanResult(null);
    lastScannedRef.current = '';
    setIsScanning(false);
    if (mode === 'camera' && cameraActive) startScanLoop();
  };

  return (
    <div className="relative min-h-screen bg-gray-950">

      {/* ── Full-screen scan result overlay ───────────────────────── */}
      {scanResult && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 ${
          scanResult.valid ? 'bg-green-950' : scanResult.reason === 'ALREADY_USED' ? 'bg-yellow-950' : 'bg-red-950'
        }`}>
          {/* Icon */}
          <div className="mb-6">
            {scanResult.valid
              ? <CheckCircle2 className="w-28 h-28 text-green-400" strokeWidth={1.5} />
              : scanResult.reason === 'ALREADY_USED'
              ? <AlertTriangle className="w-28 h-28 text-yellow-400" strokeWidth={1.5} />
              : <XCircle className="w-28 h-28 text-red-400" strokeWidth={1.5} />
            }
          </div>

          {/* Result text */}
          <p className={`text-4xl font-black tracking-wide mb-2 ${
            scanResult.valid ? 'text-green-300' : scanResult.reason === 'ALREADY_USED' ? 'text-yellow-300' : 'text-red-300'
          }`}>
            {scanResult.valid ? 'ADMIT' : scanResult.reason === 'ALREADY_USED' ? 'ALREADY USED' : 'DENIED'}
          </p>

          {/* Ticket details */}
          {scanResult.ticket && (
            <div className="mt-4 w-full max-w-sm bg-black/30 rounded-2xl p-5 space-y-2 text-center">
              {(scanResult.ticket.holder) && (
                <p className="text-2xl font-bold text-white">{scanResult.ticket.holder}</p>
              )}
              {scanResult.ticket.email && (
                <p className="text-sm text-gray-400">{scanResult.ticket.email}</p>
              )}
              <div className="border-t border-white/10 pt-3 space-y-1.5">
                {scanResult.ticket.event && (
                  <p className="text-sm text-gray-300">{scanResult.ticket.event}</p>
                )}
                {scanResult.ticket.tier && (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    scanResult.valid ? 'bg-green-800 text-green-200' : 'bg-gray-800 text-gray-300'
                  }`}>
                    {scanResult.ticket.tier.toUpperCase()}
                  </span>
                )}
                {scanResult.ticket.isBypassed && (
                  <p className="text-xs text-orange-400 font-semibold">COMPLIMENTARY TICKET</p>
                )}
                {scanResult.ticket.scannedAt && (
                  <p className="text-xs text-yellow-400">
                    Previously scanned: {format(new Date(scanResult.ticket.scannedAt), 'MMM d · h:mm:ss a')}
                  </p>
                )}
                {scanResult.ticket.checkedInAt && (
                  <p className="text-xs text-green-400">
                    Checked in: {format(new Date(scanResult.ticket.checkedInAt), 'MMM d · h:mm:ss a')}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={dismissResult}
            className="mt-8 px-10 py-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-lg transition-all"
          >
            Scan Next
          </button>
        </div>
      )}

      {/* ── Main scanner UI ────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Ticket Scanner</h1>
            {isScanning && (
              <span className="text-xs text-primary-400 animate-pulse font-medium">Verifying...</span>
            )}
          </div>
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === 'camera' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Camera className="w-4 h-4" /> Camera
            </button>
            <button
              onClick={() => { stopCamera(); setMode('manual'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Keyboard className="w-4 h-4" /> Manual
            </button>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {/* Camera view */}
          {mode === 'camera' && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Camera className="w-12 h-12 text-gray-600 mx-auto animate-pulse" />
                    <p className="text-gray-500 text-sm">Starting camera…</p>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <CameraOff className="w-12 h-12 text-red-500 mx-auto" />
                    <p className="text-gray-400 text-sm">{cameraError}</p>
                  </div>
                </div>
              )}

              {/* Scanning frame overlay */}
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    {/* Corner markers */}
                    {[['top-0 left-0', 'border-t-4 border-l-4 rounded-tl-lg'],
                      ['top-0 right-0', 'border-t-4 border-r-4 rounded-tr-lg'],
                      ['bottom-0 left-0', 'border-b-4 border-l-4 rounded-bl-lg'],
                      ['bottom-0 right-0', 'border-b-4 border-r-4 rounded-br-lg'],
                    ].map(([pos, border]) => (
                      <div key={pos} className={`absolute w-8 h-8 border-primary-400 ${pos} ${border}`} />
                    ))}
                    {/* Scan line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary-400/60 animate-pulse" />
                  </div>
                </div>
              )}

              {cameraActive && (
                <div className="absolute bottom-4 inset-x-0 text-center">
                  <span className="bg-black/60 text-gray-300 text-xs px-3 py-1.5 rounded-full">
                    Point camera at QR code
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Manual entry */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <input
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-primary-500 pr-12"
                  placeholder="Paste or type ticket ID…"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  autoFocus
                />
                {manualInput && (
                  <button type="button" onClick={() => setManualInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-bold text-base transition-all disabled:opacity-40"
                disabled={!manualInput.trim() || isScanning}
              >
                {isScanning ? 'Verifying…' : 'Verify Ticket'}
              </button>
            </form>
          )}

          {/* Search */}
          <TicketSearch onCheckIn={(id) => doScan(id)} />
        </div>
      </div>
    </div>
  );
}

function TicketSearch({ onCheckIn }: { onCheckIn: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setIsSearching(true);
    setSearched(true);
    try {
      const res = await scannerApi.search(q.trim());
      setResults(res.data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'VALID' ? 'bg-green-900 text-green-300' : s === 'CHECKED_IN' ? 'bg-gray-800 text-gray-400' : 'bg-red-900 text-red-300';

  return (
    <div className="space-y-3 pt-2 border-t border-gray-800">
      <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
        <Search className="w-4 h-4" /> Search Attendee
      </h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary-500"
          placeholder="Name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm transition-all disabled:opacity-40"
          disabled={isSearching || q.trim().length < 2}
        >
          {isSearching ? '…' : 'Search'}
        </button>
      </form>

      {searched && results.length === 0 && !isSearching && (
        <p className="text-gray-600 text-sm text-center py-4">No tickets found</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.ticketId} className="bg-gray-900 rounded-xl p-4 space-y-2 border border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white text-sm">{r.holder}</p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(r.status)}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>{r.event}</p>
                <p>{r.tier} · {format(new Date(r.eventDate), 'MMM d, yyyy')}</p>
                {r.isBypassed && <p className="text-orange-500">Complimentary</p>}
                {r.scannedAt && <p className="text-green-600">Scanned {format(new Date(r.scannedAt), 'MMM d · h:mm a')}</p>}
              </div>
              {r.status === 'VALID' && (
                <button
                  onClick={() => onCheckIn(r.ticketId)}
                  className="w-full py-2.5 rounded-lg bg-green-800 hover:bg-green-700 active:scale-95 text-green-200 font-semibold text-sm transition-all"
                >
                  ✓ Check In Manually
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
