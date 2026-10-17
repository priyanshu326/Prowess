import React, { useState } from 'react';
import {
  Sprout,
  MapPin,
  Flame,
  Globe2,
  Volume2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Wifi,
  WifiOff,
  Sliders,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  PlayCircle,
  Droplets,
  Tractor,
} from 'lucide-react';
import {
  CropConfig,
  CropId,
  DemoScenario,
  FarmProfile,
  Language,
  LocationConfig,
  SimulationState,
} from '../../types';

interface HeaderProps {
  locations: LocationConfig[];
  selectedLocation: LocationConfig;
  onSelectLocation: (loc: LocationConfig) => void;
  cropConfigs: Record<CropId, CropConfig>;
  selectedCrop: CropConfig;
  onSelectCrop: (crop: CropConfig) => void;
  selectedStageId: string;
  onSelectStageId: (stageId: string) => void;
  farmProfile: FarmProfile;
  onUpdateFarmProfile: (updates: Partial<FarmProfile>) => void;
  language: Language;
  onToggleLanguage: () => void;
  dataMode: 'LIVE_DATA' | 'CACHED_DATA' | 'DEMO_DATA';
  lastUpdated: string;
  simulation: SimulationState;
  onActivateScenario: (scenario: DemoScenario) => void;
  onResetDemo: () => void;
  lowBandwidthMode: boolean;
  onToggleLowBandwidth: () => void;
  onOpenExplainableModal: () => void;
  onOpenInfoModal: () => void;
  onSpeakAdvisory: () => void;
  isSpeaking: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  cropConfigs,
  selectedCrop,
  onSelectCrop,
  selectedStageId,
  onSelectStageId,
  farmProfile,
  onUpdateFarmProfile,
  language,
  onToggleLanguage,
  dataMode,
  lastUpdated,
  simulation,
  onActivateScenario,
  onResetDemo,
  lowBandwidthMode,
  onToggleLowBandwidth,
  onOpenExplainableModal,
  onOpenInfoModal,
  onSpeakAdvisory,
  isSpeaking,
}) => {
  const isHi = language === 'hi';
  const [showFarmDetails, setShowFarmDetails] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs transition-colors">
      {/* Persistent simulation warning banner */}
      {simulation.isActive && (
        <div className="bg-red-600 text-white text-xs md:text-sm font-semibold py-1.5 px-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 mx-auto">
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span className="font-extrabold tracking-wide uppercase">
              {isHi
                ? '⚠️ डेमो सिमुलेशन — यह वास्तविक मौसम चेतावनी नहीं है (85 मिमी वर्षा, 60 किमी/घंटा हवा)'
                : 'DEMO SIMULATION — NOT A REAL-WORLD WEATHER ALERT (85mm Rain, 60km/h Wind)'}
            </span>
          </div>
          <button
            onClick={onResetDemo}
            className="text-xs bg-white text-red-700 px-3 py-0.5 rounded-full font-bold hover:bg-red-50 flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            {isHi ? 'रीसेट करें' : 'Reset'}
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Sprout className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#166534]">
                Kisan Saathi
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                कृषि साथी
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 font-medium">
              {isHi
                ? 'सही सलाह, सही समय, बेहतर फसल'
                : 'Your Trusted Companion for Smarter Farming'}
            </p>
          </div>
        </div>

        {/* Command Bar Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
          {/* Location Selector */}
          <div className="flex items-center bg-stone-100 hover:bg-stone-200/80 rounded-lg px-2.5 py-1.5 border border-stone-200 text-xs transition-colors">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 mr-1.5 shrink-0" />
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const found = locations.find((l) => l.id === e.target.value);
                if (found) onSelectLocation(found);
              }}
              className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
              aria-label="Location selector"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {isHi ? loc.nameHi : loc.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Crop Selector */}
          <div className="flex items-center bg-stone-100 hover:bg-stone-200/80 rounded-lg px-2.5 py-1.5 border border-stone-200 text-xs transition-colors">
            <span className="mr-1.5 text-sm">{selectedCrop.emoji}</span>
            <select
              value={selectedCrop.id}
              onChange={(e) => {
                const crop = cropConfigs[e.target.value as CropId];
                if (crop) onSelectCrop(crop);
              }}
              className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
              aria-label="Crop selector"
            >
              {Object.values(cropConfigs).map((c) => (
                <option key={c.id} value={c.id}>
                  {isHi ? c.nameHi : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Farm Details Toggle Button */}
          <button
            onClick={() => setShowFarmDetails(!showFarmDetails)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              showFarmDetails
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
            title="खेत का विवरण (क्षेत्रफल, बुवाई तिथि, मृदा)"
          >
            <Tractor className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">
              {farmProfile.area} {farmProfile.areaUnit === 'acres' ? (isHi ? 'एकड़' : 'Acres') : (isHi ? 'हेक्टेयर' : 'Ha')}
            </span>
            {showFarmDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Live Data Status Indicator */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
              simulation.isActive
                ? 'bg-red-50 text-red-700 border-red-300'
                : dataMode === 'LIVE_DATA'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                simulation.isActive
                  ? 'bg-red-600 animate-ping'
                  : dataMode === 'LIVE_DATA'
                  ? 'bg-emerald-600 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {simulation.isActive
                ? 'SIMULATION MODE'
                : dataMode === 'LIVE_DATA'
                ? 'LIVE METEO'
                : 'DEMO / CACHED'}
            </span>
          </div>

          {/* Interactive Demo Presets Dropdown / Buttons */}
          <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-300 rounded-lg p-0.5 text-xs font-bold text-amber-900">
            <span className="px-2 text-[10px] uppercase text-amber-800 hidden md:inline">
              {isHi ? 'डेमो परिदृश्य:' : 'Demo:'}
            </span>

            <button
              onClick={() => onActivateScenario('normal')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                !simulation.isActive ? 'bg-amber-200 text-amber-950 font-black' : 'hover:bg-amber-100 text-amber-800'
              }`}
              title="सामान्य कृषि दिवस (Favorable)"
            >
              {isHi ? 'A: सामान्य' : 'A: Normal'}
            </button>

            <button
              onClick={() => onActivateScenario('extreme_rain')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                simulation.isActive ? 'bg-red-600 text-white font-black' : 'hover:bg-amber-100 text-red-700'
              }`}
              title="85 मिमी भारी बारिश व आंधी तनाव परीक्षण"
            >
              <Flame className="w-3 h-3" />
              <span>{isHi ? 'B: चरम वर्षा' : 'B: Storm'}</span>
            </button>

            <button
              onClick={() => onActivateScenario('collective_selling')}
              className="px-2 py-1 rounded-md hover:bg-amber-100 text-emerald-800 cursor-pointer transition-colors"
              title="100 क्विंटल सामूहिक बिक्री लक्ष्य"
            >
              {isHi ? 'C: किसान पूल' : 'C: Pool'}
            </button>
          </div>

          {/* Reset Demo */}
          <button
            onClick={onResetDemo}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg cursor-pointer"
            title="रीसेट करें / Reset Demo Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Low Bandwidth Mode Toggle */}
          <button
            onClick={onToggleLowBandwidth}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              lowBandwidthMode
                ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                : 'text-stone-500 hover:text-stone-800 border-transparent hover:bg-stone-100'
            }`}
            title={lowBandwidthMode ? 'लो-बैंडविड्थ मोड सक्रिय (Data Saver ON)' : 'लो-बैंडविड्थ मोड चालू करें'}
            aria-label="Toggle low bandwidth mode"
          >
            {lowBandwidthMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          </button>

          {/* Voice Assistant Button: "Salah Sunen" */}
          <button
            onClick={onSpeakAdvisory}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
              isSpeaking
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
            title="दैनिक सलाह आवाज में सुनें"
          >
            <Volume2 className="w-4 h-4 text-emerald-700" />
            <span>
              {isSpeaking ? (isHi ? 'वाचन जारी...' : 'Speaking...') : isHi ? 'सलाह सुनें' : 'Salah Sunen'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold border border-stone-200 cursor-pointer"
            title="Language"
          >
            <Globe2 className="w-3.5 h-3.5 text-stone-600" />
            <span>{isHi ? 'EN' : 'हिं'}</span>
          </button>

          {/* Explainable AI */}
          <button
            onClick={onOpenExplainableModal}
            className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100 cursor-pointer"
            title="How Kisan Saathi Calculates Recommendations"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Info Modal */}
          <button
            onClick={onOpenInfoModal}
            className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100 cursor-pointer"
            title="About / Methodology / FAQ"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Farm Profile Control Panel */}
      {showFarmDetails && (
        <div className="bg-emerald-50/80 border-t border-emerald-100 p-3 sm:p-4 text-xs animate-fadeIn">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Area */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'खेत का क्षेत्रफल (Farm Area):' : 'Farm Area:'}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={farmProfile.area}
                  onChange={(e) => onUpdateFarmProfile({ area: Number(e.target.value) || 1 })}
                  className="w-24 p-1.5 rounded-lg border border-stone-300 bg-white font-bold text-stone-900 text-xs"
                />
                <select
                  value={farmProfile.areaUnit}
                  onChange={(e) => onUpdateFarmProfile({ areaUnit: e.target.value as 'acres' | 'hectares' })}
                  className="p-1.5 rounded-lg border border-stone-300 bg-white text-xs cursor-pointer font-medium"
                >
                  <option value="acres">{isHi ? 'एकड़' : 'Acres'}</option>
                  <option value="hectares">{isHi ? 'हेक्टेयर' : 'Hectares'}</option>
                </select>
              </div>
            </div>

            {/* Sowing Date */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'बुवाई / रोपाई की तिथि (Sowing Date):' : 'Sowing Date:'}
              </label>
              <input
                type="date"
                value={farmProfile.sowingDate}
                onChange={(e) => onUpdateFarmProfile({ sowingDate: e.target.value })}
                className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium cursor-pointer"
              />
            </div>

            {/* Soil Type */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'मिट्टी का प्रकार (Soil Type):' : 'Soil Type:'}
              </label>
              <select
                value={farmProfile.soilType}
                onChange={(e) => onUpdateFarmProfile({ soilType: e.target.value })}
                className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs cursor-pointer font-medium"
              >
                <option value="Alluvial Loam (दोमट मिट्टी)">Alluvial Loam (दोमट मिट्टी)</option>
                <option value="Sandy Loam (बलुई दोमट)">Sandy Loam (बलुई दोमट)</option>
                <option value="Clay Loam (चिकनी दोमट)">Clay Loam (चिकनी दोमट)</option>
                <option value="Black Cotton (काली मिट्टी)">Black Cotton (काली मिट्टी)</option>
              </select>
            </div>

            {/* Irrigation Method */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'सिंचाई विधि (Irrigation Method):' : 'Irrigation Method:'}
              </label>
              <select
                value={farmProfile.irrigationMethod}
                onChange={(e) => onUpdateFarmProfile({ irrigationMethod: e.target.value })}
                className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs cursor-pointer font-medium"
              >
                <option value="Tubewell Flood (नलकूप प्रवाह)">Tubewell Flood (नलकूप प्रवाह)</option>
                <option value="Drip Irrigation (ड्रिप टपक)">Drip Irrigation (ड्रिप टपक)</option>
                <option value="Sprinkler (फव्वारा)">Sprinkler (फव्वारा)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
