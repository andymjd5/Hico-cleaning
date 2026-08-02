import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, Headphones, X, MapPin, PhoneCall, ArrowRight, BellRing } from 'lucide-react';

export interface AlertData {
  id: string;
  type: 'poubelle' | 'support' | 'litige';
  title: string;
  subtitle: string;
  reporterName: string;
  reporterPhone?: string;
  parcelleNo?: string;
  avenueName?: string;
  communeName?: string;
  reasonOrMessage?: string;
  timestamp: string;
  rawObject?: any;
}

interface RealtimeAlertModalProps {
  alert: AlertData | null;
  onClose: () => void;
  onNavigateToView: (alert: AlertData) => void;
  onCallReporter?: (phone: string, name: string) => void;
  onPlaySound?: () => void;
}

export const RealtimeAlertModal: React.FC<RealtimeAlertModalProps> = ({
  alert,
  onClose,
  onNavigateToView,
  onCallReporter,
  onPlaySound
}) => {
  useEffect(() => {
    if (alert && onPlaySound) {
      onPlaySound();
    }
  }, [alert, onPlaySound]);

  if (!alert) return null;

  const isPoubelle = alert.type === 'poubelle';
  const isSupport = alert.type === 'support';
  const isLitige = alert.type === 'litige';

  const getHeaderIcon = () => {
    if (isPoubelle) return <Trash2 size={24} className="text-red-400 animate-bounce" />;
    if (isSupport) return <Headphones size={24} className="text-blue-400 animate-pulse" />;
    return <AlertTriangle size={24} className="text-amber-400 animate-ping" />;
  };

  const getBadgeColor = () => {
    if (isPoubelle) return 'bg-red-500/20 text-red-300 border-red-500/40';
    if (isSupport) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  };

  const getHeaderBg = () => {
    if (isPoubelle) return 'from-red-950 via-slate-900 to-slate-950 border-red-500/30';
    if (isSupport) return 'from-blue-950 via-slate-900 to-slate-950 border-blue-500/30';
    return 'from-amber-950 via-slate-900 to-slate-950 border-amber-500/30';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`relative w-full max-w-lg bg-gradient-to-b ${getHeaderBg()} border rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden animate-scale-up text-slate-100`}
      >
        {/* Top glowing accent bar */}
        <div className={`h-2 w-full ${isPoubelle ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-600' : isSupport ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600' : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'} animate-pulse`} />

        {/* Header */}
        <div className="p-5 md:p-6 pb-4 flex items-start justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${getBadgeColor()} shadow-lg flex items-center justify-center shrink-0`}>
              {getHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeColor()} flex items-center gap-1`}>
                  <BellRing size={10} className="animate-spin" />
                  Signalement en temps réel
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(alert.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white mt-1 leading-tight">
                {alert.title}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {alert.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Fermer le pop-up"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 space-y-4">
          
          {/* Signal Reporter Info Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="text-slate-400 uppercase text-[10px] font-black tracking-wider">Abonné / Eboueur concerne</span>
              {alert.reporterPhone && (
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  📞 {alert.reporterPhone}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {alert.reporterName || 'Abonné Inconnu'}
            </div>

            {/* Location if present */}
            {(alert.parcelleNo || alert.avenueName || alert.communeName) && (
              <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                {alert.parcelleNo && (
                  <div>
                    <span className="text-slate-500 text-[9px] block uppercase font-sans">Parcelle</span>
                    <strong className="text-white">N° {alert.parcelleNo}</strong>
                  </div>
                )}
                {alert.avenueName && (
                  <div>
                    <span className="text-slate-500 text-[9px] block uppercase font-sans">Avenue</span>
                    <strong className="text-white truncate block">{alert.avenueName}</strong>
                  </div>
                )}
                {alert.communeName && (
                  <div>
                    <span className="text-slate-500 text-[9px] block uppercase font-sans">Commune</span>
                    <strong className="text-white truncate block">{alert.communeName}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason / Details Message Box */}
          {alert.reasonOrMessage && (
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                💬 Motif & Détails du signalement:
              </span>
              <p className="italic text-slate-100 leading-relaxed font-sans bg-white/5 p-2.5 rounded-xl border border-white/5">
                "{alert.reasonOrMessage}"
              </p>
            </div>
          )}

        </div>

        {/* Footer Action Buttons */}
        <div className="p-5 md:p-6 pt-3 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          {alert.reporterPhone && onCallReporter ? (
            <button
              type="button"
              onClick={() => onCallReporter(alert.reporterPhone!, alert.reporterName)}
              className="px-3.5 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <PhoneCall size={14} className="text-emerald-400" />
              <span>Appeler le signalant</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fermer
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Ignorer
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigateToView(alert);
                onClose();
              }}
              className={`px-4 py-2.5 ${isPoubelle ? 'bg-red-600 hover:bg-red-500' : isSupport ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500'} text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95`}
            >
              <span>{isPoubelle ? 'Voir sur la Carte GPS' : isSupport ? 'Traiter la Réclamation' : 'Consulter le Litige'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RealtimeAlertModal;
