  import { useEffect, useState, useRef } from 'react';
  import { FunnelIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
  import { Link } from 'react-router-dom';
  import { SkeletonTable } from './SkeletonTable';
  import { createPortal } from 'react-dom';
  import { supabase } from '../supabaseClient';



// Close dropdowns when clicking outside

// Close dropdowns when clicking outside
// (must be after dropdownRefs are defined in the component)

// Utility for formatting date and countdown
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
  const [allDeadlines, setAllDeadlines] = useState([]); // all fetched data
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState(false);
  const [filters, setFilters] = useState({ program: [], country: [], status: [], level: [] });
  const [dropdown, setDropdown] = useState({ program: false, country: false, status: false, level: false });
  const [dropdownPos, setDropdownPos] = useState({});
  const dropdownRefs = {
    program: useRef(),
    country: useRef(),
    status: useRef(),
    level: useRef(),
  };

  // Correct outside click handler: must be inside the component and after refs are defined
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
        // Also check if click is on a filter button (by className)
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

  useEffect(() => {
    fetchDeadlines();
  }, []); // fetch only once

  // Build dropdown options from allDeadlines
  const options = {
    program: Array.from(new Set(allDeadlines.map(d => d.application?.program).filter(Boolean))),
    country: Array.from(new Set(allDeadlines.map(d => d.application?.country).filter(Boolean))),
    status: Array.from(new Set(allDeadlines.map(d => d.application?.status).filter(Boolean))),
    level: Array.from(new Set(allDeadlines.map(d => d.application?.level).filter(Boolean))),
  };

  async function fetchDeadlines() {
    setLoading(true);
    let query = supabase.from('important_dates').select('*, application:application_id(id, program, country, status, level)');
    query = query.order('date', { ascending: true });
    const { data, error } = await query;
    if (!error) setAllDeadlines(data || []);
    setLoading(false);
  }

  // Dropdown logic
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

  // Event type: 'all', 'future', 'past'
  const [eventType, setEventType] = useState('all');

  // Compose filter summary string
  const filterSummary = Object.entries(filters)
    .map(([key, arr]) => arr.length > 0 ? `${key[0].toUpperCase() + key.slice(1)}: ${arr.join(', ')}` : null)
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#313E50' }}>Timelines</h1>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded shadow font-semibold border transition-colors ${filterMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
          onClick={() => setFilterMode(f => !f)}
          title={filterMode ? 'Hide filters' : 'Show filters'}
        >
          {filterMode ? <XMarkIcon className="w-5 h-5" /> : <AdjustmentsHorizontalIcon className="w-5 h-5" />}
          <span className="hidden sm:inline">{filterMode ? 'Hide Filters' : 'Filter'}</span>
        </button>
      </div>



      {/* Filter chips and event type dropdown */}
      <div className="mb-2 flex items-center gap-2">
        {/* Event type dropdown */}
        <select
          name="event_type"
          autoComplete="off"
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={eventType}
          onChange={e => setEventType(e.target.value)}
          style={{ minWidth: 110 }}
        >
          <option value="all">All Events</option>
          <option value="future">Future Events</option>
          <option value="past">Past Events</option>
        </select>
        {/* Filter chips, event type chip, and clear all button */}
        <div className="flex flex-wrap gap-2 flex-1 items-center">
          {/* Filter chips for each filter type */}
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

          {/* Event type chip (future/past) */}
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

          {/* No filters applied message */}
          {Object.values(filters).every(arr => arr.length === 0) && eventType === 'all' && (
            <span className="text-gray-400 text-xs px-2 py-1">No filters applied</span>
          )}

          {/* Clear all button (always last) */}
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
      </div>
      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Countdown</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Program
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('program', e); }}
                        title="Filter by program"
                      >
                        <FunnelIcon active={filters.program.length > 0} className="w-4 h-4" />
                      </button>
                    )}
                    {dropdown.program && createPortal(
                      <div ref={dropdownRefs.program} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('program')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('program')}>Deselect all</button>
                        </div>
                        {options.program.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.program.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              name={`filter-program-${opt}`}
                              autoComplete="off"
                              checked={filters.program.includes(opt)}
                              onChange={() => handleOptionChange('program', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Country
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('country', e); }}
                        title="Filter by country"
                      >
                        <FunnelIcon active={filters.country.length > 0} className="w-4 h-4" />
                      </button>
                    )}
                    {dropdown.country && createPortal(
                      <div ref={dropdownRefs.country} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('country')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('country')}>Deselect all</button>
                        </div>
                        {options.country.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.country.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              name={`filter-country-${opt}`}
                              autoComplete="off"
                              checked={filters.country.includes(opt)}
                              onChange={() => handleOptionChange('country', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Status
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('status', e); }}
                        title="Filter by status"
                      >
                        <FunnelIcon active={filters.status.length > 0} className="w-4 h-4" />
                      </button>
                    )}
                    {dropdown.status && createPortal(
                      <div ref={dropdownRefs.status} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('status')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('status')}>Deselect all</button>
                        </div>
                        {options.status.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.status.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              name={`filter-status-${opt}`}
                              autoComplete="off"
                              checked={filters.status.includes(opt)}
                              onChange={() => handleOptionChange('status', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Level
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('level', e); }}
                        title="Filter by level"
                      >
                        <FunnelIcon active={filters.level.length > 0} className="w-4 h-4" />
                      </button>
                    )}
                    {dropdown.level && createPortal(
                      <div ref={dropdownRefs.level} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('level')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('level')}>Deselect all</button>
                        </div>
                        {options.level.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.level.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              name={`filter-level-${opt}`}
                              autoComplete="off"
                              checked={filters.level.includes(opt)}
                              onChange={() => handleOptionChange('level', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {allDeadlines
                .filter(d => {
                  if (!d.application) return false;
                  if (filters.program.length > 0 && !filters.program.includes(d.application.program)) return false;
                  if (filters.country.length > 0 && !filters.country.includes(d.application.country)) return false;
                  if (filters.status.length > 0 && !filters.status.includes(d.application.status)) return false;
                  if (filters.level.length > 0 && !filters.level.includes(d.application.level)) return false;
                  // Event type filter
                  const { isPast } = formatDateCountdown(d.date);
                  if (eventType === 'past') {
                    if (!isPast) return false;
                  } else if (eventType === 'future') {
                    if (isPast) return false;
                  }
                  return true;
                })
                .map((d, idx) => {
                  const { formatted, countdown, isPast } = formatDateCountdown(d.date);
                  return (
                    <tr key={d.id} className={isPast ? 'bg-gray-100 text-gray-400' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                      <td className="px-4 py-2">{formatted}</td>
                      <td className="px-4 py-2">{countdown}</td>
                      <td className="px-4 py-2">{d.name}</td>
                      <td className="px-4 py-2">
                        {d.application?.id ? (
                          <Link
                            to={`/application/${d.application.id}`}
                            className="text-blue-700 hover:underline font-semibold truncate"
                            title={`View details for ${d.application.program}`}
                          >
                            {d.application.program}
                          </Link>
                        ) : (
                          d.application?.program
                        )}
                      </td>
                      <td className="px-4 py-2">{d.application?.country}</td>
                      <td className="px-4 py-2">{d.application?.status}</td>
                      <td className="px-4 py-2">{d.application?.level}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


  // Add missing handleDeselectAll function
  function handleDeselectAll(type) {
    setFilters(prev => ({ ...prev, [type]: [] }));
  }

  return (
    <div>
      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Program
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('program', e); }}
                        title="Filter by program"
                      >
                        <FunnelIcon active={filters.program.length > 0} />
                      </button>
                    )}
                    {dropdown.program && createPortal(
                      <div ref={dropdownRefs.program} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('program')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('program')}>Deselect all</button>
                        </div>
                        {options.program.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.program.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              checked={filters.program.includes(opt)}
                              onChange={() => handleOptionChange('program', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Country
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('country', e); }}
                        title="Filter by country"
                      >
                        <FunnelIcon active={filters.country.length > 0} />
                      </button>
                    )}
                    {dropdown.country && createPortal(
                      <div ref={dropdownRefs.country} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('country')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('country')}>Deselect all</button>
                        </div>
                        {options.country.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.country.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              checked={filters.country.includes(opt)}
                              onChange={() => handleOptionChange('country', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Status
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('status', e); }}
                        title="Filter by status"
                      >
                        <FunnelIcon active={filters.status.length > 0} />
                      </button>
                    )}
                    {dropdown.status && createPortal(
                      <div ref={dropdownRefs.status} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('status')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('status')}>Deselect all</button>
                        </div>
                        {options.status.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.status.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              checked={filters.status.includes(opt)}
                              onChange={() => handleOptionChange('status', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
                <th className="px-4 py-2 relative">
                  <div className="relative">
                    Level
                    {filterMode && (
                      <button
                        className="group flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={e => { e.stopPropagation(); toggleDropdown('level', e); }}
                        title="Filter by level"
                      >
                        <FunnelIcon active={filters.level.length > 0} />
                      </button>
                    )}
                    {dropdown.level && createPortal(
                      <div ref={dropdownRefs.level} style={{
                        position: 'absolute',
                        top: dropdownPos.top,
                        left: Math.min(dropdownPos.left, window.innerWidth - 260),
                        width: 'min(14rem, 90vw)',
                        zIndex: 1000,
                        maxWidth: '90vw',
                      }} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
                        <div className="flex justify-between mb-1">
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleSelectAll('level')}>Select all</button>
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => handleDeselectAll('level')}>Deselect all</button>
                        </div>
                        {options.level.length === 0 && <div className="text-xs text-gray-400">No options</div>}
                        {options.level.map(opt => (
                          <label key={opt} className="block text-sm cursor-pointer text-gray-800">
                            <input
                              type="checkbox"
                              checked={filters.level.includes(opt)}
                              onChange={() => handleOptionChange('level', opt)}
                              className="mr-2"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>, document.body
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {allDeadlines
                .filter(d => {
                  if (!d.application) return false;
                  if (filters.program.length > 0 && !filters.program.includes(d.application.program)) return false;
                  if (filters.country.length > 0 && !filters.country.includes(d.application.country)) return false;
                  if (filters.status.length > 0 && !filters.status.includes(d.application.status)) return false;
                  if (filters.level.length > 0 && !filters.level.includes(d.application.level)) return false;
                  return true;
                })
                .map((d, idx) => (
                <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{d.date}</td>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2">
                    {d.application?.id ? (
                      <Link
                        to={`/application/${d.application.id}`}
                        className="text-blue-700 hover:underline font-semibold truncate"
                        title={`View details for ${d.application.program}`}
                      >
                        {d.application.program}
                      </Link>
                    ) : (
                      d.application?.program
                    )}
                  </td>
                  <td className="px-4 py-2">{d.application?.country}</td>
                  <td className="px-4 py-2">{d.application?.status}</td>
                  <td className="px-4 py-2">{d.application?.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
