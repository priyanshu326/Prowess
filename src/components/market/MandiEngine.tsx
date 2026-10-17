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
}

export const MandiEngine: React.FC<MandiEngineProps> = ({
  crop,
  language,
  mandiData,
  weather,
  simulation,
  mandiDecision,
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
                ? 'मंडी निर्णय इंजन — "अभी बेचूं या रुकूं?"'
                : 'Mandi Decision Engine — "Sell Now or Hold?"'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'एगमार्कनेट सरकारी भाव, मौसम जोखिम और मूल्य प्रवृत्तियों का संयुक्त विश्लेषण'
                : 'Agmarknet wholesale mandi prices coupled with rainfall exposure risk'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {isHi ? 'एगमार्कनेट सत्यापित भाव' : 'Agmarknet Validated'}
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
                <h3 className="font-black text-stone-900 text-base sm:text-lg">
                  {isHi ? mandiData.commodityHi : mandiData.commodity}
                </h3>
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

            {/* Recharts Price Trend (7 Days) */}
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
          </div>

          <div className="text-[10px] text-stone-400">
            *डेटा स्रोत: Agmarknet API / राष्ट्रीय कृषि बाजार (e-NAM)। भाव केवल संदर्भ हेतु हैं।
          </div>
        </div>

        {/* Right Column: Explainable Decision & Net Proceeds Calculator (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          {/* Decision Verdict Banner */}
          <div className={`p-4 rounded-xl border transition-all ${
            simulation.isActive || mandiDecision.recommendation === 'SELL_NOW'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
              : mandiDecision.recommendation === 'WAIT_AND_MONITOR'
              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {isHi ? 'कृषि अर्थशास्त्र परामर्श' : 'Agronomic Decision Engine'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide border ${
                simulation.isActive || mandiDecision.recommendation === 'SELL_NOW'
                  ? 'bg-amber-100 text-amber-900 border-amber-400'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-400'
              }`}>
                {mandiDecision.recommendationHi}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug mb-2">
              {mandiDecision.summaryHi}
            </p>

            {/* Decision Key Drivers */}
            <div className="space-y-1 mb-2">
              <span className="text-[10px] font-bold text-stone-500 uppercase block">
                {isHi ? 'निर्णय के मुख्य आधार (Key Drivers):' : 'Key Drivers:'}
              </span>
              {mandiDecision.keyDriversHi.map((driver, i) => (
                <div key={i} className="text-[11px] text-stone-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" />
                  <span>{driver}</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-stone-600 bg-white/70 p-2 rounded-lg border border-stone-200">
              <strong>{isHi ? 'मौसम जोखिम प्रभाव: ' : 'Weather Risk: '}</strong>
              {mandiDecision.weatherRiskImpact}
            </div>
          </div>

          {/* Net Proceeds Interactive Calculator */}
          <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-700" />
                {isHi ? 'शुद्ध आय तुलना सिम्युलेटर (Net Proceeds Calculator)' : 'Net Proceeds Simulator'}
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
                <span className="font-extrabold text-stone-800">{quantityQuintals} क्विंटल (Quintals)</span>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 block mb-1">
                  {isHi ? 'रुकने पर काल्पनिक भाव बदलाव:' : 'Hypothetical Price Shift:'}
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
                  {isHi ? 'रुकने पर अनुमानित शुद्ध आय (भंडारण काटकर):' : 'Holding (Net of Storage):'}
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
