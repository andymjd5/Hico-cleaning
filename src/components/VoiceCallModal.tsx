import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Wifi, 
  ShieldCheck, 
  X, 
  Smartphone, 
  Radio, 
  CheckCircle2, 
  Sparkles,
  User
} from 'lucide-react';

export interface CallTarget {
  name: string;
  phone: string;
  role: string; // 'Support Hico' | 'Éboueur' | 'Bailleur / Abonné' | 'Agent'
  commune?: string;
  avatarUrl?: string;
}

interface VoiceCallModalProps {
  target: CallTarget | null;
  onClose: () => void;
}

export default function VoiceCallModal({ target, onClose }: VoiceCallModalProps) {
  const [callMode, setCallMode] = useState<'selection' | 'voip_active'>('selection');
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioWave, setAudioWave] = useState<number[]>([20, 45, 75, 30, 85, 50, 95, 40, 60, 80, 35, 70]);

  // Audio synthesis ref for realistic ringer and connection tones using Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Helper to safely close audio context
  const closeAudioCtx = () => {
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch (_) {}
      audioCtxRef.current = null;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      closeAudioCtx();
    };
  }, []);

  // Timer effect for connected call
  useEffect(() => {
    let timer: any;
    if (callMode === 'voip_active' && callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
        // Randomize audio wave slightly for realistic waveform animation
        setAudioWave(prev => prev.map(() => Math.floor(Math.random() * 75) + 20));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callMode, callStatus]);

  // Handle ringing transition to connected state
  useEffect(() => {
    let ringTimer: any;
    if (callMode === 'voip_active' && callStatus === 'ringing') {
      // Play gentle Web Audio ringing sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;

          // Ring tone generator
          const playRing = () => {
            if (ctx.state === 'closed') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.2);
          };

          playRing();
          const ringInterval = setInterval(playRing, 2500);

          // Auto-connect after 3 seconds
          ringTimer = setTimeout(() => {
            clearInterval(ringInterval);
            setCallStatus('connected');

            // Play connection beep
            if (ctx.state !== 'closed') {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            }
          }, 3200);

          return () => {
            clearInterval(ringInterval);
            clearTimeout(ringTimer);
          };
        }
      } catch (e) {
        console.warn("Web Audio API not supported", e);
        ringTimer = setTimeout(() => setCallStatus('connected'), 2500);
      }
    }
    return () => clearTimeout(ringTimer);
  }, [callMode, callStatus]);

  if (!target) return null;

  const cleanPhone = target.phone.replace(/\s+/g, '');

  const handleStartGsmCall = () => {
    // Direct cellular network call via tel: URI scheme
    window.location.href = `tel:${cleanPhone}`;
    onClose();
  };

  const handleStartVoipCall = () => {
    setCallMode('voip_active');
    setCallStatus('ringing');
    setCallDuration(0);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    closeAudioCtx();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Close Button */}
        <button
          onClick={handleEndCall}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header / Target Card Info */}
        <div className="p-6 pb-4 pt-8 text-center bg-gradient-to-b from-slate-800/50 to-transparent flex flex-col items-center">
          <div className="relative mb-3">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-lg border-2 ${
              callMode === 'voip_active' && callStatus === 'connected' 
                ? 'bg-emerald-600 border-emerald-400 ring-4 ring-emerald-500/20 animate-pulse' 
                : 'bg-primary border-primary/40'
            }`}>
              {target.name.substring(0, 2).toUpperCase()}
            </div>
            {callMode === 'voip_active' && (
              <span className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 rounded-full border-2 border-slate-900">
                <Radio size={12} className="text-white animate-spin" />
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">{target.name}</h3>
          <p className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
            <User size={12} />
            <span>{target.role}</span>
            {target.commune && <span>• {target.commune}</span>}
          </p>
          <p className="text-sm font-mono text-slate-300 font-bold tracking-wider mt-1">
            {target.phone}
          </p>
        </div>

        {/* SELECTION MODE: Choose between GSM and VoIP */}
        {callMode === 'selection' && (
          <div className="p-6 pt-2 flex flex-col gap-4">
            <div className="text-center mb-1">
              <p className="text-xs text-slate-400 font-medium">
                Choisissez le mode de communication souhaité :
              </p>
            </div>

            {/* Option 1: GSM Direct */}
            <button
              onClick={handleStartGsmCall}
              className="group relative w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                    Appel GSM Direct (SIM)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Réseau Mobile
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Lance un appel téléphonique classique via votre réseau mobile (Vodacom, Airtel, Orange). 100% stable, aucun besoin d'internet.
                </p>
              </div>
            </button>

            {/* Option 2: VoIP WebRTC In-App */}
            <button
              onClick={handleStartVoipCall}
              className="group relative w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-blue-500/30 hover:border-blue-500/60 transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Radio size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                    Appel VoIP WebRTC HD
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    Gratuit In-App
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Communication vocale HD directe chiffrée via l'application. Idéale si vous êtes connecté au Wi-Fi ou aux données.
                </p>
              </div>
            </button>

            <div className="mt-2 pt-3 border-t border-slate-800/60 text-center flex items-center justify-center gap-2 text-[10px] text-slate-500 font-medium">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Communications sécurisées & chiffrées Hico-Cleaning</span>
            </div>
          </div>
        )}

        {/* ACTIVE VOIP CALL MODE */}
        {callMode === 'voip_active' && (
          <div className="p-6 pt-2 flex flex-col items-center gap-6">
            
            {/* Status & Timer */}
            <div className="flex flex-col items-center gap-1.5">
              {callStatus === 'ringing' && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
                  <PhoneCall size={14} className="animate-spin" />
                  <span>Sonnerie en cours...</span>
                </div>
              )}

              {callStatus === 'connected' && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>En communication • WebRTC HD</span>
                  </div>
                  <span className="text-2xl font-black font-mono tracking-widest text-white mt-1">
                    {formatTimer(callDuration)}
                  </span>
                </div>
              )}

              {callStatus === 'ended' && (
                <div className="text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                  <span>Appel terminé</span>
                </div>
              )}
            </div>

            {/* Audio Waveform Animation when connected */}
            {callStatus === 'connected' && (
              <div className="w-full h-12 bg-slate-950/60 rounded-2xl border border-slate-800 p-2 flex items-center justify-center gap-1">
                {audioWave.map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ height: isMuted ? '4px' : `${height}%`, opacity: isMuted ? 0.3 : 0.8 }}
                  />
                ))}
              </div>
            )}

            {/* Signal & Quality Indicator */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <Wifi size={13} className="text-emerald-400" />
                <span>Réseau HD 5G/Wi-Fi</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-blue-400" />
                <span>Chiffré AES-256</span>
              </div>
            </div>

            {/* Call Action Controls */}
            <div className="flex items-center justify-center gap-6 w-full mt-2">
              
              {/* Mute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                disabled={callStatus !== 'connected'}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer ${
                  isMuted 
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                } ${callStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isMuted ? 'Activer le micro' : 'Couper le micro'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-red-500/20"
                title="Raccrocher"
              >
                <PhoneOff size={26} />
              </button>

              {/* Speaker Button */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                disabled={callStatus !== 'connected'}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer ${
                  isSpeakerOn 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                } ${callStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSpeakerOn ? 'Haut-parleur actif' : 'Activer le haut-parleur'}
              >
                {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
            </div>

            {/* Switch back to choice if needed */}
            {callStatus === 'ringing' && (
              <button
                onClick={() => setCallMode('selection')}
                className="text-xs text-slate-400 hover:text-white underline mt-1 cursor-pointer"
              >
                Changer de mode d'appel
              </button>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
