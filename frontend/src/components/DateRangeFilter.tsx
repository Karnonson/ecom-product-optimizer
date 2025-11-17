import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface DateRangeFilterProps {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { t } = useLanguage();

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        {t('stats.filterDate')}
      </label>
      <div className="flex gap-2">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          placeholder="De"
        />
        <Input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          placeholder="À"
        />
      </div>
    </div>
  );
}
