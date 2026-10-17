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

