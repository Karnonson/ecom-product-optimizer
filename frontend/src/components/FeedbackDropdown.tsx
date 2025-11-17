import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface FeedbackDropdownProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onSubmit?: (rating: number) => void;
}

export function FeedbackDropdown({ value, onChange, onSubmit }: FeedbackDropdownProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (value !== null) {
      if (onSubmit) {
        try { onSubmit(value); } catch {}
      }
      toast({
        title: t('feedback.thankYou'),
      });
    }
  };

  return (
    <div className="space-y-4">
      <Select
        value={value?.toString() || ''}
        onValueChange={(v) => onChange(v ? parseInt(v) : null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('feedback.select')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5 - {t('feedback.5')}</SelectItem>
          <SelectItem value="4">4 - {t('feedback.4')}</SelectItem>
          <SelectItem value="3">3 - {t('feedback.3')}</SelectItem>
          <SelectItem value="2">2 - {t('feedback.2')}</SelectItem>
          <SelectItem value="1">1 - {t('feedback.1')}</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={handleSubmit}
        disabled={value === null}
        className="w-full"
      >
        {t('review.submit')}
      </Button>
    </div>
  );
}
