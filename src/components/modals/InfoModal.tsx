import React, { useState } from 'react';
import { HelpCircle, X, Shield, BookOpen, Users, Lock, ChevronRight } from 'lucide-react';
import { Language } from '../../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;
  const isHi = language === 'hi';
  const [activeSection, setActiveSection] = useState<'about' | 'methodology' | 'privacy' | 'faq'>('about');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <HelpCircle className="w-5 h-5 text-emerald-700" />
            </span>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                {isHi ? 'किसान साथी — संदर्भ, विधि व सुरक्षा' : 'Kisaan Sathi — About & FAQ'}
              </h3>
              <p className="text-xs text-stone-500">
                IIIT Delhi Hackathon • Theme: Agriculture & Rural Development
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 mb-4 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveSection('about')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'about' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'परियोजना परिचय' : 'About'}
          </button>
          <button
            onClick={() => setActiveSection('methodology')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'methodology' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'डेटा स्रोत व विधि' : 'Methodology'}
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'privacy' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'किसान डेटा गोपनीयता' : 'Privacy & Safety'}
          </button>
          <button
            onClick={() => setActiveSection('faq')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'faq' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'FAQ'}
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs text-stone-700 space-y-3 leading-relaxed">
          {activeSection === 'about' && (
            <div className="space-y-3">
              <h4 className="font-bold text-stone-900 text-sm">
                "बीज से बाजार तक, हर फैसले में किसान का साथी"
              </h4>
              <p>
                <strong>किसान साथी (Kisaan Sathi)</strong> एक शून्य-हार्डवेयर, वॉइस-फर्स्ट कृषि निर्णय-सहायता मंच है। इसे IIIT दिल्ली 24-घंटे हैकाथॉन में कृषि एवं ग्रामीण विकास थीम के तहत 4-सदस्यीय छात्र टीम द्वारा विकसित किया गया है।
              </p>
              <p>
                पारंपरिक IoT आधारित कृषि समाधानों में महंगे सेंसर लगाने पड़ते हैं, जिनका रखरखाव छोटे किसानों के लिए कठिन होता है। किसान साथी किसी नए फील्ड हार्डवेयर के बिना, खुले उपग्रह मौसम पूर्वानुमान (Open-Meteo ECMWF/GFS), ऐतिहासिक जलवायु पुनर्विश्लेषण (ERA5-Land), एआई विजन डायग्नोसिस (Gemini Flash), और एगमार्कनेट मंडी डेटा को जोड़कर बुवाई से लेकर बिक्री तक सटीक सलाह प्रदान करता है।
              </p>
            </div>
          )}

          {activeSection === 'methodology' && (
            <div className="space-y-3">
              <h4 className="font-bold text-stone-900 text-sm">डेटा स्रोत व प्रामाणिकता</h4>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li><strong>मौसम पूर्वानुमान:</strong> Open-Meteo Global Forecasting Model (ECMWF & GFS)।</li>
                <li><strong>जलवायु आधार रेखा:</strong> ERA5-Land 10-वर्षीय जलवायु रिकॉर्ड (2016–2025)।</li>
                <li><strong>मृदा नमी अनुमान:</strong> 0-7 सेमी सतही एवं 7-28 सेमी जड़ क्षेत्र का जलवैज्ञानिक मॉडल।</li>
                <li><strong>फसल डॉक्टर:</strong> Google Gemini 3.8 Flash मल्टीमॉडल विजन मॉडल + KVK पादप रोग विशेषज्ञ नियम।</li>
                <li><strong>मंडी भाव:</strong> भारत सरकार एगमार्कनेट (Agmarknet) एवं e-NAM अधिकृत मॉडल भाव।</li>
              </ul>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-3">
              <h4 className="font-bold text-stone-900 text-sm">किसान सुरक्षा व गोपनीयता प्रतिज्ञा</h4>
              <p>
                1. <strong>कोई व्यक्तिगत फोन नंबर सार्वजनिक नहीं:</strong> किसान पूल में केवल गाँव व स्वैच्छिक नाम दिखाया जाता है; संपर्क विवरण निजी रहते हैं।
              </p>
              <p>
                2. <strong>कोई अनधिकृत रासायनिक प्रिस्क्रिप्शन नहीं:</strong> एआई प्रणाली कभी भी कीटनाशकों की घातक खुराक स्वतः नहीं लिखती; हमेशा स्थानीय KVK वैज्ञानिकों से संस्तुति लेने का स्पष्ट निर्देश देती है।
              </p>
              <p>
                3. <strong>सुरक्षित क्लाउड बैकएंड:</strong> सभी संवेदनशील API कुंजियाँ सर्वर-साइड सुरक्षित हैं और कभी भी ब्राउज़र में उजागर नहीं होती हैं।
              </p>
            </div>
          )}

          {activeSection === 'faq' && (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="font-bold text-stone-900 mb-0.5">प्र: क्या किसान साथी के लिए खेत में कोई सेंसर लगाना होगा?</div>
                <div className="text-[11px] text-stone-600">उ: नहीं! यह पूरी तरह "शून्य फील्ड हार्डवेयर" प्रणाली है जो खुले वायुमंडलीय व भू-उपग्रह डेटा से कार्य करती है।</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <div className="font-bold text-stone-900 mb-0.5">प्र: "चरम मौसम सिमुलेटर" क्या करता है?</div>
                <div className="text-[11px] text-stone-600">उ: यह जजों और उपयोगकर्ताओं को 85 मिमी बेमौसम आंधी का तात्कालिक तनाव-परीक्षण (Stress-Test) दिखाता है, जिससे सभी 6 मॉड्यूल एक साथ आपातकालीन स्थिति में समन्वयित होते हैं।</div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-stone-100 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            {isHi ? 'बंद करें (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
