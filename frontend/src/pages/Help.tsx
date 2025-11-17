import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Help() {
  const { t } = useLanguage();

  const faqs = [
    { question: t('help.faq1.question'), answer: t('help.faq1.answer') },
    { question: t('help.faq2.question'), answer: t('help.faq2.answer') },
    { question: t('help.faq3.question'), answer: t('help.faq3.answer') },
    { question: t('help.faq4.question'), answer: t('help.faq4.answer') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{t('help.title')}</h1>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('help.contact.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('help.contact.desc')}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
