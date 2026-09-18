import * as SecureStore from 'expo-secure-store';

const ALADHAN_API = 'https://api.aladhan.com/v1/timings';
const CACHE_PREFIX = 'prayer_times';
const METHOD_ISNA = 2;

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface PrayerTimesData {
  code: number;
  status: string;
  data: {
    timings: PrayerTimings;
    date: {
      readable: string;
      timestamp: string;
      gregorian: { date: string; format: string; day: string; month: { number: number; en: string }; year: string };
      hijri: { date: string; format: string; day: string; month: { number: number; en: string; ar: string }; year: string };
    };
  };
}

export interface PrayerInfo {
  name: string;
  time: string;
  date: Date;
}

export interface PrayerWithRange {
  name: string;
  startTime: string;
  endTime: string;
  isPast: boolean;
  isCurrent: boolean;
  isNext: boolean;
  progress: number;
}

const PRAYER_ORDER: (keyof PrayerTimings)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cacheKey(lat: number, lng: number): string {
  return `${CACHE_PREFIX}_${todayKey()}_${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function getNextPrayer(timings: PrayerTimings): { name: string; time: string; date: Date } | null {
  const now = new Date();
  for (const name of PRAYER_ORDER) {
    const time = timings[name];
    if (!time) continue;
    const prayerDate = parseTimeToDate(time);
    if (prayerDate > now) {
      return { name, time, date: prayerDate };
    }
  }
  return null;
}

export function getPrayersWithStatus(timings: PrayerTimings): Array<{ name: string; time: string; isNext: boolean; isPast: boolean }> {
  const now = new Date();
  const nextPrayer = getNextPrayer(timings);
  return PRAYER_ORDER.map((name) => {
    const time = timings[name];
    const date = parseTimeToDate(time);
    const isPast = date <= now;
    const isNext = nextPrayer?.name === name;
    return { name, time, isNext, isPast };
  });
}

export function getPrayersWithRanges(timings: PrayerTimings): PrayerWithRange[] {
  const now = new Date();
  const nowMs = now.getTime();

  return PRAYER_ORDER.map((name, index) => {
    const startTime = timings[name];
    const nextIndex = index + 1;
    const endTime = nextIndex < PRAYER_ORDER.length ? timings[PRAYER_ORDER[nextIndex]] : timings[name];

    const startDate = parseTimeToDate(startTime);
    const endDate = parseTimeToDate(endTime);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    let progress = 0;
    let isCurrent = false;
    let isPast = false;
    let isNext = false;

    if (nowMs >= startMs && nowMs < endMs) {
      isCurrent = true;
      progress = Math.min(1, (nowMs - startMs) / (endMs - startMs));
    } else if (nowMs >= endMs) {
      isPast = true;
      progress = 1;
    } else {
      isNext = true;
    }

    return {
      name,
      startTime,
      endTime,
      isPast,
      isCurrent,
      isNext,
      progress,
    };
  });
}

export function getCurrentPrayer(timings: PrayerTimings): PrayerWithRange | null {
  const prayers = getPrayersWithRanges(timings);
  return prayers.find((p) => p.isCurrent) || null;
}

export async function fetchPrayerTimes(lat: number, lng: number): Promise<PrayerTimesData | null> {
  const key = cacheKey(lat, lng);

  try {
    const cached = await SecureStore.getItemAsync(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  try {
    const date = todayKey().replace(/-/g, '');
    const url = `${ALADHAN_API}/${date}?latitude=${lat}&longitude=${lng}&method=${METHOD_ISNA}`;
    const response = await fetch(url);
    const data: PrayerTimesData = await response.json();

    if (data.code === 200) {
      try {
        await SecureStore.setItemAsync(key, JSON.stringify(data));
      } catch {}
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
