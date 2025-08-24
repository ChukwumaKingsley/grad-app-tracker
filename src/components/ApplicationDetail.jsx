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
    application_fee: '',
    fee_waived: false,
    fee_waiver_details: '',
  });
  const [newRecommender, setNewRecommender] = useState(null); // For adding/editing recommender
  const [pendingChanges, setPendingChanges] = useState({}); // Track requirement changes
  const [appChanges, setAppChanges] = useState({}); // Track application field changes

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

    const { data: recData } = await supabase.from('recommenders').select('*').eq('application_id', id).order('id');
    const recommenderReq = reqData?.find((req) => req.name === 'Recommenders');
    const numRecommenders = recommenderReq ? parseInt(recommenderReq.num_recommenders) || 0 : 0;
    const paddedRecommenders = recData || [];
    while (paddedRecommenders.length < numRecommenders) {
      paddedRecommenders.push({
        id: `temp-${paddedRecommenders.length}`,
        application_id: id,
        name: null,
        email: null,
        type: null,
        status: 'Unidentified',
      });
    }
    setRecommenders(paddedRecommenders.slice(0, numRecommenders));

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

  const updateAppField = (field, value) => {
    setAppChanges({ ...appChanges, [field]: value });
  };

  const saveAppChanges = async () => {
    if (Object.keys(appChanges).length === 0) return;
    const { error } = await supabase.from('applications').update(appChanges).eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setApp({ ...app, ...appChanges });
    setNewRequirement({ ...newRequirement, ...appChanges });
    setAppChanges({});
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

  const adjustRecommendersTable = async (newNumRecommenders, oldNumRecommenders) => {
    const currentRecommenders = await supabase.from('recommenders').select('*').eq('application_id', id).order('id');
    const currentCount = currentRecommenders.data?.length || 0;
    const newCount = parseInt(newNumRecommenders) || 0;

    if (newCount > currentCount) {
      const additionalRecs = Array(newCount - currentCount).fill().map(() => ({
        application_id: id,
        status: 'Unidentified',
      }));
      const { error } = await supabase.from('recommenders').insert(additionalRecs);
      if (error) console.error(error);
    } else if (newCount < currentCount) {
      const toDelete = currentRecommenders.data
        .filter((r) => r.status === 'Unidentified')
        .slice(0, currentCount - newCount);
      if (toDelete.length > 0) {
        const { error } = await supabase.from('recommenders').delete().in('id', toDelete.map((r) => r.id));
        if (error) console.error(error);
      }
    }
    const { data: updatedRecs } = await supabase.from('recommenders').select('*').eq('application_id', id).order('id');
    const paddedRecommenders = updatedRecs || [];
    while (paddedRecommenders.length < newCount) {
      paddedRecommenders.push({
        id: `temp-${paddedRecommenders.length}`,
        application_id: id,
        name: null,
        email: null,
        type: null,
        status: 'Unidentified',
      });
    }
    setRecommenders(paddedRecommenders.slice(0, newCount));
    updateProgress();
  };

  const addRequirement = async () => {
    const { name, criteria_type, criteria_value, min_score, test_type, waived, conversion, type, num_recommenders, application_fee, fee_waived, fee_waiver_details } = newRequirement;
    if (!name) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(name) && !criteria_type) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(name) && criteria_type !== 'Unspecified' && !criteria_value) return;
    if (name === 'GPA/Class of Degree' && !conversion) return;
    if (name === 'Standardized Test Scores (GRE)' && !min_score) return;
    if (name === 'Application Fee' && !fee_waived && !application_fee) return;
    if (name === 'Application Fee' && fee_waived && !fee_waiver_details) return;
    if (name === 'Recommenders' && !num_recommenders) return;

    if (name === 'Application Fee') {
      await updateAppField('application_fee', fee_waived ? '0' : application_fee);
      await updateAppField('fee_waived', fee_waived);
      await updateAppField('fee_waiver_details', fee_waived ? fee_waiver_details : null);
      await saveAppChanges();
    }

    if (name === 'Recommenders') {
      const existingRecommenderReq = requirements.find((req) => req.name === 'Recommenders');
      if (existingRecommenderReq) {
        const { error } = await supabase.from('requirements').update({ num_recommenders }).eq('id', existingRecommenderReq.id);
        if (error) {
          console.error(error);
          return;
        }
        setRequirements(requirements.map((r) => (r.id === existingRecommenderReq.id ? { ...r, num_recommenders } : r)));
        await adjustRecommendersTable(num_recommenders, existingRecommenderReq.num_recommenders);
      } else {
        const newReq = {
          application_id: id,
          name,
          is_completed: false,
          num_recommenders: parseInt(num_recommenders),
        };
        const { data, error } = await supabase.from('requirements').insert([newReq]).select().single();
        if (error) {
          console.error(error);
          return;
        }
        setRequirements([...requirements, data]);
        await adjustRecommendersTable(num_recommenders, 0);
      }
    } else {
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
      if (error) {
        console.error(error);
        return;
      }
      setRequirements([...requirements, data]);
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
      application_fee: app.application_fee,
      fee_waived: app.fee_waived,
      fee_waiver_details: app.fee_waiver_details,
    });
    updateProgress();
  };

  const updateRequirementField = (reqId, field, value) => {
    setPendingChanges({
      ...pendingChanges,
      [reqId]: { ...pendingChanges[reqId], [field]: value },
    });
  };

  const saveRequirementChanges = async () => {
    for (const [reqId, changes] of Object.entries(pendingChanges)) {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from('requirements').update(changes).eq('id', reqId);
        if (error) {
          console.error(error);
          continue;
        }
        setRequirements(requirements.map((r) =>
          r.id === reqId ? { ...r, ...changes } : r
        ));
        if (changes.num_recommenders) {
          const oldNumRecommenders = requirements.find((r) => r.id === reqId)?.num_recommenders;
          await adjustRecommendersTable(changes.num_recommenders, oldNumRecommenders);
        }
      }
    }
    setPendingChanges({});
  };

  const deleteRequirement = async (reqId) => {
    const req = requirements.find((r) => r.id === reqId);
    if (req.name === 'Recommenders') {
      const { error } = await supabase.from('recommenders').delete().eq('application_id', id);
      if (error) console.error(error);
      else setRecommenders([]);
    }
    const { error } = await supabase.from('requirements').delete().eq('id', reqId);
    if (error) console.error(error);
    else {
      setRequirements(requirements.filter((r) => r.id !== reqId));
      delete pendingChanges[reqId];
      setPendingChanges({ ...pendingChanges });
      updateProgress();
    }
  };

  const saveRecommender = async () => {
    if (!newRecommender.name || !newRecommender.email || !newRecommender.type || !newRecommender.status) return;

    if (newRecommender.id) {
      // Update existing recommender
      const { error } = await supabase.from('recommenders').update({
        name: newRecommender.name,
        email: newRecommender.email,
        type: newRecommender.type,
        status: newRecommender.status,
      }).eq('id', newRecommender.id);
      if (error) {
        console.error(error);
        return;
      }
      setRecommenders(recommenders.map((r) =>
        r.id === newRecommender.id ? { ...r, ...newRecommender } : r
      ));
    } else {
      // Add new recommender
      const unidentifiedIndex = recommenders.findIndex((r) => r.status === 'Unidentified');
      if (unidentifiedIndex === -1) return; // No empty rows available
      const { data, error } = await supabase.from('recommenders').insert([{
        application_id: id,
        name: newRecommender.name,
        email: newRecommender.email,
        type: newRecommender.type,
        status: newRecommender.status,
      }]).select().single();
      if (error) {
        console.error(error);
        return;
      }
      setRecommenders(recommenders.map((r, index) =>
        index === unidentifiedIndex ? data : r
      ));
    }
    setNewRecommender(null);
    updateProgress();
  };

  const editRecommender = (recommender) => {
    setNewRecommender({ ...recommender });
  };

  const deleteRecommender = async (recId) => {
    if (!recId.startsWith('temp-')) {
      const { error } = await supabase.from('recommenders').delete().eq('id', recId);
      if (error) {
        console.error(error);
        return;
      }
    }
    const recommenderReq = requirements.find((req) => req.name === 'Recommenders');
    const numRecommenders = recommenderReq ? parseInt(recommenderReq.num_recommenders) || 0 : 0;
    const updatedRecommenders = recommenders.filter((r) => r.id !== recId);
    while (updatedRecommenders.length < numRecommenders) {
      updatedRecommenders.push({
        id: `temp-${updatedRecommenders.length}`,
        application_id: id,
        name: null,
        email: null,
        type: null,
        status: 'Unidentified',
      });
    }
    setRecommenders(updatedRecommenders.slice(0, numRecommenders));
    updateProgress();
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
    if (req.name === 'Application Fee') details.push(app.fee_waived ? `Waived (${app.fee_waiver_details})` : app.application_fee);
    if (req.name === 'Recommenders' && req.num_recommenders) details.push(`Number: ${req.num_recommenders}`);
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
                value={appChanges.country || app.country}
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
                value={appChanges.level || app.level}
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
                  value={appChanges.application_fee || app.application_fee}
                  onChange={(e) => {
                    updateAppField('application_fee', e.target.value);
                    setNewRequirement({ ...newRequirement, application_fee: e.target.value });
                  }}
                  className="ml-2 p-1 border border-gray-300 rounded w-1/2"
                  placeholder="e.g., $100 or 0"
                  disabled={appChanges.fee_waived ?? app.fee_waived}
                  required={!(appChanges.fee_waived ?? app.fee_waived) && requirements.some((req) => req.name === 'Application Fee')}
                />
                <label className="block mt-2">
                  <input
                    type="checkbox"
                    checked={appChanges.fee_waived ?? app.fee_waived}
                    onChange={() => {
                      const newWaived = !(appChanges.fee_waived ?? app.fee_waived);
                      updateAppField('fee_waived', newWaived);
                      setNewRequirement({ ...newRequirement, fee_waived: newWaived });
                    }}
                  />{' '}
                  Fee Waived
                </label>
                {(appChanges.fee_waived ?? app.fee_waived) && (
                  <div className="mt-2">
                    <label className="block text-neutralDark mb-1">Waiver Details</label>
                    <input
                      type="text"
                      value={appChanges.fee_waiver_details || app.fee_waiver_details || ''}
                      onChange={(e) => {
                        updateAppField('fee_waiver_details', e.target.value);
                        setNewRequirement({ ...newRequirement, fee_waiver_details: e.target.value });
                      }}
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
              value={appChanges.status || app.status}
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
                value={appChanges.funding_status || app.funding_status}
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
          {editMode && (
            <button
              onClick={saveAppChanges}
              className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300"
              disabled={Object.keys(appChanges).length === 0}
            >
              Save Application Changes
            </button>
          )}
          <div className="mb-6 mt-4">
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
                  value={appChanges.program_link || app.program_link || ''}
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
                  value={appChanges.portal_link || app.portal_link || ''}
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
                        value={pendingChanges[req.id]?.criteria_type || req.criteria_type || ''}
                        onChange={(e) => updateRequirementField(req.id, 'criteria_type', e.target.value || null)}
                        className="p-1 border border-gray-300 rounded"
                        required
                      >
                        <option value="">Select Criteria</option>
                        <option>Words</option>
                        <option>Pages</option>
                        <option>Characters</option>
                        <option>Unspecified</option>
                      </select>
                      {(pendingChanges[req.id]?.criteria_type || req.criteria_type) !== 'Unspecified' && (
                        <input
                          type="number"
                          value={pendingChanges[req.id]?.criteria_value || req.criteria_value || ''}
                          onChange={(e) => updateRequirementField(req.id, 'criteria_value', e.target.value ? parseInt(e.target.value) : null)}
                          className="p-1 border border-gray-300 rounded"
                          placeholder="Value"
                          required
                        />
                      )}
                    </div>
                  )}
                  {req.name === 'Transcripts' && (
                    <select
                      value={pendingChanges[req.id]?.type || req.type || ''}
                      onChange={(e) => updateRequirementField(req.id, 'type', e.target.value || null)}
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
                      value={pendingChanges[req.id]?.conversion || req.conversion || ''}
                      onChange={(e) => updateRequirementField(req.id, 'conversion', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="e.g., 3.5/4.0"
                      required
                    />
                  )}
                  {req.name === 'Standardized Test Scores (GRE)' && (
                    <input
                      type="text"
                      value={pendingChanges[req.id]?.min_score || req.min_score || ''}
                      onChange={(e) => updateRequirementField(req.id, 'min_score', e.target.value || null)}
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
                          checked={pendingChanges[req.id]?.waived ?? req.waived}
                          onChange={(e) => updateRequirementField(req.id, 'waived', e.target.checked)}
                        />{' '}
                        Waived
                      </label>
                      {!(pendingChanges[req.id]?.waived ?? req.waived) && (
                        <select
                          value={pendingChanges[req.id]?.test_type || req.test_type || ''}
                          onChange={(e) => updateRequirementField(req.id, 'test_type', e.target.value || null)}
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
                      value={pendingChanges[req.id]?.min_score || req.min_score || ''}
                      onChange={(e) => updateRequirementField(req.id, 'min_score', e.target.value || null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="e.g., WES Evaluation"
                    />
                  )}
                  {req.name === 'Application Fee' && (
                    <div className="flex flex-col space-y-2">
                      <input
                        type="text"
                        value={appChanges.application_fee || app.application_fee}
                        onChange={(e) => {
                          updateAppField('application_fee', e.target.value);
                          setNewRequirement({ ...newRequirement, application_fee: e.target.value });
                        }}
                        className="p-1 border border-gray-300 rounded"
                        placeholder="e.g., $100 or 0"
                        disabled={appChanges.fee_waived ?? app.fee_waived}
                        required={!(appChanges.fee_waived ?? app.fee_waived)}
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={appChanges.fee_waived ?? app.fee_waived}
                          onChange={() => {
                            const newWaived = !(appChanges.fee_waived ?? app.fee_waived);
                            updateAppField('fee_waived', newWaived);
                            setNewRequirement({ ...newRequirement, fee_waived: newWaived });
                          }}
                        />{' '}
                        Fee Waived
                      </label>
                      {(appChanges.fee_waived ?? app.fee_waived) && (
                        <input
                          type="text"
                          value={appChanges.fee_waiver_details || app.fee_waiver_details || ''}
                          onChange={(e) => {
                            updateAppField('fee_waiver_details', e.target.value);
                            setNewRequirement({ ...newRequirement, fee_waiver_details: e.target.value });
                          }}
                          className="p-1 border border-gray-300 rounded"
                          placeholder="e.g., Financial hardship waiver"
                          required
                        />
                      )}
                    </div>
                  )}
                  {req.name === 'Recommenders' && (
                    <input
                      type="number"
                      value={pendingChanges[req.id]?.num_recommenders || req.num_recommenders || ''}
                      onChange={(e) => updateRequirementField(req.id, 'num_recommenders', e.target.value ? parseInt(e.target.value) : null)}
                      className="p-1 border border-gray-300 rounded"
                      placeholder="Number of recommenders"
                      min="1"
                      required
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
        <>
          <div className="mb-6">
            <label className="block text-neutralDark mb-1">Add Requirement</label>
            <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 w-full md:w-3/4">
              <select
                value={newRequirement.name}
                onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value, criteria_type: null, criteria_value: null, min_score: null, test_type: null, waived: false, conversion: null, type: null, num_recommenders: '', application_fee: app.application_fee, fee_waived: app.fee_waived, fee_waiver_details: app.fee_waiver_details })}
                className="p-1 border border-gray-300 rounded flex-1"
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
                <>
                  <select
                    value={newRequirement.criteria_type || ''}
                    onChange={(e) => setNewRequirement({ ...newRequirement, criteria_type: e.target.value, criteria_value: e.target.value === 'Unspecified' ? null : newRequirement.criteria_value })}
                    className="p-1 border border-gray-300 rounded flex-1"
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
                      className="p-1 border border-gray-300 rounded flex-1"
                      placeholder="Value"
                      required
                    />
                  )}
                </>
              )}
              {newRequirement.name === 'Transcripts' && (
                <select
                  value={newRequirement.type || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value })}
                  className="p-1 border border-gray-300 rounded flex-1"
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
                  className="p-1 border border-gray-300 rounded flex-1"
                  placeholder="e.g., 3.5/4.0"
                  required
                />
              )}
              {newRequirement.name === 'Standardized Test Scores (GRE)' && (
                <input
                  type="text"
                  value={newRequirement.min_score || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, min_score: e.target.value })}
                  className="p-1 border border-gray-300 rounded flex-1"
                  placeholder="e.g., 160 Verbal, 160 Quantitative"
                  required
                />
              )}
              {newRequirement.name === 'English Proficiency Test Scores' && (
                <div className="flex flex-col space-y-2 flex-1">
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
                  className="p-1 border border-gray-300 rounded flex-1"
                  placeholder="e.g., WES Evaluation"
                />
              )}
              {newRequirement.name === 'Recommenders' && (
                <input
                  type="number"
                  value={newRequirement.num_recommenders || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, num_recommenders: e.target.value })}
                  className="p-1 border border-gray-300 rounded flex-1"
                  placeholder="Number of recommenders"
                  min="1"
                  required
                />
              )}
              {newRequirement.name === 'Application Fee' && (
                <>
                  <input
                    type="text"
                    value={newRequirement.application_fee}
                    onChange={(e) => {
                      setNewRequirement({ ...newRequirement, application_fee: e.target.value });
                      updateAppField('application_fee', e.target.value);
                    }}
                    className="p-1 border border-gray-300 rounded flex-1"
                    placeholder="e.g., $100 or 0"
                    disabled={newRequirement.fee_waived}
                    required={!newRequirement.fee_waived}
                  />
                  <label className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={newRequirement.fee_waived}
                      onChange={() => {
                        const newWaived = !newRequirement.fee_waived;
                        setNewRequirement({ ...newRequirement, fee_waived: newWaived });
                        updateAppField('fee_waived', newWaived);
                      }}
                    />{' '}
                    <span className="ml-1 text-sm">Fee Waived</span>
                  </label>
                  {newRequirement.fee_waived && (
                    <input
                      type="text"
                      value={newRequirement.fee_waiver_details || ''}
                      onChange={(e) => {
                        setNewRequirement({ ...newRequirement, fee_waiver_details: e.target.value });
                        updateAppField('fee_waiver_details', e.target.value);
                      }}
                      className="p-1 border border-gray-300 rounded flex-1"
                      placeholder="e.g., Financial hardship waiver"
                      required
                    />
                  )}
                </>
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
                    (newRequirement.name === 'Application Fee' && !newRequirement.fee_waived && !newRequirement.application_fee) ||
                    (newRequirement.name === 'Application Fee' && newRequirement.fee_waived && !newRequirement.fee_waiver_details) ||
                    (newRequirement.name === 'Recommenders' && !newRequirement.num_recommenders)
                  }
                >
                  Add
                </button>
              )}
            </div>
          </div>
          {Object.keys(pendingChanges).length > 0 && (
            <button
              onClick={saveRequirementChanges}
              className="bg-secondary text-white py-1 px-3 rounded text-sm"
            >
              Save Requirement Changes
            </button>
          )}
        </>
      )}
      {recommenders.length > 0 && (
        <>
          <h3 className="text-xl font-bold mb-4 text-neutralDark">References</h3>
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-neutralLight">
                <th className="p-2 text-left text-neutralDark">S/N</th>
                <th className="p-2 text-left text-neutralDark">Name</th>
                <th className="p-2 text-left text-neutralDark">Email</th>
                <th className="p-2 text-left text-neutralDark">Type</th>
                <th className="p-2 text-left text-neutralDark">Status</th>
                {!editMode && <th className="p-2 text-left text-neutralDark">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {recommenders.map((rec, index) => (
                <tr key={rec.id} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.name || '-'}</td>
                  <td className="p-2">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.email || '-'}</td>
                  <td className="p-2">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.type || '-'}</td>
                  <td className="p-2">{rec.status}</td>
                  {!editMode && (
                    <td className="p-2 flex space-x-2">
                      {rec.status !== 'Unidentified' && (
                        <>
                          <button onClick={() => editRecommender(rec)} className="text-blue-500">Edit</button>
                          <button onClick={() => deleteRecommender(rec.id)} className="text-red-500">Delete</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!editMode && (
            <>
              <button
                onClick={() => setNewRecommender({ id: null, name: '', email: '', type: '', status: 'Identified' })}
                className="bg-secondary text-white py-1 px-3 rounded mb-4 text-sm disabled:bg-gray-300"
                disabled={recommenders.every((r) => r.status !== 'Unidentified')}
              >
                Add Reference
              </button>
              {newRecommender && (
                <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mb-6">
                  <input
                    type="text"
                    value={newRecommender.name || ''}
                    onChange={(e) => setNewRecommender({ ...newRecommender, name: e.target.value })}
                    className="p-1 border border-gray-300 rounded flex-1"
                    placeholder="Enter name"
                    required
                  />
                  <input
                    type="email"
                    value={newRecommender.email || ''}
                    onChange={(e) => setNewRecommender({ ...newRecommender, email: e.target.value })}
                    className="p-1 border border-gray-300 rounded flex-1"
                    placeholder="Enter email"
                    required
                  />
                  <select
                    value={newRecommender.type || ''}
                    onChange={(e) => setNewRecommender({ ...newRecommender, type: e.target.value })}
                    className="p-1 border border-gray-300 rounded flex-1"
                    required
                  >
                    <option value="">Select Type</option>
                    <option>Academic</option>
                    <option>Professional</option>
                  </select>
                  <select
                    value={newRecommender.status || 'Identified'}
                    onChange={(e) => setNewRecommender({ ...newRecommender, status: e.target.value })}
                    className="p-1 border border-gray-300 rounded flex-1"
                    required
                  >
                    <option value="Identified">Identified</option>
                    <option>Contacted</option>
                    <option>In Progress</option>
                    <option>Submitted</option>
                  </select>
                  <button
                    onClick={saveRecommender}
                    className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300"
                    disabled={!newRecommender.name || !newRecommender.email || !newRecommender.type || !newRecommender.status}
                  >
                    Save
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}