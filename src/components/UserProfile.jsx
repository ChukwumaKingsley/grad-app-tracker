import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function UserProfile({ session }) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

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
          <div className="mt-6">
            <h2 className="text-lg font-semibold" style={{ color: '#313E50' }}>Change Password</h2>
            <p className="text-sm text-gray-500 mb-3">Choose a new password. Minimum 8 characters.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newPassword || newPassword.length < 8) {
                toast.error('Password must be at least 8 characters');
                return;
              }
              if (newPassword !== confirmPassword) {
                toast.error('Passwords do not match');
                return;
              }
              setPwLoading(true);
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                  toast.error('Error changing password');
                  console.error('change password error', error);
                } else {
                  toast.success('Password changed successfully');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              } catch (err) {
                console.error(err);
                toast.error('Unexpected error');
              } finally {
                setPwLoading(false);
              }
            }} className="space-y-3">
              <div>
                <label className="text-sm font-medium">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 p-2 w-full border rounded-md" placeholder="New password" />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 p-2 w-full border rounded-md" placeholder="Confirm password" />
              </div>
              <div>
                <button type="submit" className="bg-red-600 text-white py-2 px-4 rounded w-full md:w-auto font-semibold" disabled={pwLoading}>{pwLoading ? 'Updating...' : 'Change password'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
