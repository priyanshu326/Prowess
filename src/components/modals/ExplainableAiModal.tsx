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
              1. बुवाई सुरक्षा स्कोर (Sowing Safety Score 0–100) — Problem 2.1
            </h4>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-300 font-mono text-[11px] text-emerald-900 my-2">
              Sowing Score = (0.35 × मृदा तापमान उपयुक्तता) + (0.40 × वर्षा जोखिम उपयुक्तता) + (0.25 × जड़-नमी उपयुक्तता)
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              प्रत्येक घटक को फसल-विशिष्ट थ्रेशोल्ड द्वारा 0 से 100 में सामान्यीकृत किया जाता है। यदि आगामी 48 घंटे में भारी बारिश (&gt;25mm) का पूर्वानुमान है, तो बीज बहने व सड़ने के जोखिम के कारण वर्षा स्कोर गिरकर 15-35 रह जाता है, जिससे किसान को प्रति एकड़ ~₹2,400 का दोबारा बुवाई (re-sowing) खर्च बचाने की सलाह मिलती है।
            </p>
          </div>

          {/* Section 1B: Harvest Safety Score */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5 mb-1.5">
              <span>🌾</span>
              2. कटाई व दाना गुणवत्ता सुरक्षा स्कोर (Harvest Safety Score 0–100) — Problem 2.1
            </h4>
            <div className="bg-white p-2.5 rounded-lg border border-amber-300 font-mono text-[11px] text-amber-900 my-2">
              Harvest Score = (0.50 × वर्षा रहित शुष्क खिड़की) + (0.30 × आर्द्रता उपयुक्तता &lt;65%) + (0.20 × धूप/सुखाने की अवधि)
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              गीले मौसम में पकी फसल काटने से दाने में नमी &gt;14% हो जाती है, फफूंद लगती है और दानों की चमक (lustre) खराब होती है। इसके कारण मंडी में ₹150–₹300/क्विंटल तक कटौती होती है। 75+ स्कोर सुरक्षित शुष्क खिड़की को प्रमाणित करता है।
            </p>
          </div>

          {/* Section 2: GDD */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5 mb-1.5">
              <Thermometer className="w-4 h-4 text-orange-600" />
              3. ग्रोइंग डिग्री डेज (GDD) व फसल परिपक्वता
            </h4>
            <div className="bg-white p-2 rounded-lg border border-stone-200 font-mono text-[11px] text-stone-800 my-1.5">
              GDD = max(0, ((Tmax + Tmin) / 2) - Tbase)
            </div>
            <p className="text-[11px] text-stone-600">
              {crop.nameHi} का आधार तापमान Tbase = <strong>{crop.baseTempC}°C</strong> है। परिपक्वता हेतु कुल संचयी GDD लगभग <strong>{crop.optimalGddToMaturity}</strong> डिग्री-दिन आवश्यक है। वास्तविक बुवाई तिथि के आधार पर सटीक परिपक्वता खिड़की आंकी जाती है।
            </p>
          </div>

          {/* Section 3: Motor Digital Twin Rules & Problem 2.2/2.3 */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
            <h4 className="font-extrabold text-sm text-blue-950 flex items-center gap-1.5 mb-1.5">
              <Droplets className="w-4 h-4 text-blue-600" />
              4. सॉफ्टवेयर वर्चुअल सॉइल ट्विन व सिंचाई नियम — Problems 2.2 & 2.3
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-700">
              <li><strong>Zero-Field-Hardware:</strong> महंगे इन-खेत IoT सेंसर के बिना ERA5-Land हाइड्रो-मॉडल (0-6cm व 7-28cm) का उपयोग करता है।</li>
              <li><strong>AUTO-OFF ट्रिगर:</strong> यदि जड़ नमी &gt; {crop.optimalRootMoistureMin}% है और आगामी 16 घंटे में वर्षा &gt; 15mm है, तो नलकूप तुरंत बंद करने की सलाह दी जाती है।</li>
              <li><strong>बचत व सुरक्षा:</strong> 350L जल, ₹140–₹427 डीजल/बिजली और 4 घंटे किसान श्रम की बचत के साथ-साथ यूरिया लीचिंग व जड़ गलन की रोकथाम।</li>
            </ul>
          </div>

          {/* Section 4: Mandi Decision & Multi-Channel Comparison (Problem 2.5) */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
            <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5 mb-1.5">
              <CloudRain className="w-4 h-4 text-purple-600" />
              5. बहु-मंडी, ढुलाई व शुद्ध आय (Net In-Hand Realization) — Problem 2.5
            </h4>
            <div className="bg-white p-2.5 rounded-lg border border-purple-200 font-mono text-[11px] text-purple-900 my-2">
              Net In-Hand Rate = सकल मंडी भाव (Gross Price) - ढुलाई खर्च (Transport/q) - गुणवत्ता कटौती (Moisture & Impurity Deduction)
            </div>
            <p className="text-[11px] text-stone-600">
              केवल निकटतम मंडी में बेचने के बजाय, यह इंजन विभिन्न स्थानीय मंडियों (जैसे करनाल ₹2,480 बनाम पानीपत ₹2,520), FPO फार्म-गेट खरीद (+बोनस, शून्य ढुलाई) और कॉर्पोरेट खरीदारों (ITC) की तुलना कर वास्तविक हाथ में आने वाली राशि की गणना करता है।
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
