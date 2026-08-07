import React, { useEffect } from 'react';
import { Bell, MapPin, AlertTriangle, Headphones, X, ArrowRight } from 'lucide-react';

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

  // Message court, précis et direct
  const locationText = [
    alert.parcelleNo ? `Parcelle N° ${alert.parcelleNo}` : '',
    alert.avenueName ? `Av. ${alert.avenueName}` : '',
    alert.communeName || ''
  ].filter(Boolean).join(', ');

  const getTitle = () => {
    if (isPoubelle) return 'Alerte Poubelle';
    if (isSupport) return 'Message Support';
    if (isLitige) return 'Alerte Litige';
    return alert.title || 'Nouvelle Alerte';
  };

  const getShortMessage = () => {
    if (isPoubelle) {
      return locationText 
        ? `Poubelle pleine signalée à : ${locationText}.`
        : 'Un ramassage a été signalé par un abonné.';
    }
    if (isLitige) {
      return `Litige signalé par ${alert.reporterName || 'un abonné'} (${alert.communeName || 'Kinshasa'}).`;
    }
    if (isSupport) {
      return alert.reasonOrMessage 
        ? `« ${alert.reasonOrMessage.slice(0, 65)}${alert.reasonOrMessage.length > 65 ? '...' : ''} »`
        : `Message reçu de ${alert.reporterName || 'un utilisateur'}.`;
    }
    return alert.subtitle || 'Une alerte a été enregistrée.';
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="modal_realtime_alert_overlay">
      <div 
        className="relative w-full max-w-sm bg-surface border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up text-on-surface p-5 flex flex-col gap-3.5"
        id="modal_realtime_alert_card"
      >
        {/* En-tête court avec icône et bouton fermer */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isPoubelle ? 'bg-red-500/15 border-red-500/30 text-red-400' :
              isSupport ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
              'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}>
              {isPoubelle && <Bell size={18} className="animate-bounce" />}
              {isSupport && <Headphones size={18} />}
              {isLitige && <AlertTriangle size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface leading-tight">
                {getTitle()}
              </h3>
              <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                {new Date(alert.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn_close_alert_x"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-variant/40 transition-all cursor-pointer"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message court et lisible */}
        <div className="bg-surface-variant/40 border border-outline-variant/50 rounded-xl p-3 text-xs leading-relaxed text-on-surface flex items-start gap-2">
          {isPoubelle && <MapPin size={14} className="text-primary shrink-0 mt-0.5" />}
          <span className="font-medium text-on-surface">
            {getShortMessage()}
          </span>
        </div>

        {/* Boutons d'action simples */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            id="btn_close_alert_modal"
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-surface-variant/60 hover:bg-surface-variant text-on-surface-variant rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          >
            Fermer
          </button>
          <button
            type="button"
            id="btn_view_alert_target"
            onClick={() => {
              onNavigateToView(alert);
              onClose();
            }}
            className="flex-1 py-2 px-3 bg-primary hover:opacity-90 text-on-primary rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span>{isPoubelle ? 'Voir la carte' : isSupport ? 'Voir ticket' : 'Consulter'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default RealtimeAlertModal;
