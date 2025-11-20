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
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { FeedbackDropdown } from '@/components/FeedbackDropdown';
import { useToast } from '@/hooks/use-toast';
import { LoadingCard } from '@/components/LoadingCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { analytics, type AnalyticsProductInfo } from '@/lib/analytics';

type Step = 'form' | 'result';
type ProductSource = 'shopify' | 'manual' | null;

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

export default function GenerateWithoutReviews() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('form');
  const [productSource, setProductSource] = useState<ProductSource>(null);
  
  // Form state
  const [sku, setSku] = useState('');
  const [skuValidated, setSkuValidated] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const [manualPrice, setManualPrice] = useState('');
  const [manualSku, setManualSku] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [userInstructions, setUserInstructions] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([language]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Result state
  const [optimizedTitle, setOptimizedTitle] = useState('');
  const [optimizedDescription, setOptimizedDescription] = useState('');
  const [justifications, setJustifications] = useState('');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [feedback, setFeedback] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(true);
  
  // Product data from API
  const [product, setProduct] = useState<Product | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shopifyPreviewUrl, setShopifyPreviewUrl] = useState<string | null>(null);

  const getAnalyticsProductInfo = (details?: Product | null): AnalyticsProductInfo | undefined => {
    if (!details) return undefined;
    const isShopifyProduct = productSource === 'shopify';
    return {
      title: details.name,
      category: isShopifyProduct ? details.category : undefined,
      sku: details.variants?.[0]?.sku || null,
      source: isShopifyProduct ? 'shopify' : 'manual',
    };
  };

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

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    
    if (productSource === 'shopify' && (!sku.trim() || !skuValidated)) {
      newErrors.sku = true;
    }
    
    if (productSource === 'manual') {
      if (!manualTitle.trim()) newErrors.manualTitle = true;
      if (!manualDescription.trim()) newErrors.manualDescription = true;
    }
    
    if (!userInstructions.trim()) newErrors.userInstructions = true;
    if (selectedLanguages.length === 0) newErrors.languages = true;
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      document.getElementById(firstError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    
    return true;
  };

  const handleOptimize = async () => {
    if (!validateForm()) return;

    setIsOptimizing(true);
    
    let currentProduct: Product | null = product;

    // If the product is entered manually, create a product object from the manual fields
    if (productSource === 'manual') {
      currentProduct = {
        name: manualTitle,
        category: manualCategory,
        currentDescription: manualDescription,
        variants: [], // SKU is now entered on the results page
      };
      setProduct(currentProduct);
    }
    
    if (!currentProduct) {
      toast({
        title: t('toast.error'),
        description: t('toast.missingProductDetails'),
        variant: "destructive",
      });
      setIsOptimizing(false);
      return;
    }

    const formData = new FormData();

    // Append the other product details
    formData.append('productTitle', currentProduct.name);
    formData.append('productDescription', currentProduct.currentDescription);
    formData.append('category', currentProduct.category);
    if (currentProduct.variants && currentProduct.variants.length > 0) {
      formData.append('sku', currentProduct.variants[0].sku || '');
    }

    formData.append('language', selectedLanguages[0] || language);
    formData.append('userInstructions', userInstructions);

    try {
      // Track request (optimize) with computed product
      analytics.trackOptimize({
        method: 'withoutReviews',
        language,
        product: getAnalyticsProductInfo(currentProduct),
      });
      const response = await fetch('/api/optimize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setOptimizedTitle(currentProduct.name);
      setOptimizedDescription(result.newDescription);
      setJustifications(result.justifications || '');
  // when showing a new result for manual products, show the create-question again
  setShowCreateQuestion(true);
  setShowCreateForm(false);
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
    if (!adjustmentPrompt.trim() || !product) return;

    setIsRegenerating(true);
    // Track regenerate
    analytics.trackRegenerate({
      method: 'withoutReviews',
      language,
      product: getAnalyticsProductInfo(product),
    });
    const formData = new FormData();

    // Append product details and new instructions
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
      setOptimizedDescription(result.newDescription);
      setJustifications(result.justifications || '');
  setAdjustmentPrompt(''); // Clear the prompt
  // hide create form after a regeneration so user must confirm again
  setShowCreateForm(false);
  // show the question again when a new description was generated
  setShowCreateQuestion(true);
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

  const handleReturnToForm = () => {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name: optimizedTitle || prev.name,
        currentDescription: optimizedDescription || prev.currentDescription,
      };
    });

    if (productSource === 'manual') {
      if (optimizedTitle) {
        setManualTitle(optimizedTitle);
      }
      if (optimizedDescription) {
        setManualDescription(optimizedDescription);
      }
    }

    setStep('form');
  };

  const handlePublish = async () => {
    if (!product) return;

    setIsPublishing(true);
    // Track publish
    analytics.trackPublish({
      method: 'withoutReviews',
      language,
      product: getAnalyticsProductInfo(product),
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

  const handleCreateProduct = async () => {
    // Validate the Shopify-specific fields before creating
    const newErrors: Record<string, boolean> = {};
    if (!manualPrice.trim()) newErrors.manualPrice = true;
    if (!manualSku.trim()) newErrors.manualSku = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: t('toast.createMissingFieldsTitle'),
        description: t('toast.createMissingFieldsDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/product/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: optimizedTitle,
          descriptionHtml: optimizedDescription,
          price: parseFloat(manualPrice),
          sku: manualSku,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product on Shopify');
      }

      const data = await response.json();
      console.log(data); //for debugging purpose
      if (data?.result.onlineStorePreviewUrl) {
        setShopifyPreviewUrl(data.result.onlineStorePreviewUrl);
      }

      toast({
        title: t('toast.createSuccessTitle'),
        description: t('toast.createSuccessDesc')
      });
      // Consider creation as a 'publish' action too
      if (product) {
        analytics.trackPublish({
          method: 'withoutReviews',
          language,
          product: {
            ...getAnalyticsProductInfo(product),
            sku: manualSku || product.variants?.[0]?.sku || null,
          },
        });
      }
    } catch (error) {
      console.error('Error creating product on Shopify:', error);
      toast({
        title: t('toast.createFailedTitle'),
        description: t('toast.createFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
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
                <h1 className="text-3xl font-bold">{t('review.titleWithout')}</h1>
                <p className="text-muted-foreground mt-1">
                  {t('dashboard.withoutReviewsDesc')}
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
                  {productSource === 'shopify' && (
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
                  )}
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
                  {productSource === 'shopify' && (
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
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('review.optimizedDescription')}</Label>
                    <Textarea
                      value={optimizedDescription}
                      onChange={(e) => setOptimizedDescription(e.target.value)}
                      rows={10}
                      className="mt-2 resize-none max-h-[500px]"
                    />
                  </div>

                  {productSource === 'manual' && (
                    <>
                      {showCreateForm ? (
                        <div className="pt-4 border-t">
                          <CardTitle className="text-lg mb-4">Shopify Details</CardTitle>
                          <div className="grid grid-cols-2 gap-4">
                            <div id="manualPrice">
                              <Label>{t('review.manual.priceLabel')}</Label>
                              <Input
                                type="number"
                                value={manualPrice}
                                placeholder={t('review.manual.pricePlaceholder')}
                                onChange={(e) => {
                                  setManualPrice(e.target.value);
                                  setErrors({ ...errors, manualPrice: false });
                                }}
                                className={errors.manualPrice ? 'border-destructive' : ''}
                              />
                            </div>
                            <div id="manualSku">
                              <Label>{t('review.manual.skuLabel')}</Label>
                              <Input
                                value={manualSku}
                                placeholder={t('review.manual.skuPlaceholder')}
                                onChange={(e) => {
                                  setManualSku(e.target.value);
                                  setErrors({ ...errors, manualSku: false });
                                }}
                                className={errors.manualSku ? 'border-destructive' : ''}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        showCreateQuestion ? (
                          <Card className="mt-4">
                            <CardHeader>
                              <CardTitle className="text-lg">{t('review.createQuestion')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                              <Button onClick={() => {
                                setShowCreateForm(true);
                                setShowCreateQuestion(true);
                              }}>{t('review.yes')}</Button>
                              <Button variant="outline" onClick={() => {
                                setShowCreateForm(false);
                                setShowCreateQuestion(false);
                              }}>{t('review.no')}</Button>
                            </CardContent>
                          </Card>
                        ) : null
                      )}
                    </>
                  )}
                  
                  <div className="pt-4 border-t">
                    {productSource === 'shopify' ? (
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
                    ) : (
                      // For manual products only show the create button if the user confirmed they want to create
                      productSource === 'manual' && showCreateForm ? (
                        <Button 
                          onClick={handleCreateProduct}
                          className="w-full"
                          size="lg"
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('review.creating')}
                            </>
                          ) : (
                            t('review.create')
                          )}
                        </Button>
                      ) : null
                    )}
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
                      method: 'withoutReviews',
                      language,
                      product: getAnalyticsProductInfo(product),
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
            <h1 className="text-3xl font-bold">{t('review.titleWithout')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.withoutReviewsDesc')}
            </p>
          </div>

          {!productSource ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('review.sourceQuestion')}</CardTitle>
                <CardDescription>{t('review.sourceQuestionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={() => setProductSource('shopify')} className="w-full" size="lg">{t('review.sourceShopify')}</Button>
                <Button onClick={() => setProductSource('manual')} className="w-full" size="lg" variant="outline">{t('review.sourceManual')}</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-8">
                {productSource === 'shopify' && (
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
                )}

                {productSource === 'manual' && (
                  <>
                    <div id="manualTitle">
                      <Label>{t('review.productName')} *</Label>
                      <Input
                        value={manualTitle}
                        onChange={(e) => {
                          setManualTitle(e.target.value);
                          setErrors({ ...errors, manualTitle: false });
                        }}
                        placeholder={t('review.manual.titlePlaceholder')}
                        className={errors.manualTitle ? 'border-destructive' : ''}
                      />
                      {errors.manualTitle && (
                        <div className="flex items-center gap-2 mt-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm font-medium">{t('review.errorRequired')}</p>
                        </div>
                      )}
                    </div>
                    <div id="manualDescription">
                      <Label>{t('review.currentDescription')} *</Label>
                      <Textarea
                        value={manualDescription}
                        onChange={(e) => {
                          setManualDescription(e.target.value)
                          setErrors({ ...errors, manualDescription: false });
                        }}
                        placeholder={t('review.manual.descriptionPlaceholder')}
                        className={`min-h-[120px] ${errors.manualDescription ? 'border-destructive' : ''}`}
                      />
                      {errors.manualDescription && (
                        <div className="flex items-center gap-2 mt-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm font-medium">{t('review.errorRequired')}</p>
                        </div>
                      )}
                    </div>
                    <div id="manualCategory">
                      <Label>{t('review.category')}</Label>
                      <Input
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        placeholder={t('review.manual.categoryPlaceholder')}
                      />
                    </div>
                  </>
                )}
                
                <div id="userInstructions">
                  <CardHeader className="px-0">
                    <CardTitle>{t('review.keywordsTitle')} *</CardTitle>
                    <CardDescription>{t('review.keywordsDescWithout')}</CardDescription>
                  </CardHeader>
                  <Textarea
                    value={userInstructions}
                    onChange={(e) => {
                      setUserInstructions(e.target.value);
                      setErrors({ ...errors, userInstructions: false });
                    }}
                    placeholder={t('review.keywordsPlaceholder')}
                    className={`min-h-[120px] ${errors.userInstructions ? 'border-destructive' : ''}`}
                  />
                  {errors.userInstructions && (
                    <div className="flex items-center gap-2 mt-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm font-medium">{t('review.errorRequired')}</p>
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
                <div className="flex justify-between items-center">
                   <Button onClick={() => setProductSource(null)} variant="outline">{t('review.back')}</Button>
                  <p className="text-sm text-muted-foreground">{t('review.requiredFields')}</p>
                  <div className="flex gap-2">
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
              </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
