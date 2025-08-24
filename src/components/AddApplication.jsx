import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function AddApplication({ session }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    country: '',
    level: 'Masters',
    program: '',
    deadlines: [], // [{name, date}]
    requirements: [], // [name]
    recommenders: [], // [{name, status: 'Identified'}]
    program_link: '',
    portal_link: '',
    status: 'Planning',
    funding_status: 'None',
  })

  const predefinedRequirements = ['SOP', 'Transcripts', 'GRE', 'TOEFL/IELTS', 'CV']

  const [selectedPredefined, setSelectedPredefined] = useState([])
  const [customRequirements, setCustomRequirements] = useState([])
  const [numRecommenders, setNumRecommenders] = useState(0)
  const [recommenderNames, setRecommenderNames] = useState([])

  const updateFormData = (key, value) => {
    setFormData({ ...formData, [key]: value })
  }

  const addDeadline = () => {
    setFormData({ ...formData, deadlines: [...formData.deadlines, { name: '', date: '' }] })
  }

  const updateDeadline = (index, field, value) => {
    const newDeadlines = [...formData.deadlines]
    newDeadlines[index][field] = value
    setFormData({ ...formData, deadlines: newDeadlines })
  }

  const addCustomRequirement = (name) => {
    if (name) {
      setCustomRequirements([...customRequirements, name])
    }
  }

  const handleNumRecommenders = (num) => {
    setNumRecommenders(num)
    setRecommenderNames(Array(num).fill(''))
  }

  const updateRecommenderName = (index, name) => {
    const newNames = [...recommenderNames]
    newNames[index] = name
    setRecommenderNames(newNames)
  }

  const handleSubmit = async () => {
    const requirements = [...selectedPredefined, ...customRequirements]
    const recommenders = recommenderNames.map(name => ({ name: name || `Recommender ${recommenders.length + 1}`, status: 'Identified' }))

    const appData = {
      user_id: session.user.id,
      country: formData.country,
      level: formData.level,
      program: formData.program,
      status: formData.status,
      funding_status: formData.funding_status,
      progress: 0, // initial
      program_link: formData.program_link,
      portal_link: formData.portal_link,
    }

    const { data: app, error: appError } = await supabase.from('applications').insert(appData).select().single()

    if (appError) {
      console.error(appError)
      return
    }

    // Insert deadlines
    if (formData.deadlines.length) {
      const dlInsert = formData.deadlines.map(dl => ({ ...dl, application_id: app.id }))
      await supabase.from('deadlines').insert(dlInsert)
    }

    // Insert requirements
    if (requirements.length) {
      const reqInsert = requirements.map(name => ({ name, application_id: app.id, is_completed: false }))
      await supabase.from('requirements').insert(reqInsert)
    }

    // Insert recommenders
    if (recommenders.length) {
      const recInsert = recommenders.map(rec => ({ ...rec, application_id: app.id }))
      await supabase.from('recommenders').insert(recInsert)
    }

    navigate('/')
  }

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Basic Information</h2>
            <input 
              type="text" 
              placeholder="Country" 
              value={formData.country} 
              onChange={e => updateFormData('country', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            />
            <select 
              value={formData.level} 
              onChange={e => updateFormData('level', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            >
              <option>Masters</option>
              <option>PhD</option>
            </select>
            <input 
              type="text" 
              placeholder="Program Name" 
              value={formData.program} 
              onChange={e => updateFormData('program', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            />
          </div>
        )
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Deadlines</h2>
            {formData.deadlines.map((dl, idx) => (
              <div key={idx} className="flex mb-2">
                <input 
                  type="text" 
                  placeholder="Name (e.g., Early Deadline)" 
                  value={dl.name} 
                  onChange={e => updateDeadline(idx, 'name', e.target.value)} 
                  className="flex-1 p-2 border rounded mr-2"
                />
                <input 
                  type="date" 
                  value={dl.date} 
                  onChange={e => updateDeadline(idx, 'date', e.target.value)} 
                  className="p-2 border rounded"
                />
              </div>
            ))}
            <button onClick={addDeadline} className="bg-secondary text-white py-2 px-4 rounded mt-2">Add Deadline</button>
          </div>
        )
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Requirements</h2>
            {predefinedRequirements.map(req => (
              <label key={req} className="block">
                <input 
                  type="checkbox" 
                  checked={selectedPredefined.includes(req)} 
                  onChange={e => {
                    if (e.target.checked) setSelectedPredefined([...selectedPredefined, req])
                    else setSelectedPredefined(selectedPredefined.filter(r => r !== req))
                  }}
                /> {req}
              </label>
            ))}
            <div className="mt-4">
              <input 
                type="text" 
                placeholder="Custom Requirement" 
                id="customReq"
                className="p-2 border rounded mr-2"
              />
              <button onClick={() => addCustomRequirement(document.getElementById('customReq').value)} className="bg-secondary text-white py-2 px-4 rounded">Add</button>
            </div>
            <ul className="mt-2">
              {customRequirements.map((req, idx) => <li key={idx}>{req}</li>)}
            </ul>
          </div>
        )
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Recommenders</h2>
            <input 
              type="number" 
              min="0" 
              value={numRecommenders} 
              onChange={e => handleNumRecommenders(parseInt(e.target.value) || 0)} 
              className="w-full p-2 mb-4 border rounded"
              placeholder="Number of Recommenders Required"
            />
            {recommenderNames.map((name, idx) => (
              <input 
                key={idx} 
                type="text" 
                placeholder={`Recommender ${idx + 1} Name`} 
                value={name} 
                onChange={e => updateRecommenderName(idx, e.target.value)} 
                className="w-full p-2 mb-2 border rounded"
              />
            ))}
          </div>
        )
      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Links & Status</h2>
            <input 
              type="url" 
              placeholder="Program Link" 
              value={formData.program_link} 
              onChange={e => updateFormData('program_link', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            />
            <input 
              type="url" 
              placeholder="Portal Link" 
              value={formData.portal_link} 
              onChange={e => updateFormData('portal_link', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            />
            <select 
              value={formData.status} 
              onChange={e => updateFormData('status', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
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
              onChange={e => updateFormData('funding_status', e.target.value)} 
              className="w-full p-2 mb-4 border rounded"
            >
              <option>None</option>
              <option>Partial</option>
              <option>Full</option>
            </select>
          </div>
        )
    }
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className={`w-1/5 h-1 ${i + 1 <= step ? 'bg-accent' : 'bg-gray-300'}`}></div>
          ))}
        </div>
        <p className="text-center mt-2">Step {step}/5</p>
      </div>
      {renderStep()}
      <div className="flex justify-between mt-8">
        {step > 1 && <button onClick={prevStep} className="bg-gray-300 text-neutralDark py-2 px-4 rounded">Back</button>}
        {step < 5 ? (
          <button onClick={nextStep} className="bg-primary text-white py-2 px-4 rounded ml-auto">Next</button>
        ) : (
          <button onClick={handleSubmit} className="bg-accent text-white py-2 px-4 rounded ml-auto">Submit</button>
        )}
      </div>
    </div>
  )
}