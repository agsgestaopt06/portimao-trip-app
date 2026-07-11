# Portimão Trip App — Sprint 1 Complete (Familia Sacramento • 12-15 Jul 2026)

## What's New

### Sprint 1 — Core "Wow" Delivered
1. **Smart Go bottom sheet** — `/api/smart-go?from=X&to=Y` returns Haversine distance, walking (≈12 min/km), Bolt estimate (€3 base + €1.5/km), next bus (with direct badge), 3 nearby POIs, Google Maps deep link. Reusable component `SmartGoSheet` used in Home, Map, Restaurants.
2. **Briefings / Alertas contextuais** — `/api/briefings` deterministic time-aware cards:
   - Check-in Studio 17 (€24 taxa turística + €200 caução + pedir upgrade)
   - Continente fecha 22h (link para /shopping)
   - Benagil hoje / amanhã (Smart Go até Marina)
   - Vai e Vem L14 → Alvor
   - Check-out às 11h
   - UV extremo (dinâmico via Open-Meteo)
   - Chuva prevista (dinâmico)
3. **Autocarros Vai e Vem em tempo real** — hardcoded schedule das 4 linhas reais (L12, L14, L15, L16), endpoints `/api/bus/schedule` e `/api/bus/next?stop=X`, widget horizontal no Home com contagem regressiva.
4. **Lista de compras inteligente** — `/shopping` screen com 13 itens seed (Continente Portimão, ~€35 família 3 dias), 4 categorias, checkboxes persistentes em Mongo, botão "Abrir Continente" (Google Maps).
5. **Bilhetes digitais** — `/tickets` com 4 cartões estilo Wallet (FlixBus ida/volta, Studio 17, Benagil), código com cópia ao toque, partilha WhatsApp.
6. **Restaurantes 2.0** — 5 restaurantes com fotos hero (Unsplash), rating + reviews, promo badge, walking time desde hotel, expansão para menu com preços, filtros (Todos / Kids / Vista mar / Até €15 / Vegetariano / Poupança), botão "Bora lá!" → SmartGoSheet.
7. **Mapa upgraded** — filtros por categoria, pins com cores por tipo, cada POI com "Bora lá" para Smart Go.
8. **Meteorologia Open-Meteo live** — API sem chave, pill no hero mostra temperatura + UV, alertas quando UV ≥ 8 ou chuva ≥ 40%.
9. **Animações Reanimated** — countdown pulsante, hero rotativo (Praia da Rocha / Benagil / Marina cada 6s), staggered FadeInDown em todos os cards, boat icon flutuante.
10. **AI Chat migrado** — Gemini 2.5 Flash via Emergent LLM Key (`emergentintegrations`), sem key adicional necessária.

## Tech Stack
- **Backend**: FastAPI + Motor (MongoDB async) + httpx + emergentintegrations
- **Frontend**: Expo Router, Reanimated 3, expo-image, expo-clipboard, expo-linking

## Env Vars
- `MONGO_URL`, `DB_NAME` — MongoDB local
- `EMERGENT_LLM_KEY` — Universal LLM key (Emergent)

## Key Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/smart-go?from=X&to=Y` | Route planner |
| GET | `/api/briefings` | Contextual reminders |
| GET | `/api/bus/schedule` | All bus lines |
| GET | `/api/bus/next?stop=X` | Next bus at stop |
| GET | `/api/weather` | Open-Meteo weather for Portimão |
| GET | `/api/shopping` | Continente list |
| POST | `/api/shopping/toggle` | Check/uncheck item |
| GET | `/api/tickets` | Digital tickets |
| GET | `/api/restaurants` | Enhanced restaurants (photos, menu, promo) |
| POST | `/api/chat` | AI Guia Algarve |

## Family Context
- Alex (39), Priscila (38), Alexsandro (11), Arthur (5)
- Studio 17 by Atlantichotels • 12-15 Julho 2026
- Budget €250-290 (with self-catering hack)

## Next Sprints (recommended)
- Sprint 2 → Diário automático, chat com actions estruturadas
- Sprint 3 → Onboarding 3 slides, dark mode, tradução EN/ES
- Sprint 4 → Album colaborativo com upload multi-foto e vídeo resumo
