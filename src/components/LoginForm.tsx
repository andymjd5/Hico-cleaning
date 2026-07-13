import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Phone, Lock } from 'lucide-react';
import { Agent } from '../types';
import { INITIAL_AGENTS } from '../initialData';

interface LoginFormProps {
  onLoginSuccess: (agent: Agent) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  // Pre-fill with Jean Malonga's mockup credentials for wonderful testing UX!
  const [phone, setPhone] = useState('06 12 34 56 78');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDemoWarning, setIsDemoWarning] = useState(false);

  const cleanPhone = (val: string) => {
    return val.replace(/\s+/g, '');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const checkPhone = cleanPhone(phone);
    if (!checkPhone) {
      setErrorMsg('Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    // Intercept demo special accounts
    if (checkPhone === '0821111111' || checkPhone === '0821111111') {
      onLoginSuccess({
        id: 'abonne-demo',
        nom: 'Papa Mavula',
        telephone: '0821111111',
        role: 'abonne',
        created_at: new Date().toISOString()
      });
      return;
    }

    if (checkPhone === '0892222222' || checkPhone === '0892222222') {
      onLoginSuccess({
        id: 'eboueur-demo',
        nom: 'Chauffeur Kabeya',
        telephone: '0892222222',
        role: 'eboueur',
        created_at: new Date().toISOString()
      });
      return;
    }

    if (checkPhone === '0600000000') {
      onLoginSuccess({
        id: 'admin-1',
        nom: 'Hico Admin',
        telephone: '0600000000',
        role: 'admin',
        created_at: new Date().toISOString()
      });
      return;
    }

    // Find among initial agents
    const found = INITIAL_AGENTS.find(
      (a) => cleanPhone(a.telephone) === checkPhone || a.telephone === checkPhone
    );

    if (found) {
      onLoginSuccess(found);
    } else {
      // Create a professional agent profile dynamically for any custom key/phone entered by the tester!
      const safePhone = phone.trim();
      const formatSuffix = safePhone.substring(Math.max(0, safePhone.length - 4));
      const dynamicName = `Agent Recenseur ${formatSuffix || 'Demo'}`;
      
      const sessionAgent: Agent = {
        id: 'agent-' + Math.random().toString(36).substring(2, 11),
        nom: dynamicName,
        telephone: safePhone,
        role: 'agent',
        created_at: new Date().toISOString()
      };
      
      onLoginSuccess(sessionAgent);
    }
  };

  const handleQuickConnect = (demoPhone: string) => {
    setPhone(demoPhone);
    setPassword('password');
    // We can directly invoke the login with a timeout or just let them click click connect
    setTimeout(() => {
      const checkPhone = cleanPhone(demoPhone);
      if (checkPhone === '0821111111') {
        onLoginSuccess({
          id: 'abonne-demo',
          nom: 'Papa Mavula',
          telephone: '0821111111',
          role: 'abonne',
          created_at: new Date().toISOString()
        });
      } else if (checkPhone === '0892222222') {
        onLoginSuccess({
          id: 'eboueur-demo',
          nom: 'Chauffeur Kabeya',
          telephone: '0892222222',
          role: 'eboueur',
          created_at: new Date().toISOString()
        });
      } else if (checkPhone === '0600000000') {
        onLoginSuccess({
          id: 'admin-1',
          nom: 'Hico Admin',
          telephone: '0600000000',
          role: 'admin',
          created_at: new Date().toISOString()
        });
      } else {
        onLoginSuccess({
          id: 'agent-1',
          nom: 'Jean Malonga',
          telephone: '0612345678',
          role: 'agent',
          created_at: new Date().toISOString()
        });
      }
    }, 100);
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

        {/* Quick Connection Switcher Panel */}
        <div className="bg-[#141414] rounded-2xl border border-white/10 p-4 flex flex-col gap-2.5 shadow-md">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10b981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            Accès Rapide Démo (4 rôles) :
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickConnect('0600000000')}
              className="py-2 px-1 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl flex flex-col gap-0.5 transition-all text-white cursor-pointer"
            >
              <span className="text-[10px] font-black leading-tight">1. Administrateur</span>
              <span className="text-[8px] text-gray-400 font-medium">Hico Admin</span>
            </button>
            <button
              onClick={() => handleQuickConnect('0612345678')}
              className="py-2 px-1 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl flex flex-col gap-0.5 transition-all text-white cursor-pointer"
            >
              <span className="text-[10px] font-black leading-tight">2. Agent Recenseur</span>
              <span className="text-[8px] text-gray-400 font-medium">Jean Malonga</span>
            </button>
            <button
              onClick={() => handleQuickConnect('0821111111')}
              className="py-2 px-1 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl flex flex-col gap-0.5 transition-all text-white cursor-pointer"
            >
              <span className="text-[10px] font-black leading-tight text-primary">3. Abonné (Bailleur)</span>
              <span className="text-[8px] text-gray-400 font-medium">Papa Mavula</span>
            </button>
            <button
              onClick={() => handleQuickConnect('0892222222')}
              className="py-2 px-1 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl flex flex-col gap-0.5 transition-all text-white cursor-pointer"
            >
              <span className="text-[10px] font-black leading-tight text-indigo-400">4. Agent Éboueur</span>
              <span className="text-[8px] text-gray-400 font-medium">Chauffeur Kabeya</span>
            </button>
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
              Se connecter
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
