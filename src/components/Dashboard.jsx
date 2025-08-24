import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

export default function Dashboard({ session }) {
  const [applications, setApplications] = useState([]);
  const [deadlinesMap, setDeadlinesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error(appsError);
      setLoading(false);
      return;
    }

    const appIds = apps.map((app) => app.id);
    const { data: dls, error: dlsError } = await supabase
      .from('deadlines')
      .select('*')
      .in('application_id', appIds)
      .order('date', { ascending: true });

    if (dlsError) console.error(dlsError);

    const dlMap = {};
    dls.forEach((dl) => {
      if (!dlMap[dl.application_id]) dlMap[dl.application_id] = [];
      dlMap[dl.application_id].push(dl);
    });

    setApplications(apps);
    setDeadlinesMap(dlMap);
    setLoading(false);
  };

  if (loading) return <div className="text-center text-neutralDark">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-neutralDark">My Applications</h2>
        <Link to="/add" className="bg-primary hover:bg-blue-900 text-white py-2 px-4 rounded">
          Add Application
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((app) => {
          const appDeadlines = deadlinesMap[app.id] || [];
          const today = new Date();
          const nextDl = appDeadlines.find((dl) => new Date(dl.date) > today);
          const nextDeadline = nextDl ? nextDl.date : 'None';

          let statusColor = '';
          if (app.status === 'Submitted') statusColor = 'bg-accent text-white';
          else if (app.status === 'Planning') statusColor = 'bg-gray-200 text-gray-800';
          else statusColor = 'bg-secondary text-white';

          return (
            <Link
              key={app.id}
              to={`/application/${app.id}`}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-primary">{app.program}</h3>
              <p className="text-neutralDark">{app.country} - {app.level}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                {app.status}
              </span>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-accent h-2.5 rounded-full" style={{ width: `${app.progress}%` }} />
                </div>
                <p className="text-sm text-neutralDark mt-1">{app.progress}% Complete</p>
              </div>
              <p className="mt-2 text-sm text-neutralDark">Next Deadline: {nextDeadline}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}