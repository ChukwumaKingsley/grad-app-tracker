import { useState } from 'react';
// List of US states
const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AddApplication({ session }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    program: '',
    school_name: '',
    faculty: '',
    department: '',
    application_email: '',
    country: '',
    level: 'Masters',
    application_fee: '',
    fee_waived: false,
    fee_waiver_details: '',
    funding_status: 'None',
    program_link: '',
    portal_link: '',
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

  // Comprehensive list of all countries
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRequirementChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewRequirement((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddRequirement = () => {
    if (newRequirement.name &&
      ((newRequirement.name === 'GPA/Class of Degree' && (newRequirement.criteria_type && newRequirement.criteria_value)) ||
      ((newRequirement.name === 'Standardized Test Scores (GRE)' || newRequirement.name === 'English Proficiency Test Scores') && (newRequirement.test_type && newRequirement.min_score)) ||
      (newRequirement.name === 'Application Fee' && (formData.application_fee || formData.fee_waived)) ||
      (newRequirement.name === 'Recommenders' && newRequirement.num_recommenders) ||
      (newRequirement.name !== 'GPA/Class of Degree' && newRequirement.name !== 'Standardized Test Scores (GRE)' && newRequirement.name !== 'English Proficiency Test Scores' && newRequirement.name !== 'Application Fee' && newRequirement.name !== 'Recommenders'))
    ) {
      setFormData((prevData) => ({
        ...prevData,
        requirements: [...prevData.requirements, newRequirement],
      }));
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Create a new object with only the data for the 'applications' table
      const applicationData = {
        user_id: session.user.id,
        program: formData.program,
        school_name: formData.school_name,
        faculty: formData.faculty,
        department: formData.department,
        application_email: formData.application_email,
        country: formData.country,
        level: formData.level,
        application_fee: formData.application_fee,
        fee_waived: formData.fee_waived,
        fee_waiver_details: formData.fee_waiver_details,
        funding_status: formData.funding_status,
        program_link: formData.program_link,
        portal_link: formData.portal_link,
      };

      // Step 1: Insert the application into the applications table
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .insert([applicationData])
        .select();

      if (appError) {
        throw appError;
      }

      const applicationId = appData[0].id;

      // Step 2: Insert each requirement into the requirements table
      if (formData.requirements.length > 0) {
        const requirementsToInsert = formData.requirements.map(req => ({
          ...req,
          application_id: applicationId,
          num_recommenders: req.num_recommenders ? parseInt(req.num_recommenders, 10) : null,
          min_score: req.min_score ? parseInt(req.min_score, 10) : null,
          criteria_value: req.criteria_value ? parseInt(req.criteria_value, 10) : null,
        }));

        const { error: requirementsError } = await supabase
          .from('requirements')
          .insert(requirementsToInsert);

        if (requirementsError) {
          throw requirementsError;
        }
      }

      toast.success('Application and requirements saved successfully!');
      navigate(`/application/${applicationId}`);

    } catch (error) {
      console.error('Error saving application:', error.message);
      toast.error('Error saving application. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neutralBg p-8">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-primary mb-6">Add New Application</h1>
        <form onSubmit={handleSubmit}>
          {/* Reordered fields */}
          <div className="mb-4">
            <label htmlFor="country" className="block text-neutralDark font-bold mb-2">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="">Select a country</option>
              {countries.map((country, index) => (
                <option key={index} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="state" className="block text-neutralDark font-bold mb-2">State</label>
            {formData.country === 'USA' ? (
              <select
                id="state"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                disabled={!formData.country}
              >
                <option value="">Select a state</option>
                {usStates.map((state, idx) => (
                  <option key={idx} value={state}>{state}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                disabled={!formData.country}
              />
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="city" className="block text-neutralDark font-bold mb-2">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={!formData.country}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="school_name" className="block text-neutralDark font-bold mb-2">
              School Name
            </label>
            <input
              type="text"
              id="school_name"
              name="school_name"
              value={formData.school_name}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="program" className="block text-neutralDark font-bold mb-2">
              Program Name
            </label>
            <input
              type="text"
              id="program"
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="level" className="block text-neutralDark font-bold mb-2">
              Level
            </label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="Masters">Masters</option>
              <option value="PhD">PhD</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="faculty" className="block text-neutralDark font-bold mb-2">
              Faculty
            </label>
            <input
              type="text"
              id="faculty"
              name="faculty"
              value={formData.faculty}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          {/* Remaining fields */}
          <div className="mb-4">
            <label htmlFor="department" className="block text-neutralDark font-bold mb-2">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="application_email" className="block text-neutralDark font-bold mb-2">
              Application Email
            </label>
            <input
              type="email"
              id="application_email"
              name="application_email"
              value={formData.application_email}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="application_fee" className="block text-neutralDark font-bold mb-2">
              Application Fee
            </label>
            <input
              type="number"
              id="application_fee"
              name="application_fee"
              value={formData.application_fee}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="fee_waived" className="inline-flex items-center">
              <input
                type="checkbox"
                id="fee_waived"
                name="fee_waived"
                checked={formData.fee_waived}
                onChange={handleInputChange}
                className="form-checkbox text-primary"
              />
              <span className="ml-2 text-neutralDark">Fee Waived</span>
            </label>
          </div>
          {formData.fee_waived && (
            <div className="mb-4">
              <label htmlFor="fee_waiver_details" className="block text-neutralDark font-bold mb-2">
                Fee Waiver Details
              </label>
              <input
                type="text"
                id="fee_waiver_details"
                name="fee_waiver_details"
                value={formData.fee_waiver_details}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="funding_status" className="block text-neutralDark font-bold mb-2">
              Funding Status
            </label>
            <select
              id="funding_status"
              name="funding_status"
              value={formData.funding_status}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="None">None</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="Under Consideration">Under Consideration</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="program_link" className="block text-neutralDark font-bold mb-2">
              Program Link
            </label>
            <input
              type="url"
              id="program_link"
              name="program_link"
              value={formData.program_link}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="portal_link" className="block text-neutralDark font-bold mb-2">
              Portal Link
            </label>
            <input
              type="url"
              id="portal_link"
              name="portal_link"
              value={formData.portal_link}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-primary mb-2">Requirements</h2>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label htmlFor="newRequirementName" className="block text-neutralDark font-bold mb-2">
                  Add New Requirement
                </label>
                <select
                  id="newRequirementName"
                  name="name"
                  value={newRequirement.name}
                  onChange={handleRequirementChange}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Select a requirement</option>
                  {requirementOptions.map((req) => (
                    <option key={req} value={req}>
                      {req}
                    </option>
                  ))}
                </select>
              </div>

              {newRequirement.name === 'GPA/Class of Degree' && (
                <div className="flex-1 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-end">
                  <div className="flex-1">
                    <label htmlFor="criteria_type" className="block text-neutralDark font-bold mb-2">
                      Criteria Type
                    </label>
                    <select
                      id="criteria_type"
                      name="criteria_type"
                      value={newRequirement.criteria_type}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select type</option>
                      <option value="Out of 4.0 Scale">Out of 4.0 Scale</option>
                      <option value="Out of 5.0 Scale">Out of 5.0 Scale</option>
                      <option value="First Class">First Class</option>
                      <option value="Second Class Upper">Second Class Upper</option>
                      <option value="Second Class Lower">Second Class Lower</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>
                  {newRequirement.criteria_type !== 'Unspecified' && (
                    <div className="flex-1">
                      <label htmlFor="criteria_value" className="block text-neutralDark font-bold mb-2">
                        Criteria Value
                      </label>
                      <input
                        type="number"
                        id="criteria_value"
                        name="criteria_value"
                        value={newRequirement.criteria_value}
                        onChange={handleRequirementChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  )}
                </div>
              )}
              {newRequirement.name === 'Standardized Test Scores (GRE)' && (
                <div className="flex-1 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-end">
                  <div className="flex-1">
                    <label htmlFor="test_type" className="block text-neutralDark font-bold mb-2">
                      Test Type
                    </label>
                    <select
                      id="test_type"
                      name="test_type"
                      value={newRequirement.test_type}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select test</option>
                      <option value="GRE General">GRE General</option>
                      <option value="GRE Subject">GRE Subject</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="min_score" className="block text-neutralDark font-bold mb-2">
                      Minimum Score
                    </label>
                    <input
                      type="number"
                      id="min_score"
                      name="min_score"
                      value={newRequirement.min_score}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="waived" className="inline-flex items-center">
                      <input
                        type="checkbox"
                        id="waived"
                        name="waived"
                        checked={newRequirement.waived}
                        onChange={handleRequirementChange}
                        className="form-checkbox text-primary"
                      />
                      <span className="ml-2 text-neutralDark">Waived</span>
                    </label>
                  </div>
                </div>
              )}
              {newRequirement.name === 'English Proficiency Test Scores' && (
                <div className="flex-1 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-end">
                  <div className="flex-1">
                    <label htmlFor="test_type" className="block text-neutralDark font-bold mb-2">
                      Test Type
                    </label>
                    <select
                      id="test_type"
                      name="test_type"
                      value={newRequirement.test_type}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select test</option>
                      <option value="TOEFL">TOEFL</option>
                      <option value="IELTS">IELTS</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="min_score" className="block text-neutralDark font-bold mb-2">
                      Minimum Score
                    </label>
                    <input
                      type="number"
                      id="min_score"
                      name="min_score"
                      value={newRequirement.min_score}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="waived" className="inline-flex items-center">
                      <input
                        type="checkbox"
                        id="waived"
                        name="waived"
                        checked={newRequirement.waived}
                        onChange={handleRequirementChange}
                        className="form-checkbox text-primary"
                      />
                      <span className="ml-2 text-neutralDark">Waived</span>
                    </label>
                  </div>
                </div>
              )}
              {newRequirement.name === 'Recommenders' && (
                <div className="flex-1 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-end">
                  <div className="flex-1">
                    <label htmlFor="num_recommenders" className="block text-neutralDark font-bold mb-2">
                      Number of Recommenders
                    </label>
                    <input
                      type="number"
                      id="num_recommenders"
                      name="num_recommenders"
                      value={newRequirement.num_recommenders}
                      onChange={handleRequirementChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
              {newRequirement.name === 'Application Fee' && (
                <div className="flex-1 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-end">
                  <div className="flex-1">
                    <label htmlFor="fee_waived" className="inline-flex items-center">
                      <input
                        type="checkbox"
                        id="fee_waived"
                        name="fee_waived"
                        checked={formData.fee_waived}
                        onChange={handleInputChange}
                        className="form-checkbox text-primary"
                      />
                      <span className="ml-2 text-neutralDark">Fee Waived</span>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="application_fee" className="block text-neutralDark font-bold mb-2">
                      Application Fee
                    </label>
                    <input
                      type="number"
                      id="application_fee"
                      name="application_fee"
                      value={formData.application_fee}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
              {(newRequirement.name) && (
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  className="bg-primary text-white py-2 px-4 rounded text-sm self-end disabled:bg-gray-300"
                  disabled={
                    (newRequirement.name === 'GPA/Class of Degree' && (!newRequirement.criteria_type || (newRequirement.criteria_type !== 'Unspecified' && !newRequirement.criteria_value))) ||
                    ((newRequirement.name === 'Standardized Test Scores (GRE)' || newRequirement.name === 'English Proficiency Test Scores') && (!newRequirement.test_type || !newRequirement.min_score)) ||
                    (newRequirement.name === 'Application Fee' && (!formData.application_fee && !formData.fee_waived)) ||
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
                      {req.min_score ? `, Min Score: ${req.min_score}` : ''}
                      {req.num_recommenders ? `, Number of Recommenders: ${req.num_recommenders}` : ''}
                      {req.test_type ? `, ${req.waived ? `${req.test_type}, Waived` : req.test_type}` : req.waived ? ', Waived' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button type="submit" className="bg-primary text-white py-2 px-4 rounded text-center w-full md:w-auto hover:bg-primary-dark transition-colors">
            Save Application
          </button>
        </form>
      </div>
    </div>
  );
}
