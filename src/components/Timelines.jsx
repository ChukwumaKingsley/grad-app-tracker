import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Timelines() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ program: '', country: '', status: '' });

  useEffect(() => {
    fetchDeadlines();
  }, [filters]);

  async function fetchDeadlines() {
    setLoading(true);
    let query = supabase.from('important_dates').select('*, application:application_id(program, country, status, level)');
    if (filters.program) query = query.ilike('application.program', `%${filters.program}%`);
    if (filters.country) query = query.ilike('application.country', `%${filters.country}%`);
    if (filters.status) query = query.eq('application.status', filters.status);
    query = query.order('date', { ascending: true });
    const { data, error } = await query;
    if (!error) setDeadlines(data || []);
    setLoading(false);
  }

  function handleFilterChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Upcoming Deadlines & Timelines</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <input name="program" value={filters.program} onChange={handleFilterChange} placeholder="Filter by program" className="border p-2 rounded" />
        <input name="country" value={filters.country} onChange={handleFilterChange} placeholder="Filter by country" className="border p-2 rounded" />
        <input name="status" value={filters.status} onChange={handleFilterChange} placeholder="Filter by status" className="border p-2 rounded" />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full text-left text-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Program</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Level</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((d, idx) => (
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
      )}
    </div>
  );
}
