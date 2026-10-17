import React, { useState } from 'react';
import {
  TrendingUp,
  Store,
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Coins,
  Clock,
  HelpCircle as QuestionIcon,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  CropConfig,
  CurrentWeather,
  Language,
  MandiDecision,
  MandiRecord,
  SimulationState,
} from '../../types';

interface MandiEngineProps {
  crop: CropConfig;
  language: Language;
  mandiData: MandiRecord;
  weather: CurrentWeather;
  simulation: SimulationState;
  mandiDecision: MandiDecision;
  lowBandwidthMode: boolean;
}

export const MandiEngine: React.FC<MandiEngineProps> = ({
  crop,
  language,
  mandiData,
  weather,
  simulation,
  mandiDecision,
  lowBandwidthMode,
}) => {
  const isHi = language === 'hi';

  // Interactive quantity slider for net proceeds
  const [quantityQuintals, setQuantityQuintals] = useState<number>(30);
  const [hypotheticalPriceChangePct, setHypotheticalPriceChangePct] = useState<number>(5);

  const currentRevenue = Math.round(quantityQuintals * mandiData.modalPriceInr);
  const storageCostEst = Math.round(quantityQuintals * 10); // ₹10/q storage & handling
  const simulatedFuturePrice = Math.round(
    mandiData.modalPriceInr * (1 + hypotheticalPriceChangePct / 100)
  );
  const futureRevenue = Math.round(quantityQuintals * simulatedFuturePrice);
  const futureNetProceeds = futureRevenue - storageCostEst;
  const netGainOrLoss = futureNetProceeds - currentRevenue;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Store className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'मंडी भाव और बिक्री सलाह (Mandi Bhav aur Bikri Salah)'
                : 'Mandi Bhav aur Bikri Salah — Market & Weather Decision Engine'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'बाजार के अवसरों और आगामी मौसम जोखिम की तुलना करें (Compare market opportunities with weather risk).'
                : 'Compare market opportunities with upcoming weather risk.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Agmarknet DMI Verified
          </span>
          <span className="text-[10px] text-stone-400">
            {mandiData.lastUpdated || '17 Oct 2026, 09:30 AM'}
          </span>
        </div>
      </div>

      {/* Prominent Question Headline Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-teal-800 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl">⚖️</span>
          <div>
            <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider block">
              मुख्य कृषि-आर्थिक प्रश्न (Core Decision Question)
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              “Abhi Bechein ya 5 Din Rukein?” (अभी बेचें या 5 दिन रुकें?)
            </h3>
          </div>
        </div>

        <div className="shrink-0">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide border shadow-sm ${
            mandiDecision.recommendation === 'PRIORITIZE_STORAGE_SAFETY'
              ? 'bg-red-500 text-white border-red-300 animate-pulse'
              : mandiDecision.recommendation === 'CONSIDER_WAITING_MONITOR'
              ? 'bg-amber-400 text-stone-900 border-amber-200'
              : 'bg-emerald-400 text-stone-950 border-emerald-300'
          }`}>
            {mandiDecision.recommendationHi}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Price Tiles, Trend Chart & Mandi Details (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            {/* Mandi Name & Arrival */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold text-stone-500 block uppercase">
                  {mandiData.mandiName}
                </span>
                <h4 className="font-black text-stone-900 text-base sm:text-lg">
                  {isHi ? mandiData.commodityHi : mandiData.commodity}
                </h4>
              </div>
              <span className="text-xs text-stone-400">
                {mandiData.arrivalDate}
              </span>
            </div>

            {/* Price Tiles Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <span className="text-[10px] text-stone-500 font-bold block">{isHi ? 'न्यूनतम भाव' : 'Min Price'}</span>
                <span className="text-sm sm:text-base font-extrabold text-stone-800">
                  ₹ {mandiData.minPriceInr.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-300 text-center">
                <span className="text-[10px] text-emerald-800 font-bold block">{isHi ? 'मॉडल भाव (औसत)' : 'Modal Price'}</span>
                <span className="text-base sm:text-lg font-black text-emerald-900">
                  ₹ {mandiData.modalPriceInr.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-emerald-700 block font-medium">/ क्विंटल</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <span className="text-[10px] text-stone-500 font-bold block">{isHi ? 'अधिकतम भाव' : 'Max Price'}</span>
                <span className="text-sm sm:text-base font-extrabold text-stone-800">
                  ₹ {mandiData.maxPriceInr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Price Trend: Chart or Low-Bandwidth Table */}
            {lowBandwidthMode ? (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs mb-3">
                <span className="font-bold text-stone-800 block mb-1">
                  7-दिवसीय भाव तालिका (Low-Bandwidth Mode):
                </span>
                <div className="grid grid-cols-4 gap-1 text-[11px] text-stone-600">
                  {mandiData.priceTrend.slice(-4).map((pt, i) => (
                    <div key={i} className="p-1.5 bg-white rounded border border-stone-200 text-center">
                      <div className="text-[10px] text-stone-400">{pt.date}</div>
                      <div className="font-bold text-stone-900">₹{pt.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-stone-50/50 rounded-xl border border-stone-200/70 mb-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                  <span>{isHi ? '7-दिवसीय मंडी भाव प्रवृत्ति' : '7-Day Price Trend'}</span>
                  <span className={`text-[11px] font-extrabold ${mandiData.priceChangePctWeek >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {mandiData.priceChangePctWeek >= 0 ? `+${mandiData.priceChangePctWeek}%` : `${mandiData.priceChangePctWeek}%`} (साप्ताहिक)
                  </span>
                </div>

                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mandiData.priceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#166534" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                        }}
                        formatter={(val: any) => [`₹ ${Number(val || 0).toLocaleString('en-IN')} / क्विंटल`, 'मॉडल भाव']}
                      />
                      <Area type="monotone" dataKey="price" stroke="#166534" strokeWidth={2.5} fillOpacity={1} fill="url(#priceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-stone-400 mt-2">
            *डेटा स्रोत: {mandiData.source || 'Agmarknet / DMI Government of India'} • अंतिम अद्यतन: {mandiData.lastUpdated || 'आज 09:30 AM'}
          </div>
        </div>

        {/* Right Column: Explainable Decision Details & Net Proceeds Calculator (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          {/* Decision Verdict Detailed Box */}
          <div className={`p-4 rounded-xl border transition-all ${
            mandiDecision.recommendation === 'PRIORITIZE_STORAGE_SAFETY'
              ? 'bg-gradient-to-br from-red-50 to-amber-50 border-red-300'
              : mandiDecision.recommendation === 'CONSIDER_WAITING_MONITOR'
              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug mb-2.5">
              {mandiDecision.summaryHi}
            </p>

            {/* Structured Transparency Fields */}
            <div className="space-y-2 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800 block text-[11px] mb-0.5">
                  ❓ यह सिफारिश क्यों? (Why this recommendation?):
                </span>
                <p className="text-stone-600 text-[11px]">{mandiDecision.whyThisRecommendation}</p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800 block text-[11px] mb-0.5">
                  🔄 यह निर्णय कब बदल सकता है? (What could change this decision?):
                </span>
                <p className="text-stone-600 text-[11px]">{mandiDecision.whatCouldChangeDecision}</p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-lg border border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                <span>उपयोग किया गया डेटा: <strong>{mandiDecision.dataUsed}</strong></span>
              </div>
            </div>
          </div>

          {/* Net Proceeds Interactive Calculator */}
          <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-700" />
                {isHi ? 'शुद्ध आय तुलना संगणक (Net Proceeds Calculator)' : 'Net Proceeds Simulator'}
              </span>
              <span className="text-[10px] text-stone-400">
                भंडारण खर्च: ₹10/क्विंटल
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'उपज मात्रा (क्विंटल):' : 'Quantity (Quintals):'}
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={quantityQuintals}
                  onChange={(e) => setQuantityQuintals(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="font-extrabold text-stone-800">{quantityQuintals} क्विंटल</span>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? '5 दिन रुकने पर संभावित भाव बदलाव:' : 'Hypothetical Price Shift:'}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={hypotheticalPriceChangePct}
                  onChange={(e) => setHypotheticalPriceChangePct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className={`font-extrabold ${hypotheticalPriceChangePct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {hypotheticalPriceChangePct >= 0 ? `+${hypotheticalPriceChangePct}%` : `${hypotheticalPriceChangePct}%`} (₹ {simulatedFuturePrice}/q)
                </span>
              </div>
            </div>

            {/* Calculations Outcome */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200/80">
              <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-medium">
                  {isHi ? 'आज बेचने पर कुल राशि:' : 'Selling Today:'}
                </span>
                <span className="text-base font-black text-stone-900">
                  ₹ {currentRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                <span className="text-[10px] text-stone-500 block font-medium">
                  {isHi ? '5 दिन रुकने पर शुद्ध आय (भंडारण काटकर):' : 'Holding (Net of Storage):'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-stone-900">
                    ₹ {futureNetProceeds.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-[10px] font-bold ${netGainOrLoss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    ({netGainOrLoss >= 0 ? `+₹${netGainOrLoss.toLocaleString('en-IN')}` : `-₹${Math.abs(netGainOrLoss).toLocaleString('en-IN')}`})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
