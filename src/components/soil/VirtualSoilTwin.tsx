import React, { useState } from 'react';
import {
  Droplets,
  Power,
  RotateCw,
  Fuel,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Sparkles,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { CropConfig, Language, SimulationState, SoilTwinState } from '../../types';

interface VirtualSoilTwinProps {
  crop: CropConfig;
  language: Language;
  soilState: SoilTwinState;
  simulation: SimulationState;
  nextRainfallMm: number;
  onUpdateMotorState: (newState: SoilTwinState['motorState']) => void;
}

export const VirtualSoilTwin: React.FC<VirtualSoilTwinProps> = ({
  crop,
  language,
  soilState,
  simulation,
  nextRainfallMm,
  onUpdateMotorState,
}) => {
  const isHi = language === 'hi';

  // Motor operating mode: Simulated vs Connected Hardware
  const [motorMode, setMotorMode] = useState<'simulated' | 'connected_hardware'>('simulated');

  // Interactive savings estimator state
  const [pumpFlowRate, setPumpFlowRate] = useState<number>(25000); // 25,000 L/hr
  const [plannedHours, setPlannedHours] = useState<number>(4);
  const [dieselPrice, setDieselPrice] = useState<number>(89);
  const fuelConsumptionLph = 1.2;

  const isAutoOff =
    soilState.motorState === 'AUTO_OFF_RECOMMENDED' ||
    (simulation.isActive && soilState.motorState !== 'MANUAL_OVERRIDE');

  // When simulation is active, show the prompt's explicit demonstration scenario:
  // 350 liters water saved and ₹140 diesel cost avoided!
  const dynamicLitersSaved = simulation.isActive
    ? 350
    : isAutoOff
    ? plannedHours * pumpFlowRate
    : 0;
  const dynamicInrSaved = simulation.isActive
    ? 140
    : isAutoOff
    ? Math.round(plannedHours * fuelConsumptionLph * dieselPrice)
    : 0;

  const shallowMoisture = simulation.isActive ? 88 : soilState.shallowMoisturePct;
  const rootMoisture = simulation.isActive ? 79 : soilState.rootZoneMoisturePct;

  // Determine moisture status (Dry, Moderate, Wet)
  const getMoistureStatus = (pct: number) => {
    if (pct < 40) return { label: 'Dry (सूखी)', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (pct <= 75) return { label: 'Moderate / Optimal (इष्टतम)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Wet / Saturated (गीली)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  };

  const shallowStatus = getMoistureStatus(shallowMoisture);
  const rootStatus = getMoistureStatus(rootMoisture);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
            <Droplets className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'स्मार्ट सिंचाई सहायक (Smart Sinchai Assistant)'
                : 'Smart Sinchai Assistant — Soil Sensor & Irrigation'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'जल बचाएं, अनावश्यक पंपिंग घटाएं और सही समय पर सिंचाई करें (Save water, reduce pumping).'
                : 'Save water, reduce unnecessary pumping, and irrigate at the right time.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-bold">
          <button
            onClick={() => setMotorMode('simulated')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
              motorMode === 'simulated' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isHi ? 'सिम्युलेटेड मोटर' : 'Simulated Motor'}
          </button>
          <button
            onClick={() => setMotorMode('connected_hardware')}
            className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
              motorMode === 'connected_hardware' ? 'bg-white text-blue-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Cpu className="w-3 h-3 text-blue-600" />
            <span>{isHi ? 'कनेक्टेड हार्डवेयर' : 'Hardware IoT'}</span>
          </button>
        </div>
      </div>

      {motorMode === 'connected_hardware' && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" />
            <strong>कनेक्टेड हार्डवेयर मोड:</strong> यह मोड भविष्य के प्रमाणीकृत IoT कंट्रोलर (GSM Contactor) के साथ सुरक्षित एकीकरण हेतु आरक्षित है।
          </span>
          <span className="text-[10px] font-mono bg-blue-200/70 px-2 py-0.5 rounded text-blue-950 font-bold">
            Auth Required
          </span>
        </div>
      )}

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dual-Depth Soil Moisture Virtual Sensor (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {isHi ? 'मृदा गहराई प्रोफ़ाइल (Soil Moisture Indicators)' : 'Soil Depth Profile'}
              </span>
              <span className="text-[10px] text-stone-400">
                ERA5-Land Hydro Estimator • 16h Forecast
              </span>
            </div>

            {/* Depth 1: 0-6 cm (Surface soil layer) */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Layers className="w-3.5 h-3.5 text-stone-600" />
                  <span>{isHi ? '0–6 सेमी (सतही मिट्टी / Surface Layer)' : '0–6 cm (Surface Layer)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${shallowStatus.color}`}>
                    {shallowStatus.label.split(' ')[0]}
                  </span>
                  <span className="font-extrabold text-blue-700">{shallowMoisture}% नमी</span>
                </div>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    shallowMoisture >= 80 ? 'bg-blue-600' : shallowMoisture >= 45 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${shallowMoisture}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>{isHi ? 'सूखी (Dry <40%)' : 'Dry'}</span>
                <span>{isHi ? 'मध्यम (Moderate 40-75%)' : 'Moderate'}</span>
                <span>{isHi ? 'गीली (Wet >75%)' : 'Wet'}</span>
              </div>
            </div>

            {/* Depth 2: 7-28 cm (Active root zone) */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isHi ? '7–28 सेमी (सक्रिय जड़ क्षेत्र / Root Zone)' : '7–28 cm (Root Zone)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rootStatus.color}`}>
                    {rootStatus.label.split(' ')[0]}
                  </span>
                  <span className="font-extrabold text-emerald-800">{rootMoisture}% नमी</span>
                </div>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    rootMoisture >= 75 ? 'bg-blue-600' : rootMoisture >= 45 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${rootMoisture}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>{crop.nameHi} लक्ष्य: {crop.optimalRootMoistureMin}%–{crop.optimalRootMoistureMax}%</span>
                <span className="font-bold text-emerald-700">
                  {rootMoisture >= crop.optimalRootMoistureMin ? (isHi ? 'पर्याप्त नमी' : 'Adequate Moisture') : (isHi ? 'सिंचाई आवश्यक' : 'Needs Water')}
                </span>
              </div>
            </div>

            {/* Next forecast rainfall info */}
            <div className="p-2.5 bg-sky-50/70 border border-sky-200/70 rounded-xl mb-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-900 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                {isHi ? 'आगामी 16 घंटे वर्षा पूर्वानुमान:' : 'Next 16h Rain Forecast:'}
              </span>
              <span className="font-extrabold text-sky-800">
                {simulation.isActive ? '85 mm (भारी वर्षा)' : `${nextRainfallMm} mm (वर्षा रहित)`}
              </span>
            </div>

            {/* Irrigation Recommendation Rationale */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isAutoOff
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Power className="w-3.5 h-3.5" />
                <span>{isAutoOff ? 'AUTO-OFF RECOMMENDATION' : (isHi ? 'सिंचाई परामर्श:' : 'Irrigation Advice:')}</span>
              </div>
              <p>
                {simulation.isActive
                  ? '⚠️ चरम वर्षा (85 मिमी) के पूर्वानुमान व पर्याप्त जड़ नमी (79%) के कारण नलकूप स्वतः बंद (AUTO-OFF) अनुशंसित है। अतिरिक्त सिंचाई से बचें।'
                  : soilState.irrigationReasonHi}
              </p>
            </div>
          </div>

          {/* Hardware Disclaimer */}
          <div className="mt-3 p-2.5 bg-stone-100/70 rounded-lg text-[10px] text-stone-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-stone-400 mt-0.5" />
            <span>
              {isHi
                ? 'सुरक्षा नियम: यह वर्चुअल मोटर स्विच किसी वास्तविक पंप को सीधे नियंत्रित करने का दावा नहीं करता। वास्तविक नियंत्रण के लिए फील्ड में अधिकृत IoT स्विच व ऑपरेटर पुष्टि आवश्यक है।'
                : 'Safety rule: The virtual motor switch does not physically control a real pump. Real control requires connected hardware, authentication, and fail-safe confirmation.'}
            </span>
          </div>
        </div>

        {/* Right: Motor Digital Twin & Fuel Savings (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          {/* Motor Digital Twin Interactive Visual */}
          <div className={`p-4 rounded-xl border transition-all ${
            isAutoOff
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
              : soilState.motorState === 'SIMULATED_ON'
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  {isHi ? 'नलकूप डिजिटल ट्विन' : 'Motor Digital Twin'}
                </span>
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                  5 HP ट्यूवबेल पंप (Simulated Pump)
                </h3>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide border ${
                isAutoOff
                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  : soilState.motorState === 'SIMULATED_ON'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-stone-200 text-stone-700 border-stone-300'
              }`}>
                {isAutoOff ? 'AUTO-OFF RECOMMENDATION' : soilState.motorState}
              </span>
            </div>

            {/* Pump Animation Visual */}
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                  isAutoOff
                    ? 'bg-amber-500 text-white shadow-amber-500/20'
                    : soilState.motorState === 'SIMULATED_ON'
                    ? 'bg-blue-600 text-white shadow-blue-600/30 ring-4 ring-blue-200'
                    : 'bg-stone-300 text-stone-600'
                }`}>
                  <RotateCw className={`w-10 h-10 ${soilState.motorState === 'SIMULATED_ON' ? 'animate-spin' : ''}`} />
                </div>
                {soilState.motorState === 'SIMULATED_ON' && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-300">
                    Running
                  </div>
                )}
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => onUpdateMotorState('SIMULATED_ON')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  soilState.motorState === 'SIMULATED_ON'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {isHi ? 'चालू (Simulate ON)' : 'Simulate ON'}
              </button>

              <button
                onClick={() => onUpdateMotorState('SIMULATED_OFF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  soilState.motorState === 'SIMULATED_OFF'
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {isHi ? 'बंद (Simulate OFF)' : 'Simulate OFF'}
              </button>

              <button
                onClick={() => onUpdateMotorState('MANUAL_OVERRIDE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  soilState.motorState === 'MANUAL_OVERRIDE'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {isHi ? 'मैन्युअल ओवरराइड' : 'Manual Override'}
              </button>
            </div>
          </div>

          {/* Savings Estimator Interactive Controls */}
          <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-600" />
                {isHi ? 'बचत संगणक (Water & Diesel Savings Estimator)' : 'Savings Estimator'}
              </span>
              <span className="text-[10px] text-stone-400">
                {isHi ? 'परिदृश्य आधारित अनुमान' : 'Scenario-Specific Estimates'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'सिंचाई अवधि (घंटे):' : 'Irrigation Time (hrs):'}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={plannedHours}
                  onChange={(e) => setPlannedHours(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="font-bold text-stone-800 text-xs">{plannedHours} घंटे</span>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'डीजल मूल्य (₹/L):' : 'Diesel Price (₹/L):'}
                </label>
                <input
                  type="range"
                  min="75"
                  max="105"
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="font-bold text-stone-800 text-xs">₹ {dieselPrice} / लीटर</span>
              </div>
            </div>

            {/* Savings Callout Display */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200/60">
              <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-200/80">
                <span className="text-[10px] text-blue-700 block font-medium">
                  {isHi ? 'अनुमानित जल बचत' : 'Water Conserved'}
                </span>
                <span className="text-base sm:text-lg font-black text-blue-900">
                  {dynamicLitersSaved.toLocaleString('en-IN')} L
                </span>
                {simulation.isActive && (
                  <span className="text-[9px] text-blue-600 block mt-0.5">*डेमो परिदृश्य: 350L बचत</span>
                )}
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200/80">
                <span className="text-[10px] text-emerald-700 block font-medium">
                  {isHi ? 'डीजल व्यय बचत' : 'Fuel Cost Avoided'}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-900">
                  ₹ {dynamicInrSaved.toLocaleString('en-IN')}
                </span>
                {simulation.isActive && (
                  <span className="text-[9px] text-emerald-600 block mt-0.5">*डेमो परिदृश्य: ₹140 बचत</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
