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
} from 'lucide-react';
import { CropConfig, Language, SimulationState, SoilTwinState } from '../../types';

interface VirtualSoilTwinProps {
  crop: CropConfig;
  language: Language;
  soilState: SoilTwinState;
  simulation: SimulationState;
  onUpdateMotorState: (newState: SoilTwinState['motorState']) => void;
}

export const VirtualSoilTwin: React.FC<VirtualSoilTwinProps> = ({
  crop,
  language,
  soilState,
  simulation,
  onUpdateMotorState,
}) => {
  const isHi = language === 'hi';

  // Interactive savings estimator state
  const [pumpFlowRate, setPumpFlowRate] = useState<number>(25000); // 25,000 L/hr (5 HP)
  const [plannedHours, setPlannedHours] = useState<number>(4);
  const [dieselPrice, setDieselPrice] = useState<number>(89);
  const fuelConsumptionLph = 1.2; // 1.2 L/hr

  // Calculate dynamic savings
  const isAutoOff = soilState.motorState === 'AUTO_OFF_RECOMMENDED' || (simulation.isActive && soilState.motorState !== 'MANUAL_OVERRIDE');
  const effectiveHoursAvoided = isAutoOff ? plannedHours : 0;
  const dynamicLitersSaved = effectiveHoursAvoided * pumpFlowRate;
  const dynamicDieselSaved = effectiveHoursAvoided * fuelConsumptionLph;
  const dynamicInrSaved = Math.round(dynamicDieselSaved * dieselPrice);

  const shallowMoisture = simulation.isActive ? 88 : soilState.shallowMoisturePct;
  const rootMoisture = simulation.isActive ? 79 : soilState.rootZoneMoisturePct;

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
                ? 'वर्चुअल सॉइल ट्विन व स्मार्ट सिंचाई मोटर'
                : 'Virtual Soil Twin & Smart Irrigation Motor'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'जड़ क्षेत्र की डिजिटल नमी मैपिंग और नलकूप मोटर का डिजिटल ट्विन सिमुलेशन'
                : 'Dual-depth root zone estimation & simulated motor auto-off'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
          {isHi ? 'शून्य हार्डवेयर (सॉफ्टवेयर-आधारित)' : 'Zero Field Hardware'}
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dual-Depth Soil Moisture Virtual Sensor (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {isHi ? 'मृदा गहराई प्रोफ़ाइल (Soil Depth Profile)' : 'Soil Depth Profile'}
              </span>
              <span className="text-[10px] text-stone-400">
                ERA5-Land Hydro Estimator
              </span>
            </div>

            {/* Depth 1: 0-7 cm (Shallow surface soil) */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Layers className="w-3.5 h-3.5 text-stone-600" />
                  <span>{isHi ? '0–7 सेमी (सतही मिट्टी / Shallow Layer)' : '0–7 cm (Shallow Surface Soil)'}</span>
                </div>
                <span className="font-extrabold text-blue-700">{shallowMoisture}% नमी</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    shallowMoisture >= 80 ? 'bg-blue-600' : shallowMoisture >= 45 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${shallowMoisture}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>{isHi ? 'सूखी (<35%)' : 'Dry'}</span>
                <span>{isHi ? 'इष्टतम (45-70%)' : 'Optimal'}</span>
                <span>{isHi ? 'संतृप्त (>80%)' : 'Saturated'}</span>
              </div>
            </div>

            {/* Depth 2: 7-28 cm (Active root zone) */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isHi ? '7–28 सेमी (सक्रिय जड़ क्षेत्र / Active Root Zone)' : '7–28 cm (Active Root Zone)'}</span>
                </div>
                <span className="font-extrabold text-emerald-800">{rootMoisture}% नमी</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    rootMoisture >= 75 ? 'bg-blue-600' : rootMoisture >= 45 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${rootMoisture}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>{crop.nameHi} लक्ष्य: {crop.optimalRootMoistureMin}%-{crop.optimalRootMoistureMax}%</span>
                <span className="font-bold text-emerald-700">
                  {rootMoisture >= crop.optimalRootMoistureMin ? (isHi ? 'पर्याप्त नमी' : 'Adequate Moisture') : (isHi ? 'सिंचाई आवश्यक' : 'Needs Water')}
                </span>
              </div>
            </div>

            {/* Irrigation Recommendation Rationale */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              simulation.isActive
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Droplets className="w-3.5 h-3.5" />
                <span>{isHi ? 'सिंचाई परामर्श (Advisory Reason):' : 'Irrigation Recommendation:'}</span>
              </div>
              <p>
                {simulation.isActive
                  ? '⚠️ भारी वर्षा (85 मिमी) के पूर्वानुमान के कारण नलकूप स्वतः बंद (AUTO-OFF) अनुशंसित है। अतिरिक्त पानी से जड़ सड़न हो सकती है।'
                  : soilState.irrigationReasonHi}
              </p>
            </div>
          </div>

          {/* Hardware Disclaimer */}
          <div className="mt-3 p-2.5 bg-stone-100/70 rounded-lg text-[10px] text-stone-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-stone-400 mt-0.5" />
            <span>
              {isHi
                ? 'नोट: यह एक डिजिटल ट्विन सिमुलेटर है। बिना वास्तविक भौतिक नियंत्रक (GSM/Contactor) के केवल सॉफ्टवेयर सीधे खेत की मोटर को चालू/बंद नहीं कर सकता।'
                : 'Note: Software digital twin only. Real farm motor control requires an installed compatible GSM/IoT contactor switch.'}
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
                {isAutoOff ? 'AUTO-OFF' : soilState.motorState}
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
                {isHi ? 'मानक मान्यताएं' : 'Editable Assumptions'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'सिंचाई अवधि (घंटे)' : 'Irrigation Time (hrs)'}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={plannedHours}
                  onChange={(e) => setPlannedHours(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="font-bold text-stone-800 text-xs">{plannedHours} घंटे (hours)</span>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'डीजल मूल्य (₹/L)' : 'Diesel Price (₹/L)'}
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
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200/80">
                <span className="text-[10px] text-emerald-700 block font-medium">
                  {isHi ? 'ईंधन खर्च बचत' : 'Fuel Cost Avoided'}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-900">
                  ₹ {dynamicInrSaved.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
