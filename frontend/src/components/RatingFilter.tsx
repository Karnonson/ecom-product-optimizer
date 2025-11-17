import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface RatingFilterProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export function RatingFilter({ value, onChange }: RatingFilterProps) {
  const { t } = useLanguage();

  const ratings = [1, 2, 3, 4, 5];

  const handleToggle = (rating: number) => {
    if (value.includes(rating)) {
      onChange(value.filter(r => r !== rating));
    } else {
      onChange([...value, rating]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === ratings.length) {
      onChange([]);
    } else {
      onChange(ratings);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        {t('stats.filterRating')}
      </label>
      <div className="space-y-2 border rounded-lg p-4">
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Checkbox
            id="all-ratings"
            checked={value.length === ratings.length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="all-ratings" className="cursor-pointer font-medium">
            {t('stats.allRatings')}
          </Label>
        </div>
        {ratings.map((rating) => (
          <div key={rating} className="flex items-center space-x-2">
            <Checkbox
              id={`rating-${rating}`}
              checked={value.includes(rating)}
              onCheckedChange={() => handleToggle(rating)}
            />
            <Label htmlFor={`rating-${rating}`} className="cursor-pointer">
              {rating} {rating === 1 ? '⭐' : '⭐'.repeat(rating)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
