import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SkeletonDetail } from './SkeletonLoader';
import { FaPen, FaTrash } from 'react-icons/fa';
import debounce from 'lodash/debounce';

export default function ApplicationDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [importantDates, setImportantDates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [recommenders, setRecommenders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState({});
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
  const [newRecommender, setNewRecommender] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [appChanges, setAppChanges] = useState({});
  const [pendingDateChanges, setPendingDateChanges] = useState({});
  const [editingDateId, setEditingDateId] = useState(null);
  const inFlightWrite = useRef(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
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
    console.log('Fetched requirements:', reqData); // Debug log
    setRequirements(reqData || []);

    const { data: recData } = await supabase.from('recommenders').select('*').eq('application_id', id).order('id');
    console.log('Fetched recommenders:', recData); // Debug log
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

  const computeProgress = (requirements, recommenders, editMode) => {
  const filteredRequirements = editMode ? requirements : requirements.filter((req) => req.name !== 'Recommenders');
  const completedReqs = filteredRequirements.filter((r) => r.is_completed).length;
  const totalReqs = filteredRequirements.length;
  
  // Weighted scoring for recommenders
  const statusWeights = {
    Unidentified: 0,
    Identified: 0.25,
    Contacted: 0.5,
    'In Progress': 0.75,
    Submitted: 1,
  };
  const recommenderScore = recommenders.reduce((sum, rec) => sum + (statusWeights[rec.status] || 0), 0);
  const recommenderReq = requirements.find((req) => req.name === 'Recommenders');
  const totalRecs = recommenderReq ? parseInt(recommenderReq.num_recommenders) || 0 : 0;
  
  const total = totalReqs + totalRecs;
  console.log({ completedReqs, totalReqs, recommenderScore, totalRecs, total }); // Debug log
  if (completedReqs === 0 && recommenderScore === 0) return 0;
  return total > 0 ? Math.round((completedReqs + recommenderScore) / total * 100) : 0;
};

  const computedProgress = useMemo(() => computeProgress(requirements, recommenders, editMode), [requirements, recommenders, editMode]);

  const persistProgress = async (progress) => {
    if (inFlightWrite.current) return;
    inFlightWrite.current = true;
    try {
      const { error } = await supabase.from('applications').update({ progress }).eq('id', id);
      if (error) {
        console.error('Failed to update progress:', error);
        toast.error('Failed to update progress');
      } else {
        setApp((prev) => ({ ...prev, progress }));
      }
    } finally {
      inFlightWrite.current = false;
    }
  };

  const debouncedPersistProgress = useMemo(() => debounce(persistProgress, 250), []);

  useEffect(() => {
    if (app && computedProgress !== app.progress) {
      debouncedPersistProgress(computedProgress);
    }
    return () => debouncedPersistProgress.cancel();
  }, [computedProgress, app, debouncedPersistProgress]);

  const getStatusColor = (status, type = 'application') => {
    if (type === 'application') {
      switch (status) {
        case 'Planning': return 'bg-gray-200 text-gray-800';
        case 'In Progress': return 'bg-blue-200 text-blue-800';
        case 'Submitted': return 'bg-green-200 text-green-800';
        case 'Abandoned': return 'bg-red-200 text-red-800';
        case 'Waitlisted': return 'bg-yellow-200 text-yellow-800';
        case 'Awarded': return 'bg-purple-200 text-purple-800';
        default: return 'bg-gray-200 text-gray-800';
      }
    } else {
      switch (status) {
        case 'Unidentified': return 'bg-gray-200 text-gray-800';
        case 'Identified': return 'bg-blue-200 text-blue-800';
        case 'Contacted': return 'bg-yellow-200 text-yellow-800';
        case 'In Progress': return 'bg-orange-200 text-orange-800';
        case 'Submitted': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
      }
    }
  };

  const getScoreColor = (completed, total) => {
    if (total === 0) return 'text-gray-500';
    const ratio = completed / total;
    if (ratio === 0) return 'text-red-500';
    if (ratio === 1) return 'text-green-500';
    if (ratio <= 0.5) return 'text-yellow-500';
    return 'text-green-600';
  };

  const toggleRequirement = async (reqId, isCompleted) => {
    setButtonLoading((prev) => ({ ...prev, [`req-${reqId}`]: true }));
    const { error } = await supabase.from('requirements').update({ is_completed: isCompleted }).eq('id', reqId);
    setButtonLoading((prev) => ({ ...prev, [`req-${reqId}`]: false }));
    if (error) {
      toast.error('Failed to update requirement status');
      console.error(error);
    } else {
      setRequirements(requirements.map((r) => (r.id === reqId ? { ...r, is_completed: isCompleted } : r)));
      toast.success('Requirement status updated');
    }
  };

  const updateAppField = (field, value) => {
    setAppChanges({ ...appChanges, [field]: value });
  };

  const saveAppChanges = async () => {
    if (Object.keys(appChanges).length === 0) return;
    setButtonLoading((prev) => ({ ...prev, saveApp: true }));
    const { error } = await supabase.from('applications').update(appChanges).eq('id', id);
    setButtonLoading((prev) => ({ ...prev, saveApp: false }));
    if (error) {
      toast.error('Failed to save application changes');
      console.error(error);
      return;
    }
    setApp({ ...app, ...appChanges });
    setNewRequirement({ ...newRequirement, ...appChanges });
    setAppChanges({});
    toast.success('Application changes saved');
  };

  const addImportantDate = async () => {
    setButtonLoading((prev) => ({ ...prev, addDate: true }));
    const newDate = { application_id: id, name: 'New Date', date: new Date().toISOString().split('T')[0] };
    const { data, error } = await supabase.from('important_dates').insert([newDate]).select().single();
    setButtonLoading((prev) => ({ ...prev, addDate: false }));
    if (error) {
      toast.error('Failed to add important date');
      console.error(error);
    } else {
      setImportantDates([...importantDates, data]);
      toast.success('Important date added');
    }
  };

  const updateDateField = (dateId, field, value) => {
    setPendingDateChanges({
      ...pendingDateChanges,
      [dateId]: { ...pendingDateChanges[dateId], [field]: value },
    });
  };

  const saveDateChanges = async () => {
    setButtonLoading((prev) => ({ ...prev, saveDates: true }));
    for (const [dateId, changes] of Object.entries(pendingDateChanges)) {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from('important_dates').update(changes).eq('id', dateId);
        if (error) {
          toast.error(`Failed to update date ${dateId}`);
          console.error(error);
          continue;
        }
        setImportantDates(importantDates.map((d) => (d.id === dateId ? { ...d, ...changes } : d)));
      }
    }
    setPendingDateChanges({});
    setEditingDateId(null);
    setButtonLoading((prev) => ({ ...prev, saveDates: false }));
    toast.success('Date changes saved');
  };

  const deleteImportantDate = async (dateId) => {
    setButtonLoading((prev) => ({ ...prev, [`delete-date-${dateId}`]: true }));
    const { error } = await supabase.from('important_dates').delete().eq('id', dateId);
    setButtonLoading((prev) => ({ ...prev, [`delete-date-${dateId}`]: false }));
    if (error) {
      toast.error('Failed to delete important date');
      console.error(error);
    } else {
      setImportantDates(importantDates.filter((d) => d.id !== dateId));
      delete pendingDateChanges[dateId];
      setPendingDateChanges({ ...pendingDateChanges });
      if (editingDateId === dateId) setEditingDateId(null);
      toast.success('Important date deleted');
    }
  };

  const adjustRecommendersTable = async (newNumRecommenders, oldNumRecommenders) => {
    setButtonLoading((prev) => ({ ...prev, adjustRecommenders: true }));
    const currentRecommenders = await supabase.from('recommenders').select('*').eq('application_id', id).order('id');
    const currentCount = currentRecommenders.data?.length || 0;
    const newCount = parseInt(newNumRecommenders) || 0;

    if (newCount === 0) {
      const { error } = await supabase.from('recommenders').delete().eq('application_id', id);
      if (error) {
        toast.error('Failed to clear recommenders table');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, adjustRecommenders: false }));
        return;
      }
      setRecommenders([]);
    } else if (newCount > currentCount) {
      const additionalRecs = Array(newCount - currentCount).fill().map(() => ({
        application_id: id,
        status: 'Unidentified',
      }));
      const { error } = await supabase.from('recommenders').insert(additionalRecs);
      if (error) {
        toast.error('Failed to adjust recommenders table');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, adjustRecommenders: false }));
        return;
      }
    } else if (newCount < currentCount) {
      const toDelete = currentRecommenders.data
        .filter((r) => r.status === 'Unidentified')
        .slice(0, currentCount - newCount);
      if (toDelete.length > 0) {
        const { error } = await supabase.from('recommenders').delete().in('id', toDelete.map((r) => r.id));
        if (error) {
          toast.error('Failed to adjust recommenders table');
          console.error(error);
          setButtonLoading((prev) => ({ ...prev, adjustRecommenders: false }));
          return;
        }
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
    setButtonLoading((prev) => ({ ...prev, adjustRecommenders: false }));
  };

  const updateRecommenderStatus = async (recId, newStatus) => {
    setButtonLoading((prev) => ({ ...prev, [`rec-status-${recId}`]: true }));
    let updatedRecommender;
    if (recId.startsWith('temp-')) {
      const index = recommenders.findIndex((r) => r.id === recId);
      if (index === -1) {
        setButtonLoading((prev) => ({ ...prev, [`rec-status-${recId}`]: false }));
        return;
      }
      const { data, error } = await supabase.from('recommenders').insert([{
        application_id: id,
        name: recommenders[index].name || 'Unknown',
        email: recommenders[index].email || 'unknown@example.com',
        type: recommenders[index].type || 'Academic',
        status: newStatus,
      }]).select().single();
      if (error) {
        toast.error('Failed to update recommender status');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, [`rec-status-${recId}`]: false }));
        return;
      }
      updatedRecommender = data;
      setRecommenders(recommenders.map((r, i) => (i === index ? data : r)));
    } else {
      const { data, error } = await supabase.from('recommenders').update({ status: newStatus }).eq('id', recId).select().single();
      if (error) {
        toast.error('Failed to update recommender status');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, [`rec-status-${recId}`]: false }));
        return;
      }
      updatedRecommender = data;
      setRecommenders(recommenders.map((r) => (r.id === recId ? data : r)));
    }
    setButtonLoading((prev) => ({ ...prev, [`rec-status-${recId}`]: false }));
    toast.success('Recommender status updated');
  };

  const addRequirement = async () => {
    const { name, criteria_type, criteria_value, min_score, test_type, waived, conversion, type, num_recommenders, application_fee, fee_waived, fee_waiver_details } = newRequirement;
    if (!name) return;
    if (['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(name) && !criteria_type) return;
    if (['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(name) && criteria_type !== 'Unspecified' && !criteria_value) return;
    if (name === 'GPA/Class of Degree' && !conversion) return;
    if (name === 'Standardized Test Scores (GRE)' && !min_score) return;
    if (name === 'Application Fee' && !fee_waived && !application_fee) return;
    if (name === 'Application Fee' && fee_waived && !fee_waiver_details) return;
    if (name === 'Recommenders' && !num_recommenders) return;

    setButtonLoading((prev) => ({ ...prev, addRequirement: true }));

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
          toast.error('Failed to update recommenders requirement');
          console.error(error);
          setButtonLoading((prev) => ({ ...prev, addRequirement: false }));
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
          toast.error('Failed to add recommenders requirement');
          console.error(error);
          setButtonLoading((prev) => ({ ...prev, addRequirement: false }));
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
        toast.error('Failed to add requirement');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, addRequirement: false }));
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
    setButtonLoading((prev) => ({ ...prev, addRequirement: false }));
    toast.success('Requirement added');
  };

  const updateRequirementField = (reqId, field, value) => {
    setPendingChanges({
      ...pendingChanges,
      [reqId]: { ...pendingChanges[reqId], [field]: value },
    });
  };

  const saveRequirementChanges = async () => {
    setButtonLoading((prev) => ({ ...prev, saveRequirements: true }));
    for (const [reqId, changes] of Object.entries(pendingChanges)) {
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from('requirements').update(changes).eq('id', reqId);
        if (error) {
          toast.error(`Failed to update requirement ${reqId}`);
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
    setButtonLoading((prev) => ({ ...prev, saveRequirements: false }));
    toast.success('Requirement changes saved');
  };

  const deleteRequirement = async (reqId) => {
    setButtonLoading((prev) => ({ ...prev, [`delete-req-${reqId}`]: true }));
    const req = requirements.find((r) => r.id === reqId);
    if (req.name === 'Recommenders') {
      const { error } = await supabase.from('recommenders').delete().eq('application_id', id);
      if (error) {
        toast.error('Failed to delete recommenders');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, [`delete-req-${reqId}`]: false }));
        return;
      }
      setRecommenders([]);
    }
    const { error } = await supabase.from('requirements').delete().eq('id', reqId);
    setButtonLoading((prev) => ({ ...prev, [`delete-req-${reqId}`]: false }));
    if (error) {
      toast.error('Failed to delete requirement');
      console.error(error);
    } else {
      setRequirements(requirements.filter((r) => r.id !== reqId));
      delete pendingChanges[reqId];
      setPendingChanges({ ...pendingChanges });
      toast.success('Requirement deleted');
    }
  };

  const saveRecommender = async () => {
    if (!newRecommender?.name || !newRecommender?.email || !newRecommender?.type || !newRecommender?.status) return;

    setButtonLoading((prev) => ({ ...prev, saveRecommender: true }));
    if (newRecommender.id && !newRecommender.id.startsWith('temp-')) {
      const { error } = await supabase.from('recommenders').update({
        name: newRecommender.name,
        email: newRecommender.email,
        type: newRecommender.type,
        status: newRecommender.status,
      }).eq('id', newRecommender.id);
      if (error) {
        toast.error('Failed to update recommender');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, saveRecommender: false }));
        return;
      }
      setRecommenders(recommenders.map((r) =>
        r.id === newRecommender.id ? { ...r, ...newRecommender } : r
      ));
    } else {
      const unidentifiedIndex = recommenders.findIndex((r) => r.id === newRecommender.id);
      if (unidentifiedIndex === -1) {
        setButtonLoading((prev) => ({ ...prev, saveRecommender: false }));
        return;
      }
      const { data, error } = await supabase.from('recommenders').insert([{
        application_id: id,
        name: newRecommender.name,
        email: newRecommender.email,
        type: newRecommender.type,
        status: newRecommender.status,
      }]).select().single();
      if (error) {
        toast.error('Failed to add recommender');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, saveRecommender: false }));
        return;
      }
      setRecommenders(recommenders.map((r, index) =>
        index === unidentifiedIndex ? data : r
      ));
    }
    setNewRecommender(null);
    setButtonLoading((prev) => ({ ...prev, saveRecommender: false }));
    toast.success('Recommender saved');
  };

  const editRecommender = (recommender) => {
    setNewRecommender({
      id: recommender.id,
      name: recommender.name || '',
      email: recommender.email || '',
      type: recommender.type || '',
      status: recommender.status === 'Unidentified' ? 'Identified' : recommender.status,
    });
  };

  const deleteRecommender = async (recId) => {
    setButtonLoading((prev) => ({ ...prev, [`delete-rec-${recId}`]: true }));
    if (!recId.startsWith('temp-')) {
      const { error } = await supabase.from('recommenders').delete().eq('id', recId);
      if (error) {
        toast.error('Failed to delete recommender');
        console.error(error);
        setButtonLoading((prev) => ({ ...prev, [`delete-rec-${recId}`]: false }));
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
    setButtonLoading((prev) => ({ ...prev, [`delete-rec-${recId}`]: false }));
    toast.success('Recommender deleted');
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
    'Personal Statement',
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

  const filteredRequirements = editMode ? requirements : requirements.filter((req) => req.name !== 'Recommenders');
  const completedRequirements = filteredRequirements.filter((r) => r.is_completed).length;
  const totalRequirements = filteredRequirements.length;
  const submittedRecommenders = recommenders.filter((r) => r.status === 'Submitted').length;
  const recommenderReq = requirements.find((req) => req.name === 'Recommenders');
  const totalRecommenders = recommenderReq ? parseInt(recommenderReq.num_recommenders) || 0 : 0;

  if (loading) return <SkeletonDetail />;

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar closeOnClick />
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
              className={`ml-2 p-1 border border-gray-300 rounded ${getStatusColor(appChanges.status || app.status, 'application')}`}
            >
              <option value="Planning" className={getStatusColor('Planning', 'application')}>Planning</option>
              <option value="In Progress" className={getStatusColor('In Progress', 'application')}>In Progress</option>
              <option value="Submitted" className={getStatusColor('Submitted', 'application')}>Submitted</option>
              <option value="Abandoned" className={getStatusColor('Abandoned', 'application')}>Abandoned</option>
              <option value="Waitlisted" className={getStatusColor('Waitlisted', 'application')}>Waitlisted</option>
              <option value="Awarded" className={getStatusColor('Awarded', 'application')}>Awarded</option>
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
              className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300 flex items-center"
              disabled={Object.keys(appChanges).length === 0 || buttonLoading.saveApp}
            >
              {buttonLoading.saveApp ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Application Changes'
              )}
            </button>
          )}
          <div className="mb-6 mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div className="bg-accent h-2.5 rounded-full" style={{ width: `${computedProgress}%` }} />
            </div>
            <p className="text-neutralDark">{computedProgress}% Complete</p>
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
              <li key={date.id} className="mb-2 flex items-center space-x-2">
                {editMode && editingDateId === date.id ? (
                  <>
                    <input
                      type="text"
                      value={pendingDateChanges[date.id]?.name || date.name}
                      onChange={(e) => updateDateField(date.id, 'name', e.target.value)}
                      className="p-1 border border-gray-300 rounded flex-1"
                    />
                    <input
                      type="date"
                      value={pendingDateChanges[date.id]?.date || date.date}
                      onChange={(e) => updateDateField(date.id, 'date', e.target.value)}
                      className="p-1 border border-gray-300 rounded flex-1"
                    />
                    <button
                      onClick={() => setEditingDateId(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span>{date.name}: {date.date}</span>
                    {editMode && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingDateId(date.id)}
                          className="text-blue-500 hover:text-blue-700"
                          disabled={buttonLoading[`edit-date-${date.id}`]}
                        >
                          <FaPen />
                        </button>
                        <button
                          onClick={() => deleteImportantDate(date.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={buttonLoading[`delete-date-${date.id}`]}
                        >
                          {buttonLoading[`delete-date-${date.id}`] ? (
                            <svg className="animate-spin h-5 w-5 text-red-500" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
            {editMode && (
              <>
                <button
                  onClick={addImportantDate}
                  className="bg-secondary text-white py-1 px-3 rounded mt-2 text-sm flex items-center disabled:bg-gray-300"
                  disabled={buttonLoading.addDate}
                >
                  {buttonLoading.addDate ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add Important Date'
                  )}
                </button>
                {Object.keys(pendingDateChanges).length > 0 && (
                  <button
                    onClick={saveDateChanges}
                    className="bg-secondary text-white py-1 px-3 rounded mt-2 text-sm flex items-center disabled:bg-gray-300"
                    disabled={buttonLoading.saveDates}
                  >
                    {buttonLoading.saveDates ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Date Changes'
                    )}
                  </button>
                )}
              </>
            )}
          </ul>
        </div>
      </div>

      <h3 className={`text-xl font-bold mb-4 text-neutralDark ${getScoreColor(completedRequirements, totalRequirements)}`}>
        Requirements ({completedRequirements}/{totalRequirements})
      </h3>
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
          {filteredRequirements.map((req, index) => (
            <tr key={req.id} className="border-b">
              <td className="p-2">{index + 1}</td>
              <td className="p-2">{req.name}</td>
              <td className="p-2">{getRequirementDetails(req)}</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={req.is_completed}
                  onChange={(e) => toggleRequirement(req.id, e.target.checked)}
                  disabled={editMode || buttonLoading[`req-${req.id}`]}
                />
              </td>
              {editMode && (
                <td className="p-2">
                  {['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(req.name) && (
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
                  <button
                    onClick={() => deleteRequirement(req.id)}
                    className="text-red-500 ml-2 flex items-center"
                    disabled={buttonLoading[`delete-req-${req.id}`]}
                  >
                    {buttonLoading[`delete-req-${req.id}`] ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 text-red-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
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
              {['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && (
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
                  className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300 flex items-center"
                  disabled={
                    !newRequirement.name ||
                    (['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && !newRequirement.criteria_type) ||
                    (['Statement of Purpose', 'Personal Statement', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && newRequirement.criteria_type !== 'Unspecified' && !newRequirement.criteria_value) ||
                    (newRequirement.name === 'GPA/Class of Degree' && !newRequirement.conversion) ||
                    (newRequirement.name === 'Standardized Test Scores (GRE)' && !newRequirement.min_score) ||
                    (newRequirement.name === 'Application Fee' && !newRequirement.fee_waived && !newRequirement.application_fee) ||
                    (newRequirement.name === 'Application Fee' && newRequirement.fee_waived && !newRequirement.fee_waiver_details) ||
                    (newRequirement.name === 'Recommenders' && !newRequirement.num_recommenders) ||
                    buttonLoading.addRequirement
                  }
                >
                  {buttonLoading.addRequirement ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </button>
              )}
            </div>
          </div>
          {Object.keys(pendingChanges).length > 0 && (
            <button
              onClick={saveRequirementChanges}
              className="bg-secondary text-white py-1 px-3 rounded text-sm flex items-center disabled:bg-gray-300"
              disabled={buttonLoading.saveRequirements}
            >
              {buttonLoading.saveRequirements ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Requirement Changes'
              )}
            </button>
          )}
        </>
      )}
      {recommenders.length > 0 && (
  <>
    {(() => {
      const recommenderScore = recommenders.reduce((sum, rec) => sum + ({ Unidentified: 0, Identified: 0.25, Contacted: 0.5, 'In Progress': 0.75, Submitted: 1 }[rec.status] || 0), 0);
      return (
        <h3 className={`text-xl font-bold mb-4 text-neutralDark ${getScoreColor(recommenderScore, totalRecommenders)}`}>
          References ({Math.floor(recommenderScore) === recommenderScore ? Math.floor(recommenderScore) : recommenderScore.toFixed(2)}/{totalRecommenders})
        </h3>
      );
    })()}
    <table className="w-full mb-6 border-collapse">
      <thead>
        <tr className="bg-neutralLight">
          <th className="p-2 text-left text-neutralDark">S/N</th>
          <th className="p-2 text-left text-neutralDark">Name</th>
          <th className="p-2 text-left text-neutralDark">Email</th>
          <th className="p-2 text-left text-neutralDark">Type</th>
          <th className="p-2 text-left text-neutralDark">Status</th>
          {!editMode && <th className="p-2 text-left text-neutralDark">Action</th>}
        </tr>
      </thead>
      <tbody>
        {recommenders.map((rec, index) => (
          <tr key={rec.id} className="border-b">
            <td className="p-2">{index + 1}</td>
            <td className="p-2 overflow-x-auto whitespace-nowrap max-w-[150px]">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.name || '-'}</td>
            <td className="p-2">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.email || '-'}</td>
            <td className="p-2">{rec.status === 'Unidentified' ? <span className="text-gray-400">Unidentified</span> : rec.type || '-'}</td>
            <td className="p-2">
              <select
                value={rec.status}
                onChange={(e) => updateRecommenderStatus(rec.id, e.target.value)}
                className={`p-1 border border-gray-300 rounded ${getStatusColor(rec.status, 'recommender')} ${editMode ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={editMode || buttonLoading[`rec-status-${rec.id}`]}
              >
                <option value="Unidentified" className={getStatusColor('Unidentified', 'recommender')}>Unidentified</option>
                <option value="Identified" className={getStatusColor('Identified', 'recommender')}>Identified</option>
                <option value="Contacted" className={getStatusColor('Contacted', 'recommender')}>Contacted</option>
                <option value="In Progress" className={getStatusColor('In Progress', 'recommender')}>In Progress</option>
                <option value="Submitted" className={getStatusColor('Submitted', 'recommender')}>Submitted</option>
              </select>
            </td>
            {!editMode && (
              <td className="p-2 flex space-x-2">
                {rec.status !== 'Unidentified' && (
                  <>
                    <button
                      onClick={() => editRecommender(rec)}
                      className="text-blue-500 hover:text-blue-700"
                      disabled={buttonLoading[`edit-rec-${rec.id}`]}
                    >
                      <FaPen />
                    </button>
                    <button
                      onClick={() => deleteRecommender(rec.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={buttonLoading[`delete-rec-${rec.id}`]}
                    >
                      {buttonLoading[`delete-rec-${rec.id}`] ? (
                        <svg className="animate-spin h-5 w-5 text-red-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
    {!editMode && newRecommender && (
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
          className={`p-1 border border-gray-300 rounded flex-1 ${getStatusColor(newRecommender.status || 'Identified', 'recommender')}`}
          required
        >
          <option value="Identified" className={getScoreColor('Identified', 'recommender')}>Identified</option>
          <option value="Contacted" className={getScoreColor('Contacted', 'recommender')}>Contacted</option>
          <option value="In Progress" className={getScoreColor('In Progress', 'recommender')}>In Progress</option>
          <option value="Submitted" className={getScoreColor('Submitted', 'recommender')}>Submitted</option>
        </select>
        <button
          onClick={saveRecommender}
          className="bg-secondary text-white py-1 px-3 rounded text-sm flex items-center disabled:bg-gray-300"
          disabled={!newRecommender.name || !newRecommender.email || !newRecommender.type || !newRecommender.status || buttonLoading.saveRecommender}
        >
          {buttonLoading.saveRecommender ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    )}
  </>
)}
    </div>
  );
}