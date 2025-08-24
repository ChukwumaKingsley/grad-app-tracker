import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useParams, useNavigate } from 'react-router-dom'

export default function ApplicationDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [deadlines, setDeadlines] = useState([])
  const [requirements, setRequirements] = useState([])
  const [recommenders, setRecommenders] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const { data: appData } = await supabase.from('applications').select('*').eq('id', id).single()
    if (!appData || appData.user_id !== session.user.id) {
      navigate('/')
      return
    }
    setApp(appData)

    const { data: dlData } = await supabase.from('deadlines').select('*').eq('application_id', id).order('date')
    setDeadlines(dlData)

    const { data: reqData } = await supabase.from('requirements').select('*').eq('application_id', id)
    setRequirements(reqData)

    const { data: recData } = await supabase.from('recommenders').select('*').eq('application_id', id)
    setRecommenders(recData)

    setLoading(false)
  }

  const updateProgress = async () => {
    const completedReqs = requirements.filter(r => r.is_completed).length
    const submittedRecs = recommenders.filter(r => r.status === 'Submitted').length
    const total = requirements.length + recommenders.length
    const newProgress = total > 0 ? Math.round((completedReqs + submittedRecs) / total * 100) : 0

    const { error } = await supabase.from('applications').update({ progress: newProgress }).eq('id', id)
    if (!error) setApp({ ...app, progress: newProgress })
  }

  const toggleRequirement = async (reqId, completed) => {
    await supabase.from('requirements').update({ is_completed: completed }).eq('id', reqId)
    setRequirements(requirements.map(r => r.id === reqId ? { ...r, is_completed: completed } : r))
    updateProgress()
  }

  const updateRecommenderStatus = async (recId, status) => {
    await supabase.from('recommenders').update({ status }).eq('id', recId)
    setRecommenders(recommenders.map(r => r.id === recId ? { ...r, status } : r))
    updateProgress()
  }

  const updateAppField = async (field, value) => {
    const updateData = { [field]: value }
    await supabase.from('applications').update(updateData).eq('id', id)
    setApp({ ...app, ...updateData })
  }

  if (loading) return <div className="text-center">Loading...</div>

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-primary">{app.program}</h2>
        <button 
          onClick={() => setEditMode(!editMode)} 
          className="bg-secondary text-white py-2 px-4 rounded"
        >
          {editMode ? 'Switch to Update Mode' : 'Switch to Edit Mode'}
        </button>
      </div>
      <p className="text-neutralDark mb-4">{app.country} - {app.level}</p>
      <div className="mb-4">
        <span className="font-medium">Status:</span>
        {editMode ? (
          <select value={app.status} onChange={e => updateAppField('status', e.target.value)} className="ml-2 p-1 border rounded">
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
        <span className="font-medium">Funding:</span>
        {editMode ? (
          <select value={app.funding_status} onChange={e => updateAppField('funding_status', e.target.value)} className="ml-2 p-1 border rounded">
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
          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${app.progress}%` }}></div>
        </div>
        <p>{app.progress}% Complete</p>
      </div>

      <h3 className="text-2xl font-bold mb-4">Deadlines</h3>
      <ul className="mb-6">
        {deadlines.map(dl => (
          <li key={dl.id} className="mb-2">
            {editMode ? (
              <>
                <input 
                  type="text" 
                  value={dl.name} 
                  onChange={async e => {
                    await supabase.from('deadlines').update({ name: e.target.value }).eq('id', dl.id)
                    setDeadlines(deadlines.map(d => d.id === dl.id ? { ...d, name: e.target.value } : d))
                  }} 
                  className="p-1 border rounded mr-2"
                />
                <input 
                  type="date" 
                  value={dl.date} 
                  onChange={async e => {
                    await supabase.from('deadlines').update({ date: e.target.value }).eq('id', dl.id)
                    setDeadlines(deadlines.map(d => d.id === dl.id ? { ...d, date: e.target.value } : d))
                  }} 
                  className="p-1 border rounded"
                />
              </>
            ) : (
              `${dl.name}: ${dl.date}`
            )}
          </li>
        ))}
        {editMode && (
          <button onClick={async () => {
            const { data } = await supabase.from('deadlines').insert({ application_id: id, name: 'New Deadline', date: new Date().toISOString().split('T')[0] }).select().single()
            setDeadlines([...deadlines, data])
          }} className="bg-secondary text-white py-1 px-3 rounded mt-2">
            Add Deadline
          </button>
        )}
      </ul>

      <h3 className="text-2xl font-bold mb-4">Requirements</h3>
      <ul className="mb-6">
        {requirements.map(req => (
          <li key={req.id} className="flex items-center mb-2">
            <input 
              type="checkbox" 
              checked={req.is_completed} 
              onChange={e => !editMode && toggleRequirement(req.id, e.target.checked)} // Update mode only
              disabled={editMode}
            />
            <span className="ml-2">{req.name}</span>
            {editMode && (
              <button onClick={async () => {
                await supabase.from('requirements').delete().eq('id', req.id)
                setRequirements(requirements.filter(r => r.id !== req.id))
                updateProgress()
              }} className="ml-auto text-red-500">Delete</button>
            )}
          </li>
        ))}
        {editMode && (
          <div className="mt-4">
            <input 
              type="text" 
              placeholder="New Requirement" 
              id="newReq"
              className="p-1 border rounded mr-2"
            />
            <button onClick={async () => {
              const name = document.getElementById('newReq').value
              if (name) {
                const { data } = await supabase.from('requirements').insert({ application_id: id, name, is_completed: false }).select().single()
                setRequirements([...requirements, data])
                updateProgress()
              }
            }} className="bg-secondary text-white py-1 px-3 rounded">
              Add
            </button>
          </div>
        )}
      </ul>

      <h3 className="text-2xl font-bold mb-4">Recommenders</h3>
      <ul className="mb-6">
        {recommenders.map(rec => (
          <li key={rec.id} className="mb-2">
            {editMode ? (
              <input 
                type="text" 
                value={rec.name} 
                onChange={async e => {
                  await supabase.from('recommenders').update({ name: e.target.value }).eq('id', rec.id)
                  setRecommenders(recommenders.map(r => r.id === rec.id ? { ...r, name: e.target.value } : r))
                }} 
                className="p-1 border rounded mr-2"
              />
            ) : (
              <span>{rec.name} - </span>
            )}
            <select 
              value={rec.status} 
              onChange={e => !editMode && updateRecommenderStatus(rec.id, e.target.value)} // Update mode
              disabled={editMode}
              className="p-1 border rounded"
            >
              <option>Identified</option>
              <option>Contacted</option>
              <option>In Progress</option>
              <option>Submitted</option>
            </select>
            {editMode && (
              <button onClick={async () => {
                await supabase.from('recommenders').delete().eq('id', rec.id)
                setRecommenders(recommenders.filter(r => r.id !== rec.id))
                updateProgress()
              }} className="ml-2 text-red-500">Delete</button>
            )}
          </li>
        ))}
        {editMode && (
          <div className="mt-4">
            <input 
              type="text" 
              placeholder="New Recommender Name" 
              id="newRec"
              className="p-1 border rounded mr-2"
            />
            <button onClick={async () => {
              const name = document.getElementById('newRec').value || 'New Recommender'
              const { data } = await supabase.from('recommenders').insert({ application_id: id, name, status: 'Identified' }).select().single()
              setRecommenders([...recommenders, data])
              updateProgress()
            }} className="bg-secondary text-white py-1 px-3 rounded">
              Add
            </button>
          </div>
        )}
      </ul>

      <h3 className="text-2xl font-bold mb-4">Links</h3>
      <div className="mb-4">
        <span className="font-medium">Program Link:</span>
        {editMode ? (
          <input 
            type="url" 
            value={app.program_link || ''} 
            onChange={e => updateAppField('program_link', e.target.value)} 
            className="ml-2 p-1 border rounded w-1/2"
          />
        ) : (
          <a href={app.program_link} target="_blank" className="ml-2 text-secondary">{app.program_link || 'None'}</a>
        )}
      </div>
      <div>
        <span className="font-medium">Portal Link:</span>
        {editMode ? (
          <input 
            type="url" 
            value={app.portal_link || ''} 
            onChange={e => updateAppField('portal_link', e.target.value)} 
            className="ml-2 p-1 border rounded w-1/2"
          />
        ) : (
          <a href={app.portal_link} target="_blank" className="ml-2 text-secondary">{app.portal_link || 'None'}</a>
        )}
      </div>
    </div>
  )
}