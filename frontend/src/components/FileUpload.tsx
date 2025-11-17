import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (data: any[], fileName: string) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const { t } = useLanguage();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Mock CSV parsing - in production, use a proper CSV parser
        const lines = text.split('\n').filter(line => line.trim());
        const mockData = lines.slice(1, 6).map((line, index) => ({
          id: `review-${index + 1}`,
          productName: `Product ${index + 1}`,
          rating: Math.floor(Math.random() * 2) + 4,
          review: line.split(',')[0] || `Mock review ${index + 1}`,
          originalDescription: `Original product description for item ${index + 1}`,
        }));
        
        onUpload(mockData, file.name);
        toast.success(
          t('review.import') + ' - ' + mockData.length + ' avis'
        );
      } catch (error) {
        toast.error('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsText(file);
  }, [onUpload, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <Card>
      <CardContent className="p-12">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg mb-2">
            {t('review.dragDrop')}{' '}
            <span className="text-primary font-medium">{t('review.browse')}</span>
          </p>
          <p className="text-sm text-muted-foreground">CSV uniquement</p>
        </div>
      </CardContent>
    </Card>
  );
}
