import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  Building,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Truck,
  Check,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { BuyerInquiry, CropConfig, CropId, FarmerPoolMember, Language } from '../../types';
import { DEMO_BUYER_INQUIRIES, INITIAL_FARMER_POOL_MEMBERS } from '../../data/demoData';
import { joinFarmerPool } from '../../services/apiClient';

interface KisaanPoolProps {
  crop: CropConfig;
  language: Language;
}

export const KisaanPool: React.FC<KisaanPoolProps> = ({ crop, language }) => {
  const isHi = language === 'hi';

  const [members, setMembers] = useState<FarmerPoolMember[]>(INITIAL_FARMER_POOL_MEMBERS);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [farmerName, setFarmerName] = useState<string>('राजेश कुमार (Rajesh Kumar)');
  const [selectedCropId, setSelectedCropId] = useState<CropId>(crop.id);
  const [villageName, setVillageName] = useState<string>('करनाल सदर (संग्रहण केंद्र: कुंजपुरा)');
  const [quantity, setQuantity] = useState<number>(15); // Default 15 quintals to hit 100 quintals
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B'>('A');
  const [contactPreference, setContactPreference] = useState<'SMS' | 'WhatsApp' | 'Call'>('SMS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [celebrationSuccess, setCelebrationSuccess] = useState<boolean>(false);

  const targetQuintals = 100;
  const currentQuintals = members.reduce((sum, m) => sum + m.quantityQuintals, 0);
  const remainingQuintals = Math.max(0, targetQuintals - currentQuintals);
  const progressPct = Math.min(100, Math.round((currentQuintals / targetQuintals) * 100));
  const isTargetReached = currentQuintals >= targetQuintals;

  // Intermediary cost comparison formula & assumptions
  const baselineIntermediaryRate = 2420;
  const bulkBuyerDirectRate = 2540;
  const unitGain = bulkBuyerDirectRate - baselineIntermediaryRate;
  const collectiveBonus = Math.round(currentQuintals * unitGain);

  const handleJoinPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      await joinFarmerPool({
        name: farmerName,
        village: villageName,
        crop: selectedCropId,
        quantityQuintals: quantity,
        qualityGrade,
      });

      const newMember: FarmerPoolMember = {
        id: String(Date.now()),
        name: farmerName,
        village: villageName,
        crop: selectedCropId,
        quantityQuintals: quantity,
        joinedAt: 'अभी-अभी (Just now)',
        qualityGrade,
      };

      setMembers([newMember, ...members]);
      setShowJoinModal(false);
      setCelebrationSuccess(true);
    } catch (_err) {
      const newMember: FarmerPoolMember = {
        id: String(Date.now()),
        name: farmerName,
        village: villageName,
        crop: selectedCropId,
        quantityQuintals: quantity,
        joinedAt: 'अभी-अभी',
        qualityGrade,
      };
      setMembers([newMember, ...members]);
      setShowJoinModal(false);
      setCelebrationSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'किसान पूल — मिलकर बेचें (Kisan Pool — Milkar Bechein)'
                : 'Kisan Pool — Milkar Bechein (Collective Selling & FPO)'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'उपज एकत्रीकरण से मोलभाव की शक्ति बढ़ाएं और खरीदारों से जुड़ें (Combine produce, improve bargaining).'
                : 'Combine produce, improve bargaining opportunities, and connect with buyers.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowJoinModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isHi ? '+ अपनी उपज जोड़ें' : 'Add My Produce'}</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pool Progress & Collective Bonus (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            {/* Pool Status & Target Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-emerald-800">
                  करनाल किसान उत्पादक संघ (Karnal FPO Pool)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  isTargetReached
                    ? 'bg-emerald-600 text-white animate-bounce'
                    : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {isTargetReached ? '100% लक्ष्य पूर्ण!' : `${progressPct}% पूर्ण`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-emerald-200 rounded-full h-4 overflow-hidden mb-2">
                <div
                  className="bg-emerald-600 h-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-700 font-semibold">
                <span>
                  वर्तमान एकत्र: <strong>{currentQuintals} क्विंटल</strong> ({members.length} किसान)
                </span>
                <span>
                  लक्ष्य: <strong>{targetQuintals} क्विंटल</strong> (शेष: <strong>{remainingQuintals} क्विंटल</strong>)
                </span>
              </div>
            </div>

            {/* Target Reached Success Callout */}
            {isTargetReached && (
              <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-md mb-4 animate-scaleIn flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">
                    {isHi ? 'पूल 100 क्विंटल लक्ष्य पूर्ण — थोक बोलियां सक्रिय!' : 'Pool Target Completed — Bulk Enquiries Unlocked!'}
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {isHi
                      ? 'सामूहिक सौदे से सभी किसानों को ₹120/क्विंटल का अतिरिक्त प्रीमियम लाभ मिलेगा।'
                      : 'Collective bargaining unlocks ₹120/q premium over local intermediary.'}
                  </p>
                </div>
              </div>
            )}

            {/* Aggregation Financial Benefit Comparison & Formula */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs mb-3">
              <span className="font-bold text-stone-800 block mb-1">
                {isHi ? 'मध्यस्थ लागत बचत तुलना सूत्र (Intermediary Cost Comparison):' : 'Intermediary Savings Formula:'}
              </span>
              <div className="p-2 bg-white rounded border border-stone-200 font-mono text-[11px] text-stone-700 mb-2">
                बचत = एकत्र मात्रा ({currentQuintals} q) × (थोक खरीदार भाव ₹{bulkBuyerDirectRate} − स्थानीय बिचौलिया दर ₹{baselineIntermediaryRate})
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-stone-200">
                  <span className="block text-[10px] text-stone-400">{isHi ? 'स्थानीय बिचौलिया दर' : 'Intermediary Rate'}</span>
                  <span className="font-bold text-stone-800">₹ {baselineIntermediaryRate}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-300">
                  <span className="block text-[10px] text-emerald-700 font-bold">{isHi ? 'सीधा FPO थोक भाव' : 'Bulk Buyer Rate'}</span>
                  <span className="font-bold text-emerald-800">₹ {bulkBuyerDirectRate}</span>
                </div>
                <div className="bg-emerald-100/70 p-2 rounded-lg border border-emerald-300">
                  <span className="block text-[10px] text-emerald-900 font-bold">{isHi ? 'कुल सामूहिक बचत' : 'Collective Gain'}</span>
                  <span className="font-extrabold text-emerald-900">+₹ {collectiveBonus.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-400">
              *प्रारंभिक डेमो स्थिति: 14 किसान, 85 क्विंटल। 15 क्विंटल जोड़ने पर 100 क्विंटल लक्ष्य पूर्ण होता है।
            </div>
          </div>

          {/* Members list */}
          <div className="mt-4 pt-3 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-700 block mb-2">
              {isHi ? `पूल में शामिल किसान (${members.length}):` : `Participating Farmers (${members.length}):`}
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {members.slice(0, 5).map((m) => (
                <div key={m.id} className="p-2 rounded-lg bg-stone-50 border border-stone-200/60 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-800">{m.name}</span>
                    <span className="text-stone-400 text-[10px] ml-1.5">({m.village})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-emerald-700">{m.quantityQuintals} क्विंटल</span>
                    <span className="text-[10px] text-stone-400">{m.joinedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Buyer Interest Panel (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                {isHi ? 'संभावित FPO व खरीदार संपर्क (Demonstration Buyers):' : 'Potential FPO & Buyer Connections:'}
              </span>
              <span className="text-[10px] text-stone-400">
                Sample Profiles
              </span>
            </div>

            {/* Buyer Cards */}
            <div className="space-y-3">
              {DEMO_BUYER_INQUIRIES.map((buyer) => (
                <div
                  key={buyer.id}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:border-emerald-300 transition-colors text-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 text-sm">
                          {buyer.buyerName}
                        </span>
                        {buyer.verifiedBuyer && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium">
                        {buyer.buyerType} • {buyer.pickupLocation}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-emerald-800">
                        ₹ {buyer.offeredPricePerQuintal}
                      </span>
                      <span className="text-[10px] text-stone-400 block">/ क्विंटल</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-600 mb-2">
                    {buyer.noteHi}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-200/70">
                    <span className="text-stone-500">
                      भुगतान: <strong>{buyer.paymentTerms}</strong>
                    </span>
                    <button
                      onClick={() => alert(`पूछताछ दर्ज: ${buyer.buyerName} को 100 क्विंटल का FPO लॉट भेजा गया।`)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] cursor-pointer"
                    >
                      {isHi ? 'रुचि दर्ज करें' : 'Express Interest'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-stone-100 rounded-lg text-[10px] text-stone-500">
            *अस्वीकरण: हैकाथॉन प्रोटोटाइप में प्रदर्शित खरीदार प्रविष्टियां केवल प्रदर्शन परिदृश्य हैं और वास्तविक खरीद अनुबंध नहीं हैं।
          </div>
        </div>
      </div>

      {/* Add Produce Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-stone-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-black text-stone-900 text-base">
                {isHi ? 'किसान समूह में अपनी उपज जोड़ें' : 'Add My Produce to Pool'}
              </h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinPool} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isHi ? 'किसान का नाम (Farmer Name):' : 'Farmer Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isHi ? 'फसल:' : 'Crop:'}
                  </label>
                  <select
                    value={selectedCropId}
                    onChange={(e) => setSelectedCropId(e.target.value as CropId)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="wheat">गेहूं (Wheat)</option>
                    <option value="rice">धान (Paddy)</option>
                    <option value="tomato">टमाटर (Tomato)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    {isHi ? 'मात्रा (क्विंटल):' : 'Quantity (Quintals):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                    (15 जोड़ने पर 100 क्विंटल का लक्ष्य पूर्ण होगा)
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isHi ? 'गाँव / संग्रहण केंद्र (Village / Collection Hub):' : 'Village / Collection Location:'}
                </label>
                <input
                  type="text"
                  required
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  {isHi ? 'संपर्क प्राथमिकता (Contact Preference):' : 'Contact Preference:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SMS', 'WhatsApp', 'Call'] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setContactPreference(pref)}
                      className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                        contactPreference === pref
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-md transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (isHi ? 'जोड़ा जा रहा है...' : 'Adding...') : isHi ? 'पूल में दर्ज करें (+15 क्विंटल)' : 'Confirm & Add to Pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
