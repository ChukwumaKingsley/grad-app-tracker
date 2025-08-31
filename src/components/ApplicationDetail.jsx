// List of US states
const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];
import { useState, useEffect, useMemo, useRef } from 'react';

// Comprehensive list of all countries (copied from AddApplication)
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia',
  'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'UAE', 'UK', 'USA', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];
import { supabase } from '../supabaseClient';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SkeletonDetail } from './SkeletonLoader';
import { FaPen, FaTrash, FaEllipsisV, FaEye } from 'react-icons/fa';
import debounce from 'lodash/debounce';

export default function ApplicationDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newDateDraft, setNewDateDraft] = useState(null);
  const [password, setPassword] = useState('');
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
        case 'Awarded - Full Funding': return 'bg-purple-300 text-purple-900';
        case 'Awarded - Partial Funding': return 'bg-indigo-200 text-indigo-800';
        case 'Awarded - No Funding': return 'bg-gray-300 text-gray-900';
        case 'Rejected': return 'bg-red-300 text-red-900';
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

  // For instant status update
  const updateAppField = async (field, value) => {
    if (field === 'status') {
      setAppChanges((prev) => ({ ...prev, [field]: value }));
      setButtonLoading((prev) => ({ ...prev, status: true }));
      const { error } = await supabase.from('applications').update({ status: value }).eq('id', id);
      setButtonLoading((prev) => ({ ...prev, status: false }));
      if (!error) {
        setApp((prev) => ({ ...prev, status: value }));
        toast.success('Status updated');
        setAppChanges((prev) => {
          const { status, ...rest } = prev;
          return rest;
        });
      } else {
        toast.error('Failed to update status');
      }
    } else {
      setAppChanges((prev) => ({ ...prev, [field]: value }));
    }
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

  // Start adding a new date by showing inline inputs (no request yet)
  const toDatetimeLocal = (isoOrDate) => {
    if (!isoOrDate) return '';
    const d = new Date(isoOrDate);
    if (isNaN(d)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromDatetimeLocalToISO = (localValue) => {
    try {
      const d = new Date(localValue);
      return d.toISOString();
    } catch (e) {
      return localValue;
    }
  };

  const addImportantDate = () => {
    setNewDateDraft({ name: '', date: toDatetimeLocal(new Date()) });
  };

  // Persist the drafted date to the server
  const createImportantDate = async () => {
    if (!newDateDraft || !newDateDraft.name || !newDateDraft.date) {
      toast.error('Please provide both name and date/time');
      return;
    }
    setButtonLoading((prev) => ({ ...prev, addDate: true }));
    const newDate = { application_id: id, name: newDateDraft.name, date: fromDatetimeLocalToISO(newDateDraft.date) };
    const { data, error } = await supabase.from('important_dates').insert([newDate]).select().single();
    setButtonLoading((prev) => ({ ...prev, addDate: false }));
    if (error) {
      toast.error('Failed to add important date');
      console.error(error);
    } else {
      setImportantDates([...importantDates, data]);
      setNewDateDraft(null);
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
        const payload = { ...changes };
        if (payload.date) payload.date = fromDatetimeLocalToISO(payload.date);
        const { error } = await supabase.from('important_dates').update(payload).eq('id', dateId);
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

  const deleteApplication = async () => {
    setButtonLoading((prev) => ({ ...prev, deleteApp: true }));
    try {
      // Re-authenticate the user by signing in with provided password
      const { data: signData, error: signError } = await supabase.auth.signInWithPassword({ email: session.user.email, password });
      if (signError) {
        toast.error('Incorrect password');
        setButtonLoading((prev) => ({ ...prev, deleteApp: false }));
        return;
      }

      // Delete related records first
      await supabase.from('important_dates').delete().eq('application_id', id);
      await supabase.from('requirements').delete().eq('application_id', id);
      await supabase.from('recommenders').delete().eq('application_id', id);

      const { error } = await supabase.from('applications').delete().eq('id', id);

      if (error) {
        toast.error('Failed to delete application');
        console.error(error);
      } else {
        toast.success('Application deleted successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error('An unexpected error occurred during deletion.');
      console.error(error);
    } finally {
      setButtonLoading((prev) => ({ ...prev, deleteApp: false }));
      setShowDeleteModal(false);
      setPassword('');
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
    <>
      <div className="container mx-auto p-4 md:p-8">
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar closeOnClick />
        <nav className="text-sm text-neutralDark mb-4">
          {/* prefer a breadcrumb origin passed via navigation state (e.g. from Timelines) */}
          {location?.state?.from === '/timelines' ? (
            <>
              <Link to="/timelines" className="text-secondary hover:underline">Timelines</Link> &gt; <span className="text-neutralDark">{app.school_name || app.program}</span> <span className="text-gray-500">/ {app.program}</span>
            </>
          ) : (
            <>
              <Link to="/applications" className="text-secondary hover:underline">Dashboard</Link> &gt; <span className="text-neutralDark">{app.school_name || app.program}</span> <span className="text-gray-500">/ {app.program}</span>
            </>
          )}
        </nav>
        <div className="flex justify-between items-center mb-6">
    {editMode ? (
      <div className="flex flex-col w-full md:w-2/3">
        <label className="text-xs text-gray-400 mb-1">School</label>
        <input
          type="text"
          name="school_name"
          value={appChanges.school_name ?? app.school_name ?? ''}
          onChange={(e) => updateAppField('school_name', e.target.value)}
          className="p-2 border border-gray-300 rounded mb-2 text-2xl md:text-3xl font-bold"
          placeholder="School name"
        />
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <label className="text-xs text-gray-400">Program</label>
            <input
              type="text"
              name="program"
              value={appChanges.program ?? app.program ?? ''}
              onChange={(e) => updateAppField('program', e.target.value)}
              className="p-1 border border-gray-300 rounded text-sm text-gray-500 w-full"
              placeholder="Program / Degree"
            />
          </div>
          <div className="w-1/3">
            <label className="text-xs text-gray-400">Department</label>
            <input
              type="text"
              name="department"
              value={appChanges.department ?? app.department ?? ''}
              onChange={(e) => updateAppField('department', e.target.value)}
              className="p-1 border border-gray-300 rounded mt-0 text-sm w-full"
              placeholder="Department"
            />
          </div>
          <div className="w-1/3">
            <label className="text-xs text-gray-400">Faculty</label>
            <input
              type="text"
              name="faculty"
              value={appChanges.faculty ?? app.faculty ?? ''}
              onChange={(e) => updateAppField('faculty', e.target.value)}
              className="p-1 border border-gray-300 rounded mt-0 text-sm w-full"
              placeholder="Faculty (optional)"
            />
          </div>
        </div>

        
      </div>
    ) : (
      <>
        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#313E50' }}>{app.school_name || app.program}</h2>
        <div className="mt-2 text-sm text-gray-700 space-y-1">
          <div>
            <span className="text-xs text-gray-400 mr-2">Program</span>
            <span>{app.program || <span className="text-gray-400">(none)</span>}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 mr-2">Department</span>
            <span>{app.department || <span className="text-gray-400">(none)</span>}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 mr-2">Faculty</span>
            <span>{app.faculty || <span className="text-gray-400">(none)</span>}</span>
          </div>
          {/* action buttons removed from header - persistent footer will render at page bottom */}
        </div>
        </>
    )}
    {/* action buttons moved to footer for less visual prominence */}
        </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this application? This action cannot be undone. Please enter your account password to confirm.
                </p>
                <input
                  type="password"
                  name="confirm-delete-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-4 w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your password"
                />
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={deleteApplication}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={buttonLoading.deleteApp || !password}
                >
                  {buttonLoading.deleteApp ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Core Info */}
        <div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Country:</span>
            {editMode ? (
              <select
                name="country"
                autoComplete="off"
                value={appChanges.country || app.country}
                onChange={(e) => updateAppField('country', e.target.value)}
                className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                required
              >
                <option value="">Select a country</option>
                {countries.map((country, idx) => (
                  <option key={idx} value={country}>{country}</option>
                ))}
              </select>
            ) : (
              <span className="ml-2">{app.country}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">State:</span>
            {editMode ? (
              (appChanges.country || app.country) === 'USA' ? (
                <select
                  name="state"
                  autoComplete="address-level1"
                  value={appChanges.state || app.state || ''}
                  onChange={(e) => updateAppField('state', e.target.value)}
                  className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                  disabled={!(appChanges.country || app.country)}
                >
                  <option value="">Select a state</option>
                  {usStates.map((state, idx) => (
                    <option key={idx} value={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  autoComplete="address-level1"
                  value={appChanges.state || app.state || ''}
                  onChange={(e) => updateAppField('state', e.target.value)}
                  className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                  disabled={!(appChanges.country || app.country)}
                />
              )
            ) : (
              <span className="ml-2">{app.state || <span className="text-gray-400">(none)</span>}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">City:</span>
            {editMode ? (
              <input
                type="text"
                name="city"
                autoComplete="address-level2"
                value={appChanges.city || app.city || ''}
                onChange={(e) => updateAppField('city', e.target.value)}
                className="ml-2 p-1 border border-gray-300 rounded w-3/4"
                disabled={!(appChanges.country || app.country)}
              />
            ) : (
              <span className="ml-2">{app.city || <span className="text-gray-400">(none)</span>}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Program Level:</span>
            {editMode ? (
              <select
                name="level"
                autoComplete="off"
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
                    name="application_fee"
                    autoComplete="off"
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
                        name="fee_waiver_details"
                        autoComplete="off"
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
              name="status"
              autoComplete="off"
              value={appChanges.status || app.status}
              onChange={(e) => updateAppField('status', e.target.value)}
              className={`ml-2 p-1 border border-gray-300 rounded ${getStatusColor(appChanges.status || app.status, 'application')}`}
              disabled={buttonLoading.status}
            >
              <option value="Planning" className={getStatusColor('Planning', 'application')}>Planning</option>
              <option value="In Progress" className={getStatusColor('In Progress', 'application')}>In Progress</option>
              <option value="Submitted" className={getStatusColor('Submitted', 'application')}>Submitted</option>
              <option value="Abandoned" className={getStatusColor('Abandoned', 'application')}>Abandoned</option>
              <option value="Waitlisted" className={getStatusColor('Waitlisted', 'application')}>Waitlisted</option>
              <option value="Awarded - Full Funding" className={getStatusColor('Awarded - Full Funding', 'application')}>Awarded - Full Funding</option>
              <option value="Awarded - Partial Funding" className={getStatusColor('Awarded - Partial Funding', 'application')}>Awarded - Partial Funding</option>
              <option value="Awarded - No Funding" className={getStatusColor('Awarded - No Funding', 'application')}>Awarded - No Funding</option>
              <option value="Rejected" className={getStatusColor('Rejected', 'application')}>Rejected</option>
            </select>
          </div>
          <div className="mb-4">
            <span className="font-medium text-neutralDark">Funding:</span>
            {editMode ? (
              <select
                name="funding_status"
                autoComplete="off"
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
              className="bg-delft_blue-500 text-slate_gray-100 py-1 px-3 rounded text-sm disabled:bg-slate_gray-300 flex items-center hover:bg-paynes_gray-500 font-semibold shadow"
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
              <div className="bg-delft_blue-500 h-2.5 rounded-full" style={{ width: `${computedProgress}%` }} />
            </div>
            <p className="text-slate_gray-900">{computedProgress}% Complete</p>
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
                  name="program_link"
                  autoComplete="off"
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
                  name="portal_link"
                  autoComplete="off"
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
              <li key={date.id} className="mb-2 flex flex-col md:flex-row md:items-center md:space-x-4">
                <div className="flex-1">
                  {editMode && editingDateId === date.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        name={`date-${date.id}-name`}
                        autoComplete="off"
                        value={pendingDateChanges[date.id]?.name || date.name}
                        onChange={(e) => updateDateField(date.id, 'name', e.target.value)}
                        className="p-1 border border-gray-300 rounded flex-1"
                      />
                      <input
                        type="datetime-local"
                        name={`date-${date.id}-date`}
                        autoComplete="off"
                        value={pendingDateChanges[date.id]?.date || toDatetimeLocal(date.date)}
                        onChange={(e) => updateDateField(date.id, 'date', e.target.value)}
                        className="p-1 border border-gray-300 rounded"
                      />
                    </div>
                  ) : (
                    <span className="font-medium">{date.name}</span>
                  )}
                  <div className="text-sm text-gray-500">{new Date(date.date).toLocaleString()}</div>
                </div>
                {editMode && (
                  <div className="mt-2 md:mt-0 flex gap-2 items-center">
                    {editingDateId === date.id ? (
                      <>
                        <button onClick={() => setEditingDateId(null)} className="px-3 py-1 border rounded text-sm">Cancel</button>
                        <button onClick={saveDateChanges} className="px-3 py-1 bg-delft_blue-500 text-white rounded text-sm">Save</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingDateId(date.id)}
                          className="px-2 py-1 border rounded text-sm text-blue-600"
                          disabled={buttonLoading[`edit-date-${date.id}`]}
                        >
                          <FaPen />
                        </button>
                        <button
                          onClick={() => deleteImportantDate(date.id)}
                          className="px-2 py-1 border rounded text-sm text-red-600"
                          disabled={buttonLoading[`delete-date-${date.id}`]}
                        >
                          {buttonLoading[`delete-date-${date.id}`] ? '...' : <FaTrash />}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
            {editMode && (
              <div className="mt-2 flex flex-col md:flex-row md:items-center md:gap-3">
                {!newDateDraft ? (
                  <button
                    onClick={addImportantDate}
                    className="px-3 py-1 bg-delft_blue-500 text-white rounded text-sm"
                    disabled={buttonLoading.addDate}
                  >
                    Add Important Date
                  </button>
                ) : (
                  <div className="flex flex-col w-full">
                    <div className="flex gap-2 w-full">
                      <input
                        type="text"
                        name="new-date-name"
                        placeholder="Event name"
                        value={newDateDraft.name}
                        onChange={(e) => setNewDateDraft({ ...newDateDraft, name: e.target.value })}
                        className="p-1 border border-gray-300 rounded flex-1"
                      />
                      <input
                        type="date"
                        name="new-date-date"
                        value={newDateDraft.date}
                        onChange={(e) => setNewDateDraft({ ...newDateDraft, date: e.target.value })}
                        className="p-1 border border-gray-300 rounded w-40"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setNewDateDraft(null)} className="px-3 py-1 border rounded text-sm">Cancel</button>
                      <button onClick={createImportantDate} className="px-3 py-1 bg-delft_blue-500 text-white rounded text-sm" disabled={buttonLoading.addDate}>Save New Date</button>
                    </div>
                  </div>
                )}
                {Object.keys(pendingDateChanges).length > 0 && (
                  <button
                    onClick={saveDateChanges}
                    className="px-3 py-1 bg-delft_blue-500 text-white rounded text-sm"
                    disabled={buttonLoading.saveDates}
                  >
                    {buttonLoading.saveDates ? 'Saving...' : 'Save Date Changes'}
                  </button>
                )}
              </div>
            )}
          </ul>
        </div>
      </div>

      <h3 className={`text-xl font-bold mb-4 text-neutralDark ${getScoreColor(completedRequirements, totalRequirements)}`}>
        Requirements ({completedRequirements}/{totalRequirements})
      </h3>
      <div className="w-full overflow-x-auto mb-6">
        <table className="w-full border-collapse min-w-[600px]">
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
                  name={`req-${req.id}-is_completed`}
                  autoComplete="off"
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
                        name={`req-${req.id}-criteria_type`}
                        autoComplete="off"
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
                          name={`req-${req.id}-criteria_value`}
                          autoComplete="off"
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
                      name={`req-${req.id}-type`}
                      autoComplete="off"
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
                      name={`req-${req.id}-conversion`}
                      autoComplete="off"
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
                      name={`req-${req.id}-min_score`}
                      autoComplete="off"
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
                          name={`req-${req.id}-waived`}
                          autoComplete="off"
                          checked={pendingChanges[req.id]?.waived ?? req.waived}
                          onChange={(e) => updateRequirementField(req.id, 'waived', e.target.checked)}
                        />{' '}
                        Waived
                      </label>
                      {!(pendingChanges[req.id]?.waived ?? req.waived) && (
                        <select
                          name={`req-${req.id}-test_type`}
                          autoComplete="off"
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
                      name={`req-${req.id}-min_score_text`}
                      autoComplete="off"
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
                        name={`req-${req.id}-application_fee`}
                        autoComplete="off"
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
                          name={`app-fee-waived`}
                          autoComplete="off"
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
                          name={`req-${req.id}-fee_waiver_details`}
                          autoComplete="off"
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
                      name={`req-${req.id}-num_recommenders`}
                      autoComplete="off"
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
      </div>
      {editMode && (
        <>
          <div className="mb-6">
            <label className="block text-neutralDark mb-1">Add Requirement</label>
            <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 w-full md:w-3/4">
              <select
                name="new_requirement_name"
                autoComplete="off"
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
                  name="new_req_conversion"
                  autoComplete="off"
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
                  name="new_req_min_score"
                  autoComplete="off"
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
                  name="new_req_min_score_text"
                  autoComplete="off"
                  value={newRequirement.min_score || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, min_score: e.target.value })}
                  className="p-1 border border-gray-300 rounded flex-1"
                  placeholder="e.g., WES Evaluation"
                />
              )}
              {newRequirement.name === 'Recommenders' && (
                <input
                  type="number"
                  name="new_req_num_recommenders"
                  autoComplete="off"
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
                    name="new_req_application_fee"
                    autoComplete="off"
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
                        name="new_req_fee_waived"
                        autoComplete="off"
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
                      name="new_req_fee_waiver_details"
                      autoComplete="off"
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
                  className="bg-delft_blue-500 text-slate_gray-100 py-1 px-3 rounded text-sm disabled:bg-slate_gray-300 flex items-center hover:bg-paynes_gray-500 font-semibold shadow"
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
              className="bg-delft_blue-500 text-slate_gray-100 py-1 px-3 rounded text-sm flex items-center disabled:bg-slate_gray-300 hover:bg-paynes_gray-500 font-semibold shadow"
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
    <div className="w-full overflow-x-auto mb-6">
      <table className="w-full border-collapse min-w-[600px]">
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
                name={`rec-${rec.id}-status`}
                autoComplete="off"
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
    </div>
    {!editMode && newRecommender && (
      <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mb-6">
        <input
          type="text"
          name="new_recommender_name"
          autoComplete="name"
          value={newRecommender.name || ''}
          onChange={(e) => setNewRecommender({ ...newRecommender, name: e.target.value })}
          className="p-1 border border-gray-300 rounded flex-1"
          placeholder="Enter name"
          required
        />
        <input
          type="email"
          name="new_recommender_email"
          autoComplete="email"
          value={newRecommender.email || ''}
          onChange={(e) => setNewRecommender({ ...newRecommender, email: e.target.value })}
          className="p-1 border border-gray-300 rounded flex-1"
          placeholder="Enter email"
          required
        />
        <select
          name="new_recommender_type"
          autoComplete="off"
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
          name="new_recommender_status"
          autoComplete="off"
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
          className="bg-delft_blue-500 text-slate_gray-100 py-1 px-3 rounded text-sm flex items-center disabled:bg-slate_gray-300 hover:bg-paynes_gray-500 font-semibold shadow"
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
      {/* Footer actions: placed as the last elements of the card (non-floating) */}
      <div className="mt-6 pt-4 border-t border-neutralLight flex justify-end items-center gap-3">
        <button
          onClick={() => {
            if (editMode) {
              // discard unsaved app/requirement/date changes when cancelling edit mode
              setEditMode(false);
              setAppChanges({});
              setPendingChanges({});
              setPendingDateChanges({});
              setNewRequirement((prev) => ({ ...prev, name: '' }));
              setNewDateDraft(null);
              setNewRecommender(null);
            } else {
              setEditMode(true);
            }
          }}
          className="px-4 py-2 bg-delft_blue-500 text-white rounded hover:bg-paynes_gray-500 font-semibold flex items-center gap-2"
        >
          <FaPen /> <span>{editMode ? 'View' : 'Edit'}</span>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
        >
          <FaTrash /> <span>Delete</span>
        </button>
      </div>
    </div>
    </div>
    </>
  );
}