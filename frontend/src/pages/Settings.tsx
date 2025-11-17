import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UploadedFile {
  id: string;
  name: string;
  type: 'inclusion' | 'exclusion' | 'example';
  uploadDate?: string;
}

export default function Settings() {
  const { t } = useLanguage();
  const [fileType, setFileType] = useState<'inclusion' | 'exclusion' | 'example'>('inclusion');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const API_BASE = useMemo(() => {
    // Use Vite proxy when available
    return '/api';
  }, []);

  const mapUiTypeToBackend = (t: UploadedFile['type']): string => {
    // Backend expects: include | avoid | examples
    switch (t) {
      case 'inclusion':
        return 'include';
      case 'exclusion':
        return 'avoid';
      case 'example':
      default:
        return 'examples';
    }
  };

  const mapBackendTypeToUi = (t?: string): UploadedFile['type'] => {
    switch (t) {
      case 'include':
        return 'inclusion';
      case 'avoid':
        return 'exclusion';
      case 'examples':
      default:
        return 'example';
    }
  };

  const refreshList = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`${API_BASE}/files`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ name: string; url: string; size: number; uploadDate?: string; fileType?: string }>= await res.json();
      const parsed: UploadedFile[] = data.map((f) => ({
        id: f.name,
        name: f.name,
        type: mapBackendTypeToUi(f.fileType),
        uploadDate: f.uploadDate?.slice(0,10),
      }));
      setUploadedFiles(parsed);
    } catch (e) {
      console.error(e);
      toast.error(t('settings.loadError'));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('pdfFile', file);
      form.append('fileType', mapUiTypeToBackend(fileType));
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('settings.uploadedSuccess').replace('{name}', file.name));
      await refreshList();
    } catch (e: any) {
      console.error(e);
      toast.error(t('settings.uploadFailed').replace('{msg}', e?.message || String(e)));
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const deleteFile = async (fileName: string) => {
    try {
      setDeleting((d) => ({ ...d, [fileName]: true }));
      const res = await fetch(`${API_BASE}/files/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('settings.fileDeleted'));
      setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
    } catch (e: any) {
      console.error(e);
      toast.error(t('settings.deleteFailed').replace('{msg}', e?.message || String(e)));
    } finally {
      setDeleting((d) => ({ ...d, [fileName]: false }));
    }
  };

  const replaceFile = (id: string) => {
    toast.info(t('settings.replaceComingSoon'));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.uploadFiles')}</CardTitle>
                <CardDescription>
                  {t('settings.uploadDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('settings.fileType')}
                  </label>
                  <Select value={fileType} onValueChange={(value: any) => setFileType(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusion">{t('settings.inclusion')}</SelectItem>
                      <SelectItem value="exclusion">{t('settings.exclusion')}</SelectItem>
                      <SelectItem value="example">{t('settings.example')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm mb-1">
                    {t('settings.dropbox.instructions')}{' '}
                    <span className="text-primary font-medium">{t('settings.dropbox.browse')}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t('settings.pdfOnly')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.uploadedFiles')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('settings.fileName')}</TableHead>
                      <TableHead>{t('settings.fileType')}</TableHead>
                      <TableHead>{t('settings.uploadDate')}</TableHead>
                      <TableHead className="text-right">{t('settings.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary">
                            {t(`settings.${file.type}`)}
                          </span>
                        </TableCell>
                        <TableCell>{file.uploadDate}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => replaceFile(file.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!!deleting[file.name]}
                              onClick={() => deleteFile(file.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
