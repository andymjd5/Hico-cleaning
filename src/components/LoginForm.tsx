import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, LogIn, Phone, Lock, Truck, Shield, User, Users } from 'lucide-react';
import { Agent } from '../types';
import { INITIAL_AGENTS } from '../initialData';

interface LoginFormProps {
  onLoginSuccess: (agent: Agent) => void;
  agents: Agent[];
  onRegisterAgent: (newAgent: Agent) => void;
}

export default function LoginForm({ onLoginSuccess, agents, onRegisterAgent }: LoginFormProps) {
  // Let form fields start blank to look like a clean login page, or fill via click
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeRoleTab, setActiveRoleTab] = useState<'eboueur' | 'abonne' | 'admin_agent'>('eboueur');

  const cleanPhone = (val: string) => {
    return val.replace(/\s+/g, '');
  };

  const [isNewAccount, setIsNewAccount] = useState(false);
  const [newAccountNom, setNewAccountNom] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'eboueur' | 'abonne' | 'agent' | 'admin'>('eboueur');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const checkPhone = cleanPhone(phone);
    if (!checkPhone) {
      setErrorMsg('Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    // Find if user already exists
    const found = agents.find(
      (a) => cleanPhone(a.telephone) === checkPhone || a.telephone === checkPhone
    );

    if (found) {
      const userPassword = found.password || 'password';
      if (password !== userPassword) {
        setErrorMsg('Mot de passe incorrect pour cet utilisateur.');
        return;
      }
      onLoginSuccess(found);
    } else {
      // If we haven't displayed the new account creation fields yet, show them first
      if (!isNewAccount) {
        setIsNewAccount(true);
        const formatSuffix = checkPhone.substring(Math.max(0, checkPhone.length - 4));
        setNewAccountNom(`Agent Recenseur ${formatSuffix || 'Nouveau'}`);
        return;
      }

      // Create a professional agent profile dynamically
      const safePhone = phone.trim();
      
      const sessionAgent: Agent = {
        id: 'agent-' + Math.random().toString(36).substring(2, 11),
        nom: newAccountNom.trim() || `Agent Recenseur`,
        telephone: safePhone,
        role: newAccountRole,
        created_at: new Date().toISOString(),
        password: password || 'password',
        isTempPassword: false
      };
      
      // Save newly created agent to local list and sync with database
      onRegisterAgent(sessionAgent);
      onLoginSuccess(sessionAgent);
    }
  };

  const handleQuickConnect = (demoPhone: string) => {
    setPhone(demoPhone);
    setPassword('password');
    setErrorMsg(null);

    setTimeout(() => {
      const checkPhone = cleanPhone(demoPhone);
      const found = agents.find(
        (a) => cleanPhone(a.telephone) === checkPhone || a.telephone === checkPhone
      );
      if (found) {
        onLoginSuccess(found);
      }
    }, 100);
  };

  const groupedAgents = {
    eboueur: agents.filter(a => a.role === 'eboueur'),
    abonne: agents.filter(a => a.role === 'abonne'),
    admin_agent: agents.filter(a => a.role === 'admin' || a.role === 'agent')
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 bg-[#0A0A0A] text-white">
      <main className="w-full max-w-sm flex flex-col gap-6">
        
        {/* Header / Logo Area */}
        <header className="flex flex-col items-center gap-3 text-center">
          {/* Circular Checkmark Logo inspired by Image 2 - now styled as high-end glowing Bento mark */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#141414] border border-white/10 shadow-lg transition-transform duration-300 hover:scale-105">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
              Hico-Cleaning
            </h1>
            <p className="text-xs font-semibold tracking-wider text-primary uppercase mt-0.5 font-mono">
              Portail Multiservices Urbain
            </p>
          </div>
        </header>

        {/* Dynamic Account Selector Panel */}
        <div className="bg-[#141414] rounded-2xl border border-white/10 p-4 flex flex-col gap-3 shadow-md" id="dynamic_account_switcher">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10b981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
              Sélecteur de Comptes :
            </span>
            <span className="text-[10px] text-gray-500 font-mono font-bold">
              {agents.length} comptes trouvés
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-[#0D0D0D] p-1 rounded-xl border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setActiveRoleTab('eboueur')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRoleTab === 'eboueur'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Truck size={14} />
              <span>Éboueurs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab('abonne')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRoleTab === 'abonne'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={14} />
              <span>Abonnés</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab('admin_agent')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRoleTab === 'admin_agent'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={14} />
              <span>Staff</span>
            </button>
          </div>

          {/* Active Tab Account List Grid */}
          <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {groupedAgents[activeRoleTab].length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500 font-medium font-sans">
                Aucun compte enregistré pour ce rôle.
              </div>
            ) : (
              groupedAgents[activeRoleTab].map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onLoginSuccess(agent)}
                  className="w-full p-2.5 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      agent.role === 'eboueur' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' :
                      agent.role === 'abonne' ? 'bg-primary/10 text-primary border border-primary/25' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                    }`}>
                      {agent.role === 'eboueur' ? <Truck size={15} /> :
                       agent.role === 'abonne' ? <User size={15} /> :
                       <Shield size={15} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white group-hover:text-primary transition-colors leading-none">
                        {agent.nom}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono mt-0.5 font-medium leading-none">
                        {agent.telephone}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] bg-white/10 text-gray-300 font-bold uppercase px-1.5 py-0.5 rounded border border-white/5 font-sans tracking-wide">
                      {agent.role === 'eboueur' ? 'Éboueur' :
                       agent.role === 'abonne' ? 'Abonné' :
                       agent.role === 'admin' ? 'Admin' : 'Recenseur'}
                    </span>
                    <LogIn size={12} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Login Form Container */}
        <div className="bg-[#141414] rounded-3xl border border-white/10 p-5 flex flex-col gap-5 shadow-2xl">
          <form className="flex flex-col gap-3.5" onSubmit={handleLogin}>
            
            {/* Phone Field */}
            <div className="flex flex-col gap-1.5">
              <label 
                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans" 
                htmlFor="phone"
              >
                Numéro de téléphone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Phone size={16} />
                </span>
                <input 
                  type="text"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full h-11 pl-11 pr-3 bg-[#0D0D0D] border rounded-xl text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans ${
                    errorMsg ? 'border-error ring-1 ring-error' : 'border-white/10'
                  }`}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label 
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans" 
                  htmlFor="password"
                >
                  Mot de passe
                </label>
                <button 
                  type="button" 
                  onClick={() => alert(`Pour la démo, utilisez le mot de passe: "password"`)}
                  className="text-[10px] font-bold text-primary hover:text-white transition-colors"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Lock size={16} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full h-11 pl-11 pr-10 bg-[#0D0D0D] border rounded-xl text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans ${
                    errorMsg ? 'border-error ring-1 ring-error' : 'border-white/10'
                  }`}
                  placeholder="••••••••"
                />
                <button 
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-white transition-colors" 
                  onClick={() => setShowPassword(!showPassword)} 
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {isNewAccount && (
                <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 mt-2 animate-fade-in text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10b981] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                    Nouveau Compte Détecté !
                  </span>
                  <p className="text-[11px] text-gray-400 font-sans leading-normal">
                    Ce numéro n'est pas encore enregistré. Veuillez compléter les informations ci-dessous pour l'enregistrer dans le système :
                  </p>
                  
                  {/* Nom complet input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 font-sans" htmlFor="new_name">
                      Nom complet de l'utilisateur
                    </label>
                    <input
                      type="text"
                      id="new_name"
                      value={newAccountNom}
                      onChange={(e) => setNewAccountNom(e.target.value)}
                      className="w-full h-9 px-3 bg-[#141414] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary font-sans"
                      placeholder="Ex: Andy MJ"
                      required
                    />
                  </div>

                  {/* Role selection dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 font-sans" htmlFor="new_role">
                      Rôle de l'utilisateur
                    </label>
                    <select
                      id="new_role"
                      value={newAccountRole}
                      onChange={(e) => setNewAccountRole(e.target.value as any)}
                      className="w-full h-9 px-2 bg-[#141414] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-primary font-sans"
                    >
                      <option value="eboueur">Éboueur (Chauffeur de camion)</option>
                      <option value="abonne">Abonné (Bailleur / Propriétaire de parcelle)</option>
                      <option value="agent">Agent Recenseur (Staff terrain)</option>
                      <option value="admin">Administrateur système</option>
                    </select>
                  </div>
                </div>
              )}
              
              {/* Error Message with dynamic show/hide */}
              {errorMsg && (
                <p className="text-xs text-error mt-1.5 flex items-center gap-1.5 font-semibold animate-fade-in bg-error-container/10 border border-error/20 p-2 rounded-lg">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Submit Action Button */}
            <button 
              type="submit"
              className="w-full h-11 bg-white text-black font-bold text-sm rounded-xl mt-2 hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {isNewAccount ? "Créer le compte et se connecter" : "Se connecter"}
              <LogIn size={16} />
            </button>
          </form>
        </div>

        {/* Footer Info Area */}
        <p className="text-center text-sm font-sans text-gray-400 leading-relaxed">
          Besoin d'aide ? <br /> Contactez le <span className="text-primary font-bold hover:underline cursor-pointer" onClick={() => alert('Support technique Hico-Cleaning : +243 81 234 5678')}>support technique</span>.
        </p>

        {/* Info Box to facilitate fast testing */}
        <div className="bg-[#1C1C1C] border border-white/5 text-gray-300 rounded-2xl p-4 text-xs flex flex-col gap-1.5 shadow-md">
          <p className="font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse"></span>
            Mode d'accès et Connexion :
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-400 font-sans">
            <li>Saisissez <span className="text-white font-medium">n'importe quel numéro</span> pour vous connecter de façon personnalisée.</li>
            <li>Ou connectez-vous directement avec le numéro de démonstration prérempli ci-dessus.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
