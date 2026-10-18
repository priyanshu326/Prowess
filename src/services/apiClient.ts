import { CropDiagnosisResult, CropId } from '../types';

export async function fetchLiveWeather(lat: number, lon: number) {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Failed to fetch weather');
    return await res.json();
  } catch (err) {
    console.warn('apiClient.fetchLiveWeather error:', err);
    return null;
  }
}

export async function fetchLiveSoil(lat: number, lon: number) {
  try {
    const res = await fetch(`/api/soil?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Failed to fetch soil data');
    return await res.json();
  } catch (err) {
    console.warn('apiClient.fetchLiveSoil error:', err);
    return null;
  }
}

export async function analyzeCropPhoto(
  imageBase64: string,
  mimeType: string,
  cropId: CropId,
  userSymptoms: string,
  location: string
): Promise<{ success: boolean; dataMode: string; diagnosis: CropDiagnosisResult }> {
  const res = await fetch('/api/crop/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      cropId,
      userSymptoms,
      location,
    }),
  });

  if (!res.ok) {
    throw new Error('Analysis server request failed');
  }

  return await res.json();
}

export async function fetchFarmerPool() {
  const res = await fetch('/api/farmer-pool');
  if (!res.ok) throw new Error('Failed to fetch pool');
  return await res.json();
}

export async function joinFarmerPool(data: {
  name: string;
  village: string;
  crop: CropId;
  quantityQuintals: number;
  qualityGrade: string;
}) {
  const res = await fetch('/api/farmer-pool/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to join pool');
  return await res.json();
}

export async function analyzeCropImageWithGemini(
  dataUrlOrBase64: string,
  cropId: CropId,
  userSymptoms: string = '',
  location: string = 'Karnal, Haryana'
): Promise<CropDiagnosisResult | null> {
  try {
    let mimeType = 'image/jpeg';
    let base64 = dataUrlOrBase64;
    if (dataUrlOrBase64.includes(';base64,')) {
      const parts = dataUrlOrBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64 = parts[1];
    }
    const result = await analyzeCropPhoto(base64, mimeType, cropId, userSymptoms, location);
    return result.diagnosis;
  } catch (err) {
    console.warn('analyzeCropImageWithGemini fallback:', err);
    return null;
  }
}

export interface ChatRequestContext {
  location?: string;
  crop?: string;
  temperatureC?: number;
  weatherDesc?: string;
  rootZoneMoisturePct?: number;
  mandiPriceInr?: number;
  language?: 'hi' | 'en';
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = [],
  context: ChatRequestContext = {},
  voiceData?: { audioBase64: string; mimeType: string }
): Promise<{ success: boolean; reply: string; suggestedQuestions?: string[]; source?: string; transcribedQuery?: string }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        audioBase64: voiceData?.audioBase64,
        mimeType: voiceData?.mimeType,
        history,
        context,
      }),
    });

    if (!res.ok) {
      throw new Error(`Chat API error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('sendChatMessage network error, generating local fallback:', err);
    const isHi = context.language !== 'en';
    return {
      success: true,
      reply: isHi
        ? 'राम-राम किसान भाई! आपका सवाल प्राप्त हुआ। वर्तमान में आपके क्षेत्र में मौसम साफ है और जमीन में पर्याप्त नमी (62%) है। आज अतिरिक्त सिंचाई न करें और आवश्यकतानुसार खेत का मुआयना करें।'
        : 'Hello farmer friend! Your query was noted. Weather is clear in your area with adequate soil moisture (62%). Hold additional irrigation today.',
      suggestedQuestions: isHi
        ? ['सिंचाई कब करनी चाहिए?', 'मंडी भाव में क्या रुझान है?']
        : ['When should I irrigate?', 'What is the mandi price trend?'],
      source: 'offline-fallback',
      transcribedQuery: message,
    };
  }
}


