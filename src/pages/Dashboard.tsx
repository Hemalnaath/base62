import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../utils/validators';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Link2, Sparkles, Calendar, ShieldAlert, Copy, Check, BarChart3,
  QrCode, Pencil, Trash2, ArrowUpRight, Upload, Clock, Plus,
  HelpCircle, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Loader2, X
} from 'lucide-react';
import api from '../services/api';
import { Url } from '../types';
import { formatRelativeTime, getExpiryState, truncateUrl } from '../utils/formatters';
import QRModal from '../components/QRModal';
import BulkImport from '../components/BulkImport';

// Zod schema matching custom alias & expiry date rules
const shortenSchema = z.object({
  original_url: z.string()
    .min(1, 'Long URL is required.')
    .refine((val) => {
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, { message: 'Destination link must start with http:// or https://' }),
  custom_alias: z.string()
    .optional()
    .or(z.literal(''))
    .transform(e => e === '' ? undefined : e)
    .refine(val => !val || (val.length >= 8 && val.length <= 100), 'Alias must contain 8-100 characters.')
    .refine(val => !val || /^[a-zA-Z0-9\-_]+$/.test(val), 'Only [a-zA-Z0-9-_] characters are permitted.'),
  expires_at: z.string()
    .optional()
    .or(z.literal(''))
    .transform(e => e === '' ? undefined : e)
    .refine(val => {
      if (!val) return true;
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      // Allow dates starting from 1 minute ago to handle the current minute selection race condition
      return d.getTime() > Date.now() - 60000;
    }, 'Expiration must be scheduled in the future.'),
  is_public: z.boolean().default(false)
});

type ShortenFormData = z.infer<typeof shortenSchema>;

export default function Dashboard() {
  const [urls, setUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Modals / Overlays triggers
  const [selectedQrUrl, setSelectedQrUrl] = useState<Url | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState<Url | null>(null);
  const [editLongUrl, setEditLongUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const navigate = useNavigate();
  const limit = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ShortenFormData>({
    resolver: zodResolver(shortenSchema),
    mode: 'onBlur'
  });

  const fetchUrls = async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page;
    setLoading(true);
    try {
      const offset = (targetPage - 1) * limit;
      const res = await api.get(`/urls?limit=${limit}&offset=${offset}`);
      
      if (resetPage) {
        setUrls(res.data);
      } else {
        setUrls(prev => targetPage === 1 ? res.data : [...prev, ...res.data]);
      }
      setHasMore(res.data.length === limit);
    } catch (err: any) {
      toast.error('Failed to load shortened entries registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls(true);
  }, []);

  const handleShorten = async (data: ShortenFormData) => {
    try {
      const res = await api.post('/urls', data);
      toast.success('Your shortened link is ready!');
      
      // Inject at top of list
      setUrls(prev => [res.data, ...prev]);
      reset();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to generate link.';
      toast.error(msg);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Copied link redirect to clipboard!');
    
    // Auto-revert 'Copied' state back after 2 seconds
    setTimeout(() => {
      setCopiedUrl(null);
    }, 2000);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/urls/${id}`);
      setUrls(prev => prev.filter(item => item.id !== id));
      toast.success('Short link deactivated successfully.');
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error('Could not deactivate target short link.');
    }
  };

  const handleStartEdit = (item: Url) => {
    setEditingUrl(item);
    setEditLongUrl(item.originalUrl);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUrl) return;
    setEditError(null);

    try {
      new URL(editLongUrl); // syntax check
    } catch {
      setEditError('Please write a valid URL format starting with HTTP/HTTPS.');
      return;
    }

    try {
      const res = await api.patch(`/urls/${editingUrl.id}`, { original_url: editLongUrl });
      toast.success('Destination target updated successfully!');
      
      setUrls(prev => prev.map(item => item.id === editingUrl.id ? { ...item, originalUrl: res.data.originalUrl } : item));
      setEditingUrl(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to apply modifications.';
      setEditError(msg);
    }
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? page + 1 : Math.max(1, page - 1);
    setPage(newPage);
    
    // Update contents
    setLoading(true);
    setUrls([]);
    const offset = (newPage - 1) * limit;
    api.get(`/urls?limit=${limit}&offset=${offset}`).then(res => {
      setUrls(res.data);
      setHasMore(res.data.length === limit);
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-200 font-sans selection:bg-[#6ee7b7] selection:text-[#0d0d0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Shortener Container panel */}
        <section className="bg-[#121214] border border-white/10 rounded-sm p-5 md:p-6 shadow-none animate-fade-in relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#6ee7b7] font-bold block mb-1">
                Generate Redirection URL
              </label>
              <h2 className="text-lg font-bold tracking-tight text-gray-100 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#6ee7b7]" />
                <span>Shorten destination target links</span>
              </h2>
            </div>
            
            <button
              onClick={() => setShowBulk(!showBulk)}
              className="flex items-center justify-center space-x-1 border border-white/10 hover:bg-white/5 bg-transparent text-gray-300 px-3.5 py-1.5 rounded-sm text-[10px] uppercase tracking-wider font-sans font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <span>{showBulk ? 'Hide Bulk Loader' : 'Load CSV spreadsheet'}</span>
            </button>
          </div>

          {showBulk ? (
            <div className="mb-6 p-4 border border-dashed border-white/10 bg-[#0d0d0f] rounded-sm animate-scale-up">
              <BulkImport
                onImportComplete={() => fetchUrls(true)}
                onClose={() => setShowBulk(false)}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleShorten)} className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                
                {/* Long URL Link Input */}
                <div className="w-full lg:flex-1 space-y-1">
                  <div className="relative">
                    <input
                      {...register('original_url')}
                      type="text"
                      placeholder="Insert long link here (e.g. https://github.com/google/guava)..."
                      className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm pl-4 pr-10 py-3.5 text-sm font-mono text-gray-100 placeholder:text-gray-600 outline-none transition-colors"
                    />
                    <Link2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-550 w-4 h-4" />
                  </div>
                  {errors.original_url?.message && (
                    <p className="text-red-400 text-xs font-mono mt-1">{errors.original_url.message}</p>
                  )}
                </div>

                {/* Submit shortening bar Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full lg:w-auto bg-[#6ee7b7] hover:bg-[#5cd6a5] disabled:opacity-45 text-[#0d0d0f] font-sans font-bold px-8 py-3.5 rounded-sm transition-colors text-xs uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer outline-none min-w-[150px] border border-transparent"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Advanced Configurations collapses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-4 mt-2">
                
                {/* Custom Alias */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    Custom Alias (Optional)
                  </label>
                  <input
                    {...register('custom_alias')}
                    type="text"
                    placeholder="e.g. hackathon-2026"
                    className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm px-4 py-2.5 text-xs font-mono text-gray-100 placeholder:text-gray-650 outline-none transition-colors"
                  />
                  {errors.custom_alias?.message ? (
                    <p className="text-red-400 text-[10px] font-mono leading-none mt-1">{errors.custom_alias.message}</p>
                  ) : (
                    <p className="text-[9px] text-gray-500 font-mono">Min 8 chars: [a-zA-Z0-9-_]</p>
                  )}
                </div>

                {/* Expiry datepicker */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    Expiry Target Dates (Optional)
                  </label>
                  <div className="relative">
                    <input
                      {...register('expires_at')}
                      type="datetime-local"
                      className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm px-4 py-2 text-xs font-mono text-gray-100 outline-none transition-colors"
                    />
                  </div>
                  {errors.expires_at?.message ? (
                    <p className="text-red-400 text-[10px] font-mono leading-none mt-1">{errors.expires_at.message}</p>
                  ) : (
                    <p className="text-[9px] text-gray-500 font-mono">Deactivates links on schedules</p>
                  )}
                </div>

                {/* Make Public toggling */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400">
                    Accessibility Settings
                  </label>
                  <div className="flex items-center h-8">
                    <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                      <input
                        {...register('is_public')}
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/5 border border-white/10 peer-focus:outline-none rounded-sm peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-550 after:border-zinc-350 after:border after:rounded-sm after:h-3 after:w-3 after:transition-all peer-checked:bg-[#6ee7b7]/20 peer-checked:border-[#6ee7b7]/40 peer-checked:after:bg-[#6ee7b7] relative"></div>
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-sans font-bold select-none">
                        Make statistics public
                      </span>
                    </label>
                  </div>
                  <p className="text-[9px] text-gray-500 font-mono">Allows unauthenticated stats listings</p>
                </div>

              </div>
            </form>
          )}
        </section>

        {/* Shortened Registry Lists */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-sans font-bold text-[#6ee7b7] text-xs uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6ee7b7]"></span>
              Short Links Registry
            </h3>
            <span className="text-[10px] font-mono text-gray-500">
              Capped to 10 entries per list segment
            </span>
          </div>

          {/* Skeletal loader state */}
          {loading && urls.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-[#121214] border border-white/10 rounded-sm animate-pulse w-full"></div>
              ))}
            </div>
          ) : urls.length === 0 ? (
            /* Empty state message */
            <div className="border border-white/10 bg-[#121214] rounded-sm p-12 text-center max-w-lg mx-auto flex flex-col items-center space-y-4">
              <div className="p-3 bg-[#0d0d0f] border border-white/10 rounded-sm">
                <Link2 className="w-6 h-6 text-gray-600 animate-pulse" />
              </div>
              <p className="font-sans font-bold text-gray-300 uppercase text-xs tracking-wider">No links registered</p>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed font-sans">
                Insert an address onto the shorten box above to generate your very first Base62 URL redirect string.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {urls.map(item => {
                const state = getExpiryState(item.expiresAt);
                return (
                  <div
                    key={item.id}
                    className="group bg-[#121214] border border-white/10 hover:border-white/20 rounded-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all pr-5"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Shortened Address link */}
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={item.shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm font-semibold text-[#6ee7b7] hover:underline flex items-center space-x-1"
                        >
                          <span>{item.shortUrl}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#6ee7b7] opacity-60 group-hover:opacity-100 transition-opacity" />
                        </a>

                        {/* Public Link indicator badge */}
                        {item.isPublic && (
                          <Link
                            to={`/public/${item.shortCode}`}
                            style={{ textDecoration: 'none' }}
                            className="bg-indigo-950/20 border border-indigo-500/20 hover:bg-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded-sm font-mono text-[9px] font-semibold transition-colors flex items-center space-x-0.5"
                          >
                            <span>Public stats</span>
                          </Link>
                        )}
                      </div>

                      {/* Destination Address link and custom tooltips on hover */}
                      <div className="relative group/tooltip inline-block max-w-full">
                        <p className="text-gray-500 text-xs font-sans truncate cursor-pointer select-none max-w-md">
                          → {truncateUrl(item.originalUrl, 55)}
                        </p>
                        <div className="pointer-events-none absolute left-0 bottom-full mb-1 opacity-0 group-hover/tooltip:opacity-100 bg-[#0d0d0f] border border-white/10 px-2.5 py-1.5 rounded-sm text-[10px] font-mono text-gray-350 shadow-xl max-w-lg break-all transition-opacity z-10">
                          {item.originalUrl}
                        </div>
                      </div>

                      {/* Auxiliary descriptions grid */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 font-mono text-[10px] text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span>Added {formatRelativeTime(item.createdAt)}</span>
                        </div>

                        {item.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-amber-500/80" />
                            <span>
                              {state === 'expired' ? 'Disabled' : 'Expires'} {formatRelativeTime(item.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Numeric tracking and triggers panel */}
                    <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                      
                      {/* Metric Indicator stats box */}
                      <div className="flex items-center space-x-4 pr-2">
                        <div className="flex items-center space-x-1.5 bg-[#0d0d0f] border border-white/10 px-3 py-1.5 rounded-sm">
                          <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-mono text-xs font-bold text-gray-300">{item.clickCount}</span>
                          <span className="font-sans text-[9px] text-gray-500 uppercase tracking-wider font-bold">Clicks</span>
                        </div>

                        {/* Status Badging */}
                        {state === 'active' && (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                            Active
                          </span>
                        )}
                        {state === 'expiring' && (
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                            Expiring
                          </span>
                        )}
                        {state === 'expired' && (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm animate-pulse">
                            Expired
                          </span>
                        )}
                      </div>

                      {/* Tool Actions icons grid */}
                      <div className="flex items-center space-x-1.5">
                        
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(item.shortUrl)}
                          type="button"
                          className="p-2 bg-[#0d0d0f] border border-white/10 hover:border-[#6ee7b7]/40 rounded-sm text-gray-400 hover:text-gray-100 transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedUrl === item.shortUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* QR Overlay triggering */}
                        <button
                          onClick={() => setSelectedQrUrl(item)}
                          type="button"
                          className="p-2 bg-[#0d0d0f] border border-white/10 hover:border-[#6ee7b7]/40 rounded-sm text-gray-400 hover:text-[#6ee7b7] transition-colors cursor-pointer"
                          title="Generate QR Vector"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Metrics redirect */}
                        <button
                          onClick={() => navigate(`/analytics/${item.id}`)}
                          type="button"
                          className="p-2 bg-[#0d0d0f] border border-white/10 hover:border-indigo-500/40 rounded-sm text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Telemetry Report"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Editing redirect */}
                        <button
                          onClick={() => handleStartEdit(item)}
                          type="button"
                          className="p-2 bg-[#0d0d0f] border border-white/10 hover:border-amber-500/40 rounded-sm text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Modify Target"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Deletions confirmation popup trigger */}
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          type="button"
                          className="p-2 bg-[#0d0d0f] border border-white/10 hover:border-red-500/40 rounded-sm text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Disable Redirect Code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple Pagination layout */}
          {urls.length > 0 && (
            <div className="flex justify-between items-center bg-[#121214] border border-white/10 p-4 rounded-sm font-mono text-[10px] uppercase text-gray-500">
              <button
                disabled={page === 1}
                onClick={() => handlePageChange('prev')}
                className="flex items-center space-x-1 border border-white/10 px-3 py-1.5 rounded-sm hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-all cursor-pointer font-bold tracking-wider"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Page</span>
              </button>
              
              <span>Page {page}</span>

              <button
                disabled={!hasMore}
                onClick={() => handlePageChange('next')}
                className="flex items-center space-x-1 border border-white/10 px-3 py-1.5 rounded-sm hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-all cursor-pointer font-bold tracking-wider"
              >
                <span>Next Page</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

      </div>

      {/* QR MODAL ATTACHED ON TOP */}
      {selectedQrUrl && (
        <QRModal
          shortUrl={selectedQrUrl.shortUrl}
          qrCodeDataUrl={selectedQrUrl.qrCodeDataUrl || ''}
          shortCode={selectedQrUrl.shortCode}
          onClose={() => setSelectedQrUrl(null)}
          onCopyClick={handleCopy}
          copiedUrl={copiedUrl}
        />
      )}

      {/* DELETE CONFIRM OVERLAY */}
      {confirmDeleteId !== null && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          className="fixed inset-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-[#121214] border border-white/10 p-6 rounded-sm relative animate-scale-up"
          >
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-2.5 bg-red-950/15 border border-red-500/25 rounded-sm">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <p className="font-sans font-bold text-gray-150 uppercase text-xs tracking-wider">
                Deactivate code?
              </p>
              <p className="text-xs text-gray-500 leading-relaxed font-sans px-3">
                This soft deactivation instantly returns 410 (Gone) on short redir paths, but retains historic logs to safeguard reporting integrity.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full pt-4">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="py-3.5 rounded-sm border border-white/10 bg-[#0d0d0f] hover:text-gray-105 text-gray-400 font-sans text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="py-3.5 rounded-sm bg-red-550/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-sans font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer animate-pulse"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OVERLAY */}
      {editingUrl !== null && (
        <div
          onClick={() => setEditingUrl(null)}
          className="fixed inset-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-[#121214] border border-white/10 p-6 rounded-sm relative animate-scale-up"
          >
            <button
              onClick={() => setEditingUrl(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-sans font-bold text-[#6ee7b7] text-xs uppercase tracking-widest mb-4 flex items-center space-x-2">
              <Pencil className="w-4 h-4" />
              <span>Modify target address</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold font-sans">Active Shortened Path</label>
                <p className="bg-[#0d0d0f] border border-white/10 rounded-sm px-4 py-3 text-xs font-mono text-gray-400 truncate">
                  {editingUrl.shortUrl}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold font-sans">Destination Address *</label>
                <input
                  type="text"
                  value={editLongUrl}
                  onChange={e => setEditLongUrl(e.target.value)}
                  placeholder="https://example.com/long-page-target"
                  className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm px-4 py-3 text-xs font-mono text-gray-200 outline-none transition-colors"
                />
                {editError && (
                  <p className="text-red-400 text-[10px] font-mono mt-1">{editError}</p>
                )}
              </div>

              <p className="text-[10px] text-gray-500 font-mono leading-relaxed bg-[#0d0d0f] p-3 border border-white/10 rounded-sm mt-2">
                Note: Updating the destination path automatically clears its record from high-frequency edge caches.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setEditingUrl(null)}
                  className="px-4 py-2 bg-transparent text-gray-500 hover:text-gray-300 transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-[#6ee7b7] hover:bg-[#5cd6a5] text-[#0d0d0f] font-sans font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
