import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Dashboard({ session }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setApplications(data)
    setLoading(false)
  }

  const getNextDeadline = async (appId) => {
    const { data } = await supabase
      .from('deadlines')
      .select('date')
      .eq('application_id', appId)
      .order('date', { ascending: true })
      .gt('date', new Date().toISOString().split('T')[0])

    return data?.[0]?.date || 'None'
  }

  if (loading) return <div className="text-center">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-neutralDark">My Applications</h2>
        <Link to="/add" className="bg-primary hover:bg-blue-900 text-white font-bold py-2 px-4 rounded">
          Add Application
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map(async (app) => {
          const nextDeadline = await getNextDeadline(app.id)
          return (
            <Link key={app.id} to={`/application/${app.id}`} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-primary">{app.program}</h3>
              <p className="text-neutralDark">{app.country} - {app.level}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                app.status === 'Submitted' ? 'bg-accent text-white' :
                app.status === 'Planning' ? 'bg-gray-200 text-gray-800' :
                'bg-secondary text-white'
              }`}>
                {app.status}
              </span>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-accent h-2.5 rounded-full" style={{ width: `${app.progress}%` }}></div>
                </div>
                <p className="text-sm text-neutralDark mt-1">{app.progress}% Complete</p>
              </div>
              <p className="mt-2 text-sm text-neutralDark">Next Deadline: {nextDeadline}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}