import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Eye, X } from "lucide-react";
import { templatePreviews } from "@/lib/emailTemplates";

export function EmailTemplatesTab() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const activePreview = templatePreviews.find((t) => t.id === previewId);

  return (
    <div className="hq-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold font-heading">Templates de Email</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Preview dos templates de email enviados automaticamente pelo sistema. Os templates utilizam automaticamente as definições de branding configuradas na tab "Email & Branding".
      </p>

      <div className="grid gap-3">
        {templatePreviews.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
              className="ml-4 shrink-0"
            >
              <Eye className="mr-2 h-3 w-3" />
              {previewId === template.id ? "Fechar" : "Preview"}
            </Button>
          </div>
        ))}
      </div>

      {activePreview && (
        <div className="mt-6 border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-muted px-4 py-2">
            <span className="text-sm font-medium">Preview: {activePreview.name}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewId(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="bg-white">
            <iframe
              srcDoc={activePreview.html}
              title={`Preview ${activePreview.name}`}
              className="w-full border-0"
              style={{ height: "600px" }}
              sandbox=""
            />
          </div>
        </div>
      )}
    </div>
  );
}
