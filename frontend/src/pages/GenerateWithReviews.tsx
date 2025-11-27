import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Upload, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { FeedbackDropdown } from '@/components/FeedbackDropdown';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingCard } from '@/components/LoadingCard';
import { analytics } from '@/lib/analytics';

type Step = 'form' | 'result';

interface Variant {
  sku: string | null;
  name: string;
}

interface Product {
  name: string;
  category: string;
  currentDescription: string;
  variants: Variant[];
}

export default function GenerateWithReviews() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('form');
  
  // Form state
  const [sku, setSku] = useState('');
  const [skuValidated, setSkuValidated] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([language]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Result state
  const [optimizedTitle, setOptimizedTitle] = useState('');
  const [optimizedDescription, setOptimizedDescription] = useState('');
  const [justifications, setJustifications] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [feedback, setFeedback] = useState<number | null>(null);
  
  // Product data from API
  const [product, setProduct] = useState<Product | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shopifyPreviewUrl, setShopifyPreviewUrl] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCsvFile(acceptedFiles[0]);
      setErrors({ ...errors, csv: false });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const handleValidateSku = async () => {
    if (!sku.trim()) {
      setErrors({ ...errors, sku: true });
      return;
    }
    // Validate at least 13 numeric digits
    if (!/^\d{13,}$/.test(sku.trim())) {
      setErrors({ ...errors, sku: true });
      return;
    }
    
    try {
      const response = await fetch('/api/product/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: sku }),
      });

      if (!response.ok) {
        throw new Error('Product not found');
      }

      const data = await response.json();
      console.log('Server response:', data); // <-- ADDED FOR DEBUGGING

      setProduct({
        name: data.result.title,
        category: data.result.category,
        currentDescription: data.result.description,
        variants: data.result.variants || [],
      });
      setSkuValidated(true);
      setErrors({ ...errors, sku: false });
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: t('toast.error'),
        description: t('toast.productNotFound'),
        variant: "destructive",
      });
      setSkuValidated(false);
    }
  };

  const handleLanguageToggle = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) 
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
    setErrors({ ...errors, languages: false });
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    setErrors({ ...errors, csv: false });
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (!sku.trim() || !skuValidated) newErrors.sku = true;
    if (!csvFile) newErrors.csv = true;
    if (selectedLanguages.length === 0) newErrors.languages = true;
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstError = Object.keys(newErrors)[0];
      document.getElementById(firstError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      return false;
    }
    
    return true;
  };

  const handleOptimize = async () => {
    if (!validateForm()) return;

    setIsOptimizing(true);

    // Track request
    if (product) {
      analytics.trackOptimize({
        method: 'withReviews',
        language,
        product: {
          title: product.name,
          category: product.category,
          sku: product.variants?.[0]?.sku || null,
          source: 'shopify',
        },
      });
    }

    const formData = new FormData();

    // Append the file if it exists
    if (csvFile) {
      formData.append('customerReviewsCSV', csvFile);
    }

    // Append the other product details
    if (product) {
      formData.append('productTitle', product.name);
      formData.append('productDescription', product.currentDescription);
      formData.append('category', product.category);
      // Use the first variant's SKU as the primary SKU for the request
      if (product.variants && product.variants.length > 0) {
        formData.append('sku', product.variants[0].sku || '');
      }
    }

    formData.append('language', selectedLanguages[0] || language);
    formData.append('userInstructions', 'Optimize the product description based on the provided reviews.');

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        // DO NOT set the Content-Type header. The browser will do it automatically for FormData.
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setOptimizedTitle(result.newTitle);
      setOptimizedDescription(result.newDescription);
      setJustifications(result.justifications || '');
      // Track negative/positive summaries from optimize result
      if (product && (result.negativeSummary || result.positiveSummary)) {
        analytics.trackAnalysis(
          { negativeSummary: result.negativeSummary, positiveSummary: result.positiveSummary },
          {
            method: 'withReviews',
            language,
            product: {
              title: product.name,
              category: product.category,
              sku: product.variants?.[0]?.sku || null,
              source: 'shopify',
            },
          }
        );
      }
      setStep('result');
    } catch (error) {
      console.error('Error optimizing product:', error);
      toast({
        title: t('toast.error'),
        description: t('toast.optimizeFailed'),
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!adjustmentPrompt.trim() || !product || !csvFile) return;

    setIsRegenerating(true);
    // Track regenerate
    analytics.trackRegenerate({
      method: 'withReviews',
      language,
      product: {
        title: product.name,
        category: product.category,
        sku: product.variants?.[0]?.sku || null,
        source: 'shopify',
      },
    });
    const formData = new FormData();

    // Append the file and product details
    formData.append('customerReviewsCSV', csvFile);
    formData.append('productTitle', optimizedTitle || product.name);
    formData.append('productDescription', optimizedDescription);
    formData.append('category', product.category);
    if (product.variants && product.variants.length > 0) {
      formData.append('sku', product.variants[0].sku || '');
    }
    formData.append('language', selectedLanguages[0] || language);
    formData.append('userInstructions', adjustmentPrompt);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setOptimizedTitle(result.newTitle);
      setOptimizedDescription(result.newDescription);
      setJustifications(result.justifications || '');
      setAdjustmentPrompt(''); // Clear the prompt
    } catch (error) {
      console.error('Error regenerating description:', error);
      toast({
        title: t('toast.regenerateFailedTitle'),
        description: t('toast.regenerateFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!product) return;

    setIsPublishing(true);
    // Track publish
    analytics.trackPublish({
      method: 'withReviews',
      language,
      product: {
        title: product.name,
        category: product.category,
        sku: product.variants?.[0]?.sku || null,
        source: 'shopify',
      },
    });
    try {
      const response = await fetch('/api/product/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sku, // Using the ID from the user input
          title: optimizedTitle,
          descriptionHtml: optimizedDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish to Shopify');
      }

      const data = await response.json();
      console.log(data);
      if (data?.onlineStorePreviewUrl) {
        setShopifyPreviewUrl(data.onlineStorePreviewUrl);
      }

      toast({
        title: t('toast.publishSuccessTitle'),
        description: t('toast.publishSuccessDesc')
      });
    } catch (error) {
      console.error('Error publishing to Shopify:', error);
      toast({
        title: t('toast.publishFailedTitle'),
        description: t('toast.publishFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReturnToForm = () => {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name: optimizedTitle || prev.name,
        currentDescription: optimizedDescription || prev.currentDescription,
      };
    });
    setStep('form');
  };

  if (step === 'result' && product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReturnToForm}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('review.back')}
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{t('review.title')}</h1>
                <p className="text-muted-foreground mt-1">
                  {t('dashboard.withReviewsDesc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Description */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">{t('review.currentDescription')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.productName')}</Label>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.category')}</Label>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    {product.variants.length === 1 ? (
                      <div>
                        <Label className="text-sm text-muted-foreground">SKU</Label>
                        <p className="font-medium">{product.variants[0].sku || 'N/A'}</p>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm text-muted-foreground">Variants</Label>
                        <div className="space-y-2 mt-1">
                          {product.variants.slice(0, 5).map((variant, index) => (
                            <div key={index} className="p-2 bg-slate-100 rounded-md text-sm">
                              <p className="font-medium">{variant.name}</p>
                              {variant.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                              )}
                            </div>
                          ))}
                        </div>
                    </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.currentDescription')}</Label>
                    <p className="text-sm mt-2">{product.currentDescription}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Optimized Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('review.optimizedDescription')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.productName')}</Label>
                    <Input
                      value={optimizedTitle}
                      onChange={(e) => setOptimizedTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.category')}</Label>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    {product.variants.length === 1 ? (
                      <div>
                        <Label className="text-sm text-muted-foreground">SKU</Label>
                        <p className="font-medium">{product.variants[0].sku || 'N/A'}</p>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm text-muted-foreground">Variants</Label>
                        <div className="space-y-2 mt-1">
                          {product.variants.slice(0, 5).map((variant, index) => (
                            <div key={index} className="p-2 bg-slate-100 rounded-md text-sm">
                              <p className="font-medium">{variant.name}</p>
                        0      {variant.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                              )}
                            </div>
                          ))}
                        </div>
                    </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.optimizedDescription')}</Label>
                    <Textarea
                      value={optimizedDescription}
                      onChange={(e) => setOptimizedDescription(e.target.value)}
                      rows={10}
                      className="mt-2  max-h-[1500px]"
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handlePublish}
                      className="w-full"
                      size="lg"
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('review.publishing')}
                        </>
                      ) : (
                        t('review.publish')
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {shopifyPreviewUrl && (
            <div className="mb-4">
              <Alert>
                <AlertDescription className="break-words">
                  {t('review.shopifyPreview')}{' '}
                  <a href={shopifyPreviewUrl} target="_blank" rel="noreferrer" className="underline text-primary break-words break-all max-w-full inline-block">{shopifyPreviewUrl}</a>
                </AlertDescription>
              </Alert>
            </div>
          )}


            {/* Justifications */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('review.analysisTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{justifications}</p>
                </div>
              </CardContent>
            </Card>


            {/* Adjustment Prompt */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('review.adjustCommand')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={adjustmentPrompt}
                  onChange={(e) => setAdjustmentPrompt(e.target.value)}
                  placeholder={t('review.adjustCommand')}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={handleRegenerate}
                  disabled={!adjustmentPrompt.trim() || isRegenerating}
                  className="mt-4"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('review.regenerating')}
                    </>
                  ) : (
                    t('review.regenerate')
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('review.feedback')}</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackDropdown
                  value={feedback}
                  onChange={setFeedback}
                  onSubmit={(rating) => {
                    if (!product) return;
                    analytics.trackFeedback(rating, {
                      method: 'withReviews',
                      language,
                      product: {
                        title: product.name,
                        category: product.category,
                        sku: product.variants?.[0]?.sku || null,
                        source: 'shopify',
                      },
                    });
                  }}
                />
              </CardContent>
            </Card>            
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isOptimizing && <LoadingCard text={t('review.optimizing')} />}
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t('review.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.withReviewsDesc')}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-8">
              {/* SKU Input */}
              <div id="sku">
                <CardHeader className="px-0">
                  <CardTitle>{t('review.skuIdentification')} *</CardTitle>
                  <CardDescription>{t('review.skuDescription')}</CardDescription>
                </CardHeader>
                <div className="flex gap-2">
                  <Input
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value);
                      setSkuValidated(false);
                      setErrors({ ...errors, sku: false });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleValidateSku();
                      }
                    }}
                    placeholder={t('review.skuPlaceholder')}
                    className={errors.sku ? 'border-destructive' : ''}
                  />
                  <Button onClick={handleValidateSku} variant="outline">
                    {t('review.validate')}
                  </Button>
                </div>
              {errors.sku && (
                <div className="flex items-center gap-2 mt-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {sku.trim() && !/^\d{13,}$/.test(sku.trim()) ? t('review.errorProductId') : t('review.errorRequired')}
                  </p>
                </div>
              )}
              {skuValidated && product && (
                <div className="mt-6">
                  <CardHeader className="px-0">
                    <CardTitle>{t('review.productToOptimize')}</CardTitle>
                  </CardHeader>
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">{t('review.productName')}</Label>
                        <p className="font-medium">{product.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">{t('review.category')}</Label>
                        <p className="font-medium">{product.category}</p>
                      </div>
                                        <div>
                    {product.variants.length === 1 ? (
                      <div>
                        <Label className="text-sm text-muted-foreground">SKU</Label>
                        <p className="font-medium">{product.variants[0].sku || 'N/A'}</p>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm text-muted-foreground">Variants</Label>
                        <div className="space-y-2 mt-1">
                          {product.variants.slice(0, 5).map((variant, index) => (
                            <div key={index} className="p-2 bg-slate-100 rounded-md text-sm">
                              <p className="font-medium">{variant.name}</p>
                              {variant.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">{t('review.currentDescription')}</Label>
                        <p className="text-sm mt-1">{product.currentDescription}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div id="csv">
                <CardHeader className="px-0">
                  <CardTitle>{t('review.uploadReviews')} *</CardTitle>
                  <CardDescription>{t('review.uploadReviewsDesc')}</CardDescription>
                </CardHeader>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : errors.csv ? 'border-destructive' : 'border-border hover:border-primary'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  {csvFile ? (
                    <p className="text-sm font-medium">{csvFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('review.dragDrop')} <span className="text-primary">{t('review.browse')}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">CSV uniquement</p>
                    </>
                  )}
                 </div>
                 {csvFile && (
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setCsvFile(null)}
                     className="mt-2"
                   >
                     <X className="h-4 w-4 mr-2" />
                     {t('review.removeFile')}
                   </Button>
                 )}
                 {errors.csv && (
                   <div className="flex items-center gap-2 mt-2 text-destructive">
                     <AlertTriangle className="h-4 w-4" />
                     <p className="text-sm font-medium">{t('review.errorRequiredFile')}</p>
                   </div>
                 )}
              </div>

              {/* Language Selection */}
              <div id="languages">
                <CardHeader className="px-0">
                  <CardTitle>{t('review.selectLanguages')} *</CardTitle>
                  <CardDescription>{t('review.selectLanguagesDesc')}</CardDescription>
                </CardHeader>
                <Select
                  value={selectedLanguages[0] || language}
                  onValueChange={(value) => {
                    setSelectedLanguages([value]);
                    setErrors({ ...errors, languages: false });
                  }}
                >
                  <SelectTrigger className={errors.languages ? 'border-destructive' : ''}>
                    <SelectValue placeholder={t('review.selectLanguages')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">{t('review.french')}</SelectItem>
                    <SelectItem value="en">{t('review.english')}</SelectItem>
                  </SelectContent>
                </Select>
              {errors.languages && (
                <div className="flex items-center gap-2 mt-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">{t('review.errorRequired')}</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">{t('review.requiredFields')}</p>
              <div className="flex justify-end">
                <Button onClick={handleOptimize} size="lg" disabled={isOptimizing}>
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('review.optimizing')}
                    </>
                  ) : (
                    t('review.optimize')
                  )}
                </Button>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
