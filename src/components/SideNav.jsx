import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FaTable, FaList, FaUser, FaSignOutAlt } from 'react-icons/fa';

// Accept userName as prop
export default function SideNav({ expanded, setExpanded, userName }) {
  const location = useLocation();

  return (
    <aside className={`fixed top-0 left-0 h-full bg-charcoal-500 text-slate_gray-900 flex flex-col transition-all duration-200 z-40 ${expanded ? 'w-56' : 'w-16'} shadow-lg`} style={{minWidth: expanded ? 180 : 64}}>
      {/* Nav bar icon at the very top */}
      <div className="flex items-center justify-center px-4 py-4 border-b border-charcoal-400" style={{height: 56}}>
        <img src="/image.png" alt="GradJournie Logo" style={{ width: 32, height: 32, borderRadius: 8, background: '#fff' }} />
      </div>
      {/* Name and arrow below icon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-charcoal-400" style={{height: 48}}>
        {expanded && (
          <span className="text-base font-semibold truncate" style={{lineHeight: '1.5', color: '#F9FAFB'}} title={userName}>{userName}</span>
        )}
        <button onClick={() => setExpanded(e => !e)} className="focus:outline-none text-white ml-2 flex-shrink-0" style={{marginLeft: expanded ? '1rem' : 0}}>
          <span className="sr-only">Toggle nav</span>
          {expanded ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      <nav className="flex-1 flex flex-col mt-4 space-y-2">
        <NavLink to="/applications" className={({ isActive }) => `flex items-center px-4 py-2 rounded transition-colors ${isActive ? 'bg-delft_blue-500 text-white' : 'hover:bg-paynes_gray-400 hover:text-white'} ${expanded ? '' : 'justify-center'}`}> 
          <FaTable className="mr-2" />
          {expanded && <span>Applications</span>}
        </NavLink>
        <NavLink to="/timelines" className={({ isActive }) => `flex items-center px-4 py-2 rounded transition-colors ${isActive ? 'bg-delft_blue-500 text-white' : 'hover:bg-paynes_gray-400 hover:text-white'} ${expanded ? '' : 'justify-center'}`}> 
          <FaList className="mr-2" />
          {expanded && <span>Timelines</span>}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `flex items-center px-4 py-2 rounded transition-colors ${isActive ? 'bg-delft_blue-500 text-white' : 'hover:bg-paynes_gray-400 hover:text-white'} ${expanded ? '' : 'justify-center'}`}> 
          <FaUser className="mr-2" />
          {expanded && <span>Profile</span>}
        </NavLink>
      </nav>
      <div className="mt-auto mb-4 px-4">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to sign out?')) {
              supabase.auth.signOut();
            }
          }}
          className="flex items-center w-full text-red-500 hover:text-red-700 font-semibold px-2 py-2 rounded transition-colors bg-transparent"
        >
          <FaSignOutAlt className="mr-2" style={{fontSize: '1.5rem', minWidth: 24, minHeight: 24}} />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
