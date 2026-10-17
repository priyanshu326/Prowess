/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/layout/Header';
import { AdvisoryBanner } from './components/layout/AdvisoryBanner';
import { ClimateShield } from './components/weather/ClimateShield';
import { VirtualSoilTwin } from './components/soil/VirtualSoilTwin';
import { CropDoctor } from './components/doctor/CropDoctor';
import { MandiEngine } from './components/market/MandiEngine';
import { KisaanPool } from './components/market/KisaanPool';
import { AlertCenter } from './components/alerts/AlertCenter';
import { ExplainableAiModal } from './components/modals/ExplainableAiModal';
import { InfoModal } from './components/modals/InfoModal';

import {
  AlertNotification,
  CalendarDayAdvisory,
  ClimateComparisonData,
  CropConfig,
  CropId,
  CurrentWeather,
  DemoScenario,
  FarmProfile,
  Language,
  LocationConfig,
  SimulationState,
  SoilTwinState,
} from './types';
import { SUPPORTED_LOCATIONS, CROP_CONFIGS } from './utils/cropConfig';
import {
  calculateSowingSafetyScore,
  evaluateDiseaseRisk,
  evaluateMandiDecision,
  evaluateMotorDigitalTwin,
} from './utils/advisoryEngine';
import { DEMO_CLIMATE_BASELINE, DEMO_MANDI_DATA } from './data/demoData';
import { fetchLiveSoil, fetchLiveWeather } from './services/apiClient';
import {
  ShieldAlert,
  Database,
  ExternalLink,
  Heart,
  Sprout,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // 1. Central Location, Crop & Farm Information
  const [selectedLocation, setSelectedLocation] = useState<LocationConfig>(SUPPORTED_LOCATIONS[0]); // Karnal
  const [selectedCrop, setSelectedCrop] = useState<CropConfig>(CROP_CONFIGS.wheat);
  const [selectedStageId, setSelectedStageId] = useState<string>('sowing');
  const [language, setLanguage] = useState<Language>('hi');
  const [dataMode, setDataMode] = useState<'LIVE_DATA' | 'CACHED_DATA' | 'DEMO_DATA'>('LIVE_DATA');
  const [lastUpdated, setLastUpdated] = useState<string>('आज 11:30 AM');
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);

  const [farmProfile, setFarmProfile] = useState<FarmProfile>({
    area: 5,
    areaUnit: 'acres',
    sowingDate: '2026-10-15',
    soilType: 'Alluvial Loam (दोमट मिट्टी)',
    irrigationMethod: 'Tubewell Flood (नलकूप प्रवाह)',
  });

  // 2. Central Weather & Soil State
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
    estimatedLitersSaved: 0,
    estimatedInrSaved: 0,
  });

  // 3. Central Simulation Engine (Extreme Rain Stress-Test)
  const [simulation, setSimulation] = useState<SimulationState>({
    isActive: false,
    forecastHorizonHours: 72,
    simulatedRainfallMm: 85,
    simulatedWindSpeedKmh: 60,
    simulatedHumidityPct: 90,
    description: '85mm unseasonal heavy downpour and 60km/h wind shear',
  });

  // 4. Modals
  const [isExplainableModalOpen, setIsExplainableModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // 5. Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
          setCalendarDays(weatherRes.forecast14Days);
        }
        setDataMode(weatherRes.dataMode || 'LIVE_DATA');
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
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

  // Derived Sowing Safety Score (0-100)
  const sowingScore = useMemo(() => {
    const effectiveSoilTemp = simulation.isActive ? 19.5 : soilState.rootZoneTempC;
    const effectiveRainMm = simulation.isActive ? simulation.simulatedRainfallMm : currentWeather.precipitationMm;
    const effectiveRainProb = simulation.isActive ? 95 : 10;
    const effectiveRootMoisture = simulation.isActive ? 88 : soilState.rootZoneMoisturePct;

    return calculateSowingSafetyScore(
      effectiveSoilTemp,
      effectiveRainMm,
      effectiveRainProb,
      effectiveRootMoisture,
      selectedCrop
    );
  }, [simulation.isActive, simulation.simulatedRainfallMm, soilState, currentWeather, selectedCrop]);

  // Derived Motor Digital Twin Evaluation
  const motorTwinEval = useMemo(() => {
    return evaluateMotorDigitalTwin(
      {
        shallowMoisture: soilState.shallowMoisturePct,
        rootMoisture: soilState.rootZoneMoisturePct,
      },
      currentWeather.precipitationMm,
      simulation,
      selectedCrop,
      soilState.motorState
    );
  }, [soilState, currentWeather, simulation, selectedCrop]);

  // Sync motor auto-off state when evaluation updates
  useEffect(() => {
    if (motorTwinEval.recommendedMotorState === 'AUTO_OFF_RECOMMENDED' && soilState.motorState !== 'MANUAL_OVERRIDE') {
      setSoilState((prev) => ({
        ...prev,
        motorState: 'AUTO_OFF_RECOMMENDED',
        irrigationRecommendation: motorTwinEval.recommendation,
        irrigationReasonHi: motorTwinEval.reasonHi,
        estimatedLitersSaved: motorTwinEval.litersSaved,
        estimatedInrSaved: motorTwinEval.inrSaved,
      }));
    }
  }, [motorTwinEval, simulation.isActive]);

  // Derived Disease Risk Radar
  const diseaseAssessment = useMemo(() => {
    return evaluateDiseaseRisk(currentWeather, simulation, selectedCrop);
  }, [currentWeather, simulation, selectedCrop]);

  // Derived Mandi Data & Decision
  const currentMandiRecord = useMemo(() => {
    const locKey = selectedLocation.id === 'delhi' ? 'delhi' : 'karnal';
    return (
      DEMO_MANDI_DATA[locKey]?.[selectedCrop.id] ||
      DEMO_MANDI_DATA.karnal.wheat
    );
  }, [selectedLocation, selectedCrop]);

  const mandiDecision = useMemo(() => {
    return evaluateMandiDecision(
      selectedCrop,
      currentMandiRecord,
      currentWeather,
      simulation,
      30
    );
  }, [selectedCrop, currentMandiRecord, currentWeather, simulation]);

  // Derived 10-Year Climate Baseline
  const climateComparison = useMemo(() => {
    const locKey = selectedLocation.id === 'delhi' ? 'delhi' : 'karnal';
    const baseline = DEMO_CLIMATE_BASELINE[locKey] || DEMO_CLIMATE_BASELINE.karnal;

    if (simulation.isActive) {
      return baseline.map((item) => {
        if (item.monthOrDay.includes('Oct')) {
          return {
            ...item,
            currentOrForecastRainMm: item.historicalRainMm + 85,
            currentOrForecastTempC: 22.0,
          };
        }
        return item;
      });
    }

    return baseline;
  }, [selectedLocation, simulation.isActive]);

  // Notifications List
  const notifications: AlertNotification[] = useMemo(() => {
    const items: AlertNotification[] = [];

    if (simulation.isActive) {
      items.push({
        id: 'sim_storm',
        timestamp: 'अभी-अभी',
        severity: 'critical',
        titleHi: 'चरम वर्षा सिमुलेशन — 85 मिमी भारी बारिश व 60 किमी/घंटा हवा',
        titleEn: 'Extreme Rain Simulation — 85mm Deluge & 60km/h Gales',
        messageHi: 'बुवाई रोकें, नलकूप मोटर AUTO-OFF करें व कटी फसल सुरक्षित स्थान पर रखें। (डेमो संदेश)',
        messageEn: 'Cease sowing, motor auto-off triggered, shield open crop. (Demo Alert)',
        sourceModule: 'simulator',
        smsContentHi: 'Kisan Saathi: 72 घंटे में 85mm बारिश चेतावनी। सिंचाई रोकें व फसल सुरक्षित करें।',
      });
      items.push({
        id: 'sim_motor',
        timestamp: '1 मिनट पहले',
        severity: 'warning',
        titleHi: 'सिंचाई मोटर ऑटो-ऑफ सक्रिय (Auto-Off Recommendation)',
        titleEn: 'Smart Motor Auto-Off Activated',
        messageHi: 'अतिवृष्टि से जलभराव रोकने हेतु ट्यूवबेल मोटर को स्वतः बंद (AUTO-OFF) अनुशंसित किया गया है।',
        messageEn: 'Tubewell pump switched to AUTO-OFF to prevent saturation.',
        sourceModule: 'soil',
        smsContentHi: 'Kisan Saathi: भारी वर्षा के कारण नलकूप मोटर स्वतः बंद की गई।',
      });
    } else {
      items.push({
        id: 'norm_sowing',
        timestamp: '15 मिनट पहले',
        severity: 'success',
        titleHi: `${selectedCrop.nameHi} बुवाई हेतु अनुकूल मौसम (Score: ${sowingScore.totalScore}/100)`,
        titleEn: `Optimal Sowing Window for ${selectedCrop.nameEn}`,
        messageHi: `बुवाई सुरक्षा स्कोर ${sowingScore.totalScore}/100 है। अगले 3 दिन वर्षा रहित रहने का अनुमान है।`,
        messageEn: `Sowing Safety Score is ${sowingScore.totalScore}/100 with clear skies.`,
        sourceModule: 'climate',
        smsContentHi: `Kisan Saathi: ${selectedLocation.nameHi} में ${selectedCrop.nameHi} बुवाई हेतु अनुकूल मौसम।`,
      });
      items.push({
        id: 'norm_mandi',
        timestamp: '1 घंटा पहले',
        severity: 'info',
        titleHi: `मंडी भाव अद्यतन: ₹${currentMandiRecord.modalPriceInr} / क्विंटल (${currentMandiRecord.mandiName})`,
        titleEn: `Mandi Price Update: ₹${currentMandiRecord.modalPriceInr}/q`,
        messageHi: `${currentMandiRecord.mandiName} में साप्ताहिक भाव में +${currentMandiRecord.priceChangePctWeek}% की वृद्धि दर्ज।`,
        messageEn: `Weekly price appreciation of +${currentMandiRecord.priceChangePctWeek}%.`,
        sourceModule: 'mandi',
        smsContentHi: `Kisan Saathi: ${selectedCrop.nameHi} का मॉडल भाव ₹${currentMandiRecord.modalPriceInr}/क्विंटल।`,
      });
    }

    return items;
  }, [simulation.isActive, selectedCrop, sowingScore.totalScore, currentMandiRecord, selectedLocation.nameHi]);

  // Scenario Activation Handler (3 Interactive Demo Scenarios)
  const handleActivateScenario = useCallback((scenario: DemoScenario) => {
    if (scenario === 'normal') {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setSimulation((prev) => ({ ...prev, isActive: false }));
      setSoilState((prev) => ({ ...prev, motorState: 'SIMULATED_OFF' }));
    } else if (scenario === 'extreme_rain') {
      setSimulation((prev) => ({ ...prev, isActive: true }));
      const alertSpeech =
        'सावधान! चरम मौसम सिमुलेशन सक्रिय किया गया है। आगामी 72 घंटों में 85 मिमी भारी बारिश और 60 किमी प्रति घंटा की आंधी का पूर्वानुमान है। बुवाई स्थगित करें और सिंचाई मोटर बंद रखें। यह डेमो सिमुलेशन है, वास्तविक अलर्ट नहीं।';
      handleSpeak(alertSpeech);
    } else if (scenario === 'collective_selling') {
      // Scroll to Kisaan Pool module
      const poolElement = document.getElementById('module-kisan-pool');
      if (poolElement) {
        poolElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const handleResetDemo = useCallback(async () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSimulation((prev) => ({ ...prev, isActive: false }));
    setSoilState((prev) => ({ ...prev, motorState: 'SIMULATED_OFF' }));

    try {
      await fetch('/api/demo/reset', { method: 'POST' });
    } catch (_e) {
      // ignore
    }
  }, []);

  // Web Speech API Hindi & English Voice Synthesizer (Salah Sunen)
  const handleSpeak = useCallback((customText?: string) => {
    if (!('speechSynthesis' in window)) {
      alert('आपके ब्राउज़र में स्पीच सिंथेसिस उपलब्ध नहीं है।');
      return;
    }

    window.speechSynthesis.cancel();

    const isHi = language === 'hi';
    const textToSpeak =
      customText ||
      (simulation.isActive
        ? isHi
          ? `ध्यान दें! आपके चुने गए डेमो सिनेरियो में 85 मिलीमीटर तेज बारिश और 60 किलोमीटर प्रति घंटा हवा का जोखिम दिखाया गया है। खेत में जल निकासी, फसल की पकड़ और कटाई की तैयारी जांचें। यह सिमुलेशन है, असली मौसम की चेतावनी नहीं।`
          : `Attention! In your selected demo scenario, heavy rain of 85 millimeters and 60 kilometer per hour winds are forecast. Check drainage and safe storage. This is a simulation, not a real weather alert.`
        : isHi
          ? `नमस्ते किसान साथी! ${selectedLocation.nameHi} में ${selectedCrop.nameHi} के लिए मौसम अनुकूल है। आगामी तीन दिनों में बारिश की संभावना नहीं है। मिट्टी के जड़ क्षेत्र में 62 प्रतिशत नमी पर्याप्त है। आज अतिरिक्त नलकूप सिंचाई की आवश्यकता नहीं है।`
          : `Hello from Kisan Saathi. Conditions in ${selectedLocation.nameEn} are favorable for ${selectedCrop.nameEn}. Clear weather forecast for next 3 days. Active root zone retains adequate 62 percent moisture.`);

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

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [simulation.isActive, selectedLocation, selectedCrop, language]);

  const handlePauseSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  }, [isPaused]);

  const handleStopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#172B22] flex flex-col font-sans selection:bg-emerald-200">
      {/* 1. Global Farm Control Center Bar */}
      <Header
        locations={SUPPORTED_LOCATIONS}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
        cropConfigs={CROP_CONFIGS}
        selectedCrop={selectedCrop}
        onSelectCrop={setSelectedCrop}
        selectedStageId={selectedStageId}
        onSelectStageId={setSelectedStageId}
        farmProfile={farmProfile}
        onUpdateFarmProfile={(updates) => setFarmProfile((prev) => ({ ...prev, ...updates }))}
        language={language}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'hi' ? 'en' : 'hi'))}
        dataMode={dataMode}
        lastUpdated={lastUpdated}
        simulation={simulation}
        onActivateScenario={handleActivateScenario}
        onResetDemo={handleResetDemo}
        lowBandwidthMode={lowBandwidthMode}
        onToggleLowBandwidth={() => setLowBandwidthMode(!lowBandwidthMode)}
        onOpenExplainableModal={() => setIsExplainableModalOpen(true)}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        onSpeakAdvisory={() => handleSpeak()}
        isSpeaking={isSpeaking}
      />

      {/* Main Single-Page Command Center Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* 2. Top Agricultural Verdict Banner */}
        <AdvisoryBanner
          location={selectedLocation}
          crop={selectedCrop}
          language={language}
          simulation={simulation}
          sowingSafetyScore={sowingScore.totalScore}
          motorState={soilState.motorState}
          mandiRecommendation={mandiDecision.recommendationHi}
          onSpeak={() => handleSpeak()}
          isSpeaking={isSpeaking}
        />

        {/* 3. Six Connected Modules */}
        <div className="space-y-6">
          {/* Module 1: Fasal Buvai Suraksha */}
          <div id="module-weather-sowing">
            <ClimateShield
              location={selectedLocation}
              crop={selectedCrop}
              farmProfile={farmProfile}
              language={language}
              currentWeather={currentWeather}
              calendarDays={calendarDays}
              climateComparison={climateComparison}
              sowingScore={sowingScore}
              accumulatedGdd={480}
              simulation={simulation}
              lowBandwidthMode={lowBandwidthMode}
              onOpenExplainableModal={() => setIsExplainableModalOpen(true)}
            />
          </div>

          {/* Module 2: Smart Sinchai Assistant */}
          <div id="module-soil-irrigation">
            <VirtualSoilTwin
              crop={selectedCrop}
              language={language}
              soilState={soilState}
              simulation={simulation}
              nextRainfallMm={currentWeather.precipitationMm}
              onUpdateMotorState={(newState) =>
                setSoilState((prev) => ({ ...prev, motorState: newState }))
              }
            />
          </div>

          {/* Module 3: Fasal Doctor AI */}
          <div id="module-crop-doctor">
            <CropDoctor
              location={selectedLocation}
              crop={selectedCrop}
              language={language}
              diseaseAssessment={diseaseAssessment}
              simulation={simulation}
              onSpeakText={handleSpeak}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* Module 4: Mandi Bhav aur Bikri Salah */}
          <div id="module-mandi-decision">
            <MandiEngine
              crop={selectedCrop}
              language={language}
              mandiData={currentMandiRecord}
              weather={currentWeather}
              simulation={simulation}
              mandiDecision={mandiDecision}
              lowBandwidthMode={lowBandwidthMode}
            />
          </div>

          {/* Module 5: Kisan Pool — Milkar Bechein */}
          <div id="module-kisan-pool">
            <KisaanPool
              crop={selectedCrop}
              language={language}
            />
          </div>

          {/* Module 6: Har Kisan Tak Salah */}
          <div id="module-alert-center">
            <AlertCenter
              location={selectedLocation}
              crop={selectedCrop}
              language={language}
              simulation={simulation}
              notifications={notifications}
              onSpeakAdvisory={handleSpeak}
              onPauseSpeaking={handlePauseSpeaking}
              onStopSpeaking={handleStopSpeaking}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
            />
          </div>
        </div>
      </main>

      {/* Footer with Data Provenance & Hackathon Credits */}
      <footer className="mt-12 bg-white border-t border-stone-200 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-800">Kisan Saathi (किसान साथी)</span>
            <span>•</span>
            <span>“Sahi Salah, Sahi Samay, Behtar Fasal”</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setIsExplainableModalOpen(true)}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              How Kisan Saathi Calculates
            </button>
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Data Sources & Methodology
            </button>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1 text-stone-600 font-medium">
              IIIT Delhi Hackathon 2026 • Agriculture & Rural Development
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
          <p>
            *अस्वीकरण: यह मंच निर्णय-सहायता प्रोटोटाइप है। किसी भी रासायनिक छिड़काव या बड़े कृषि निर्णय से पहले अपने स्थानीय कृषि विज्ञान केंद्र (KVK) अथवा कृषि अधिकारी से पुष्टि अवश्य करें।
          </p>
          <div className="flex items-center gap-1.5 shrink-0 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Open-Meteo • Agmarknet DMI • Google Gemini 3.8 Flash</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExplainableAiModal
        isOpen={isExplainableModalOpen}
        onClose={() => setIsExplainableModalOpen(false)}
        crop={selectedCrop}
        language={language}
      />

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        language={language}
      />
    </div>
  );
}
