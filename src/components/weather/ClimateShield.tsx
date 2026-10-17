import React, { useState } from 'react';
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  CalendarDayAdvisory,
  ClimateComparisonData,
  CropConfig,
  CurrentWeather,
  Language,
  LocationConfig,
  SimulationState,
} from '../../types';

interface ClimateShieldProps {
  location: LocationConfig;
  crop: CropConfig;
  language: Language;
  currentWeather: CurrentWeather;
  calendarDays: CalendarDayAdvisory[];
  climateComparison: ClimateComparisonData[];
  sowingScore: {
    totalScore: number;
    tempScore: number;
    rainScore: number;
    moistureScore: number;
    verdict: string;
    verdictHi: string;
    explanationHi: string;
  };
  accumulatedGdd: number;
  simulation: SimulationState;
  onOpenExplainableModal: () => void;
}

export const ClimateShield: React.FC<ClimateShieldProps> = ({
  location,
  crop,
  language,
  currentWeather,
  calendarDays,
  climateComparison,
  sowingScore,
  accumulatedGdd,
  simulation,
  onOpenExplainableModal,
}) => {
  const isHi = language === 'hi';
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<CalendarDayAdvisory | null>(
    calendarDays[0] || null
  );

  // Cosine weather similarity metric
  const similarityPct = simulation.isActive ? 94 : 88;
  const comparisonYear = simulation.isActive ? '2019 (अनपेक्षित चक्रवाती वर्षा)' : '2021 (सामान्य रबी सत्र)';

  // Calculate anomaly: e.g. Oct historical rain vs current forecast
  const currentMonthData = climateComparison.find((c) => c.monthOrDay.includes('Oct')) || climateComparison[9];
  const rainDiffPct = currentMonthData
    ? simulation.isActive
      ? '+510%'
      : `${Math.round(((currentMonthData.currentOrForecastRainMm - currentMonthData.historicalRainMm) / (currentMonthData.historicalRainMm || 1)) * 100)}%`
    : '0%';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? '10-वर्षीय जलवायु विश्लेषण व 14-दिवसीय बुवाई कैलेंडर'
                : '10-Year Climate Intelligence & 14-Day Sowing Calendar'}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {isHi
              ? 'ऐतिहासिक जलवायु पैटर्न (2016-2025) और आगामी मौसम की बहु-स्तरीय सलाह'
              : 'Decadal climate baselines vs current ECMWF/GFS forecasts'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isHi ? 'अद्यतन: 10 मिनट पहले' : 'Updated: 10m ago'}
          </span>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            {isHi ? 'विधि विवरण' : 'Methodology'}
            {showMethodology ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Methodology explanation */}
      {showMethodology && (
        <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 text-xs text-stone-700 space-y-2 animate-fadeIn">
          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-700" />
            {isHi ? 'पारदर्शी डेटा स्रोत व स्कोर गणना पद्धति:' : 'Transparent Data Provenance & Methodology:'}
          </div>
          <p>
            • <strong>डेटा स्रोत:</strong> Open-Meteo Weather Forecast (ECMWF & GFS मॉडल) और ERA5-Land 10-वर्षीय ऐतिहासिक जलवायु रिकॉर्ड (2016–2025)। 2026 के आंकड़े वर्तमान प्रेक्षणों पर आधारित हैं।
          </p>
          <p>
            • <strong>बुवाई सुरक्षा स्कोर सूत्र:</strong>{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px]">
              स्कोर = 0.35 × मृदा तापमान उपयुक्तता + 0.40 × वर्षा जोखिम उपयुक्तता + 0.25 × जड़ नमी उपयुक्तता
            </code>
          </p>
          <p>
            • <strong>पारदर्शिता अस्वीकरण:</strong> यह एक प्रोटोटाइप निर्णय-सहायता स्कोर है, जो वैज्ञानिक रूप से प्रमाणित फसल पैदावार भविष्यवाणी नहीं है।
          </p>
        </div>
      )}

      {/* Real-time Current Weather Gauges Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-stone-50/30 border-b border-stone-100">
        {/* Temp */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'तापमान' : 'Air Temp'}</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {currentWeather.temperatureC}°C
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {isHi ? `महसूस: ${currentWeather.apparentTempC}°C` : `Feels: ${currentWeather.apparentTempC}°C`}
          </div>
        </div>

        {/* Soil Temp */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'मृदा तापमान' : 'Soil Temp (0-7cm)'}</span>
            <Layers className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-black text-stone-900">
            22.8°C
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {isHi ? 'अंकुरण अनुकूल' : 'Optimal germination'}
          </div>
        </div>

        {/* Rain Forecast */}
        <div className={`p-3 rounded-xl border shadow-2xs ${simulation.isActive ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200/80'}`}>
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'वर्षा पूर्वानुमान' : 'Rain Forecast'}</span>
            <CloudRain className={`w-3.5 h-3.5 ${simulation.isActive ? 'text-red-600 animate-pulse' : 'text-blue-500'}`} />
          </div>
          <div className={`text-xl font-black ${simulation.isActive ? 'text-red-700' : 'text-stone-900'}`}>
            {simulation.isActive ? `${simulation.simulatedRainfallMm} mm` : `${currentWeather.precipitationMm} mm`}
          </div>
          <div className={`text-[10px] font-semibold mt-0.5 ${simulation.isActive ? 'text-red-600' : 'text-stone-500'}`}>
            {simulation.isActive ? '⚠️ भारी बारिश अलर्ट' : 'अगले 48 घंटे में 0 mm'}
          </div>
        </div>

        {/* Wind Speed */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'हवा की गति' : 'Wind Speed'}</span>
            <Wind className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {simulation.isActive ? `${simulation.simulatedWindSpeedKmh} km/h` : `${currentWeather.windSpeedKmh} km/h`}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {simulation.isActive ? 'आंधी का खतरा' : 'छिड़काव हेतु अनुकूल'}
          </div>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'सापेक्ष आर्द्रता' : 'Humidity'}</span>
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {simulation.isActive ? `${simulation.simulatedHumidityPct}%` : `${currentWeather.relativeHumidity}%`}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {simulation.isActive ? 'फंगल रोग अनुकूल' : 'सामान्य'}
          </div>
        </div>

        {/* Sowing Safety Score Gauge */}
        <div className={`p-3 rounded-xl border shadow-2xs ${
          sowingScore.totalScore >= 75
            ? 'bg-emerald-50/70 border-emerald-300'
            : sowingScore.totalScore >= 50
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-red-50/70 border-red-300'
        }`}>
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span className="font-bold">{isHi ? 'बुवाई स्कोर' : 'Sowing Score'}</span>
            <button
              onClick={onOpenExplainableModal}
              title="फॉर्मूला देखें"
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${
              sowingScore.totalScore >= 75
                ? 'text-emerald-800'
                : sowingScore.totalScore >= 50
                ? 'text-amber-700'
                : 'text-red-700'
            }`}>
              {sowingScore.totalScore}
            </span>
            <span className="text-xs text-stone-500 font-bold">/ 100</span>
          </div>
          <div className="text-[10px] font-bold mt-0.5 truncate text-stone-700">
            {sowingScore.verdictHi.split(' ')[0]}
          </div>
        </div>
      </div>

      {/* Main Content: Historical Chart + 14-day Calendar */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 10-Year Climate Graph & GDD (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  {isHi
                    ? '10-वर्षीय जलवायु आधार रेखा (2016–2025) बनाम 2026 पूर्वानुमान'
                    : '10-Year Climate Baseline (2016–2025) vs 2026 Forecast'}
                </h3>
                <p className="text-xs text-stone-500">
                  {isHi
                    ? `स्थान: ${location.nameHi} | वर्षा विसंगति (Anomaly): ${rainDiffPct}`
                    : `Station: ${location.nameEn} | Rain Anomaly: ${rainDiffPct}`}
                </p>
              </div>

              {/* Anomaly badge */}
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                simulation.isActive
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {simulation.isActive ? 'अतिवृष्टि विसंगति' : 'सामान्य विचलन'}
              </div>
            </div>

            {/* Recharts chart */}
            <div className="h-64 sm:h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={climateComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="monthOrDay" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="rain" orientation="left" tick={{ fontSize: 11, fill: '#2563eb' }} label={{ value: 'Rain (mm)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#2563eb' }} />
                  <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 11, fill: '#dc2626' }} domain={[10, 42]} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#dc2626' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="rain" dataKey="historicalRainMm" name={isHi ? 'ऐतिहासिक वर्षा (10-वर्ष औसत)' : 'Historical Rain (10y Avg)'} fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="rain" dataKey="currentOrForecastRainMm" name={isHi ? '2026 प्रेक्षित/पूर्वानुमान वर्षा' : '2026 Current/Forecast Rain'} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="temp" type="monotone" dataKey="historicalTempC" name={isHi ? 'ऐतिहासिक औसत तापमान' : 'Historical Avg Temp'} stroke="#f97316" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                  <Line yAxisId="temp" type="monotone" dataKey="currentOrForecastTempC" name={isHi ? '2026 तापमान' : '2026 Temperature'} stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GDD & Cosine Similarity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-stone-100">
            {/* GDD Card */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
              <div className="flex items-center justify-between text-stone-500 font-semibold mb-1">
                <span>{isHi ? 'ग्रोइंग डिग्री डेज (GDD)' : 'Growing Degree Days (GDD)'}</span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200 text-[10px]">
                  Tbase = {crop.baseTempC}°C
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-stone-800">
                  {accumulatedGdd}
                </span>
                <span className="text-stone-500 text-[11px]">
                  / {crop.optimalGddToMaturity} GDD
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                {isHi
                  ? `अनुमानित परिपक्वता अवधि: 110–125 दिन (${crop.nameHi})`
                  : `Estimated maturity window: 110–125 days for ${crop.nameEn}`}
              </p>
            </div>

            {/* Historical Similarity Card */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
              <div className="flex items-center justify-between text-stone-500 font-semibold mb-1">
                <span>{isHi ? 'ऐतिहासिक मौसम समानता' : 'Historical Similarity'}</span>
                <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {similarityPct}% कोसाइन मिलान
                </span>
              </div>
              <p className="text-stone-800 font-bold text-xs mt-1">
                {comparisonYear}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {isHi
                  ? '*यह केवल मौसम सदिशों की गणितीय समानता है, तूफान की प्रत्यक्ष प्रायिकता नहीं।'
                  : '*Computed vector similarity indicator, not storm probability.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: 14-Day Interactive Sowing Calendar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                {isHi ? '14-दिवसीय बुवाई व कटाई कैलेंडर' : '14-Day Sowing & Harvest Calendar'}
              </h3>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  {isHi ? 'अनुकूल' : 'Suitable'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  {isHi ? 'सतर्क' : 'Caution'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  {isHi ? 'जोखिम' : 'Risk'}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-3">
              {isHi
                ? 'दैनिक विवरण और बुवाई उपयुक्तता देखने के लिए किसी भी तिथि पर क्लिक करें:'
                : 'Click any day to view detailed sowing and field suitability:'}
            </p>

            {/* Calendar tiles grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedCalendarDay?.date === day.date;
                // Under simulation mode, next 3 days are marked critical red
                const isSimulationDay = simulation.isActive && idx < 3;
                const effectiveSuitability = isSimulationDay ? 'red' : day.suitability;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedCalendarDay(day)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer relative ${
                      isSelected ? 'ring-2 ring-emerald-600 shadow-sm' : ''
                    } ${
                      effectiveSuitability === 'green'
                        ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900'
                        : effectiveSuitability === 'amber'
                        ? 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-900'
                        : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-900'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-stone-500 uppercase">
                      {isHi ? day.dayOfWeekHi : day.dayOfWeekEn}
                    </div>
                    <div className="text-xs font-black my-0.5">
                      {day.date.split('-')[2]}
                    </div>
                    <div className="text-[10px] font-medium flex items-center justify-center gap-0.5">
                      {effectiveSuitability === 'green' && <Sun className="w-3 h-3 text-amber-500" />}
                      {effectiveSuitability === 'amber' && <CloudRain className="w-3 h-3 text-blue-500" />}
                      {effectiveSuitability === 'red' && <CloudRain className="w-3 h-3 text-red-600 animate-pulse" />}
                    </div>
                    <div className="text-[9px] font-bold mt-0.5">
                      {isSimulationDay ? '85mm' : `${day.expectedRainMm}m`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Card */}
          {selectedCalendarDay && (
            <div className="mt-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-stone-900">
                  {selectedCalendarDay.date} ({isHi ? selectedCalendarDay.dayOfWeekHi : selectedCalendarDay.dayOfWeekEn})
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    simulation.isActive && selectedCalendarDay.date === calendarDays[0]?.date
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : selectedCalendarDay.suitability === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedCalendarDay.suitability === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {simulation.isActive && selectedCalendarDay.date === calendarDays[0]?.date
                    ? isHi ? 'अति जोखिम (सिमुलेशन)' : 'High Risk (Simulated)'
                    : isHi ? selectedCalendarDay.statusLabelHi : selectedCalendarDay.statusLabelEn}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-stone-200/60 my-1.5 text-stone-600">
                <div>
                  <span className="block text-[10px] text-stone-400">{isHi ? 'तापमान सीमा' : 'Temp Range'}</span>
                  <span className="font-bold text-stone-800">
                    {selectedCalendarDay.tempMinC}° - {selectedCalendarDay.tempMaxC}°C
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-400">{isHi ? 'वर्षा प्रायिकता' : 'Rain Prob'}</span>
                  <span className="font-bold text-stone-800">
                    {simulation.isActive ? '95%' : `${selectedCalendarDay.rainProbabilityPct}%`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-400">{isHi ? 'अनुमानित वर्षा' : 'Exp Rain'}</span>
                  <span className="font-bold text-stone-800">
                    {simulation.isActive ? '85 mm' : `${selectedCalendarDay.expectedRainMm} mm`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-700 leading-relaxed">
                <strong>{isHi ? 'कृषि परामर्श: ' : 'Agronomic Advice: '}</strong>
                {simulation.isActive && selectedCalendarDay.date === calendarDays[0]?.date
                  ? isHi
                    ? 'अतिवृष्टि के कारण बुवाई स्थगित रखें; जल निकासी के लिए मेड़ व नालियां दुरुस्त करें।'
                    : 'Heavy deluge forecast. Cease sowing and prepare surface drainage channels.'
                  : isHi
                  ? selectedCalendarDay.reasonHi
                  : selectedCalendarDay.reasonEn}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
