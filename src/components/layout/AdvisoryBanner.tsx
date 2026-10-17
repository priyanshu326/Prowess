import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Calendar,
  Droplets,
  TrendingUp,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { CropConfig, Language, LocationConfig, SimulationState } from '../../types';

interface AdvisoryBannerProps {
  location: LocationConfig;
  crop: CropConfig;
  language: Language;
  simulation: SimulationState;
  sowingSafetyScore: number;
  motorState: string;
  mandiRecommendation: string;
  onSpeak: () => void;
  isSpeaking: boolean;
}

export const AdvisoryBanner: React.FC<AdvisoryBannerProps> = ({
  location,
  crop,
  language,
  simulation,
  sowingSafetyScore,
  motorState,
  mandiRecommendation,
  onSpeak,
  isSpeaking,
}) => {
  const isHi = language === 'hi';

  if (simulation.isActive) {
    return (
      <section
        aria-label="Simulation Alert"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-amber-700 text-white shadow-xl p-4 sm:p-6 mb-6 border-2 border-red-400"
      >
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-900/60 rounded-xl text-amber-300 border border-red-400/40 shrink-0">
              <Flame className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-red-700">
                  {isHi ? 'चरम मौसम चेतावनी (सिंथेटिक टेस्ट)' : 'EXTREME WEATHER ALERT (SIMULATION)'}
                </span>
                <span className="text-xs text-red-100 font-medium">
                  {isHi ? `${location.nameHi} • ${crop.nameHi}` : `${location.nameEn} • ${crop.nameEn}`}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white mb-1.5 leading-snug">
                {isHi
                  ? 'आगामी 72 घंटों में 85 मिमी भारी बारिश व 60 किमी/घंटा तेज आंधी का पूर्वानुमान!'
                  : '85mm Heavy Rainfall & 60km/h Gales Forecast Over Next 72 Hours!'}
              </h2>
              <p className="text-xs sm:text-sm text-red-100 max-w-3xl leading-relaxed">
                {isHi
                  ? 'तत्काल सिफारिश: बुवाई तुरंत स्थगित करें। नलकूप/मोटर को स्वतः बंद (AUTO-OFF) किया गया है। कटी हुई फसल या खुले में रखी उपज को जलभराव से बचाने हेतु तिरपाल से ढंकें या तुरंत सुरक्षित स्थान पर भेजें।'
                  : 'Immediate Recommendation: Postpone sowing immediately. Motor digital twin switched to AUTO-OFF. Cover or immediately dispatch harvested produce to prevent soaking in open yards.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              onClick={onSpeak}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md ${
                isSpeaking
                  ? 'bg-amber-300 text-stone-900 animate-pulse'
                  : 'bg-white text-red-700 hover:bg-red-50'
              }`}
            >
              <Volume2 className="w-4 h-4 text-red-600" />
              <span>{isSpeaking ? (isHi ? 'आवाज चल रही है...' : 'Speaking...') : isHi ? 'चेतावनी सुनें' : 'Listen Alert'}</span>
            </button>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-red-100">
              <div className="bg-red-800/60 rounded-lg p-1.5 border border-red-500/40">
                <div>बुवाई स्कोर</div>
                <div className="text-xs text-amber-200 font-extrabold">{sowingSafetyScore}/100</div>
              </div>
              <div className="bg-red-800/60 rounded-lg p-1.5 border border-red-500/40">
                <div>मोटर स्थिति</div>
                <div className="text-xs text-amber-200 font-extrabold">AUTO-OFF</div>
              </div>
              <div className="bg-red-800/60 rounded-lg p-1.5 border border-red-500/40">
                <div>मंडी निर्णय</div>
                <div className="text-xs text-amber-200 font-extrabold">तुरंत बेचें</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Normal live state
  return (
    <section
      aria-label="Daily Agricultural Advisory"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 text-white shadow-lg p-4 sm:p-6 mb-6 border border-emerald-700/50"
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-emerald-700/50 rounded-xl text-emerald-200 border border-emerald-500/30 shrink-0">
            <ShieldCheck className="w-7 h-7 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                {isHi ? 'दैनिक कृषि निर्णय बुलेटिन' : 'DAILY AGRI DECISION BULLETIN'}
              </span>
              <span className="text-xs text-emerald-200">
                {isHi ? `${location.nameHi} • ${crop.nameHi}` : `${location.nameEn} • ${crop.nameEn}`}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1.5 leading-snug">
              {isHi
                ? `${crop.nameHi} के लिए मौसम अनुकूल | बुवाई सुरक्षा सूचकांक: ${sowingSafetyScore}/100`
                : `Optimal Conditions for ${crop.nameEn} | Sowing Safety Score: ${sowingSafetyScore}/100`}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-3xl leading-relaxed">
              {isHi
                ? 'आगामी 3 दिन वर्षा रहित रहने की संभावना है। मिट्टी की 7-28 सेमी गहराई में पर्याप्त नमी (62%) विद्यमान है। आज अतिरिक्त नलकूप सिंचाई की आवश्यकता नहीं है।'
                : 'Clear conditions forecast for next 3 days. Active root zone retains adequate 62% moisture. Irrigation pump can be paused to conserve power and water.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          <button
            onClick={onSpeak}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md ${
              isSpeaking
                ? 'bg-amber-400 text-stone-900 ring-2 ring-white animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-950" />
            <span>{isSpeaking ? (isHi ? 'आवाज चल रही है...' : 'Speaking...') : isHi ? 'सलाह सुनें (Hindi Voice)' : 'Play Voice Advisory'}</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold text-emerald-100">
            <div className="bg-emerald-800/60 rounded-lg p-1.5 border border-emerald-600/30">
              <span className="block opacity-80">{isHi ? 'बुवाई' : 'Sowing'}</span>
              <span className="text-xs text-emerald-300 font-bold">{isHi ? 'अनुकूल' : 'Optimal'}</span>
            </div>
            <div className="bg-emerald-800/60 rounded-lg p-1.5 border border-emerald-600/30">
              <span className="block opacity-80">{isHi ? 'सिंचाई' : 'Irrigation'}</span>
              <span className="text-xs text-emerald-300 font-bold">{isHi ? 'स्थगित' : 'Pause'}</span>
            </div>
            <div className="bg-emerald-800/60 rounded-lg p-1.5 border border-emerald-600/30">
              <span className="block opacity-80">{isHi ? 'मंडी' : 'Mandi'}</span>
              <span className="text-xs text-emerald-300 font-bold">{isHi ? 'प्रतीक्षा' : 'Hold'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
