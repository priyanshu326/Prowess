import React from 'react';
import {
  Sprout,
  MapPin,
  Flame,
  Globe2,
  Volume2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { CropConfig, CropId, Language, LocationConfig, SimulationState } from '../../types';

interface HeaderProps {
  locations: LocationConfig[];
  selectedLocation: LocationConfig;
  onSelectLocation: (loc: LocationConfig) => void;
  cropConfigs: Record<CropId, CropConfig>;
  selectedCrop: CropConfig;
  onSelectCrop: (crop: CropConfig) => void;
  selectedStageId: string;
  onSelectStageId: (stageId: string) => void;
  language: Language;
  onToggleLanguage: () => void;
  dataMode: 'LIVE_DATA' | 'CACHED_DATA' | 'DEMO_DATA';
  simulation: SimulationState;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
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
  language,
  onToggleLanguage,
  dataMode,
  simulation,
  onToggleSimulation,
  onResetSimulation,
  onOpenExplainableModal,
  onOpenInfoModal,
  onSpeakAdvisory,
  isSpeaking,
}) => {
  const isHi = language === 'hi';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs transition-colors">
      {/* Top emergency / simulation alert banner if active */}
      {simulation.isActive && (
        <div className="bg-red-600 text-white text-xs md:text-sm font-medium py-1.5 px-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 mx-auto">
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span className="font-bold tracking-wide">
              {isHi
                ? '⚠️ चरम मौसम सिमुलेशन सक्रिय: 85 मिमी वर्षा, 60 किमी/घंटा हवा (सिंथेटिक परीक्षण)'
                : '⚠️ EXTREME WEATHER SIMULATION ACTIVE: 85mm Rain, 60km/h Wind (Synthetic Stress-Test)'}
            </span>
          </div>
          <button
            onClick={onResetSimulation}
            className="text-xs bg-white text-red-700 px-2.5 py-0.5 rounded-full font-bold hover:bg-red-50 flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            {isHi ? 'रीसेट करें' : 'Reset'}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Sprout className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#166534]">
                Kisaan Sathi
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                IIIT Delhi Prototype
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-600 font-medium">
              {isHi ? 'बीज से बाजार तक, हर फैसले में किसान का साथी' : 'Zero-Hardware Agri Intelligence'}
            </p>
          </div>
        </div>

        {/* Command Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
          {/* Location Selector */}
          <div className="flex items-center bg-stone-100/90 hover:bg-stone-200/80 rounded-lg px-2.5 py-1.5 border border-stone-200 text-xs transition-colors">
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
          <div className="flex items-center bg-stone-100/90 hover:bg-stone-200/80 rounded-lg px-2.5 py-1.5 border border-stone-200 text-xs transition-colors">
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

          {/* Crop Stage Selector */}
          <div className="hidden md:flex items-center bg-stone-100/90 rounded-lg px-2.5 py-1.5 border border-stone-200 text-xs">
            <span className="text-stone-500 mr-1 text-[11px]">{isHi ? 'चरण:' : 'Stage:'}</span>
            <select
              value={selectedStageId}
              onChange={(e) => onSelectStageId(e.target.value)}
              className="bg-transparent font-medium text-stone-800 focus:outline-hidden cursor-pointer text-xs"
              aria-label="Crop Stage selector"
            >
              {selectedCrop.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {isHi ? stage.nameHi : stage.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Data Mode Badge */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
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
                ? 'LIVE METEO DATA'
                : 'CACHED REANALYSIS'}
            </span>
          </div>

          {/* Extreme Weather Simulator Button (Judge Demo Star Feature!) */}
          <button
            onClick={onToggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
              simulation.isActive
                ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-400'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
            }`}
            title="Inject hypothetical 85mm unseasonal storm scenario"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {simulation.isActive
                ? isHi
                  ? 'सिमुलेटर बंद करें'
                  : 'Stop Simulation'
                : isHi
                ? 'चरम मौसम सिमुलेटर'
                : 'Simulate Storm'}
            </span>
            <span className="sm:hidden">{simulation.isActive ? 'Reset' : 'Simulate'}</span>
          </button>

          {/* Voice Narration Button */}
          <button
            onClick={onSpeakAdvisory}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              isSpeaking
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
            }`}
            title={isHi ? 'सलाह आवाज में सुनें' : 'Listen to advisory in Hindi'}
            aria-label="Hindi voice advisory"
          >
            <Volume2 className="w-4 h-4 text-emerald-700" />
            <span className="hidden xl:inline text-[11px] font-semibold">
              {isSpeaking ? (isHi ? 'चल रहा है...' : 'Playing...') : isHi ? 'बोलें' : 'Speak'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold border border-stone-200 cursor-pointer transition-colors"
            title="भाषा बदलें / Change Language"
          >
            <Globe2 className="w-3.5 h-3.5 text-stone-600" />
            <span>{isHi ? 'EN' : 'हिं'}</span>
          </button>

          {/* Explainable AI Modal trigger */}
          <button
            onClick={onOpenExplainableModal}
            className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title={isHi ? 'सिफारिश गणित व सूत्र समझें' : 'Explainable AI Formulae'}
            aria-label="Explainable AI information"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Info Modal Trigger */}
          <button
            onClick={onOpenInfoModal}
            className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="About / Methodology / FAQ"
            aria-label="Help and information"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
