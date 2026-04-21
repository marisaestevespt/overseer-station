import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSettings } from "@/hooks/queries/useAdminSettings";
import { CardSkeleton } from "@/components/CardSkeleton";
import { GeneralTab } from "./settings/GeneralTab";
import { EmailBrandingTab } from "./settings/EmailBrandingTab";
import { EmailTemplatesTab } from "./settings/EmailTemplatesTab";

export default function SettingsPage() {
  const { isLoading } = useAdminSettings();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-heading tracking-tight">Definições</h1>
        <CardSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading tracking-tight">Definições</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="email">Email & Branding</TabsTrigger>
          <TabsTrigger value="templates">Templates de Email</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="email">
          <EmailBrandingTab />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
