import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Privacy() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            {language === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
          </h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fr' ? 'Collecte de données' : 'Data Collection'}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  {language === 'fr'
                    ? "Nous collectons uniquement les données nécessaires pour fournir nos services d'optimisation de fiches-produits. Cela inclut les avis clients que vous importez et les descriptions générées."
                    : 'We only collect data necessary to provide our product description optimization services. This includes customer reviews you import and generated descriptions.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fr' ? 'Utilisation des données' : 'Data Usage'}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  {language === 'fr'
                    ? "Vos données sont utilisées exclusivement pour générer des descriptions optimisées et améliorer notre modèle d'IA. Nous ne partageons jamais vos données avec des tiers sans votre consentement explicite."
                    : 'Your data is used exclusively to generate optimized descriptions and improve our AI model. We never share your data with third parties without your explicit consent.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fr' ? 'Sécurité' : 'Security'}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  {language === 'fr'
                    ? 'Nous utilisons des mesures de sécurité standards de l\'industrie pour protéger vos données, incluant le chiffrement et des contrôles d\'accès stricts.'
                    : 'We use industry-standard security measures to protect your data, including encryption and strict access controls.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fr' ? 'Vos droits' : 'Your Rights'}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  {language === 'fr'
                    ? 'Vous avez le droit d\'accéder, de modifier ou de supprimer vos données à tout moment. Contactez-nous à privacy@exemple.com pour exercer vos droits.'
                    : 'You have the right to access, modify, or delete your data at any time. Contact us at privacy@example.com to exercise your rights.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
