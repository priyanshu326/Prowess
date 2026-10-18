import React from 'react';
import {
  Sprout,
  Volume2,
  VolumeX,
  Globe2,
  PhoneCall,
  MapPin,
} from 'lucide-react';
import {
  CropConfig,
  CropId,
  Language,
  LocationConfig,
} from '../../types';

interface HeaderProps {
  locations: LocationConfig[];
  selectedLocation: LocationConfig;
  onSelectLocation: (loc: LocationConfig) => void;
  cropConfigs: Record<CropId, CropConfig>;
  selectedCrop: CropConfig;
  onSelectCrop: (crop: CropConfig) => void;
  language: Language;
  onToggleLanguage: () => void;
  onSpeakAdvisory: () => void;
  isSpeaking: boolean;
  onToggleChatbot?: () => void;
  isChatbotOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  cropConfigs,
  selectedCrop,
  onSelectCrop,
  language,
  onToggleLanguage,
  onSpeakAdvisory,
  isSpeaking,
  onToggleChatbot,
  isChatbotOpen,
}) => {
  const isHi = language === 'hi';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* 1. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-800 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-800/20 shrink-0">
            <Sprout className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl sm:text-2xl tracking-tight text-[#166534]">
                {isHi ? 'किसान साथी' : 'Kisan Saathi'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline">
                {isHi ? 'सरल व सटीक कृषि सलाह' : 'Simple Agri Advisory'}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium hidden sm:block">
              {isHi ? 'सही सलाह • सही समय • बेहतर फसल' : 'Right Advice • Right Time • Better Harvest'}
            </p>
          </div>
        </div>

        {/* Right Actions: AI Chat Assistant, Voice Assistant, Language, Helpline */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleChatbot && (
            <button
              onClick={onToggleChatbot}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-xs ${
                isChatbotOpen
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
              title={isHi ? 'AI सहायक (दाहिने कोने में)' : 'Toggle AI Assistant'}
            >
              <span className="text-sm">🤖</span>
              <span className="font-bold">
                {isHi ? 'AI मित्र' : 'AI Chat'}
              </span>
            </button>
          )}

          {/* Audio Advice Button */}
          <button
            onClick={onSpeakAdvisory}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-sm active:scale-95 ${
              isSpeaking
                ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
            title={isHi ? 'पूरी सलाह बोलकर सुनें' : 'Listen to advisory in voice'}
          >

            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 text-stone-950" />
                <span>{isHi ? 'बोलना बंद करें' : 'Stop Audio'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-200" />
                <span>{isHi ? 'सलाह सुनें' : 'Listen Voice'}</span>
              </>
            )}
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-bold border border-stone-200 cursor-pointer transition-colors"
            title="भाषा बदलें"
          >
            <Globe2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isHi ? 'English' : 'हिंदी'}</span>
          </button>

          {/* Toll-free Kisan Helpline Call */}
          <a
            href="tel:18001801551"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-colors"
            title="किसान कॉल सेंटर (टोल-फ्री 1800-180-1551)"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
            <span>1800-180-1551</span>
          </a>
        </div>
      </div>

      {/* 2. Fast 1-Tap Location & Crop Selector Bar */}
      <div className="bg-emerald-50/80 border-t border-emerald-100 py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* Crop Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-950 mr-1 flex items-center gap-1">
              <span>🌾</span>
              <span>{isHi ? 'फसल:' : 'Crop:'}</span>
            </span>
            {Object.values(cropConfigs).map((c) => {
              const isSelected = selectedCrop.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCrop(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600 scale-102'
                      : 'bg-white hover:bg-emerald-100/80 text-stone-700 border border-emerald-200'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{isHi ? c.nameHi.split(' ')[0] : c.nameEn}</span>
                </button>
              );
            })}
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-950 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isHi ? 'मंडी/स्थान:' : 'Location:'}</span>
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
          </div>
        </div>
      </div>
    </header>
  );
};
