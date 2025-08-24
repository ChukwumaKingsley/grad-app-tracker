import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AddApplication({ session }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    program: '',
    country: '',
    level: 'Masters',
    application_fee: '',
    fee_waived: false,
    fee_waiver_details: '',
    funding_status: 'None',
    program_link: '',
    portal_link: '',
    num_recommenders: '',
    requirements: [],
  });

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
  ];

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

  const handleAddRequirement = () => {
    if (!newRequirement.name) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && !newRequirement.criteria_type) return;
    if (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && newRequirement.criteria_type !== 'Unspecified' && !newRequirement.criteria_value) return;
    if (newRequirement.name === 'GPA/Class of Degree' && !newRequirement.conversion) return;
    if (newRequirement.name === 'Standardized Test Scores (GRE)' && !newRequirement.min_score) return;
    if (newRequirement.name === 'Application Fee' && !formData.application_fee && !formData.fee_waived) return;
    if (newRequirement.name === 'Recommenders' && !newRequirement.num_recommenders) return;

    setFormData({
      ...formData,
      requirements: [
        ...formData.requirements,
        {
          name: newRequirement.name,
          criteria_type: newRequirement.criteria_type || null,
          criteria_value: newRequirement.criteria_value ? parseInt(newRequirement.criteria_value) : null,
          min_score: newRequirement.min_score || null,
          test_type: newRequirement.test_type || null,
          waived: newRequirement.waived || false,
          conversion: newRequirement.conversion || null,
          type: newRequirement.type || null,
        },
      ],
      num_recommenders: newRequirement.name === 'Recommenders' ? newRequirement.num_recommenders : formData.num_recommenders,
    });
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { program, country, level, application_fee, fee_waived, fee_waiver_details, funding_status, program_link, portal_link, num_recommenders, requirements } = formData;
    if (!program || !country || !level || (!application_fee && !fee_waived)) return;

    const { data: appData, error: appError } = await supabase.from('applications').insert([
      {
        user_id: session.user.id,
        program,
        country,
        level,
        application_fee: fee_waived ? '0' : application_fee,
        fee_waived,
        fee_waiver_details: fee_waived ? fee_waiver_details : null,
        funding_status,
        program_link: program_link || null,
        portal_link: portal_link || null,
        progress: 0,
        status: 'Planning',
      },
    ]).select().single();

    if (appError) {
      console.error(appError);
      return;
    }

    if (requirements.length > 0) {
      const reqs = requirements.map((req) => ({
        application_id: appData.id,
        name: req.name,
        is_completed: false,
        criteria_type: req.criteria_type,
        criteria_value: req.criteria_value,
        min_score: req.min_score,
        test_type: req.test_type,
        waived: req.waived,
        conversion: req.conversion,
        type: req.type,
      }));
      const { error: reqError } = await supabase.from('requirements').insert(reqs);
      if (reqError) console.error(reqError);
    }

    if (num_recommenders && requirements.some((req) => req.name === 'Recommenders')) {
      const recs = Array(parseInt(num_recommenders)).fill().map(() => ({
        application_id: appData.id,
        status: 'Unidentified',
      }));
      const { error: recError } = await supabase.from('recommenders').insert(recs);
      if (recError) console.error(recError);
    }

    navigate('/');
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary">Add New Application</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Program</label>
          <input
            type="text"
            value={formData.program}
            onChange={(e) => setFormData({ ...formData, program: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            placeholder="e.g., Computer Science"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            placeholder="e.g., USA"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Program Level</label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            required
          >
            <option value="Masters">Masters</option>
            <option value="PhD">PhD</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Application Fee</label>
          <input
            type="text"
            value={formData.application_fee}
            onChange={(e) => setFormData({ ...formData, application_fee: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            placeholder="e.g., $100 or 0"
            disabled={formData.fee_waived}
            required={!formData.fee_waived}
          />
          <label className="block mt-2">
            <input
              type="checkbox"
              checked={formData.fee_waived}
              onChange={() => setFormData({ ...formData, fee_waived: !formData.fee_waived })}
            />{' '}
            Fee Waived
          </label>
          {formData.fee_waived && (
            <div className="mt-2">
              <label className="block text-neutralDark mb-1">Waiver Details</label>
              <input
                type="text"
                value={formData.fee_waiver_details}
                onChange={(e) => setFormData({ ...formData, fee_waiver_details: e.target.value })}
                className="p-1 border border-gray-300 rounded w-full"
                placeholder="e.g., Financial hardship waiver"
              />
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Funding</label>
          <select
            value={formData.funding_status}
            onChange={(e) => setFormData({ ...formData, funding_status: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
          >
            <option>None</option>
            <option>Partial</option>
            <option>Full</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Program URL</label>
          <input
            type="url"
            value={formData.program_link}
            onChange={(e) => setFormData({ ...formData, program_link: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            placeholder="e.g., https://university.edu/program"
          />
        </div>
        <div className="mb-4">
          <label className="block text-neutralDark mb-1">Application URL</label>
          <input
            type="url"
            value={formData.portal_link}
            onChange={(e) => setFormData({ ...formData, portal_link: e.target.value })}
            className="p-1 border border-gray-300 rounded w-full"
            placeholder="e.g., https://apply.university.edu"
          />
        </div>
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
              {requirementOptions
                .filter((option) => !formData.requirements.some((req) => req.name === option))
                .map((option) => (
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
                type="button"
                onClick={handleAddRequirement}
                className="bg-secondary text-white py-1 px-3 rounded text-sm disabled:bg-gray-300"
                disabled={
                  !newRequirement.name ||
                  (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && !newRequirement.criteria_type) ||
                  (['Statement of Purpose', 'Writing Samples', 'Research Proposal'].includes(newRequirement.name) && newRequirement.criteria_type !== 'Unspecified' && !newRequirement.criteria_value) ||
                  (newRequirement.name === 'GPA/Class of Degree' && !newRequirement.conversion) ||
                  (newRequirement.name === 'Standardized Test Scores (GRE)' && !newRequirement.min_score) ||
                  (newRequirement.name === 'Application Fee' && !formData.application_fee && !formData.fee_waived) ||
                  (newRequirement.name === 'Recommenders' && !newRequirement.num_recommenders)
                }
              >
                Add Requirement
              </button>
            )}
          </div>
          {formData.requirements.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-bold text-neutralDark">Added Requirements</h3>
              <ul className="list-disc pl-5">
                {formData.requirements.map((req, index) => (
                  <li key={index}>
                    {req.name}
                    {req.criteria_type && req.criteria_value ? `: ${req.criteria_value} ${req.criteria_type}` : req.criteria_type === 'Unspecified' ? ': Unspecified' : ''}
                    {req.type ? `, ${req.type}` : ''}
                    {req.conversion ? `, Conversion: ${req.conversion}` : ''}
                    {req.min_score ? `, ${req.min_score}` : ''}
                    {req.test_type ? `, ${req.waived ? `${req.test_type}, Waived` : req.test_type}` : req.waived ? ', Waived' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button type="submit" className="bg-primary text-white py-2 px-4 rounded">
          Submit Application
        </button>
      </form>
    </div>
  );
}