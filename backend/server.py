from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import math
import logging
import httpx
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Portimão '26 – Família Sacramento")
api_router = APIRouter(prefix="/api")


# ============ Models ============
class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    description: str
    amount: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float


class ChecklistToggle(BaseModel):
    id: str
    checked: bool


class PhotoCreate(BaseModel):
    caption: str
    image_base64: str
    day: int


class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    caption: str
    image_base64: str
    day: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DiaryEntryCreate(BaseModel):
    title: str
    content: str
    day: int
    mood: str


class DiaryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    day: int
    mood: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class ShoppingToggle(BaseModel):
    id: str
    checked: bool


# ============ Static Trip Data ============
TRIP_INFO = {
    "destination": "Portimão • Algarve",
    "start_date": "2026-07-12",
    "end_date": "2026-07-15",
    "family": ["Alex (39)", "Priscila (38)", "Alexsandro (11)", "Arthur (5)"],
    "hotel_name": "Studio 17 by Atlantichotels",
    "hotel_address": "Rua João Simões Tavares 17, Urb. Alto do Quintão, Portimão 8500-293",
    "check_in": "12 Jul • ~16:00",
    "check_out": "15 Jul • 11:00",
    "budget_min": 250,
    "budget_max": 290,
}

ITINERARY = [
    {"day": 1, "date": "12 Julho", "weekday": "Domingo", "title": "Chegada tranquila", "subtitle": "Lisboa → Portimão • Descompressão",
     "events": [
         {"time": "15:15", "title": "Rede Expressos • Lisboa Sete Rios", "description": "Embarque com bilhete digital R6LJC56. Lugares 50-53 (janela reservados). Chegar 15 min antes.", "icon": "bus", "highlight": False},
         {"time": "18:30", "title": "Chegada a Portimão", "description": "Terminal Rodoviário Rua da Abicada. Bolt/táxi até Studio 17 (€6-10 • 10-15 min).", "icon": "location", "highlight": False},
         {"time": "19:15", "title": "Check-in Studio 17", "description": "€24 taxa turística + €200 caução (cartão). Pedir upgrade!", "icon": "home", "highlight": True},
         {"time": "20:30", "title": "Jantar leve no apartamento", "description": "Self-catering — poupança inicial 💰", "icon": "restaurant", "highlight": True},
     ]},
    {"day": 2, "date": "13 Julho", "weekday": "Segunda", "title": "Praia + Grutas de Benagil", "subtitle": "O dia mais épico da viagem",
     "events": [
         {"time": "09:30", "title": "Praia da Rocha", "description": "Castelos de areia, banhos, brincadeiras (até 13h00).", "icon": "sunny", "highlight": False},
         {"time": "13:00", "title": "Almoço com vista", "description": "La Gioconda — pizzas €13,50-15,50.", "icon": "pizza", "highlight": False},
         {"time": "15:00", "title": "Grutas de Benagil 🌊", "description": "Tour de barco small-group ~€30/pessoa. Levar câmara!", "icon": "boat", "highlight": True},
         {"time": "19:30", "title": "Jantar relaxado", "description": "Self-catering no apartamento — recuperar do sol.", "icon": "restaurant", "highlight": False},
     ]},
    {"day": 3, "date": "14 Julho", "weekday": "Terça", "title": "Exploração flexível", "subtitle": "Alvor ou mais praia • Jantar especial",
     "events": [
         {"time": "10:00", "title": "Vai e Vem para Alvor", "description": "Linha 14 (~€1,60-2,50). Alvor tem praia super calma para o Arthur.", "icon": "bus", "highlight": False},
         {"time": "13:00", "title": "Almoço tradicional", "description": "Peixe grelhado numa tasca local €14-18/pessoa.", "icon": "fish", "highlight": False},
         {"time": "16:00", "title": "Gelados na marginal", "description": "€3-4,50 cada. Ritmo lento e fotos ao pôr do sol.", "icon": "ice-cream", "highlight": False},
         {"time": "20:00", "title": "Jantar especial: W-Wine", "description": "Food & Friends — Mediterrânea €20-25/pessoa.", "icon": "wine", "highlight": True},
     ]},
    {"day": 4, "date": "15 Julho", "weekday": "Quarta", "title": "Regresso organizado", "subtitle": "Últimos momentos • Volta a Lisboa",
     "events": [
         {"time": "09:00", "title": "Pequeno-almoço no apartamento", "description": "Terminar mantimentos comprados no Continente.", "icon": "cafe", "highlight": False},
         {"time": "10:00", "title": "Último passeio curto", "description": "Fotos finais na marginal da Praia da Rocha.", "icon": "camera", "highlight": False},
         {"time": "11:00", "title": "Check-out Studio 17", "description": "Bolt até Terminal Rodoviário Rua da Abicada (~€6-8).", "icon": "log-out", "highlight": False},
         {"time": "13:10", "title": "Rede Expressos • Regresso", "description": "R6LJC5N • Lugares 43-46. Portimão → Lisboa Sete Rios. Chegada 16:25.", "icon": "bus", "highlight": True},
     ]},
]

# Enhanced restaurants with photos, menu, promo, distance-from-hotel (walking min)
RESTAURANTS = [
    {
        "id": "la-gioconda",
        "name": "La Gioconda",
        "type": "Pizzaria & Trattoria",
        "price_range": "€14-18/pessoa",
        "price_avg": 16,
        "rating": 4.6,
        "reviews": 1243,
        "highlights": "Pizzas €13,50-15,50 (Margherita, Terrazza). Esplanada com vista Praia da Rocha.",
        "recommended_for": "Almoço Dia 2 com crianças",
        "image_key": "pizza",
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Pizza Margherita", "price": "€13,50"},
            {"name": "Pizza Terrazza (fiambre + funghi)", "price": "€15,50"},
            {"name": "Lasagna della casa", "price": "€12,00"},
        ],
        "promo": "Menu do dia até 15h — pizza + bebida €11,90",
        "tags": ["kids-friendly", "vista-mar", "menu-do-dia"],
        "location_id": "la-gioconda",
        "latitude": 37.1170, "longitude": -8.5385,
    },
    {
        "id": "squash",
        "name": "Restaurante Squash",
        "type": "Internacional",
        "price_range": "€18-22/pessoa",
        "price_avg": 20,
        "rating": 4.5,
        "reviews": 892,
        "highlights": "Muito bem avaliado. Boa variedade para família.",
        "recommended_for": "Jantar variado",
        "image_key": "international",
        "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Bacalhau à Brás", "price": "€16,00"},
            {"name": "Frango da casa", "price": "€14,00"},
            {"name": "Bife da vazia com molho pimenta", "price": "€19,50"},
        ],
        "promo": None,
        "tags": ["kids-friendly", "vegetariano"],
        "location_id": "la-gioconda",
        "latitude": 37.1195, "longitude": -8.5390,
    },
    {
        "id": "w-wine",
        "name": "W – Wine, Food & Friends",
        "type": "Mediterrânea",
        "price_range": "€20-25/pessoa",
        "price_avg": 23,
        "rating": 4.8,
        "reviews": 654,
        "highlights": "Excelente qualidade. Ambiente elegante.",
        "recommended_for": "Jantar especial Dia 3",
        "image_key": "mediterranean",
        "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Polvo à lagareiro", "price": "€22,00"},
            {"name": "Risoto de camarão", "price": "€19,50"},
            {"name": "Vinho da casa (copo)", "price": "€3,50"},
        ],
        "promo": "Happy hour 18-20h — vinho €2",
        "tags": ["vista-mar", "especial", "vegetariano"],
        "location_id": "w-wine",
        "latitude": 37.1362, "longitude": -8.5425,
    },
    {
        "id": "tradicional",
        "name": "O Viriato",
        "type": "Português tradicional",
        "price_range": "€15-20/pessoa",
        "price_avg": 17,
        "rating": 4.7,
        "reviews": 511,
        "highlights": "Peixe grelhado €14-18. Cataplana €28-38 (2 pessoas).",
        "recommended_for": "Sabores autênticos",
        "image_key": "portuguese",
        "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Peixe grelhado do dia", "price": "€16,00"},
            {"name": "Cataplana (2 pax)", "price": "€32,00"},
            {"name": "Arroz de marisco", "price": "€18,00"},
        ],
        "promo": "Cataplana para 2 — €32 (poupança €6 vs. peixe individual x2)",
        "tags": ["tradicional", "familiar"],
        "location_id": "la-gioconda",
        "latitude": 37.1180, "longitude": -8.5378,
    },
    {
        "id": "self-catering",
        "name": "Cozinha Studio 17",
        "type": "Self-Catering (HACK)",
        "price_range": "€8-12/refeição família",
        "price_avg": 10,
        "rating": 5.0,
        "reviews": None,
        "highlights": "Continente perto: leite, pão, fruta, iogurtes, fiambre, água. Poupança €80-120.",
        "recommended_for": "Pequenos-almoços e jantares leves",
        "image_key": "market",
        "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Pequeno-almoço família", "price": "~€6"},
            {"name": "Sandwich + fruta", "price": "~€8"},
            {"name": "Massa + molho + salada", "price": "~€10"},
        ],
        "promo": "Hack de ouro — €80-120 poupança na viagem",
        "tags": ["hack", "kids-friendly"],
        "location_id": "hotel",
        "latitude": 37.1400, "longitude": -8.5450,
    },
    # ---- 🇧🇷 BRAZILIAN RESTAURANTS ----
    {
        "id": "churrascaria-brasa",
        "name": "Brasa Churrascaria",
        "type": "🇧🇷 Rodízio brasileiro",
        "price_range": "€22-28/pessoa",
        "price_avg": 25,
        "rating": 4.7,
        "reviews": 428,
        "highlights": "Rodízio de carnes com picanha, alcatra, linguiça e frango. Buffet de acompanhamentos brasileiros à vontade.",
        "recommended_for": "Jantar em família à brasileira",
        "image_key": "churrasco",
        "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Rodízio completo adulto", "price": "€24,90"},
            {"name": "Rodízio criança (5-11)", "price": "€12,50"},
            {"name": "Picanha na tábua (2 pax)", "price": "€28,00"},
            {"name": "Caipirinha tradicional", "price": "€6,50"},
            {"name": "Guaraná Antarctica lata", "price": "€2,50"},
        ],
        "promo": "Crianças até 5 anos GRÁTIS no rodízio — Arthur come de graça!",
        "tags": ["brasileiro", "kids-friendly", "familiar", "carne"],
        "location_id": "hotel",
        "latitude": 37.1385, "longitude": -8.5428,
    },
    {
        "id": "boteco-rio",
        "name": "Boteco do Rio",
        "type": "🇧🇷 Botequim & hambúrgueres",
        "price_range": "€10-16/pessoa",
        "price_avg": 13,
        "rating": 4.6,
        "reviews": 312,
        "highlights": "Hambúrgueres artesanais estilo carioca, batata rústica, petiscos e cerveja gelada. Ambiente descontraído.",
        "recommended_for": "Almoço rápido e saboroso",
        "image_key": "hamburger",
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "X-Burger Boteco (200g)", "price": "€9,90"},
            {"name": "X-Tudo (bacon+ovo+queijo)", "price": "€12,50"},
            {"name": "Hambúrguer criança + batata", "price": "€6,50"},
            {"name": "Bolinho de bacalhau (6 un.)", "price": "€6,00"},
            {"name": "Coxinha de frango (2 un.)", "price": "€3,50"},
            {"name": "Suco de maracujá natural", "price": "€3,00"},
        ],
        "promo": "Menu executivo almoço 12h-15h: X-Burger + batata + refri €10,90",
        "tags": ["brasileiro", "kids-friendly", "hamburger", "petiscos"],
        "location_id": "praia-rocha",
        "latitude": 37.1178, "longitude": -8.5395,
    },
    {
        "id": "pastel-cia",
        "name": "Pastel & Cia",
        "type": "🇧🇷 Pastelaria brasileira",
        "price_range": "€3-8/pessoa",
        "price_avg": 5,
        "rating": 4.8,
        "reviews": 267,
        "highlights": "Pastéis fritos na hora estilo feira paulista, coxinhas, brigadeiros e beijinhos. Ideal para lanche de tarde.",
        "recommended_for": "Lanche da tarde • Arthur adora!",
        "image_key": "pastel",
        "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Pastel de carne", "price": "€2,50"},
            {"name": "Pastel de queijo", "price": "€2,20"},
            {"name": "Pastel de frango c/ catupiry", "price": "€2,80"},
            {"name": "Coxinha (200g)", "price": "€2,50"},
            {"name": "Brigadeiro gourmet (un.)", "price": "€1,50"},
            {"name": "Caldo de cana 300ml", "price": "€2,80"},
        ],
        "promo": "Combo pastel + suco natural €4,50 (poupança €1)",
        "tags": ["brasileiro", "kids-friendly", "lanche", "barato"],
        "location_id": "praia-rocha",
        "latitude": 37.1165, "longitude": -8.5401,
    },
    {
        "id": "acai-sol",
        "name": "Açaí do Sol",
        "type": "🇧🇷 Açaí & tapioca",
        "price_range": "€5-9/pessoa",
        "price_avg": 7,
        "rating": 4.9,
        "reviews": 189,
        "highlights": "Açaí cremoso da Amazónia com granola, banana e leite condensado. Tapiocas doces e salgadas. Perfeito no calor.",
        "recommended_for": "Refresco pós-praia",
        "image_key": "acai",
        "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Açaí 300ml + 2 acompanhamentos", "price": "€5,90"},
            {"name": "Açaí 500ml completo", "price": "€8,50"},
            {"name": "Tapioca queijo + presunto", "price": "€5,00"},
            {"name": "Tapioca banana + Nutella", "price": "€5,50"},
            {"name": "Sumo natural (300ml)", "price": "€3,50"},
        ],
        "promo": "Happy hour 15h-17h — açaí 300ml €4,90",
        "tags": ["brasileiro", "vegetariano", "kids-friendly", "vista-mar", "saudável"],
        "location_id": "praia-rocha",
        "latitude": 37.1158, "longitude": -8.5378,
    },
    {
        "id": "feijoada-mineira",
        "name": "Sabor Mineiro",
        "type": "🇧🇷 Comida tradicional brasileira",
        "price_range": "€14-20/pessoa",
        "price_avg": 17,
        "rating": 4.7,
        "reviews": 234,
        "highlights": "Feijoada aos sábados, moqueca de peixe, arroz com feijão, farofa e couve. Sabores autênticos do Brasil.",
        "recommended_for": "Almoço de domingo (chegada!)",
        "image_key": "feijoada",
        "image_url": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Feijoada completa (sábado)", "price": "€16,50"},
            {"name": "Moqueca de peixe (2 pax)", "price": "€28,00"},
            {"name": "Prato feito (arroz+feijão+bife)", "price": "€11,90"},
            {"name": "Frango xadrez c/ arroz", "price": "€12,50"},
            {"name": "Pudim de leite", "price": "€3,50"},
            {"name": "Caipirinha", "price": "€6,00"},
        ],
        "promo": "Prato executivo do dia (arroz+feijão+carne+salada) €10,90",
        "tags": ["brasileiro", "familiar", "tradicional"],
        "location_id": "hotel",
        "latitude": 37.1395, "longitude": -8.5442,
    },
    # ---- 🐟 MAIS PORTUGUESES / MARISCO ----
    {
        "id": "dona-barca",
        "name": "Marisqueira Dona Barca",
        "type": "🐟 Marisco tradicional",
        "price_range": "€22-35/pessoa",
        "price_avg": 28,
        "rating": 4.7,
        "reviews": 3210,
        "highlights": "Cataplana famosa, arroz de marisco, sardinhas grelhadas. Uma instituição de Portimão.",
        "recommended_for": "Almoço especial de peixe",
        "image_key": "marisco",
        "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Cataplana de peixe (2 pax)", "price": "€38,00"},
            {"name": "Arroz de marisco", "price": "€22,00"},
            {"name": "Sardinhas grelhadas 6un.", "price": "€12,00"},
            {"name": "Polvo à lagareiro", "price": "€21,00"},
            {"name": "Menu criança", "price": "€8,50"},
        ],
        "promo": "Sardinhada quinta e sexta 19h — 8 sardinhas + salada €14",
        "tags": ["kids-friendly", "tradicional", "marisco"],
        "location_id": "praia-rocha",
        "latitude": 37.1188, "longitude": -8.5411,
    },
    {
        "id": "sushi-portimao",
        "name": "Sushi Sky Portimão",
        "type": "🍣 Sushi & rolls",
        "price_range": "€15-22/pessoa",
        "price_avg": 18,
        "rating": 4.6,
        "reviews": 1120,
        "highlights": "All-you-can-eat sushi ao almoço €14,90. Fresco e variado. Ambiente moderno.",
        "recommended_for": "Almoço com Alexsandro (adora sushi)",
        "image_key": "sushi",
        "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Rodízio almoço (12h-15h)", "price": "€14,90"},
            {"name": "Rodízio jantar (19h-22h)", "price": "€19,90"},
            {"name": "Rodízio criança (5-11)", "price": "€8,50"},
            {"name": "Combinado 24 pçs", "price": "€18,00"},
            {"name": "Miso soup", "price": "€2,50"},
        ],
        "promo": "Ao almoço 12h-15h €14,90 all-you-can-eat — grande poupança!",
        "tags": ["kids-friendly", "sushi", "vegetariano", "poupança"],
        "location_id": "praia-rocha",
        "latitude": 37.1182, "longitude": -8.5395,
    },
    {
        "id": "gelataria-portimao",
        "name": "Gelateria Massimiliano",
        "type": "🍦 Gelataria artesanal italiana",
        "price_range": "€3-5/pessoa",
        "price_avg": 4,
        "rating": 4.9,
        "reviews": 2340,
        "highlights": "Gelato feito na hora com receitas italianas. 24 sabores incluindo doce-de-leite e cheesecake.",
        "recommended_for": "Sobremesa depois da praia",
        "image_key": "gelato",
        "image_url": "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "1 bola cone/copo", "price": "€2,80"},
            {"name": "2 bolas", "price": "€4,20"},
            {"name": "3 bolas + chantilly", "price": "€6,00"},
            {"name": "Milkshake sabor à escolha", "price": "€4,50"},
            {"name": "Taça infantil (Arthur)", "price": "€2,50"},
        ],
        "promo": "Happy hour 15h-17h — 2 bolas €3,20 (poupança €1)",
        "tags": ["kids-friendly", "vegetariano", "sobremesa"],
        "location_id": "praia-rocha",
        "latitude": 37.1175, "longitude": -8.5398,
    },
    {
        "id": "padaria-tentacao",
        "name": "A Tentação • Produtos Gourmet",
        "type": "🥐 Padaria & pastelaria",
        "price_range": "€2-6/pessoa",
        "price_avg": 4,
        "rating": 4.7,
        "reviews": 890,
        "highlights": "990m do Studio 17! Pão fresco, pastéis-de-nata, sandes gourmet. Perfeito para pequenos-almoços.",
        "recommended_for": "Pequeno-almoço rápido",
        "image_key": "padaria",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Pastel-de-nata", "price": "€1,20"},
            {"name": "Croissant misto", "price": "€2,80"},
            {"name": "Sandes fumeiro + queijo", "price": "€3,90"},
            {"name": "Sumo natural laranja", "price": "€2,50"},
            {"name": "Bolo do dia fatia", "price": "€2,30"},
        ],
        "promo": "Combo pequeno-almoço (café+nata+sumo) €4,50",
        "tags": ["kids-friendly", "pequeno-almoço", "barato", "poupança"],
        "location_id": "hotel",
        "latitude": 37.1408, "longitude": -8.5442,
    },
    {
        "id": "pizza-brasil",
        "name": "🇧🇷 Pizzaria Sabor do Brasil",
        "type": "🇧🇷 Pizza estilo brasileiro",
        "price_range": "€9-14/pizza",
        "price_avg": 12,
        "rating": 4.5,
        "reviews": 456,
        "highlights": "Pizza brasileira com bordas recheadas, sabores como calabresa, portuguesa, catupiry.",
        "recommended_for": "Jantar rápido e barato",
        "image_key": "pizza-br",
        "image_url": "https://images.unsplash.com/photo-1548369937-47519962c11a?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Pizza Calabresa (grande)", "price": "€12,50"},
            {"name": "Pizza Portuguesa (grande)", "price": "€13,50"},
            {"name": "Pizza Catupiry frango", "price": "€13,00"},
            {"name": "Pizza doce (banana canela)", "price": "€10,00"},
            {"name": "Refri lata", "price": "€2,00"},
        ],
        "promo": "2 pizzas grandes €22 (poupança €5) — perfeito família 4pax",
        "tags": ["brasileiro", "kids-friendly", "pizza", "poupança"],
        "location_id": "hotel",
        "latitude": 37.1392, "longitude": -8.5450,
    },
    {
        "id": "praia-esplanada",
        "name": "Esplanada da Rocha",
        "type": "☕ Café praia • esplanada",
        "price_range": "€4-10/pessoa",
        "price_avg": 6,
        "rating": 4.4,
        "reviews": 1560,
        "highlights": "Café e petiscos com vista para a Praia da Rocha. Ideal para snack a meio da tarde.",
        "recommended_for": "Pausa entre praia e passeio",
        "image_key": "esplanada",
        "image_url": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Bica (café expresso)", "price": "€0,90"},
            {"name": "Galão", "price": "€1,80"},
            {"name": "Pastel-de-nata", "price": "€1,50"},
            {"name": "Sandes mista tostada", "price": "€3,80"},
            {"name": "Sumo natural", "price": "€3,50"},
            {"name": "Bolinho de bacalhau (un.)", "price": "€1,20"},
        ],
        "promo": "Cerveja + tremoços grátis das 17h-19h",
        "tags": ["kids-friendly", "vista-mar", "barato", "poupança"],
        "location_id": "praia-rocha",
        "latitude": 37.1158, "longitude": -8.5375,
    },
    {
        "id": "vegan-portimao",
        "name": "Verde Puro",
        "type": "🌱 Vegetariano & vegan",
        "price_range": "€10-15/pessoa",
        "price_avg": 12,
        "rating": 4.6,
        "reviews": 340,
        "highlights": "Buffet vegetariano ao almoço, hambúrgueres vegan, sumos detox. Único vegan em Portimão.",
        "recommended_for": "Alternativa saudável",
        "image_key": "vegan",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
        "menu": [
            {"name": "Buffet vegetariano (kg)", "price": "€10,90"},
            {"name": "Hambúrguer vegan (grão)", "price": "€8,50"},
            {"name": "Wrap tofu marinado", "price": "€7,00"},
            {"name": "Sumo verde detox", "price": "€4,00"},
            {"name": "Sobremesa vegan", "price": "€3,50"},
        ],
        "promo": "Almoço executivo €9,90 (prato + sumo)",
        "tags": ["vegetariano", "kids-friendly", "saudável", "poupança"],
        "location_id": "hotel",
        "latitude": 37.1388, "longitude": -8.5432,
    },
]

HACKS = [
    {"id": "self-cater", "title": "Cozinha do Studio 17", "description": "Compras no Continente logo no Dia 1. Pequeno-almoço + jantares leves = poupança de €80-120 na viagem inteira.", "savings": "€80-120", "icon": "cart", "category": "Comida"},
    {"id": "benagil-smallgroup", "title": "Benagil Small-Group", "description": "Tour small-group (não grande barco). Melhor relação qualidade/preço. Mais tempo dentro da gruta.", "savings": "€40-60", "icon": "boat", "category": "Atividades"},
    {"id": "bolt-vaivem", "title": "Bolt + Vai e Vem", "description": "Bolt só quando necessário com crianças cansadas. Vai e Vem (Linha 14) para Alvor por €1,60.", "savings": "€25-40", "icon": "car", "category": "Transporte"},
    {"id": "upgrade-quarto", "title": "Peçam upgrade do quarto", "description": "No check-in, pergunta simpaticamente 'há upgrade disponível?'. Fora do fim-de-semana, às vezes dão grátis.", "savings": "Grátis 🎁", "icon": "sparkles", "category": "Alojamento"},
    {"id": "praia-timing", "title": "Praia antes das 11h", "description": "Chegar cedo à Praia da Rocha = melhor sítio no areal + sol menos agressivo para o Arthur (5).", "savings": "Conforto máximo", "icon": "sunny", "category": "Praia"},
    {"id": "spf-agua", "title": "SPF50+ e água constante", "description": "Reaplicar protetor a cada 2h. Água a cada 30min para as crianças. Chapéu obrigatório.", "savings": "Saúde", "icon": "water", "category": "Segurança"},
    {"id": "esplanada-timing", "title": "Esplanadas fora do rush", "description": "Café/pastel de nata €1,90-2,50. Ir 10h-12h ou 15h-17h para evitar filas.", "savings": "€10-20", "icon": "cafe", "category": "Comida"},
    {"id": "flixbus-hack", "title": "FlixBus na app", "description": "Bilhete digital, chegar 30-40 min antes, lugares janela. Powerbank + tablet offline para as crianças.", "savings": "Já reservado", "icon": "phone-portrait", "category": "Transporte"},
]

KIDS_ACTIVITIES = [
    {"id": "castelos", "title": "Castelos de areia", "description": "Clássico e viciante. Balde + pá + moldes na mala.", "icon": "construct", "age_range": "5+ e 11+"},
    {"id": "caca-tesouro", "title": "Caça ao tesouro", "description": "Conchas, pedras coloridas, caranguejos escondidos.", "icon": "search", "age_range": "5+ e 11+"},
    {"id": "bola-frisbee", "title": "Bola / Frisbee", "description": "Alexsandro (11) mais ativo. Arthur (5) brinca ao lado.", "icon": "football", "age_range": "Toda a família"},
    {"id": "agua-rasa", "title": "Brincadeiras na água rasa", "description": "Chapinhar e fazer castelos de água. Sempre com supervisão.", "icon": "water", "age_range": "5+ com supervisão"},
    {"id": "rochas", "title": "Exploração nas rochas", "description": "Poças e peixinhos. Só com adulto ao lado.", "icon": "leaf", "age_range": "11+ (ou 5+ com adulto)"},
    {"id": "gelado", "title": "Gelado na marginal", "description": "Recompensa final do dia. Todos ganham.", "icon": "ice-cream", "age_range": "Toda a família"},
]

CHECKLIST_DEFAULT = [
    {"id": "spf50", "label": "Protetor solar FPS50+ (essencial)", "category": "Proteção"},
    {"id": "chapeus", "label": "Chapéus para todos", "category": "Proteção"},
    {"id": "oculos", "label": "Óculos de sol (4)", "category": "Proteção"},
    {"id": "fatos-banho", "label": "Fatos de banho x2 por pessoa", "category": "Praia"},
    {"id": "kit-praia", "label": "Kit de praia (balde, pá, moldes)", "category": "Praia"},
    {"id": "toalhas", "label": "Toalhas de praia", "category": "Praia"},
    {"id": "guarda-sol", "label": "Guarda-sol (ou alugar €10/dia)", "category": "Praia"},
    {"id": "lanches", "label": "Lanches + água (autocarro)", "category": "Viagem"},
    {"id": "powerbank", "label": "Powerbank carregado", "category": "Viagem"},
    {"id": "tablets", "label": "Tablets com jogos/vídeos offline", "category": "Viagem"},
    {"id": "flixbus", "label": "Bilhetes FlixBus no telemóvel", "category": "Viagem"},
    {"id": "medicamentos", "label": "Medicamentos básicos + tiritas", "category": "Saúde"},
    {"id": "docs", "label": "Documentos de identificação", "category": "Documentos"},
    {"id": "cartao-cheq", "label": "€24 taxa turística + €200 caução (cartão)", "category": "Documentos"},
    {"id": "reservas", "label": "Confirmação Studio 17 + FlixBus", "category": "Documentos"},
    {"id": "roupa-fresca", "label": "Roupa fresca (28-32°C esperado)", "category": "Roupa"},
    {"id": "sapatilhas", "label": "Sapatilhas confortáveis", "category": "Roupa"},
    {"id": "chinelos", "label": "Chinelos para praia", "category": "Roupa"},
    {"id": "apps", "label": "Apps: FlixBus, Bolt, Google Maps", "category": "Digital"},
    {"id": "benagil", "label": "Reservar tour de Benagil", "category": "Atividades"},
]

MAP_LOCATIONS = [
    {"id": "hotel", "name": "Studio 17 by Atlantichotels", "category": "Hospedagem", "latitude": 37.1400, "longitude": -8.5450, "description": "A nossa base • cozinha completa", "icon": "home"},
    {"id": "praia-rocha", "name": "Praia da Rocha", "category": "Praia", "latitude": 37.1157, "longitude": -8.5372, "description": "Areal enorme • castelos de areia", "icon": "sunny"},
    {"id": "marina", "name": "Marina de Portimão", "category": "Ponto de partida", "latitude": 37.1236, "longitude": -8.5311, "description": "Barcos para Benagil", "icon": "boat"},
    {"id": "benagil", "name": "Grutas de Benagil", "category": "Atividade principal", "latitude": 37.0879, "longitude": -8.4272, "description": "A gruta mais famosa do mundo 🌊", "icon": "compass"},
    {"id": "la-gioconda", "name": "La Gioconda", "category": "Restaurante", "latitude": 37.1170, "longitude": -8.5385, "description": "Pizzaria com vista • €14-18", "icon": "pizza"},
    {"id": "w-wine", "name": "W – Wine, Food & Friends", "category": "Restaurante", "latitude": 37.1362, "longitude": -8.5425, "description": "Jantar especial Dia 3", "icon": "wine"},
    {"id": "alvor", "name": "Alvor (Vai e Vem L14)", "category": "Exploração", "latitude": 37.1289, "longitude": -8.5945, "description": "Praia calma • ideal para Arthur", "icon": "leaf"},
    {"id": "continente", "name": "Continente Portimão", "category": "Compras (Hack)", "latitude": 37.1391, "longitude": -8.5401, "description": "Mantimentos self-catering", "icon": "cart"},
]

LOC_BY_ID = {l["id"]: l for l in MAP_LOCATIONS}

# ---- Bus schedule (Fase 1 hardcoded — Vai e Vem Portimão) ----
# Real Vai e Vem lines from Portimão city bus (linhas 12, 14, 15, 16).
# Each line has a list of stops and departure times (HH:MM) from origin.
BUS_LINES = {
    "12": {
        "name": "L12 • Praia da Rocha ↔ Alto do Quintão",
        "color": "#1D8086",
        "stops": ["alto-quintao", "hotel", "praia-rocha", "marina"],
        # Frequency-based schedule: departures every 30 min from 07:00 to 23:00
        "departures": [f"{h:02d}:{m:02d}" for h in range(7, 23) for m in (0, 30)],
    },
    "14": {
        "name": "L14 • Portimão ↔ Alvor",
        "color": "#D96C4E",
        "stops": ["hotel", "continente", "alvor"],
        "departures": [f"{h:02d}:{m:02d}" for h in range(7, 22) for m in (10, 40)],
    },
    "15": {
        "name": "L15 • Centro ↔ Ferragudo",
        "color": "#457B9D",
        "stops": ["hotel", "marina", "praia-rocha"],
        "departures": [f"{h:02d}:{m:02d}" for h in range(7, 22) for m in (5, 25, 45)],
    },
    "16": {
        "name": "L16 • Estação ↔ Praia da Rocha",
        "color": "#2A9D8F",
        "stops": ["hotel", "continente", "marina", "praia-rocha"],
        "departures": [f"{h:02d}:{m:02d}" for h in range(6, 24) for m in (15, 45)],
    },
}

# ---- Shopping default list ----
SHOPPING_DEFAULT = [
    # (id, category, name, brand_note, price)
    ("shp-leite", "essenciais", "Leite meio-gordo 1L", "Continente", 0.99),
    ("shp-pao", "essenciais", "Pão de forma", "Bimbo", 2.29),
    ("shp-iogurte", "essenciais", "Iogurtes pack 8", "Actimel", 4.49),
    ("shp-manteiga", "essenciais", "Manteiga 250g", "Mimosa", 2.89),
    ("shp-agua", "praia", "Água 6x1.5L", "Água mineral", 2.49),
    ("shp-fruta", "praia", "Fruta variada", "Uvas, banana, maçã", 6.00),
    ("shp-bolachas", "praia", "Bolachas Belga (Arthur)", "", 1.79),
    ("shp-massa", "jantares", "Massa 500g", "Milaneza", 0.89),
    ("shp-molho", "jantares", "Molho tomate", "Guloso", 0.99),
    ("shp-fiambre", "jantares", "Fiambre + queijo fatiado", "", 4.50),
    ("shp-ovos", "jantares", "Ovos pack 6", "", 1.79),
    ("shp-spf", "extras", "Protetor SPF50+ criança", "se falhou checklist", 8.50),
    ("shp-gelo", "extras", "Saco de gelo (frigo)", "", 1.50),
]


# ============ Startup: seed DB ============
@app.on_event("startup")
async def startup_seed():
    try:
        # Checklist
        if await db.checklist.count_documents({}) == 0:
            for item in CHECKLIST_DEFAULT:
                await db.checklist.insert_one({**item, "checked": False})
        # Shopping
        if await db.shopping.count_documents({}) == 0:
            for (sid, cat, name, note, price) in SHOPPING_DEFAULT:
                await db.shopping.insert_one({
                    "id": sid, "category": cat, "name": name, "note": note,
                    "price": price, "checked": False,
                })
        logger.info("Startup seed complete")
    except Exception as e:  # noqa: BLE001
        logger.warning("Startup seed skipped: %s", e)


# ============ Utility functions ============
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def now_lisbon() -> datetime:
    # Portugal is WEST/UTC+0 in winter, UTC+1 in summer. For 12-15 July → UTC+1.
    # Use UTC+1 approximation (safer than tzdata for containers).
    return datetime.now(timezone.utc) + timedelta(hours=1)


def next_departure(line_id: str, from_time: Optional[datetime] = None) -> Optional[dict]:
    """Return next departure time & minutes-until for a line, given local time."""
    line = BUS_LINES.get(line_id)
    if not line:
        return None
    now = from_time or now_lisbon()
    now_hm = now.hour * 60 + now.minute
    for dep in line["departures"]:
        h, m = map(int, dep.split(":"))
        dep_hm = h * 60 + m
        if dep_hm >= now_hm:
            return {"time": dep, "minutes_until": dep_hm - now_hm}
    # No more today — first departure tomorrow
    first = line["departures"][0]
    h, m = map(int, first.split(":"))
    dep_hm = h * 60 + m + 24 * 60
    return {"time": first + " (amanhã)", "minutes_until": dep_hm - now_hm}


def lines_serving_stop(stop_id: str) -> List[str]:
    return [lid for lid, l in BUS_LINES.items() if stop_id in l["stops"]]


# ============ Endpoints ============
@api_router.get("/")
async def root():
    return {"app": "Portimão '26 – Família Sacramento", "status": "ok"}


@api_router.get("/trip")
async def get_trip():
    return TRIP_INFO


@api_router.get("/itinerary")
async def get_itinerary():
    return ITINERARY


@api_router.get("/restaurants")
async def get_restaurants():
    # Add walking distance from hotel (Studio 17)
    hotel = LOC_BY_ID["hotel"]
    out = []
    for r in RESTAURANTS:
        km = haversine_km(hotel["latitude"], hotel["longitude"], r["latitude"], r["longitude"])
        walk_min = max(1, int(round(km * 12)))  # ~12 min/km
        out.append({**r, "distance_km": round(km, 2), "walk_min": walk_min})
    return out


@api_router.get("/hacks")
async def get_hacks():
    return HACKS


@api_router.get("/kids-activities")
async def get_kids_activities():
    return KIDS_ACTIVITIES


@api_router.get("/map-locations")
async def get_map_locations():
    return MAP_LOCATIONS


# ---- Budget ----
@api_router.get("/budget/expenses")
async def list_expenses():
    docs = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total = sum(d["amount"] for d in docs)
    return {
        "expenses": docs, "total_spent": round(total, 2),
        "budget_min": TRIP_INFO["budget_min"], "budget_max": TRIP_INFO["budget_max"],
    }


@api_router.post("/budget/expenses")
async def add_expense(payload: ExpenseCreate):
    exp = Expense(**payload.dict())
    await db.expenses.insert_one(exp.dict())
    return exp


@api_router.delete("/budget/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": expense_id}


# ---- Checklist ----
@api_router.get("/checklist")
async def get_checklist():
    return await db.checklist.find({}, {"_id": 0}).to_list(500)


@api_router.post("/checklist/toggle")
async def toggle_checklist(payload: ChecklistToggle):
    await db.checklist.update_one({"id": payload.id}, {"$set": {"checked": payload.checked}})
    return await db.checklist.find_one({"id": payload.id}, {"_id": 0})


# ---- Photos ----
@api_router.get("/gallery")
async def list_photos():
    return await db.photos.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.post("/gallery")
async def add_photo(payload: PhotoCreate):
    photo = Photo(**payload.dict())
    await db.photos.insert_one(photo.dict())
    return photo


@api_router.delete("/gallery/{photo_id}")
async def delete_photo(photo_id: str):
    result = await db.photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": photo_id}


# ---- Diary ----
@api_router.get("/diary")
async def list_diary():
    return await db.diary.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.post("/diary")
async def add_diary(payload: DiaryEntryCreate):
    entry = DiaryEntry(**payload.dict())
    await db.diary.insert_one(entry.dict())
    return entry


@api_router.delete("/diary/{entry_id}")
async def delete_diary(entry_id: str):
    result = await db.diary.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": entry_id}


# ============ NEW SPRINT 1 ENDPOINTS ============

# ---- Smart Go ----
@api_router.get("/smart-go")
async def smart_go(from_id: str = Query(..., alias="from"), to_id: str = Query(..., alias="to")):
    src = LOC_BY_ID.get(from_id)
    dst = LOC_BY_ID.get(to_id)
    if not src or not dst:
        raise HTTPException(status_code=404, detail="Location not found")

    km = haversine_km(src["latitude"], src["longitude"], dst["latitude"], dst["longitude"])
    walk_min = int(round(km * 12))  # ~12 min/km
    bolt_eur = round(3 + km * 1.5, 2)  # €3 base + €1.5/km heuristic

    # Next bus: pick a line that serves both src and dst if any, else src
    common_lines = [lid for lid, l in BUS_LINES.items()
                    if from_id in l["stops"] and to_id in l["stops"]]
    src_lines = lines_serving_stop(from_id) or []
    picked = None
    line_id = None
    if common_lines:
        line_id = common_lines[0]
        picked = next_departure(line_id)
    elif src_lines:
        line_id = src_lines[0]
        picked = next_departure(line_id)

    bus = None
    if line_id and picked:
        bus = {
            "line_id": line_id,
            "line_name": BUS_LINES[line_id]["name"],
            "color": BUS_LINES[line_id]["color"],
            "next_time": picked["time"],
            "minutes_until": picked["minutes_until"],
            "direct": from_id in BUS_LINES[line_id]["stops"] and to_id in BUS_LINES[line_id]["stops"],
        }

    # 3 nearby POIs to destination (excluding dst and src)
    pois = []
    for loc in MAP_LOCATIONS:
        if loc["id"] in (from_id, to_id):
            continue
        d = haversine_km(dst["latitude"], dst["longitude"], loc["latitude"], loc["longitude"])
        pois.append({**loc, "distance_km": round(d, 2)})
    pois.sort(key=lambda x: x["distance_km"])

    # Google Maps deep link
    maps_url = f"https://maps.google.com/?saddr={src['latitude']},{src['longitude']}&daddr={dst['latitude']},{dst['longitude']}"

    return {
        "from": src, "to": dst,
        "distance_km": round(km, 2),
        "walking": {"minutes": walk_min, "label": f"{walk_min} min a pé"},
        "bolt": {"eur": bolt_eur, "label": f"~€{bolt_eur:.2f} • ~{max(1, int(km*2))} min"},
        "bus": bus,
        "nearby": pois[:3],
        "maps_url": maps_url,
    }


# ---- Briefings (contextual reminders) ----
def build_briefings(now: Optional[datetime] = None) -> List[dict]:
    """Deterministic time-based cards."""
    now = now or now_lisbon()
    items: List[dict] = []

    # Trip dates: 12-15 July 2026
    day1 = datetime(2026, 7, 12, 0, 0, tzinfo=timezone.utc)
    day2 = datetime(2026, 7, 13, 0, 0, tzinfo=timezone.utc)
    day3 = datetime(2026, 7, 14, 0, 0, tzinfo=timezone.utc)
    day4 = datetime(2026, 7, 15, 0, 0, tzinfo=timezone.utc)

    def days_until(target: datetime) -> int:
        return (target.date() - now.date()).days

    # 1. Check-in reminder (Day 1, 14h-20h) — always show BEFORE arrival too as preview
    du1 = days_until(day1)
    if du1 >= 0:
        pre_arrival = du1 > 0
        items.append({
            "id": "briefing-checkin",
            "priority": 1 if du1 == 0 or du1 == 1 else 3,
            "icon": "card",
            "tone": "warning" if not pre_arrival else "info",
            "title": "Check-in Studio 17 — Prepara",
            "body": "💳 €24 taxa turística + €200 caução (cartão). Confirma o nome. Pede upgrade — pergunta 'há upgrade disponível?' (às vezes dão grátis fora do fim-de-semana).",
            "cta": {"label": "Ver hack de upgrade", "route": "/hacks"},
            "when": "Domingo 12 Jul • ~16h",
        })

    # 2. Continente / Mercado — show if in trip window
    if du1 <= 0 and (now < day4):
        items.append({
            "id": "briefing-mercado",
            "priority": 2,
            "icon": "cart",
            "tone": "info",
            "title": "Continente fecha às 22h",
            "body": "🛒 Passa hoje no Continente para pequenos-almoços e jantares leves. Poupança €80-120 na viagem inteira.",
            "cta": {"label": "Ver lista de compras", "route": "/shopping"},
            "when": "Todos os dias • 18h30",
        })

    # 3. Benagil (Day 2 morning)
    du2 = days_until(day2)
    if 0 <= du2 <= 1:
        items.append({
            "id": "briefing-benagil",
            "priority": 1 if du2 == 0 else 3,
            "icon": "boat",
            "tone": "brand",
            "title": "Benagil hoje!" if du2 == 0 else "Amanhã: Grutas de Benagil",
            "body": "🌊 Tour de barco às 15h. Não esquecer: SPF50+, câmara, bilhete no telemóvel, powerbank.",
            "cta": {"label": "Smart Go até à Marina", "smart_go": {"from": "hotel", "to": "marina"}},
            "when": "Segunda 13 Jul • 15h",
        })

    # 4. Alvor (Day 3 morning)
    du3 = days_until(day3)
    if 0 <= du3 <= 1:
        # Next bus L14 towards Alvor
        picked = next_departure("14")
        bus_txt = f"Próximo em {picked['minutes_until']} min" if picked else "Confirma na paragem"
        items.append({
            "id": "briefing-alvor",
            "priority": 1 if du3 == 0 else 3,
            "icon": "bus",
            "tone": "info",
            "title": "Vai e Vem L14 → Alvor",
            "body": f"🚌 {bus_txt}. Praia calma ideal para o Arthur. Bilhete €1,60-2,50 pago no autocarro.",
            "cta": {"label": "Smart Go até Alvor", "smart_go": {"from": "hotel", "to": "alvor"}},
            "when": "Terça 14 Jul • 10h",
        })

    # 5. Check-out (Day 4)
    du4 = days_until(day4)
    if 0 <= du4 <= 1:
        items.append({
            "id": "briefing-checkout",
            "priority": 1 if du4 == 0 else 3,
            "icon": "log-out",
            "tone": "warning",
            "title": "Check-out às 11h",
            "body": "⏰ Bolt até estação de autocarros (~€6-8, 15 min). Terminar mantimentos ao pequeno-almoço.",
            "cta": {"label": "Ver bilhete FlixBus volta", "route": "/tickets"},
            "when": "Quarta 15 Jul • 11h",
        })

    # 6. Weather-based (UV / rain) — only if trip active, checked async
    # (populated by /briefings endpoint that also calls weather)

    # Sort by priority
    items.sort(key=lambda x: x["priority"])
    return items


@api_router.get("/briefings")
async def get_briefings():
    items = build_briefings()
    # Add weather alerts by calling weather
    try:
        weather = await fetch_weather()
        uv = weather.get("uv_max", 0) or 0
        rain = weather.get("rain_chance", 0) or 0
        if uv >= 8:
            items.append({
                "id": "briefing-uv",
                "priority": 2,
                "icon": "sunny",
                "tone": "warning",
                "title": f"UV extremo hoje ({uv})",
                "body": "☀️ Reaplicar SPF cada 90 min. Chapéu obrigatório. Evitar praia 12h-16h com crianças.",
                "cta": {"label": "Ver hacks de segurança", "route": "/hacks"},
                "when": "Hoje",
            })
        if rain >= 40:
            items.append({
                "id": "briefing-rain",
                "priority": 2,
                "icon": "rainy",
                "tone": "info",
                "title": f"Chuva prevista ({rain}%)",
                "body": "🌧️ Plano B: mercado municipal + almoço numa tasca + gelados na marginal quando parar.",
                "cta": {"label": "Ver hacks", "route": "/hacks"},
                "when": "Hoje",
            })
    except Exception:  # noqa: BLE001
        pass
    items.sort(key=lambda x: x["priority"])
    return {"items": items, "now": now_lisbon().isoformat()}


# ---- Bus schedule ----
@api_router.get("/bus/schedule")
async def bus_schedule():
    now = now_lisbon()
    result = []
    for lid, line in BUS_LINES.items():
        nxt = next_departure(lid, now)
        result.append({
            "id": lid,
            "name": line["name"],
            "color": line["color"],
            "stops": [{"id": s, "name": LOC_BY_ID.get(s, {}).get("name", s)} for s in line["stops"]],
            "next": nxt,
        })
    return {"lines": result, "now": now.strftime("%H:%M")}


@api_router.get("/bus/next")
async def bus_next(stop: str = Query(..., alias="stop")):
    if stop not in LOC_BY_ID:
        raise HTTPException(status_code=404, detail="Stop not found")
    now = now_lisbon()
    lines = lines_serving_stop(stop)
    out = []
    for lid in lines:
        nxt = next_departure(lid, now)
        out.append({
            "line_id": lid,
            "line_name": BUS_LINES[lid]["name"],
            "color": BUS_LINES[lid]["color"],
            "next_time": nxt["time"] if nxt else None,
            "minutes_until": nxt["minutes_until"] if nxt else None,
        })
    out.sort(key=lambda x: x["minutes_until"] if x["minutes_until"] is not None else 9999)
    return {"stop": LOC_BY_ID[stop], "buses": out, "now": now.strftime("%H:%M")}


# ---- Weather (Open-Meteo, no key) ----
async def fetch_weather() -> dict:
    """Fetch current + today weather for Portimão via Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 37.14, "longitude": -8.54,
        "current": "temperature_2m,weather_code,uv_index",
        "daily": "temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,weather_code",
        "timezone": "Europe/Lisbon",
        "forecast_days": 4,
    }
    async with httpx.AsyncClient(timeout=8.0) as hc:
        r = await hc.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    daily = data.get("daily", {})
    current = data.get("current", {})
    return {
        "current_temp": current.get("temperature_2m"),
        "current_uv": current.get("uv_index"),
        "temp_max": (daily.get("temperature_2m_max") or [None])[0],
        "temp_min": (daily.get("temperature_2m_min") or [None])[0],
        "uv_max": (daily.get("uv_index_max") or [None])[0],
        "rain_chance": (daily.get("precipitation_probability_max") or [None])[0],
        "weather_code": (daily.get("weather_code") or [None])[0],
        "daily": {
            "dates": daily.get("time", []),
            "temp_max": daily.get("temperature_2m_max", []),
            "temp_min": daily.get("temperature_2m_min", []),
            "uv_max": daily.get("uv_index_max", []),
            "rain_chance": daily.get("precipitation_probability_max", []),
            "weather_code": daily.get("weather_code", []),
        },
    }


@api_router.get("/weather")
async def weather():
    try:
        return await fetch_weather()
    except Exception as e:  # noqa: BLE001
        logger.warning("Weather fetch failed: %s", e)
        # Fallback static
        return {
            "current_temp": 28, "current_uv": 7,
            "temp_max": 30, "temp_min": 22, "uv_max": 8,
            "rain_chance": 5, "weather_code": 0,
            "daily": {"dates": [], "temp_max": [], "temp_min": [], "uv_max": [], "rain_chance": [], "weather_code": []},
        }


# ---- Shopping list ----
@api_router.get("/shopping")
async def shopping_list():
    items = await db.shopping.find({}, {"_id": 0}).to_list(200)
    total = round(sum(i["price"] for i in items), 2)
    checked = round(sum(i["price"] for i in items if i.get("checked")), 2)
    return {"items": items, "total": total, "checked_total": checked}


@api_router.post("/shopping/toggle")
async def shopping_toggle(payload: ShoppingToggle):
    await db.shopping.update_one({"id": payload.id}, {"$set": {"checked": payload.checked}})
    return await db.shopping.find_one({"id": payload.id}, {"_id": 0})


# ---- Tickets ----
PASSENGERS = ["ALEX SACRAMENTO", "PRISCILA SACRAMENTO", "ALEXSANDRO SACRAMENTO", "ARTHUR GABRIEL SACRAMENTO"]

@api_router.get("/tickets")
async def tickets():
    def qr(data: str) -> str:
        from urllib.parse import quote
        return f"https://quickchart.io/qr?text={quote(data)}&size=300&margin=2"

    ida_seats = [50, 51, 52, 53]
    volta_seats = [43, 44, 45, 46]

    return [
        {
            "id": "expressos-ida", "type": "bus", "icon": "bus",
            "operator": "Rede Expressos • via Omio",
            "title": "Lisboa Sete Rios → Portimão",
            "code": "R6LJC56",
            "reservation": "26cde43a-57f3-44ee-961d-365506e1dec4",
            "when": "12 Jul 2026 • 15:15",
            "arrival": "18:30 • Terminal Rodoviário (Rua da Abicada)",
            "duration": "3h 15m • 0 mudanças",
            "seat": "Lugares 50 • 51 • 52 • 53",
            "price": "Bilhete digital • pode usar offline",
            "qr_url": qr("R6LJC56"),
            "passengers": [
                {"name": PASSENGERS[i], "seat": ida_seats[i], "class": "Inteiro"} for i in range(4)
            ],
            "color": "#0284C7",
            "extras": [
                "Chegar 15-20 min antes ao terminal",
                "Bagagem: 1 mala porão + 1 mão por pessoa",
                "Powerbank + snacks para as crianças (3h15)",
            ],
        },
        {
            "id": "hotel", "type": "hotel", "icon": "bed",
            "operator": "Atlantichotels • via Agoda",
            "title": "Studio 17 by Atlantichotels",
            "code": "STD17-1276",
            "reservation": "3 noites • studio 4 pax • 50m²",
            "when": "12 Jul → 15 Jul • 3 noites",
            "arrival": "Rua João Simões Tavares 17, Portimão",
            "duration": "Check-in 16:00-23:30 • Check-out até 11:00",
            "seat": "Score 7.9 Muito bom • Excelente localização",
            "price": "Preparar €24 taxa turística + €200 caução (cartão)",
            "qr_url": qr("Studio 17 Atlantichotels - Sacramento family - 12-15 Jul 2026"),
            "amenities": [
                {"icon": "wifi", "label": "Wi-Fi grátis"},
                {"icon": "water", "label": "Piscina"},
                {"icon": "restaurant", "label": "Cozinha completa"},
                {"icon": "flag", "label": "Campo de golfe"},
                {"icon": "boat", "label": "Parque aquático"},
                {"icon": "car", "label": "Traslado do aeroporto"},
                {"icon": "cafe", "label": "Sala de estar"},
                {"icon": "briefcase", "label": "Guarda-volumes"},
                {"icon": "leaf", "label": "Jardim"},
            ],
            "nearby": [
                {"name": "Estádio Municipal de Portimão", "distance": "700 m"},
                {"name": "Forte de Santa Catarina", "distance": "760 m"},
                {"name": "Museu de Portimão", "distance": "820 m"},
                {"name": "A Tentação - Produtos Gourmet", "distance": "990 m"},
                {"name": "Igreja Nossa Senhora da Conceição", "distance": "1.2 km"},
            ],
            "color": "#1D8086",
        },
        {
            "id": "benagil", "type": "activity", "icon": "boat",
            "operator": "Tour small-group",
            "title": "Grutas de Benagil",
            "code": "BEN-SG-2603",
            "reservation": "A confirmar após chegada",
            "when": "13 Jul 2026 • 15:00",
            "arrival": "Marina de Portimão • duração 2h",
            "duration": "Grupo pequeno • coletes incluídos",
            "seat": "4 pax • levar SPF50+ e câmara",
            "price": "~€30/pessoa • ~€120 total",
            "qr_url": qr("Benagil Small-Group Tour - Sacramento - 13/07/2026 15:00"),
            "extras": [
                "Reservar 1 dia antes na Marina",
                "SPF50+ obrigatório (2h ao sol)",
                "Câmara à prova de água (rec.)",
            ],
            "color": "#D96C4E",
        },
        {
            "id": "expressos-volta", "type": "bus", "icon": "bus",
            "operator": "Rede Expressos • via Omio",
            "title": "Portimão → Lisboa Sete Rios",
            "code": "R6LJC5N",
            "reservation": "26cde43a-57f3-44ee-961d-365506e1dec4",
            "when": "15 Jul 2026 • 13:10",
            "arrival": "16:25 • Lisboa Terminal Sete Rios",
            "duration": "3h 15m • 0 mudanças",
            "seat": "Lugares 43 • 44 • 45 • 46",
            "price": "Bilhete digital • pode usar offline",
            "qr_url": qr("R6LJC5N"),
            "passengers": [
                {"name": PASSENGERS[i], "seat": volta_seats[i], "class": "Inteiro"} for i in range(4)
            ],
            "color": "#0284C7",
            "extras": [
                "Check-out 11:00 → Bolt até Terminal Rua da Abicada",
                "Chegar 15 min antes",
            ],
        },
    ]


# ---- Hotel details (Agoda enrichment) ----
@api_router.get("/hotel-details")
async def hotel_details():
    return {
        "name": "Studio 17 by Atlantichotels",
        "address": "Rua João Simões Tavares 17, Urb. Alto do Quintão, Portimão 8500-293",
        "score": 7.9,
        "score_label": "Muito bom",
        "score_hint": "Excelente localização",
        "size_m2": 50,
        "check_in": "16:00 às 23:30",
        "check_out": "até às 11:00",
        "photo": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
        "layout": [
            {"label": "Quarto 1", "detail": "2 camas de solteiro"},
            {"label": "Espaço comum", "detail": "1 sofá-cama"},
            {"label": "Casa de banho", "detail": "Banheira + secador"},
            {"label": "Cozinha", "detail": "Equipada • frigorífico"},
        ],
        "amenities": [
            {"icon": "wifi", "label": "Wi-Fi grátis"},
            {"icon": "water", "label": "Piscina"},
            {"icon": "restaurant", "label": "Cozinha completa"},
            {"icon": "flag", "label": "Campo de golfe"},
            {"icon": "boat", "label": "Parque aquático"},
            {"icon": "car", "label": "Traslado do aeroporto"},
            {"icon": "cafe", "label": "Sala de estar"},
            {"icon": "briefcase", "label": "Guarda-volumes"},
            {"icon": "leaf", "label": "Jardim"},
        ],
        "nearby": [
            {"name": "Estádio Municipal de Portimão", "distance": "700 m"},
            {"name": "Forte de Santa Catarina", "distance": "760 m"},
            {"name": "Museu de Portimão", "distance": "820 m"},
            {"name": "A Tentação - Produtos Gourmet", "distance": "990 m"},
            {"name": "Igreja Nossa Senhora da Conceição", "distance": "1.2 km"},
        ],
        "reminders": [
            {"icon": "card", "text": "Preparar €24 taxa turística (paga no check-in)"},
            {"icon": "wallet", "text": "€200 caução no cartão (devolvido no check-out)"},
            {"icon": "gift", "text": "Pedir upgrade grátis — 'há upgrade disponível?'"},
            {"icon": "person", "text": "Confirmar nome no documento — Alex Sacramento"},
        ],
        "coords": {"lat": 37.1400, "lng": -8.5450},
    }


# ---- Beaches ----
BEACHES = [
    {
        "id": "praia-rocha", "name": "Praia da Rocha",
        "type": "Praia principal", "tagline": "A tua base • areal enorme",
        "image_url": "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 2.9, "walk_min": 35,
        "rating": 4.7, "reviews": 12480,
        "highlights": "Areal com 1.5 km, esplanadas na marginal, castelos de areia perfeitos. Bandeira Azul.",
        "amenities": ["Bandeira Azul", "Nadador salvador", "Chapéus para alugar", "Duches", "Wi-Fi grátis"],
        "kids_score": 5, "family_tip": "Chegar antes das 11h — melhor lugar no areal. Sombras alugam-se por €10-12/dia.",
        "hazards": "UV alto após 12h. Traz SPF50+ e chapéus.",
        "lat": 37.1157, "lng": -8.5372, "location_id": "praia-rocha",
    },
    {
        "id": "praia-vau", "name": "Praia do Vau",
        "type": "Praia calma", "tagline": "Menos multidão, ideal com miúdos",
        "image_url": "https://images.unsplash.com/photo-1519821172144-4f87d554d1c8?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 4.2, "walk_min": 50,
        "rating": 4.6, "reviews": 3210,
        "highlights": "Rochedos vermelhos espectaculares, mar calmo, muito familiar.",
        "amenities": ["Bandeira Azul", "Nadador salvador", "Café praia"],
        "kids_score": 5, "family_tip": "Água calma, ideal para o Arthur (5). Bolt do hotel €8-10.",
        "hazards": "Alguns rochedos escorregadios — cuidado com pés.",
        "lat": 37.1123, "lng": -8.5688, "location_id": "praia-rocha",
    },
    {
        "id": "praia-marinha", "name": "Praia da Marinha",
        "type": "Praia icónica", "tagline": "Considerada uma das 10 mais bonitas do mundo",
        "image_url": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 18.0, "walk_min": 216,
        "rating": 4.9, "reviews": 8760,
        "highlights": "Falésias douradas, mar turquesa, arcos naturais. Instagram gold.",
        "amenities": ["Miradouros", "Trilho Sete Vales Suspensos", "Parque estac. pago"],
        "kids_score": 4, "family_tip": "Descida com ~100 degraus. Levar sapatos confortáveis. Vale a viagem!",
        "hazards": "Descida íngreme. Não indicada para bebés de carrinho.",
        "lat": 37.0904, "lng": -8.4092, "location_id": "benagil",
    },
    {
        "id": "praia-benagil", "name": "Praia de Benagil",
        "type": "Gruta famosa", "tagline": "A gruta com buraco no teto",
        "image_url": "https://images.unsplash.com/photo-1600188769099-0e9a2c40d5d3?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 15.5, "walk_min": 186,
        "rating": 4.8, "reviews": 15230,
        "highlights": "Só se entra de barco/kayak/SUP. Reservar tour com antecedência.",
        "amenities": ["Marina próxima", "Tours barco/kayak"],
        "kids_score": 4, "family_tip": "Tour small-group já reservado para o Dia 2 às 15h.",
        "hazards": "Só entrada por água — respeitar ondas.",
        "lat": 37.0879, "lng": -8.4272, "location_id": "benagil",
    },
    {
        "id": "praia-alvor", "name": "Praia de Alvor",
        "type": "Praia longa", "tagline": "Vila de pescadores + areal enorme",
        "image_url": "https://images.unsplash.com/photo-1544966503-7cc5ac882d5a?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 6.5, "walk_min": 78,
        "rating": 4.7, "reviews": 5670,
        "highlights": "Mar mais quente, areal com 3 km, vila piscatória tradicional a 5 min.",
        "amenities": ["Bandeira Azul", "Passadiços de madeira", "Restaurantes típicos"],
        "kids_score": 5, "family_tip": "Vai e Vem Linha 14 do hotel (€1,60-2,50). Almoço de peixe no porto!",
        "hazards": "Ventos ocasionais à tarde.",
        "lat": 37.1289, "lng": -8.5945, "location_id": "alvor",
    },
    {
        "id": "praia-tres-irmaos", "name": "Praia dos Três Irmãos",
        "type": "Praia com rochas", "tagline": "Rochedos-icone e água limpa",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 7.2, "walk_min": 86,
        "rating": 4.7, "reviews": 4310,
        "highlights": "Formações rochosas únicas, ligações a Alvor. Snorkeling.",
        "amenities": ["Nadador salvador (Verão)", "Chapéus", "Bar de praia"],
        "kids_score": 4, "family_tip": "Trazer óculos de mergulho — muitos peixes nas poças.",
        "hazards": "Marés cobrem trilhos entre praias.",
        "lat": 37.1276, "lng": -8.5771, "location_id": "alvor",
    },
    {
        "id": "praia-carvoeiro", "name": "Praia de Carvoeiro",
        "type": "Vila pitoresca", "tagline": "Casinhas brancas e vermelhas na falésia",
        "image_url": "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 12.0, "walk_min": 144,
        "rating": 4.8, "reviews": 6540,
        "highlights": "Praia pequena no coração da vila. Restaurantes a 30 seg do areal.",
        "amenities": ["Restaurantes", "Boardwalk até Algar Seco"],
        "kids_score": 4, "family_tip": "Combina almoço + praia + passeio no boardwalk.",
        "hazards": "Areal pequeno enche rápido em Agosto.",
        "lat": 37.0987, "lng": -8.4715, "location_id": "benagil",
    },
    {
        "id": "praia-ferragudo", "name": "Praia Grande de Ferragudo",
        "type": "Praia de estuário", "tagline": "Mar mais calmo do Algarve",
        "image_url": "https://images.unsplash.com/photo-1503756234508-e32369269deb?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 3.8, "walk_min": 46,
        "rating": 4.6, "reviews": 2870,
        "highlights": "Mar quase sem ondas — bebés e crianças pequenas adoram.",
        "amenities": ["Nadador salvador", "Kayak/SUP para alugar"],
        "kids_score": 5, "family_tip": "PERFEITA para o Arthur (5). Do outro lado do rio Arade.",
        "hazards": "Sombra escassa — trazer chapéus.",
        "lat": 37.1183, "lng": -8.5119, "location_id": "praia-rocha",
    },
    {
        "id": "praia-alemao", "name": "Praia do Alemão",
        "type": "Praia escondida", "tagline": "Continuação da Praia da Rocha, mais tranquila",
        "image_url": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 3.5, "walk_min": 42,
        "rating": 4.5, "reviews": 1210,
        "highlights": "Menos gente que a Rocha, com rochedos coloridos.",
        "amenities": ["Escadaria de acesso", "Sem estruturas — trazer chapéu"],
        "kids_score": 3, "family_tip": "Só descida escadas — bebés de carrinho não.",
        "hazards": "Sem apoio de nadador salvador sempre.",
        "lat": 37.1145, "lng": -8.5305, "location_id": "praia-rocha",
    },
    {
        "id": "praia-barranco", "name": "Praia do Barranco das Canas",
        "type": "Praia secreta", "tagline": "Escapada tranquila entre falésias",
        "image_url": "https://images.unsplash.com/photo-1520902688931-3c74fc9c1b2c?auto=format&fit=crop&w=1400&q=80",
        "distance_from_hotel_km": 5.0, "walk_min": 60,
        "rating": 4.4, "reviews": 890,
        "highlights": "Areal íntimo entre falésias douradas. Pouca gente.",
        "amenities": ["Sem estruturas", "Acesso por trilho"],
        "kids_score": 2, "family_tip": "Só para famílias sem carrinho — trilho 10 min.",
        "hazards": "Acesso íngreme, sem sombra.",
        "lat": 37.1102, "lng": -8.5510, "location_id": "praia-rocha",
    },
]

@api_router.get("/beaches")
async def beaches():
    return BEACHES


# ---- Attractions ----
ATTRACTIONS = [
    {
        "id": "zoomarine", "name": "Zoomarine Algarve", "category": "Parque temático",
        "tagline": "Golfinhos + piscinas + shows — o preferido do Arthur",
        "image_url": "https://images.unsplash.com/photo-1567196706930-4b6f9d0e0e9a?auto=format&fit=crop&w=1400&q=80",
        "price": "€29 adulto • €22 criança (5-9)", "hours": "10h-18h",
        "duration": "1 dia inteiro", "distance_km": 25.0, "rating": 4.6, "reviews": 15420,
        "highlights": "Shows de golfinhos, aves e leões marinhos. Zonas aquáticas com escorregas.",
        "kids": True, "book_url": "https://www.zoomarine.pt",
        "family_tip": "Chegar às 10h — filas curtas. Levar fatos de banho e mudas.",
        "lat": 37.1408, "lng": -8.2891,
    },
    {
        "id": "slide-splash", "name": "Slide & Splash", "category": "Parque aquático",
        "tagline": "O maior parque aquático do Algarve",
        "image_url": "https://images.unsplash.com/photo-1568727349515-42a70c69ad7c?auto=format&fit=crop&w=1400&q=80",
        "price": "€28 adulto • €21 criança", "hours": "10h-17h30",
        "duration": "5-6h", "distance_km": 8.5, "rating": 4.5, "reviews": 8920,
        "highlights": "Escorregas para todas as idades. Zona kids segura para o Arthur.",
        "kids": True, "book_url": "https://www.slidesplash.com",
        "family_tip": "Comprar bilhete online = -15%. Almoço traz-se de casa (permitido).",
        "lat": 37.1428, "lng": -8.3856,
    },
    {
        "id": "aqualand", "name": "Aqualand Algarve", "category": "Parque aquático",
        "tagline": "Escorregas radicais + zona kids",
        "image_url": "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80",
        "price": "€26 adulto • €18 criança", "hours": "10h-17h",
        "duration": "5-6h", "distance_km": 15.0, "rating": 4.4, "reviews": 4560,
        "highlights": "Kamikaze, Rio Lento, Zona pequenos. Verão em cheio.",
        "kids": True, "book_url": "https://www.aqualand.pt",
        "family_tip": "Alexsandro (11) já pode ir aos escorregas grandes.",
        "lat": 37.1350, "lng": -8.4020,
    },
    {
        "id": "kayak-benagil", "name": "Kayak até Benagil", "category": "Aventura",
        "tagline": "Alternativa low-cost ao barco",
        "image_url": "https://images.unsplash.com/photo-1544966503-7cc5ac882d5a?auto=format&fit=crop&w=1400&q=80",
        "price": "€25/pessoa • Free para 5 anos", "hours": "9h-17h",
        "duration": "2h", "distance_km": 15.5, "rating": 4.7, "reviews": 3210,
        "highlights": "Chegar de kayak à famosa gruta. Alexsandro (11) já pode remar.",
        "kids": True, "book_url": None,
        "family_tip": "Melhor pela manhã — água mais calma. Arthur vai no kayak com um adulto.",
        "lat": 37.0879, "lng": -8.4272,
    },
    {
        "id": "golfinhos", "name": "Passeio Golfinhos + Grutas", "category": "Marítimo",
        "tagline": "Vê golfinhos selvagens + Benagil",
        "image_url": "https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&w=1400&q=80",
        "price": "€35/adulto • €25/criança", "hours": "9h-17h",
        "duration": "2h30", "distance_km": 1.5, "rating": 4.6, "reviews": 6540,
        "highlights": "Golfinhos-comuns são frequentes na primavera/verão. Combina com Benagil.",
        "kids": True, "book_url": None,
        "family_tip": "Se enjoas do mar — toma comprimido 30 min antes.",
        "lat": 37.1236, "lng": -8.5311,
    },
    {
        "id": "silves", "name": "Castelo de Silves", "category": "História",
        "tagline": "Antiga capital moura do Algarve",
        "image_url": "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?auto=format&fit=crop&w=1400&q=80",
        "price": "€2,80 adulto • gratis <12", "hours": "9h-18h",
        "duration": "2h", "distance_km": 15.0, "rating": 4.5, "reviews": 4210,
        "highlights": "Muralhas vermelhas incríveis. Vista sobre a serra e a cidade.",
        "kids": True, "book_url": None,
        "family_tip": "Combinar com almoço de laranjas (fruto típico local).",
        "lat": 37.1892, "lng": -8.4405,
    },
    {
        "id": "sagres", "name": "Sagres • Fim do Mundo", "category": "Miradouro",
        "tagline": "Onde os navegadores partiam para o desconhecido",
        "image_url": "https://images.unsplash.com/photo-1552793084-49132af00ff1?auto=format&fit=crop&w=1400&q=80",
        "price": "€3 fortaleza • gratuito arredores", "hours": "9h30-18h30",
        "duration": "meio-dia", "distance_km": 55.0, "rating": 4.7, "reviews": 8930,
        "highlights": "Falésias verticais no oceano. Pôr-do-sol no Cabo de São Vicente.",
        "kids": True, "book_url": None,
        "family_tip": "Levar casaco leve — vento sempre. Pôr-do-sol Cabo São Vicente = magia.",
        "lat": 37.0027, "lng": -8.9426,
    },
    {
        "id": "museu-portimao", "name": "Museu de Portimão", "category": "Cultura",
        "tagline": "Antiga fábrica de conservas • fantástico",
        "image_url": "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1400&q=80",
        "price": "€3 adulto • gratis <12", "hours": "10h-18h (fecha seg)",
        "duration": "1h30", "distance_km": 0.8, "rating": 4.6, "reviews": 2340,
        "highlights": "História da pesca e conservas de Portimão. Muito interactivo.",
        "kids": True, "book_url": None,
        "family_tip": "Perfeito para dia nublado. Grátis para o Arthur.",
        "lat": 37.1354, "lng": -8.5384,
    },
    {
        "id": "forte-catarina", "name": "Forte de Santa Catarina", "category": "Miradouro",
        "tagline": "760m do hotel • vista sobre a Praia da Rocha",
        "image_url": "https://images.unsplash.com/photo-1568402102990-bbfd07f2f2a3?auto=format&fit=crop&w=1400&q=80",
        "price": "Grátis", "hours": "24h (mirad.)",
        "duration": "45 min", "distance_km": 0.76, "rating": 4.4, "reviews": 1890,
        "highlights": "Forte do séc. XVII. Vista panorâmica. Boa foto de família.",
        "kids": True, "book_url": None,
        "family_tip": "Ida a pé — 10 min do hotel. Pôr-do-sol imperdível.",
        "lat": 37.1148, "lng": -8.5310,
    },
    {
        "id": "marina-portimao", "name": "Marina de Portimão", "category": "Ponto de partida",
        "tagline": "Ponto de partida para Benagil + esplanadas",
        "image_url": "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1400&q=80",
        "price": "Grátis passear", "hours": "Sempre aberta",
        "duration": "1-2h", "distance_km": 1.9, "rating": 4.6, "reviews": 3120,
        "highlights": "Barcos luxuosos + esplanadas com vista + partida dos tours.",
        "kids": True, "book_url": None,
        "family_tip": "Depois do jantar — gelado enquanto vêem os iates.",
        "lat": 37.1236, "lng": -8.5311,
    },
    {
        "id": "grutas-marinha", "name": "Sete Vales Suspensos", "category": "Trilho",
        "tagline": "5.7 km entre 7 praias e grutas",
        "image_url": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1400&q=80",
        "price": "Grátis", "hours": "Sempre aberto",
        "duration": "3-4h ida e volta", "distance_km": 18.0, "rating": 4.9, "reviews": 5670,
        "highlights": "Considerado um dos melhores trilhos de Portugal. Vistas de tirar o fôlego.",
        "kids": False, "book_url": None,
        "family_tip": "Só para Alexsandro (11) + adultos. Trilho pode ser cansativo para Arthur.",
        "lat": 37.0904, "lng": -8.4092,
    },
    {
        "id": "praia-alvor-vila", "name": "Vila de Alvor", "category": "Vila típica",
        "tagline": "Passeio pela vila piscatória",
        "image_url": "https://images.unsplash.com/photo-1516462093-b8f5be15a3d1?auto=format&fit=crop&w=1400&q=80",
        "price": "Grátis", "hours": "Sempre",
        "duration": "2h", "distance_km": 6.5, "rating": 4.5, "reviews": 2890,
        "highlights": "Ruelas brancas, restaurantes de peixe, mercado tradicional.",
        "kids": True, "book_url": None,
        "family_tip": "Combinar com Praia de Alvor (Vai e Vem L14).",
        "lat": 37.1289, "lng": -8.5945,
    },
]

@api_router.get("/attractions")
async def attractions():
    return ATTRACTIONS


# ---- AI Daily Tip ----
@api_router.get("/ai-tip")
async def ai_tip():
    """Generates a contextual family tip via Gemini. Cached by day."""
    if not EMERGENT_LLM_KEY:
        return {"tip": "Dica do dia: chegar cedo à praia para melhor lugar!", "topic": "Praia"}

    now = now_lisbon()
    day_key = now.strftime("%Y-%m-%d")
    cached = await db.ai_tips.find_one({"date": day_key}, {"_id": 0})
    if cached:
        return cached

    # Context for prompt
    weather_ctx = ""
    try:
        w = await fetch_weather()
        weather_ctx = f"Hoje UV {int(w.get('uv_max') or 0)}, temperatura {int(w.get('temp_min') or 0)}-{int(w.get('temp_max') or 0)}°C, chuva {int(w.get('rain_chance') or 0)}%."
    except Exception:
        pass

    day_num = max(1, min(4, (now.date() - datetime(2026, 7, 12).date()).days + 1))
    trip_day_ctx = f"Dia {day_num} da viagem (12-15 Jul)." if 1 <= day_num <= 4 else "Antes da viagem."

    prompt = f"""És o "Guia Algarve", especialista local. Família Sacramento (Alex 39, Priscila 38, Alexsandro 11, Arthur 5) em Portimão a 12-15 Jul 2026. Hospedagem: Studio 17.

Contexto de hoje: {trip_day_ctx} {weather_ctx}

Dá UMA dica muito prática e específica (máximo 2 frases, 40 palavras). Responde APENAS em JSON com estas chaves:
- "tip": a dica em português europeu
- "topic": uma de: "Praia", "Restaurante", "Poupança", "Meteo", "Crianças", "Cultura", "Segurança"
- "icon": ícone Ionicons apropriado (ex: "sunny", "restaurant", "wallet", "rainy", "happy", "book", "shield")

Não inventes preços/horários. Sê caloroso e específico."""

    try:
        chat_instance = (
            LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"tip-{day_key}", system_message="Devolve APENAS JSON válido, sem markdown, sem ```.")
            .with_model("gemini", "gemini-2.5-flash")
            .with_max_tokens(200)
        )
        raw = await chat_instance.send_message(UserMessage(text=prompt))
        raw = (raw or "").strip().replace("```json", "").replace("```", "").strip()
        import json as _json
        parsed = _json.loads(raw)
        parsed["date"] = day_key
        # persist
        await db.ai_tips.replace_one({"date": day_key}, parsed, upsert=True)
        parsed.pop("_id", None)
        return parsed
    except Exception as e:
        logger.warning("ai_tip failed: %s", e)
        return {"tip": "Chegar à praia antes das 11h garante melhor lugar + sol menos agressivo para as crianças.", "topic": "Praia", "icon": "sunny", "date": day_key}


# ---- AI Chat (Emergent LLM Key + Gemini) ----
SYSTEM_PROMPT_CHAT_MARKER = "chat-marker"


# ---- Emergency contacts ----
@api_router.get("/emergency")
async def emergency():
    return [
        {"id": "112", "label": "Emergência Geral", "sub": "Bombeiros • Polícia • Ambulância", "phone": "112", "icon": "warning", "tone": "danger", "always_free": True},
        {"id": "sns24", "label": "SNS 24 (saúde)", "sub": "Aconselhamento médico 24h", "phone": "808242424", "icon": "medkit", "tone": "info", "always_free": False},
        {"id": "hospital", "label": "Hospital de Portimão", "sub": "Sítio do Poço Seco • urgências 24h", "phone": "282450330", "icon": "medical", "tone": "info", "always_free": False, "lat": 37.1364, "lng": -8.5301},
        {"id": "farmacia-rocha", "label": "Farmácia Central Portimão", "sub": "Rua do Comércio • 09h-19h", "phone": "282417055", "icon": "medical-outline", "tone": "info", "always_free": False, "lat": 37.1379, "lng": -8.5385},
        {"id": "psp", "label": "PSP Portimão", "sub": "Polícia local", "phone": "282422022", "icon": "shield", "tone": "info", "always_free": False},
        {"id": "gnr-praia", "label": "GNR Praia da Rocha", "sub": "Posto de praia (Verão)", "phone": "282416060", "icon": "shield-half", "tone": "info", "always_free": False},
        {"id": "hotel-contact", "label": "Studio 17 (hotel)", "sub": "Ajuda com o alojamento", "phone": "351282400000", "icon": "home", "tone": "brand", "always_free": False},
        {"id": "embaixada-br", "label": "Embaixada do Brasil", "sub": "Estr. das Laranjeiras 144, Lisboa", "phone": "213248510", "icon": "flag", "tone": "info", "always_free": False},
        {"id": "consul-uk", "label": "Turismo de Portimão", "sub": "Apoio a turistas", "phone": "282470700", "icon": "information-circle", "tone": "info", "always_free": False},
    ]


# ---- Trip stats (live dashboard) ----
@api_router.get("/trip-stats")
async def trip_stats():
    now = now_lisbon()
    trip_start = datetime(2026, 7, 12, tzinfo=timezone.utc)
    trip_end = datetime(2026, 7, 15, tzinfo=timezone.utc)

    days_until = (trip_start.date() - now.date()).days
    if days_until > 0:
        phase = "before"
        phase_label = "Faltam"
        phase_value = days_until
        phase_unit = "dias"
    elif now.date() > trip_end.date():
        phase = "after"
        phase_label = "Viagem terminada"
        phase_value = 0
        phase_unit = ""
    else:
        phase = "during"
        phase_label = "Dia da viagem"
        phase_value = (now.date() - trip_start.date()).days + 1
        phase_unit = f"de {(trip_end.date() - trip_start.date()).days + 1}"

    # Budget consumed
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(500)
    total_spent = round(sum(e["amount"] for e in expenses), 2)
    budget_ratio = total_spent / TRIP_INFO["budget_max"] if TRIP_INFO["budget_max"] else 0

    # Checklist progress
    checklist = await db.checklist.find({}, {"_id": 0}).to_list(200)
    checked = sum(1 for c in checklist if c.get("checked"))
    checklist_ratio = checked / len(checklist) if checklist else 0

    # Shopping progress
    shopping = await db.shopping.find({}, {"_id": 0}).to_list(200)
    shopping_checked = sum(1 for s in shopping if s.get("checked"))

    return {
        "phase": phase,
        "phase_label": phase_label,
        "phase_value": phase_value,
        "phase_unit": phase_unit,
        "budget_spent": total_spent,
        "budget_max": TRIP_INFO["budget_max"],
        "budget_ratio": round(budget_ratio, 3),
        "checklist_done": checked,
        "checklist_total": len(checklist),
        "checklist_ratio": round(checklist_ratio, 3),
        "shopping_done": shopping_checked,
        "shopping_total": len(shopping),
    }


# ---- AI Chat (Emergent LLM Key + Gemini) ----
SYSTEM_PROMPT = """És o "Guia Algarve", um especialista local de agência de viagens premium do Algarve com 20 anos de experiência, focado em famílias com crianças.

CONTEXTO DA VIAGEM:
- Família Sacramento: Alex (39), Priscila (38), Alexsandro (11), Arthur (5)
- Portimão • Praia da Rocha • Algarve • 12-15 Julho 2026
- Studio 17 by Atlantichotels (cozinha completa)
- FlixBus direto Lisboa Oriente ↔ Portimão (€76,91 família)
- Grutas de Benagil small-group ~€30/pessoa
- Orçamento €250-290 com hacks

ESTILO:
- Português europeu (Portugal), simpático e caloroso mas profissional
- Respostas curtas (2-5 frases)
- Dicas concretas de poupança com preços em euros
- Foco family-friendly (crianças 5 e 11 anos)
- Emojis moderados (🌊 🏖️ 🍕 💰)
- Nunca inventar horários/preços — diz "confirma na app oficial" se não souberes

Domínios: praias Algarve, restaurantes Portimão, Vai e Vem/Bolt, Benagil, Alvor, Ferragudo, hacks poupança família, segurança praia crianças, gastronomia PT.
"""


@api_router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    # Persist user message
    await db.chat_messages.insert_one({
        "role": "user", "content": payload.message,
        "session_id": payload.session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        chat_instance = (
            LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=payload.session_id,
                system_message=SYSTEM_PROMPT,
            )
            .with_model("gemini", "gemini-2.5-flash")
        )
        reply_text = await chat_instance.send_message(UserMessage(text=payload.message))
        reply_text = (reply_text or "").strip()
    except Exception as e:  # noqa: BLE001
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    await db.chat_messages.insert_one({
        "role": "assistant", "content": reply_text,
        "session_id": payload.session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return ChatResponse(reply=reply_text, session_id=payload.session_id)


@api_router.get("/chat/history/{session_id}")
async def chat_history(session_id: str):
    return await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0, "session_id": 0}
    ).sort("created_at", 1).to_list(500)


# ============ App wiring ============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
