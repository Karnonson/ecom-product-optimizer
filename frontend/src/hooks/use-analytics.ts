import { useEffect, useMemo, useState } from 'react';
import { AggregatedStats, StatsFilters, analytics, getAggregatedStats } from '@/lib/analytics';

export function useAnalyticsStats(filters: StatsFilters) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const off = analytics.onUpdate(() => setVersion((v) => v + 1));
    return off;
  }, []);

  const stats: AggregatedStats = useMemo(() => getAggregatedStats(filters), [filters, version]);
  return stats;
}
