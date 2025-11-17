// Lightweight client-side analytics using localStorage

export type AnalyticsMethod = 'withReviews' | 'withoutReviews';
export type AnalyticsEventType = 'optimize' | 'regenerate' | 'publish' | 'feedback' | 'analysis';

export interface AnalyticsProductInfo {
  title?: string;
  category?: string; // expected keys like 'shoes', 'pants', etc. if available
  sku?: string | null;
}

export interface AnalyticsEventBase {
  id: string;
  type: AnalyticsEventType;
  ts: number; // epoch ms
  method?: AnalyticsMethod;
  language?: string;
  product?: AnalyticsProductInfo;
}

export interface FeedbackEvent extends AnalyticsEventBase {
  type: 'feedback';
  rating: number; // 1..5
}

export type AnalyticsEvent = AnalyticsEventBase | FeedbackEvent;
export interface AnalysisEvent extends AnalyticsEventBase {
  type: 'analysis';
  negativeSummary?: string;
  positiveSummary?: string;
}

const STORAGE_KEY = 'po.analytics.v1';
const UPDATE_EVENT = 'po-analytics-updated';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getEvents(): (AnalyticsEvent | AnalysisEvent)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function setEvents(events: (AnalyticsEvent | AnalysisEvent)[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  // notify listeners (same tab)
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function clearEvents() {
  setEvents([]);
}

export interface TrackContext {
  method?: AnalyticsMethod;
  language?: string;
  product?: AnalyticsProductInfo;
}

export const analytics = {
  trackOptimize(ctx: TrackContext = {}) {
    const events = getEvents();
    events.push({ id: uuid(), type: 'optimize', ts: Date.now(), ...ctx });
    setEvents(events);
  },
  trackRegenerate(ctx: TrackContext = {}) {
    const events = getEvents();
    events.push({ id: uuid(), type: 'regenerate', ts: Date.now(), ...ctx });
    setEvents(events);
  },
  trackPublish(ctx: TrackContext = {}) {
    const events = getEvents();
    events.push({ id: uuid(), type: 'publish', ts: Date.now(), ...ctx });
    setEvents(events);
  },
  trackFeedback(rating: number, ctx: TrackContext = {}) {
    if (Number.isNaN(rating)) return;
    const events = getEvents();
    const evt: FeedbackEvent = {
      id: uuid(),
      type: 'feedback',
      ts: Date.now(),
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      ...ctx,
    };
    events.push(evt);
    setEvents(events);
  },
  trackAnalysis(data: { negativeSummary?: string; positiveSummary?: string }, ctx: TrackContext = {}) {
    const events = getEvents();
    const evt: AnalysisEvent = {
      id: uuid(),
      type: 'analysis',
      ts: Date.now(),
      negativeSummary: data.negativeSummary,
      positiveSummary: data.positiveSummary,
      ...ctx,
    };
    events.push(evt);
    setEvents(events);
  },
  onUpdate(listener: () => void): () => void {
    const handler = () => listener();
    window.addEventListener(UPDATE_EVENT, handler);
    // Also respond to cross-tab updates
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) listener();
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handler);
      window.removeEventListener('storage', storageHandler);
    };
  },
};

export interface StatsFilters {
  productTypes?: string[]; // keys like 'shoes', 'pants', ...
  ratings?: number[]; // 1..5 (applies where relevant)
  from?: number; // epoch ms inclusive
  to?: number; // epoch ms inclusive
}

function normalizeCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  const key = cat.trim().toLowerCase();
  // simple normalization to known set when possible
  const known = ['shoes', 'pants', 'shorts', 'tshirts', 'longsleeves', 'caps', 'underwear', 'socks', 'boots'];
  const match = known.find((k) => key.includes(k));
  return match || key;
}

function applyFilters(events: AnalyticsEvent[], filters: StatsFilters): AnalyticsEvent[] {
  const { productTypes, ratings, from, to } = filters;
  return events.filter((e) => {
    if (from && e.ts < from) return false;
    if (to && e.ts > to) return false;
    if (productTypes && productTypes.length > 0) {
      const cat = normalizeCategory(e.product?.category);
      if (!cat || !productTypes.includes(cat)) return false;
    }
    if (ratings && ratings.length > 0 && (e as FeedbackEvent).type === 'feedback') {
      const r = (e as FeedbackEvent).rating;
      if (!ratings.includes(r)) return false;
    }
    return true;
  });
}

export interface AggregatedStats {
  requestsCount: number;
  averageRating: number | null;
  publishingRate: number; // 0..1
  feedbackDistribution: { rating: string; count: number }[]; // ratings 1..5
}

export function getAggregatedStats(filters: StatsFilters = {}): AggregatedStats {
  const events = applyFilters(getEvents(), filters);
  const requests = events.filter((e) => e.type === 'optimize' || e.type === 'regenerate');
  const publishes = events.filter((e) => e.type === 'publish');
  const feedbacks = events.filter((e): e is FeedbackEvent => e.type === 'feedback');

  const requestsCount = requests.length;
  const publishingRate = requestsCount > 0 ? publishes.length / requestsCount : 0;
  const averageRating = feedbacks.length > 0
    ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
    : null;

  const counts = [1, 2, 3, 4, 5].map((r) => ({ rating: String(r), count: 0 }));
  for (const f of feedbacks) {
    const idx = Math.min(5, Math.max(1, f.rating)) - 1;
    counts[idx].count += 1;
  }

  return { requestsCount, averageRating, publishingRate, feedbackDistribution: counts.reverse() };
}

export interface CategoryBreakdownItem {
  category: string; // normalized key
  requestCount: number;
  publishCount: number;
  method: { withReviews: number; withoutReviews: number };
  ratings: [number, number, number, number, number]; // index 0 => rating 1
}

export function getCategoryBreakdown(filters: StatsFilters = {}): CategoryBreakdownItem[] {
  const events = applyFilters(getEvents() as AnalyticsEvent[], filters);

  const map = new Map<string, CategoryBreakdownItem>();
  const ensure = (raw?: string): CategoryBreakdownItem | null => {
    const key = normalizeCategory(raw);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        category: key,
        requestCount: 0,
        publishCount: 0,
        method: { withReviews: 0, withoutReviews: 0 },
        ratings: [0, 0, 0, 0, 0],
      });
    }
    return map.get(key)!;
  };

  for (const e of events) {
    const item = ensure(e.product?.category);
    if (!item) continue;
    if (e.type === 'optimize' || e.type === 'regenerate') {
      item.requestCount += 1;
      if (e.method === 'withReviews') item.method.withReviews += 1;
      else if (e.method === 'withoutReviews') item.method.withoutReviews += 1;
    }
    if (e.type === 'publish') item.publishCount += 1;
    if (e.type === 'feedback') {
      const r = Math.min(5, Math.max(1, (e as FeedbackEvent).rating));
      item.ratings[r - 1] += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.requestCount - a.requestCount);
}

export function getAnalyses(filters: StatsFilters = {}): AnalysisEvent[] {
  const events = applyFilters(getEvents() as (AnalyticsEvent | AnalysisEvent)[], filters);
  const analyses = events.filter((e): e is AnalysisEvent => e.type === 'analysis');
  // newest first
  return analyses.sort((a, b) => b.ts - a.ts);
}
