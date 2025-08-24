import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SkeletonDetail } from './SkeletonLoader';

export default function ApplicationDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [importantDates, setImportantDates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [recommenders, setRecommenders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newRequirement, setNewRequirement] = useState({
    name: '',
    criteria_type: null,
    criteria_value: null,
    min_score: null,
    test_type: null,
    waived: false,
    conversion: null,
    type: null,
    num_recommenders: '',
  });

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

  const addRequirement = async () => {
    const { name, criteria_type, criteria_value, min_score, test_type, waived, conversion, type, num_recommenders } = newRequirement;
    if (!name) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(name) && !criteria_type) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(name) && criteria_type !== 'Unspecified' && !criteria_value) return;
    if (name === 'GPA/Class of Degree' && !conversion) return;
    if (name === 'Standardized Test Scores (GRE)' && !min_score) return;
    if (name === 'Application Fee' && !app.application_fee && !app.fee_waived) return;
    if (name === 'Recommenders' && !num_recommenders) return;

    const newReq = {
      application_id: id,
      name,
      is_completed: false,
      criteria_type: criteria_type || null,
      criteria_value: criteria_value ? parseInt(criteria_value) : null,
      min_score: min_score || null,
      test_type: test_type || null,
      waived: waived || false,
      conversion: conversion || null,
      type: type || null,
    };
    const { data, error } = await supabase.from('requirements').insert([newReq]).select().single();
    if (error) console.error(error);
    else {
      setRequirements([...requirements, data]);
      if (name === 'Recommenders' && num_recommenders) {
        const recs = Array(parseInt(num_recommenders)).fill().map(() => ({
          application_id: id,
          status: 'Unidentified',
        }));
        const { error: recError } = await supabase.from('recommenders').insert(recs);
        if (recError) console.error(recError);
        else {
          const { data: newRecs } = await supabase.from('recommenders').select('*').eq('application_id', id);
          setRecommenders(newRecs || []);
        }
      }
      setNewRequirement({
        name: '',
        criteria_type: null,
        criteria_value: null,
        min_score: null,
        test_type: null,
        waived: false,
        conversion: null,
        type: null,
        num_recommenders: '',
      });
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

  const getRequirementDetails = (req) => {
    const details = [];
    if (req.criteria_type && req.criteria_value) details.push(`${req.criteria_value} ${req.criteria_type}`);
    else if (req.criteria_type === 'Unspecified') details.push('Unspecified');
    if (req.test_type) details.push(req.waived ? `${req.test_type}, Waived` : req.test_type);
    else if (req.waived) details.push('Waived');
    if (req.conversion) details.push(`Conversion: ${req.conversion}`);
    if (req.min_score && (req.name === 'Standardized Test Scores (GRE)' || req.name === 'Credential Evaluation')) details.push(req.min_score);
    if (req.type) details.push(req.type);
    return details.join(', ') || 'None';
  };

  const requirementOptions = [
    'Statement of Purpose',
    'Writing Samples',
    'Research Proposal',
    'Transcripts',
    'GPA/Class of Degree',
    'Standardized Test Scores (GRE)',
    'English Proficiency Test Scores',
    'Credential Evaluation',
    'CV/Resume',
    'Application Fee',
    'Recommenders',
    'Others',
  ].filter((option) => !requirements.some((req) => req.name === option));

  if (loading) return <SkeletonDetail />;

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <nav className="mb-6">
        <Link to="/" className="text-secondary hover:underline">Home</Link> &gt; <span className="text-neutralDark">{app.program}</span>
      </nav>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">{app.program}</h2>
        <button onClick={() => setEditMode(!editMode)} className="bg-secondary text-white py-2 px-4 rounded text-sm md:text-base">
          {editMode ? 'View Mode' : 'Edit Mode'}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Core Info */}
        <div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Country:</span>
            {editMode ? (
              <input
                type="text"
                value={app.country}
                onChange={(e) => updateAppField('country', e.target.value)}
                className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                required
              />
            ) : (
              <span className="ml-2">{app.country}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Program Level:</span>
            {editMode ? (
              <select
                value={app.level}
                onChange={(e) => updateAppField('level', e.target.value)}
                className="ml-2 p-1 border border-gray-300 rounded"
                required
              >
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
              </select>
            ) : (
              <span className="ml-2">{app.level}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Application Fee:</span>
            {editMode ? (
              <>
                <input
                  type="text"
                  value={app.application_fee}
                  onChange={(e) => updateAppField('application_fee', e.target.value)}
                  className="ml-2 p-1 border border-gray-300 rounded w-1/2"
                  placeholder="e.g., $100 or 0"
                  disabled={app.fee_waived}
                  required={!app.fee_waived && requirements.some((req) => req.name === 'Application Fee')}
                />
                <label className="block mt-2">
                  <input
                    type="checkbox"
                    checked={app.fee_waived}
                    onChange={() => updateAppField('fee_waived', !app.fee_waived)}
                  />{' '}
                  Fee Waived
                </label>
                {app.fee_waived && (
                  <div className="mt-2">
                    <label className="block text-neutralDark mb-1">Waiver Details</label>
                    <input
                      type="text"
                      value={app.fee_waiver_details || ''}
                      onChange={(e) => updateAppField('fee_waiver_details', e.target.value)}
                      className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                      placeholder="e.g., Financial hardship waiver"
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="ml-2">{app.fee_waived ? `Waived (${app.fee_waiver_details})` : app.application_fee}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Status:</span>
            <select
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
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Funding:</span>
            {editMode ? (
              <select
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
        </div>
        {/* Right Column: Secondary Info */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-neutralDark">Links</h3>
          {app.program_link && (
            <div className="mb-4">
              <span className="font-medium text-neutralDark">Program URL:</span>
              {editMode ? (
                <input
                  type="url"
                  value={app.program_link || ''}
                  onChange={(e) => updateAppField('program_link', e.target.value)}
                  className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                  placeholder="e.g., https://university.edu/program"
                />
              ) : (
                <a
                  href={app.program_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-secondary hover:underline"
                >
                  Program URL
                </a>
              )}
            </div>
          )}
          {app.portal_link && (
            <div className="mb-4">
              <span className="font-medium text-neutralDark">Application URL:</span>
              {editMode ? (
                <input
                  type="url"
                  value={app.portal_link || ''}
                  onChange={(e) => updateAppField('portal_link', e.target.value)}
                  className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                  placeholder="e.g., https://apply.university.edu"
                />
              ) : (
                <a
                  href={app.portal_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-secondary hover:underline"
                >
                  Application URL
                </a>
              )}
            </div>
          )}
          <h3 className="text-xl font-bold mb-4 text-neutralDark">Important Dates</h3>
          <ul className="mb-6">
            {importantDates.map((date) => (
              <li key={date.id} className="mb-2">
                {editMode ? (
                  <>
                    <label className="block text-neutralDark mb-1">Date Name</label>
                    <input
                      type="text"
                      value={date.name}
                      onChange={(e) => updateImportantDate(date.id, 'name', e.target.value)}
                      className="p-1 border border-gray-300 rounded w-full mb-2"
                    />
                    <label className="block text-neutralDark mb-1">Date</label>
                    <input
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
              <button onClick={addImportantDate} className="bg-secondary text-white py-1 px-3 rounded mt-2 text-sm">
                Add Important Date
              </button>
            )}
          </ul>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 text-neutralDark">Requirements</h3>
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-neutralLight">
            <th className="p-2 text-left text-neutralDark">S/N</th>
            <th className="p-2 text-left text-neutralDark">Requirement</th>
            <th className="p-2 text-left text-neutralDark">Detail/Description</th>
            <th className="p-2 text-left text-neutralDark">Status</th>
            {editMode && <th className="p-2 text-left text-neutralDark">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {requirements.map((req, index) => (
            <tr key={req.id} className="border-b">
              <td className="p-2">{index + 1}</td>
              <td className="p-2">{req.name}</td>
              <td className="p-2">{getRequirementDetails(req)}</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={req.is_completed}
                  onChange={(e) => toggleRequirement(req.id, e.target.checked)}
                  disabled={editMode}
                />
              </td>
              {editMode && (
                <td className="p-2">
                  {['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(req.name) && (
                    <div className="flex flex-col space-y-2">
                      <select
                        value={req.criteria_type || ''}
                        onChange={(e) => updateRequirement(req.id, 'criteria_type', e.target.value || null)}
                        className="p-1 border border-gray-300 rounded"
                        required
                      >
                        <option value="">Select Criteria</option>
                        <option>Words</option>
                        <option>Pages</option>
                        <option>Characters</option>
                        <option>Unspecified</option>
                      </select>
                      {req.criteria_type !== 'Unspecified' && (
                        <input
                          type="number"
                          value={req.criteria_value || ''}
                          onChange={(e) => updateRequirement(req.id, 'criteria_value', e.target.value ? parseInt(e.target.value) : null)}
                          className="p-1 border border-gray-300 rounded"
                          placeholder="Value"
                          required
                        />
                      )}
                    </div>
                  )}
                  {req.name === 'Transcripts' && (
                    <select
                      value={req.type || ''}
                      onChange={(e) => updateRequirement(req.id, 'type', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                    >
                      <option value="">Select Type</option>
                      <option>Official</option>
                      <option>Unofficial</option>
                      <option>Evaluated</option>
                    </select>
                  )}
                  {req.name === 'GPA/Class of Degree' && (
                    <input
                      type="text"
                      value={req.conversion || ''}
                      onChange={(e) => updateRequirement(req.id, 'conversion', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="e.g., 3.5/4.0"
                      required
                    />
                  )}
                  {req.name === 'Standardized Test Scores (GRE)' && (
                    <input
                      type="text"
                      value={req.min_score || ''}
                      onChange={(e) => updateRequirement(req.id, 'min_score', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="e.g., 160 Verbal, 160 Quantitative"
                      required
                    />
                  )}
                  {req.name === 'English Proficiency Test Scores' && (
                    <div className="flex flex-col space-y-2">
                      <label>
                        <input
                          type="checkbox"
                          checked={req.waived || false}
                          onChange={(e) => updateRequirement(req.id, 'waived', e.target.checked)}
                        />{' '}
                        Waived
                      </label>
                      {!req.waived && (
                        <select
                          value={req.test_type || ''}
                          onChange={(e) => updateRequirement(req.id, 'test_type', e.target.value || null)}
                          className="p-1 border border-gray-300 rounded"
                        >
                          <option value="">Select Test</option>
                          <option>TOEFL</option>
                          <option>IELTS</option>
                          <option>Duolingo</option>
                          <option>Letter from School</option>
                        </select>
                      )}
                    </div>
                  )}
                  {req.name === 'Credential Evaluation' && (
                    <input
                      type="text"
                      value={req.min_score || ''}
                      onChange={(e) => updateRequirement(req.id, 'min_score', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="e.g., WES Evaluation"
                    />
                  )}
                  <button onClick={() => deleteRequirement(req.id)} className="text-red-500 ml-2">
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editMode && (
        <div className="mb-6">
          <label className="block text-neutralDark mb-1">Add Requirement</label>
          <div className="flex flex-col space-y-2 w-full md:w-1/3">
            <select
              value={newRequirement.name}
              onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value, criteria_type: null, criteria_value: null, min_score: null, test_type: null, waived: false, conversion: null, type: null, num_recommenders: '' })}
              className="p-1 border border-gray-300 rounded"
              required
            >
              <option value="">Select Requirement</option>
              {requirementOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && (
              <div className="flex flex-col space-y-2">
                <select
                  value={newRequirement.criteria_type || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, criteria_type: e.target.value, criteria_value: e.target.value === 'Unspecified' ? null : newRequirement.criteria_value })}
                  className="p-1 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Criteria</option>
                  <option>Words</option>
                  <option>Pages</option>
                  <option>Characters</option>
                  <option>Unspecified</option>
                </select>
                {newRequirement.criteria_type !== 'Unspecified' && (
                  <input
                    type="number"
                    value={newRequirement.criteria_value || ''}
                    onChange={(e) => setNewRequirement({ ...newRequirement, criteria_value: e.target.value })}
                    className="p-1 border border-gray-300 rounded"
                    placeholder="Value"
                    required
                  />
                )}
              </div>
            )}
            {newRequirement.name === 'Transcripts' && (
              <select
                value={newRequirement.type || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value })}
                className="p-1 border border-gray-300 rounded"
              >
                <option value="">Select Type</option>
                <option>Official</option>
                <option>Unofficial</option>
                <option>Evaluated</option>
              </select>
            )}
            {newRequirement.name === 'GPA/Class of Degree' && (
              <input
                type="text"
                value={newRequirement.conversion || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, conversion: e.target.value })}
                className="p-1 border border-gray-300 rounded"
                placeholder="e.g., 3.5/4.0"
                required
              />
            )}
            {newRequirement.name === 'Standardized Test Scores (GRE)' && (
              <input
                type="text"
                value={newRequirement.min_score || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, min_score: e.target.value })}
                className="p-1 border border-gray-300 rounded"
                placeholder="e.g., 160 Verbal, 160 Quantitative"
                required
              />
            )}
            {newRequirement.name === 'English Proficiency Test Scores' && (
              <div className="flex flex-col space-y-2">
                <label>
                  <input
                    type="checkbox"
                    checked={newRequirement.waived || false}
                    onChange={(e) => setNewRequirement({ ...newRequirement, waived: e.target.checked })}
                  />{' '}
                  Waived
                </label>
                {!newRequirement.waived && (
                  <select
                    value={newRequirement.test_type || ''}
                    onChange={(e) => setNewRequirement({ ...newRequirement, test_type: e.target.value })}
                    className="p-1 border border-gray-300 rounded"
                  >
                    <option value="">Select Test</option>
                    <option>TOEFL</option>
                    <option>IELTS</option>
                    <option>Duolingo</option>
                    <option>Letter from School</option>
                  </select>
                )}
              </div>
            )}
            {newRequirement.name === 'Credential Evaluation' && (
              <input
                type="text"
                value={newRequirement.min_score || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, min_score: e.target.value })}
                className="p-1 border border-gray-300 rounded"
                placeholder="e.g., WES Evaluation"
              />
            )}
            {newRequirement.name === 'Recommenders' && (
              <input
                type="number"
                value={newRequirement.num_recommenders || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, num_recommenders: e.target.value })}
                className="p-1 border border-gray-300 rounded"
                placeholder="Number of recommenders"
                min="1"
                required
              />
            )}
            {newRequirement.name && (
              <button
                onClick={addRequirement}
                className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300"
                disabled={
                  !newRequirement.name ||
                  (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && !newRequirement.criteria_type) ||
                  (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && newRequirement.criteria_type !== 'Unspecified' && !newRequirement.criteria_value) ||
                  (newRequirement.name === 'GPA/Class of Degree' && !newRequirement.conversion) ||
                  (newRequirement.name === 'Standardized Test Scores (GRE)' && !newRequirement.min_score) ||
                  (newRequirement.name === 'Application Fee' && !app.application_fee && !app.fee_waived) ||
                  (newRequirement.name === 'Recommenders' && !newRequirement.num_recommenders)
                }
              >
                Add
              </button>
            )}
          </div>
        </div>
      )}
      {recommenders.length > 0 && (
        <>
          <h3 className="text-xl font-bold mb-4 text-neutralDark">Recommenders</h3>
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-neutralLight">
                <th className="p-2 text-left text-neutralDark">S/N</th>
                <th className="p-2 text-left text-neutralDark">Name</th>
                <th className="p-2 text-left text-neutralDark">Email</th>
                <th className="p-2 text-left text-neutralDark">Type</th>
                <th className="p-2 text-left text-neutralDark">Status</th>
                {editMode && <th className="p-2 text-left text-neutralDark">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {recommenders.map((rec, index) => (
                <tr key={rec.id} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={rec.name || ''}
                      onChange={(e) => updateRecommender(rec.id, 'name', e.target.value || null)}
                      disabled={rec.status === 'Unidentified' && !editMode}
                      className={`p-1 border border-gray-300 rounded w-full ${rec.status === 'Unidentified' && !editMode ? 'bg-gray-200' : ''}`}
                      placeholder="Enter name"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="email"
                      value={rec.email || ''}
                      onChange={(e) => updateRecommender(rec.id, 'email', e.target.value || null)}
                      disabled={rec.status === 'Unidentified' && !editMode}
                      className={`p-1 border border-gray-300 rounded w-full ${rec.status === 'Unidentified' && !editMode ? 'bg-gray-200' : ''}`}
                      placeholder="Enter email"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={rec.type || ''}
                      onChange={(e) => updateRecommender(rec.id, 'type', e.target.value || null)}
                      disabled={rec.status === 'Unidentified' && !editMode}
                      className={`p-1 border border-gray-300 rounded w-full ${rec.status === 'Unidentified' && !editMode ? 'bg-gray-200' : ''}`}
                    >
                      <option value="">Select Type</option>
                      <option>Academic</option>
                      <option>Professional</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select
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
        </>
      )}
    </div>
  );
}