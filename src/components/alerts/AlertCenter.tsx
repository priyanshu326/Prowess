import React, { useState } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Share2,
  CheckCircle,
  AlertTriangle,
  Flame,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { AlertNotification, CropConfig, Language, LocationConfig, SimulationState } from '../../types';

interface AlertCenterProps {
  location: LocationConfig;
  crop: CropConfig;
  language: Language;
  simulation: SimulationState;
  notifications: AlertNotification[];
  onSpeakAdvisory: (customText?: string) => void;
  onPauseSpeaking: () => void;
  onStopSpeaking: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  location,
  crop,
  language,
  simulation,
  notifications,
  onSpeakAdvisory,
  onPauseSpeaking,
  onStopSpeaking,
  isSpeaking,
  isPaused,
}) => {
  const isHi = language === 'hi';
  const [copiedSms, setCopiedSms] = useState(false);

  // Dynamic Hindi SMS content based on current simulation state
  const smsText = simulation.isActive
    ? `KISAAN SATHI ALERT: ${location.nameHi} में अगले 72 घंटे में 85mm अतिवृष्टि व 60km/h आंधी की चेतावनी। बुवाई तुरंत रोकें, नलकूप मोटर AUTO-OFF करें व कटी फसल सुरक्षित स्थान पर रखें। - किसान साथी`
    : `KISAAN SATHI ADVISORY: ${location.nameHi} में ${crop.nameHi} हेतु मौसम अनुकूल है। अगले 3 दिन वर्षा नहीं होगी। मृदा में 62% नमी पर्याप्त है, आज अतिरिक्त सिंचाई की जरूरत नहीं। - किसान साथी`;

  const handleCopySms = () => {
    navigator.clipboard.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(smsText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
            <Bell className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'किसान अलर्ट केंद्र — हिंदी वॉइस व 2जी एसएमएस'
                : 'Kisaan Alert Center — Hindi Voice & 2G SMS'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'बिना इंटरनेट वाले साधारण फोन के लिए यूनिकोड एसएमएस और स्थानीय बोली में ऑडियो मार्गदर्शन'
                : 'Web Speech API Hindi voice assistant and 2G feature phone simulator'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          {isHi ? 'वॉइस-फर्स्ट इंटरफेस' : 'Voice-First'}
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hindi Voice Assistant & Audio Controls (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {isHi ? 'हिंदी डिजिटल वॉइस साथी (Browser Web Speech):' : 'Hindi Voice Assistant:'}
            </span>

            {/* Voice Player Box */}
            <div className={`p-4 rounded-xl border mb-4 transition-all ${
              isSpeaking
                ? 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-400 shadow-sm'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSpeaking ? 'bg-emerald-600 text-white animate-pulse' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                      {isHi ? 'दैनिक कृषि परामर्श वाचन (Hindi Speech)' : 'Daily Advisory Audio Player'}
                    </h4>
                    <span className="text-[10px] text-stone-500">
                      Google Noto Hindi Voice • hi-IN Speech Engine
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isSpeaking ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                }`}>
                  {isSpeaking ? (isHi ? 'वाचन सक्रिय' : 'Speaking') : (isHi ? 'तैयार' : 'Ready')}
                </span>
              </div>

              {/* Spoken Text Quote */}
              <div className="p-3 bg-white rounded-lg border border-stone-200/80 text-xs text-stone-800 italic leading-relaxed mb-3">
                "{smsText}"
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {!isSpeaking ? (
                  <button
                    onClick={() => onSpeakAdvisory()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-transform"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isHi ? 'पूरी सलाह सुनें' : 'Play Advisory'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onPauseSpeaking}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>{isPaused ? (isHi ? 'जारी रखें' : 'Resume') : (isHi ? 'रोकें' : 'Pause')}</span>
                    </button>
                    <button
                      onClick={onStopSpeaking}
                      className="px-3 py-2 bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{isHi ? 'बंद करें' : 'Stop'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => onSpeakAdvisory()}
                  className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 cursor-pointer"
                  title="दोबारा सुनें (Replay)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification feed items */}
            <div>
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                {isHi ? 'सक्रिय कृषि सूचनाएं (Live Alert Feed):' : 'Active Alert Feed:'}
              </span>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {notifications.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-950'
                        : alert.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'critical' ? (
                        <Flame className="w-4 h-4 text-red-600 animate-pulse" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{alert.titleHi}</span>
                        <span className="text-[10px] opacity-75">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-0.5">{alert.messageHi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-stone-400 mt-2">
            *ऑडियो वेब स्पीच एपीआई द्वारा स्थानीय रूप से संश्लेषित किया जाता है।
          </div>
        </div>

        {/* Right Column: 2G Feature Phone Simulator & WhatsApp Preview (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-stone-600" />
                {isHi ? '2G फीचर फोन एसएमएस पूर्वावलोकन:' : '2G Feature Phone SMS Simulator:'}
              </span>
              <span className="text-[10px] text-stone-400">
                Unicode SMS 160 Chars
              </span>
            </div>

            {/* Retro Feature Phone Mockup */}
            <div className="bg-stone-900 p-4 rounded-3xl shadow-xl border-4 border-stone-700 max-w-sm mx-auto my-1">
              {/* Phone Earpiece */}
              <div className="w-12 h-1 bg-stone-700 rounded-full mx-auto mb-3" />

              {/* Monochrome / Green LCD Screen */}
              <div className="bg-[#9bb38b] text-[#1a2d18] font-mono p-3 rounded-lg border-2 border-stone-800 shadow-inner text-xs min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-[10px] font-bold border-b border-[#7d966e] pb-1 mb-1.5">
                    <span>KISAAN-SMS</span>
                    <span>17/10 11:05</span>
                  </div>
                  <p className="text-[11px] leading-snug break-words">
                    {smsText}
                  </p>
                </div>
                <div className="text-[9px] text-[#4f6443] text-right font-bold pt-1 border-t border-[#7d966e] mt-1">
                  [OK: RECV] [1/1]
                </div>
              </div>

              {/* Retro Keypad Buttons Accent */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 px-3">
                <div className="h-4 bg-stone-800 rounded-xs" />
                <div className="h-4 bg-stone-700 rounded-xs" />
                <div className="h-4 bg-stone-800 rounded-xs" />
              </div>
            </div>

            {/* Actions for SMS / WhatsApp */}
            <div className="flex items-center justify-center gap-2.5 mt-3">
              <button
                onClick={handleCopySms}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-500" />
                <span>{copiedSms ? (isHi ? 'कॉपी हो गया!' : 'Copied!') : (isHi ? 'एसएमएस कॉपी करें' : 'Copy SMS')}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-3.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isHi ? 'व्हाट्सएप पर भेजें' : 'Share WhatsApp'}</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-stone-100/70 rounded-lg text-[10px] text-stone-500 mt-3">
            *भविष्य की योजना: CDAC अथवा NIC SMS गेटवे के माध्यम से सीधे किसानों के फोन पर पुश संदेश प्रेषण।
          </div>
        </div>
      </div>
    </div>
  );
};
