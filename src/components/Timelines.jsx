
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonTable } from './SkeletonTable';
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
                <th className="px-4 py-2 relative">Program</th>
                <th className="px-4 py-2 relative">Country</th>
                <th className="px-4 py-2 relative">Status</th>
                <th className="px-4 py-2 relative">Level</th>
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
