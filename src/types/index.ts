export type Language = 'hi' | 'en';

export type CropId = 'wheat' | 'rice' | 'tomato';

export interface LocationConfig {
  id: string;
  nameEn: string;
  nameHi: string;
  state: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  soilType: string;
  primaryMandi: string;
}

export interface CropStage {
  id: string;
  nameEn: string;
  nameHi: string;
  daysRange: string;
  moistureReq: 'low' | 'moderate' | 'high';
  temperatureMin: number;
  temperatureMax: number;
}

export interface CropConfig {
  id: CropId;
  nameEn: string;
  nameHi: string;
  emoji: string;
  baseTempC: number; // For GDD calculation
  optimalGddToMaturity: number;
  optimalSoilTempMin: number;
  optimalSoilTempMax: number;
  optimalRootMoistureMin: number; // in %
  optimalRootMoistureMax: number; // in %
  stages: CropStage[];
  commonDiseases: {
    id: string;
    nameEn: string;
    nameHi: string;
    favorableTempMin: number;
    favorableTempMax: number;
    favorableHumidityMin: number;
    descriptionHi: string;
    preventionHi: string;
  }[];
  perishabilityDays: number;
  typicalYieldQuintalsPerAcre: number;
}

export interface CurrentWeather {
  temperatureC: number;
  apparentTempC: number;
  relativeHumidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  weatherCode: number;
  weatherDescriptionEn: string;
  weatherDescriptionHi: string;
  isSimulated?: boolean;
}

export interface CalendarDayAdvisory {
  date: string;
  dayOfWeekHi: string;
  dayOfWeekEn: string;
  tempMaxC: number;
  tempMinC: number;
  rainProbabilityPct: number;
  expectedRainMm: number;
  soilMoistureEstPct: number;
  suitability: 'green' | 'amber' | 'red' | 'gray';
  statusLabelEn: string;
  statusLabelHi: string;
  reasonEn: string;
  reasonHi: string;
  gddAccumulated: number;
}

export interface SoilTwinState {
  shallowMoisturePct: number; // 0-7 cm
  rootZoneMoisturePct: number; // 7-28 cm
  shallowTempC: number;
  rootZoneTempC: number;
  moistureStatus: 'dry' | 'optimal' | 'wet' | 'saturated';
  statusTextHi: string;
  irrigationRecommendation: 'stop' | 'delay' | 'irrigate_light' | 'irrigate_normal';
  irrigationReasonHi: string;
  motorState: 'SIMULATED_ON' | 'SIMULATED_OFF' | 'AUTO_OFF_RECOMMENDED' | 'MANUAL_OVERRIDE';
  motorAutoTriggered: boolean;
  pumpFlowRateLph: number;
  plannedHours: number;
  fuelConsumptionLph: number;
  dieselPriceInr: number;
  estimatedLitersSaved: number;
  estimatedInrSaved: number;
}

export interface ClimateComparisonData {
  monthOrDay: string;
  historicalRainMm: number;
  currentOrForecastRainMm: number;
  historicalTempC: number;
  currentOrForecastTempC: number;
}

export interface DiseaseRiskAssessment {
  cropId: CropId;
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  overallRiskScorePct: number;
  diseases: {
    diseaseId: string;
    nameEn: string;
    nameHi: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    riskScore: number;
    triggerFactors: string[];
    preventiveTipHi: string;
    preventiveTipEn: string;
  }[];
  outlook48hHi: string;
  limitationsHi: string;
}

export interface CropDiagnosisResult {
  possibleIssue: string;
  possibleIssueHi: string;
  alternativeExplanations: string[];
  visibleSymptoms: string[];
  confidenceCategory: 'High' | 'Medium' | 'Low' | 'Uncertain';
  confidenceScorePct: number;
  urgency: 'Immediate Action' | 'Monitor Within 48h' | 'Routine Care';
  recommendedNextSteps: string[];
  whenToContactKvk: string;
  kvkName: string;
  kvkContact: string;
  isSimulatedFallback?: boolean;
}

export interface MandiRecord {
  commodity: string;
  commodityHi: string;
  mandiName: string;
  state: string;
  arrivalDate: string;
  minPriceInr: number;
  maxPriceInr: number;
  modalPriceInr: number;
  unit: string; // e.g. "₹ / Quintal"
  priceTrend: { date: string; price: number }[];
  priceChangePctWeek: number;
}

export interface MandiDecision {
  recommendation: 'SELL_NOW' | 'WAIT_AND_MONITOR' | 'PARTIAL_SALE' | 'INSUFFICIENT_DATA';
  recommendationHi: string;
  summaryHi: string;
  summaryEn: string;
  keyDriversHi: string[];
  weatherRiskImpact: string;
  netProceedsScenario: {
    currentProceeds: number;
    scenarioProceeds: number;
    storageCostEst: number;
    netDifference: number;
  };
}

export interface FarmerPoolMember {
  id: string;
  name: string;
  village: string;
  crop: CropId;
  quantityQuintals: number;
  joinedAt: string;
  qualityGrade: 'A' | 'B' | 'Fair';
}

export interface BuyerInquiry {
  id: string;
  buyerName: string;
  buyerType: 'FPO Federation' | 'Agri Processor' | 'Wholesale Retailer';
  offeredPricePerQuintal: number;
  minQuantityQuintals: number;
  pickupLocation: string;
  paymentTerms: string;
  verifiedBuyer: boolean;
  contactPerson: string;
  noteHi: string;
}

export interface FarmerPoolState {
  poolName: string;
  crop: CropId;
  targetQuintals: number;
  currentQuintals: number;
  members: FarmerPoolMember[];
  isTargetReached: boolean;
  buyerInquiries: BuyerInquiry[];
  baselineMandiPrice: number;
  collectiveBonusInr: number;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  titleHi: string;
  titleEn: string;
  messageHi: string;
  messageEn: string;
  sourceModule: 'climate' | 'soil' | 'doctor' | 'mandi' | 'pool' | 'simulator';
  smsContentHi: string;
}

export interface SimulationState {
  isActive: boolean;
  forecastHorizonHours: number;
  simulatedRainfallMm: number;
  simulatedWindSpeedKmh: number;
  simulatedHumidityPct: number;
  description: string;
}
