import { LayoutDashboard, FileText, Users, BarChart3, User, Compass, Trash2, Truck } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavBarProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  userRole?: 'admin' | 'agent' | 'abonne' | 'eboueur';
  hasNewSignals?: boolean;
}

export default function BottomNavBar({ currentScreen, onScreenChange, userRole = 'agent', hasNewSignals = false }: BottomNavBarProps) {
  // Define tabs dynamically based on user role
  const getTabsForRole = () => {
    if (userRole === 'abonne') {
      return [
        { id: 'abonne_space' as Screen, label: 'Mon Espace', icon: Trash2 },
        { id: 'profil' as Screen, label: 'Profil', icon: User },
      ];
    }
    if (userRole === 'eboueur') {
      return [
        { id: 'eboueur_space' as Screen, label: 'Missions', icon: Truck },
        { id: 'profil' as Screen, label: 'Profil', icon: User },
      ];
    }
    return [
      { id: 'dashboard' as Screen, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'communes' as Screen, label: 'Recensement', icon: FileText, altId: 'recensement_form' as Screen },
      { id: 'commune_explorer' as Screen, label: 'GPS', icon: Compass },
      { id: 'dechets_map' as Screen, label: 'Déchets', icon: Trash2 },
      { id: 'abonne_list' as Screen, label: 'Abonnés', icon: Users, altId: 'abonne_detail' as Screen },
      { id: 'rapports' as Screen, label: 'Rapports', icon: BarChart3 },
      { id: 'profil' as Screen, label: 'Profil', icon: User },
    ];
  };

  const tabs = getTabsForRole();

  const checkActive = (tabId: Screen, altId?: Screen) => {
    if (currentScreen === tabId) return true;
    if (altId && currentScreen === altId) return true;
    if (tabId === 'communes' && currentScreen === 'avenues') return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0D0D0D]/95 backdrop-blur-md border-t border-white/10 py-2 px-1 flex justify-around items-center z-50 md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
      {tabs.map((tab) => {
        const isActive = checkActive(tab.id, tab.altId);
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onScreenChange(tab.id)}
            className="flex flex-col items-center justify-center w-16 group active:scale-95 transition-all duration-100"
          >
            <div
              className={`flex items-center justify-center rounded-xl px-4.5 py-1.5 mb-1 transition-colors duration-200 relative ${
                isActive
                  ? 'bg-primary/20 text-indigo-400 font-bold border border-primary/20 shadow-inner'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <IconComponent size={18} strokeWidth={isActive ? 2.5 : 1.75} />
              {tab.id === 'dechets_map' && hasNewSignals && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm shadow-red-500/50"></span>
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-medium tracking-wide ${
                isActive ? 'text-white font-semibold' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
