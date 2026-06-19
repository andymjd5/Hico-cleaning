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

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 bg-[#0A0A0A] text-white">
      <main className="w-full max-w-sm flex flex-col gap-8">
        
        {/* Header / Logo Area */}
        <header className="flex flex-col items-center gap-4 text-center">
          {/* Circular Checkmark Logo inspired by Image 2 - now styled as high-end glowing Bento mark */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#141414] border border-white/10 shadow-lg transition-transform duration-300 hover:scale-105">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
              Hico-Cleaning
            </h1>
            <p className="text-sm font-semibold tracking-wider text-primary uppercase mt-1 font-mono">
              Portail Agent de Recensement
            </p>
          </div>
        </header>

        {/* Login Form Container */}
        <div className="bg-[#141414] rounded-3xl border border-white/10 p-6 flex flex-col gap-6 shadow-2xl">
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            
            {/* Phone Field */}
            <div className="flex flex-col gap-1.5">
              <label 
                className="text-xs font-bold uppercase tracking-widest text-gray-400 font-sans" 
                htmlFor="phone"
              >
                Numéro de téléphone
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Phone size={18} />
                </span>
                <input 
                  type="text"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full h-12 pl-11 pr-3 bg-[#0D0D0D] border rounded-xl text-white text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans ${
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
                  className="text-xs font-bold uppercase tracking-widest text-gray-400 font-sans" 
                  htmlFor="password"
                >
                  Mot de passe
                </label>
                <button 
                  type="button" 
                  onClick={() => alert(`Pour la démo, utilisez le mot de passe: "password"`)}
                  className="text-xs font-bold text-primary hover:text-white transition-colors"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full h-12 pl-11 pr-10 bg-[#0D0D0D] border rounded-xl text-white text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans ${
                    errorMsg ? 'border-error ring-1 ring-error' : 'border-white/10'
                  }`}
                  placeholder="••••••••"
                />
                <button 
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-white transition-colors" 
                  onClick={() => setShowPassword(!showPassword)} 
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Error Message with dynamic show/hide */}
              {errorMsg && (
                <p className="text-xs text-error mt-2 flex items-center gap-1.5 font-semibold animate-fade-in bg-error-container/10 border border-error/20 p-2.5 rounded-lg">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Submit Action Button */}
            <button 
              type="submit"
              className="w-full h-12 bg-white text-black font-bold text-base rounded-xl mt-3 hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              Se connecter
              <LogIn size={18} />
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
