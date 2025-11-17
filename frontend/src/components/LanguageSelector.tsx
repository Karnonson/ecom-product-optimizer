import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onLanguageChange: (languages: string[]) => void;
}

export function LanguageSelector({ selectedLanguages, onLanguageChange }: LanguageSelectorProps) {
  const { t } = useLanguage();

  const handleLanguageSelect = (value: string) => {
    onLanguageChange([value]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('review.selectLanguage')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select 
          value={selectedLanguages[0] || 'fr'} 
          onValueChange={handleLanguageSelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('review.selectLanguage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">{t('review.french')}</SelectItem>
            <SelectItem value="en">{t('review.english')}</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
