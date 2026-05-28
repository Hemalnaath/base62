import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, BarChart3, Clock, Calendar, ShieldAlert,
  Loader2, Globe, Laptop, Compass, HeartHandshake, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { AnalyticsData } from '../types';
import { formatRelativeTime } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlInfo, setUrlInfo] = useState<any>(null);
  
  const navigate = useNavigate();

  // Color arrays matching refined dark minimal-brutalist layouts
  const PALETTE = ['#6ee7b7', '#818cf8', '#22d3ee', '#fb7185', '#fb923c', '#c084fc'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch original url details
        const urlRes = await api.get(`/urls/${id}`);
        setUrlInfo(urlRes.data);

        // Fetch detailed statistical aggregations
        const statsRes = await api.get(`/urls/${id}/analytics`);
        setData(statsRes.data);
      } catch (err: any) {
        toast.error('Could not load analytics logs.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAnalytics();
    }
  }, [id, navigate]);

  if (loading || !data || !urlInfo) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] text-gray-200 p-8 flex flex-col justify-center items-center space-y-3">
        <Loader2 className="w-6 h-6 text-[#6ee7b7] animate-spin" />
        <span className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">Retrieving click telemetry tables...</span>
      </div>
    );
  }

  // Formatting chart dates nicely for daily traffic
  const dailyChartData = data.clicksByDay.map(item => ({
    date: item.date ? item.date.substring(5) : 'Unknown', // e.g. '05-27'
    Clicks: item.clicks
  }));

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-200 font-sans selection:bg-[#6ee7b7] selection:text-[#0d0d0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Breadcrumb Navigation header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
              <Link to="/dashboard" className="hover:text-[#6ee7b7] transition-colors font-bold">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-[#6ee7b7] font-bold">Analytics Reports</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-100 uppercase font-sans">
              Analytics for <span className="font-mono text-[#6ee7b7]/90 text-lg tracking-normal lowercase">{urlInfo.shortCode}</span>
            </h2>
            <p className="text-[11px] font-mono text-gray-500 truncate max-w-xl pr-4 select-all">
              → {urlInfo.originalUrl}
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-1.5 border border-white/10 hover:bg-white/5 bg-transparent text-gray-300 px-4 py-2 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#6ee7b7]" />
            <span>Back</span>
          </button>
        </div>

        {/* Hero KPI Stats Grid row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#121214] border border-white/10 p-5 rounded-sm space-y-1.5">
            <span className="text-[10px] uppercase text-gray-500 tracking-widest block font-bold">Total Click Volume</span>
            <p className="text-3xl font-light font-mono tracking-tighter text-[#6ee7b7]">{data.totalClicks}</p>
            <span className="text-[9px] text-gray-650 block font-mono">Unique visitor paths decoded</span>
          </div>

          <div className="bg-[#121214] border border-white/10 p-5 rounded-sm space-y-1.5">
            <span className="text-[10px] uppercase text-gray-500 tracking-widest block font-bold">Last Visited</span>
            <p className="text-lg font-light truncate text-gray-200 mt-1">
              {data.lastVisited ? formatRelativeTime(data.lastVisited) : 'Never visited'}
            </p>
            <span className="text-[9px] text-gray-650 block font-mono">Relative redirection delay</span>
          </div>

          <div className="bg-[#121214] border border-white/10 p-5 rounded-sm space-y-1.5">
            <span className="text-[10px] uppercase text-gray-500 tracking-widest block font-bold">Created Date</span>
            <p className="text-lg font-light text-gray-200 mt-1">
              {formatRelativeTime(urlInfo.createdAt)}
            </p>
            <span className="text-[9px] text-gray-650 block font-mono">Deployment start date</span>
          </div>

          <div className="bg-[#121214] border border-white/10 p-5 rounded-sm space-y-1.5">
            <span className="text-[10px] uppercase text-gray-500 tracking-widest block font-bold">Expiry Status</span>
            <div className="flex items-center space-x-1.5 pt-1">
              <span className={`h-1.5 w-1.5 rounded-full ${urlInfo.expiresAt ? 'bg-amber-400' : 'bg-[#6ee7b7]'}`}></span>
              <span className="text-xs font-mono font-bold text-gray-300">
                {urlInfo.expiresAt ? 'Schedules active' : 'Indefinite'}
              </span>
            </div>
            <span className="text-[9px] text-gray-650 block font-mono">Expiration constraints</span>
          </div>

        </div>

        {/* Chart row 1: Line graph */}
        <section className="bg-[#121214] border border-white/10 rounded-sm p-5 shadow-none">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#6ee7b7] font-bold mb-4 flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-[#6ee7b7]" />
            <span>Redirection Over Time (Last 30 Days)</span>
          </h3>
          
          <div className="h-64 sm:h-80 w-full">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 font-mono text-xs">
                No telemetry redirection recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232328" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#4b5563"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="font-mono"
                  />
                  <YAxis
                    stroke="#4b5563"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="font-mono"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121214',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      fontSize: '11px',
                      color: '#e5e7eb',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Clicks"
                    stroke="#6ee7b7"
                    strokeWidth={2}
                    activeDot={{ r: 5 }}
                    dot={{ r: 2, fill: '#121214', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Charts row 2: Devices (Pie) and Countries (Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Device Type Donuts */}
          <div className="bg-[#121214] border border-white/10 rounded-sm p-5 shadow-none">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-4 flex items-center space-x-2">
              <Laptop className="w-3.5 h-3.5 text-[#818cf8]" />
              <span>Devices breakdown</span>
            </h3>

            <div className="h-60 flex flex-col items-center justify-center relative">
              {data.clicksByDevice.length === 0 ? (
                <span className="text-xs font-mono text-gray-500">Empty dataset</span>
              ) : (
                <div className="relative w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.clicksByDevice}
                        dataKey="clicks"
                        nameKey="device_type"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {data.clicksByDevice.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121214',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '2px',
                          fontSize: '11px',
                          color: '#e5e7eb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered stats labels */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[15%] text-center">
                    <span className="block font-mono text-xl font-bold text-gray-200">{data.totalClicks}</span>
                    <span className="block text-[8px] font-sans text-gray-500 uppercase tracking-widest leading-none">Clicks</span>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Legends list */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 font-mono text-[9px] uppercase tracking-wider">
              {data.clicksByDevice.map((item, index) => (
                <div key={item.device_type} className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }}></span>
                  <span className="text-gray-425 capitalize">{item.device_type}:</span>
                  <span className="text-gray-200 font-bold">{item.clicks}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Geo Countries (Bar) */}
          <div className="bg-[#121214] border border-white/10 rounded-sm p-5 lg:col-span-2 shadow-none">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-4 flex items-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span>Geosurveys (Top Countries)</span>
            </h3>

            <div className="h-64 w-full">
              {data.clicksByCountry.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-550 font-mono text-xs">
                  Awaiting visitor telemetry...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.clicksByCountry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232328" vertical={false} />
                    <XAxis
                      dataKey="country"
                      stroke="#4b5563"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                    />
                    <YAxis
                      stroke="#4b5563"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      className="font-mono"
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                      contentStyle={{
                        backgroundColor: '#121214',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        color: '#e5e7eb'
                      }}
                    />
                    <Legend content={() => null} />
                    <Bar dataKey="clicks" fill="#22d3ee" barSize={25} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* Row 3: Top Browsers & Recent Event table logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top browsers list */}
          <div className="bg-[#121214] border border-white/10 rounded-sm p-5 flex flex-col justify-between shadow-none">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-4 flex items-center space-x-2">
                <Compass className="w-3.5 h-3.5 text-[#fb7185]" />
                <span>Client Browsers (Top 5)</span>
              </h3>

              <div className="space-y-4 pt-2">
                {data.clicksByBrowser.length === 0 ? (
                  <div className="text-center py-8 text-gray-550 font-mono text-xs">No browser logs parsed.</div>
                ) : (
                  data.clicksByBrowser.map((item, index) => {
                    const pct = Math.round((item.clicks / data.totalClicks) * 100) || 0;
                    return (
                      <div key={item.browser} className="space-y-1 font-mono text-xs">
                        <div className="flex justify-between text-gray-450 text-[10px] uppercase">
                          <span>{item.browser}</span>
                          <span className="text-gray-300 font-bold">{item.clicks} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-[#0d0d0f] border border-white/5 h-1 rounded-none overflow-hidden">
                          <div
                            className="bg-[#fb7185] h-full rounded-none transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-white/10 mt-4 pt-3 text-[9px] text-[#6ee7b7]/60 font-mono uppercase tracking-wider">
              Parses browser names and dynamic engines.
            </div>
          </div>

          {/* Visits Table */}
          <div className="bg-[#121214] border border-white/10 rounded-sm p-5 lg:col-span-2 shadow-none">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-3 flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Realtime events registry (Last 20 keys)</span>
            </h3>

            <div className="overflow-x-auto w-full border border-white/10 rounded-sm">
              <table className="min-w-full text-left font-mono text-[10px] text-gray-400 divide-y divide-white/10">
                <thead className="bg-[#0d0d0f] text-gray-400 text-[9px] font-sans font-bold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-3.5 py-3">Timestamp</th>
                    <th className="px-3.5 py-3">Geo Origin</th>
                    <th className="px-3.5 py-3">Platform OS</th>
                    <th className="px-3.5 py-3">Web Engine</th>
                    <th className="px-3.5 py-3">Referrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {data.recentVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-bold uppercase text-[9px] tracking-wider">
                        No telemetry events parsed.
                      </td>
                    </tr>
                  ) : (
                    data.recentVisits.map((v, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.015] transition-colors">
                        <td className="px-3.5 py-3.5 whitespace-nowrap text-[#6ee7b7]/80">
                          {new Date(v.clicked_at).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-3.5 whitespace-nowrap max-w-[120px] truncate text-gray-300">
                          {v.city && v.city !== 'Unknown' ? `${v.city}, ` : ''}{v.country || 'Unknown'}
                        </td>
                        <td className="px-3.5 py-3.5 capitalize whitespace-nowrap">{v.os || 'Desktop OS'}</td>
                        <td className="px-3.5 py-3.5 whitespace-nowrap max-w-[120px] truncate">{v.browser || 'Browser API'}</td>
                        <td className="px-3.5 py-3.5 whitespace-nowrap max-w-[150px] truncate text-indigo-400 font-semibold">{v.referrer}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
