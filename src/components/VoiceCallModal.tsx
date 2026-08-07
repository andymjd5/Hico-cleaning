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
  Radio, 
  User,
  Activity,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { webrtcCallManager, WebRTCPeerInfo, WebRTCCallState } from '../lib/webrtcManager';

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
  const [callStatus, setCallStatus] = useState<WebRTCCallState>('outgoing_calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEchoTest, setIsEchoTest] = useState(false);
  
  // Real live audio levels from Web Audio Analysers
  const [localLevel, setLocalLevel] = useState(0);
  const [remoteLevel, setRemoteLevel] = useState(0);
  const [audioWave, setAudioWave] = useState<number[]>([20, 35, 50, 65, 80, 45, 60, 75, 40, 55, 30, 20]);
  const [statusMessage, setStatusMessage] = useState<string>('Appel en cours...');

  useEffect(() => {
    if (!target) return;

    // Set current peer info & initiate WebRTC session
    const peer: WebRTCPeerInfo = {
      name: target.name,
      phone: target.phone,
      role: target.role,
      commune: target.commune,
      avatarUrl: target.avatarUrl
    };

    // If we were already in connecting/connected state from an incoming call accept
    const currentState = webrtcCallManager.getCallState();
    if (currentState !== 'connected' && currentState !== 'connecting') {
      webrtcCallManager.startCall(peer);
    } else {
      setCallStatus(currentState);
    }

    // Subscribe to state changes
    const unsubState = webrtcCallManager.onCallStateChange((state, info) => {
      setCallStatus(state);
      if (state === 'outgoing_calling' || state === 'outgoing_ringing') {
        setStatusMessage('Sonnerie du correspondant...');
      } else if (state === 'connecting') {
        setStatusMessage('Négociation audio WebRTC P2P...');
      } else if (state === 'connected') {
        setStatusMessage('Communication WebRTC HD active');
      } else if (state === 'ended') {
        setStatusMessage(info?.reason || 'Appel terminé');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (state === 'error') {
        setStatusMessage(info?.reason || 'Erreur de connexion');
      }
    });

    // Subscribe to live audio wave analysis
    const unsubAudio = webrtcCallManager.onAudioLevel((loc, rem) => {
      setLocalLevel(loc);
      setRemoteLevel(rem);
      
      // Update responsive waveform
      setAudioWave(prev => {
        const activeLevel = Math.max(loc, rem);
        return prev.map((_, i) => {
          const factor = Math.sin((i / 12) * Math.PI) * 0.8 + 0.2;
          const targetHeight = Math.max(12, Math.min(95, Math.round(activeLevel * factor + Math.random() * 15)));
          return targetHeight;
        });
      });
    });

    return () => {
      unsubState();
      unsubAudio();
    };
  }, [target]);

  // Timer effect for connected call
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  if (!target) return null;

  const handleEndCall = () => {
    webrtcCallManager.endCall();
    setCallStatus('ended');
    setStatusMessage('Appel terminé');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleToggleMute = () => {
    const muted = webrtcCallManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleSpeaker = () => {
    const speaker = webrtcCallManager.toggleSpeaker();
    setIsSpeakerOn(speaker);
  };

  const handleToggleEchoTest = () => {
    const next = webrtcCallManager.toggleLocalEcho();
    setIsEchoTest(next);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Close Button */}
        <button
          onClick={handleEndCall}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Fermer"
        >
          <X size={18} />
        </button>

        {/* Header / Target Card Info */}
        <div className="p-6 pb-4 pt-8 text-center bg-gradient-to-b from-slate-800/50 to-transparent flex flex-col items-center">
          <div className="relative mb-3">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl text-white shadow-lg border-2 transition-all ${
              callStatus === 'connected' 
                ? 'bg-emerald-600 border-emerald-400 ring-4 ring-emerald-500/20 animate-pulse scale-105' 
                : 'bg-primary border-primary/40'
            }`}>
              {target.name.substring(0, 2).toUpperCase()}
            </div>
            
            <span className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 rounded-full border-2 border-slate-900 text-white">
              <Radio size={12} className={callStatus === 'connected' ? 'animate-none' : 'animate-spin'} />
            </span>
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

        {/* ACTIVE WEBRTC CALL CONTENT */}
        <div className="p-6 pt-2 flex flex-col items-center gap-5">
          
          {/* Status & Timer */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            {callStatus === 'outgoing_calling' && (
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold bg-blue-500/10 px-3.5 py-1 rounded-full border border-blue-500/20 animate-pulse">
                <Radio size={14} className="animate-spin" />
                <span>Initialisation WebRTC P2P...</span>
              </div>
            )}

            {callStatus === 'outgoing_ringing' && (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
                <PhoneCall size={14} className="animate-bounce" />
                <span>Sonnerie en cours...</span>
              </div>
            )}

            {callStatus === 'connecting' && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20 animate-pulse">
                <Activity size={14} className="animate-spin" />
                <span>Connexion du flux audio...</span>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>En communication • WebRTC HD Opus</span>
                </div>
                <span className="text-2xl font-black font-mono tracking-widest text-white mt-1">
                  {formatTimer(callDuration)}
                </span>
              </div>
            )}

            {callStatus === 'ended' && (
              <div className="text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Real Audio Waveform Animation driven by Web Audio Analyser */}
          <div className="w-full h-14 bg-slate-950/70 rounded-2xl border border-slate-800 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Mic size={10} className={localLevel > 15 ? 'text-emerald-400' : 'text-slate-500'} />
                {isMuted ? 'Micro coupé' : `Micro: ${localLevel}%`}
              </span>
              <span className="font-mono text-emerald-400">
                {callStatus === 'connected' ? '48 kHz • P2P' : 'En attente'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 h-6">
              {audioWave.map((height, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isMuted 
                      ? 'bg-slate-700 h-1' 
                      : callStatus === 'connected'
                        ? 'bg-emerald-400' 
                        : 'bg-blue-400/40 h-2'
                  }`}
                  style={{ 
                    height: isMuted ? '3px' : `${height}%`,
                    opacity: isMuted ? 0.3 : Math.max(0.4, height / 100)
                  }}
                />
              ))}
            </div>
          </div>

          {/* Local Echo / Loopback Test Toggle */}
          {callStatus === 'connected' && (
            <button
              onClick={handleToggleEchoTest}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                isEchoTest 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-2 ring-emerald-500/30' 
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <Headphones size={12} />
              <span>{isEchoTest ? 'Retour écouteur actif (Écho activé)' : 'Tester le retour de ma voix (Écho micro)'}</span>
            </button>
          )}

          {/* Signal & Quality Indicator */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <Wifi size={13} className="text-emerald-400" />
              <span>P2P Direct HD</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-blue-400" />
              <span>STUN / Chiffré AES-256</span>
            </div>
          </div>

          {/* Call Action Controls */}
          <div className="flex items-center justify-center gap-6 w-full mt-1">
            
            {/* Mute Button */}
            <button
              onClick={handleToggleMute}
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
              onClick={handleToggleSpeaker}
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

        </div>

      </div>
    </div>
  );
}
