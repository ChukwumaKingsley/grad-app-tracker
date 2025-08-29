import React, { useEffect, useMemo, useState } from 'react';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FaThLarge, FaList, FaPlus } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { SkeletonCard } from './SkeletonLoader';
import { SkeletonListTable } from './SkeletonListTable';
import { createPortal } from 'react-dom';

// Format date and compute simple day-countdown
function formatDateCountdown(dateStr) {
  if (!dateStr) return { formatted: '', countdown: '', isPast: false };
  const date = new Date(dateStr);
  const now = new Date();
  // normalize to days
  const diff = Math.round((date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  const options = { year: '2-digit', month: 'short', day: 'numeric' };
  const formatted = date.toLocaleDateString('en-US', options);
  const countdown = diff === 0 ? 'Today' : (diff > 0 ? `${diff} day${diff === 1 ? '' : 's'}` : `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`);
  return { formatted, countdown, isPast: diff < 0 };
}

const LevelTag = ({ level = '' }) => (
  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-slate-100 font-bold">{level.toLowerCase().includes('phd') ? 'PhD' : 'MSc'}</span>
);

export default function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState(() => localStorage.getItem('dashboardViewType') || 'grid');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState({ program: [], country: [], status: [], level: [] });
  const [eventType, setEventType] = useState('all');
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 640 : false);

  useEffect(() => {
    function onResize() { setIsSmallScreen(window.innerWidth <= 640); }
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('applications').select('*');
        if (error) console.error(error);
        if (mounted) setApplications(data || []);
      } catch (err) {
        console.error(err);
        if (mounted) setApplications([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const options = useMemo(() => ({
    program: Array.from(new Set(applications.map(a => a.program).filter(Boolean))).sort(),
    country: Array.from(new Set(applications.map(a => a.country).filter(Boolean))).sort(),
    status: Array.from(new Set(applications.map(a => a.status).filter(Boolean))).sort(),
    level: Array.from(new Set(applications.map(a => a.level).filter(Boolean))).sort(),
  }), [applications]);

  const handleSelectAll = (type) => setFilters(prev => ({ ...prev, [type]: options[type].slice() }));
  const handleDeselectAll = (type) => setFilters(prev => ({ ...prev, [type]: [] }));
  const handleOptionChange = (type, opt) => setFilters(prev => ({ ...prev, [type]: prev[type].includes(opt) ? prev[type].filter(v => v !== opt) : [...prev[type], opt] }));

  const filteredApplications = useMemo(() => {
    let apps = (applications || []).slice();
    Object.entries(filters).forEach(([k, vals]) => { if (vals && vals.length) apps = apps.filter(a => vals.includes(a[k] || '')); });
    if (eventType === 'future') apps = apps.filter(a => a.nearestDate && !formatDateCountdown(a.nearestDate.date).isPast);
    if (eventType === 'past') apps = apps.filter(a => a.nearestDate && formatDateCountdown(a.nearestDate.date).isPast);
    return apps;
  }, [applications, filters, eventType]);

  // content generation
  let content = null;
  if (loading) {
    content = viewType === 'grid' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    ) : (
      <SkeletonListTable rows={5} cols={6} />
    );
  } else if (!filteredApplications || filteredApplications.length === 0) {
    content = <p className="text-neutralDark">No applications found. Start by adding one!</p>;
  } else if (viewType === 'grid') {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApplications.map(app => (
          <div key={app.id} className="rounded-lg shadow-md p-3 sm:p-5 bg-white border hover:shadow-lg transition cursor-pointer" onClick={() => window.location.href = `/application/${app.id}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm sm:text-base truncate">{app.program}</h3>
              <LevelTag level={app.level} />
            </div>
            <div className="text-xs text-slate_gray-700 mt-1 truncate">{[app.country, app.state, app.city].filter(Boolean).join(', ')}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-white border">{app.status}</span>
              {app.funding_status && <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border">{app.funding_status}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    // list view
    if (isSmallScreen) {
      content = (
        <div className="flex flex-col gap-4">
          {filteredApplications.map(app => (
            <div key={app.id} className="rounded-lg shadow-sm p-3 bg-white border" onClick={() => window.location.href = `/application/${app.id}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{app.program}</h3>
                <LevelTag level={app.level} />
              </div>
              <div className="text-xs text-slate_gray-700 mt-1">{[app.country, app.state, app.city].filter(Boolean).join(', ')}</div>
            </div>
          ))}
        </div>
      );
    } else {
      content = (
          <div className="w-full overflow-x-auto">
            {/* constrain vertical space so table scrolls internally instead of expanding the page */}
            <div style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <table className="min-w-[900px] table-auto text-left text-sm bg-white border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2">Program</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Next Date</th>
                <th className="px-3 py-2">Progress</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => window.location.href = `/application/${app.id}`}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{app.program}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{[app.country, app.state, app.city].filter(Boolean).join(', ')}</td>
                  <td className="px-3 py-2"><span className="text-[10px] px-2 py-0.5 rounded bg-white border">{app.status}</span></td>
                  <td className="px-3 py-2"><LevelTag level={app.level} /></td>
                  <td className="px-3 py-2 text-gray-600">{app.nearestDate ? `${app.nearestDate.name}: ${formatDateCountdown(app.nearestDate.date).formatted}` : '—'}</td>
                  <td className="px-3 py-2"><div className="w-28 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${app.progress || 0}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="max-w-full mx-auto w-f px-4 overflow-x-hidden">
      <div className="flex items-center gap-4 justify-between mb-4">
        <h1 className="text-lg sm:text-2xl font-semibold">Applications</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { setViewType('grid'); localStorage.setItem('dashboardViewType', 'grid'); }} className={`p-1 rounded ${viewType === 'grid' ? 'bg-blue-600 text-white' : 'bg-white border'}`} aria-label="Grid">
            <FaThLarge size={14} />
          </button>
          <button onClick={() => { setViewType('list'); localStorage.setItem('dashboardViewType', 'list'); }} className={`p-1 rounded ${viewType === 'list' ? 'bg-blue-600 text-white' : 'bg-white border'}`} aria-label="List">
            <FaList size={14} />
          </button>
          <Link to="/add" className="p-1 rounded-full bg-blue-600 text-white" title="Add">
            <FaPlus size={14} />
          </Link>
          <button onClick={() => setFilterPanelOpen(true)} className="ml-2 p-1 rounded bg-white border" title="Filters">
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        {((Object.values(filters).some(arr => arr.length > 0)) || eventType !== 'all') ? (
          <div className="flex flex-wrap gap-2 items-center">
            {Object.entries(filters).flatMap(([k, arr]) => arr.map(v => (
              <span key={k + v} className="px-3 py-1 bg-white border rounded text-sm">{k}: {v}</span>
            )))}
            {eventType !== 'all' && <span className="px-3 py-1 bg-white border rounded text-sm">{eventType}</span>}
            <button className="ml-2 text-sm text-red-600" onClick={() => { setFilters({ program: [], country: [], status: [], level: [] }); setEventType('all'); }}>Clear All</button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No filters applied</div>
        )}
      </div>

      {filterPanelOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setFilterPanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-72 bg-white z-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Filters</h2>
              <button onClick={() => setFilterPanelOpen(false)} className="p-1"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Event type</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="all">All</option>
                  <option value="future">Future</option>
                  <option value="past">Past</option>
                </select>
              </div>
              {['program', 'country', 'status', 'level'].map(type => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-sm capitalize">{type}</strong>
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600" onClick={() => handleSelectAll(type)} type="button">Select</button>
                      <button className="text-xs text-blue-600" onClick={() => handleDeselectAll(type)} type="button">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                    {options[type].length === 0 ? <div className="text-xs text-gray-400">No options</div> : options[type].map(opt => (
                      <label key={opt} className="text-sm"><input type="checkbox" checked={filters[type].includes(opt)} onChange={() => handleOptionChange(type, opt)} className="mr-2" />{opt}</label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>, document.body
      )}

      <main className="py-2">
        {content}
      </main>
    </div>
  );
}