import { LayoutDashboard, FileText, Users, Trash2, Truck, User, Menu, CreditCard, Mail } from 'lucide-react';
import { Screen } from '../types';

interface BottomNavBarProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  userRole?: 'admin' | 'agent' | 'abonne' | 'eboueur';
  hasNewSignals?: boolean;
  unreadMessagesCount?: number;
  abonneSubTab?: 'signalement' | 'redevance' | 'inbox';
  onAbonneSubTabChange?: (subTab: 'signalement' | 'redevance' | 'inbox') => void;
  onOpenMobileMenu?: () => void;
}

export default function BottomNavBar({ 
  currentScreen, 
  onScreenChange, 
  userRole = 'agent', 
  hasNewSignals = false,
  unreadMessagesCount = 0,
  abonneSubTab = 'signalement',
  onAbonneSubTabChange,
  onOpenMobileMenu
}: BottomNavBarProps) {
  // Define tabs dynamically based on user role
  const getTabsForRole = () => {
    if (userRole === 'abonne') {
      return [
        { id: 'abonne_signalement', label: 'Signalement', icon: Trash2, subTab: 'signalement' as const },
        { id: 'abonne_redevance', label: 'Redevance', icon: CreditCard, subTab: 'redevance' as const },
        { id: 'abonne_inbox', label: 'Messages', icon: Mail, subTab: 'inbox' as const },
        { id: 'profil' as Screen, label: 'Profil', icon: User },
        { id: 'mobile_menu' as any, label: 'Menu', icon: Menu },
      ];
    }
    if (userRole === 'eboueur') {
      return [
        { id: 'eboueur_space' as Screen, label: 'Missions', icon: Truck },
        { id: 'profil' as Screen, label: 'Profil', icon: User },
        { id: 'mobile_menu' as any, label: 'Menu', icon: Menu },
      ];
    }
    return [
      { id: 'dashboard' as Screen, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'communes' as Screen, label: 'Recensement', icon: FileText, altId: 'recensement_form' as Screen },
      { id: 'dechets_map' as Screen, label: 'Déchets', icon: Trash2 },
      { id: 'abonne_list' as Screen, label: 'Abonnés', icon: Users, altId: 'abonne_detail' as Screen },
      { id: 'mobile_menu' as any, label: 'Menu', icon: Menu },
    ];
  };

  const tabs = getTabsForRole();

  const checkActive = (tab: any) => {
    if (userRole === 'abonne') {
      if (tab.subTab) {
        return currentScreen === 'abonne_space' && abonneSubTab === tab.subTab;
      }
      return currentScreen === tab.id;
    }
    if (currentScreen === tab.id) return true;
    if (tab.altId && currentScreen === tab.altId) return true;
    if (tab.id === 'communes' && currentScreen === 'avenues') return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-lg border-t border-outline-variant py-1.5 px-2 flex justify-around items-center z-50 md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const isActive = checkActive(tab);
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'mobile_menu') {
                if (onOpenMobileMenu) onOpenMobileMenu();
              } else if (tab.subTab) {
                if (onAbonneSubTabChange) onAbonneSubTabChange(tab.subTab);
                onScreenChange('abonne_space');
              } else {
                onScreenChange(tab.id as Screen);
              }
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 active:scale-95 transition-transform duration-100 cursor-pointer"
          >
            <div
              className={`flex items-center justify-center rounded-xl px-3 py-1 mb-0.5 transition-all duration-200 relative ${
                isActive
                  ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-background hover:text-on-surface'
              }`}
            >
              <IconComponent size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              {tab.id === 'dechets_map' && hasNewSignals && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm shadow-red-500/50"></span>
                </span>
              )}
              {tab.subTab === 'inbox' && unreadMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white border border-surface shadow-sm animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
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
