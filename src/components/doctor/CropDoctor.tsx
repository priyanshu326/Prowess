import React, { useState, useRef } from 'react';
import {
  Stethoscope,
  Upload,
  Camera,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Volume2,
  PhoneCall,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  CropConfig,
  CropDiagnosisResult,
  CropId,
  DiseaseRiskAssessment,
  Language,
  LocationConfig,
  SimulationState,
} from '../../types';
import { SAMPLE_CROP_IMAGES, KVK_DIRECTORY } from '../../data/demoData';
import { analyzeCropPhoto } from '../../services/apiClient';

interface CropDoctorProps {
  location: LocationConfig;
  crop: CropConfig;
  language: Language;
  diseaseAssessment: DiseaseRiskAssessment;
  simulation: SimulationState;
  onSpeakText: (text: string) => void;
  isSpeaking: boolean;
}

export const CropDoctor: React.FC<CropDoctorProps> = ({
  location,
  crop,
  language,
  diseaseAssessment,
  simulation,
  onSpeakText,
  isSpeaking,
}) => {
  const isHi = language === 'hi';
  const [activeTab, setActiveTab] = useState<'radar' | 'diagnosis'>('radar');

  // Photo Diagnosis State
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_CROP_IMAGES[0].previewUrl);
  const [activeCropId, setActiveCropId] = useState<CropId>(crop.id);
  const [userSymptoms, setUserSymptoms] = useState<string>('पत्तियों पर पीली धारियां और पाउडर दिख रहा है');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<CropDiagnosisResult | null>(
    SAMPLE_CROP_IMAGES[0].fallbackDiagnosis
  );
  const [showKvkModal, setShowKvkModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle sample image click
  const handleSelectSample = (sample: (typeof SAMPLE_CROP_IMAGES)[0]) => {
    setSelectedImage(sample.previewUrl);
    setActiveCropId(sample.crop);
    setDiagnosisResult(sample.fallbackDiagnosis);
    setUserSymptoms(sample.descriptionHi);
  };

  // Handle local user image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल वैध फोटो (JPG, PNG, WEBP) अपलोड करें।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setSelectedImage(b64);
      setDiagnosisResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setSelectedImage(null);
    setDiagnosisResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger Gemini Vision AI analysis
  const handleRunAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const mime = selectedImage.startsWith('data:image/png')
        ? 'image/png'
        : selectedImage.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const res = await analyzeCropPhoto(
        selectedImage,
        mime,
        activeCropId,
        userSymptoms,
        location.nameEn
      );

      if (res && res.diagnosis) {
        setDiagnosisResult(res.diagnosis);
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setDiagnosisResult(SAMPLE_CROP_IMAGES[0].fallbackDiagnosis);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Speak diagnosis summary
  const handleSpeakDiagnosis = () => {
    if (!diagnosisResult) return;
    const speech = isHi
      ? `फसल डॉक्टर रिपोर्ट: संभावित रोग है ${diagnosisResult.possibleIssueHi}। मॉडल विश्वसनीयता: ${diagnosisResult.confidenceScorePct} प्रतिशत। संस्तुति: ${diagnosisResult.recommendedNextSteps.slice(0, 2).join('। ')}। रासायनिक छिड़काव से पहले कृषि वैज्ञानिक से पुष्टि करें।`
      : `Crop Doctor Report: Possible issue is ${diagnosisResult.possibleIssue}. Confidence: ${diagnosisResult.confidenceScorePct} percent. Preliminary AI assessment; expert confirmation recommended.`;
    onSpeakText(speech);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Module Header & Tabs */}
      <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
            <Stethoscope className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              {isHi
                ? 'फसल डॉक्टर एआई (Fasal Doctor AI)'
                : 'Fasal Doctor AI — Crop Health & Diagnosis'}
            </h2>
            <p className="text-xs text-stone-500">
              {isHi
                ? 'संभावित फसल समस्याओं की पहचान करें और अगले कदम समझें (Identify problems & next steps).'
                : 'Identify possible crop problems and understand the next steps.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {isHi ? '48-घंटे पूर्व-चेतावनी रडार' : 'Pre-Symptom Radar'}
          </button>
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'diagnosis'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isHi ? 'एआई फोटो जांच (Gemini)' : 'AI Photo Diagnosis'}</span>
          </button>
        </div>
      </div>

      {/* Problem 2.4 Explicit Safeguard Banner: Late Disease Detection & Specialist Access */}
      <div className="px-4 py-2.5 bg-rose-50/80 border-b border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 text-rose-950">
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-base shrink-0">🔬</span>
          <div>
            <span className="font-extrabold uppercase tracking-wide text-[10px] text-rose-900 block">
              {isHi ? 'Problem 2.4 समाधान: प्रारंभिक लक्षण-पूर्व पहचान व विशेषज्ञ सलाह' : 'Problem 2.4: Early Pre-Symptom Detection & Expert Access'}
            </span>
            <p className="text-[11px] font-semibold text-rose-950 leading-relaxed mt-0.5">
              {isHi
                ? 'कवक व जीवाणु पत्तियों पर धब्बे दिखने से 48–72 घंटे पहले ही नम मौसम में पनप जाते हैं। स्थानीय दुकानदार की मनमानी सलाह या अनुमान के बजाय मौसम-आधारित पूर्व चेतावनी और अधिकृत KVK वैज्ञानिकों से पुष्टि करें।'
                : 'Diseases establish before visible symptoms appear. Avoid delayed action, guesswork, or unverified shopkeeper advice with pre-symptom radar and direct KVK scientist access.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowKvkModal(true)}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-900 font-bold text-[11px] hover:bg-rose-100 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
        >
          <PhoneCall className="w-3 h-3 text-rose-700" />
          <span>{isHi ? 'KVK वैज्ञानिक निर्देशिका' : 'KVK Directory'}</span>
        </button>
      </div>

      {/* TAB A: 48-Hour Disease Risk Radar */}
      {activeTab === 'radar' && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Top Radar Overview Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            simulation.isActive || diseaseAssessment.overallRiskLevel === 'critical'
              ? 'bg-red-50 border-red-200 text-red-950'
              : diseaseAssessment.overallRiskLevel === 'high'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  simulation.isActive || diseaseAssessment.overallRiskLevel === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {simulation.isActive ? 'CRITICAL RISK (SIMULATED)' : `${diseaseAssessment.overallRiskLevel.toUpperCase()} RISK`}
                </span>
                <span className="text-xs font-semibold">
                  {crop.nameHi} रोग संवेदनशीलता सूचकांक
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {diseaseAssessment.outlook48hHi}
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0 bg-white/80 p-2.5 rounded-lg border border-stone-200">
              <span className="block text-[10px] text-stone-500 font-bold uppercase">{isHi ? 'समग्र जोखिम स्कोर' : 'Risk Index'}</span>
              <span className={`text-2xl font-black ${
                simulation.isActive ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {simulation.isActive ? '92%' : `${diseaseAssessment.overallRiskScorePct}%`}
              </span>
            </div>
          </div>

          {/* Disease Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {diseaseAssessment.diseases.map((d) => (
              <div key={d.diseaseId} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                      {d.nameHi}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      simulation.isActive || d.riskLevel === 'critical'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : d.riskLevel === 'high'
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {simulation.isActive ? 'उच्च जोखिम' : d.riskLevel}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    <span className="text-[10px] font-bold text-stone-400 block uppercase">
                      {isHi ? 'ट्रिगर कारक:' : 'Trigger Factors:'}
                    </span>
                    {d.triggerFactors.map((f, i) => (
                      <div key={i} className="text-[11px] text-stone-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60">
                  <span className="text-[10px] font-bold text-stone-500 block">
                    {isHi ? 'रोकथाम परामर्श:' : 'Preventive Guidance:'}
                  </span>
                  <p className="text-[11px] text-stone-700 mt-0.5 leading-relaxed">
                    {d.preventiveTipHi}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Radar Transparency Disclaimer */}
          <div className="p-3 bg-stone-100/70 rounded-xl text-stone-500 text-[11px] flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span>
              {diseaseAssessment.limitationsHi}
            </span>
          </div>
        </div>
      )}

      {/* TAB B: Multimodal Gemini AI Photo Diagnosis */}
      {activeTab === 'diagnosis' && (
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Selector & Input (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                {isHi ? 'त्वरित डेमो नमूना पत्ती चुनें:' : 'Test With Sample Photos:'}
              </span>

              {/* Sample Images Thumbnails */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {SAMPLE_CROP_IMAGES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedImage === sample.previewUrl
                        ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50/50'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                    }`}
                  >
                    <img
                      src={sample.previewUrl}
                      alt={sample.title}
                      className="w-full h-16 object-cover rounded-lg mb-1"
                    />
                    <div className="text-[10px] font-bold text-stone-800 line-clamp-1">
                      {sample.title.split(':')[0]}
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Image Preview & Upload Input */}
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-3 text-center bg-stone-50/50 relative overflow-hidden">
                {selectedImage ? (
                  <div className="relative group">
                    <img
                      src={selectedImage}
                      alt="Crop specimen"
                      className="w-full h-44 object-cover rounded-lg shadow-2xs"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={handleRemovePhoto}
                        className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer shadow-sm"
                        title="हटाएं / Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-xs text-stone-600 font-medium">
                      {isHi ? 'खेत से फसल की पत्ती की फोटो अपलोड करें' : 'Upload crop leaf image'}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">JPG, PNG, WEBP (अधिकतम 10MB)</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-stone-500" />
                    {isHi ? 'गैलरी / कैमरा से चुनें' : 'Upload File / Camera'}
                  </button>
                </div>
              </div>

              {/* Crop Selector & Symptoms */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    {isHi ? 'फसल:' : 'Crop:'}
                  </label>
                  <select
                    value={activeCropId}
                    onChange={(e) => setActiveCropId(e.target.value as CropId)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="wheat">गेहूं (Wheat)</option>
                    <option value="rice">धान (Paddy)</option>
                    <option value="tomato">टमाटर (Tomato)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    {isHi ? 'लक्षण विवरण (Symptoms):' : 'Observed Symptoms:'}
                  </label>
                  <input
                    type="text"
                    value={userSymptoms}
                    onChange={(e) => setUserSymptoms(e.target.value)}
                    placeholder="पत्तियों पर धब्बे या पीलापन..."
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Run Analysis Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !selectedImage}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isHi ? 'जेमिनी एआई विश्लेषण जारी है...' : 'Gemini AI Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{isHi ? 'फसल डॉक्टर से जांचें (Run Diagnosis)' : 'Run Diagnosis'}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Structured AI Diagnosis Output (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            {diagnosisResult ? (
              <div className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Diagnosis Title & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        {isHi ? 'पहचाना गया रोग / विकार' : 'Detected Issue'}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1">
                        {isHi ? diagnosisResult.possibleIssueHi : diagnosisResult.possibleIssue}
                      </h3>
                      <p className="text-xs text-stone-500 italic">
                        Possible issue: {diagnosisResult.possibleIssue}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                        Model Confidence: {diagnosisResult.confidenceScorePct}%
                      </span>
                      <span className="block text-[10px] font-bold text-red-600 mt-1">
                        {diagnosisResult.urgency}
                      </span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-semibold mb-3">
                    Status: Preliminary AI assessment; expert confirmation recommended before applying any chemical spray.
                  </div>

                  {/* Observed Symptoms & Alternative Explanations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs">
                      <span className="font-bold text-stone-800 block mb-1">
                        {isHi ? 'प्रत्यक्ष लक्षण (Visible Symptoms):' : 'Visible Symptoms:'}
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-600 text-[11px]">
                        {diagnosisResult.visibleSymptoms.map((sym, i) => (
                          <li key={i}>{sym}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs">
                      <span className="font-bold text-stone-800 block mb-1">
                        {isHi ? 'वैकल्पिक कारण (Alternative Causes):' : 'Alternative Causes:'}
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-600 text-[11px]">
                        {diagnosisResult.alternativeExplanations.map((alt, i) => (
                          <li key={i}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Next Steps & Low-Risk Measures */}
                  <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs mb-3">
                    <span className="font-bold text-stone-800 block mb-1">
                      {isHi ? 'प्राथमिक सुरक्षित कदम व रोकथाम (Next Steps):' : 'Immediate Low-Risk Steps:'}
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-stone-700 text-[11px] leading-relaxed">
                      {diagnosisResult.recommendedNextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Bottom Controls: Voice & KVK verification */}
                <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={handleSpeakDiagnosis}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isSpeaking ? (isHi ? 'वाचन चल रहा है...' : 'Speaking...') : isHi ? 'जांच रिपोर्ट सुनें' : 'Listen Report'}</span>
                  </button>

                  <button
                    onClick={() => setShowKvkModal(true)}
                    className="text-xs text-stone-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isHi ? 'सत्यापित KVK वैज्ञानिक से संपर्क करें' : 'Contact KVK Expert'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center border-2 border-dashed border-stone-200 rounded-xl">
                <div>
                  <Stethoscope className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500 font-medium">
                    {isHi ? 'जांच शुरू करने के लिए फोटो चुनें और "फसल डॉक्टर से जांचें" पर क्लिक करें।' : 'Select a photo and click Run Diagnosis.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KVK Directory Modal */}
      {showKvkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-stone-200 animate-scaleIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-stone-900 text-base">
                  {isHi ? 'सत्यापित कृषि विज्ञान केंद्र (KVK) निर्देशिका' : 'Official Krishi Vigyan Kendra Directory'}
                </h3>
              </div>
              <button
                onClick={() => setShowKvkModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-3">
              {KVK_DIRECTORY.map((kvk, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                  <div className="font-bold text-stone-900 mb-0.5">{kvk.name}</div>
                  <div className="text-stone-500 text-[11px] mb-1.5">{kvk.address}</div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-800">
                    <PhoneCall className="w-3 h-3 text-emerald-600" />
                    <span>{kvk.phone}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    {kvk.leadScientist}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500">
              *किसान कॉल सेंटर राष्ट्रीय टोल फ्री नंबर: <strong>1800-180-1551</strong> (सुबह 6:00 से रात 10:00 तक)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
