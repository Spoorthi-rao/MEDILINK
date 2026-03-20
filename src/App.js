import { useState, useEffect } from 'react';
import Auth from './screens/Auth';
import Login from './screens/Login';
import Registration from './screens/Registration';
import Consultation from './screens/Consultation';
import Dispense from './screens/Dispense';
import TestOrders from './screens/TestOrders';
import PatientDashboard from './screens/PatientDashboard';
import Analytics from './screens/Analytics';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [screen, setScreen] = useState(null);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('ml_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setRole(u.role);
    }
  }, []);

  const handleAuth = (authUser) => {
    setUser(authUser);
    setRole(authUser.role);
    localStorage.setItem('ml_user', JSON.stringify(authUser));
    setScreen('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('ml_user');
    localStorage.removeItem('ml_token');
    setUser(null);
    setRole(null);
    setScreen(null);
  };

  if (!user) return <Auth onAuth={handleAuth} />;

  const navItems = {
    receptionist: ['Registration', 'Patient Lookup', 'Analytics'],
    doctor: ['Consultation', 'Patient Records', 'Analytics'],
    pharmacy: ['Dispense'],
    lab: ['Test Orders'],
    patient: ['My Dashboard']
  }[role] || [];

  const currentView = screen === 'dashboard' ? navItems[0] : screen;

  return (
    <div className="font-sans bg-slate-50 min-h-screen flex flex-col">
      {/* Navbar className="hidden print:hidden" can be applied if needed */}
      <nav className="bg-white border-b border-slate-200 px-6 flex items-center h-16 shrink-0 print:hidden sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">+</div>
          <span className="text-xl font-bold tracking-tight text-slate-800">MediLink</span>
        </div>
        <div className="flex gap-2 ml-10">
          {navItems.map(item => (
            <button key={item} onClick={() => setScreen(item)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${currentView === item
                  ? 'bg-primary-50 text-primary-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}>
              {item}
            </button>
          ))}
        </div>
        <button onClick={logout}
          className="ml-auto text-sm font-medium text-slate-500 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2 transition-all">
          Sign out
        </button>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8">
        {currentView === 'Registration' && <Registration />}
        {currentView === 'Consultation' && <Consultation />}
        {currentView === 'Dispense' && <Dispense />}
        {currentView === 'Test Orders' && <TestOrders />}
        {currentView === 'Analytics' && <Analytics />}
        {['My Dashboard', 'Patient Lookup', 'Patient Records'].includes(currentView) && <PatientDashboard />}
        {!['Registration', 'Consultation', 'Dispense', 'Test Orders', 'Analytics', 'My Dashboard', 'Patient Lookup', 'Patient Records'].includes(currentView) && (
          <div className="text-center mt-32 text-slate-400 print:hidden">
            <h2 className="text-2xl font-bold text-slate-300 mb-2">Welcome to {role} portal</h2>
            <p>Select a tab above to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
