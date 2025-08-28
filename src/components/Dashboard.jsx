import { useState, useEffect } from 'react';
import { FaThLarge, FaList, FaPlus } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { SkeletonCard } from './SkeletonLoader';

export default function Dashboard({ session }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('grid');

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

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Applications</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Grid view"
            className={`p-2 rounded ${viewType === 'grid' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'} hover:bg-accent hover:text-white transition`}
            onClick={() => setViewType('grid')}
          >
            <FaThLarge size={20} />
          </button>
          <button
            aria-label="List view"
            className={`p-2 rounded ${viewType === 'list' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'} hover:bg-accent hover:text-white transition`}
            onClick={() => setViewType('list')}
          >
            <FaList size={20} />
          </button>
          <span className="w-2" />
          <Link to="/add" className="p-2 rounded-full bg-accent text-white hover:bg-green-600 flex items-center justify-center" title="Add Application">
            <FaPlus size={20} />
          </Link>
        </div>
      </div>
      {applications.length === 0 ? (
        <p className="text-neutralDark">No applications found. Start by adding one!</p>
      ) : (
        viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => {
              // Lighter card backgrounds for grid view, status color only for status
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
              const cardBg = 'bg-gray-50';
              const progressBg = 'bg-gray-200';
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
                <Link
                  key={app.id}
                  to={`/application/${app.id}`}
                  className={`${cardBg} p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow relative`}
                  title={`View details for ${app.program}`}
                >
                  {/* Level tag at top right */}
                  <span
                    className={`absolute top-4 right-4 text-xs font-bold ${getLevelTag(app.level)}`}
                    title={app.level}
                    style={{ maxWidth: '6rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}
                  >
                    {getLevelShort(app.level)}
                  </span>
                  <h2
                    className="text-xl font-bold text-primary mb-2 min-h-[3.5rem] max-h-[3.5rem] leading-tight overflow-hidden line-clamp-2"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    title={app.program}
                  >
                    {app.program}
                  </h2>
                  <p className="mb-2 break-words" title={[app.country, app.state, app.city].filter(Boolean).join(', ')}>
                    <span className="font-semibold text-sm text-gray-700">Location:</span> <span className="text-gray-600">{
                      [app.country, app.state, app.city].filter(Boolean).join(', ')
                    }</span>
                  </p>
                  <p className="mb-2">
                    <span className="font-semibold text-sm text-gray-700">Status:</span>
                    <span className={`ml-1 px-2 py-1 rounded ${statusColors[app.status] || statusColors.default} ${getStatusStyles(app.status)}`} title={app.status}>{app.status}</span>
                  </p>
                  <p className="mb-2"><span className="font-semibold text-sm text-gray-700">Funding:</span> <span className="text-gray-600" title={app.funding_status}>{app.funding_status}</span></p>
                  <p className="mb-2">
                    <span className="font-semibold text-sm text-gray-700">Important Dates:</span>{' '}
                    <span className="text-gray-600" title={app.nearestDate ? `${app.nearestDate.name}: ${app.nearestDate.date}` : 'None'}>
                      {app.nearestDate ? (
                        `${app.nearestDate.name}: ${app.nearestDate.date}`
                      ) : (
                        'None'
                      )}
                    </span>
                  </p>
                  <div className={`w-full ${progressBg} rounded-full h-2.5 mb-2`} title={`Progress: ${app.progress}%`}>
                    <div
                      className="bg-accent h-2.5 rounded-full"
                      style={{ width: `${app.progress}%` }}
                    />
                  </div>
                  <p className="text-gray-700"><span className="font-semibold text-sm">{app.progress}% Complete</span></p>
                </Link>
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
                      <td className="px-4 py-2" title={app.nearestDate ? `${app.nearestDate.name}: ${app.nearestDate.date}` : 'None'}>{app.nearestDate ? `${app.nearestDate.name}: ${app.nearestDate.date}` : 'None'}</td>
                      <td className="px-4 py-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mb-1" title={`Progress: ${app.progress}%`}>
                          <div
                            className="bg-accent h-2.5 rounded-full"
                            style={{ width: `${app.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-700 font-semibold text-xs">{app.progress}%</span>
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