import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface FeedbackChartProps {
  data?: { rating: string; count: number }[];
}

const fallbackData = [
  { rating: '5', count: 0 },
  { rating: '4', count: 0 },
  { rating: '3', count: 0 },
  { rating: '2', count: 0 },
  { rating: '1', count: 0 },
];

export function FeedbackChart({ data }: FeedbackChartProps) {
  const { t } = useLanguage();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data && data.length ? data : fallbackData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis 
          dataKey="rating" 
          label={{ value: t('stats.rating'), position: 'insideBottom', offset: -5 }}
        />
        <YAxis 
          label={{ value: t('stats.count'), angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
