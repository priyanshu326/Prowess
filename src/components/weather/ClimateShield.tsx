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
  CalendarDays,
  Sparkles,
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
  FarmProfile,
  HarvestSafetyScore,
  Language,
  LocationConfig,
  SimulationState,
} from '../../types';

interface ClimateShieldProps {
  location: LocationConfig;
  crop: CropConfig;
  farmProfile: FarmProfile;
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
    reSowingRiskCostInr?: number;
    washoutRotRiskHi?: string;
  };
  harvestScore?: HarvestSafetyScore;
  selectedStageId?: string;
  accumulatedGdd: number;
  simulation: SimulationState;
  lowBandwidthMode: boolean;
  onOpenExplainableModal: () => void;
}

export const ClimateShield: React.FC<ClimateShieldProps> = ({
  location,
  crop,
  farmProfile,
  language,
  currentWeather,
  calendarDays,
  climateComparison,
  sowingScore,
  harvestScore,
  selectedStageId,
  accumulatedGdd,
  simulation,
  lowBandwidthMode,
  onOpenExplainableModal,
}) => {
  const isHi = language === 'hi';
  const [showMethodology, setShowMethodology] = useState(false);
  const [viewDaysCount, setViewDaysCount] = useState<7 | 14>(14);
  const [focusMode, setFocusMode] = useState<'sowing' | 'harvesting'>(
    selectedStageId === 'maturity' || selectedStageId === 'harvest' ? 'harvesting' : 'sowing'
  );
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<CalendarDayAdvisory | null>(
    calendarDays[0] || null
  );

  const displayedDays = calendarDays.slice(0, viewDaysCount);

  // Anomaly calculation
  const currentMonthData = climateComparison.find((c) => c.monthOrDay.includes('Oct')) || climateComparison[9];
  const rainDiffPct = currentMonthData
    ? simulation.isActive
      ? '+510%'
      : `${Math.round(((currentMonthData.currentOrForecastRainMm - currentMonthData.historicalRainMm) / (currentMonthData.historicalRainMm || 1)) * 100)}%`
    : '0%';

  // Dynamic Sowing Window recommendations
  const sowingWindow =
    crop.id === 'wheat'
      ? { window: '20 Oct – 15 Nov', note: 'इष्टतम अवधि (Optimal Rabi Window)' }
      : crop.id === 'rice'
      ? { window: '15 Jun – 10 Jul', note: 'मानसून रोपाई (Kharif Monsoon Window)' }
      : { window: '15 Sep – 30 Oct', note: 'शरदकालीन टमाटर (Autumn Crop Window)' };

  // Estimated harvest window based on sowing date and GDD
  const estimatedHarvestWindow =
    crop.id === 'wheat'
      ? '10 Mar – 25 Mar 2027 (दाना भराव व पकना)'
      : crop.id === 'rice'
      ? '15 Oct – 05 Nov 2026 (बाली पकना)'
      : '15 Dec 2026 – 20 Jan 2027 (तुड़ाई चरण)';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'फसल बुवाई एवं कटाई सुरक्षा (Sowing & Harvest Shield)'
                : 'Sowing & Harvesting Climate Shield — Weather Intelligence'}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {isHi
              ? 'बेमौसम बारिश में बीज बहने/सड़ने व गीले मौसम में कटाई से दाना खराब होने का जोखिम प्रबंधन (Problem 2.1)'
              : 'Protect germination from seed-washout & prevent grain quality damage in wet harvest weather.'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Sowing vs Harvesting Focus Switcher */}
          <div className="bg-emerald-100/70 p-0.5 rounded-xl flex items-center font-bold text-[11px] border border-emerald-300/80">
            <button
              onClick={() => setFocusMode('sowing')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                focusMode === 'sowing'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-emerald-950 hover:bg-emerald-200/60'
              }`}
            >
              <span>🌱</span>
              <span>{isHi ? 'बुवाई सुरक्षा' : 'Sowing'}</span>
            </button>
            <button
              onClick={() => setFocusMode('harvesting')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                focusMode === 'harvesting'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-700 hover:bg-amber-100'
              }`}
            >
              <span>🌾</span>
              <span>{isHi ? 'कटाई सुरक्षा' : 'Harvesting'}</span>
            </button>
          </div>

          {/* 7-day vs 14-day View Switcher */}
          <div className="bg-stone-200/80 p-0.5 rounded-lg flex items-center font-bold text-[11px]">
            <button
              onClick={() => setViewDaysCount(7)}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                viewDaysCount === 7 ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7-Day
            </button>
            <button
              onClick={() => setViewDaysCount(14)}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                viewDaysCount === 14 ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              14-Day
            </button>
          </div>

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
            • <strong>डेटा स्रोत:</strong> Open-Meteo Weather Forecast (ECMWF & GFS) और ERA5-Land 10-वर्षीय ऐतिहासिक जलवायु रिकॉर्ड (2016–2025)। 2026 के आंकड़े वर्तमान प्रेक्षणों पर आधारित हैं।
          </p>
          <p>
            • <strong>बुवाई सुरक्षा स्कोर सूत्र:</strong>{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px]">
              Score = 0.35 × Soil Temperature Score + 0.40 × Historical Rainfall Risk Score + 0.25 × Root-Zone Moisture Score
            </code>
          </p>
          <p>
            • <strong>पारदर्शिता अस्वीकरण:</strong> यह एक प्रोटोटाइप निर्णय-सहायता स्कोर है, आधिकारिक सरकारी सलाह नहीं।
          </p>
        </div>
      )}

      {/* Real-time Current Weather & Soil Indicators Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-stone-50/30 border-b border-stone-100">
        {/* Temperature (with Min / Max) */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'तापमान' : 'Air Temp'}</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {currentWeather.temperatureC}°C
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            न्यून: {currentWeather.tempMinC ?? 18}° | अधि: {currentWeather.tempMaxC ?? 28}°C
          </div>
        </div>

        {/* Soil Temperature */}
        <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>{isHi ? 'मृदा तापमान' : 'Soil Temp (0-6cm)'}</span>
            <Layers className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-black text-stone-900">
            22.8°C
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {isHi ? 'अंकुरण हेतु अनुकूल' : 'Optimal germination'}
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
            {simulation.isActive ? 'फंगल रोग जोखिम' : 'सामान्य'}
          </div>
        </div>

        {/* Dynamic Sowing / Harvest Safety Score Gauge */}
        <div className={`p-3 rounded-xl border shadow-2xs ${
          focusMode === 'harvesting'
            ? (harvestScore?.totalScore || 85) >= 75
              ? 'bg-amber-50/70 border-amber-300'
              : (harvestScore?.totalScore || 85) >= 50
              ? 'bg-amber-100/70 border-amber-400'
              : 'bg-red-50/70 border-red-300'
            : sowingScore.totalScore >= 75
            ? 'bg-emerald-50/70 border-emerald-300'
            : sowingScore.totalScore >= 50
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-red-50/70 border-red-300'
        }`}>
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span className="font-bold">
              {focusMode === 'harvesting'
                ? (isHi ? 'कटाई सुरक्षा स्कोर' : 'Harvest Score')
                : (isHi ? 'बुवाई सुरक्षा स्कोर' : 'Sowing Score')}
            </span>
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
              focusMode === 'harvesting'
                ? (harvestScore?.totalScore || 85) >= 75
                  ? 'text-amber-900'
                  : 'text-red-700'
                : sowingScore.totalScore >= 75
                ? 'text-emerald-800'
                : sowingScore.totalScore >= 50
                ? 'text-amber-700'
                : 'text-red-700'
            }`}>
              {focusMode === 'harvesting' ? (harvestScore?.totalScore ?? 85) : sowingScore.totalScore}
            </span>
            <span className="text-xs text-stone-500 font-bold">/ 100</span>
          </div>
          <div className="text-[10px] font-bold mt-0.5 truncate text-stone-700">
            {focusMode === 'harvesting'
              ? (harvestScore?.verdictHi.split(' ')[0] || 'उत्तम')
              : sowingScore.verdictHi.split(' ')[0]}
          </div>
        </div>
      </div>

      {/* Problem 2.1 Explicit Safeguard Alert Banner: Seed Washout vs Wet Harvest Grain Quality */}
      <div className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 ${
        focusMode === 'harvesting'
          ? (harvestScore?.totalScore || 85) < 60 || simulation.isActive
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
          : sowingScore.totalScore < 60 || simulation.isActive
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-base shrink-0">
            {focusMode === 'harvesting' ? '🌾' : '🌱'}
          </span>
          <div>
            <span className="font-extrabold uppercase tracking-wide text-[10px] block opacity-80">
              {focusMode === 'harvesting'
                ? (isHi ? 'Problem 2.1: कटाई व गीले मौसम का दाना गुणवत्ता संरक्षण' : 'Problem 2.1: Harvest & Grain Quality Protection')
                : (isHi ? 'Problem 2.1: बेमौसम वर्षा व बीज बहाव/सड़न रोकथाम' : 'Problem 2.1: Sowing & Seed Washout Protection')}
            </span>
            <p className="text-xs font-semibold leading-relaxed mt-0.5">
              {focusMode === 'harvesting'
                ? simulation.isActive
                  ? '⚠️ भारी वर्षा अलर्ट: गीले मौसम में कटाई करने पर दाने में नमी > 14% पहुंचेगी, फफूंद व चमक खराब होगी। मंडी में ₹150–₹300/क्विंटल कटौती से बचने हेतु कटाई रोकें व कटी फसल ढंकें।'
                  : harvestScore?.grainQualityRiskHi || 'आगामी 3 दिन धूप खिली रहेगी। पकी फसल की कटाई व गहाई सुरक्षित रूप से की जा सकती है।'
                : simulation.isActive
                ? '⚠️ बीज सुरक्षा चेतावनी: 85 मिमी भारी बारिश से बीज बहने या सड़ने का खतरा! बुवाई टालने से प्रति एकड़ लगभग ₹2,400 का दोबारा बुवाई (Re-sowing) खर्च बचाया जा सकता है।'
                : sowingScore.washoutRotRiskHi || 'मौसम अनुकूल है। बीज के सही अंकुरण हेतु मिट्टी का तापमान व नमी आदर्श है।'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 font-bold text-[11px]">
          {focusMode === 'harvesting' ? (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 shadow-2xs">
              धूप के सुरक्षित दिन: <strong>{harvestScore?.dryingWindowDays ?? 3} दिन</strong>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 shadow-2xs">
              अनुशंसित अवधि: <strong>{sowingWindow.window}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Historical Chart + Sowing Calendar */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 10-Year Climate Graph & GDD (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  {isHi
                    ? '10-वर्षीय ऐतिहासिक जलवायु तुलना (2016–2025) बनाम 2026'
                    : '10-Year Historical Climate Baseline (2016–2025) vs 2026'}
                </h3>
                <p className="text-xs text-stone-500">
                  {isHi
                    ? `स्थान: ${location.nameHi} | मासिक वर्षा विसंगति: ${rainDiffPct}`
                    : `Station: ${location.nameEn} | Monthly Rainfall Anomaly: ${rainDiffPct}`}
                </p>
              </div>

              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                simulation.isActive
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {simulation.isActive ? 'अतिवृष्टि विसंगति' : 'सामान्य विचलन'}
              </div>
            </div>

            {/* Recharts chart or Low-Bandwidth Table */}
            {lowBandwidthMode ? (
              <div className="border border-stone-200 rounded-xl overflow-x-auto my-3 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 text-[11px]">
                      <th className="p-2 border-b">Month</th>
                      <th className="p-2 border-b">Hist Rain</th>
                      <th className="p-2 border-b">2026 Rain</th>
                      <th className="p-2 border-b">Hist Temp</th>
                      <th className="p-2 border-b">2026 Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {climateComparison.slice(0, 6).map((c, i) => (
                      <tr key={i} className="border-b hover:bg-stone-50">
                        <td className="p-2 font-bold">{c.monthOrDay}</td>
                        <td className="p-2">{c.historicalRainMm} mm</td>
                        <td className="p-2 text-blue-700 font-bold">{c.currentOrForecastRainMm} mm</td>
                        <td className="p-2">{c.historicalTempC}°C</td>
                        <td className="p-2 text-red-700 font-bold">{c.currentOrForecastTempC}°C</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
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
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar yAxisId="rain" dataKey="historicalRainMm" name={isHi ? 'ऐतिहासिक वर्षा (10-वर्ष औसत)' : 'Historical Rain (10y Avg)'} fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="rain" dataKey="currentOrForecastRainMm" name={isHi ? '2026 प्रेक्षित/पूर्वानुमान वर्षा' : '2026 Forecast Rain'} fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="temp" type="monotone" dataKey="historicalTempC" name={isHi ? 'ऐतिहासिक औसत तापमान' : 'Historical Avg Temp'} stroke="#f97316" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                    <Line yAxisId="temp" type="monotone" dataKey="currentOrForecastTempC" name={isHi ? '2026 तापमान' : '2026 Temperature'} stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
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
                  ? `खेत क्षेत्रफल: ${farmProfile.area} ${farmProfile.areaUnit === 'acres' ? 'एकड़' : 'हेक्टेयर'} • मिट्टी: ${farmProfile.soilType}`
                  : `Farm size: ${farmProfile.area} ${farmProfile.areaUnit} • Soil: ${farmProfile.soilType}`}
              </p>
            </div>

            {/* Historical Similarity Card */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
              <div className="flex items-center justify-between text-stone-500 font-semibold mb-1">
                <span>{isHi ? 'ऐतिहासिक मौसम समानता' : 'Historical Similarity'}</span>
                <span className="font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {simulation.isActive ? '94%' : '88%'} कोसाइन मिलान
                </span>
              </div>
              <p className="text-stone-800 font-bold text-xs mt-1">
                {simulation.isActive ? '2019 (अनपेक्षित चक्रवाती वर्षा)' : '2021 (सामान्य रबी सत्र)'}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {isHi
                  ? '*यह मौसम सदिशों का समानता सूचकांक है, भविष्य में तूफान आने की निश्चित प्रायिकता नहीं।'
                  : '*Computed vector similarity indicator, not storm probability.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sowing Calendar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                {viewDaysCount}-दिवसीय बुवाई उपयुक्तता कैलेंडर
              </h3>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {isHi ? 'अनुकूल' : 'Safe'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  {isHi ? 'सतर्क' : 'Caution'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  {isHi ? 'जोखिम' : 'Unsuitable'}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-3">
              {isHi
                ? 'दैनिक विवरण व उपयुक्तता जांचने के लिए किसी भी तिथि पर क्लिक करें:'
                : 'Click any date tile to view agronomic recommendations:'}
            </p>

            {/* Calendar tiles grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {displayedDays.map((day, idx) => {
                const isSelected = selectedCalendarDay?.date === day.date;
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
                    ? 'अतिवृष्टि के कारण बुवाई स्थगित रखें; खेत से जल निकासी के नालियां दुरुस्त करें।'
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
