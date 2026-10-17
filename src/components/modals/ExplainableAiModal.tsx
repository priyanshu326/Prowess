import React from 'react';
import { Sparkles, X, Calculator, ShieldCheck, Thermometer, Droplets, CloudRain } from 'lucide-react';
import { CropConfig, Language } from '../../types';

interface ExplainableAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: CropConfig;
  language: Language;
}

export const ExplainableAiModal: React.FC<ExplainableAiModalProps> = ({
  isOpen,
  onClose,
  crop,
  language,
}) => {
  if (!isOpen) return null;
  const isHi = language === 'hi';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-scaleIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                {isHi ? 'किसान साथी निर्णय मॉडल — व्याख्यात्मक एआई (Explainable AI)' : 'Explainable AI Decision Logic'}
              </h3>
              <p className="text-xs text-stone-500">
                {isHi ? 'बिना ब्लैक-बॉक्स के पूर्ण पारदर्शी सूत्र व थ्रेशोल्ड' : 'Transparent, deterministic agronomic rules and formulas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-stone-700">
          {/* Section 1: Sowing Safety Score */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5 mb-1.5">
              <Calculator className="w-4 h-4 text-emerald-700" />
              1. बुवाई सुरक्षा स्कोर (Sowing Safety Score 0–100)
            </h4>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-300 font-mono text-[11px] text-emerald-900 my-2">
              Score = (0.35 × मृदा तापमान उपयुक्तता) + (0.40 × वर्षा जोखिम उपयुक्तता) + (0.25 × जड़-नमी उपयुक्तता)
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              प्रत्येक घटक को फसल-विशिष्ट थ्रेशोल्ड द्वारा 0 से 100 में सामान्यीकृत (Normalize) किया जाता है।
              उदाहरण के लिए {crop.nameHi} के लिए इष्टतम तापमान {crop.optimalSoilTempMin}°C–{crop.optimalSoilTempMax}°C और जड़ नमी {crop.optimalRootMoistureMin}%–{crop.optimalRootMoistureMax}% है। यदि आगामी 48 घंटे में भारी बारिश (&gt;25mm) है तो वर्षा घटक स्कोर गिरकर 15-35 रह जाता है।
            </p>
          </div>

          {/* Section 2: GDD */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5 mb-1.5">
              <Thermometer className="w-4 h-4 text-orange-600" />
              2. ग्रोइंग डिग्री डेज (GDD) व फसल परिपक्वता
            </h4>
            <div className="bg-white p-2 rounded-lg border border-stone-200 font-mono text-[11px] text-stone-800 my-1.5">
              GDD = max(0, ((Tmax + Tmin) / 2) - Tbase)
            </div>
            <p className="text-[11px] text-stone-600">
              {crop.nameHi} का आधार तापमान Tbase = <strong>{crop.baseTempC}°C</strong> है। परिपक्वता हेतु कुल संचयी GDD लगभग <strong>{crop.optimalGddToMaturity}</strong> डिग्री-दिन आवश्यक है। वास्तविक बुवाई तिथि के आधार पर सटीक परिपक्वता खिड़की (Maturity Window) आंकी जाती है।
            </p>
          </div>

          {/* Section 3: Motor Digital Twin Rules */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5 mb-1.5">
              <Droplets className="w-4 h-4 text-blue-600" />
              3. स्मार्ट सिंचाई डिजिटल ट्विन निर्णय नियम
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600">
              <li>यदि जड़ क्षेत्र की नमी &gt; {crop.optimalRootMoistureMin}% है और अगले 16 घंटे में वर्षा पूर्वानुमान &gt; 15mm है → <strong>AUTO-OFF RECOMMENDED</strong> ट्रिगर होता है।</li>
              <li>यदि मिट्टी संतृप्त (&gt; {crop.optimalRootMoistureMax}%) है → जड़ गलन से बचाव हेतु अतिरिक्त सिंचाई रोकी जाती है।</li>
              <li>सॉफ्टवेयर डिजिटल ट्विन खेत में वास्तविक मोटर को बदलने का दावा नहीं करता; उत्पादन में GSM/IoT स्विच आवश्यक होगा।</li>
            </ul>
          </div>

          {/* Section 4: Mandi Decision Matrix */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5 mb-1.5">
              <CloudRain className="w-4 h-4 text-purple-600" />
              4. मंडी निर्णय मैट्रिक्स ("अभी बेचूं या रुकूं?")
            </h4>
            <p className="text-[11px] text-stone-600">
              इनपुट: वर्तमान मंडी भाव, 7-दिवसीय मूल्य प्रवृत्ति (+/- %), फसल की शेल्फ लाइफ ({crop.perishabilityDays} दिन), और खुले भंडारण पर मौसम का जोखिम। यदि भारी बारिश की आशंका है और भंडारण गीला होने का खतरा है, तो गुणवत्ता में गिरावट से बचने के लिए तुरंत सुरक्षित बिक्री (Sell Now) की सिफारिश की जाती है।
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            {isHi ? 'समझ गया (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
