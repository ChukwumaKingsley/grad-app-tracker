import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function ApplicationDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [importantDates, setImportantDates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [recommenders, setRecommenders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: appData, error: appError } = await supabase.from('applications').select('*').eq('id', id).single();
    if (appError || !appData || appData.user_id !== session.user.id) {
      console.error(appError);
      navigate('/');
      return;
    }
    setApp(appData);

    const { data: dateData } = await supabase.from('important_dates').select('*').eq('application_id', id).order('date');
    setImportantDates(dateData || []);

    const { data: reqData } = await supabase.from('requirements').select('*').eq('application_id', id);
    setRequirements(reqData || []);

    const { data: recData } = await supabase.from('recommenders').select('*').eq('application_id', id);
    setRecommenders(recData || []);

    setLoading(false);
  };

  const updateProgress = async () => {
    const completedReqs = requirements.filter((r) => r.is_completed).length;
    const submittedRecs = recommenders.filter((r) => r.status === 'Submitted').length;
    const total = requirements.length + recommenders.length;
    const newProgress = total > 0 ? Math.round((completedReqs + submittedRecs) / total * 100) : 0;

    const { error } = await supabase.from('applications').update({ progress: newProgress }).eq('id', id);
    if (error) console.error(error);
    else setApp({ ...app, progress: newProgress });
  };

  const toggleRequirement = async (reqId, isCompleted) => {
    const { error } = await supabase.from('requirements').update({ is_completed: isCompleted }).eq('id', reqId);
    if (error) console.error(error);
    else {
      setRequirements(requirements.map((r) => (r.id === reqId ? { ...r, is_completed: isCompleted } : r)));
      updateProgress();
    }
  };

  const updateRecommender = async (recId, field, value) => {
    const { error } = await supabase.from('recommenders').update({ [field]: value }).eq('id', recId);
    if (error) console.error(error);
    else {
      setRecommenders(recommenders.map((r) => (r.id === recId ? { ...r, [field]: value } : r)));
      if (field === 'status') updateProgress();
    }
  };

  const updateAppField = async (field, value) => {
    const { error } = await supabase.from('applications').update({ [field]: value }).eq('id', id);
    if (error) console.error(error);
    else setApp({ ...app, [field]: value });
  };

  const addImportantDate = async () => {
    const newDate = { application_id: id, name: 'New Date', date: new Date().toISOString().split('T')[0] };
    const { data, error } = await supabase.from('important_dates').insert([newDate]).select().single();
    if (error) console.error(error);
    else setImportantDates([...importantDates, data]);
  };

  const updateImportantDate = async (dateId, field, value) => {
    const { error } = await supabase.from('important_dates').update({ [field]: value }).eq('id', dateId);
    if (error) console.error(error);
    else setImportantDates(importantDates.map((d) => (d.id === dateId ? { ...d, [field]: value } : d)));
  };

  const addRequirement = async (name, criteria_type = null, criteria_value = null, min_score = null) => {
    if (!name) return;
    const newReq = { application_id: id, name, is_completed: false, criteria_type, criteria_value, min_score };
    const { data, error } = await supabase.from('requirements').insert([newReq]).select().single();
    if (error) console.error(error);
    else {
      setRequirements([...requirements, data]);
      updateProgress();
    }
  };

  const updateRequirement = async (reqId, field, value) => {
    const { error } = await supabase.from('requirements').update({ [field]: value }).eq('id', reqId);
    if (error) console.error(error);
    else setRequirements(requirements.map((r) => (r.id === reqId ? { ...r, [field]: value } : r)));
  };

  const deleteRequirement = async (reqId) => {
    const { error } = await supabase.from('requirements').delete().eq('id', reqId);
    if (error) console.error(error);
    else {
      setRequirements(requirements.filter((r) => r.id !== reqId));
      updateProgress();
    }
  };

  const deleteRecommender = async (recId) => {
    const { error } = await supabase.from('recommenders').delete().eq('id', recId);
    if (error) console.error(error);
    else {
      setRecommenders(recommenders.filter((r) => r.id !== recId));
      updateProgress();
    }
  };

  if (loading) return <div className="text-center text-neutralDark">Loading...</div>;

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <nav className="mb-6">
        <Link to="/" className="text-secondary hover:underline">Home</Link> &gt; <span className="text-neutralDark">{app.program}</span>
      </nav>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">{app.program}</h2>
        <button onClick={() => setEditMode(!editMode)} className="bg-secondary text-white py-2 px-4 rounded">
          {editMode ? 'Update Mode' : 'Edit Mode'}
        </button>
      </div>
      <p className="text-neutralDark mb-4">{app.country} - {app.level}</p>
      <div className="mb-4">
        <label htmlFor="app-status" className="font-medium text-neutralDark">Status:</label>
        {editMode ? (
          <select
            id="app-status"
            value={app.status}
            onChange={(e) => updateAppField('status', e.target.value)}
            className="ml-2 p-1 border border-gray-300 rounded"
          >
            <option>Planning</option>
            <option>In Progress</option>
            <option>Submitted</option>
            <option>Abandoned</option>
            <option>Waitlisted</option>
            <option>Awarded</option>
          </select>
        ) : (
          <span className="ml-2">{app.status}</span>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="funding-status" className="font-medium text-neutralDark">Funding:</label>
        {editMode ? (
          <select
            id="funding-status"
            value={app.funding_status}
            onChange={(e) => updateAppField('funding_status', e.target.value)}
            className="ml-2 p-1 border border-gray-300 rounded"
          >
            <option>None</option>
            <option>Partial</option>
            <option>Full</option>
          </select>
        ) : (
          <span className="ml-2">{app.funding_status}</span>
        )}
      </div>
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${app.progress}%` }} />
        </div>
        <p className="text-neutralDark">{app.progress}% Complete</p>
      </div>

      <h3 className="text-2xl font-bold mb-4 text-neutralDark">Important Dates</h3>
      <ul className="mb-6">
        {importantDates.map((date) => (
          <li key={date.id} className="mb-2">
            {editMode ? (
              <>
                <label htmlFor={`date-name-${date.id}`} className="block text-neutralDark mb-1">Date Name</label>
                <input
                  id={`date-name-${date.id}`}
                  type="text"
                  value={date.name}
                  onChange={(e) => updateImportantDate(date.id, 'name', e.target.value)}
                  className="p-1 border border-gray-300 rounded mr-2 w-full"
                />
                <label htmlFor={`date-date-${date.id}`} className="block text-neutralDark mb-1 mt-2">Date</label>
                <input
                  id={`date-date-${date.id}`}
                  type="date"
                  value={date.date}
                  onChange={(e) => updateImportantDate(date.id, 'date', e.target.value)}
                  className="p-1 border border-gray-300 rounded w-full"
                />
              </>
            ) : (
              `${date.name}: ${date.date}`
            )}
          </li>
        ))}
        {editMode && (
          <button onClick={addImportantDate} className="bg-secondary text-white py-1 px-3 rounded mt-2">
            Add Important Date
          </button>
        )}
      </ul>

      <h3 className="text-2xl font-bold mb-4 text-neutralDark">Requirements</h3>
      <ul className="mb-6">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center mb-2">
            {!editMode ? (
              <input
                type="checkbox"
                checked={req.is_completed}
                onChange={(e) => toggleRequirement(req.id, e.target.checked)}
              />
            ) : null}
            <span className="ml-2">
              {req.name}
              {req.criteria_type && req.criteria_value ? ` (${req.criteria_value} ${req.criteria_type})` : ''}
              {req.min_score ? ` (Min Score: ${req.min_score})` : ''}
            </span>
            {editMode && (
              <div className="ml-auto flex items-center">
                {['Writing Sample', 'Personal Statement', 'Statement of Purpose/Motivation Letter'].includes(req.name) && (
                  <>
                    <label htmlFor={`req-criteria-${req.id}`} className="text-neutralDark mr-2">Criteria Type</label>
                    <select
                      id={`req-criteria-${req.id}`}
                      value={req.criteria_type || ''}
                      onChange={(e) => updateRequirement(req.id, 'criteria_type', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded mr-2"
                    >
                      <option value="">Select Criteria</option>
                      <option>Words</option>
                      <option>Pages</option>
                    </select>
                    <label htmlFor={`req-value-${req.id}`} className="text-neutralDark mr-2">Criteria Value</label>
                    <input
                      id={`req-value-${req.id}`}
                      type="number"
                      value={req.criteria_value || ''}
                      onChange={(e) => updateRequirement(req.id, 'criteria_value', e.target.value ? parseInt(e.target.value) : null)}
                      className="p-1 border border-gray-300 rounded mr-2"
                      placeholder="Value"
                    />
                  </>
                )}
                {['GRE', 'TOEFL/IELTS'].includes(req.name) && (
                  <>
                    <label htmlFor={`req-min-score-${req.id}`} className="text-neutralDark mr-2">Minimum Score</label>
                    <input
                      id={`req-min-score-${req.id}`}
                      type="number"
                      value={req.min_score || ''}
                      onChange={(e) => updateRequirement(req.id, 'min_score', e.target.value ? parseInt(e.target.value) : null)}
                      className="p-1 border border-gray-300 rounded mr-2"
                      placeholder="Min Score"
                    />
                  </>
                )}
                <button onClick={() => deleteRequirement(req.id)} className="text-red-500">
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
        {editMode && (
          <div className="mt-4">
            <label htmlFor="new-req" className="block text-neutralDark mb-1">New Requirement</label>
            <div className="flex">
              <input id="new-req" type="text" placeholder="Enter requirement" className="p-1 border border-gray-300 rounded mr-2 flex-1" />
              <button onClick={() => addRequirement(document.getElementById('new-req').value)} className="bg-secondary text-white py-1 px-3 rounded">
                Add
              </button>
            </div>
          </div>
        )}
      </ul>

      <h3 className="text-2xl font-bold mb-4 text-neutralDark">Recommenders</h3>
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-neutralLight">
            <th className="p-2 text-left text-neutralDark">Name</th>
            <th className="p-2 text-left text-neutralDark">Type</th>
            <th className="p-2 text-left text-neutralDark">Email</th>
            <th className="p-2 text-left text-neutralDark">Status</th>
            {editMode && <th className="p-2 text-left text-neutralDark">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {recommenders.map((rec) => (
            <tr key={rec.id} className="border-b">
              <td className="p-2">
                <label htmlFor={`rec-name-${rec.id}`} className="block text-neutralDark mb-1">Recommender Name</label>
                <input
                  id={`rec-name-${rec.id}`}
                  type="text"
                  value={rec.name}
                  onChange={(e) => updateRecommender(rec.id, 'name', e.target.value)}
                  disabled={rec.status === 'Unidentified' || editMode}
                  className="p-1 border border-gray-300 rounded w-full disabled:bg-gray-100"
                />
              </td>
              <td className="p-2">
                <label htmlFor={`rec-type-${rec.id}`} className="block text-neutralDark mb-1">Recommender Type</label>
                <select
                  id={`rec-type-${rec.id}`}
                  value={rec.type || ''}
                  onChange={(e) => updateRecommender(rec.id, 'type', e.target.value || null)}
                  disabled={rec.status === 'Unidentified' || editMode}
                  className="p-1 border border-gray-300 rounded w-full disabled:bg-gray-100"
                >
                  <option value="">Select Type</option>
                  <option>Academic</option>
                  <option>Professional</option>
                </select>
              </td>
              <td className="p-2">
                <label htmlFor={`rec-email-${rec.id}`} className="block text-neutralDark mb-1">Email</label>
                <input
                  id={`rec-email-${rec.id}`}
                  type="email"
                  value={rec.email || ''}
                  onChange={(e) => updateRecommender(rec.id, 'email', e.target.value || null)}
                  disabled={rec.status === 'Unidentified' || editMode}
                  className="p-1 border border-gray-300 rounded w-full disabled:bg-gray-100"
                />
              </td>
              <td className="p-2">
                <label htmlFor={`rec-status-${rec.id}`} className="block text-neutralDark mb-1">Status</label>
                <select
                  id={`rec-status-${rec.id}`}
                  value={rec.status}
                  onChange={(e) => updateRecommender(rec.id, 'status', e.target.value)}
                  className="p-1 border border-gray-300 rounded w-full"
                >
                  <option>Unidentified</option>
                  <option>Identified</option>
                  <option>Contacted</option>
                  <option>In Progress</option>
                  <option>Submitted</option>
                </select>
              </td>
              {editMode && (
                <td className="p-2">
                  <button onClick={() => deleteRecommender(rec.id)} className="text-red-500">
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-2xl font-bold mb-4 text-neutralDark">Links</h3>
      <div className="mb-4">
        <label htmlFor="program-link" className="font-medium text-neutralDark">Program Link:</label>
        {editMode ? (
          <input
            id="program-link"
            type="url"
            value={app.program_link || ''}
            onChange={(e) => updateAppField('program_link', e.target.value)}
            className="ml-2 p-1 border border-gray-300 rounded w-1/2"
            placeholder="e.g., https://university.edu/program"
          />
        ) : (
          <a href={app.program_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-secondary hover:underline">
            {app.program_link || 'None'}
          </a>
        )}
      </div>
      <div>
        <label htmlFor="portal-link" className="font-medium text-neutralDark">Portal Link:</label>
        {editMode ? (
          <input
            id="portal-link"
            type="url"
            value={app.portal_link || ''}
            onChange={(e) => updateAppField('portal_link', e.target.value)}
            className="ml-2 p-1 border border-gray-300 rounded w-1/2"
            placeholder="e.g., https://apply.university.edu"
          />
        ) : (
          <a href={app.portal_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-secondary hover:underline">
            {app.portal_link || 'None'}
          </a>
        )}
      </div>
    </div>
  );
}