import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function UserProfile({ session }) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setDisplayName(session.user.user_metadata.full_name);
    }
  }, [session]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });

    if (error) {
      toast.error('Error updating profile.');
      console.error('Error updating profile:', error.message);
    } else {
      toast.success('Profile updated successfully!');
    }

    setLoading(false);
  };

  return (
  <div className="container mx-0 p-4 md:p-1">
      <ToastContainer />
  <h1 className="text-3xl font-bold mb-6" style={{ color: '#313E50' }}>My Profile</h1>
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-xl mx-auto">
        
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium" style={{ color: '#313E50' }}>Email</label>
            <p className="mt-1 p-2 bg-charcoal-100 rounded-md text-slate_gray-900">{session?.user?.email}</p>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col">
              <label htmlFor="displayName" className="text-sm font-medium" style={{ color: '#313E50' }}>Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 p-2 border border-charcoal-400 rounded-md focus:ring-delft_blue-500 focus:border-delft_blue-500"
                placeholder="Enter your name"
              />
            </div>
            <button
              type="submit"
              className="bg-delft_blue-500 text-slate_gray-100 py-2 px-4 rounded w-full md:w-auto hover:bg-paynes_gray-500 transition-colors font-semibold shadow disabled:bg-slate_gray-300"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
