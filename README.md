# Portimão '26 — Trip App

A beautiful Expo mobile app for the Sacramento family's 4-day trip to Portimão, Algarve (12-15 July 2026).

## ✨ Features

- **Smart Go** — bottom-sheet route planner (walking + Bolt + next bus + POIs + Maps deep-link)
- **Contextual briefings** — real-time reminders (check-in €24+€200, upgrade quarto, mercado, Benagil, UV/rain alerts)
- **Live bus schedule** — Vai e Vem lines L12/14/15/16 with countdown
- **Rede Expressos tickets** — real reservations (R6LJC56 ida, R6LJC5N volta) with QR codes
- **Restaurants 2.0** — 10 options including **5 Brazilian** (churrasco, hambúrguer, pastel, açaí, feijoada) with menus and 2026 prices
- **Continente shopping list** — 13 items pre-populated, ~€35 for family × 3 days
- **Gallery** — photos & videos with **open / save-to-device / share** actions
- **Emergency contacts** — 112 + hospital + farmácia + PSP + GNR with tap-to-call
- **Trip dashboard** — live stats (days until, budget with progress, checklist progress)
- **Onboarding** — 3-slide first-launch experience
- **Weather live** — Open-Meteo integration, UV/rain alerts
- **AI Chat "Guia Algarve"** — Gemini 2.5 Flash via Emergent LLM Key

## 🚀 Stack

- **Backend**: FastAPI + Motor (MongoDB) + httpx + emergentintegrations
- **Frontend**: Expo SDK 54, expo-router, Reanimated 3, expo-image, expo-video, expo-media-library

## 🎨 Branding

Custom logo (rounded teal card + sun + waves + sailboat + `P` mark with '26 coral dots). PWA-ready — "Add to Home Screen" installs with the custom icon.

## 🏃 Running locally

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn server:app --reload

# Frontend
cd frontend && yarn && yarn expo start
```

Set `MONGO_URL`, `DB_NAME`, and `EMERGENT_LLM_KEY` in `backend/.env`.

## 👪 Family Context

- Alex (39), Priscila (38), Alexsandro (11), Arthur (5)
- Studio 17 by Atlantichotels • 12-15 Jul 2026
- Budget €250-290 (with self-catering hack saving €80-120)

## 📝 License

Private — Família Sacramento only.
