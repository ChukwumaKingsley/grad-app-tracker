import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx'; // We'll create this next

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutralLight">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutralLight">
      <header className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Grad App Tracker</h1>
          <button onClick={() => supabase.auth.signOut()} className="bg-secondary hover:bg-blue-700 text-white py-2 px-4 rounded">
            Sign Out
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard session={session} />} />
          <Route path="/add" element={<AddApplication session={session} />} />
          <Route path="/application/:id" element={<ApplicationDetail session={session} />} />
          {/* Add more routes later */}
        </Routes>
      </main>
    </div>
  );
}