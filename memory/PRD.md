# Portimão Trip App — v2 (Familia Sacramento • 12-15 Jul 2026)

## Iterations

### Iteration 1 — Sprint 1 Core
- Smart Go (Haversine + walking + Bolt + next bus + POIs)
- Briefings/Alertas contextuais (check-in €24+€200, upgrade, mercado, Benagil, checkout, UV, chuva)
- Autocarros Vai e Vem (L12/14/15/16 hardcoded, real-time countdown)
- Lista Continente (13 itens, 4 categorias, persistência)
- Restaurantes 2.0 (fotos, menus, promos, filtros, Bora lá)
- Weather (Open-Meteo, sem chave)
- Mapa filtrável com Smart Go em cada POI
- AI Chat com Gemini 2.5 Flash via Emergent LLM Key

### Iteration 2 — Dados reais + WOW polish
- **Bilhetes REAIS Rede Expressos** — R6LJC56 (ida 15:15→18:30 Sete Rios→Rua da Abicada lugares 50-53) + R6LJC5N (volta 13:10→16:25 lugares 43-46) + QR codes gerados via quickchart.io + perforation ticket-look
- **Emergências (/emergencia)** — Big 112 card, hospital de Portimão com map, farmácia, PSP, GNR praia, hotel, embaixada BR, todos com tap-to-call (`tel:` links)
- **Onboarding 3 slides** — First-launch only (persistido via `storage.setItem('onboarding_done_v1', true)`), hero images full-screen, floating icon animation, chip badges, dots indicator, "Saltar" / "Continuar" / "Começar viagem"
- **Trip Stats Dashboard** no Home — 3 cards com dias-até/depois, orçamento com progress bar dinâmica, checklist com progress
- **Itinerário atualizado** com horários reais Rede Expressos
- **Explorar hub** com todos os 11 destinos (novo: Bilhetes, Emergências)

## Endpoints
- `GET /api/smart-go?from=X&to=Y` • `/api/briefings` • `/api/bus/schedule` • `/api/bus/next?stop=X`
- `GET /api/weather` (Open-Meteo) • `/api/shopping` + `POST /api/shopping/toggle`
- `GET /api/tickets` (com qr_url) • `/api/emergency` (com lat/lng) • `/api/trip-stats`
- `GET /api/restaurants` (com photo/menu/promo/walk_min)
- Existentes: `/api/trip`, `/api/itinerary`, `/api/hacks`, `/api/kids-activities`, `/api/map-locations`, `/api/budget/expenses`, `/api/checklist`, `/api/gallery`, `/api/diary`, `/api/chat`

## Family Context
- Alex (39), Priscila (38), Alexsandro (11), Arthur (5)
- Studio 17 by Atlantichotels • 12-15 Jul 2026
- Reserva Rede Expressos 26cde43a-57f3-44ee-961d-365506e1dec4

## Testes
- 29 testes backend ✅ (pytest)
- Playwright verificou todos os fluxos frontend

## Deps
- Backend: FastAPI + Motor + httpx + emergentintegrations
- Frontend: Expo SDK 54, expo-router, reanimated 3, expo-image, expo-clipboard, expo-linking, expo-image-picker
