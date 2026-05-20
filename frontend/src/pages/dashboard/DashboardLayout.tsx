import { NavLink, Outlet } from 'react-router-dom';
import { User, Ticket, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  { to: '/dashboard', icon: User, label: 'Profile', end: true },
  { to: '/dashboard/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/dashboard/orders', icon: ShoppingBag, label: 'My Orders' },
];

export function DashboardLayout() {
  const { user } = useAuth();

  // Filter links based on user role
  // SCANNER and SALES_EXECUTIVE only see Profile
  // USER and ADMIN see all dashboard links
  const isScannnerOrSales = user?.role === 'SCANNER' || user?.role === 'SALES_EXECUTIVE';
  const visibleLinks = isScannnerOrSales
    ? links.filter(link => link.label === 'Profile')
    : links;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {isScannnerOrSales ? 'My Account' : 'Dashboard'}
        </h1>
        <p className="text-gray-400">Welcome back, {user?.name}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {visibleLinks.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-900 text-primary-300'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
