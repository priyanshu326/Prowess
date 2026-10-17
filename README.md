# 🌾 Kisaan Sathi (किसान साथी)
> *"Beej se Bazaar Tak, Har Faisle Mein Kisaan Ka Sathi"*
> **IIIT Delhi 24-Hour Hackathon • Agriculture & Rural Development Track**

Kisaan Sathi is a **zero-field-hardware, voice-first AI agricultural decision-support platform** for Indian farmers. It aggregates open atmospheric & hydrological satellite forecasts, 10-year historical climate records (ERA5-Land), root-zone soil estimates, Gemini Flash multimodal crop vision diagnostics, Agmarknet mandi intelligence, and village farmer pooling.

---

## 🚀 Key Highlights & Differentiators

1. **Zero Field Hardware Requirement**:
   - No costly in-situ IoT probes or soil sensors to purchase or maintain.
   - Dual-depth hydrological reanalysis provides 0–7 cm (shallow) and 7–28 cm (active root zone) moisture estimation via Open-Meteo & ERA5-Land.

2. **Digital Twin Motor & Smart Irrigation**:
   - Proactive rainfall rule: Automatically recommends `AUTO-OFF` when root-zone moisture is sufficient and >15mm near-term rain is forecast.
   - Interactive Water & Diesel savings estimator.
   - Transparent hardware limitation disclaimer (software simulation vs. physical GSM/IoT contactor in production).

3. **10-Year Climate Shield & Sowing Safety Score**:
   - Recharts comparison of 10-year historical baseline (2016–2025) vs. 2026 forecast.
   - 14-day interactive sowing/harvesting advisory calendar.
   - Deterministic Sowing Safety Score (0–100) combining Soil Temp (35%), Rainfall Risk (40%), and Root Moisture (25%).

4. **Dual-Layer AI Crop Doctor**:
   - **Tab A (48-Hour Disease Radar)**: Pre-infection environmental risk index based on temperature, relative humidity, and crop vulnerability.
   - **Tab B (Multimodal Gemini Vision)**: Upload or test with 1-click sample leaf photos (Yellow Rust, Early Blight, Healthy Rice) to get structured diagnoses, confidence categories, visible symptoms, and verified KVK contacts.

5. **Mandi & Weather Decision Engine ("Abhi Bechun Ya Rukun?")**:
   - Real Agmarknet modal wholesale prices.
   - Multi-factor logic: Evaluates price trend + weather exposure risk + crop perishability.
   - Interactive Net Proceeds calculator (quantity slider, holding costs vs. selling now).

6. **Kisaan Pool & FPO Aggregation**:
   - 14 farmers aggregate 85 quintals of wheat toward a 100-quintal target.
   - Adding 15 quintals completes the target (100%), triggers celebration, and unlocks verified bulk buyer bids (+₹120/q collective margin).

7. **Voice-First & 2G SMS Accessibility**:
   - Web Speech API Hindi audio narration (`hi-IN`) with slow, clear cadence.
   - 2G Feature Phone retro SMS preview for low-connectivity rural settings.

8. **Coordinated Extreme Weather Simulator**:
   - Prominent "Simulate Extreme Weather" button injects an 85mm unseasonal deluge & 60km/h gales.
   - Coordinated reaction across all 6 modules: Critical alert banner, Sowing calendar turns RED, Motor auto-offs, Disease radar spikes to CRITICAL, Mandi recommends immediate harvest/sale, SMS updates, Hindi voice warns farmer.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React, Web Speech API
- **Backend**: Node.js, Express, TypeScript (`server.ts` with Vite middlewares in dev mode)
- **AI / Multimodal**: Google Gemini 3.8 Flash (`@google/genai` TypeScript SDK)
- **APIs**: Open-Meteo Forecast & Historical Weather API, ERA5-Land Hydro Reanalysis, Agmarknet

---

## 📁 Project Structure

```
kisaan-sathi/
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── alerts/
│   │   │   └── AlertCenter.tsx        # Module 6: Hindi Voice & 2G SMS phone simulator
│   │   ├── doctor/
│   │   │   └── CropDoctor.tsx         # Module 3: 48h Disease radar & Gemini vision
│   │   ├── layout/
│   │   │   ├── AdvisoryBanner.tsx     # Master verdict & simulation banner
│   │   │   └── Header.tsx             # Command center with location, crop, & simulator
│   │   ├── market/
│   │   │   ├── KisaanPool.tsx         # Module 5: FPO aggregation & 100q bulk buyer pool
│   │   │   └── MandiEngine.tsx        # Module 4: Mandi intelligence & net proceeds
│   │   ├── modals/
│   │   │   ├── ExplainableAiModal.tsx # Formulas, GDD math, and decision rules
│   │   │   └── InfoModal.tsx          # About, Methodology, Privacy & FAQ
│   │   └── weather/
│   │       └── ClimateShield.tsx      # Module 1: 10y climate chart & 14d sowing calendar
│   ├── data/
│   │   └── demoData.ts                # Seed baselines, Agmarknet prices, sample images
│   ├── services/
│   │   └── apiClient.ts               # Weather, soil, Gemini vision & pool endpoints
│   ├── types/
│   │   └── index.ts                   # Central TypeScript data models
│   ├── utils/
│   │   ├── advisoryEngine.ts          # Sowing score, GDD, motor twin & mandi algorithms
│   │   └── cropConfig.ts              # Wheat, Rice, Tomato parameters & location configs
│   ├── App.tsx                        # Master single-page interactive command center
│   ├── index.css                      # Tailwind styling & animations
│   └── main.tsx
├── server.ts                          # Express backend with Open-Meteo proxy & Gemini AI
├── metadata.json
├── package.json
└── tsconfig.json
```

---

## 💻 Local Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (Optional for local demo)
# GEMINI_API_KEY="your_api_key_here" in .env

# 3. Start development server (Full-stack Express + Vite)
npm run dev

# App runs at: http://localhost:3000
```

---

## ⏱️ 3-Minute Judge Demonstration Flow

1. **Step 1 — Command Center**: Open app. Note default **Karnal, Haryana** and **Wheat / गेहूं**. Show data mode (`LIVE_DATA`).
2. **Step 2 — Climate Shield**: Examine the 10-year historical climate baseline graph (2016–2025 vs. 2026 forecast) and the 14-day sowing calendar with the Sowing Safety Score (85/100, Favorable).
3. **Step 3 — Virtual Soil Twin**: View the dual-depth soil moisture meter (0–7cm shallow vs. 7–28cm root zone). Point out the tubewell motor digital twin and water/fuel savings estimator.
4. **Step 4 — Trigger Extreme Weather Simulator**: Click **"Simulate Extreme Weather"**. Watch every single widget update coherently:
   - Header & Banner turn red with emergency alert.
   - Sowing calendar marks days RED.
   - Soil motor automatically transitions to `AUTO-OFF`.
   - Disease radar alerts critical fungal spread risk.
   - Mandi engine switches recommendation to `SELL NOW / PROTECT`.
   - 2G SMS preview displays the storm alert in Hindi.
5. **Step 5 — Hindi Voice**: Click **"Listen Alert"** or **"Play Voice Advisory"** to hear browser speech synthesis in Hindi.
6. **Step 6 — AI Crop Doctor**: Switch to Tab B (Photo Diagnosis), select the **Wheat Yellow Rust** sample or upload a photo, click **"Run AI Doctor"**, and show the structured diagnosis with visible symptoms and KVK contact.
7. **Step 7 — Kisaan Pool**: Scroll to Kisaan Pool. Click **"+ Add Produce"** (prefilled with 15 quintals). Submitting brings the pool to exactly 100 quintals (100%), unlocks celebration, and displays verified institutional buyer offers.
8. **Step 8 — Explainable AI**: Click the sparkles icon in the header to show the transparent, unblackboxed formula derivations.
