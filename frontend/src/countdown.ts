import { TRIP_START_ISO } from "./theme";

export function useCountdown(targetIso: string = TRIP_START_ISO) {
  const now = new Date();
  const target = new Date(targetIso);
  const diffMs = target.getTime() - now.getTime();
  const total = Math.max(0, diffMs);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  const past = diffMs <= 0;
  return { days, hours, minutes, seconds, past };
}
