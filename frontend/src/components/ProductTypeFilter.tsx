import { useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { analytics, getCategoryBreakdown } from '@/lib/analytics';

interface ProductTypeFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ProductTypeFilter({ value, onChange }: ProductTypeFilterProps) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => {
      const breakdown = getCategoryBreakdown({});
      const uniq = Array.from(new Set(breakdown.map((b) => b.category)));
      setCategories(uniq);
    };
    refresh();
    const off = analytics.onUpdate(refresh);
    return off;
  }, []);

  const productTypes = useMemo(() => categories, [categories]);

  const resolveCategoryLabel = (raw: string) => {
    const key = `product.${raw}`;
    const label = t(key);
    return label === key ? raw : label;
  };

  const handleToggle = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter(t => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === productTypes.length) {
      onChange([]);
    } else {
      onChange(productTypes);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        {t('stats.filterProduct')}
      </label>
      <div className="space-y-2 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
        <div className="flex items-center space-x-2 pb-2 border-b sticky top-0 bg-background">
          <Checkbox
            id="all-products"
            checked={value.length === productTypes.length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="all-products" className="cursor-pointer font-medium">
            {t('product.all')}
          </Label>
        </div>
        {productTypes.map((type) => (
          <div key={type} className="flex items-center space-x-2">
            <Checkbox
              id={type}
              checked={value.includes(type)}
              onCheckedChange={() => handleToggle(type)}
            />
            <Label htmlFor={type} className="cursor-pointer">
              {resolveCategoryLabel(type)}
            </Label>
          </div>
        ))}
        {productTypes.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucune catégorie disponible</div>
        )}
      </div>
    </div>
  );
}
