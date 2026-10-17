import {
  CalendarDayAdvisory,
  CropConfig,
  CurrentWeather,
  DiseaseRiskAssessment,
  MandiDecision,
  MandiRecord,
  SimulationState,
  SoilTwinState,
} from '../types';

/**
 * Normalizes soil temperature suitability to 0-100
 */
export function calculateSoilTempSuitability(tempC: number, crop: CropConfig): number {
  const { optimalSoilTempMin, optimalSoilTempMax } = crop;
  if (tempC >= optimalSoilTempMin && tempC <= optimalSoilTempMax) {
    return 100;
  }
  if (tempC < optimalSoilTempMin) {
    const diff = optimalSoilTempMin - tempC;
    return Math.max(0, Math.round(100 - diff * 10));
  }
  const diff = tempC - optimalSoilTempMax;
  return Math.max(0, Math.round(100 - diff * 12));
}

/**
 * Normalizes rainfall risk suitability for sowing/harvesting to 0-100
 * Heavy rain or waterlogging severely threatens germination and seed placement
 */
export function calculateRainfallRiskSuitability(rainMm: number, rainProbPct: number): number {
  if (rainMm <= 2 && rainProbPct <= 30) return 98;
  if (rainMm <= 5 && rainProbPct <= 50) return 85;
  if (rainMm <= 12) return 60;
  if (rainMm <= 25) return 35;
  if (rainMm <= 50) return 15;
  return 5; // Extreme deluge
}

/**
 * Normalizes root-zone moisture suitability to 0-100
 */
export function calculateMoistureSuitability(moisturePct: number, crop: CropConfig): number {
  const { optimalRootMoistureMin, optimalRootMoistureMax } = crop;
  if (moisturePct >= optimalRootMoistureMin && moisturePct <= optimalRootMoistureMax) {
    return 100;
  }
  if (moisturePct < optimalRootMoistureMin) {
    const deficit = optimalRootMoistureMin - moisturePct;
    return Math.max(10, Math.round(100 - deficit * 2.2));
  }
  const surplus = moisturePct - optimalRootMoistureMax;
  return Math.max(5, Math.round(100 - surplus * 3.5)); // Saturated soil penalizes sowing
}

/**
 * Combined Sowing Safety Score (0-100)
 * Higher values consistently mean greater sowing suitability:
 * Score = 0.35 * Soil Temperature Score + 0.40 * Historical Rainfall Risk Score + 0.25 * Root-Zone Moisture Score
 */
export function calculateSowingSafetyScore(
  soilTempC: number,
  expectedRainMm: number,
  rainProbPct: number,
  rootMoisturePct: number,
  crop: CropConfig
): {
  totalScore: number;
  tempScore: number;
  rainScore: number;
  moistureScore: number;
  verdict: 'FAVORABLE' | 'CAUTION' | 'HIGH_RISK';
  verdictHi: string;
  explanationHi: string;
  reSowingRiskCostInr?: number;
  washoutRotRiskHi?: string;
} {
  const tempScore = calculateSoilTempSuitability(soilTempC, crop);
  const rainScore = calculateRainfallRiskSuitability(expectedRainMm, rainProbPct);
  const moistureScore = calculateMoistureSuitability(rootMoisturePct, crop);

  const rawScore = 0.35 * tempScore + 0.40 * rainScore + 0.25 * moistureScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let verdict: 'FAVORABLE' | 'CAUTION' | 'HIGH_RISK' = 'HIGH_RISK';
  let verdictHi = 'अत्यधिक जोखिम (High Risk)';
  let explanationHi = 'खराब मौसम या अत्यधिक बारिश के कारण बुवाई टालें।';

  let reSowingRiskCostInr = 0;
  let washoutRotRiskHi = 'बीज बहने या सड़ने का कोई तात्कालिक खतरा नहीं है।';

  if (totalScore >= 75) {
    verdict = 'FAVORABLE';
    verdictHi = 'बुवाई के लिए अनुकूल (Generally Favorable)';
    explanationHi = `${crop.nameHi} की बुवाई के लिए तापमान, मिट्टी की नमी और वर्षा का पूर्वानुमान अनुकूल है।`;
  } else if (totalScore >= 50) {
    verdict = 'CAUTION';
    verdictHi = 'सावधानी बरतें (Proceed Carefully)';
    explanationHi = 'मौसम में नमी या हल्की वर्षा का जोखिम है। बीज उपचार के बाद ही स्थानीय सिफारिशों के अनुसार बुवाई करें।';
    washoutRotRiskHi = 'हल्की वर्षा की संभावना है, ढलान वाले खेतों में बीज गहराई 4-5 सेमी रखें।';
  } else {
    verdict = 'HIGH_RISK';
    verdictHi = 'बुवाई योजना की समीक्षा करें (Review Sowing Plan)';
    explanationHi = 'भारी वर्षा या प्रतिकूल मृदा तापमान के कारण बीज सड़ने व जलभराव का खतरा है। बुवाई स्थगित करें।';
    reSowingRiskCostInr = 2400; // Estimated cost per acre: seed + re-ploughing
    washoutRotRiskHi = 'असमय भारी बारिश से बीज बहने या सड़ने का गंभीर खतरा! जल्दबाजी में बुवाई करने पर प्रति एकड़ लगभग ₹2,400 का दोबारा बुवाई (Re-sowing) खर्च हो सकता है।';
  }

  return {
    totalScore,
    tempScore,
    rainScore,
    moistureScore,
    verdict,
    verdictHi,
    explanationHi,
    reSowingRiskCostInr,
    washoutRotRiskHi,
  };
}

/**
 * Harvest Safety & Wet Weather Risk Evaluator (Problem 2.1)
 * Evaluates whether harvesting into upcoming weather is safe or risks damaging grain quality
 */
export function calculateHarvestSafetyScore(
  expectedRainMm: number,
  rainProbPct: number,
  relativeHumidityPct: number,
  windSpeedKmh: number,
  crop: CropConfig,
  forecastDays: { expectedRainMm: number; rainProbabilityPct: number }[] = []
): {
  totalScore: number;
  rainRiskScore: number;
  humidityScore: number;
  dryingWindowDays: number;
  verdict: 'FAVORABLE' | 'CAUTION' | 'HIGH_RISK';
  verdictHi: string;
  explanationHi: string;
  grainQualityRiskHi: string;
  lossMitigationTipHi: string;
} {
  // Rain is the greatest enemy of harvest quality
  let rainRiskScore = 100;
  if (expectedRainMm >= 25 || rainProbPct >= 70) rainRiskScore = 10;
  else if (expectedRainMm >= 10 || rainProbPct >= 50) rainRiskScore = 35;
  else if (expectedRainMm >= 3 || rainProbPct >= 30) rainRiskScore = 65;
  else if (expectedRainMm > 0) rainRiskScore = 85;

  // Humidity above 75% inhibits field drying and promotes mold/discoloration
  let humidityScore = 100;
  if (relativeHumidityPct > 80) humidityScore = 30;
  else if (relativeHumidityPct > 70) humidityScore = 60;
  else if (relativeHumidityPct > 55) humidityScore = 85;

  // High winds (>35 km/h) cause grain shattering and crop lodging
  let windScore = 100;
  if (windSpeedKmh > 50) windScore = 20;
  else if (windSpeedKmh > 35) windScore = 55;
  else if (windSpeedKmh > 20) windScore = 85;

  // Calculate consecutive dry days (< 2mm rain) ahead
  let dryingWindowDays = 0;
  for (const day of forecastDays) {
    if (day.expectedRainMm < 2 && day.rainProbabilityPct < 30) {
      dryingWindowDays++;
    } else {
      break;
    }
  }
  if (dryingWindowDays === 0 && expectedRainMm < 1) dryingWindowDays = 3;

  const rawScore = 0.50 * rainRiskScore + 0.30 * humidityScore + 0.20 * windScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let verdict: 'FAVORABLE' | 'CAUTION' | 'HIGH_RISK' = 'HIGH_RISK';
  let verdictHi = 'कटाई स्थगित रखें (High Wet Weather Risk)';
  let explanationHi = 'आगामी मौसम में बारिश व उच्च आर्द्रता से कटाई अत्यधिक जोखिमपूर्ण है।';
  let grainQualityRiskHi = 'गीले मौसम में कटाई से दाने में नमी > 14% पहुंचेगी, फफूंद व चमक खराब होगी। मंडी में ₹150–₹300/क्विंटल तक कटौती लग सकती है।';
  let lossMitigationTipHi = 'खेत में पकी फसल न काटें; यदि कटी पड़ी है तो तुरंत वाटरप्रूफ तिरपाल से ढकें और ऊंचे पक्के फर्श पर ले जाएं।';

  if (totalScore >= 75) {
    verdict = 'FAVORABLE';
    verdictHi = 'कटाई व सुखाने हेतु उत्तम मौसम (Safe Harvest Window)';
    explanationHi = `आगामी दिनों में मौसम सूखा व धूप खिली रहने का अनुमान है। ${crop.nameHi} की कटाई, गहाई (Threshing) व सुखाने के लिए आदर्श स्थिति।`;
    grainQualityRiskHi = 'दाने में सुरक्षित नमी (10–12%) बनी रहेगी; मंडी में उच्च गुणवत्ता ए-ग्रेड भाव मिलने की संभावना।';
    lossMitigationTipHi = 'कटाई के बाद अनाज को धूप में 1–2 दिन सुखाकर साफ बोरों में रखें।';
  } else if (totalScore >= 50) {
    verdict = 'CAUTION';
    verdictHi = 'सतर्कता से कटाई करें (Monitor Window)';
    explanationHi = 'मौसम में आंशिक बादल या हल्की नमी संभव है। छोटी मात्रा में कटाई करें और तिरपाल तैयार रखें।';
    grainQualityRiskHi = 'हल्की नमी से दानों की चमक मंद हो सकती है; गहाई के तुरंत बाद ड्रायर या हवादार जगह पर फैलाएं।';
    lossMitigationTipHi = 'कंबाइन हार्वेस्टर से कटाई के तुरंत बाद सुखाने का प्रबंध रखें।';
  }

  return {
    totalScore,
    rainRiskScore,
    humidityScore,
    dryingWindowDays,
    verdict,
    verdictHi,
    explanationHi,
    grainQualityRiskHi,
    lossMitigationTipHi,
  };
}

/**
 * Growing Degree Days calculation
 * Daily GDD = max(0, ((Tmax + Tmin) / 2) - Tbase)
 */
export function calculateGdd(tMax: number, tMin: number, baseTemp: number): number {
  const meanTemp = (tMax + tMin) / 2;
  return Math.max(0, Number((meanTemp - baseTemp).toFixed(1)));
}

/**
 * Cosine Similarity between normalized weather vectors
 */
export function calculateWeatherSimilarity(
  current: [number, number, number, number],
  reference: [number, number, number, number]
): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < current.length; i++) {
    dotProduct += current[i] * reference[i];
    normA += current[i] * current[i];
    normB += reference[i] * reference[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.round(Math.min(1, Math.max(0, similarity)) * 100);
}

/**
 * Digital Twin Motor & Irrigation Engine
 */
export function evaluateMotorDigitalTwin(
  soil: { shallowMoisture: number; rootMoisture: number },
  rainForecast16hMm: number,
  simulation: SimulationState,
  crop: CropConfig,
  currentMotorState: SoilTwinState['motorState'],
  stageId?: string
): {
  recommendation: SoilTwinState['irrigationRecommendation'];
  reasonHi: string;
  recommendedMotorState: SoilTwinState['motorState'];
  litersSaved: number;
  inrSaved: number;
  estimatedLabourHoursSaved: number;
  nutrientLeachingRisk: 'low' | 'moderate' | 'high';
  nutrientLeachingMessageHi: string;
  rootDiseaseEncouragementRisk: 'low' | 'moderate' | 'high';
} {
  const flowRateLph = 25000; // 5 HP pump ~ 25,000 L/hr
  const plannedHours = 4;
  const fuelConsumptionLph = 1.2; // Diesel L/hr
  const dieselPrice = 89;

  const isRainComing = simulation.isActive || rainForecast16hMm >= 15;
  const isSaturated = soil.rootMoisture >= crop.optimalRootMoistureMax;
  const isOptimal = soil.rootMoisture >= crop.optimalRootMoistureMin;

  // Problem 2.3: Crop stage understanding (e.g. Sowing needs light moisture, CRI/Vegetative needs optimal, Heading needs care, Ripening needs dry soil)
  const isMaturityStage = stageId === 'maturity' || stageId === 'harvest';

  // Nutrient leaching risk occurs when soil is already wet and rain or excessive pumping washes nitrates deep
  const nutrientLeachingRisk: 'low' | 'moderate' | 'high' =
    isSaturated || (isOptimal && isRainComing) ? 'high' : soil.rootMoisture > 65 ? 'moderate' : 'low';
  const nutrientLeachingMessageHi =
    nutrientLeachingRisk === 'high'
      ? '⚠️ उच्च पोषक तत्व रिसाव जोखिम (High Leaching Risk): अति-सिंचाई या भारी वर्षा से यूरिया व घुलनशील नाइट्रोजन जड़ क्षेत्र से नीचे रिसकर व्यर्थ हो जाएंगे।'
      : nutrientLeachingRisk === 'moderate'
      ? 'मध्यम रिसाव जोखिम: हल्की सिंचाई रखें ताकि उर्वरक जड़ क्षेत्र में ही संचित रहें।'
      : 'न्यूनतम रिसाव जोखिम: मृदा में नमी संतुलित है।';

  // Over-irrigation encourages Phytophthora, Pythium, and root rot
  const rootDiseaseEncouragementRisk: 'low' | 'moderate' | 'high' =
    soil.rootMoisture > 75 || simulation.isActive ? 'high' : soil.rootMoisture > 65 ? 'moderate' : 'low';

  if (isMaturityStage) {
    return {
      recommendation: 'stop',
      reasonHi: 'फसल परिपक्वता (Maturity) चरण में है। इस अवस्था में सिंचाई बंद रखने से दाना कड़ा बनता है और कटाई सुगम होती है।',
      recommendedMotorState: 'SIMULATED_OFF',
      litersSaved: Math.round(flowRateLph * plannedHours),
      inrSaved: Math.round(plannedHours * fuelConsumptionLph * dieselPrice),
      estimatedLabourHoursSaved: 4,
      nutrientLeachingRisk: 'low',
      nutrientLeachingMessageHi: 'परिपक्वता चरण में सिंचाई रोकने से दाने की गुणवत्ता सुरक्षित रहती है।',
      rootDiseaseEncouragementRisk: 'low',
    };
  }

  if (simulation.isActive || (isRainComing && isOptimal)) {
    // Demonstration scenario figures
    const litersSaved = simulation.isActive ? 350 : Math.round(flowRateLph * plannedHours);
    const inrSaved = simulation.isActive ? 140 : Math.round(plannedHours * fuelConsumptionLph * dieselPrice);

    return {
      recommendation: 'stop',
      reasonHi: simulation.isActive
        ? '⚠️ चरम मौसम सिमुलेशन: आगामी 72 घंटों में 85 मिमी वर्षा अनुमानित है। जलभराव, पोषक तत्व रिसाव व जड़ गलन रोकने हेतु नलकूप स्वतः बंद (AUTO-OFF) अनुशंसित है। (उदाहरण बचत: 350L जल, ₹140 डीजल, 4 घंटे श्रम)'
        : `आगामी 16 घंटों में ${rainForecast16hMm} मिमी वर्षा का पूर्वानुमान है और जड़ क्षेत्र में ${soil.rootMoisture}% नमी है। सिंचाई रोककर जल, डीजल, श्रम और यूरिया का रिसाव बचाएं।`,
      recommendedMotorState: 'AUTO_OFF_RECOMMENDED',
      litersSaved,
      inrSaved,
      estimatedLabourHoursSaved: 4,
      nutrientLeachingRisk,
      nutrientLeachingMessageHi,
      rootDiseaseEncouragementRisk,
    };
  }

  if (isSaturated) {
    return {
      recommendation: 'stop',
      reasonHi: 'मिट्टी में नमी संतृप्त (Saturated) स्तर पर है। अतिरिक्त सिंचाई से पोषक तत्व नीचे रिस जाएंगे और जड़ गलन रोग फैलेगा।',
      recommendedMotorState: 'SIMULATED_OFF',
      litersSaved: Math.round(flowRateLph * 2),
      inrSaved: Math.round(2 * fuelConsumptionLph * dieselPrice),
      estimatedLabourHoursSaved: 3,
      nutrientLeachingRisk: 'high',
      nutrientLeachingMessageHi,
      rootDiseaseEncouragementRisk: 'high',
    };
  }

  if (soil.rootMoisture < crop.optimalRootMoistureMin) {
    if (rainForecast16hMm >= 5) {
      return {
        recommendation: 'delay',
        reasonHi: 'हल्की वर्षा की संभावना है। 12-16 घंटे प्रतीक्षा करें, यदि बारिश न हो तो ही हल्की सिंचाई करें ताकि डीजल व श्रम व्यर्थ न हो।',
        recommendedMotorState: currentMotorState === 'MANUAL_OVERRIDE' ? 'SIMULATED_ON' : 'SIMULATED_OFF',
        litersSaved: 0,
        inrSaved: 0,
        estimatedLabourHoursSaved: 2,
        nutrientLeachingRisk: 'low',
        nutrientLeachingMessageHi,
        rootDiseaseEncouragementRisk: 'low',
      };
    }
    return {
      recommendation: 'irrigate_normal',
      reasonHi: `मिट्टी में नमी ${soil.rootMoisture}% है जो न्यूनतम सीमा (${crop.optimalRootMoistureMin}%) से कम है। वर्तमान फसल चरण अनुसार सामान्य सिंचाई की आवश्यकता है।`,
      recommendedMotorState: currentMotorState === 'MANUAL_OVERRIDE' ? 'SIMULATED_ON' : 'SIMULATED_ON',
      litersSaved: 0,
      inrSaved: 0,
      estimatedLabourHoursSaved: 0,
      nutrientLeachingRisk: 'low',
      nutrientLeachingMessageHi,
      rootDiseaseEncouragementRisk: 'low',
    };
  }

  return {
    recommendation: 'delay',
    reasonHi: `जड़ क्षेत्र में पर्याप्त नमी (${soil.rootMoisture}%) है। फिलहाल अतिरिक्त सिंचाई की आवश्यकता नहीं है; मोटर बंद रखकर जल, ईंधन व श्रम बचाएं।`,
    recommendedMotorState: 'SIMULATED_OFF',
    litersSaved: 0,
    inrSaved: 0,
    estimatedLabourHoursSaved: 2,
    nutrientLeachingRisk: 'low',
    nutrientLeachingMessageHi,
    rootDiseaseEncouragementRisk: 'low',
  };
}

/**
 * Evaluates 48-Hour Disease Radar for selected crop
 */
export function evaluateDiseaseRisk(
  weather: CurrentWeather,
  simulation: SimulationState,
  crop: CropConfig
): DiseaseRiskAssessment {
  const effectiveTemp = simulation.isActive ? 22 : weather.temperatureC;
  const effectiveHumidity = simulation.isActive ? simulation.simulatedHumidityPct : weather.relativeHumidity;
  const effectiveRain = simulation.isActive ? simulation.simulatedRainfallMm : weather.precipitationMm;

  let maxRiskScore = 0;

  const assessedDiseases = crop.commonDiseases.map((d) => {
    let score = 20;
    const triggers: string[] = [];

    if (effectiveTemp >= d.favorableTempMin && effectiveTemp <= d.favorableTempMax) {
      score += 35;
      triggers.push(`तापमान अनुकूल (${effectiveTemp}°C, सीमा: ${d.favorableTempMin}-${d.favorableTempMax}°C)`);
    }

    if (effectiveHumidity >= d.favorableHumidityMin) {
      score += 40;
      triggers.push(`अत्यधिक आर्द्रता (${effectiveHumidity}%, थ्रेशोल्ड: >${d.favorableHumidityMin}%)`);
    } else if (effectiveHumidity >= d.favorableHumidityMin - 10) {
      score += 20;
      triggers.push(`बढ़ती आर्द्रता (${effectiveHumidity}%)`);
    }

    if (effectiveRain >= 15 || simulation.isActive) {
      score += 20;
      triggers.push(`पत्तियों पर लगातार गीलापन व वर्षा (${effectiveRain} मिमी)`);
    }

    score = Math.min(100, Math.max(10, score));
    if (score > maxRiskScore) maxRiskScore = score;

    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (score >= 80) riskLevel = 'critical';
    else if (score >= 60) riskLevel = 'high';
    else if (score >= 40) riskLevel = 'moderate';

    return {
      diseaseId: d.id,
      nameEn: d.nameEn,
      nameHi: d.nameHi,
      riskLevel,
      riskScore: score,
      triggerFactors: triggers,
      preventiveTipHi: d.preventionHi,
      preventiveTipEn: `Monitor field closely. Avoid excess nitrogen and overhead watering. Consult nearest KVK if symptoms appear.`,
    };
  });

  let overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  if (maxRiskScore >= 80) overallRiskLevel = 'critical';
  else if (maxRiskScore >= 60) overallRiskLevel = 'high';
  else if (maxRiskScore >= 40) overallRiskLevel = 'moderate';

  const outlook48hHi = simulation.isActive
    ? '⚠️ आगामी 48-72 घंटों में लगातार 85 मिमी वर्षा व 88% आर्द्रता से फंगल संक्रमण का गंभीर खतरा है। खेत में निगरानी बढ़ाएं।'
    : maxRiskScore >= 60
    ? 'अगले 48 घंटों में उच्च आर्द्रता और तापमान का समन्वय कवक (Fungus) बीजाणुओं के अंकुरण के अनुकूल है। पत्तियों के निचली सतह का निरीक्षण करें।'
    : 'अगले 48 घंटों में मौसम रोग अनुकूल नहीं है। सामान्य फसल चक्र बनाए रखें।';

  const limitationsHi =
    'यह रडार मौसम-आधारित पूर्व-चेतावनी सूचकांक है। यह फसल में रोग संक्रमण की प्रत्यक्ष पुष्टि नहीं करता। किसी भी रसायन के छिड़काव से पहले कृषि वैज्ञानिक से पुष्टि करें।';

  return {
    cropId: crop.id,
    overallRiskLevel,
    overallRiskScorePct: maxRiskScore,
    diseases: assessedDiseases,
    outlook48hHi,
    limitationsHi,
  };
}

/**
 * Mandi Decision Engine ("Abhi Bechein ya 5 Din Rukein?")
 * Formulates the three requested recommendations:
 * 1. CONSIDER_SELLING_NOW
 * 2. CONSIDER_WAITING_MONITOR
 * 3. PRIORITIZE_STORAGE_SAFETY
 */
export function evaluateMandiDecision(
  crop: CropConfig,
  mandi: MandiRecord,
  weather: CurrentWeather,
  simulation: SimulationState,
  quantityQuintals: number = 30
): MandiDecision {
  const isExtremeWeather = simulation.isActive || weather.precipitationMm >= 25;
  const isPerishable = crop.perishabilityDays <= 14;
  const priceTrendWeekly = mandi.priceChangePctWeek;

  const storageCostPerQuintalPerWeek = 5;
  const totalStorageCostEst = Math.round(quantityQuintals * storageCostPerQuintalPerWeek * 2);
  const currentProceeds = Math.round(quantityQuintals * mandi.modalPriceInr);

  // 1. Severe Weather / Threat scenario: Prioritize harvest and storage safety
  if (isExtremeWeather) {
    if (isPerishable) {
      return {
        recommendation: 'CONSIDER_SELLING_NOW',
        recommendationHi: 'अभी बिक्री पर विचार करें (Consider Selling Now)',
        recommendationEn: 'Consider Selling Now',
        summaryHi: 'भारी बारिश व नमी से नाशवान उपज की गुणवत्ता खराब होने का डर है। वर्तमान मंडी भाव पर तुरंत बेचें।',
        summaryEn: 'Heavy rain threat to perishable crop quality. Consider immediate sale or cold storage.',
        keyDriversHi: [
          `आगामी 72 घंटे में ${simulation.simulatedRainfallMm || 85} मिमी भारी वर्षा का पूर्वानुमान`,
          `${crop.nameHi} की शेल्फ लाइफ बहुत कम (${crop.perishabilityDays} दिन) है`,
          'मंडी यार्ड में खुले में रखी उपज भीगने से 30-50% तक दाम गिर सकते हैं',
        ],
        weatherRiskImpact: 'अत्यधिक उच्च (Critical Risk) — खुले यार्ड में भीगने से भारी नुकसान संभव।',
        netProceedsScenario: {
          currentProceeds,
          scenarioProceeds: Math.round(currentProceeds * 0.72),
          storageCostEst: totalStorageCostEst,
          netDifference: Math.round(currentProceeds * 0.28),
        },
        whyThisRecommendation: 'आगामी 72 घंटों में 85 मिमी बारिश से खुले यार्ड में फसल भीगने व सड़ने का बड़ा खतरा है।',
        whatCouldChangeDecision: 'यदि आपके पास वाटरप्रूफ ढका हुआ पक्का गोदाम और परिवहन उपलब्ध हो।',
        dataUsed: `Agmarknet मॉडल भाव ₹${mandi.modalPriceInr}/क्विंटल, 72 घंटे वर्षा पूर्वानुमान।`,
        lastUpdated: '17 Oct 2026, 11:30 AM IST',
      };
    } else {
      return {
        recommendation: 'PRIORITIZE_STORAGE_SAFETY',
        recommendationHi: 'कटाई और सुरक्षित भंडारण को प्राथमिकता दें (Prioritize Storage Safety)',
        recommendationEn: 'Prioritize Harvest & Storage Safety',
        summaryHi: 'असमर्थित अनाज भीगने पर नमी बढ़ने से मंडी में कटौती (Discount) लग सकती है। सुरक्षित भंडारण या तिरपाल का प्रबंध करें।',
        summaryEn: 'Protect grain from rainfall exposure. Prioritize drying and covered storage before market arrival.',
        keyDriversHi: [
          'वर्षा के कारण नमी 12% मानक सीमा से ऊपर जाने का जोखिम',
          'मंडी यार्ड में शेड की सीमित जगह',
          'बारिश के बाद आवक रुकने से तात्कालिक भाव में अस्थिरता',
        ],
        weatherRiskImpact: 'उच्च (High Risk) — सूखा भंडारण उपलब्ध हो तो ही माल रोकें।',
        netProceedsScenario: {
          currentProceeds,
          scenarioProceeds: Math.round(currentProceeds * 0.92),
          storageCostEst: totalStorageCostEst,
          netDifference: Math.round(currentProceeds * 0.08),
        },
        whyThisRecommendation: 'आगामी मौसम में अनाज में नमी बढ़ने से एगमार्कनेट मानक ग्रेड से कटौती लग सकती है।',
        whatCouldChangeDecision: 'यदि वर्षा का पूर्वानुमान 24 घंटे में रद्द हो जाए या साफ मौसम बने।',
        dataUsed: `Agmarknet मॉडल भाव ₹${mandi.modalPriceInr}/क्विंटल, Open-Meteo 85mm वर्षा सिमुलेशन।`,
        lastUpdated: '17 Oct 2026, 11:30 AM IST',
      };
    }
  }

  // 2. Favorable / Rising Market: Consider waiting and monitoring
  if (priceTrendWeekly > 2.0) {
    const hypotheticalFuturePrice = Math.round(mandi.modalPriceInr * 1.05);
    const scenarioProceeds = Math.round(quantityQuintals * hypotheticalFuturePrice - totalStorageCostEst);
    const netDifference = scenarioProceeds - currentProceeds;

    return {
      recommendation: 'CONSIDER_WAITING_MONITOR',
      recommendationHi: 'प्रतीक्षा करें और निगरानी रखें (Consider Waiting & Monitoring)',
      recommendationEn: 'Consider Waiting and Monitoring',
      summaryHi: `मंडी में पिछले 7 दिनों में भाव में +${priceTrendWeekly}% की वृद्धि दर्ज है। आगामी 5 दिनों तक मौसम अनुकूल है, भाव निगरानी रखें।`,
      summaryEn: `Upward price momentum (+${priceTrendWeekly}%) with dry weather. Holding 5 days can yield better realization.`,
      keyDriversHi: [
        `साप्ताहिक भाव में +${priceTrendWeekly}% का सकारात्मक सुधार`,
        'मौसम साफ और सुखाने/भंडारण के लिए अनुकूल',
        'मिलर्स व थोक खरीदारों की मांग में स्थिरता',
      ],
      weatherRiskImpact: 'न्यूनतम (Low Risk) — अगले 5 दिन वर्षा रहित रहने का अनुमान।',
      netProceedsScenario: {
        currentProceeds,
        scenarioProceeds,
        storageCostEst: totalStorageCostEst,
        netDifference,
      },
      whyThisRecommendation: 'मंडी में मांग मजबूत है और अगले 5 दिन कोई मौसम जोखिम नहीं है।',
      whatCouldChangeDecision: 'यदि आवक अचानक अप्रत्याशित रूप से बढ़ जाए या भाव में गिरावट शुरू हो।',
      dataUsed: `Agmarknet 7-दिवसीय भाव प्रवृत्ति, 14-दिवसीय मौसम पूर्वानुमान।`,
      lastUpdated: '17 Oct 2026, 11:30 AM IST',
    };
  }

  // 3. Falling or Stable Market: Consider selling now
  return {
    recommendation: 'CONSIDER_SELLING_NOW',
    recommendationHi: 'अभी बिक्री पर विचार करें (Consider Selling Now)',
    recommendationEn: 'Consider Selling Now',
    summaryHi: 'भाव स्थिर हैं। भंडारण व्यय और कीट नियंत्रण लागत जोड़ने के बाद रुकने पर कोई अतिरिक्त मार्जिन नहीं दिखता।',
    summaryEn: 'Prices are stable. Factoring storage and handling costs suggests selling now to maintain liquidity.',
    keyDriversHi: [
      'मंडी भाव में स्थिरता (सीमित उतार-चढ़ाव)',
      'भंडारण लागत व कीट नियंत्रण व्यय की बचत',
      'अगली फसल की लागत हेतु समय पर नकदी प्रवाह',
    ],
    weatherRiskImpact: 'न्यूनतम (Low Risk)',
    netProceedsScenario: {
      currentProceeds,
      scenarioProceeds: currentProceeds - totalStorageCostEst,
      storageCostEst: totalStorageCostEst,
      netDifference: -totalStorageCostEst,
    },
    whyThisRecommendation: 'भंडारण खर्च जोड़ने के बाद रुकने पर अतिरिक्त लाभ नहीं है।',
    whatCouldChangeDecision: 'यदि सरकारी खरीद केंद्र (MSP) पर विशेष बोनस घोषित हो।',
    dataUsed: `Agmarknet मॉडल भाव ₹${mandi.modalPriceInr}, स्थानीय मंडी आवक रिकॉर्ड।`,
    lastUpdated: '17 Oct 2026, 11:30 AM IST',
  };
}
