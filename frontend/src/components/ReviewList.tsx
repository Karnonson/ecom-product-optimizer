import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Star } from 'lucide-react';

interface ReviewListProps {
  reviews: any[];
  selectedReviews: string[];
  onSelectionChange: (selected: string[]) => void;
  onAnalyze: () => void;
  isProductMode?: boolean;
}

export function ReviewList({
  reviews,
  selectedReviews,
  onSelectionChange,
  onAnalyze,
  isProductMode = false
}: ReviewListProps) {
  const { t } = useLanguage();

  const handleToggle = (id: string) => {
    if (selectedReviews.includes(id)) {
      onSelectionChange(selectedReviews.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedReviews, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(reviews.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {isProductMode ? t('review.selectProducts') : t('review.selectReviews')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            <Checkbox
              checked={selectedReviews.length === reviews.length && reviews.length > 0}
              className="mr-2"
            />
            {t('review.selectAll')}
          </Button>
        </div>
        <Button
          onClick={onAnalyze}
          disabled={selectedReviews.length === 0}
        >
          {t('review.next')}
        </Button>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedReviews.includes(review.id)}
                  onCheckedChange={() => handleToggle(review.id)}
                />
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{review.productName}</CardTitle>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'fill-warning text-warning'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{review.review}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
