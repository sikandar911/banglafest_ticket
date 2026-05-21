import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/banglafest logo.png" 
                alt="Banglafest Logo" 
                className="w-20 h-20 md:w-32 md:h-32 object-contain"
              />
              <div className="text-left">
                <p className="text-gray-400 font-semibold">Banglafest</p>
                <p className="text-xs text-gray-600">Your Festival Ticket Platform</p>
              </div>
            </div>
            <p className="md:text-right">© {new Date().getFullYear()} Banglafest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
