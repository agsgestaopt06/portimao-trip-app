const FALLBACK_BACKEND = "https://portimao-experiences.preview.emergentagent.com";
const RAW = (process.env.EXPO_PUBLIC_BACKEND_URL || FALLBACK_BACKEND).replace(/\/+$/, "");
export const API = `${RAW}/api`;

if (typeof window !== "undefined") {
  console.log("[api] Backend URL resolved:", API);
}

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status} ${t}`);
  }
  return res.json();
}

export const api = {
  trip: () => req("/trip"),
  itinerary: () => req("/itinerary"),
  restaurants: () => req("/restaurants"),
  hacks: () => req("/hacks"),
  kidsActivities: () => req("/kids-activities"),
  mapLocations: () => req("/map-locations"),
  // Budget
  listExpenses: () => req("/budget/expenses"),
  addExpense: (body: { category: string; description: string; amount: number }) =>
    req("/budget/expenses", { method: "POST", body: JSON.stringify(body) }),
  deleteExpense: (id: string) => req(`/budget/expenses/${id}`, { method: "DELETE" }),
  // Checklist
  checklist: () => req("/checklist"),
  toggleCheck: (id: string, checked: boolean) =>
    req("/checklist/toggle", { method: "POST", body: JSON.stringify({ id, checked }) }),
  // Gallery
  listPhotos: () => req("/gallery"),
  addPhoto: (body: { caption: string; image_base64: string; day: number }) =>
    req("/gallery", { method: "POST", body: JSON.stringify(body) }),
  deletePhoto: (id: string) => req(`/gallery/${id}`, { method: "DELETE" }),
  // Diary
  listDiary: () => req("/diary"),
  addDiary: (body: { title: string; content: string; day: number; mood: string }) =>
    req("/diary", { method: "POST", body: JSON.stringify(body) }),
  deleteDiary: (id: string) => req(`/diary/${id}`, { method: "DELETE" }),
  // Chat
  chat: (session_id: string, message: string) =>
    req<{ reply: string; session_id: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ session_id, message }),
    }),
  chatHistory: (session_id: string) => req(`/chat/history/${session_id}`),

  // === NEW SPRINT 1 ===
  smartGo: (from: string, to: string) => req(`/smart-go?from=${from}&to=${to}`),
  briefings: () => req<{ items: Briefing[]; now: string }>("/briefings"),
  busSchedule: () => req<{ lines: BusLine[]; now: string }>("/bus/schedule"),
  busNext: (stop: string) => req<{ stop: any; buses: BusNext[]; now: string }>(`/bus/next?stop=${stop}`),
  weather: () => req<Weather>("/weather"),
  shopping: () => req<{ items: ShoppingItem[]; total: number; checked_total: number }>("/shopping"),
  toggleShopping: (id: string, checked: boolean) =>
    req("/shopping/toggle", { method: "POST", body: JSON.stringify({ id, checked }) }),
  tickets: () => req<Ticket[]>("/tickets"),
  emergency: () => req<EmergencyContact[]>("/emergency"),
  tripStats: () => req<TripStats>("/trip-stats"),
};

// Shared types
export type SmartGoResult = {
  from: { id: string; name: string; category: string };
  to: { id: string; name: string; category: string };
  distance_km: number;
  walking: { minutes: number; label: string };
  bolt: { eur: number; label: string };
  bus: null | {
    line_id: string; line_name: string; color: string;
    next_time: string; minutes_until: number; direct: boolean;
  };
  nearby: { id: string; name: string; category: string; icon: string; distance_km: number }[];
  maps_url: string;
};

export type Briefing = {
  id: string;
  priority: number;
  icon: string;
  tone: "info" | "warning" | "brand" | "danger";
  title: string;
  body: string;
  cta?: { label: string; route?: string; smart_go?: { from: string; to: string } };
  when: string;
};

export type BusLine = {
  id: string; name: string; color: string;
  stops: { id: string; name: string }[];
  next: { time: string; minutes_until: number } | null;
};

export type BusNext = {
  line_id: string; line_name: string; color: string;
  next_time: string | null; minutes_until: number | null;
};

export type Weather = {
  current_temp: number | null;
  current_uv: number | null;
  temp_max: number | null;
  temp_min: number | null;
  uv_max: number | null;
  rain_chance: number | null;
  weather_code: number | null;
  daily: {
    dates: string[]; temp_max: number[]; temp_min: number[];
    uv_max: number[]; rain_chance: number[]; weather_code: number[];
  };
};

export type ShoppingItem = {
  id: string; category: string; name: string; note: string; price: number; checked: boolean;
};

export type Ticket = {
  id: string; type: string; icon: string;
  operator?: string;
  title: string; code: string; reservation?: string;
  when: string; arrival: string; duration?: string;
  seat: string; price: string; color: string;
  qr_url?: string;
};

export type EmergencyContact = {
  id: string; label: string; sub: string; phone: string;
  icon: string; tone: "danger" | "info" | "brand";
  always_free: boolean;
  lat?: number; lng?: number;
};

export type TripStats = {
  phase: "before" | "during" | "after";
  phase_label: string;
  phase_value: number;
  phase_unit: string;
  budget_spent: number;
  budget_max: number;
  budget_ratio: number;
  checklist_done: number;
  checklist_total: number;
  checklist_ratio: number;
  shopping_done: number;
  shopping_total: number;
};
