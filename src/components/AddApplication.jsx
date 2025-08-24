import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AddApplication({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '',
    level: 'Masters',
    program: '',
    deadlines: [],
    program_link: '',
    portal_link: '',
    status: 'Planning',
    funding_status: 'None',
  });
  const [requiresRecommenders, setRequiresRecommenders] = useState(false);
  const [numRecommenders, setNumRecommenders] = useState(0);
  const [recommenderNames, setRecommenderNames] = useState([]);
  const [requirements, setRequirements] = useState({
    'Writing Sample': { selected: false, criteria_type: '', criteria_value: '' },
    'Personal Statement': { selected: false, criteria_type: '', criteria_value: '' },
    'Statement of Purpose/Motivation Letter': { selected: false, criteria_type: '', criteria_value: '' },
    'Faculty Needed to be Contacted': { selected: false },
    'GRE': { selected: false, min_score: '' },
    'TOEFL/IELTS': { selected: false, min_score: '' },
  });

  const updateFormData = (key, value) => setFormData({ ...formData, [key]: value });

  const addDeadline = () => {
    setFormData({ ...formData, deadlines: [...formData.deadlines, { name: '', date: '' }] });
  };

  const updateDeadline = (index, field, value) => {
    const newDeadlines = [...formData.deadlines];
    newDeadlines[index][field] = value;
    setFormData({ ...formData, deadlines: newDeadlines });
  };

  const toggleRequirement = (reqName) => {
    setRequirements({
      ...requirements,
      [reqName]: {
        ...requirements[reqName],
        selected: !requirements[reqName].selected,
        // Reset fields when unchecking
        criteria_type: requirements[reqName].selected ? '' : requirements[reqName].criteria_type,
        criteria_value: requirements[reqName].selected ? '' : requirements[reqName].criteria_value,
        min_score: requirements[reqName].selected ? '' : requirements[reqName].min_score,
      },
    });
  };

  const updateRequirementField = (reqName, field, value) => {
    setRequirements({
      ...requirements,
      [reqName]: { ...requirements[reqName], [field]: value },
    });
  };

  const handleNumRecommenders = (num) => {
    setNumRecommenders(num);
    setRecommenderNames(Array(num).fill(''));
  };

  const updateRecommenderName = (index, name) => {
    const newNames = [...recommenderNames];
    newNames[index] = name;
    setRecommenderNames(newNames);
  };

  const handleSubmit = async () => {
    const appData = {
      user_id: session.user.id,
      country: formData.country,
      level: formData.level,
      program: formData.program,
      status: formData.status,
      funding_status: formData.funding_status,
      progress: 0,
      program_link: formData.program_link,
      portal_link: formData.portal_link,
    };

    const { data: app, error: appError } = await supabase
      .from('applications')
      .insert([appData])
      .select()
      .single();

    if (appError) {
      console.error(appError);
      return;
    }

    // Insert deadlines
    if (formData.deadlines.length > 0) {
      const dlInsert = formData.deadlines.map((dl) => ({ ...dl, application_id: app.id }));
      const { error: dlError } = await supabase.from('deadlines').insert(dlInsert);
      if (dlError) console.error(dlError);
    }

    // Insert requirements
    const selectedRequirements = Object.entries(requirements)
      .filter(([_, req]) => req.selected)
      .map(([name, req]) => ({
        name,
        application_id: app.id,
        is_completed: false,
        criteria_type: req.criteria_type || null,
        criteria_value: req.criteria_value ? parseInt(req.criteria_value) : null,
        min_score: req.min_score ? parseInt(req.min_score) : null,
      }));
    if (selectedRequirements.length > 0) {
      const { error: reqError } = await supabase.from('requirements').insert(selectedRequirements);
      if (reqError) console.error(reqError);
    }

    // Insert recommenders
    if (requiresRecommenders && recommenderNames.length > 0) {
      const recInsert = recommenderNames.map((name, idx) => ({
        name: name || `Recommender ${idx + 1}`,
        status: 'Identified',
        application_id: app.id,
      }));
      const { error: recError } = await supabase.from('recommenders').insert(recInsert);
      if (recError) console.error(recError);
    }

    navigate('/');
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Basic Information</h2>
            <input
              type="text"
              placeholder="Country"
              value={formData.country}
              onChange={(e) => updateFormData('country', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <select
              value={formData.level}
              onChange={(e) => updateFormData('level', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            >
              <option>Masters</option>
              <option>PhD</option>
            </select>
            <input
              type="text"
              placeholder="Program Name"
              value={formData.program}
              onChange={(e) => updateFormData('program', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Deadlines</h2>
            {formData.deadlines.map((dl, idx) => (
              <div key={idx} className="flex mb-2">
                <input
                  type="text"
                  placeholder="Name (e.g., Early Deadline)"
                  value={dl.name}
                  onChange={(e) => updateDeadline(idx, 'name', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded mr-2"
                />
                <input
                  type="date"
                  value={dl.date}
                  onChange={(e) => updateDeadline(idx, 'date', e.target.value)}
                  className="p-2 border border-gray-300 rounded"
                />
              </div>
            ))}
            <button onClick={addDeadline} className="bg-secondary text-white py-2 px-4 rounded mt-2">
              Add Deadline
            </button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Requirements</h2>
            {Object.keys(requirements).map((reqName) => (
              <div key={reqName} className="mb-4">
                <label className="block mb-2">
                  <input
                    type="checkbox"
                    checked={requirements[reqName].selected}
                    onChange={() => toggleRequirement(reqName)}
                  />{' '}
                  {reqName}
                </label>
                {requirements[reqName].selected && (
                  <>
                    {['Writing Sample', 'Personal Statement', 'Statement of Purpose/Motivation Letter'].includes(reqName) && (
                      <div className="ml-6 mb-2">
                        <select
                          value={requirements[reqName].criteria_type}
                          onChange={(e) => updateRequirementField(reqName, 'criteria_type', e.target.value)}
                          className="p-2 border border-gray-300 rounded mr-2"
                        >
                          <option value="">Select Criteria</option>
                          <option>Words</option>
                          <option>Pages</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Value (e.g., 500)"
                          value={requirements[reqName].criteria_value}
                          onChange={(e) => updateRequirementField(reqName, 'criteria_value', e.target.value)}
                          className="p-2 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                    {['GRE', 'TOEFL/IELTS'].includes(reqName) && (
                      <div className="ml-6">
                        <input
                          type="number"
                          placeholder="Minimum Score"
                          value={requirements[reqName].min_score}
                          onChange={(e) => updateRequirementField(reqName, 'min_score', e.target.value)}
                          className="p-2 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <label className="block mb-2">
              <input
                type="checkbox"
                checked={requiresRecommenders}
                onChange={() => setRequiresRecommenders(!requiresRecommenders)}
              />{' '}
              Recommenders Required
            </label>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Recommenders</h2>
            {requiresRecommenders ? (
              <>
                <input
                  type="number"
                  min="0"
                  value={numRecommenders}
                  onChange={(e) => handleNumRecommenders(parseInt(e.target.value) || 0)}
                  placeholder="Number of Recommenders"
                  className="w-full p-2 mb-4 border border-gray-300 rounded"
                />
                {recommenderNames.map((name, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Recommender ${idx + 1} Name`}
                    value={name}
                    onChange={(e) => updateRecommenderName(idx, e.target.value)}
                    className="w-full p-2 mb-2 border border-gray-300 rounded"
                  />
                ))}
              </>
            ) : (
              <p className="text-neutralDark">Recommenders not required.</p>
            )}
          </div>
        );
      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Links & Status</h2>
            <input
              type="url"
              placeholder="Program Link"
              value={formData.program_link}
              onChange={(e) => updateFormData('program_link', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <input
              type="url"
              placeholder="Portal Link"
              value={formData.portal_link}
              onChange={(e) => updateFormData('portal_link', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <select
              value={formData.status}
              onChange={(e) => updateFormData('status', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            >
              <option>Planning</option>
              <option>In Progress</option>
              <option>Submitted</option>
              <option>Abandoned</option>
              <option>Waitlisted</option>
              <option>Awarded</option>
            </select>
            <select
              value={formData.funding_status}
              onChange={(e) => updateFormData('funding_status', e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            >
              <option>None</option>
              <option>Partial</option>
              <option>Full</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className={`w-1/5 h-1 ${i + 1 <= step ? 'bg-accent' : 'bg-gray-300'}`} />
          ))}
        </div>
        <p className="text-center mt-2 text-neutralDark">Step {step}/5</p>
      </div>
      {renderStep()}
      <div className="flex justify-between mt-8">
        {step > 1 && (
          <button onClick={prevStep} className="bg-gray-300 text-neutralDark py-2 px-4 rounded">
            Back
          </button>
        )}
        {step < 5 ? (
          <button onClick={nextStep} className="bg-primary text-white py-2 px-4 rounded ml-auto">
            Next
          </button>
        ) : (
          <button onClick={handleSubmit} className="bg-accent text-white py-2 px-4 rounded ml-auto">
            Submit
          </button>
        )}
      </div>
    </div>
  );
}