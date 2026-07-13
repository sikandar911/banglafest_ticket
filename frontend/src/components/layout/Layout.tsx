import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-800 bg-gray-900/10 py-8 text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-gray-800/60">
            <div className="flex items-center gap-3">
              <img 
                src="/banglafest-flat-logo.png" 
                alt="Banglafest Logo" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
              />
              <div className="text-left">
                <p className="text-gray-300 font-semibold">Banglafest</p>
                <p className="text-xs text-gray-500">Your Festival Ticket Platform</p>
              </div>
            </div>
            <p className="text-xs self-end">© {new Date().getFullYear()} Banglafest. All rights reserved.</p>
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-between gap-6 text-xs text-gray-500">
            <div className="max-w-3xl text-left">
              <p className="font-semibold text-gray-400 mb-1">
                Developed by{" "}
                <a 
                  href="https://fireworksco.uk/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-400 hover:underline font-bold transition-colors"
                >
                  Fireworks CO UK
                </a>
                {" "}— Modern Growth Engineering for UK & Australian Enterprise Brands.
              </p>
              <p className="leading-relaxed text-gray-600">
                Based in London, Fireworks CO UK develops dynamic web and mobile applications, deploys high-converting digital marketing, and builds advanced automation workflows. We increase your business visibility, scale your revenue, and automate your operations.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
