import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Droplets,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Camera,
  Upload,
  Users,
  PhoneCall,
  Power,
  RotateCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Info,
  ChevronRight,
  Sliders,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  CropConfig,
  CurrentWeather,
  HarvestSafetyScore,
  Language,
  LocationConfig,
  MandiDecision,
  MandiRecord,
  SimulationState,
  SoilTwinState,
  CropDiagnosisResult,
} from '../../types';
import { SAMPLE_CROP_IMAGES } from '../../data/demoData';
import { analyzeCropPhoto } from '../../services/apiClient';

interface FarmerFriendlyHubProps {
  location: LocationConfig;
  crop: CropConfig;
  language: Language;
  currentWeather: CurrentWeather;
  soilState: SoilTwinState;
  simulation: SimulationState;
  sowingScore: {
    totalScore: number;
    tempScore: number;
    rainScore: number;
    moistureScore: number;
    verdict: string;
    verdictHi: string;
    explanationHi: string;
    reSowingRiskCostInr?: number;
    washoutRotRiskHi?: string;
  };
  harvestScore?: HarvestSafetyScore;
  selectedStageId?: string;
  mandiData: MandiRecord;
  mandiDecision: MandiDecision;
  onUpdateMotorState: (state: SoilTwinState['motorState']) => void;
  onSpeakAdvisory: (text?: string) => void;
  isSpeaking: boolean;
  onScrollToModule: (moduleId: string) => void;
}

export const FarmerFriendlyHub: React.FC<FarmerFriendlyHubProps> = ({
  location,
  crop,
  language,
  currentWeather,
  soilState,
  simulation,
  sowingScore,
  harvestScore,
  selectedStageId,
  mandiData,
  mandiDecision: _mandiDecision,
  onUpdateMotorState,
  onSpeakAdvisory,
  isSpeaking,
  onScrollToModule,
}) => {
  const isHi = language === 'hi';

  // Toggle between Sowing and Harvesting in Decision Card 1
  const [decision1Tab, setDecision1Tab] = useState<'sowing' | 'harvesting'>(
    selectedStageId === 'maturity' || selectedStageId === 'harvest' ? 'harvesting' : 'sowing'
  );

  // Local interactive state for quick calculator
  const [quickQuintals, setQuickQuintals] = useState<number>(50);

  // Local state for fast farmer photo diagnosis
  const [analyzingImage, setAnalyzingImage] = useState<boolean>(false);
  const [farmerDiagnosis, setFarmerDiagnosis] = useState<CropDiagnosisResult | null>(null);
  const [_previewImage, setPreviewImage] = useState<string | null>(null);

  // Local state for farmer pool quick contribution
  const [addedPoolQuintals, setAddedPoolQuintals] = useState<number>(0);
  const [_hasAddedToPool, setHasAddedToPool] = useState<boolean>(false);

  const initialPoolQuintals = 85;
  const currentPoolQuintals = Math.min(100, initialPoolQuintals + addedPoolQuintals);
  const isPoolComplete = currentPoolQuintals >= 100;

  // Handle sample photo diagnosis directly in simple mode
  const handleTestSamplePhoto = async (sample: (typeof SAMPLE_CROP_IMAGES)[0]) => {
    setPreviewImage(sample.previewUrl);
    setAnalyzingImage(true);
    setFarmerDiagnosis(null);

    try {
      const res = await analyzeCropPhoto(
        sample.previewUrl,
        'image/jpeg',
        crop.id,
        sample.descriptionHi,
        location.nameEn
      );
      const diagnosis = res.diagnosis || sample.fallbackDiagnosis;
      setFarmerDiagnosis(diagnosis);
      if (isHi) {
        onSpeakAdvisory(
          `जांच रिपोर्ट: इस पौधे में ${diagnosis.possibleIssueHi || diagnosis.possibleIssue} के लक्षण मिले हैं। गंभीरता ${
            diagnosis.confidenceCategory
          } है। तुरंत पास के कृषि विज्ञान केंद्र से संपर्क करें।`
        );
      }
    } catch (_e) {
      setFarmerDiagnosis(sample.fallbackDiagnosis);
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setAnalyzingImage(true);
      setFarmerDiagnosis(null);

      try {
        const res = await analyzeCropPhoto(
          base64,
          file.type || 'image/jpeg',
          crop.id,
          'किसान द्वारा अपलोड की गई पत्ती',
          location.nameEn
        );
        const diagnosis = res.diagnosis;
        setFarmerDiagnosis(diagnosis);
        if (isHi) {
          onSpeakAdvisory(`जांच रिपोर्ट: ${diagnosis.possibleIssueHi || diagnosis.possibleIssue} का अनुमान है।`);
        }
      } catch (_e) {
        // fallback
      } finally {
        setAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sowing status decision
  const isSowingFavorable = sowingScore.totalScore >= 70 && !simulation.isActive;
  const isSowingCaution = sowingScore.totalScore >= 45 && sowingScore.totalScore < 70 && !simulation.isActive;

  // Irrigation status decision
  const isMotorOffRecommended =
    soilState.motorState === 'AUTO_OFF_RECOMMENDED' ||
    soilState.motorState === 'SIMULATED_OFF' ||
    simulation.isActive;

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Farmer Voice Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl border-2 border-emerald-600/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-400/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-stone-900 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                {isHi ? 'सरल किसान दृश्य' : 'Farmer Easy Mode'}
              </span>
              <span className="text-emerald-100 text-sm font-semibold">
                📍 {isHi ? location.nameHi : location.nameEn} • {crop.emoji} {isHi ? crop.nameHi : crop.nameEn}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {isHi ? 'राम-राम किसान भाई! आज खेत के 5 बड़े फैसले' : 'Welcome Farmer Friend! Today’s 5 Key Farm Decisions'}
            </h1>

            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              {simulation.isActive
                ? isHi
                  ? '⚠️ सावधान: तेज आंधी व भारी वर्षा का अलर्ट है! बुवाई रोकें और मोटर बंद रखें।'
                  : '⚠️ Alert: Heavy rainfall and gales forecast! Pause sowing and shut off motors.'
                : isHi
                ? 'आज आपके क्षेत्र में मौसम साफ है। नलकूप चलाने की जरूरत नहीं है, और मंडी में भाव बढ़ रहा है।'
                : 'Clear weather in your village today. No irrigation required, and mandi prices are trending upward.'}
            </p>
          </div>

          {/* Big Voice Button */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => onSpeakAdvisory()}
              className={`w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-base sm:text-lg transition-all cursor-pointer shadow-lg active:scale-95 ${
                isSpeaking
                  ? 'bg-amber-300 text-stone-950 ring-4 ring-amber-400/50 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-emerald-900 hover:text-emerald-950'
              }`}
            >
              <Volume2 className={`w-6 h-6 ${isSpeaking ? 'text-stone-950 animate-bounce' : 'text-emerald-700'}`} />
              <span>
                {isSpeaking
                  ? isHi
                    ? 'आवाज चल रही है...'
                    : 'Playing Voice...'
                  : isHi
                  ? '📢 आज की सलाह बोलकर सुनो'
                  : '📢 Listen Today’s Advice'}
              </span>
            </button>

            <a
              href="tel:18001801551"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-900/80 hover:bg-emerald-950 text-emerald-100 text-sm font-bold border border-emerald-500/40 transition-colors"
              title="टोल-फ्री किसान कॉल सेंटर"
            >
              <PhoneCall className="w-4 h-4 text-amber-300" />
              <span>1800-180-1551 (टोल फ्री)</span>
            </a>
          </div>
        </div>

        {/* Live Weather Quick Bar */}
        <div className="mt-5 pt-4 border-t border-emerald-600/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-emerald-50 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <div>
              <div className="text-emerald-200 text-xs">{isHi ? 'तापमान' : 'Temperature'}</div>
              <div className="font-extrabold text-white text-base">
                {simulation.isActive ? 20 : currentWeather.temperatureC}°C ({isHi ? currentWeather.weatherDescriptionHi : currentWeather.weatherDescriptionEn})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">🌧️</span>
            <div>
              <div className="text-emerald-200 text-xs">{isHi ? 'बारिश का अनुमान' : 'Rain Forecast'}</div>
              <div className="font-extrabold text-white text-base">
                {simulation.isActive ? '85 मिमी (भारी)' : `${currentWeather.precipitationMm} मिमी (कोई नहीं)`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">💧</span>
            <div>
              <div className="text-emerald-200 text-xs">{isHi ? 'मिट्टी में नमी' : 'Soil Moisture'}</div>
              <div className="font-extrabold text-white text-base">
                {simulation.isActive ? '88% (अधिक गीली)' : `${soilState.rootZoneMoisturePct}% (पर्याप्त नमी)`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <div className="text-emerald-200 text-xs">{isHi ? 'मंडी भाव (क्विंटल)' : 'Mandi Price'}</div>
              <div className="font-extrabold text-amber-300 text-base">
                ₹{mandiData.modalPriceInr} <span className="text-xs text-white">(+3.4% तेज)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Five Big Decision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* CARD 1: बुवाई / कटाई का फैसला (Problem 2.1 Solver) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl">
                  {decision1Tab === 'harvesting' ? '🌾' : '🌱'}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    {decision1Tab === 'harvesting'
                      ? (isHi ? 'पहला फैसला • कटाई व दाना गुणवत्ता' : 'Decision 1 • Harvest & Grain Quality')
                      : (isHi ? 'पहला फैसला • बुवाई व मौसम' : 'Decision 1 • Sowing & Weather')}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900">
                    {decision1Tab === 'harvesting'
                      ? (isHi ? 'क्या आज खेत में कटाई करें?' : 'Should You Harvest Today?')
                      : (isHi ? 'क्या आज खेत में बुवाई करें?' : 'Should You Sow Today?')}
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onSpeakAdvisory(
                    decision1Tab === 'harvesting'
                      ? simulation.isActive
                        ? 'सावधान! कटाई तुरंत रोकें। भारी बारिश से दाना भीगने पर फफूंद लगेगी और मंडी में ₹150 से ₹300 तक भाव कट जाएगा।'
                        : 'कटाई के लिए मौसम अनुकूल है। आगामी 3 दिन धूप खिली रहेगी।'
                      : isSowingFavorable
                      ? `बुवाई का सही समय है। सुरक्षा स्कोर ${sowingScore.totalScore} प्रतिशत है। अगले तीन दिन तक बारिश का खतरा नहीं है।`
                      : `सावधान! अभी बुवाई रोकें। बारिश के कारण बीज बहने और ₹2,400 प्रति एकड़ का दोबारा बुवाई खर्च होने का खतरा है।`
                  )
                }
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="बोलकर सुनें"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs: बुवाई vs कटाई */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs font-bold mb-3 w-fit">
              <button
                onClick={() => setDecision1Tab('sowing')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                  decision1Tab === 'sowing' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🌱</span>
                <span>{isHi ? 'बुवाई फैसला' : 'Sowing'}</span>
              </button>
              <button
                onClick={() => setDecision1Tab('harvesting')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                  decision1Tab === 'harvesting' ? 'bg-white text-amber-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🌾</span>
                <span>{isHi ? 'कटाई फैसला (दाना सुरक्षा)' : 'Harvest (Grain Quality)'}</span>
              </button>
            </div>

            {/* Verdict Badge */}
            {decision1Tab === 'harvesting' ? (
              <div
                className={`p-4 rounded-2xl mb-4 border-2 ${
                  simulation.isActive || (harvestScore?.totalScore || 85) < 50
                    ? 'bg-red-50 border-red-400 text-red-900'
                    : (harvestScore?.totalScore || 85) >= 75
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {simulation.isActive ? (
                    <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold leading-tight">
                      {simulation.isActive
                        ? isHi
                          ? '🔴 नहीं! कटाई तुरंत रोकें (गीले मौसम का खतरा)'
                          : '🔴 DO NOT HARVEST! (Wet Weather Danger)'
                        : isHi
                        ? '🟢 हाँ, कटाई व गहाई के लिए धूप अनुकूल है'
                        : '🟢 YES, Safe Sunlit Harvest Window'}
                    </div>
                    <div className="text-xs font-bold mt-0.5 opacity-90">
                      {isHi ? `कटाई सुरक्षा स्कोर: ${harvestScore?.totalScore ?? 85} / 100 • धूप खिली रहने की संभावना` : `Harvest Safety Score: ${harvestScore?.totalScore ?? 85} / 100`}
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed">
                  {simulation.isActive
                    ? isHi
                      ? '⚠️ 85 मिमी भारी बारिश में कटाई करने से दाने में नमी > 14% हो जाएगी, फफूंद व चमक खराब होगी। मंडी में ₹150–₹300/क्विंटल कटौती से बचने के लिए कटाई स्थगित रखें।'
                      : 'Severe rain will push grain moisture >14%, causing mold and Mandi discount of ₹150-₹300/q. Halt harvesting and cover stored crop.'
                    : isHi
                    ? 'अगले 3 दिनों तक धूप खिली रहेगी। दानों में 10-12% सुरक्षित नमी रहेगी और उच्च ग्रेड का भाव मिलेगा।'
                    : 'Clear dry weather for next 3 days ensures optimal grain moisture (10-12%) and premium grade price.'}
                </p>
              </div>
            ) : (
              <div
                className={`p-4 rounded-2xl mb-4 border-2 ${
                  isSowingFavorable
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                    : isSowingCaution
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-red-50 border-red-400 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isSowingFavorable ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold leading-tight">
                      {simulation.isActive
                        ? isHi
                          ? '🔴 नहीं! बुवाई तुरंत रोकें (बीज सड़ने का खतरा)'
                          : '🔴 DO NOT SOW! (High Risk of Seed Rot)'
                        : isSowingFavorable
                        ? isHi
                          ? '🟢 हाँ, आज बुवाई के लिए उत्तम दिन है!'
                          : '🟢 YES, Highly Favorable for Sowing!'
                        : isHi
                        ? '🟡 सावधानी से निर्णय लें (मध्यम जोखिम)'
                        : '🟡 Exercise Caution (Moderate Risk)'}
                    </div>
                    <div className="text-xs font-bold mt-0.5 opacity-90">
                      {isHi ? `बुवाई सुरक्षा स्कोर: ${sowingScore.totalScore} / 100` : `Safety Score: ${sowingScore.totalScore} / 100`}
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed">
                  {simulation.isActive
                    ? isHi
                      ? '⚠️ 85 मिमी भारी बारिश से बीज बहने व सड़ने का गंभीर खतरा है! बुवाई टालने से प्रति एकड़ लगभग ₹2,400 का दोबारा बुवाई (Re-sowing) खर्च बचेगा।'
                      : 'Deluge will wash out and rot seeds! Pausing sowing protects ~₹2,400/acre in re-sowing seed and tillage costs.'
                    : isHi
                    ? 'अगले 3 दिनों तक मौसम पूरी तरह साफ रहेगा। मिट्टी का तापमान 21.6°C अंकुरण के लिए एकदम सही है।'
                    : 'Clear skies for next 3 days. Soil temperature of 21.6°C is ideal for seedling emergence.'}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-100">
            <span className="text-xs text-stone-500 font-medium">
              {decision1Tab === 'harvesting'
                ? (isHi ? 'धूप व वर्षा पूर्वानुमान पर आधारित' : 'Based on rain & humidity forecast')
                : (isHi ? '10 साल के मौसम रिकॉर्ड पर आधारित' : 'Based on 10-Year Climate Baseline')}
            </span>
            <button
              onClick={() => onScrollToModule('module-weather-sowing')}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <span>{isHi ? '14 दिन का कैलेंडर देखें' : 'View 14-Day Calendar'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 2: नलकूप / ट्यूबवेल मोटर फैसला (Problem 2.3 Solver) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xl">
                  💧
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    {isHi ? 'दूसरा फैसला • सिंचाई, यूरिया व श्रम' : 'Decision 2 • Irrigation & Leaching'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900">
                    {isHi ? 'क्या आज ट्यूबवेल मोटर चलाएं?' : 'Should You Run the Motor?'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onSpeakAdvisory(
                    isMotorOffRecommended
                      ? `आज नलकूप मोटर बंद रखें। मिट्टी की जड़ में 62 प्रतिशत नमी मौजूद है। मोटर बंद रखने से ₹427 का डीजल और 4 घंटे का शारीरिक श्रम बचेगा, साथ ही यूरिया खाद का रिसाव रुकेगा।`
                      : `आज हल्की सिंचाई की जा सकती है।`
                  )
                }
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="बोलकर सुनें"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Motor Verdict Badge */}
            <div
              className={`p-4 rounded-2xl mb-4 border-2 ${
                isMotorOffRecommended
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Power className={`w-7 h-7 ${isMotorOffRecommended ? 'text-amber-600' : 'text-emerald-600'} shrink-0`} />
                <div>
                  <div className="text-lg sm:text-xl font-extrabold leading-tight">
                    {isMotorOffRecommended
                      ? isHi
                        ? '🟡 मोटर बंद रखें (आज पानी न दें)'
                        : '🟡 KEEP MOTOR OFF (No Irrigation Today)'
                      : isHi
                      ? '🟢 मोटर चालू कर सकते हैं'
                      : '🟢 Motor Can Run'}
                  </div>
                  <div className="text-xs font-bold mt-0.5 opacity-90">
                    {isHi ? 'जड़ क्षेत्र में नमी: 62% (पर्याप्त) • 4 घंटे श्रम व डीजल की बचत' : 'Root Zone Moisture: 62% • Diesel & Labour Saved'}
                  </div>
                </div>
              </div>

              <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed">
                {simulation.isActive
                  ? isHi
                    ? 'अतिवृष्टि से जलभराव व यूरिया रिसाव (Nutrient Leaching) रोकने हेतु मोटर स्वतः AUTO-OFF अनुशंसित है।'
                    : 'System recommends AUTO-OFF to prevent nutrient leaching, root rot, and flooding from 85mm deluge.'
                  : isHi
                  ? 'जमीन की 7-28 सेमी गहराई में पर्याप्त गीलापन है। बेवजह नलकूप चलाकर बिजली, डीजल और 4 घंटे का श्रम व्यर्थ न करें; अति-सिंचाई से खाद का रिसाव भी रुकता है।'
                  : 'Root zone moisture is sufficient. Running pump now wastes diesel, electricity, and labour while leaching soil nutrients.'}
              </p>
            </div>

            {/* Quick interactive toggle & savings badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateMotorState('SIMULATED_OFF')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    soilState.motorState === 'SIMULATED_OFF' || soilState.motorState === 'AUTO_OFF_RECOMMENDED'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  ⏹️ {isHi ? 'मोटर बंद (सलाह)' : 'Motor OFF (Advised)'}
                </button>
                <button
                  onClick={() => onUpdateMotorState('MANUAL_OVERRIDE')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    soilState.motorState === 'MANUAL_OVERRIDE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  ▶️ {isHi ? 'जबरन चालू करें' : 'Manual Run'}
                </button>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  💰 {isHi ? 'आज की बचत: ₹427 डीजल' : 'Savings: ₹427 Diesel'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-100">
            <span className="text-xs text-stone-500 font-medium">
              {isHi ? 'बिना किसी हार्डवेयर सेंसर के उपग्रह अनुमान' : 'Zero-Hardware Satellite Reanalysis'}
            </span>
            <button
              onClick={() => onScrollToModule('module-soil-irrigation')}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <span>{isHi ? 'डीजल बचत कैलकुलेटर देखें' : 'View Motor Twin'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 3: फसल डॉक्टर — बीमारी की जांच */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xl">
                  🩺
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    {isHi ? 'तीसरा फैसला • फसल स्वास्थ्य' : 'Decision 3 • Crop Health'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900">
                    {isHi ? 'पौधे में कोई बीमारी तो नहीं?' : 'Any Disease in Your Crop?'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onSpeakAdvisory(
                    simulation.isActive
                      ? `सावधान! भारी नमी के कारण पीला रतुआ और फंगल बीमारी का खतरा बहुत बढ़ गया है।`
                      : `वर्तमान मौसम में रोग का जोखिम सामान्य है। पत्ती पर पीले धब्बे दिखें तो तुरंत फोटो खींचकर जांचें।`
                  )
                }
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="बोलकर सुनें"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Disease Alert Box */}
            <div
              className={`p-4 rounded-2xl mb-4 border-2 ${
                simulation.isActive ? 'bg-red-50 border-red-400 text-red-900' : 'bg-emerald-50 border-emerald-400 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-7 h-7 ${simulation.isActive ? 'text-red-600' : 'text-emerald-600'} shrink-0`} />
                <div>
                  <div className="text-lg sm:text-xl font-extrabold leading-tight">
                    {simulation.isActive
                      ? isHi
                        ? '🔴 उच्च जोखिम: पीला रतुआ / फफूंद का खतरा!'
                        : '🔴 HIGH RISK: Yellow Rust & Fungus!'
                      : isHi
                      ? '🟢 रोग का जोखिम अभी कम है (सुरक्षित)'
                      : '🟢 Disease Risk Low (Healthy)'}
                  </div>
                  <div className="text-xs font-bold mt-0.5 opacity-90">
                    {isHi ? 'हवा में नमी 58% • तापमान 26°C' : 'Humidity 58% • Temp 26°C'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Sample Photo Testing for Farmers */}
            <div className="space-y-2 mb-3">
              <div className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>{isHi ? 'पत्ती की फोटो से तुरंत जांच करें:' : 'Test Leaf Photo Instantly:'}</span>
                <label className="text-emerald-700 hover:text-emerald-800 cursor-pointer font-bold flex items-center gap-1 text-xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isHi ? 'कैमरा / गैलरी से चुनें' : 'Upload / Camera'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_CROP_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleTestSamplePhoto(sample)}
                    disabled={analyzingImage}
                    className="p-1.5 rounded-xl border border-stone-200 hover:border-emerald-500 bg-stone-50 hover:bg-emerald-50 text-left transition-all cursor-pointer group text-xs flex flex-col items-center text-center"
                  >
                    <img
                      src={sample.previewUrl}
                      alt={sample.title}
                      className="w-12 h-12 object-cover rounded-lg mb-1 group-hover:scale-105 transition-transform"
                    />
                    <span className="font-bold text-[11px] text-stone-800 line-clamp-1">{sample.title}</span>
                  </button>
                ))}
              </div>

              {/* Diagnosis Output in Simple Mode */}
              {analyzingImage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-900 animate-pulse">
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>{isHi ? 'AI डॉक्टर पत्ती की जांच कर रहा है...' : 'AI Doctor analyzing leaf photo...'}</span>
                </div>
              )}

              {farmerDiagnosis && !analyzingImage && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-xs space-y-1.5 animate-fadeIn">
                  <div className="font-extrabold text-sm text-emerald-950 flex items-center justify-between">
                    <span>🩺 {farmerDiagnosis.possibleIssueHi || farmerDiagnosis.possibleIssue}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                      {farmerDiagnosis.confidenceScorePct}% विश्वास
                    </span>
                  </div>
                  <p className="text-emerald-800 font-medium">
                    {farmerDiagnosis.recommendedNextSteps?.[0] || 'पौधे पर निगरानी रखें व फफूंदनाशी का छिड़काव विशेषज्ञ की सलाह से करें।'}
                  </p>
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-between pt-1 border-t border-emerald-200">
                    <span>{farmerDiagnosis.kvkName}</span>
                    <a href={`tel:${farmerDiagnosis.kvkContact}`} className="text-emerald-900 font-black underline">
                      📞 {farmerDiagnosis.kvkContact}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-100">
            <span className="text-xs text-stone-500 font-medium">
              {isHi ? 'Gemini 3.8 Flash मल्टीमॉडल AI विज़न' : 'Gemini 3.8 Flash Multimodal AI'}
            </span>
            <button
              onClick={() => onScrollToModule('module-crop-doctor')}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <span>{isHi ? 'पूरा डॉक्टर मॉड्यूल खोलें' : 'Open Full Doctor'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 4: मंडी भाव और बिक्री सलाह */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200/80 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                  💰
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    {isHi ? 'चौथा फैसला • मंडी भाव व बिक्री' : 'Decision 4 • Mandi & Selling'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900">
                    {isHi ? 'आज मंडी में बेचें या रुकें?' : 'Sell Today or Hold?'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onSpeakAdvisory(
                    simulation.isActive
                      ? `चेतावनी! भारी बारिश की संभावना के कारण कटी हुई फसल तुरंत बेचें या सुरक्षित गोदाम में रखें ताकि दाना काला न पड़े।`
                      : `आज करनाल मंडी में गेहूं का भाव ₹${mandiData.modalPriceInr} प्रति क्विंटल है। भाव बढ़ रहा है, इसलिए अभी रुकना लाभदायक रहेगा।`
                  )
                }
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="बोलकर सुनें"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Mandi Verdict Badge */}
            <div
              className={`p-4 rounded-2xl mb-4 border-2 ${
                simulation.isActive
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className={`w-7 h-7 ${simulation.isActive ? 'text-amber-600' : 'text-emerald-600'} shrink-0`} />
                <div>
                  <div className="text-lg sm:text-xl font-extrabold leading-tight">
                    {simulation.isActive
                      ? isHi
                        ? '🟡 तुरंत सुरक्षित करें / बेचें (बारिश से बचाव)'
                        : '🟡 SELL NOW / SAFE STORAGE (Rain Risk)'
                      : isHi
                      ? '🟢 रुकें — भाव बढ़ रहा है (प्रतीक्षा करें)'
                      : '🟢 HOLD & WAIT (Upward Price Trend)'}
                  </div>
                  <div className="text-xs font-bold mt-0.5 opacity-90">
                    {mandiData.mandiName} • {isHi ? 'मॉडल भाव' : 'Modal Price'}: ₹{mandiData.modalPriceInr} / {isHi ? 'क्विंटल' : 'q'}
                  </div>
                </div>
              </div>

              <p className="mt-2.5 text-xs sm:text-sm font-medium leading-relaxed">
                {simulation.isActive
                  ? isHi
                    ? 'खुले में रखी उपज भीगने से गुणवत्ता गिरेगी। तुरंत शेड में रखें या पहली उपलब्ध गाड़ी में बेचें।'
                    : 'Prevent open produce soaking. Dispatch to mandi or tarp immediately.'
                  : isHi
                  ? `पिछले 7 दिनों में भाव में +${mandiData.priceChangePctWeek}% की तेजी आई है। अभी दाम और सुधरने की संभावना है।`
                  : `Price appreciated +${mandiData.priceChangePctWeek}% this week. Weather is dry, so holding is safe.`}
              </p>
            </div>

            {/* Simple Quick Net Proceeds Calculator */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>{isHi ? 'आपकी कुल अनुमानित उपज:' : 'Your Crop Quantity:'}</span>
                <span className="text-sm text-emerald-900 font-extrabold">{quickQuintals} {isHi ? 'क्विंटल (Quintals)' : 'Qtl'}</span>
              </div>

              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={quickQuintals}
                onChange={(e) => setQuickQuintals(Number(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                <div className="p-2 bg-white rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-bold">{isHi ? 'अकेले बेचने पर' : 'Solo Mandi'}</div>
                  <div className="font-black text-stone-900 text-sm">
                    ₹{(quickQuintals * mandiData.modalPriceInr).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-2 bg-emerald-100 rounded-xl border border-emerald-300">
                  <div className="text-[10px] text-emerald-800 font-bold">{isHi ? 'समूह (FPO) में बेचने पर' : 'With FPO Pool'}</div>
                  <div className="font-black text-emerald-950 text-sm">
                    ₹{(quickQuintals * (mandiData.modalPriceInr + 120)).toLocaleString('en-IN')}
                    <span className="block text-[9px] text-emerald-700 font-bold">+₹{(quickQuintals * 120).toLocaleString('en-IN')} बोनस</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-100">
            <span className="text-xs text-stone-500 font-medium">
              {isHi ? 'सत्यापित Agmarknet दैनिक भाव' : 'Agmarknet Real Wholesales'}
            </span>
            <button
              onClick={() => onScrollToModule('module-mandi-decision')}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <span>{isHi ? '7 दिन का चार्ट देखें' : 'View 7-Day Chart'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 5: गाँव का किसान समूह — साथ मिलकर बेचें (FPO Pool) */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border-2 border-emerald-600/70">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-2xl shadow-md">
                🤝
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    {isHi ? 'पाँचवाँ फैसला • सामूहिक लाभ' : 'Decision 5 • Village Pool'}
                  </span>
                  <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    14 {isHi ? 'किसान जुड़े' : 'Farmers'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {isHi ? 'गाँव का किसान समूह — साथ मिलकर बड़ा भाव पाएं' : 'Village Farmer Pool — Higher Collective Price'}
                </h3>
              </div>
            </div>

            <button
              onClick={() =>
                onSpeakAdvisory(
                  isPoolComplete
                    ? `बधाई हो! 100 क्विंटल का सामूहिक लक्ष्य पूरा हो गया है। हरियाणा एग्रो मार्ट द्वारा ₹120 प्रति क्विंटल अतिरिक्त बोनस के साथ बड़ा ऑर्डर पक्का हो गया है।`
                    : `गाँव के समूह में अभी 85 क्विंटल अनाज जमा हो चुका है। सिर्फ 15 क्विंटल और जुड़ते ही बड़ा खरीदार ₹120 प्रति क्विंटल ज्यादा देगा।`
                )
              }
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isHi ? 'बोलकर सुनें' : 'Listen'}</span>
            </button>
          </div>

          {/* Progress Bar & Target Display */}
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
              <span className="text-emerald-200">
                🎯 {isHi ? 'सामूहिक लक्ष्य: 100 क्विंटल (ट्रक लोड)' : 'Collective Target: 100 Quintals (1 Truck Load)'}
              </span>
              <span className="text-amber-300 font-extrabold text-base">
                {currentPoolQuintals} / 100 {isHi ? 'क्विंटल' : 'Qtl'} ({Math.round((currentPoolQuintals / 100) * 100)}%)
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-5 bg-white/20 rounded-full overflow-hidden p-0.5 border border-white/30">
              <div
                className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 text-[10px] font-black text-stone-950 ${
                  isPoolComplete ? 'bg-gradient-to-r from-amber-300 to-amber-400' : 'bg-gradient-to-r from-emerald-400 to-green-300'
                }`}
                style={{ width: `${Math.min(100, (currentPoolQuintals / 100) * 100)}%` }}
              >
                {Math.round((currentPoolQuintals / 100) * 100)}%
              </div>
            </div>

            {/* Explanation & Celebration */}
            {isPoolComplete ? (
              <div className="p-3 bg-amber-400 text-stone-950 rounded-xl font-black text-sm flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-900 shrink-0" />
                  <span>🎉 {isHi ? 'लक्ष्य पूरा! हरियाणा एग्रो मार्ट द्वारा +₹120/क्विंटल बोनस पक्का!' : 'Target Met! Bulk Buyer Unlocked with +₹120/q Margin!'}</span>
                </div>
                <span className="text-xs bg-emerald-900 text-white px-3 py-1 rounded-lg shrink-0">
                  {isHi ? 'गाड़ी रवाना होगी' : 'Truck Dispatched'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                  {isHi
                    ? 'सिर्फ 15 क्विंटल और जोड़ते ही 100 क्विंटल पूरा होगा और सभी 15 किसानों को ₹120 प्रति क्विंटल अतिरिक्त बोनस मिलेगा!'
                    : 'Add 15 quintals to unlock verified bulk buyer purchase order and earn +₹120/quintal bonus!'}
                </p>

                <button
                  onClick={() => {
                    setAddedPoolQuintals(15);
                    setHasAddedToPool(true);
                    onSpeakAdvisory(
                      isHi
                        ? 'बहुत बढ़िया! आपकी 15 क्विंटल फसल जुड़ने से 100 क्विंटल का लक्ष्य पूरा हो गया। बड़ा खरीदार अनलॉक हो गया है!'
                        : 'Congratulations! Target of 100 quintals unlocked.'
                    );
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  <span>➕ {isHi ? 'अपनी 15 क्विंटल फसल जोड़ें' : 'Add My 15 Qtl'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-200">
            <span>{isHi ? 'कर्नाल किसान उत्पादक समूह (FPO रजिस्टर्ड)' : 'Karnal FPO Registered'}</span>
            <button
              onClick={() => onScrollToModule('module-kisan-pool')}
              className="text-amber-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{isHi ? 'अन्य 14 किसानों की सूची व खरीदार देखें' : 'View Member List & Buyers'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
