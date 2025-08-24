import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

export default function AddApplication({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '',
    level: 'Masters',
    program: '',
    important_dates: [],
    program_link: '',
    portal_link: '',
    status: 'Planning',
    funding_status: 'None',
  });
  const [requiresRecommenders, setRequiresRecommenders] = useState(false);
  const [numRecommenders, setNumRecommenders] = useState(0);
  const [recommenderTypes, setRecommenderTypes] = useState('');
  const [requirements, setRequirements] = useState({
    'Writing Sample': { selected: false, criteria_type: '', criteria_value: '' },
    'Personal Statement': { selected: false, criteria_type: '', criteria_value: '' },
    'Statement of Purpose/Motivation Letter': { selected: false, criteria_type: '', criteria_value: '' },
    'Faculty Needed to be Contacted': { selected: false },
    'GRE': { selected: false, min_score: '' },
    'TOEFL/IELTS': { selected: false, min_score: '' },
  });

  // List of countries (ISO 3166-1 alpha-2)
  const countries = [
    { value: 'AF', label: 'Afghanistan' },
    { value: 'AL', label: 'Albania' },
    { value: 'DZ', label: 'Algeria' },
    { value: 'AD', label: 'Andorra' },
    { value: 'AO', label: 'Angola' },
    { value: 'AG', label: 'Antigua and Barbuda' },
    { value: 'AR', label: 'Argentina' },
    { value: 'AM', label: 'Armenia' },
    { value: 'AU', label: 'Australia' },
    { value: 'AT', label: 'Austria' },
    { value: 'AZ', label: 'Azerbaijan' },
    { value: 'BS', label: 'Bahamas' },
    { value: 'BH', label: 'Bahrain' },
    { value: 'BD', label: 'Bangladesh' },
    { value: 'BB', label: 'Barbados' },
    { value: 'BY', label: 'Belarus' },
    { value: 'BE', label: 'Belgium' },
    { value: 'BZ', label: 'Belize' },
    { value: 'BJ', label: 'Benin' },
    { value: 'BT', label: 'Bhutan' },
    { value: 'BO', label: 'Bolivia' },
    { value: 'BA', label: 'Bosnia and Herzegovina' },
    { value: 'BW', label: 'Botswana' },
    { value: 'BR', label: 'Brazil' },
    { value: 'BN', label: 'Brunei' },
    { value: 'BG', label: 'Bulgaria' },
    { value: 'BF', label: 'Burkina Faso' },
    { value: 'BI', label: 'Burundi' },
    { value: 'CV', label: 'Cabo Verde' },
    { value: 'KH', label: 'Cambodia' },
    { value: 'CM', label: 'Cameroon' },
    { value: 'CA', label: 'Canada' },
    { value: 'CF', label: 'Central African Republic' },
    { value: 'TD', label: 'Chad' },
    { value: 'CL', label: 'Chile' },
    { value: 'CN', label: 'China' },
    { value: 'CO', label: 'Colombia' },
    { value: 'KM', label: 'Comoros' },
    { value: 'CG', label: 'Congo' },
    { value: 'CR', label: 'Costa Rica' },
    { value: 'HR', label: 'Croatia' },
    { value: 'CU', label: 'Cuba' },
    { value: 'CY', label: 'Cyprus' },
    { value: 'CZ', label: 'Czech Republic' },
    { value: 'CD', label: 'DR Congo' },
    { value: 'DK', label: 'Denmark' },
    { value: 'DJ', label: 'Djibouti' },
    { value: 'DM', label: 'Dominica' },
    { value: 'DO', label: 'Dominican Republic' },
    { value: 'EC', label: 'Ecuador' },
    { value: 'EG', label: 'Egypt' },
    { value: 'SV', label: 'El Salvador' },
    { value: 'GQ', label: 'Equatorial Guinea' },
    { value: 'ER', label: 'Eritrea' },
    { value: 'EE', label: 'Estonia' },
    { value: 'SZ', label: 'Eswatini' },
    { value: 'ET', label: 'Ethiopia' },
    { value: 'FJ', label: 'Fiji' },
    { value: 'FI', label: 'Finland' },
    { value: 'FR', label: 'France' },
    { value: 'GA', label: 'Gabon' },
    { value: 'GM', label: 'Gambia' },
    { value: 'GE', label: 'Georgia' },
    { value: 'DE', label: 'Germany' },
    { value: 'GH', label: 'Ghana' },
    { value: 'GR', label: 'Greece' },
    { value: 'GD', label: 'Grenada' },
    { value: 'GT', label: 'Guatemala' },
    { value: 'GN', label: 'Guinea' },
    { value: 'GW', label: 'Guinea-Bissau' },
    { value: 'GY', label: 'Guyana' },
    { value: 'HT', label: 'Haiti' },
    { value: 'HN', label: 'Honduras' },
    { value: 'HU', label: 'Hungary' },
    { value: 'IS', label: 'Iceland' },
    { value: 'IN', label: 'India' },
    { value: 'ID', label: 'Indonesia' },
    { value: 'IR', label: 'Iran' },
    { value: 'IQ', label: 'Iraq' },
    { value: 'IE', label: 'Ireland' },
    { value: 'IL', label: 'Israel' },
    { value: 'IT', label: 'Italy' },
    { value: 'JM', label: 'Jamaica' },
    { value: 'JP', label: 'Japan' },
    { value: 'JO', label: 'Jordan' },
    { value: 'KZ', label: 'Kazakhstan' },
    { value: 'KE', label: 'Kenya' },
    { value: 'KI', label: 'Kiribati' },
    { value: 'KP', label: 'North Korea' },
    { value: 'KR', label: 'South Korea' },
    { value: 'KW', label: 'Kuwait' },
    { value: 'KG', label: 'Kyrgyzstan' },
    { value: 'LA', label: 'Laos' },
    { value: 'LV', label: 'Latvia' },
    { value: 'LB', label: 'Lebanon' },
    { value: 'LS', label: 'Lesotho' },
    { value: 'LR', label: 'Liberia' },
    { value: 'LY', label: 'Libya' },
    { value: 'LI', label: 'Liechtenstein' },
    { value: 'LT', label: 'Lithuania' },
    { value: 'LU', label: 'Luxembourg' },
    { value: 'MG', label: 'Madagascar' },
    { value: 'MW', label: 'Malawi' },
    { value: 'MY', label: 'Malaysia' },
    { value: 'MV', label: 'Maldives' },
    { value: 'ML', label: 'Mali' },
    { value: 'MT', label: 'Malta' },
    { value: 'MH', label: 'Marshall Islands' },
    { value: 'MR', label: 'Mauritania' },
    { value: 'MU', label: 'Mauritius' },
    { value: 'MX', label: 'Mexico' },
    { value: 'FM', label: 'Micronesia' },
    { value: 'MD', label: 'Moldova' },
    { value: 'MC', label: 'Monaco' },
    { value: 'MN', label: 'Mongolia' },
    { value: 'ME', label: 'Montenegro' },
    { value: 'MA', label: 'Morocco' },
    { value: 'MZ', label: 'Mozambique' },
    { value: 'MM', label: 'Myanmar' },
    { value: 'NA', label: 'Namibia' },
    { value: 'NR', label: 'Nauru' },
    { value: 'NP', label: 'Nepal' },
    { value: 'NL', label: 'Netherlands' },
    { value: 'NZ', label: 'New Zealand' },
    { value: 'NI', label: 'Nicaragua' },
    { value: 'NE', label: 'Niger' },
    { value: 'NG', label: 'Nigeria' },
    { value: 'MK', label: 'North Macedonia' },
    { value: 'NO', label: 'Norway' },
    { value: 'OM', label: 'Oman' },
    { value: 'PK', label: 'Pakistan' },
    { value: 'PW', label: 'Palau' },
    { value: 'PA', label: 'Panama' },
    { value: 'PG', label: 'Papua New Guinea' },
    { value: 'PY', label: 'Paraguay' },
    { value: 'PE', label: 'Peru' },
    { value: 'PH', label: 'Philippines' },
    { value: 'PL', label: 'Poland' },
    { value: 'PT', label: 'Portugal' },
    { value: 'QA', label: 'Qatar' },
    { value: 'RO', label: 'Romania' },
    { value: 'RU', label: 'Russia' },
    { value: 'RW', label: 'Rwanda' },
    { value: 'KN', label: 'Saint Kitts and Nevis' },
    { value: 'LC', label: 'Saint Lucia' },
    { value: 'VC', label: 'Saint Vincent and the Grenadines' },
    { value: 'WS', label: 'Samoa' },
    { value: 'SM', label: 'San Marino' },
    { value: 'ST', label: 'Sao Tome and Principe' },
    { value: 'SA', label: 'Saudi Arabia' },
    { value: 'SN', label: 'Senegal' },
    { value: 'RS', label: 'Serbia' },
    { value: 'SC', label: 'Seychelles' },
    { value: 'SL', label: 'Sierra Leone' },
    { value: 'SG', label: 'Singapore' },
    { value: 'SK', label: 'Slovakia' },
    { value: 'SI', label: 'Slovenia' },
    { value: 'SB', label: 'Solomon Islands' },
    { value: 'SO', label: 'Somalia' },
    { value: 'ZA', label: 'South Africa' },
    { value: 'SS', label: 'South Sudan' },
    { value: 'ES', label: 'Spain' },
    { value: 'LK', label: 'Sri Lanka' },
    { value: 'SD', label: 'Sudan' },
    { value: 'SR', label: 'Suriname' },
    { value: 'SE', label: 'Sweden' },
    { value: 'CH', label: 'Switzerland' },
    { value: 'SY', label: 'Syria' },
    { value: 'TJ', label: 'Tajikistan' },
    { value: 'TZ', label: 'Tanzania' },
    { value: 'TH', label: 'Thailand' },
    { value: 'TL', label: 'Timor-Leste' },
    { value: 'TG', label: 'Togo' },
    { value: 'TO', label: 'Tonga' },
    { value: 'TT', label: 'Trinidad and Tobago' },
    { value: 'TN', label: 'Tunisia' },
    { value: 'TR', label: 'Turkey' },
    { value: 'TM', label: 'Turkmenistan' },
    { value: 'TV', label: 'Tuvalu' },
    { value: 'UG', label: 'Uganda' },
    { value: 'UA', label: 'Ukraine' },
    { value: 'AE', label: 'United Arab Emirates' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
    { value: 'UY', label: 'Uruguay' },
    { value: 'UZ', label: 'Uzbekistan' },
    { value: 'VU', label: 'Vanuatu' },
    { value: 'VE', label: 'Venezuela' },
    { value: 'VN', label: 'Vietnam' },
    { value: 'YE', label: 'Yemen' },
    { value: 'ZM', label: 'Zambia' },
    { value: 'ZW', label: 'Zimbabwe' },
  ];

  const updateFormData = (key, value) => setFormData({ ...formData, [key]: value });

  const addImportantDate = () => {
    setFormData({ ...formData, important_dates: [...formData.important_dates, { name: '', date: '' }] });
  };

  const updateImportantDate = (index, field, value) => {
    const newDates = [...formData.important_dates];
    newDates[index][field] = value;
    setFormData({ ...formData, important_dates: newDates });
  };

  const toggleRequirement = (reqName) => {
    setRequirements({
      ...requirements,
      [reqName]: {
        ...requirements[reqName],
        selected: !requirements[reqName].selected,
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

  const handleSubmit = async () => {
    const appData = {
      user_id: session.user.id,
      country: formData.country ? formData.country.label : '',
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

    // Insert important dates
    if (formData.important_dates.length > 0) {
      const dateInsert = formData.important_dates.map((date) => ({ ...date, application_id: app.id }));
      const { error: dateError } = await supabase.from('important_dates').insert(dateInsert);
      if (dateError) console.error(dateError);
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
    if (requiresRecommenders && numRecommenders > 0) {
      const recInsert = Array.from({ length: numRecommenders }, (_, idx) => ({
        name: `Recommender ${idx + 1}`,
        type: recommenderTypes.split(',').length > idx ? recommenderTypes.split(',')[idx].trim() : null,
        status: 'Unidentified',
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
            <div className="mb-4">
              <label htmlFor="country" className="block text-neutralDark mb-1">Country</label>
              <Select
                id="country"
                options={countries}
                value={formData.country}
                onChange={(option) => updateFormData('country', option)}
                placeholder="Select a country"
                className="w-full"
                classNamePrefix="react-select"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="level" className="block text-neutralDark mb-1">Program Level</label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => updateFormData('level', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option>Masters</option>
                <option>PhD</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="program" className="block text-neutralDark mb-1">Program Name</label>
              <input
                id="program"
                type="text"
                placeholder="Enter program name"
                value={formData.program}
                onChange={(e) => updateFormData('program', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Important Dates</h2>
            {formData.important_dates.map((date, idx) => (
              <div key={idx} className="flex mb-2">
                <div className="flex-1 mr-2">
                  <label htmlFor={`date-name-${idx}`} className="block text-neutralDark mb-1">Date Name</label>
                  <input
                    id={`date-name-${idx}`}
                    type="text"
                    placeholder="e.g., Application Deadline"
                    value={date.name}
                    onChange={(e) => updateImportantDate(idx, 'name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label htmlFor={`date-date-${idx}`} className="block text-neutralDark mb-1">Date</label>
                  <input
                    id={`date-date-${idx}`}
                    type="date"
                    value={date.date}
                    onChange={(e) => updateImportantDate(idx, 'date', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
            ))}
            <button onClick={addImportantDate} className="bg-secondary text-white py-2 px-4 rounded mt-2">
              Add Important Date
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
                        <label htmlFor={`${reqName}-criteria`} className="block text-neutralDark mb-1">Criteria Type</label>
                        <select
                          id={`${reqName}-criteria`}
                          value={requirements[reqName].criteria_type}
                          onChange={(e) => updateRequirementField(reqName, 'criteria_type', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded mb-2"
                        >
                          <option value="">Select Criteria</option>
                          <option>Words</option>
                          <option>Pages</option>
                        </select>
                        <label htmlFor={`${reqName}-value`} className="block text-neutralDark mb-1">Criteria Value</label>
                        <input
                          id={`${reqName}-value`}
                          type="number"
                          placeholder="e.g., 500"
                          value={requirements[reqName].criteria_value}
                          onChange={(e) => updateRequirementField(reqName, 'criteria_value', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                    )}
                    {['GRE', 'TOEFL/IELTS'].includes(reqName) && (
                      <div className="ml-6">
                        <label htmlFor={`${reqName}-min-score`} className="block text-neutralDark mb-1">Minimum Score</label>
                        <input
                          id={`${reqName}-min-score`}
                          type="number"
                          placeholder="e.g., 300"
                          value={requirements[reqName].min_score}
                          onChange={(e) => updateRequirementField(reqName, 'min_score', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded"
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
                onChange={() => {
                  setRequiresRecommenders(!requiresRecommenders);
                  if (!requiresRecommenders) {
                    setNumRecommenders(0);
                    setRecommenderTypes('');
                  }
                }}
              />{' '}
              Recommenders Required
            </label>
            {requiresRecommenders && (
              <div className="ml-6">
                <div className="mb-4">
                  <label htmlFor="num-recommenders" className="block text-neutralDark mb-1">Number of Recommenders</label>
                  <input
                    id="num-recommenders"
                    type="number"
                    min="0"
                    value={numRecommenders}
                    onChange={(e) => setNumRecommenders(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 2"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label htmlFor="recommender-types" className="block text-neutralDark mb-1">Recommender Types</label>
                  <textarea
                    id="recommender-types"
                    placeholder="e.g., 1 Academic, 1 Professional"
                    value={recommenderTypes}
                    onChange={(e) => setRecommenderTypes(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-neutralDark">Links & Status</h2>
            <div className="mb-4">
              <label htmlFor="program-link" className="block text-neutralDark mb-1">Program Link</label>
              <input
                id="program-link"
                type="url"
                placeholder="e.g., https://university.edu/program"
                value={formData.program_link}
                onChange={(e) => updateFormData('program_link', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="portal-link" className="block text-neutralDark mb-1">Portal Link</label>
              <input
                id="portal-link"
                type="url"
                placeholder="e.g., https://apply.university.edu"
                value={formData.portal_link}
                onChange={(e) => updateFormData('portal_link', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="status" className="block text-neutralDark mb-1">Application Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option>Planning</option>
                <option>In Progress</option>
                <option>Submitted</option>
                <option>Abandoned</option>
                <option>Waitlisted</option>
                <option>Awarded</option>
              </select>
            </div>
            <div>
              <label htmlFor="funding-status" className="block text-neutralDark mb-1">Funding Status</label>
              <select
                id="funding-status"
                value={formData.funding_status}
                onChange={(e) => updateFormData('funding_status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option>None</option>
                <option>Partial</option>
                <option>Full</option>
              </select>
            </div>
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
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className={`w-1/4 h-1 ${i + 1 <= step ? 'bg-accent' : 'bg-gray-300'}`} />
          ))}
        </div>
        <p className="text-center mt-2 text-neutralDark">Step {step}/4</p>
      </div>
      {renderStep()}
      <div className="flex justify-between mt-8">
        {step > 1 && (
          <button onClick={prevStep} className="bg-gray-300 text-neutralDark py-2 px-4 rounded">
            Back
          </button>
        )}
        {step < 4 ? (
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