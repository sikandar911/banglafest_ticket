import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, DollarSign, Users, ShoppingBag, BarChart3, Tag, Layers } from 'lucide-react';
import { AdminEventFilterProvider, useAdminEventFilter } from '../../context/AdminEventFilterContext';

const links = [
  { to: '/admin', icon: BarChart3, label: 'Overview', end: true },
  { to: '/admin/events', icon: CalendarDays, label: 'Events' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
  { to: '/admin/promo-codes', icon: Tag, label: 'Promo Codes' },
];

function AdminLayoutContent() {
  const { selectedEventId, setSelectedEventId, events, isLoadingEvents } = useAdminEventFilter();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Manage events, tickets, and users</p>
        </div>

        {/* Global Event Dropdown Filter */}
        <div className="flex items-center gap-2.5 bg-gray-800/80 border border-gray-700/60 rounded-xl px-3 py-2 w-full sm:w-auto">
          <Layers className="w-4 h-4 text-primary-400 shrink-0" />
          <div className="flex-1">
            <label htmlFor="event-filter" className="sr-only">Filter by Event</label>
            <select
              id="event-filter"
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-8 w-full"
              disabled={isLoadingEvents}
            >
              {isLoadingEvents ? (
                <option value="" className="bg-gray-900 text-gray-400">Loading events...</option>
              ) : events.length === 0 ? (
                <option value="" className="bg-gray-900 text-gray-400">No events found</option>
              ) : (
                <>
                  <option value="" className="bg-gray-900 text-white">All Events (Combined)</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id} className="bg-gray-900 text-white">
                      {event.title} {!event.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0">
            {links.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
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

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminEventFilterProvider>
      <AdminLayoutContent />
    </AdminEventFilterProvider>
  );
}
