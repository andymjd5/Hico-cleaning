import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, User, Radio, ShieldCheck, Volume2 } from 'lucide-react';
import { webrtcCallManager, WebRTCPeerInfo } from '../lib/webrtcManager';

interface IncomingCallModalProps {
  onAccept: (caller: WebRTCPeerInfo) => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ onAccept, onDecline }: IncomingCallModalProps) {
  const [incomingCaller, setIncomingCaller] = useState<WebRTCPeerInfo | null>(null);
  const [callId, setCallId] = useState<string | null>(null);

  useEffect(() => {
    // Listen to real incoming WebRTC calls
    const unsub = webrtcCallManager.onIncomingCall((receivedCallId, caller) => {
      setCallId(receivedCallId);
      setIncomingCaller(caller);
    });

    const unsubState = webrtcCallManager.onCallStateChange((state) => {
      if (state === 'idle' || state === 'ended') {
        setIncomingCaller(null);
        setCallId(null);
      }
    });

    return () => {
      unsub();
      unsubState();
    };
  }, []);

  if (!incomingCaller) return null;

  const handleAccept = () => {
    const caller = incomingCaller;
    webrtcCallManager.acceptIncomingCall();
    setIncomingCaller(null);
    onAccept(caller);
  };

  const handleDecline = () => {
    webrtcCallManager.declineCall();
    setIncomingCaller(null);
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl shadow-emerald-950/50 flex flex-col items-center text-center gap-5 text-white animate-in zoom-in-95 duration-200">
        
        {/* Animated Radar Pulse */}
        <div className="relative flex items-center justify-center mt-2">
          <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          <div className="absolute w-24 h-24 rounded-full bg-emerald-500/30 animate-pulse" />
          
          <div className="relative w-20 h-20 rounded-full bg-emerald-600 border-2 border-emerald-300 text-white flex items-center justify-center font-black text-2xl shadow-xl ring-4 ring-emerald-500/30">
            {incomingCaller.name.substring(0, 2).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 p-1.5 bg-emerald-400 rounded-full border-2 border-slate-900 text-slate-950">
            <Radio size={14} className="animate-spin" />
          </span>
        </div>

        {/* Incoming Details */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider">
            <PhoneCall size={12} className="animate-bounce" />
            <span>Appel Vocal WebRTC Entrant</span>
          </div>

          <h3 className="text-xl font-black text-white mt-1 tracking-tight">
            {incomingCaller.name}
          </h3>

          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
            <User size={12} />
            <span>{incomingCaller.role}</span>
            {incomingCaller.commune && <span>• {incomingCaller.commune}</span>}
          </p>

          <p className="text-sm font-mono text-slate-300 font-bold tracking-wider mt-0.5">
            {incomingCaller.phone}
          </p>
        </div>

        {/* Security & HD Badge */}
        <div className="flex items-center gap-3 text-[10px] text-slate-400 bg-slate-800/60 py-1.5 px-3 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-1">
            <Volume2 size={12} className="text-emerald-400" />
            <span>Audio HD Opus</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-blue-400" />
            <span>Chiffré P2P</span>
          </div>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div className="flex items-center justify-center gap-8 w-full mt-2">
          
          {/* Decline */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-red-500/20"
              title="Refuser l'appel"
            >
              <PhoneOff size={26} />
            </button>
            <span className="text-[11px] font-bold text-slate-400">Refuser</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-emerald-500/40 hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-emerald-400/40 animate-pulse"
              title="Décrocher et parler"
            >
              <Phone size={28} className="animate-bounce" />
            </button>
            <span className="text-[11px] font-extrabold text-emerald-400">Décrocher</span>
          </div>

        </div>

      </div>
    </div>
  );
}
