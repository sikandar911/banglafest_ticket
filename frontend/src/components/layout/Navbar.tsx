import { Link, useNavigate } from 'react-router-dom';
import { Ticket, LogOut, LayoutDashboard, ScanLine, ShieldCheck, Menu, X, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-400">
            <Ticket className="w-6 h-6" />
            Banglafest
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium">
              Events
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
            {(user?.role === 'SCANNER' || user?.role === 'ADMIN') && (
              <Link to="/scanner" className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-1.5">
                <ScanLine className="w-4 h-4" />
                Scanner
              </Link>
            )}
            {user?.role === 'SALES_EXECUTIVE' && (
              <Link to="/sales/customers" className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Sales
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400">{user?.name}</span>
                <button onClick={handleLogout} className="btn-secondary py-1.5 text-sm">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary py-1.5 text-sm">Login</Link>
                <Link to="/register" className="btn-primary py-1.5 text-sm">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="md:hidden py-4 border-t border-gray-800 flex flex-col gap-2">
            <Link to="/" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800">Events</Link>
            {isAuthenticated && (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            )}
            {(user?.role === 'SCANNER' || user?.role === 'ADMIN') && (
              <Link to="/scanner" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <ScanLine className="w-4 h-4" /> Scanner
              </Link>
            )}
            {user?.role === 'SALES_EXECUTIVE' && (
              <Link to="/sales/customers" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Sales
              </Link>
            )}
            <div className="pt-2 border-t border-gray-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <button onClick={() => { handleLogout(); setOpen(false); }} className="btn-secondary text-sm">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary text-sm text-center">Login</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-sm text-center">Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
