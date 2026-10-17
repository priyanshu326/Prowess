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
  const [activeSection, setActiveSection] = useState<'about' | 'problems' | 'methodology' | 'privacy' | 'faq'>('problems');

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
                कृषि निर्णय सहायता • 6 मुख्य समस्याएं एवं समाधान (Problems 2.1 – 2.6)
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
            onClick={() => setActiveSection('problems')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeSection === 'problems' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? '🎯 6 मुख्य समस्याएं व समाधान' : '🎯 6 Core Problems'}
          </button>
          <button
            onClick={() => setActiveSection('about')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeSection === 'about' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'परियोजना परिचय' : 'About'}
          </button>
          <button
            onClick={() => setActiveSection('methodology')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeSection === 'methodology' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'डेटा स्रोत व विधि' : 'Methodology'}
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeSection === 'privacy' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'किसान डेटा गोपनीयता' : 'Privacy & Safety'}
          </button>
          <button
            onClick={() => setActiveSection('faq')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeSection === 'faq' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isHi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'FAQ'}
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs text-stone-700 space-y-3 leading-relaxed">
          {activeSection === 'problems' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-950 font-medium">
                <strong>किसान साथी का मिशन:</strong> भारतीय किसानों के सम्मुख आने वाली 6 वास्तविक जमीनी समस्याओं का शून्य-हार्डवेयर, सॉफ्टवेयर-आधारित, वॉइस-फर्स्ट समाधान।
              </div>

              {/* Problem 2.1 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🌱</span>
                  <span>Problem 2.1: अनिश्चित बुवाई एवं कटाई (Uncertain Sowing & Harvesting)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> किसान पारंपरिक अनुभव और मानसून के शुरुआती दिनों पर भरोसा करते हैं। विलंबित मानसून या बेमौसम आंधी इस अनुभव को अप्रभावी बना देती है। भारी बारिश से ठीक पहले बुवाई करने पर बीज बह जाता है या सड़ जाता है (दोबारा बुवाई खर्च), तथा गीले मौसम में कटाई से दाने में नमी व फफूंद से मंडी भाव कट जाता है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान:</strong> 14-दिवसीय बुवाई एवं कटाई सुरक्षा स्कोर (0-100), वर्षा जोखिम खिड़की, दाना गुणवत्ता संरक्षण चेतावनी, और दोबारा बुवाई खर्च बचत कैलकुलेटर।
                </div>
              </div>

              {/* Problem 2.2 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>📡</span>
                  <span>Problem 2.2: सीमित फील्ड मॉनिटरिंग व IoT बाधाएं (Limited Access to Field Monitoring)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> भौतिक IoT प्रणालियां मूल्यवान हैं, किंतु वे खरीद, स्थापना, कैलिब्रेशन, नियमित रखरखाव और ग्रामीण कनेक्टिविटी की वास्तविक लागत व बाधाएं लाती हैं; साथ ही उन्हें धूल, अत्यधिक गर्मी व अनियमित बिजली में टिकना होता है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान (Zero-Field-Hardware):</strong> बिना किसी हार्डवेयर के ERA5-Land उपग्रह पुनर्विश्लेषण द्वारा 0-6 सेमी व 7-28 सेमी गहराई में मृदा नमी का सटीक आभासी अनुमान (Virtual Soil Twin)।
                </div>
              </div>

              {/* Problem 2.3 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>💧</span>
                  <span>Problem 2.3: अकुशल सिंचाई व संसाधन बर्बादी (Inefficient Irrigation)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> बारिश से ठीक पहले पानी देने या मिट्टी व फसल की अवस्था समझे बिना सिंचाई करने से पानी, बिजली/डीजल और किसान का शारीरिक श्रम व्यर्थ होता है। अति-सिंचाई से यूरिया व पोषक तत्वों का रिसाव (Nutrient Leaching) होता है और जड़ गलन रोग बढ़ता है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान:</strong> 16-घंटे वर्षा-पूर्वानुमान आधारित <strong>AUTO-OFF</strong> सिफारिश, फसल चरण-आधारित नमी लक्ष्य, यूरिया लीचिंग चेतावनी, और 350L जल व ₹140-₹427 डीजल/बिजली व 4 घंटे श्रम बचत संगणक।
                </div>
              </div>

              {/* Problem 2.4 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🔬</span>
                  <span>Problem 2.4: देर से रोग का पता चलना (Late Disease Detection)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> रोग पत्तियों पर लक्षण दिखने से पहले ही खेत में स्थापित हो जाते हैं। किसान तुरंत विशेषज्ञ तक नहीं पहुंच पाते और अक्सर स्थानीय दुकानदार की सलाह या अनुमान पर निर्भर रहते हैं, जिससे गलत दवा व विलंब का जोखिम होता है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान:</strong> 48-घंटे मौसम-आधारित पूर्व-चेतावनी रडार (लक्षण दिखने से पहले अलर्ट), Gemini 3.8 Flash AI फोटो विजन जांच, और अधिकृत KVK वैज्ञानिक निर्देशिका व किसान कॉल सेंटर (1800-180-1551) त्वरित संपर्क।
                </div>
              </div>

              {/* Problem 2.5 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>Problem 2.5: बाजार व मंडी अनिश्चितता (Market Uncertainty)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> किसानों के पास स्थानीय मंडी भाव, ट्रैक्टर ढुलाई खर्च, गुणवत्ता मानक (नमी/सफाई) और संभावित खरीदारों की तुलना करने का कोई साझा मंच नहीं होता। इसके अभाव में बिक्री अक्सर बिना सोचे निकटतम मंडी में हो जाती है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान:</strong> बहु-मंडी, ढुलाई व खरीदार तुलना मैट्रिक्स (Mandi vs FPO vs Corporate), "अभी बेचें या 5 दिन रुकें" मौसम-भाव निर्णय इंजन, और किसान पूल (FPO Aggregation) से सामूहिक लॉजिस्टिक्स।
                </div>
              </div>

              {/* Problem 2.6 */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="font-extrabold text-stone-900 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>📢</span>
                  <span>Problem 2.6: डिजिटल पहुंच व साक्षरता (Digital Accessibility)</span>
                </div>
                <p className="text-[11px] text-stone-600 mb-1.5">
                  <strong>चुनौती:</strong> कई कृषि ऐप्स उच्च गति इंटरनेट, महंगे स्मार्टफोन और अंग्रेजी डैशबोर्ड पढ़ने की क्षमता मान लेते हैं। ग्रामीण किसानों के लिए यह बहुत बड़ी रुकावट है।
                </p>
                <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200">
                  <strong>समाधान:</strong> वॉइस-फर्स्ट हिंदी वाचन (Web Speech API), सरल किसान दृश्य (5 बड़े कार्ड व ट्रैफिक-लाइट संकेत लाल/पीला/हरा), और 2G/धीमे इंटरनेट हेतु लो-बैंडविड्थ मोड।
                </div>
              </div>
            </div>
          )}

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
