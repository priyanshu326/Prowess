/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/layout/Header';
import { AiChatAssistant } from './components/chat/AiChatAssistant';
import {
  CalendarDayAdvisory,
  CropConfig,
  CurrentWeather,
  Language,
  LocationConfig,
  SoilTwinState,
  CropDiagnosisResult,
} from './types';
import { SUPPORTED_LOCATIONS, CROP_CONFIGS } from './utils/cropConfig';
import { DEMO_MANDI_DATA, SAMPLE_CROP_IMAGES, KVK_DIRECTORY } from './data/demoData';
import { fetchLiveSoil, fetchLiveWeather, analyzeCropPhoto } from './services/apiClient';
import {
  Sun,
  CloudRain,
  Droplets,
  Wind,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  PhoneCall,
  Power,
  RotateCcw,
  Sparkles,
  Camera,
  Upload,
  TrendingUp,
  DollarSign,
  Users,
  Sprout,
  ShieldCheck,
  ChevronRight,
  Info,
  Bot,
  Mic,
} from 'lucide-react';

export default function App() {
  // 1. Core Selection State
  const [selectedLocation, setSelectedLocation] = useState<LocationConfig>(SUPPORTED_LOCATIONS[0]); // Karnal
  const [selectedCrop, setSelectedCrop] = useState<CropConfig>(CROP_CONFIGS.wheat);
  const [language, setLanguage] = useState<Language>('hi');
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'irrigation' | 'sowing' | 'mandi' | 'doctor' | 'pool'>('all');

  // AI Chatbot State (Left Narrow Assistant)
  const [isChatbotCollapsed, setIsChatbotCollapsed] = useState<boolean>(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);

  // 2. Weather State
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather>({
    temperatureC: 26,
    apparentTempC: 27,
    tempMinC: 18,
    tempMaxC: 29,
    relativeHumidity: 58,
    windSpeedKmh: 12,
    windDirectionDeg: 240,
    precipitationMm: 0.0,
    weatherCode: 1,
    weatherDescriptionEn: 'Mainly clear and sunny',
    weatherDescriptionHi: 'साफ मौसम व खिली धूप',
  });

  const [calendarDays, setCalendarDays] = useState<CalendarDayAdvisory[]>([]);

  // 3. Soil & Irrigation State
  const [soilState, setSoilState] = useState<SoilTwinState>({
    shallowMoisturePct: 54,
    rootZoneMoisturePct: 62,
    shallowTempC: 22.8,
    rootZoneTempC: 21.6,
    moistureStatus: 'optimal',
    statusTextHi: 'जड़ क्षेत्र में पर्याप्त नमी',
    irrigationRecommendation: 'delay',
    irrigationReasonHi: 'जड़ क्षेत्र में पर्याप्त नमी (62%) है। अगले 48 घंटे में वर्षा नहीं है, आज सिंचाई स्थगित रखें।',
    motorMode: 'simulated',
    motorState: 'SIMULATED_OFF',
    motorAutoTriggered: false,
    pumpFlowRateLph: 25000,
    plannedHours: 4,
    fuelConsumptionLph: 1.2,
    dieselPriceInr: 89,
    estimatedLitersSaved: 10000,
    estimatedInrSaved: 356,
  });

  // 4. Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 5. Mandi Calculator State
  const [calcQuintals, setCalcQuintals] = useState<number>(50);

  // 6. Crop Doctor State
  const [selectedSampleImage, setSelectedSampleImage] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<CropDiagnosisResult | null>(null);

  // 7. Kisan Pool State
  const [poolQuintals, setPoolQuintals] = useState<number>(85);
  const [hasContributed, setHasContributed] = useState<boolean>(false);

  const isHi = language === 'hi';

  // Fetch live weather & soil on mount or location change
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const weatherRes = await fetchLiveWeather(
        selectedLocation.latitude,
        selectedLocation.longitude
      );

      if (isMounted && weatherRes && weatherRes.success) {
        setCurrentWeather(weatherRes.current);
        if (weatherRes.forecast14Days) {
          setCalendarDays(weatherRes.forecast14Days.slice(0, 7));
        }
      }

      const soilRes = await fetchLiveSoil(
        selectedLocation.latitude,
        selectedLocation.longitude
      );

      if (isMounted && soilRes && soilRes.success) {
        setSoilState((prev) => ({
          ...prev,
          shallowMoisturePct: soilRes.shallowMoisturePct,
          rootZoneMoisturePct: soilRes.rootZoneMoisturePct,
          shallowTempC: soilRes.shallowTempC,
          rootZoneTempC: soilRes.rootZoneTempC,
        }));
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  // Derived Mandi Data
  const currentMandiRecord = useMemo(() => {
    const locKey = selectedLocation.id === 'delhi' ? 'delhi' : 'karnal';
    return (
      DEMO_MANDI_DATA[locKey]?.[selectedCrop.id] ||
      DEMO_MANDI_DATA.karnal.wheat
    );
  }, [selectedLocation, selectedCrop]);

  // Read advisory aloud using Web Speech API
  const handleSpeak = useCallback((customText?: string) => {
    if (!('speechSynthesis' in window)) {
      alert(isHi ? 'आपके फोन में बोलकर सुनाने की सुविधा उपलब्ध नहीं है।' : 'Speech synthesis not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak =
      customText ||
      (isHi
        ? `राम-राम किसान भाई! ${selectedLocation.nameHi} में ${selectedCrop.nameHi} के लिए आज मौसम साफ है। तापमान ${currentWeather.temperatureC} डिग्री सेल्सियस है। जमीन में 62 प्रतिशत पर्याप्त नमी है, इसलिए आज नलकूप चलाने की कोई जरूरत नहीं है। ऐसा करने से आपका लगभग साढ़े तीन सौ रुपये का डीजल बचेगा। बुवाई के लिए यह समय पूरी तरह सुरक्षित है। मंडी में भाव ₹${currentMandiRecord.modalPriceInr} प्रति क्विंटल चल रहा है। अधिक जानकारी के लिए नीचे दिए गए विकल्पों को देखें।`
        : `Welcome farmer friend! Today in ${selectedLocation.nameEn}, weather is clear for ${selectedCrop.nameEn}. Temperature is ${currentWeather.temperatureC} degree celsius. Soil has 62 percent adequate moisture, so no irrigation is needed today, saving about 350 rupees of fuel. It is an optimal window for sowing. Mandi price is ₹${currentMandiRecord.modalPriceInr} per quintal.`);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isHi ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find((v) =>
      isHi ? v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi') : v.lang.startsWith('en')
    );
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, isHi, selectedLocation, selectedCrop, currentWeather, currentMandiRecord]);

  // Quick Diagnosis Test
  const handleTestCropSample = async (sample: (typeof SAMPLE_CROP_IMAGES)[0]) => {
    setSelectedSampleImage(sample.previewUrl);
    setIsDiagnosing(true);
    setActiveDiagnosis(null);

    try {
      const res = await analyzeCropPhoto(
        sample.previewUrl,
        'image/jpeg',
        selectedCrop.id,
        sample.descriptionHi,
        selectedLocation.nameEn
      );
      const diagnosis = res.diagnosis || sample.fallbackDiagnosis;
      setActiveDiagnosis(diagnosis);
      if (isHi) {
        handleSpeak(`जांच रिपोर्ट: इस पौधे में ${diagnosis.possibleIssueHi || diagnosis.possibleIssue} के लक्षण पाए गए हैं। तुरंत रोकथाम के उपाय देखें।`);
      }
    } catch (_e) {
      setActiveDiagnosis(sample.fallbackDiagnosis);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedSampleImage(base64);
      setIsDiagnosing(true);
      setActiveDiagnosis(null);

      try {
        const res = await analyzeCropPhoto(
          base64,
          file.type || 'image/jpeg',
          selectedCrop.id,
          'किसान द्वारा भेजी गई पत्ती की तस्वीर',
          selectedLocation.nameEn
        );
        setActiveDiagnosis(res.diagnosis);
      } catch (_e) {
        setActiveDiagnosis(SAMPLE_CROP_IMAGES[0].fallbackDiagnosis);
      } finally {
        setIsDiagnosing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle Tubewell Motor
  const toggleMotor = () => {
    setSoilState((prev) => {
      const isCurrentlyRunning = prev.motorState === 'SIMULATED_ON';
      return {
        ...prev,
        motorState: isCurrentlyRunning ? 'SIMULATED_OFF' : 'SIMULATED_ON',
      };
    });
  };

  // Add quintals to pool
  const handleAddToPool = (qtl: number) => {
    setPoolQuintals((prev) => Math.min(100, prev + qtl));
    setHasContributed(true);
  };

  // Nearest KVK
  const nearestKvk = useMemo(() => {
    return KVK_DIRECTORY.find((k) => k.location.toLowerCase().includes(selectedLocation.id)) || KVK_DIRECTORY[0];
  }, [selectedLocation]);

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-[#142A1E] flex flex-col font-sans selection:bg-emerald-200">
      {/* 1. Ultra-Clean & Simple Header */}
      <Header
        locations={SUPPORTED_LOCATIONS}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
        cropConfigs={CROP_CONFIGS}
        selectedCrop={selectedCrop}
        onSelectCrop={setSelectedCrop}
        language={language}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'hi' ? 'en' : 'hi'))}
        onSpeakAdvisory={() => handleSpeak()}
        isSpeaking={isSpeaking}
        onToggleChatbot={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsMobileChatOpen((prev) => !prev);
          } else {
            setIsChatbotCollapsed((prev) => !prev);
          }
        }}
        isChatbotOpen={!isChatbotCollapsed || isMobileChatOpen}
      />

      {/* 2. Main Layout Container: Dashboard Content + Right Corner AI Assistant */}
      <div className="flex-1 flex flex-row w-full max-w-[1440px] mx-auto items-start relative">
        {/* Main Dashboard Content (Left / Center) */}
        <main className="flex-1 min-w-0 px-3 sm:px-6 py-4 sm:py-6 space-y-6">

        
        {/* HERO CARD: आज का मुख्य फैसला (Today's Key Farm Verdict) */}
        <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-700/50 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-amber-400 text-stone-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {isHi ? 'आज की मुख्य सलाह' : 'Today’s Verdict'}
                </span>
                <span className="text-emerald-100 text-xs sm:text-sm font-semibold">
                  📍 {isHi ? selectedLocation.nameHi : selectedLocation.nameEn} • {selectedCrop.emoji} {isHi ? selectedCrop.nameHi : selectedCrop.nameEn}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {isHi ? 'राम-राम किसान भाई! आज खेत का मुख्य हाल' : 'Hello Farmer Friend! Today’s Farm Brief'}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl">
                {isHi
                  ? 'मौसम साफ रहेगा, जमीन में भरपूर नमी है इसलिए नलकूप चलाने की जरूरत नहीं है। बुवाई का सही समय है।'
                  : 'Clear weather expected with sufficient soil moisture. No irrigation needed today. Ideal window for sowing.'}
              </p>
            </div>

            {/* Audio Button on Banner */}
            <button
              onClick={() => handleSpeak()}
              className={`w-full md:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl font-black text-sm sm:text-base cursor-pointer shadow-lg active:scale-95 transition-all shrink-0 ${
                isSpeaking
                  ? 'bg-amber-300 text-stone-950 ring-4 ring-amber-400/50 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-emerald-900'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5 text-stone-950" />
                  <span>{isHi ? 'बोलना बंद करें' : 'Stop Audio'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-emerald-700" />
                  <span>{isHi ? '📢 सलाह बोलकर सुनें' : '📢 Listen in Voice'}</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Big Highlights Grid */}
          <div className="mt-5 pt-4 border-t border-emerald-700/60 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Weather */}
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold">
                <Sun className="w-4 h-4 text-amber-300" />
                <span>{isHi ? 'आज का मौसम' : 'Weather'}</span>
              </div>
              <div className="text-lg font-black text-white mt-1">
                {currentWeather.temperatureC}°C • {isHi ? 'साफ धूप' : 'Sunny'}
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {isHi ? 'बारिश: 0 मिमी (कोई नहीं)' : 'Rain: 0 mm'}
              </div>
            </div>

            {/* 2. Irrigation */}
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold">
                <Droplets className="w-4 h-4 text-cyan-300" />
                <span>{isHi ? 'सिंचाई फैसला' : 'Irrigation'}</span>
              </div>
              <div className="text-lg font-black text-white mt-1">
                {isHi ? 'पानी न दें (रुकें)' : 'Hold Water'}
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {isHi ? 'जमीन में 62% नमी (पर्याप्त)' : 'Moisture 62% (Good)'}
              </div>
            </div>

            {/* 3. Sowing */}
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold">
                <Sprout className="w-4 h-4 text-emerald-300" />
                <span>{isHi ? 'बुवाई / कटाई' : 'Sowing Safety'}</span>
              </div>
              <div className="text-lg font-black text-emerald-300 mt-1">
                {isHi ? 'उत्तम व सुरक्षित' : 'Safe Window'}
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {isHi ? 'स्कोर: 92/100 (अनुकूल)' : 'Score: 92/100'}
              </div>
            </div>

            {/* 4. Mandi */}
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold">
                <TrendingUp className="w-4 h-4 text-amber-300" />
                <span>{isHi ? 'मंडी भाव' : 'Mandi Rate'}</span>
              </div>
              <div className="text-lg font-black text-amber-300 mt-1">
                ₹{currentMandiRecord.modalPriceInr}
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {isHi ? '₹/क्विंटल (+3.4% तेज)' : 'per Qtl (+3.4% up)'}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Simple Tab Bar (No jargon, 1-click easy view) */}
        <nav aria-label="Sections" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', labelHi: 'सब एक साथ देखें', labelEn: 'All Sections', icon: '📋' },
            { id: 'weather', labelHi: 'मौसम (7 दिन)', labelEn: 'Weather (7 Days)', icon: '🌤️' },
            { id: 'irrigation', labelHi: 'सिंचाई व मोटर', labelEn: 'Irrigation & Pump', icon: '💧' },
            { id: 'sowing', labelHi: 'बुवाई व कटाई', labelEn: 'Sowing & Harvest', icon: '🌱' },
            { id: 'mandi', labelHi: 'मंडी भाव व कमाई', labelEn: 'Mandi Rates', icon: '💰' },
            { id: 'doctor', labelHi: 'फसल डॉक्टर', labelEn: 'Crop Doctor', icon: '📸' },
            { id: 'pool', labelHi: 'किसान समूह', labelEn: 'Kisan Pool', icon: '🤝' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-stone-700 border border-stone-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{isHi ? tab.labelHi : tab.labelEn}</span>
              </button>
            );
          })}
        </nav>

        {/* 4. SECTIONS CONTAINER */}
        <div className="space-y-6">

          {/* SECTION 1: मौसम और 7 दिन का पूर्वानुमान (WEATHER) */}
          {(activeTab === 'all' || activeTab === 'weather') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                    🌤️
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'मौसम और 7 दिन का हाल' : '7-Day Weather & Field Forecast'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {isHi ? `${selectedLocation.nameHi} का मौसम` : `Weather for ${selectedLocation.nameEn}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                    {isHi ? 'खुला आसमान' : 'Clear Skies'}
                  </span>
                </div>
              </div>

              {/* 7-Day Forecast Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
                {(calendarDays.length > 0 ? calendarDays : [
                  { dayOfWeekHi: 'आज (सोम)', dayOfWeekEn: 'Today', tempMaxC: 28, tempMinC: 18, rainProbabilityPct: 5, expectedRainMm: 0, statusLabelHi: 'साफ धूप' },
                  { dayOfWeekHi: 'कल (मंगल)', dayOfWeekEn: 'Tue', tempMaxC: 29, tempMinC: 19, rainProbabilityPct: 10, expectedRainMm: 0, statusLabelHi: 'खिली धूप' },
                  { dayOfWeekHi: 'बुधवार', dayOfWeekEn: 'Wed', tempMaxC: 28, tempMinC: 18, rainProbabilityPct: 15, expectedRainMm: 0, statusLabelHi: 'हल्के बादल' },
                  { dayOfWeekHi: 'गुरुवार', dayOfWeekEn: 'Thu', tempMaxC: 27, tempMinC: 17, rainProbabilityPct: 5, expectedRainMm: 0, statusLabelHi: 'साफ मौसम' },
                  { dayOfWeekHi: 'शुक्रवार', dayOfWeekEn: 'Fri', tempMaxC: 28, tempMinC: 18, rainProbabilityPct: 5, expectedRainMm: 0, statusLabelHi: 'खिली धूप' },
                  { dayOfWeekHi: 'शनिवार', dayOfWeekEn: 'Sat', tempMaxC: 29, tempMinC: 19, rainProbabilityPct: 10, expectedRainMm: 0, statusLabelHi: 'साफ आसमान' },
                  { dayOfWeekHi: 'रविवार', dayOfWeekEn: 'Sun', tempMaxC: 30, tempMinC: 20, rainProbabilityPct: 10, expectedRainMm: 0, statusLabelHi: 'धूप खिली रहेगी' },
                ]).map((day, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-3 border text-center transition-all ${
                      idx === 0
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-700">
                      {isHi ? (day as any).dayOfWeekHi || 'दिन' : (day as any).dayOfWeekEn || 'Day'}
                    </div>
                    <div className="my-1.5 text-2xl">
                      {(day as any).rainProbabilityPct > 40 ? '🌧️' : (day as any).rainProbabilityPct > 20 ? '⛅' : '☀️'}
                    </div>
                    <div className="font-extrabold text-stone-900 text-sm">
                      {day.tempMaxC}° <span className="text-xs font-normal text-stone-500">/ {day.tempMinC}°</span>
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800 mt-1">
                      {isHi ? `${day.rainProbabilityPct}% बारिश` : `${day.rainProbabilityPct}% rain`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Weather practical advisory box */}
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-950">
                <span className="text-lg">💡</span>
                <div>
                  <span className="font-bold">
                    {isHi ? 'किसान मित्र सुझाव: ' : 'Farmer Tip: '}
                  </span>
                  <span>
                    {isHi
                      ? 'अगले 7 दिनों में तेज बारिश की कोई संभावना नहीं है। यूरिया या खाद डालने व कीटनाशक छिड़काव के लिए यह सप्ताह श्रेष्ठ है।'
                      : 'No rain expected for the next 7 days. Excellent window for fertilizer application and pest management.'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: सिंचाई व मोटर नियंत्रण (SMART IRRIGATION & WATER) */}
          {(activeTab === 'all' || activeTab === 'irrigation') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-lg">
                    💧
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'स्मार्ट सिंचाई व पानी की बचत' : 'Smart Irrigation & Water Savings'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {isHi ? 'जमीन की नमी के आधार पर सही सलाह' : 'Based on actual root-zone soil moisture'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {isHi ? '₹356 डीजल की बचत' : '₹356 Diesel Saved'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Moisture Gauge & Verdict */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span>{isHi ? 'जमीन में वर्तमान नमी (Soil Moisture)' : 'Current Soil Moisture'}</span>
                    <span className="text-sm font-black text-emerald-700">{soilState.rootZoneMoisturePct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, soilState.rootZoneMoisturePct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>{isHi ? 'सूखी (<35%)' : 'Dry (<35%)'}</span>
                    <span className="font-bold text-emerald-700">{isHi ? 'पर्याप्त (45-70%)' : 'Optimal (45-70%)'}</span>
                    <span>{isHi ? 'अति गीली (>75%)' : 'Saturated (>75%)'}</span>
                  </div>

                  <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-950 font-medium">
                    <span className="font-bold text-emerald-900 block mb-0.5">
                      {isHi ? '✅ फैसला: आज नलकूप न चलाएं' : '✅ Verdict: Hold Tubewell Today'}
                    </span>
                    {isHi
                      ? 'मिट्टी की गहराई में 62% नमी मौजूद है। यदि आज पानी दिया तो खाद बह जाएगी और डीजल/बिजली व्यर्थ होगी।'
                      : 'Root zone retains 62% moisture. Irrigation today would cause nutrient leaching and waste diesel.'}
                  </div>
                </div>

                {/* Tubewell Pump Control & Savings */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-bold text-stone-700 mb-1">
                      {isHi ? 'नलकूप / मोटर की स्थिति:' : 'Tubewell Pump State:'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${soilState.motorState === 'SIMULATED_ON' ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
                        <span className="font-extrabold text-stone-900 text-sm">
                          {soilState.motorState === 'SIMULATED_ON'
                            ? (isHi ? 'मोटर चालू है' : 'Pump Running')
                            : (isHi ? 'मोटर बंद है (सुरक्षित)' : 'Pump Off (Recommended)')}
                        </span>
                      </div>

                      <button
                        onClick={toggleMotor}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-xs ${
                          soilState.motorState === 'SIMULATED_ON'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>
                          {soilState.motorState === 'SIMULATED_ON'
                            ? (isHi ? 'मोटर बंद करें' : 'Turn Off Pump')
                            : (isHi ? 'मोटर चालू करें' : 'Turn On Pump')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Savings Calculator Summary */}
                  <div className="bg-white rounded-xl p-3 border border-stone-200 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-[11px] text-stone-500 font-semibold">{isHi ? 'पानी की बचत' : 'Water Saved'}</div>
                      <div className="text-base font-black text-cyan-700">~10,000 L</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-stone-500 font-semibold">{isHi ? 'अनुमानित बचत' : 'Money Saved'}</div>
                      <div className="text-base font-black text-emerald-700">₹356</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: बुवाई और कटाई सुरक्षा (SOWING & HARVEST INTELLIGENCE) */}
          {(activeTab === 'all' || activeTab === 'sowing') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                    🌱
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'बुवाई व कटाई जोखिम जांच' : 'Sowing & Harvest Safety Intelligence'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {isHi ? `${selectedCrop.nameHi} के लिए सुरक्षित खिड़की` : `Safe window for ${selectedCrop.nameEn}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-emerald-100 text-emerald-900 font-black px-3 py-1 rounded-full border border-emerald-300">
                    {isHi ? 'स्कोर: 92/100 (सुरक्षित)' : 'Score: 92/100 (Safe)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Factor 1: Temperature */}
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isHi ? 'मिट्टी का तापमान' : 'Soil Temperature'}</span>
                  </div>
                  <div className="text-base font-extrabold text-stone-900 mt-1">21.6°C</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {isHi ? 'अंकुरण के लिए श्रेष्ठ (18°C - 24°C)' : 'Optimal for germination'}
                  </div>
                </div>

                {/* Factor 2: Seed Washout Risk */}
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isHi ? 'बीज बहने का खतरा' : 'Seed Washout Risk'}</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">
                    {isHi ? '0% (बिल्कुल नहीं)' : '0% (Nil)'}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {isHi ? 'अगले 3 दिन भारी बारिश नहीं' : 'No heavy rain expected'}
                  </div>
                </div>

                {/* Factor 3: Harvest & Drying */}
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isHi ? 'फसल कटाई व सुखाई' : 'Harvest & Drying'}</span>
                  </div>
                  <div className="text-base font-extrabold text-stone-900 mt-1">
                    {isHi ? '5 दिन सूखा मौसम' : '5 Days Dry'}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {isHi ? 'दाना सुखाने के लिए धूप अनुकूल' : 'Ideal sun for grain drying'}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-xs text-emerald-950 font-medium">
                <span className="font-bold text-emerald-900">
                  {isHi ? 'निष्कर्ष: ' : 'Conclusion: '}
                </span>
                {isHi
                  ? `आप अभी ${selectedCrop.nameHi} की बुवाई बेझिझक कर सकते हैं। मौसम व जमीन दोनों फसल के पूर्ण अनुकूल हैं।`
                  : `You can proceed with ${selectedCrop.nameEn} sowing with confidence. Weather and soil conditions are optimal.`}
              </div>
            </section>
          )}

          {/* SECTION 4: मंडी भाव और मुनाफा कैलकुलेटर (MANDI RATES & EARNINGS) */}
          {(activeTab === 'all' || activeTab === 'mandi') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                    💰
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'आज का मंडी भाव व कमाई कैलकुलेटर' : 'Today’s Mandi Rate & Revenue Calculator'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {currentMandiRecord.mandiName} • {isHi ? 'ताजा भाव' : 'Live Arrival'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    +3.4% {isHi ? 'तेज' : 'Up'}
                  </span>
                </div>
              </div>

              {/* Price Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200">
                  <div className="text-xs font-bold text-stone-600">{isHi ? 'मॉडल भाव (औसत)' : 'Modal Price'}</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">₹{currentMandiRecord.modalPriceInr}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{isHi ? 'प्रति क्विंटल' : 'per Quintal'}</div>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
                  <div className="text-xs font-bold text-stone-600">{isHi ? 'न्यूनतम व उच्चतम भाव' : 'Min / Max Price'}</div>
                  <div className="text-xl font-black text-stone-800 mt-1">
                    ₹{currentMandiRecord.minPriceInr} - ₹{currentMandiRecord.maxPriceInr}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{isHi ? 'गुणवत्ता के आधार पर' : 'based on quality'}</div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800">{isHi ? 'सरकारी न्यूनतम समर्थन मूल्य (MSP)' : 'Government MSP'}</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">₹2,275</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    {isHi ? 'मंडी में MSP से ऊपर भाव मिल रहा है' : 'Market is trading above MSP'}
                  </div>
                </div>
              </div>

              {/* Interactive Quick Quintal Calculator */}
              <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label htmlFor="quintals-input" className="text-xs sm:text-sm font-bold text-stone-800">
                    {isHi ? '📊 आपके पास कितना अनाज (क्विंटल) है?' : '📊 Enter your crop quantity (Quintals):'}
                  </label>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50, 100].map((q) => (
                      <button
                        key={q}
                        onClick={() => setCalcQuintals(q)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          calcQuintals === q
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {q} Qtl
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="quintals-input"
                    aria-label={isHi ? 'अनाज की मात्रा क्विंटल में' : 'Crop quantity in quintals'}
                    type="number"
                    min="1"
                    max="1000"
                    value={calcQuintals}
                    onChange={(e) => setCalcQuintals(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 p-2.5 rounded-xl border-2 border-emerald-700 bg-white font-black text-base text-stone-900 text-center"
                  />
                  <span className="text-xs sm:text-sm font-bold text-stone-600">{isHi ? 'क्विंटल' : 'Quintals'}</span>
                  <span className="text-stone-300">➔</span>
                  <div className="flex-1 bg-white p-2.5 rounded-xl border border-stone-200 flex items-center justify-between">
                    <span className="text-xs text-stone-600 font-semibold">{isHi ? 'कुल अनुमानित आय:' : 'Estimated Gross:'}</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-800">
                      ₹{(calcQuintals * currentMandiRecord.modalPriceInr).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-stone-500">
                  {isHi
                    ? '💡 सलाह: दाम अभी मजबूत हैं। यदि सूखा भंडारण उपलब्ध है तो 2-3 दिन रोक सकते हैं, अन्यथा वर्तमान भाव में बेचना भी लाभदायक है।'
                    : '💡 Advice: Prices are strong. If safe dry storage is available, you can hold for 2-3 days, or sell now at healthy profit.'}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: फसल डॉक्टर (AI CROP DOCTOR - 1-CLICK LEAF SCANNER) */}
          {(activeTab === 'all' || activeTab === 'doctor') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg">
                    📸
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'फसल डॉक्टर — पत्ती जांच व समाधान' : 'Crop Doctor — Instant Leaf Diagnosis'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {isHi ? 'फोटो खींचें या नीचे दिए गए नमूनों पर क्लिक करें' : 'Upload photo or tap a test sample'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1-Tap Sample Leaf Test Buttons */}
              <div>
                <div className="text-xs font-bold text-stone-700 mb-2">
                  {isHi ? '1-क्लिक टेस्ट (क्लिक करके तुरंत रिपोर्ट देखें):' : 'Instant 1-Click Tests:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SAMPLE_CROP_IMAGES.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleTestCropSample(sample)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        selectedSampleImage === sample.previewUrl
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <img
                        src={sample.previewUrl}
                        alt={sample.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-300"
                      />
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-stone-900 truncate">{sample.title}</div>
                        <div className="text-[11px] text-stone-500 truncate">{sample.descriptionHi}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Your Own Photo */}
              <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-stone-300 hover:border-emerald-600 bg-stone-50 hover:bg-emerald-50/50 cursor-pointer text-xs font-bold text-stone-700 transition-colors">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>{isHi ? 'खेत से फोटो खींचें या गैलरी से चुनें' : 'Take photo or upload leaf image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Diagnosis Output Card */}
              {isDiagnosing && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-center text-xs font-bold text-purple-900 animate-pulse">
                  {isHi ? 'कृषि एआई पत्ती की जांच कर रहा है... कृपया रुकें' : 'Analyzing leaf with AI... Please wait'}
                </div>
              )}

              {activeDiagnosis && !isDiagnosing && (
                <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-200 space-y-3 animate-fadeIn">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {isHi ? 'जांच रिपोर्ट' : 'Diagnosis Report'}
                      </span>
                      <h3 className="font-black text-stone-900 text-base sm:text-lg mt-1">
                        {isHi ? activeDiagnosis.possibleIssueHi || activeDiagnosis.possibleIssue : activeDiagnosis.possibleIssue}
                      </h3>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                      {isHi ? `गंभीरता: ${activeDiagnosis.confidenceCategory}` : `Urgency: ${activeDiagnosis.urgency}`}
                    </span>
                  </div>

                  {/* Recommended Remedies */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-stone-800">{isHi ? 'उपाय व रोकथाम:' : 'Recommended Steps:'}</div>
                    <ul className="space-y-1">
                      {activeDiagnosis.recommendedNextSteps.map((step, idx) => (
                        <li key={idx} className="text-xs text-stone-700 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* KVK Support Contact */}
                  <div className="pt-2 border-t border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-stone-600 gap-2">
                    <div>
                      <span className="font-bold text-stone-900">{nearestKvk.name}</span>
                      <span className="block text-[11px] text-stone-500">{nearestKvk.address}</span>
                    </div>
                    <a
                      href={`tel:${nearestKvk.phone.split(',')[0]}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-800 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{isHi ? 'KVK से संपर्क करें' : 'Call KVK'}</span>
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* SECTION 6: किसान समूह में बिक्री (KISAN POOL) */}
          {(activeTab === 'all' || activeTab === 'pool') && (
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                    🤝
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-stone-900">
                      {isHi ? 'किसान समूह — मिलकर बेचें, ज्यादा कमाएं' : 'Kisan Collective Pool — Group Selling'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {isHi ? 'बिचौलिया हटाएं, सीधे बड़े खरीदार से ₹120 प्रति क्विंटल अतिरिक्त पाएं' : 'Bypass middlemen, get bulk buyer premium'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                    +₹120/Qtl {isHi ? 'अतिरिक्त' : 'Bonus'}
                  </span>
                </div>
              </div>

              {/* Pool Progress Card */}
              <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-800">
                  <span>
                    {isHi ? `सामूहिक लॉट लक्ष्य: 100 क्विंटल` : `Target Batch: 100 Quintals`}
                  </span>
                  <span className="text-blue-800 font-black">
                    {poolQuintals} / 100 Qtl ({Math.round((poolQuintals / 100) * 100)}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-200 rounded-full h-3.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3.5 rounded-full transition-all duration-500"
                    style={{ width: `${(poolQuintals / 100) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>
                    {isHi
                      ? `${100 - poolQuintals} क्विंटल और चाहिए गाड़ी पूरी होने के लिए`
                      : `${100 - poolQuintals} Qtl remaining to fill truck`}
                  </span>
                  <span className="font-semibold text-emerald-800">
                    {isHi ? 'खरीदार: हरियाणा एग्रो / ITC' : 'Buyer: Haryana Agro / ITC'}
                  </span>
                </div>

                {/* Contribution Action */}
                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs font-semibold text-stone-700">
                    {hasContributed
                      ? (isHi ? '✅ आपका हिस्सा जुड़ चुका है!' : '✅ Your contribution added!')
                      : (isHi ? 'अपना हिस्सा जोड़ें:' : 'Add your contribution:')}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddToPool(5)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-xs font-bold cursor-pointer"
                    >
                      +5 Qtl
                    </button>
                    <button
                      onClick={() => handleAddToPool(10)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-transform active:scale-95"
                    >
                      +10 Qtl
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* Right Corner AI Chatbot Assistant (Voice & Type Inputs) */}
      <AiChatAssistant
        selectedLocation={selectedLocation}
        selectedCrop={selectedCrop}
        currentTempC={currentWeather.temperatureC}
        weatherDesc={isHi ? currentWeather.weatherDescriptionHi : currentWeather.weatherDescriptionEn}
        rootMoisturePct={soilState.rootZoneMoisturePct}
        mandiPriceInr={currentMandiRecord.modalPriceInr}
        language={language}
        isCollapsed={isChatbotCollapsed}
        onToggleCollapse={() => setIsChatbotCollapsed((prev) => !prev)}
        isMobileOpen={isMobileChatOpen}
        onCloseMobile={() => setIsMobileChatOpen(false)}
      />

      {/* Mobile backdrop when right drawer is open */}
      {isMobileChatOpen && (
        <div
          onClick={() => setIsMobileChatOpen(false)}
          className="lg:hidden fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}
      </div>

      {/* Floating Right Corner Launcher Button */}
      {(isChatbotCollapsed || !isMobileChatOpen) && (
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsMobileChatOpen(true);
            } else {
              setIsChatbotCollapsed(false);
            }
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-800 to-green-700 hover:from-emerald-700 hover:to-green-600 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl border-2 border-emerald-300 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
          title={isHi ? 'AI कृषि मित्र (वॉयस व टाइपिंग)' : 'Kisan AI Chatbot'}
        >
          <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            🤖
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide leading-tight">
              {isHi ? 'AI कृषि मित्र' : 'Kisan AI'}
            </div>
            <div className="text-[10px] text-emerald-200 leading-tight">
              {isHi ? 'बोलें या लिखें' : 'Voice & Typing'}
            </div>
          </div>
        </button>
      )}


      {/* 5. Mobile Sticky Bottom Quick Bar with Voice AI */}
      <aside aria-label="Quick Actions" className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md bg-stone-900/95 backdrop-blur-md text-white rounded-full px-4 py-2 shadow-2xl border border-white/20 flex items-center justify-between text-xs font-bold sm:hidden">
        <button
          onClick={() => setIsMobileChatOpen(true)}
          className="flex items-center gap-1.5 text-amber-300 active:scale-95 transition-transform"
        >
          <span className="p-1 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5" />
          </span>
          <span>{isHi ? 'AI से बोलें' : 'Voice AI'}</span>
        </button>

        <button
          onClick={() => handleSpeak()}
          className="flex items-center gap-1.5 text-emerald-300 active:scale-95 transition-transform"
        >
          <Volume2 className="w-4 h-4" />
          <span>{isSpeaking ? (isHi ? 'बोल रहा है...' : 'Speaking') : isHi ? 'सलाह सुनें' : 'Listen'}</span>
        </button>

        <a
          href="tel:18001801551"
          className="flex items-center gap-1 text-stone-300 hover:text-white"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>{isHi ? 'हेल्पलाइन' : 'Kisan Line'}</span>
        </a>
      </aside>

      {/* 6. Clean, Reassuring Footer */}
      <footer className="mt-12 bg-white border-t border-stone-200 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-800">किसान साथी (Kisan Saathi)</span>
            <span>•</span>
            <span>{isHi ? 'सरल व सुलभ कृषि निर्णय मंच' : 'Accessible Agri Decision Intelligence'}</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="tel:18001801551" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              <span>{isHi ? 'किसान कॉल सेंटर: 1800-180-1551 (टोल फ्री)' : 'Helpline: 1800-180-1551'}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
