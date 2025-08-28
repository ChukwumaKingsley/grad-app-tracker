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
import { useState, useEffect } from 'react';
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

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#313E50' }}>Applications</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Grid view"
            className={`p-2 rounded font-semibold shadow transition-colors
              ${viewType === 'grid' ? 'bg-delft_blue-500' : 'bg-white'}
              ${viewType !== 'grid' ? 'hover:bg-blue-100' : 'hover:bg-delft_blue-700'}
              border border-slate_gray-200'
            `}
            onClick={() => setViewType('grid')}
            style={{ outline: viewType === 'grid' ? '2px solid #243A5A' : 'none' }}
          >
            <FaThLarge
              size={20}
              className={
                viewType === 'grid'
                  ? 'text-white'
                  : 'text-charcoal-500 group-hover:text-delft_blue-500'
              }
            />
          </button>
          <button
            aria-label="List view"
            className={`p-2 rounded font-semibold shadow transition-colors
              ${viewType === 'list' ? 'bg-delft_blue-500' : 'bg-white'}
              ${viewType !== 'list' ? 'hover:bg-blue-100' : 'hover:bg-delft_blue-700'}
              border border-slate_gray-200'
            `}
            onClick={() => setViewType('list')}
            style={{ outline: viewType === 'list' ? '2px solid #243A5A' : 'none' }}
          >
            <FaList
              size={20}
              className={
                viewType === 'list'
                  ? 'text-white'
                  : 'text-charcoal-500 group-hover:text-delft_blue-500'
              }
            />
          </button>
          <span className="w-2" />
          <Link to="/add" className="p-2 rounded-full bg-delft_blue-500 text-slate_gray-100 hover:bg-paynes_gray-500 flex items-center justify-center shadow" title="Add Application">
            <FaPlus size={20} />
          </Link>
        </div>
      </div>
      {loading ? (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <SkeletonListTable rows={5} cols={6} />
        )
      ) : applications.length === 0 ? (
        <p className="text-neutralDark">No applications found. Start by adding one!</p>
      ) : (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => {
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
                  className={`rounded-lg shadow-md p-5 bg-white border hover:shadow-lg transition cursor-pointer flex flex-col gap-2 ${statusColors[app.status] || statusColors.default}`}
                  title={`View details for ${app.program}`}
                  onClick={() => window.location.href = `/application/${app.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-lg truncate" style={{ color: '#313E50' }}>{app.program}</h2>
                    <span className={`text-xs px-2 py-1 rounded ${getLevelTag(app.level)} bg-slate-100 font-bold`} title={app.level}>{getLevelShort(app.level)}</span>
                  </div>
                  <div className="text-sm text-slate_gray-700 truncate" title={[app.country, app.state, app.city].filter(Boolean).join(', ')}>
                    {[app.country, app.state, app.city].filter(Boolean).join(', ')}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusStyles(app.status)} bg-white border`} title={app.status}>{app.status}</span>
                    {app.funding_status && <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border" title={app.funding_status}>{app.funding_status}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {app.nearestDate ? (
                      <span className="text-xs text-gray-500">
                        {app.nearestDate.name}: {formatDateCountdown(app.nearestDate.date).formatted}
                        {formatDateCountdown(app.nearestDate.date).countdown && (
                          <span> (
                            {formatDateCountdown(app.nearestDate.date).countdown}
                          )</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No upcoming date</span>
                    )}
                  </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${app.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-semibold text-xs">{app.progress}%</span>
                    </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-2">Program</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Funding</th>
                  <th className="px-4 py-2">Important Dates</th>
                  <th className="px-4 py-2">Progress</th>
                  <th className="px-4 py-2">Level</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, idx) => {
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
                    <tr key={app.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-100 transition cursor-pointer' : 'bg-gray-50 hover:bg-gray-100 transition cursor-pointer'} title={`View details for ${app.program}`} onClick={() => window.location.href = `/application/${app.id}`}>
                      <td className="px-4 py-2 max-w-[220px] truncate" title={app.program}>{app.program}</td>
                      <td className="px-4 py-2" title={[app.country, app.state, app.city].filter(Boolean).join(', ')}>{[app.country, app.state, app.city].filter(Boolean).join(', ')}</td>
                      <td className={`px-4 py-2 ${getStatusStyles(app.status)}`} title={app.status}>{app.status}</td>
                      <td className="px-4 py-2" title={app.funding_status}>{app.funding_status}</td>
                      <td className="px-4 py-2">
                        {app.nearestDate ? (
                          <span
                            className="cursor-help"
                            title={app.nearestDate.name + (app.nearestDate.description ? (': ' + app.nearestDate.description) : '')}
                          >
                            {formatDateCountdown(app.nearestDate.date).formatted}
                            {formatDateCountdown(app.nearestDate.date).countdown && (
                              <span> (
                                {formatDateCountdown(app.nearestDate.date).countdown}
                              )</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <ProgressCircle value={app.progress || 0} size={32} color="#2563eb" />
                          <span className="text-gray-700 font-semibold text-xs">{app.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-bold ${getLevelTag(app.level)}`} title={app.level}>{getLevelShort(app.level)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}