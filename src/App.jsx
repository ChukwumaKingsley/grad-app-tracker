import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx';
import Timelines from './components/Timelines.jsx';
import AddApplication from './components/AddApplication.jsx';
import ApplicationDetail from './components/ApplicationDetail.jsx';
import UserProfile from './components/UserProfile.jsx';
// import { FaUserCircle } from 'react-icons/fa';
import './index.css';
import SideNav from './components/SideNav.jsx';

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

  const [navExpanded, setNavExpanded] = useState(true);

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
    <div className="min-h-screen bg-neutralLight flex">
      <SideNav expanded={navExpanded} setExpanded={setNavExpanded} userName={userName} />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${navExpanded ? 'ml-56' : 'ml-16'}`}>
        <header className="bg-neutral-900 text-white p-4 w-full sticky top-0 z-30 shadow">
          <div className="text-2xl font-bold text-center">Grad App Tracker</div>
        </header>
        <main className="flex-1 p-4">
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
    </div>
  );
}
