import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Link2, Eye, Calendar, Sparkles, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function Public() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicStats = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await axios.get(`/api/urls/${shortCode}/public`);
        setStats(res.data);
      } catch (error: any) {
        const msg = error.response?.data?.error || 'Statistics for this link are confidential or the link does not exist.';
        setErr(msg);
      } finally {
        setLoading(false);
      }
    };

    if (shortCode) {
      fetchPublicStats();
    }
  }, [shortCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] text-gray-200 flex flex-col justify-center items-center p-4">
        <Loader2 className="w-6 h-6 text-[#6ee7b7] animate-spin mb-2" />
        <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">Loading public telemetry logs...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-200 font-sans flex flex-col justify-center items-center p-4 selection:bg-[#6ee7b7] selection:text-[#0d0d0f]">
      
      {/* Brand Launcher banner */}
      <div className="mb-6 flex items-center space-x-2">
        <div className="p-1.5 bg-[#6ee7b7]/10 border border-[#6ee7b7]/20 rounded-sm">
          <Link2 className="w-5 h-5 text-[#6ee7b7]" />
        </div>
        <span className="text-md font-bold tracking-tight text-gray-100">
          BASE<span className="text-[#6ee7b7] font-mono font-bold">62</span>
        </span>
      </div>

      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-sm p-6 shadow-none relative animate-scale-up">
        
        {err ? (
          /* Error feedback panel */
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex p-2.5 bg-red-950/20 border border-red-500/20 rounded-sm text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold uppercase tracking-wider text-gray-200 text-xs">Telemetry Confidential</h3>
            <p className="text-xs text-gray-500 font-sans leading-relaxed px-2">
              {err}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-gray-400 hover:text-gray-200 border border-white/10 px-4 py-2 bg-transparent rounded-sm transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Stats displays */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="inline-block bg-[#6ee7b7]/10 text-[#6ee7b7] px-2.5 py-0.5 rounded-sm font-mono text-[9px] font-bold uppercase tracking-wider mb-2">
                Public Statistics
              </span>
              <h3 className="font-sans font-medium text-lg text-gray-200 truncate pr-2">
                /{shortCode}
              </h3>
              <p className="text-[10px] text-gray-550 font-mono tracking-wider truncate px-6">
                {stats.shortUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[#0d0d0f] border border-white/10 rounded-sm space-y-1 text-center">
                <div className="flex items-center justify-center space-x-1 text-gray-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Total Clicks</span>
                </div>
                <p className="text-2xl font-bold font-mono text-[#6ee7b7]">{stats.totalClicks}</p>
              </div>

              <div className="p-4 bg-[#0d0d0f] border border-white/10 rounded-sm space-y-1 text-center flex flex-col justify-center">
                <div className="flex items-center justify-center space-x-1 text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Created</span>
                </div>
                <p className="text-[10px] font-bold text-gray-300 font-mono pt-1">
                  {new Date(stats.createdAt).toLocaleDateString()}
                </p>
                <span className="text-[8px] text-gray-500 font-mono">
                  {new Date(stats.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <p className="text-[9px] text-gray-500 font-mono text-center leading-relaxed">
              * Showing aggregate clicks counts and timeline. IP, country, geo locations, and user client metadata are hidden to maintain visitor anonymity.
            </p>

            <div className="border-t border-white/10 pt-4 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-[#6ee7b7] hover:text-[#5cd6a5] font-sans"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
