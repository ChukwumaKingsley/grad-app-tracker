import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { SkeletonCard } from './SkeletonLoader';

export default function Dashboard({ session }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, [session]);

  const fetchApplications = async () => {
    const { data: apps, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch important dates for each application
    const appsWithDates = await Promise.all(
      apps.map(async (app) => {
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
  };

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
        <h1 className="text-3xl font-bold text-primary">Your Applications</h1>
        <Link to="/add" className="bg-accent text-white py-2 px-4 rounded hover:bg-green-600">
          Add Application
        </Link>
      </div>
      {applications.length === 0 ? (
        <p className="text-neutralDark">No applications found. Start by adding one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => {
            // Use the same status color logic as ApplicationDetail.jsx
            // Faint backgrounds for card, bold status text, bold labels
            const getStatusStyles = (status) => {
              switch (status) {
                case 'Planning': return { card: 'bg-gray-200', status: 'bg-gray-300 text-gray-800 font-bold' };
                case 'In Progress': return { card: 'bg-blue-100', status: 'bg-blue-600 text-white font-bold' };
                case 'Submitted': return { card: 'bg-green-100', status: 'bg-green-600 text-white font-bold' };
                case 'Abandoned': return { card: 'bg-red-100', status: 'bg-red-600 text-white font-bold' };
                case 'Waitlisted': return { card: 'bg-yellow-100', status: 'bg-yellow-600 text-white font-bold' };
                case 'Awarded': return { card: 'bg-purple-100', status: 'bg-purple-700 text-white font-bold' };
                case 'Awarded - Full Funding': return { card: 'bg-purple-200', status: 'bg-purple-800 text-white font-bold' };
                case 'Awarded - Partial Funding': return { card: 'bg-indigo-100', status: 'bg-indigo-700 text-white font-bold' };
                case 'Awarded - No Funding': return { card: 'bg-gray-300', status: 'bg-gray-700 text-white font-bold' };
                case 'Rejected': return { card: 'bg-red-200', status: 'bg-red-800 text-white font-bold' };
                default: return { card: 'bg-gray-200', status: 'bg-gray-400 text-gray-900 font-bold' };
              }
            };
            const styles = getStatusStyles(app.status);
            // Level tag color
            const getLevelTag = (level) => {
              if ((level || '').toLowerCase().includes('phd')) return 'text-pink-800';
              return 'text-blue-800'; // Masters or default
            };
            const getLevelShort = (level) => {
              if ((level || '').toLowerCase().includes('phd')) return 'PhD';
              return 'MSc';
            };
            return (
              <Link
                key={app.id}
                to={`/application/${app.id}`}
                className={`${styles.card} p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow relative`}
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
                {/* Standalone location */}
                <p className="mb-2 truncate" title={app.country}>
                  <span className="font-semibold text-sm">Location:</span> <span className="text-neutralDark">{app.country}</span>
                </p>
                <p className="mb-2">
                  <span className="font-semibold text-sm">Status:</span>
                  <span className={`ml-1 px-2 py-1 rounded ${styles.status}`}>{app.status}</span>
                </p>
                <p className="mb-2"><span className="font-semibold text-sm">Funding:</span> <span className="text-neutralDark">{app.funding_status}</span></p>
                <p className="mb-2">
                  <span className="font-semibold text-sm">Important Dates:</span>{' '}
                  <span className="text-neutralDark">
                    {app.nearestDate ? (
                      `${app.nearestDate.name}: ${app.nearestDate.date}`
                    ) : (
                      'None'
                    )}
                  </span>
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-accent h-2.5 rounded-full"
                    style={{ width: `${app.progress}%` }}
                  />
                </div>
                <p className="text-neutralDark"><span className="font-semibold text-sm">{app.progress}% Complete</span></p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}