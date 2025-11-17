import { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Download, Mail } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { FeedbackChart } from '@/components/FeedbackChart';
import { ProductTypeFilter } from '@/components/ProductTypeFilter';
import { RatingFilter } from '@/components/RatingFilter';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { useAnalyticsStats } from '@/hooks/use-analytics';
import type { StatsFilters } from '@/lib/analytics';
import { getCategoryBreakdown, getAnalyses } from '@/lib/analytics';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

export default function Statistics() {
  const { t } = useLanguage();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const filters: StatsFilters = useMemo(() => {
    const from = dateRange.from ? new Date(dateRange.from + 'T00:00:00').getTime() : undefined;
    const to = dateRange.to ? new Date(dateRange.to + 'T23:59:59').getTime() : undefined;
    return {
      productTypes: selectedProducts,
      ratings: selectedRatings,
      from,
      to,
    };
  }, [selectedProducts, selectedRatings, dateRange]);

  const stats = useAnalyticsStats(filters);
  const categoryData = useMemo(() => getCategoryBreakdown(filters), [filters]);

  const resolveCategoryLabel = (raw?: string) => {
    if (!raw) return '';
    const key = `product.${raw}`;
    const label = t(key);
    return label === key ? raw : label;
  };

  const requestsValue = useMemo(() =>
    new Intl.NumberFormat().format(stats.requestsCount),
  [stats.requestsCount]);

  const averageSatisfactionValue = useMemo(() =>
    stats.averageRating !== null ? `${stats.averageRating.toFixed(1)}/5` : '-/5',
  [stats.averageRating]);

  const publishingRateValue = useMemo(() =>
    `${Math.round((stats.publishingRate || 0) * 100)}%`,
  [stats.publishingRate]);

  const negativeSummaries = useMemo(() => {
    const analyses = getAnalyses(filters);
    return analyses
      .filter((a) => !!a.negativeSummary)
      .slice(0, 3)
      .map((a) => ({
        key: a.id,
        when: new Date(a.ts),
        label: resolveCategoryLabel(a.product?.category) || t('stats.negativeReviews'),
        summary: a.negativeSummary as string,
      }));
  }, [filters, t]);

  const handleExport = () => {
    const toCsvCell = (v: unknown) => {
      const s = String(v ?? '').replace(/\r?\n|\r/g, ' ').trim();
      if (s.includes(',') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const row = (cells: unknown[]) => cells.map(toCsvCell).join(',');

    const lines: string[] = [];
    const now = new Date();
    lines.push(row(['Exported At', now.toISOString()]));
    lines.push(row(['Date From', dateRange.from || '']));
    lines.push(row(['Date To', dateRange.to || '']));
    lines.push(row(['Selected Categories', selectedProducts.join(' | ')]));
    lines.push(row(['Selected Ratings', selectedRatings.join(' | ')]));
    lines.push('');

    // Summary
    lines.push(row(['Section', 'Summary']));
    lines.push(row(['Metric', 'Value']));
    lines.push(row([t('stats.requests'), stats.requestsCount]));
    lines.push(row([t('stats.averageSatisfaction'), stats.averageRating !== null ? stats.averageRating.toFixed(2) : '' ]));
    lines.push(row([t('stats.publishingRate'), Math.round((stats.publishingRate || 0) * 100) + '%']));
    lines.push('');

    // Feedback distribution
    lines.push(row(['Section', t('stats.feedbackReport')]));
    lines.push(row([t('stats.rating'), t('stats.count')]));
    stats.feedbackDistribution.forEach(d => {
      lines.push(row([d.rating, d.count]));
    });
    lines.push('');

    // Category breakdown
    lines.push(row(['Section', t('stats.trends')]));
    lines.push(row(['Category', 'Requests', 'Publishes', 'WithReviews', 'WithoutReviews', 'Rating1', 'Rating2', 'Rating3', 'Rating4', 'Rating5']));
    categoryData.forEach(c => {
      lines.push(row([
        resolveCategoryLabel(c.category),
        c.requestCount,
        c.publishCount,
        c.method.withReviews,
        c.method.withoutReviews,
        c.ratings[0], c.ratings[1], c.ratings[2], c.ratings[3], c.ratings[4],
      ]));
    });
    lines.push('');

    // Negative summaries
    lines.push(row(['Section', t('stats.negativeReviews')]));
    lines.push(row(['Category', 'Timestamp', 'Summary']));
    negativeSummaries.forEach(n => {
      lines.push(row([n.label, n.when.toISOString(), n.summary]));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats_${now.toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    const now = new Date();
    const subject = `${t('stats.title')} - ${now.toISOString().slice(0, 10)}`;

    const lines: string[] = [];
    lines.push(`${t('stats.title')} (${now.toLocaleString()})`);
    lines.push(``);
    lines.push(`Filters:`);
    if (dateRange.from || dateRange.to) {
      lines.push(`- Date: ${dateRange.from || '…'} → ${dateRange.to || '…'}`);
    }
    if (selectedProducts.length) {
      lines.push(`- Categories: ${selectedProducts.join(', ')}`);
    }
    if (selectedRatings.length) {
      lines.push(`- Ratings: ${selectedRatings.join(', ')}`);
    }
    lines.push('');
    lines.push('Summary:');
    lines.push(`- ${t('stats.requests')}: ${stats.requestsCount}`);
    lines.push(`- ${t('stats.averageSatisfaction')}: ${stats.averageRating !== null ? stats.averageRating.toFixed(2) : '-'}`);
    lines.push(`- ${t('stats.publishingRate')}: ${Math.round((stats.publishingRate || 0) * 100)}%`);
    lines.push('');
    lines.push(`${t('stats.feedbackReport')}:`);
    stats.feedbackDistribution.forEach((d) => {
      lines.push(`- ${t('stats.rating')} ${d.rating}: ${d.count}`);
    });
    lines.push('');
    if (categoryData.length) {
      lines.push(`${t('stats.trends')}:`);
      categoryData.slice(0, 5).forEach((c) => {
        lines.push(`- ${resolveCategoryLabel(c.category)} → ${c.requestCount} requests, ${c.publishCount} publishes`);
      });
      lines.push('');
    }
    if (negativeSummaries.length) {
      lines.push(`${t('stats.negativeReviews')}:`);
      negativeSummaries.forEach((n) => {
        const snippet = n.summary.length > 200 ? n.summary.slice(0, 200) + '…' : n.summary;
        lines.push(`- [${n.when.toLocaleDateString()}] ${n.label}: ${snippet}`);
      });
      lines.push('');
    }
    lines.push('Note: attach the CSV exported from the Statistics page if needed.');

    const body = encodeURIComponent(lines.join('\n'));
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{t('stats.title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('stats.performance')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                {t('stats.email')}
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t('stats.export')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <ProductTypeFilter value={selectedProducts} onChange={setSelectedProducts} />
            <RatingFilter value={selectedRatings} onChange={setSelectedRatings} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title={t('stats.requests')}
              value={requestsValue}
              trend="—"
              isPositive={true}
            />
            <StatCard
              title={t('stats.averageSatisfaction')}
              value={averageSatisfactionValue}
              trend="—"
              isPositive={true}
            />
            <StatCard
              title={t('stats.publishingRate')}
              value={publishingRateValue}
              trend="—"
              isPositive={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('stats.feedbackReport')}</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackChart data={stats.feedbackDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('stats.trends')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData.map(c => ({ category: c.category, requests: c.requestCount }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="category" interval={0} angle={-25} height={60} textAnchor="end" />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                      <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('stats.correlationChart')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{t('stats.filterProduct')}</th>
                        <th className="text-center p-2">Note 1</th>
                        <th className="text-center p-2">Note 2</th>
                        <th className="text-center p-2">Note 3</th>
                        <th className="text-center p-2">Note 4</th>
                        <th className="text-center p-2">Note 5</th>
                        <th className="text-center p-2">{t('stats.generationMethod')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.length === 0 ? (
                        <tr>
                          <td className="p-2 text-muted-foreground" colSpan={7}>Aucune donnée</td>
                        </tr>
                      ) : (
                        categoryData.map((c) => (
                          <tr key={c.category} className="border-b hover:bg-muted/50">
                            <td className="p-2">{resolveCategoryLabel(c.category)}</td>
                            <td className="text-center p-2">{c.ratings[0]}</td>
                            <td className="text-center p-2">{c.ratings[1]}</td>
                            <td className="text-center p-2">{c.ratings[2]}</td>
                            <td className="text-center p-2">{c.ratings[3]}</td>
                            <td className="text-center p-2">{c.ratings[4]}</td>
                            <td className="text-center p-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Avis: {c.method.withReviews}</span>
                              <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded ml-1">Mots-clés: {c.method.withoutReviews}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('stats.negativeReviews')}</CardTitle>
              </CardHeader>
              <CardContent>
                {negativeSummaries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune donnée</div>
                ) : (
                  <div className="space-y-4">
                    {negativeSummaries.map((item) => (
                      <div key={item.key} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.label}</p>
                          <span className="text-xs text-muted-foreground">
                            {item.when.toLocaleDateString()} {item.when.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
