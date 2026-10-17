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
  return Math.max(5, Math.round(100 - surplus * 3.5)); // Saturated/waterlogged soil penalizes sowing
}

/**
 * Combined Sowing Safety Score (0-100)
 * Formula: 0.35 * SoilTempSuitability + 0.40 * RainSuitability + 0.25 * RootMoistureSuitability
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
} {
  const tempScore = calculateSoilTempSuitability(soilTempC, crop);
  const rainScore = calculateRainfallRiskSuitability(expectedRainMm, rainProbPct);
  const moistureScore = calculateMoistureSuitability(rootMoisturePct, crop);

  const rawScore = 0.35 * tempScore + 0.40 * rainScore + 0.25 * moistureScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let verdict: 'FAVORABLE' | 'CAUTION' | 'HIGH_RISK' = 'HIGH_RISK';
  let verdictHi = 'अत्यधिक जोखिम (High Risk)';
  let explanationHi = 'खराब मौसम या अत्यधिक बारिश के कारण बुवाई टालें।';

  if (totalScore >= 75) {
    verdict = 'FAVORABLE';
    verdictHi = 'बुवाई के लिए अति उत्तम (Favorable)';
    explanationHi = `${crop.nameHi} की बुवाई के लिए तापमान, मिट्टी की नमी और वर्षा का पूर्वानुमान अनुकूल है।`;
  } else if (totalScore >= 50) {
    verdict = 'CAUTION';
    verdictHi = 'सावधानी बरतें (Caution)';
    explanationHi = 'मौसम में नमी या हल्की वर्षा का जोखिम है। बीज उपचार के बाद ही सीमित बुवाई करें।';
  } else {
    verdict = 'HIGH_RISK';
    verdictHi = 'बुवाई स्थगित करें (High Risk)';
    explanationHi = 'भारी वर्षा या प्रतिकूल मृदा तापमान के कारण बीज सड़ने व जलभराव का खतरा है।';
  }

  return {
    totalScore,
    tempScore,
    rainScore,
    moistureScore,
    verdict,
    verdictHi,
    explanationHi,
  };
}

/**
 * Growing Degree Days calculation
 * GDD = max(0, ((Tmax + Tmin) / 2) - Tbase)
 */
export function calculateGdd(tMax: number, tMin: number, baseTemp: number): number {
  const meanTemp = (tMax + tMin) / 2;
  return Math.max(0, Number((meanTemp - baseTemp).toFixed(1)));
}

/**
 * Evaluates Cosine Similarity between two 4-variable normalized weather vectors:
 * [Temperature, Humidity, WindSpeed, Rain]
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
  currentMotorState: SoilTwinState['motorState']
): {
  recommendation: SoilTwinState['irrigationRecommendation'];
  reasonHi: string;
  recommendedMotorState: SoilTwinState['motorState'];
  litersSaved: number;
  inrSaved: number;
} {
  const flowRateLph = 25000; // 5 HP tubewell pump ~ 25,000 L/hr
  const plannedHours = 4;
  const fuelConsumptionLph = 1.2; // Diesel per hour
  const dieselPrice = 88.5; // ₹ / L

  const isRainComing = simulation.isActive || rainForecast16hMm >= 15;
  const isSaturated = soil.rootMoisture >= crop.optimalRootMoistureMax;
  const isOptimal = soil.rootMoisture >= crop.optimalRootMoistureMin;

  if (simulation.isActive || (isRainComing && isOptimal)) {
    const litersSaved = Math.round(flowRateLph * plannedHours);
    const inrSaved = Math.round(plannedHours * fuelConsumptionLph * dieselPrice);
    return {
      recommendation: 'stop',
      reasonHi: simulation.isActive
        ? '⚠️ चरम मौसम चेतावनी: आगामी 72 घंटों में 85 मिमी वर्षा अनुमानित है। सिंचाई तुरंत बंद (AUTO-OFF) की गई।'
        : `आगामी 16 घंटों में ${rainForecast16hMm} मिमी वर्षा का पूर्वानुमान है और जड़ क्षेत्र में पहले से ${soil.rootMoisture}% नमी है। सिंचाई रोककर जल और डीजल की बचत करें।`,
      recommendedMotorState: 'AUTO_OFF_RECOMMENDED',
      litersSaved,
      inrSaved,
    };
  }

  if (isSaturated) {
    return {
      recommendation: 'stop',
      reasonHi: 'मिट्टी में नमी संतृप्त (Saturated) स्तर पर है। अतिरिक्त सिंचाई से जड़ गलन रोग हो सकता है।',
      recommendedMotorState: 'SIMULATED_OFF',
      litersSaved: Math.round(flowRateLph * 2),
      inrSaved: Math.round(2 * fuelConsumptionLph * dieselPrice),
    };
  }

  if (soil.rootMoisture < crop.optimalRootMoistureMin) {
    if (rainForecast16hMm >= 5) {
      return {
        recommendation: 'delay',
        reasonHi: 'हल्की वर्षा की संभावना है। 12 घंटे प्रतीक्षा करें, यदि बारिश न हो तो ही हल्की सिंचाई करें।',
        recommendedMotorState: currentMotorState === 'MANUAL_OVERRIDE' ? 'SIMULATED_ON' : 'SIMULATED_OFF',
        litersSaved: 0,
        inrSaved: 0,
      };
    }
    return {
      recommendation: 'irrigate_normal',
      reasonHi: `मिट्टी में नमी ${soil.rootMoisture}% है जो न्यूनतम सीमा (${crop.optimalRootMoistureMin}%) से कम है। 3-4 घंटे की सामान्य सिंचाई की आवश्यकता है।`,
      recommendedMotorState: currentMotorState === 'MANUAL_OVERRIDE' ? 'SIMULATED_ON' : 'SIMULATED_ON',
      litersSaved: 0,
      inrSaved: 0,
    };
  }

  return {
    recommendation: 'delay',
    reasonHi: `जड़ क्षेत्र में पर्याप्त नमी (${soil.rootMoisture}%) है। फिलहाल सिंचाई की आवश्यकता नहीं है।`,
    recommendedMotorState: 'SIMULATED_OFF',
    litersSaved: 0,
    inrSaved: 0,
  };
}

/**
 * Evaluates 48-Hour Disease Radar for the selected crop
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
    let score = 20; // baseline
    const triggers: string[] = [];

    // Temperature window check
    if (effectiveTemp >= d.favorableTempMin && effectiveTemp <= d.favorableTempMax) {
      score += 35;
      triggers.push(`तापमान अनुकूल (${effectiveTemp}°C, सीमा: ${d.favorableTempMin}-${d.favorableTempMax}°C)`);
    }

    // Humidity check
    if (effectiveHumidity >= d.favorableHumidityMin) {
      score += 40;
      triggers.push(`अत्यधिक सापेक्ष आर्द्रता (${effectiveHumidity}%, थ्रेशोल्ड: >${d.favorableHumidityMin}%)`);
    } else if (effectiveHumidity >= d.favorableHumidityMin - 10) {
      score += 20;
      triggers.push(`बढ़ती आर्द्रता (${effectiveHumidity}%)`);
    }

    // Rain factor
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
    ? '⚠️ आगामी 48-72 घंटों में लगातार 85 मिमी भारी बारिश व 88% आर्द्रता के कारण फंगल व जीवाणु संक्रमण (रोग फैलाव) का अति गंभीर खतरा है।'
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
 * Mandi Decision Engine ("Abhi Bechun Ya Rukun?")
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

  // Storage cost estimate: ₹18 per quintal per month
  const storageCostPerQuintalPerWeek = 5;
  const totalStorageCostEst = Math.round(quantityQuintals * storageCostPerQuintalPerWeek * 2);

  const currentProceeds = Math.round(quantityQuintals * mandi.modalPriceInr);

  // Scenario:
  // If extreme weather -> Sell now or store covered to avoid total loss / quality discount
  if (isExtremeWeather) {
    if (isPerishable) {
      // Tomato etc.
      return {
        recommendation: 'SELL_NOW',
        recommendationHi: 'तुरंत बेचें (Sell Immediately)',
        summaryHi: 'भारी बारिश व जलभराव से खुली मंडी या खेत में कटी फसल सड़ने का 40-60% जोखिम है। वर्तमान भाव पर तत्काल बेचें।',
        summaryEn: 'Heavy unseasonal rain severely threatens perishable produce quality. Liquidate or move to cold storage immediately.',
        keyDriversHi: [
          `आगामी 72 घंटे में ${simulation.simulatedRainfallMm || 85} मिमी भारी वर्षा का पूर्वानुमान`,
          `${crop.nameHi} की शेल्फ लाइफ बहुत कम (${crop.perishabilityDays} दिन) है`,
          'मंडी शेड में जगह की कमी से उपज भीगने का खतरा',
        ],
        weatherRiskImpact: 'अत्यधिक उच्च (Critical Risk) — भीगने पर 30-50% तक कम भाव मिल सकता है।',
        netProceedsScenario: {
          currentProceeds,
          scenarioProceeds: Math.round(currentProceeds * 0.7), // 30% discount if damaged
          storageCostEst: totalStorageCostEst,
          netDifference: Math.round(currentProceeds * 0.3),
        },
      };
    } else {
      // Wheat / Rice
      return {
        recommendation: 'SELL_NOW',
        recommendationHi: 'सुरक्षित बिक्री अथवा ढंककर रखें (Sell or Safe Storage)',
        summaryHi: 'असामयिक बारिश से खुले यार्ड में अनाज भीगने पर नमी बढ़ने से मंडी में काटा (Discount) लग सकता है।',
        summaryEn: 'Grain exposed to sudden moisture loses grade quality. Dispatch to dry warehouse or sell before rain.',
        keyDriversHi: [
          'वर्षा के कारण नमी 12% मानक से ऊपर जाने का डर',
          'मंडी यार्ड में शेड की सीमित उपलब्धता',
          'बारिश के बाद आवक रुकने से तात्कालिक भाव गिर सकते हैं',
        ],
        weatherRiskImpact: 'मध्यम से उच्च — सूखा भंडारण उपलब्ध हो तो ही रोकें।',
        netProceedsScenario: {
          currentProceeds,
          scenarioProceeds: Math.round(currentProceeds * 0.92),
          storageCostEst: totalStorageCostEst,
          netDifference: Math.round(currentProceeds * 0.08),
        },
      };
    }
  }

  // Normal weather conditions
  if (priceTrendWeekly > 2.5) {
    // Rising price trend
    const hypotheticalFuturePrice = Math.round(mandi.modalPriceInr * 1.05);
    const scenarioProceeds = Math.round(quantityQuintals * hypotheticalFuturePrice - totalStorageCostEst);
    const netDifference = scenarioProceeds - currentProceeds;

    return {
      recommendation: 'WAIT_AND_MONITOR',
      recommendationHi: 'प्रतीक्षा करें व नजर रखें (Wait & Monitor)',
      summaryHi: `मंडी में पिछले 7 दिनों में भाव में ${priceTrendWeekly}% की वृद्धि देखी गई है। मौसम अनुकूल रहने से 7-10 दिन रुकना लाभप्रद हो सकता है।`,
      summaryEn: `Upward price momentum (+${priceTrendWeekly}%) with calm weather. Holding with proper aeration can yield higher margins.`,
      keyDriversHi: [
        `भाव में पिछले सप्ताह +${priceTrendWeekly}% का सुधार`,
        'मौसम साफ और भंडारण के लिए उपयुक्त',
        'त्योहारी अथवा मिलर्स की मांग में तेजी',
      ],
      weatherRiskImpact: 'न्यूनतम (Low Risk) — मौसम सूखा व अनुकूल है।',
      netProceedsScenario: {
        currentProceeds,
        scenarioProceeds,
        storageCostEst: totalStorageCostEst,
        netDifference,
      },
    };
  }

  if (priceTrendWeekly < -3.0) {
    // Falling price trend
    return {
      recommendation: 'PARTIAL_SALE',
      recommendationHi: 'आंशिक बिक्री करें (Partial Sale 50%)',
      summaryHi: 'मंडी में आवक बढ़ने से भाव में दबाव है। जोखिम घटाने हेतु 50% उपज अभी बेचें और शेष अच्छी गुणवत्ता वाली रोकें।',
      summaryEn: 'Heavy mandi arrivals causing price weakness. Stagger sales (50% now, 50% later) to average realization.',
      keyDriversHi: [
        `साप्ताहिक भाव में ${priceTrendWeekly}% की नरमी`,
        'आवक में वृद्धि के संकेत',
        'आंशिक बिक्री से नकदी प्रवाह सुनिश्चित होगा',
      ],
      weatherRiskImpact: 'सामान्य (Moderate Risk)',
      netProceedsScenario: {
        currentProceeds,
        scenarioProceeds: Math.round(currentProceeds * 0.96),
        storageCostEst: totalStorageCostEst,
        netDifference: -Math.round(currentProceeds * 0.04),
      },
    };
  }

  // Stable
  return {
    recommendation: 'SELL_NOW',
    recommendationHi: 'वर्तमान भाव पर बेचना उपयुक्त (Sell Now)',
    summaryHi: 'भाव स्थिर हैं और भंडारण व्यय जोड़ने के बाद रुकने पर कोई विशेष अतिरिक्त लाभ नहीं दिखता।',
    summaryEn: 'Prices are stable. Factor in warehousing costs and liquidity needs before deciding to hold.',
    keyDriversHi: [
      'मंडी भाव में स्थिरता (न्यूनतम उतार-चढ़ाव)',
      'भंडारण लागत व कीट नियंत्रण की बचत',
      'अगली फसल की लागत हेतु तत्काल नकदी',
    ],
    weatherRiskImpact: 'न्यूनतम (Low Risk)',
    netProceedsScenario: {
      currentProceeds,
      scenarioProceeds: currentProceeds - totalStorageCostEst,
      storageCostEst: totalStorageCostEst,
      netDifference: -totalStorageCostEst,
    },
  };
}
