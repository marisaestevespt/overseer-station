import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Image as ImageIcon, Building2, Phone, Clock, Globe,
  Instagram, Linkedin, Facebook, Twitter, Save,
} from "lucide-react";
import {
  useEmailSettings,
  useSaveEmailSettings,
  defaultEmailSettings,
  type EmailSettings,
} from "@/hooks/queries/useEmailSettings";

export function EmailBrandingTab() {
  const { toast } = useToast();
  const { data: emailRemote } = useEmailSettings();
  const saveEmail = useSaveEmailSettings();
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailRemote) setEmailSettings(emailRemote);
  }, [emailRemote]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Por favor seleciona um ficheiro de imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "O ficheiro deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const filePath = `logo.${ext}`;

    await supabase.storage.from("email-assets").remove([filePath]);

    const { error: uploadError } = await supabase.storage
      .from("email-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro", description: uploadError.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("email-assets").getPublicUrl(filePath);
    setEmailSettings((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setUploadingLogo(false);
    toast({ title: "Logo carregado", description: "Não te esqueças de guardar as definições." });
  };

  const updateField = (field: keyof EmailSettings, value: string) =>
    setEmailSettings((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Logo</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-card/50 overflow-hidden">
            {emailSettings.logo_url ? (
              <img src={emailSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
              <Upload className="mr-2 h-3 w-3" />
              {uploadingLogo ? "A carregar..." : "Carregar logo"}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx. 2MB.</p>
          </div>
        </div>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Informações do Negócio</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Nome do negócio *</Label>
            <Input value={emailSettings.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="Lirah" />
          </div>
          <div className="space-y-2">
            <Label>Email de contacto *</Label>
            <Input type="email" value={emailSettings.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} placeholder="suporte@lirah.pt" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
            <Input value={emailSettings.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="+351 xxx xxx xxx" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Horário de atendimento</Label>
            <Input value={emailSettings.business_hours ?? ""} onChange={(e) => updateField("business_hours", e.target.value)} placeholder="Seg-Sex, 9h-18h" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Morada</Label>
            <Input value={emailSettings.address ?? ""} onChange={(e) => updateField("address", e.target.value)} placeholder="Rua..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website</Label>
            <Input value={emailSettings.website ?? ""} onChange={(e) => updateField("website", e.target.value)} placeholder="https://lirah.pt" />
          </div>
        </div>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Redes Sociais</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
            <Input value={emailSettings.instagram_url ?? ""} onChange={(e) => updateField("instagram_url", e.target.value)} placeholder="https://instagram.com/..." />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
            <Input value={emailSettings.linkedin_url ?? ""} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</Label>
            <Input value={emailSettings.facebook_url ?? ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Twitter className="h-3 w-3" /> X (Twitter)</Label>
            <Input value={emailSettings.twitter_url ?? ""} onChange={(e) => updateField("twitter_url", e.target.value)} placeholder="https://x.com/..." />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveEmail.mutate(emailSettings)} disabled={saveEmail.isPending} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saveEmail.isPending ? "A guardar..." : "Guardar Definições de Email"}
        </Button>
      </div>
    </div>
  );
}
