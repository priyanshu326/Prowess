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
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Tractor,
  Layers,
  PhoneCall,
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
  viewMode: 'farmer' | 'detailed';
  onToggleViewMode: (mode: 'farmer' | 'detailed') => void;
}

export const Header: React.FC<HeaderProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  cropConfigs,
  selectedCrop,
  onSelectCrop,
  selectedStageId: _selectedStageId,
  onSelectStageId: _onSelectStageId,
  farmProfile,
  onUpdateFarmProfile,
  language,
  onToggleLanguage,
  dataMode,
  lastUpdated: _lastUpdated,
  simulation,
  onActivateScenario,
  onResetDemo,
  lowBandwidthMode,
  onToggleLowBandwidth,
  onOpenExplainableModal,
  onOpenInfoModal,
  onSpeakAdvisory,
  isSpeaking,
  viewMode,
  onToggleViewMode,
}) => {
  const isHi = language === 'hi';
  const [showFarmDetails, setShowFarmDetails] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs transition-colors">
      {/* 1. Persistent simulation warning banner */}
      {simulation.isActive && (
        <div className="bg-red-600 text-white text-xs md:text-sm font-semibold py-2 px-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 mx-auto">
            <Flame className="w-5 h-5 text-amber-300 animate-bounce" />
            <span className="font-extrabold tracking-wide uppercase">
              {isHi
                ? '⚠️ आपातकालीन मौसम टेस्ट — 85 मिमी भारी बारिश व 60 किमी/घंटा आंधी (सिमुलेशन)'
                : 'EXTREME WEATHER TEST — 85mm Deluge & 60km/h Wind Gales (Simulation)'}
            </span>
          </div>
          <button
            onClick={onResetDemo}
            className="text-xs bg-white text-red-700 px-3.5 py-1 rounded-full font-black hover:bg-red-50 flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isHi ? 'मौसम सामान्य करें' : 'Reset Weather'}</span>
          </button>
        </div>
      )}

      {/* 2. Main Branding & Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-800/25 shrink-0">
            <Sprout className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl sm:text-2xl tracking-tight text-[#166534]">
                {isHi ? 'किसान साथी' : 'Kisan Saathi'}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline">
                {isHi ? 'कृषि निर्णय मंच' : 'Agri Decision Platform'}
              </span>
            </div>
            <p className="text-xs text-stone-600 font-bold hidden sm:block">
              {isHi ? '“सही सलाह, सही समय, बेहतर फसल”' : '“Sahi Salah, Sahi Samay, Behtar Fasal”'}
            </p>
          </div>
        </div>

        {/* View Switcher: Farmer Friendly Mode vs Detailed Data Mode */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
          <button
            onClick={() => onToggleViewMode('farmer')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'farmer'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            <span>🌾</span>
            <span>{isHi ? 'सरल किसान दृश्य' : 'Farmer View'}</span>
          </button>

          <button
            onClick={() => onToggleViewMode('detailed')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            <span>📊</span>
            <span>{isHi ? 'विस्तृत आंकड़े व ग्राफ' : 'Deep Data View'}</span>
          </button>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Big Speak Button */}
          <button
            onClick={onSpeakAdvisory}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
              isSpeaking
                ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="दैनिक सलाह आवाज में सुनें"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden md:inline">
              {isSpeaking ? (isHi ? 'वाचन जारी...' : 'Speaking...') : isHi ? 'सलाह सुनें' : 'Listen'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black border border-stone-200 cursor-pointer"
            title="भाषा बदलें / Toggle Language"
          >
            <Globe2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isHi ? 'English' : 'हिंदी'}</span>
          </button>

          {/* Emergency Weather Test Dropdown / Button */}
          <div className="hidden lg:flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl p-1 text-xs">
            <button
              onClick={() => onActivateScenario(simulation.isActive ? 'normal' : 'extreme_rain')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                simulation.isActive ? 'bg-red-600 text-white' : 'hover:bg-amber-100 text-red-800'
              }`}
              title="85 मिमी भारी बारिश व आंधी टेस्ट"
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{simulation.isActive ? (isHi ? 'सामान्य करें' : 'Reset') : isHi ? 'मौसम टेस्ट' : 'Storm Test'}</span>
            </button>
          </div>

          {/* Info Modal Button */}
          <button
            onClick={onOpenInfoModal}
            className="p-2 text-stone-500 hover:text-emerald-700 rounded-xl hover:bg-stone-100 cursor-pointer"
            title="Kisan Saathi के बारे में जानकारी"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Farmer Quick Selection Sub-Bar: Big 1-Tap Crop & Location Selector */}
      <div className="bg-emerald-50/70 border-t border-emerald-100 py-2.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Crop Switcher Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider mr-1">
              🌾 {isHi ? 'आपकी फसल:' : 'Select Crop:'}
            </span>
            {Object.values(cropConfigs).map((c) => {
              const isSelected = selectedCrop.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCrop(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600 scale-105'
                      : 'bg-white hover:bg-emerald-100/70 text-stone-700 border border-emerald-200'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{isHi ? c.nameHi : c.nameEn}</span>
                </button>
              );
            })}
          </div>

          {/* Location Switcher Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider mr-1">
              📍 {isHi ? 'गाँव / मंडी:' : 'Location:'}
            </span>
            {locations.map((loc) => {
              const isSelected = selectedLocation.id === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => onSelectLocation(loc)}
                  className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-emerald-900 border-2 border-emerald-700 shadow-xs font-black'
                      : 'bg-emerald-100/80 hover:bg-emerald-200/80 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {isHi ? loc.nameHi.split(',')[0] : loc.nameEn.split(',')[0]}
                </button>
              );
            })}

            {/* Farm Area Setting Button */}
            <button
              onClick={() => setShowFarmDetails(!showFarmDetails)}
              className="ml-1 px-2.5 py-1 bg-white hover:bg-stone-100 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-1 cursor-pointer"
              title="खेत का आकार व मिट्टी बदलें"
            >
              <Tractor className="w-3.5 h-3.5 text-emerald-700" />
              <span>{farmProfile.area} एकड़</span>
              {showFarmDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Expandable Farm Profile Control Panel */}
      {showFarmDetails && (
        <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4 text-xs animate-fadeIn">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                <span className="p-1.5 font-bold text-stone-700">{isHi ? 'एकड़' : 'Acres'}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'बुवाई / रोपाई की तिथि:' : 'Sowing Date:'}
              </label>
              <input
                type="date"
                value={farmProfile.sowingDate}
                onChange={(e) => onUpdateFarmProfile({ sowingDate: e.target.value })}
                className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'मिट्टी का प्रकार:' : 'Soil Type:'}
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

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                {isHi ? 'सिंचाई विधि:' : 'Irrigation Method:'}
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
