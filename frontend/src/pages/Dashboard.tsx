import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, FlaskConical, BarChart3, Sparkles } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    {
      icon: FileText,
      titleMain: t('dashboard.generateWith'),
      titleSub: t('dashboard.withReviews'),
      description: t('dashboard.withReviewsDesc'),
      path: '/generate-with-reviews',
      color: 'text-primary',
    },
    {
      icon: FlaskConical,
      titleMain: t('dashboard.generateWith'),
      titleSub: t('dashboard.withoutReviews'),
      description: t('dashboard.withoutReviewsDesc'),
      path: '/generate-without-reviews',
      color: 'text-warning',
    },
    {
      icon: BarChart3,
      titleMain: t('dashboard.statistics'),
      titleSub: '',
      description: t('dashboard.statisticsDesc'),
      path: '/statistics',
      color: 'text-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t('dashboard.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.path}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-card"
                  onClick={() => navigate(feature.path)}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl leading-tight">
                      <div className="font-bold text-xl">{feature.titleMain}</div>
                      {feature.titleSub && (
                        <div className="font-normal text-sm mt-1 text-muted-foreground">
                          {feature.titleSub}
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-10">
          <div className="flex items-start justify-center gap-2">
            <Sparkles className="h-4 w-4 mt-1" aria-hidden="true" />
            <div className="text-xs text-muted-foreground text-center">
              {t('dashboard.aiDisclaimer')
                .split(/(?<=[.!?])\s+/)
                .map((sentence, idx) => (
                  <div key={idx}>{sentence}</div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
