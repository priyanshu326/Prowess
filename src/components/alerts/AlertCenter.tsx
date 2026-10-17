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
  Send,
  Clock,
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
  const [activePreviewTab, setActivePreviewTab] = useState<'sms' | 'whatsapp'>('sms');

  // Dynamic Hindi SMS content based on current simulation state
  const smsText = simulation.isActive
    ? `Kisan Saathi: ${location.nameHi} में 72 घंटे में 85mm बारिश व 60km/h हवा का अलर्ट। बुवाई रोकें, नलकूप मोटर AUTO-OFF करें व कटी फसल ढंकें। [Demo Preview]`
    : `Kisan Saathi: Aane wale mausam par nazar rakhein. Khet ki nami aur fasal ki sthiti jaanch kar sinchai ka faisla karein. Yeh demo sandesh hai.`;

  const charCount = smsText.length;
  const timestamp = '17 Oct 2026, 11:30 AM';
  const messageStatus = 'Demo Preview Only';

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
                ? 'हर किसान तक सलाह (Har Kisan Tak Salah)'
                : 'Har Kisan Tak Salah — 2G SMS & Voice Center'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'सीमित इंटरनेट वाले किसानों के लिए 2G एसएमएस, व्हाट्सएप व ऑडियो मार्गदर्शन'
                : '2G SMS, WhatsApp preview, and Web Speech voice assistant for rural reach.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
            Status: {messageStatus}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Assistant & Notification Feed (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              {isHi ? 'डिजिटल आवाज सहायक (Salah Sunen / Voice Assistant):' : 'Voice Assistant (Salah Sunen):'}
            </span>

            {/* Voice Player Box */}
            <div className={`p-4 rounded-xl border mb-4 transition-all ${
              isSpeaking
                ? 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-400 shadow-sm'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSpeaking ? 'bg-emerald-600 text-white animate-pulse' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900">
                      {isHi ? 'सलाह सुनें (Hindi & English Speech Synthesis)' : 'Audio Advisory Player'}
                    </h4>
                    <span className="text-[10px] text-stone-500">
                      Browser Web Speech API • {isHi ? 'हिंदी (hi-IN)' : 'English (en-IN)'}
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
              <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs text-stone-800 italic leading-relaxed mb-3">
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
                    <span>{isHi ? 'सलाह सुनें (Play Audio)' : 'Salah Sunen'}</span>
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

            {/* Notification Feed */}
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

        {/* Right Column: 2G SMS and WhatsApp Simulator (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-stone-600" />
                {isHi ? 'संदेश पूर्वावलोकन (SMS & WhatsApp):' : 'Message Previews:'}
              </span>

              {/* Toggle SMS vs WhatsApp */}
              <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setActivePreviewTab('sms')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activePreviewTab === 'sms' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'}`}
                >
                  2G SMS
                </button>
                <button
                  onClick={() => setActivePreviewTab('whatsapp')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${activePreviewTab === 'whatsapp' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-stone-600'}`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Meta details bar */}
            <div className="flex items-center justify-between text-[10px] text-stone-500 mb-2 px-1">
              <span>भाषा: <strong>{isHi ? 'हिंदी (Unicode)' : 'English'}</strong></span>
              <span>अक्षर संख्या: <strong>{charCount} / 160</strong></span>
              <span>प्राथमिकता: <strong className={simulation.isActive ? 'text-red-600' : 'text-emerald-700'}>{simulation.isActive ? 'CRITICAL' : 'ROUTINE'}</strong></span>
              <span>समय: <strong>{timestamp}</strong></span>
            </div>

            {activePreviewTab === 'sms' ? (
              /* Retro Feature Phone Mockup */
              <div className="bg-stone-900 p-4 rounded-3xl shadow-xl border-4 border-stone-700 max-w-sm mx-auto my-1">
                <div className="w-12 h-1 bg-stone-700 rounded-full mx-auto mb-3" />
                <div className="bg-[#9bb38b] text-[#1a2d18] font-mono p-3 rounded-lg border-2 border-stone-800 shadow-inner text-xs min-h-[140px] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold border-b border-[#7d966e] pb-1 mb-1.5">
                      <span>KISAN-SAATHI</span>
                      <span>17/10 11:30</span>
                    </div>
                    <p className="text-[11px] leading-snug break-words">
                      {smsText}
                    </p>
                  </div>
                  <div className="text-[9px] text-[#4f6443] text-right font-bold pt-1 border-t border-[#7d966e] mt-1">
                    [Status: Demo Preview Only]
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 px-3">
                  <div className="h-4 bg-stone-800 rounded-xs" />
                  <div className="h-4 bg-stone-700 rounded-xs" />
                  <div className="h-4 bg-stone-800 rounded-xs" />
                </div>
              </div>
            ) : (
              /* WhatsApp Chat Bubble Mockup */
              <div className="bg-[#E5DDD5] p-4 rounded-2xl shadow-md border border-stone-300 max-w-sm mx-auto my-1">
                <div className="bg-emerald-800 text-white p-2 rounded-t-xl text-xs font-bold flex items-center justify-between">
                  <span>Kisan Saathi Official Advisory</span>
                  <span className="text-[9px] bg-emerald-700 px-1.5 py-0.5 rounded">Verified</span>
                </div>
                <div className="bg-white p-3 rounded-b-xl shadow-xs text-xs space-y-1.5 text-stone-800">
                  <div className="font-bold text-emerald-800 text-[11px]">🌾 KISAN SAATHI BULLETIN</div>
                  <p className="text-[11px] leading-relaxed">{smsText}</p>
                  <div className="text-[9px] text-stone-400 text-right">
                    11:30 AM ✓✓
                  </div>
                </div>
              </div>
            )}

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
            *अस्वीकरण: वास्तविक एसएमएस वितरण के लिए अनुमोदित एसएमएस गेटवे (CDAC/NIC) आवश्यक है। बिना गेटवे के केवल "Demo Preview Only" प्रदर्शित किया जाता है।
          </div>
        </div>
      </div>
    </div>
  );
};
