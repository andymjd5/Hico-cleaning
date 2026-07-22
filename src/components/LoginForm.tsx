import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Phone, Lock, CheckCircle2, ShieldAlert, Key, ArrowRight, RefreshCw, X } from 'lucide-react';
import { Agent, Abonne } from '../types';

interface LoginFormProps {
  onLoginSuccess: (agent: Agent) => void;
  agents: Agent[];
  abonnes?: Abonne[];
  onRegisterAgent: (newAgent: Agent) => void;
  onResetPasswordRequest?: (phone: string) => { success: boolean; userNom?: string; error?: string };
}

export default function LoginForm({ 
  onLoginSuccess, 
  agents, 
  abonnes = [], 
  onRegisterAgent,
  onResetPasswordRequest 
}: LoginFormProps) {
  // Let form fields start blank to look like a clean login page
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanPhone = (val: string) => {
    return val.replace(/\s+/g, '');
  };

  const [isNewAccount, setIsNewAccount] = useState(false);
  const [newAccountNom, setNewAccountNom] = useState('');
  const [newAccountRole, setNewAccountRole] = useState<'eboueur' | 'abonne' | 'agent' | 'admin'>('eboueur');

  // Modal for First Login / Temporary Password customization
  const [pendingFirstLoginAgent, setPendingFirstLoginAgent] = useState<Agent | null>(null);
  const [newPersonalPass, setNewPersonalPass] = useState('');
  const [confirmPersonalPass, setConfirmPersonalPass] = useState('');
  const [showNewPassToggle, setShowNewPassToggle] = useState(false);
  const [firstLoginError, setFirstLoginError] = useState<string | null>(null);

  // Modal for Forgot Password
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const checkPhone = cleanPhone(phone);
    if (!checkPhone) {
      setErrorMsg('Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    // 1. Search existing user in agents array
    let found = agents.find(
      (a) => cleanPhone(a.telephone) === checkPhone || a.telephone === checkPhone
    );

    // 2. If not found in agents, check if this telephone belongs to an Abonne registered during recensement
    if (!found && abonnes && abonnes.length > 0) {
      const ab = abonnes.find(
        (a) => cleanPhone(a.telephone_principal) === checkPhone || a.telephone_principal === checkPhone
      );
      if (ab) {
        // Synthesize an Abonne agent profile with default temporary password '12345'
        found = {
          id: 'abonne-' + ab.id,
          nom: ab.nom_complet,
          telephone: ab.telephone_principal,
          role: 'abonne',
          parcelle_id: ab.parcelle_id,
          created_at: ab.created_at || new Date().toISOString(),
          password: '12345',
          isTempPassword: true
        };
        // Register it in system
        onRegisterAgent(found);
      }
    }

    if (found) {
      const userPassword = found.password || '12345';
      if (password !== userPassword) {
        setErrorMsg('Mot de passe incorrect pour cet utilisateur.');
        return;
      }

      // Check if this is first login or has a temporary password ('12345' or isTempPassword)
      if (found.isTempPassword || found.password === '12345') {
        setPendingFirstLoginAgent(found);
        setNewPersonalPass('');
        setConfirmPersonalPass('');
        setFirstLoginError(null);
        return;
      }

      onLoginSuccess(found);
    } else {
      // If new account creation prompt isn't displayed yet
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
        password: password || '12345',
        isTempPassword: false
      };
      
      onRegisterAgent(sessionAgent);
      onLoginSuccess(sessionAgent);
    }
  };

  const handleCustomPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstLoginError(null);

    if (!pendingFirstLoginAgent) return;

    if (newPersonalPass.length < 8) {
      setFirstLoginError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (newPersonalPass !== confirmPersonalPass) {
      setFirstLoginError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    const updatedAgent: Agent = {
      ...pendingFirstLoginAgent,
      password: newPersonalPass,
      isTempPassword: false
    };

    onRegisterAgent(updatedAgent);
    setPendingFirstLoginAgent(null);
    onLoginSuccess(updatedAgent);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    if (!forgotPhone.trim()) {
      setForgotErrorMsg('Veuillez entrer votre numéro de téléphone.');
      return;
    }

    if (onResetPasswordRequest) {
      const res = onResetPasswordRequest(forgotPhone.trim());
      if (res.success) {
        setForgotSuccessMsg(
          `✅ Demande acceptée ! Le mot de passe temporaire par défaut (12345) a été attribué au compte d'abonné "${res.userNom || 'Abonné'}". Vous pouvez dès maintenant vous connecter avec votre numéro et le mot de passe "12345".`
        );
      } else {
        setForgotErrorMsg(res.error || "Aucun compte associé à ce numéro.");
      }
    } else {
      setForgotSuccessMsg(
        "✅ Votre demande a été enregistrée. Votre mot de passe temporaire par défaut est : 12345"
      );
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 bg-[#0A0A0A] text-white">
      <main className="w-full max-w-sm flex flex-col gap-6">
        
        {/* Header / Logo Area */}
        <header className="flex flex-col items-center gap-3 text-center">
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
                  onClick={() => {
                    setForgotPhone(phone);
                    setForgotSuccessMsg(null);
                    setForgotErrorMsg(null);
                    setShowForgotPasswordModal(true);
                  }}
                  className="text-[10px] font-bold text-primary hover:text-white transition-colors cursor-pointer"
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

      </main>

      {/* 🔐 MODAL: First Login / Password Customization (8+ characters) */}
      {pendingFirstLoginAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-3xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">
                  Création de votre Mot de Passe
                </h3>
                <p className="text-xs text-gray-400 font-sans">
                  Première connexion pour : <span className="text-primary font-semibold">{pendingFirstLoginAgent.nom}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-sans bg-[#0D0D0D] p-3 rounded-xl border border-white/5">
              C'est votre première connexion (ou votre mot de passe a été réinitialisé). Pour sécuriser l'accès à votre espace Abonné, veuillez définir un mot de passe personnel comportant au moins <strong className="text-white">8 caractères</strong>.
            </p>

            <form onSubmit={handleCustomPasswordSubmit} className="flex flex-col gap-4">
              {/* New Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                  Nouveau mot de passe (min. 8 caractères)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNewPassToggle ? "text" : "password"}
                    value={newPersonalPass}
                    onChange={(e) => setNewPersonalPass(e.target.value)}
                    placeholder="Au moins 8 caractères"
                    className="w-full h-11 pl-11 pr-10 bg-[#0D0D0D] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassToggle(!showNewPassToggle)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-white"
                  >
                    {showNewPassToggle ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNewPassToggle ? "text" : "password"}
                    value={confirmPersonalPass}
                    onChange={(e) => setConfirmPersonalPass(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    className="w-full h-11 pl-11 pr-3 bg-[#0D0D0D] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-sans"
                    required
                  />
                </div>
              </div>

              {/* Password checks indicators */}
              <div className="flex flex-col gap-1.5 text-xs font-sans">
                <div className={`flex items-center gap-1.5 ${newPersonalPass.length >= 8 ? 'text-[#10b981]' : 'text-gray-500'}`}>
                  <CheckCircle2 size={14} />
                  <span>Au moins 8 caractères ({newPersonalPass.length}/8)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${newPersonalPass && newPersonalPass === confirmPersonalPass ? 'text-[#10b981]' : 'text-gray-500'}`}>
                  <CheckCircle2 size={14} />
                  <span>Mots de passe identiques</span>
                </div>
              </div>

              {firstLoginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold flex items-center gap-2 font-sans">
                  <ShieldAlert size={16} />
                  <span>{firstLoginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={newPersonalPass.length < 8 || newPersonalPass !== confirmPersonalPass}
                className="w-full h-11 mt-2 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Valider et Accéder à mon Espace</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 MODAL: Mot de passe oublié */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-3xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl text-white relative">
            
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">
                  Mot de passe oublié
                </h3>
                <p className="text-xs text-gray-400 font-sans">
                  Réinitialisation du compte Abonné
                </p>
              </div>
            </div>

            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                  Numéro de téléphone de votre compte
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                    <Phone size={16} />
                  </span>
                  <input
                    type="text"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full h-11 pl-11 pr-3 bg-[#0D0D0D] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary font-sans"
                    required
                  />
                </div>
              </div>

              {forgotErrorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold flex items-center gap-2 font-sans">
                  <ShieldAlert size={16} />
                  <span>{forgotErrorMsg}</span>
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="p-3 bg-[#10b981]/15 border border-[#10b981]/30 rounded-xl text-xs text-[#10b981] font-sans leading-relaxed">
                  {forgotSuccessMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="flex-1 h-11 bg-white/5 border border-white/10 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <RefreshCw size={14} />
                  <span>Réinitialiser</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

