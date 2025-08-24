import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

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

  if (loading) return <div className="text-center text-neutralDark">Loading...</div>;

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
          {applications.map((app) => (
            <Link
              key={app.id}
              to={`/application/${app.id}`}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-bold text-primary mb-2">{app.program}</h2>
              <p className="text-neutralDark mb-2">{app.country} - {app.level}</p>
              <p className="text-neutralDark mb-2">Status: {app.status}</p>
              <p className="text-neutralDark mb-2">Funding: {app.funding_status}</p>
              <p className="text-neutralDark mb-2">
                Important Dates:{' '}
                {app.nearestDate ? (
                  `${app.nearestDate.name}: ${app.nearestDate.date}`
                ) : (
                  'None'
                )}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-accent h-2.5 rounded-full"
                  style={{ width: `${app.progress}%` }}
                />
              </div>
              <p className="text-neutralDark">{app.progress}% Complete</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}