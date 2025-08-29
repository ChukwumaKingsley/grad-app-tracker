// Utility for formatting date and countdown (shared with Timelines)
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

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { FunnelIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import { FaThLarge, FaList, FaPlus } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { SkeletonCard } from './SkeletonLoader';
import { SkeletonListTable } from './SkeletonListTable';
import { ProgressCircle } from './ProgressCircle';



export default function Dashboard({ session }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState(() => {
    // Try to load from localStorage, fallback to 'grid'
    return localStorage.getItem('dashboardViewType') || 'grid';
  });

  // Filter state (same as Timelines)
  const [filterMode, setFilterMode] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState({ program: [], country: [], status: [], level: [] });
  const [dropdown, setDropdown] = useState({ program: false, country: false, status: false, level: false });
  const [dropdownPos, setDropdownPos] = useState({});
  const dropdownRefs = {
    program: useRef(),
    country: useRef(),
    status: useRef(),
    level: useRef(),
  };
  const [eventType, setEventType] = useState('all');
  // Close dropdowns when clicking outside (same as Timelines)
  useEffect(() => {
    function handleClickOutside(event) {
      if (Object.values(dropdown).some(Boolean)) {
        const dropdownElements = Object.values(dropdownRefs).map(ref => ref.current).filter(Boolean);
        let clickedDropdown = false;
        for (const el of dropdownElements) {
          if (el && el.contains(event.target)) {
            clickedDropdown = true;
            break;
          }
        }
        if (event.target.closest('.group')) {
          clickedDropdown = true;
        }
        if (!clickedDropdown) {
          setDropdown({ program: false, country: false, status: false, level: false });
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdown, dropdownRefs]);
  // Build dropdown options from applications
  const options = {
    program: Array.from(new Set(applications.map(d => d.program).filter(Boolean))),
    country: Array.from(new Set(applications.map(d => d.country).filter(Boolean))),
    status: Array.from(new Set(applications.map(d => d.status).filter(Boolean))),
    level: Array.from(new Set(applications.map(d => d.level).filter(Boolean))),
  };

  function toggleDropdown(type, e) {
    setDropdown(prev => {
      const newState = { program: false, country: false, status: false, level: false };
      newState[type] = !prev[type];
      return newState;
    });
    if (e && e.target) {
      const rect = e.target.getBoundingClientRect();
      setDropdownPos({
        type,
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }

  function handleOptionChange(type, value) {
    setFilters(prev => {
      const arr = prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value];
      return { ...prev, [type]: arr };
    });
  }

  function handleSelectAll(type) {
    setFilters(prev => ({ ...prev, [type]: options[type] }));
  }

  function handleDeselectAll(type) {
    setFilters(prev => ({ ...prev, [type]: [] }));
  }

  useEffect(() => {
    async function fetchApplications() {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Fetch important dates for each application
      const appsWithDates = await Promise.all(
        (apps || []).map(async (app) => {
          const { data: dates } = await supabase
            .from('important_dates')
            .select('name, date')
            .eq('application_id', app.id)
            .order('date', { ascending: true });

          // Find the nearest upcoming date
          const now = new Date();
          const upcomingDates = dates?.filter((d) => new Date(d.date) >= now) || [];
          const nearestDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

          return { ...app, nearestDate };
        })
      );

      setApplications(appsWithDates);
      setLoading(false);
    }
    fetchApplications();
  }, [session.user.id]);

  // Save viewType to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardViewType', viewType);
  }, [viewType]);

  // Filtering logic for both views (must be after all state/vars and before return)
  const filteredApplications = React.useMemo(() => {
    return applications.filter(app => {
      if (filters.program.length > 0 && !filters.program.includes(app.program)) return false;
      if (filters.country.length > 0 && !filters.country.includes(app.country)) return false;
      if (filters.status.length > 0 && !filters.status.includes(app.status)) return false;
      if (filters.level.length > 0 && !filters.level.includes(app.level)) return false;
      // Event type filter (future/past)
      if (eventType === 'future' || eventType === 'past') {
        const nearest = app.nearestDate;
        if (!nearest) return false;
        const { isPast } = formatDateCountdown(nearest.date);
        if (eventType === 'future' && isPast) return false;
        if (eventType === 'past' && !isPast) return false;
      }
      return true;
    });
  }, [applications, filters, eventType]);

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#313E50' }}>Applications</h1>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            aria-label="Grid view"
            className={`p-1 sm:p-1.5 md:p-2 rounded font-semibold shadow transition-colors
              ${viewType === 'grid' ? 'bg-delft_blue-500' : 'bg-white'}
              ${viewType !== 'grid' ? 'hover:bg-blue-100' : 'hover:bg-delft_blue-700'}
              border border-slate_gray-200'
            `}
            onClick={() => setViewType('grid')}
            style={{ outline: viewType === 'grid' ? '2px solid #243A5A' : 'none' }}
          >
            <FaThLarge
              size={12}
              className={
                viewType === 'grid'
                  ? 'text-white'
                  : 'text-charcoal-500 group-hover:text-delft_blue-500'
              }
            />
          </button>
          <button
            aria-label="List view"
            className={`p-1 sm:p-1.5 md:p-2 rounded font-semibold shadow transition-colors
              ${viewType === 'list' ? 'bg-delft_blue-500' : 'bg-white'}
              ${viewType !== 'list' ? 'hover:bg-blue-100' : 'hover:bg-delft_blue-700'}
              border border-slate_gray-200'
            `}
            onClick={() => setViewType('list')}
            style={{ outline: viewType === 'list' ? '2px solid #243A5A' : 'none' }}
          >
            <FaList
              size={12}
              className={
                viewType === 'list'
                  ? 'text-white'
                  : 'text-charcoal-500 group-hover:text-delft_blue-500'
              }
            />
          </button>
          <span className="w-1 sm:w-2" />
          <Link to="/add" className="p-1 sm:p-1.5 md:p-2 rounded-full bg-delft_blue-500 text-slate_gray-100 hover:bg-paynes_gray-500 flex items-center justify-center shadow" title="Add Application">
            <FaPlus size={12} />
          </Link>
        </div>
      </div>
      {/* Unified filter controls for both views */}
      <div className="mb-2 flex items-center gap-2">
        {/* Filter chips, event type chip, and clear all button */}
        <div className="flex flex-wrap gap-2 flex-1 items-center">
          {Object.entries(filters).flatMap(([key, arr]) =>
            arr.map(val => (
              <span key={key + val} className="inline-flex items-center border border-blue-400 text-blue-700 bg-white rounded-full px-3 py-1 text-xs font-semibold">
                {key[0].toUpperCase() + key.slice(1)}: {val}
                <button
                  className="ml-2 text-blue-400 hover:text-red-500 focus:outline-none"
                  onClick={() => setFilters(prev => ({ ...prev, [key]: prev[key].filter(v => v !== val) }))}
                  title={`Remove filter ${val}`}
                  tabIndex={0}
                  type="button"
                >
                  &times;
                </button>
              </span>
            ))
          )}
          {(eventType === 'future' || eventType === 'past') && (
            <span className="inline-flex items-center border border-green-400 text-green-700 bg-white rounded-full px-3 py-1 text-xs font-semibold">
              {eventType === 'future' ? 'Future Events' : 'Past Events'}
              <button
                className="ml-2 text-green-400 hover:text-red-500 focus:outline-none"
                onClick={() => setEventType('all')}
                title="Remove event type filter"
                tabIndex={0}
                type="button"
              >
                &times;
              </button>
            </span>
          )}
          {Object.values(filters).every(arr => arr.length === 0) && eventType === 'all' && (
            <span className="text-gray-400 text-xs px-2 py-1">No filters applied</span>
          )}
          {((Object.values(filters).some(arr => arr.length > 0)) || eventType === 'future' || eventType === 'past') && (
            <button
              className="inline-flex items-center border border-red-400 text-red-700 bg-white rounded-full px-3 py-1 text-xs font-semibold ml-2 hover:bg-red-50 transition-colors"
              onClick={() => {
                setFilters({ program: [], country: [], status: [], level: [] });
                setEventType('all');
              }}
              title="Clear all filters"
              type="button"
            >
              Clear All &times;
            </button>
          )}
        </div>
        {/* Filter toggle button to the right */}
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded shadow font-semibold border transition-colors ${filterPanelOpen ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
          onClick={() => setFilterPanelOpen(open => !open)}
          title={filterPanelOpen ? 'Hide filters' : 'Show filters'}
          style={{ marginLeft: 'auto', position: 'relative', zIndex: 30 }}
        >
          {filterPanelOpen ? <XMarkIcon className="w-5 h-5" /> : <AdjustmentsHorizontalIcon className="w-5 h-5" />}
          <span className="hidden sm:inline">{filterPanelOpen ? 'Hide Filters' : 'Filter'}</span>
        </button>
      </div>



      {/* Overlay filter panel */}
      {filterPanelOpen && createPortal(
        <>
          {/* Overlay background */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setFilterPanelOpen(false)}
            aria-label="Close filter panel"
          />
          {/* Slide-in panel */}
          <div
            className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-50 transition-transform duration-300 animate-slideIn"
            style={{ maxWidth: '95vw' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setFilterPanelOpen(false)} className="p-2 rounded hover:bg-gray-100">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 60px)' }}>
              {/* Event type dropdown */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">Event Type</label>
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none"
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  style={{ minWidth: 110 }}
                >
                  <option value="all">All Events</option>
                  <option value="future">Future Events</option>
                  <option value="past">Past Events</option>
                </select>
              </div>
              {/* Checklist dropdowns for all filter types */}
              {['program', 'country', 'status', 'level'].map(type => (
                <div key={type}>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 capitalize">{type}</label>
                  <div className="border border-gray-200 rounded p-2 bg-gray-50">
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                      <button
                        className="text-xs text-blue-600 hover:underline text-left mb-1"
                        type="button"
                        onClick={() => handleSelectAll(type)}
                      >
                        Select All
                      </button>
                      <button
                        className="text-xs text-blue-600 hover:underline text-left mb-1"
                        type="button"
                        onClick={() => handleDeselectAll(type)}
                      >
                        Deselect All
                      </button>
                      {options[type].length === 0 && (
                        <span className="text-xs text-gray-400">No options</span>
                      )}
                      {options[type].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters[type].includes(opt)}
                            onChange={() => handleOptionChange(type, opt)}
                            className="accent-blue-600"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Filtered applications for both views */}
      {loading ? (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array(3).fill(0).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <SkeletonListTable rows={5} cols={6} />
        )
      ) : filteredApplications.length === 0 ? (
        <p className="text-neutralDark">No applications found. Start by adding one!</p>
      ) : (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => {
              // ...existing code for grid view...
              const statusColors = {
                Planning: 'bg-gray-100',
                'In Progress': 'bg-blue-100',
                Submitted: 'bg-green-100',
                Abandoned: 'bg-red-100',
                Waitlisted: 'bg-yellow-100',
                Awarded: 'bg-purple-100',
                'Awarded - Full Funding': 'bg-purple-50',
                'Awarded - Partial Funding': 'bg-indigo-50',
                'Awarded - No Funding': 'bg-gray-200',
                Rejected: 'bg-red-50',
                default: 'bg-gray-100',
              };
              const getStatusStyles = (status) => {
                switch (status) {
                  case 'Planning': return 'text-gray-700 font-bold';
                  case 'In Progress': return 'text-blue-700 font-bold';
                  case 'Submitted': return 'text-green-700 font-bold';
                  case 'Abandoned': return 'text-red-700 font-bold';
                  case 'Waitlisted': return 'text-yellow-700 font-bold';
                  case 'Awarded': return 'text-purple-700 font-bold';
                  case 'Awarded - Full Funding': return 'text-purple-800 font-bold';
                  case 'Awarded - Partial Funding': return 'text-indigo-700 font-bold';
                  case 'Awarded - No Funding': return 'text-gray-700 font-bold';
                  case 'Rejected': return 'text-red-800 font-bold';
                  default: return 'text-gray-900 font-bold';
                }
              };
              const getLevelTag = (level) => {
                if ((level || '').toLowerCase().includes('phd')) return 'text-pink-800';
                return 'text-blue-800';
              };
              const getLevelShort = (level) => {
                if ((level || '').toLowerCase().includes('phd')) return 'PhD';
                return 'MSc';
              };
              return (
                <div
                  key={app.id}
                  className={`rounded-lg shadow-md p-3 sm:p-5 bg-white border hover:shadow-lg transition cursor-pointer flex flex-col gap-2 ${statusColors[app.status] || statusColors.default}`}
                  title={`View details for ${app.program}`}
                  onClick={() => window.location.href = `/application/${app.id}`}
                >
                  {/* ...existing code... */}
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-base sm:text-lg truncate" style={{ color: '#313E50' }}>{app.program}</h2>
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getLevelTag(app.level)} bg-slate-100 font-bold`} title={app.level}>{getLevelShort(app.level)}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate_gray-700 truncate" title={[app.country, app.state, app.city].filter(Boolean).join(', ')}>
                    {[app.country, app.state, app.city].filter(Boolean).join(', ')}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getStatusStyles(app.status)} bg-white border`} title={app.status}>{app.status}</span>
                    {app.funding_status && <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-indigo-50 text-indigo-700 border" title={app.funding_status}>{app.funding_status}</span>}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    {app.nearestDate ? (
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {app.nearestDate.name}: {formatDateCountdown(app.nearestDate.date).formatted}
                        {formatDateCountdown(app.nearestDate.date).countdown && (
                          <span> (
                            {formatDateCountdown(app.nearestDate.date).countdown}
                          )</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-gray-400">No upcoming date</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1 sm:h-2.5">
                      <div
                        className="bg-blue-600 h-2 sm:h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${app.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-gray-700 font-semibold text-[10px] sm:text-xs">{app.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* ...existing table code, but use filteredApplications... */}
            <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
              {/* ...existing thead and tbody code, but use filteredApplications... */}
              {/* ...existing code... */}
            </table>
          </div>
        )
      )}
    </div>
  );
}