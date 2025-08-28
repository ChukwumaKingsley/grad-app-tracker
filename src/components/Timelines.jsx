import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';

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
    let query = supabase.from('important_dates').select('*, application:application_id(program, country, status, level)');
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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      Object.keys(dropdownRefs).forEach(type => {
        if (dropdown[type] && dropdownRefs[type].current && !dropdownRefs[type].current.contains(e.target)) {
          setDropdown(prev => ({ ...prev, [type]: false }));
        }
      });
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  });

  // Helper for rendering filter chips
  function renderFilterChips() {
    const chips = [];
    Object.entries(filters).forEach(([type, arr]) => {
      arr.forEach(val => {
        chips.push(
          <span key={type + val} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium mr-2 mb-2 px-2.5 py-1 rounded-full border border-blue-200">
            {type.charAt(0).toUpperCase() + type.slice(1)}: {val}
            <button className="ml-1 text-blue-600 hover:text-blue-900" onClick={() => handleOptionChange(type, val)} title="Remove filter">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        );
      });
    });
    return chips.length > 0 ? <div className="mb-2 flex flex-wrap">{chips}</div> : null;
  }


  // Mini funnel SVG, accepts active boolean
  function FunnelIcon({ active }) {
    return (
      <svg
        className={`inline w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0013 13.414V19a1 1 0 01-1.447.894l-2-1A1 1 0 019 18v-4.586a1 1 0 00-.293-.707L2.293 6.707A1 1 0 012 6V4z" />
      </svg>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Upcoming Deadlines & Timelines</h1>
        <button
          className={`p-2 rounded border ml-2 flex items-center justify-center w-10 h-10 border-blue-600 bg-transparent`}
          style={{ background: 'none' }}
          onClick={() => {
            if (filterMode) {
              setFilters({ program: [], country: [], status: [], level: [] });
              setDropdown({ program: false, country: false, status: false, level: false });
            }
            setFilterMode(f => !f);
          }}
          aria-label="Toggle filter mode"
        >
          <FunnelIcon active={filterMode} />
        </button>
      </div>
      <div style={{ minHeight: '40px' }} className="mb-2 flex flex-wrap items-center">
        {(() => {
          const chips = [];
          Object.entries(filters).forEach(([type, arr]) => {
            arr.forEach(val => {
              chips.push(
                <span key={type + val} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium mr-2 mb-2 px-2.5 py-1 rounded-full border border-blue-200">
                  {type.charAt(0).toUpperCase() + type.slice(1)}: {val}
                  <button className="ml-1 text-blue-600 hover:text-blue-900" onClick={() => handleOptionChange(type, val)} title="Remove filter">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              );
            });
          });
          return chips.length > 0 ? chips : <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-3 py-1 rounded">Applied filters</span>;
        })()}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2 relative">
                  <div className="flex items-center justify-between">
                    <span>Program</span>
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
                      <div ref={dropdownRefs.program} style={{position:'absolute', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 1000}} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
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
                  <div className="flex items-center justify-between">
                    <span>Country</span>
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
                      <div ref={dropdownRefs.country} style={{position:'absolute', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 1000}} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
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
                  <div className="flex items-center justify-between">
                    <span>Status</span>
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
                      <div ref={dropdownRefs.status} style={{position:'absolute', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 1000}} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
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
                  <div className="flex items-center justify-between">
                    <span>Level</span>
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
                      <div ref={dropdownRefs.level} style={{position:'absolute', top: dropdownPos.top, left: dropdownPos.left, width: '14rem', zIndex: 1000}} className="bg-white border rounded shadow-lg p-2 min-h-[120px] max-h-96 overflow-y-auto">
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
                    <td className="px-4 py-2">{d.application?.program}</td>
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
