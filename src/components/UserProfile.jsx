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
    <div className="container mx-auto p-4 md:p-8">
      <ToastContainer />
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md max-w-xl mx-auto">
        <nav className="text-sm text-neutralDark mb-4">
          <Link to="/applications" className="text-secondary hover:underline">Dashboard</Link> &gt; Profile
        </nav>
        <h1 className="text-3xl font-bold text-primary mb-6">My Profile</h1>
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-neutralDark">Email</label>
            <p className="mt-1 p-2 bg-gray-100 rounded-md text-neutralDark">{session?.user?.email}</p>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col">
              <label htmlFor="displayName" className="text-sm font-medium text-neutralDark">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 p-2 border border-neutral rounded-md focus:ring-secondary focus:border-secondary"
                placeholder="Enter your name"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-white py-2 px-4 rounded w-full md:w-auto hover:bg-primary-dark transition-colors disabled:bg-gray-400"
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
