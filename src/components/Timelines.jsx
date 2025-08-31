import { useEffect, useState, useRef } from 'react';
import { FunnelIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { SkeletonTable } from './SkeletonTable';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import CalendarView from './CalendarView';

function formatDateCountdown(dateStr) {
  if (!dateStr) return { formatted: '', countdown: '', isPast: false };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.setHours(0,0,0,0) - now.setHours(0,0,0,0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const options = { year: '2-digit', month: 'short', day: 'numeric' };
  const formatted = date.toLocaleDateString('en-US', options);
  let countdown = '';
  if (diffDays > 0) countdown = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  else if (diffDays < 0) countdown = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  else countdown = 'Today';
  return { formatted, countdown, isPast: diffDays < 0 };
}

export default function Timelines() {
  const [allDeadlines, setAllDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState(false);
  const [filters, setFilters] = useState({ program: [], country: [], status: [], level: [] });
  const [dropdown, setDropdown] = useState({ program: false, country: false, status: false, level: false });
  const [dropdownPos, setDropdownPos] = useState({});
  const [view, setView] = useState(() => localStorage.getItem('timelinesView') || 'table'); // 'table' or 'calendar'
  const [calendarMode, setCalendarMode] = useState(() => localStorage.getItem('timelinesCalendarMode') || 'month'); // month, week, day, agenda, year
  const dropdownRefs = {
    program: useRef(),
    country: useRef(),
    status: useRef(),
    level: useRef(),
  };

  useEffect(() => {
    async function fetchDeadlines() {
      setLoading(true);
      const { data, error } = await supabase.from('important_dates').select('*, application:application_id(id, program, country, status, level)').order('date', { ascending: true });
      if (!error) setAllDeadlines(data || []);
      setLoading(false);
    }
    fetchDeadlines();
  }, []);

  const options = {
    program: Array.from(new Set(allDeadlines.map(d => d.application?.program).filter(Boolean))).sort(),
    country: Array.from(new Set(allDeadlines.map(d => d.application?.country).filter(Boolean))).sort(),
    status: Array.from(new Set(allDeadlines.map(d => d.application?.status).filter(Boolean))).sort(),
    level: Array.from(new Set(allDeadlines.map(d => d.application?.level).filter(Boolean))).sort(),
  };

      function toggleDropdown(type, e) {
        setDropdown(prev => ({ program: false, country: false, status: false, level: false, [type]: !prev[type] }));
        if (e && e.target) {
          const rect = e.target.getBoundingClientRect();
          setDropdownPos({ type, top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
        }
      }

      function handleOptionChange(type, value) {
        setFilters(prev => ({ ...prev, [type]: prev[type].includes(value) ? prev[type].filter(v => v !== value) : [...prev[type], value] }));
      }
      function handleSelectAll(type) { setFilters(prev => ({ ...prev, [type]: options[type].slice() })); }
      function handleDeselectAll(type) { setFilters(prev => ({ ...prev, [type]: [] })); }

      const [eventType, setEventType] = useState('all');

      const filtered = allDeadlines.filter(d => {
        if (!d.application) return false;
        if (filters.program.length > 0 && !filters.program.includes(d.application.program)) return false;
        if (filters.country.length > 0 && !filters.country.includes(d.application.country)) return false;
        if (filters.status.length > 0 && !filters.status.includes(d.application.status)) return false;
        if (filters.level.length > 0 && !filters.level.includes(d.application.level)) return false;
        const { isPast } = formatDateCountdown(d.date);
        if (eventType === 'past' && !isPast) return false;
        if (eventType === 'future' && isPast) return false;
        return true;
      });

      const calendarEvents = filtered.map(d => ({ id: d.id, title: d.name + (d.application?.program ? ` — ${d.application.program}` : ''), start: new Date(d.date), end: new Date(d.date), resource: d }));

      return (
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold" style={{ color: '#313E50' }}>Timelines</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => { setView('table'); localStorage.setItem('timelinesView', 'table'); }} className={`px-3 py-2 rounded ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>List</button>
              <button onClick={() => { setView('calendar'); localStorage.setItem('timelinesView', 'calendar'); }} className={`px-3 py-2 rounded ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Calendar</button>
              <button className={`flex items-center gap-2 px-3 py-2 rounded shadow font-semibold border transition-colors ${filterMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`} onClick={() => setFilterMode(f => !f)} title={filterMode ? 'Hide filters' : 'Show filters'}>
                {filterMode ? <XMarkIcon className="w-5 h-5" /> : <AdjustmentsHorizontalIcon className="w-5 h-5" />}<span className="hidden sm:inline">{filterMode ? 'Hide Filters' : 'Filter'}</span>
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <select name="event_type" value={eventType} onChange={e => setEventType(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
              <option value="all">All Events</option>
              <option value="future">Future Events</option>
              <option value="past">Past Events</option>
            </select>
            <div className="flex flex-wrap gap-2 flex-1 items-center">
              {Object.entries(filters).flatMap(([key, arr]) => arr.map(val => (
                <span key={key + val} className="inline-flex items-center border border-blue-400 text-blue-700 bg-white rounded-full px-3 py-1 text-xs font-semibold">
                  {key[0].toUpperCase() + key.slice(1)}: {val}
                  <button className="ml-2 text-blue-400 hover:text-red-500 focus:outline-none" onClick={() => setFilters(prev => ({ ...prev, [key]: prev[key].filter(v => v !== val) }))} type="button">&times;</button>
                </span>
              )))}
              {Object.values(filters).every(arr => arr.length === 0) && eventType === 'all' && <span className="text-gray-400 text-xs px-2 py-1">No filters applied</span>}
              {((Object.values(filters).some(arr => arr.length > 0)) || eventType !== 'all') && (
                <button className="inline-flex items-center border border-red-400 text-red-700 bg-white rounded-full px-3 py-1 text-xs font-semibold ml-2 hover:bg-red-50" onClick={() => { setFilters({ program: [], country: [], status: [], level: [] }); setEventType('all'); }} type="button">Clear All &times;</button>
              )}
            </div>
          </div>

          {filterMode && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {['program','country','status','level'].map(type => (
                <div key={type} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-sm capitalize">{type}</strong>
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600" onClick={() => handleSelectAll(type)}>Select</button>
                      <button className="text-xs text-blue-600" onClick={() => handleDeselectAll(type)}>Clear</button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {options[type].length === 0 ? <div className="text-xs text-gray-400">No options</div> : options[type].map(opt => (
                      <label key={opt} className="block text-sm cursor-pointer"><input type="checkbox" className="mr-2" checked={filters[type].includes(opt)} onChange={() => handleOptionChange(type, opt)} />{opt}</label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : view === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Countdown</th>
                    <th className="px-4 py-2">Event</th>
                    <th className="px-4 py-2">Program</th>
                    <th className="px-4 py-2">Country</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, idx) => {
                    const { formatted, countdown, isPast } = formatDateCountdown(d.date);
                    return (
                      <tr key={d.id} className={isPast ? 'bg-gray-100 text-gray-400' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                        <td className="px-4 py-2">{formatted}</td>
                        <td className="px-4 py-2">{countdown}</td>
                        <td className="px-4 py-2">{d.name}</td>
                        <td className="px-4 py-2">{d.application?.id ? <Link to={`/application/${d.application.id}`} state={{ from: '/timelines' }} className="text-blue-700 hover:underline">{d.application.program}</Link> : d.application?.program}</td>
                        <td className="px-4 py-2">{d.application?.country}</td>
                        <td className="px-4 py-2">{d.application?.status}</td>
                        <td className="px-4 py-2">{d.application?.level}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button className={`px-2 py-1 rounded ${calendarMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => { setCalendarMode('day'); localStorage.setItem('timelinesCalendarMode', 'day'); }}>Day</button>
                <button className={`px-2 py-1 rounded ${calendarMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => { setCalendarMode('week'); localStorage.setItem('timelinesCalendarMode', 'week'); }}>Week</button>
                <button className={`px-2 py-1 rounded ${calendarMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => { setCalendarMode('month'); localStorage.setItem('timelinesCalendarMode', 'month'); }}>Month</button>
                <button className={`px-2 py-1 rounded ${calendarMode === 'agenda' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => { setCalendarMode('agenda'); localStorage.setItem('timelinesCalendarMode', 'agenda'); }}>Agenda</button>
                <button className={`px-2 py-1 rounded ${calendarMode === 'year' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => { setCalendarMode('year'); localStorage.setItem('timelinesCalendarMode', 'year'); }}>Year</button>
              </div>
              <CalendarView events={calendarEvents} viewMode={calendarMode} onViewChange={v => { setCalendarMode(v); localStorage.setItem('timelinesCalendarMode', v); }} />
            </div>
          )}
        </div>
      );
    }
