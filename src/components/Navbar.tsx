import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, LogOut, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-white/10 bg-[#0d0d0f]/95 backdrop-blur-md sticky top-0 z-40 selection:bg-[#6ee7b7] selection:text-[#0d0d0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Brand */}
          <Link to="/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-[#6ee7b7] flex items-center justify-center font-bold text-[#0d0d0f] rounded-sm mr-2 select-none text-sm font-sans tracking-tighter">
              B.
            </div>
            <span className="text-md font-semibold tracking-tight uppercase text-gray-100 font-sans">
              BASE<span className="text-[#6ee7b7]/50 font-light">62</span>
            </span>
          </Link>

          {/* User profile metadata */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-1.5 bg-[#121214] border border-white/10 px-3 py-1.5 rounded-sm font-mono text-[10px] text-gray-400">
                <Shield className="w-3 h-3 text-[#6ee7b7]" />
                <span className="truncate max-w-[150px]">{user.email}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 border border-white/10 text-[10px] uppercase tracking-widest hover:bg-white hover:text-[#0d0d0f] transition-colors bg-transparent text-gray-200 font-medium font-sans flex items-center gap-1.5 rounded-sm cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
