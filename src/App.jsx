import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx';
import Timelines from './components/Timelines.jsx';
import AddApplication from './components/AddApplication.jsx';
import ApplicationDetail from './components/ApplicationDetail.jsx';
import UserProfile from './components/UserProfile.jsx';
import { FaUserCircle } from 'react-icons/fa';
import './index.css';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutralLight">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
          />
        </div>
      </div>
    );
  }

  const userName = session.user.user_metadata?.full_name || session.user.email;

  return (
    <div className="min-h-screen bg-neutralLight">
      <header className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/applications" className="text-2xl font-bold hover:text-secondary">
            Grad App Tracker
          </Link>
          <nav className="flex items-center space-x-4">
            <NavLink to="/applications" className={({ isActive }) => isActive ? 'font-bold underline text-secondary' : 'hover:text-secondary'}>Applications</NavLink>
            <NavLink to="/timelines" className={({ isActive }) => isActive ? 'font-bold underline text-secondary' : 'hover:text-secondary'}>Timelines</NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'font-bold underline text-secondary' : 'hover:text-secondary'} title="My Profile">
              <FaUserCircle size={24} />
            </NavLink>
            <button onClick={() => supabase.auth.signOut()} className="bg-secondary hover:bg-blue-700 text-white py-2 px-4 rounded">
              Sign Out
            </button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/applications" replace />} />
            <Route path="/applications" element={<Dashboard session={session} />} />
            <Route path="/add" element={<AddApplication session={session} />} />
            <Route path="/application/:id" element={<ApplicationDetail session={session} />} />
            <Route path="/profile" element={<UserProfile session={session} />} />
            <Route path="/timelines" element={<Timelines />} />
          </Routes>
      </main>
    </div>
  );
}
