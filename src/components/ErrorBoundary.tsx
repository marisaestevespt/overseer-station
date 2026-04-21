import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Algo correu mal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Ocorreu um erro inesperado. Tenta recarregar a página.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground text-center font-mono bg-muted p-2 rounded">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Recarregar página
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")} className="w-full">
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
