import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, ExternalLink, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

interface Props {
  instance: Instance;
  subscription: Subscription | null;
  creating: boolean;
  cancelling: boolean;
  onCreate: () => void;
  onCancel: () => void;
  onUpdateStatus: (status: Database["public"]["Enums"]["instance_status"]) => void;
  onUpdateBillingDate: (date: Date) => void;
}

export function InstanceSubscriptionCard({
  instance,
  subscription,
  creating,
  cancelling,
  onCreate,
  onCancel,
  onUpdateStatus,
  onUpdateBillingDate,
}: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const stripeCustomerUrl = subscription?.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${subscription.stripe_customer_id}`
    : null;

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-3 font-heading">Subscrição Stripe</h2>
      {subscription ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={subscription.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Valor mensal</span>
            <span className="text-sm">€{Number(subscription.monthly_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Próxima renovação</span>
            <span className="text-sm">
              {subscription.current_period_end
                ? format(new Date(subscription.current_period_end), "dd/MM/yyyy")
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Plano</span>
            <span className="text-sm">{subscription.plan}</span>
          </div>
          {subscription.billing_start_date && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cobrança começa em</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {format(new Date(subscription.billing_start_date), "dd/MM/yyyy")}
                </span>
                {!subscription.stripe_subscription_id && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={new Date(subscription.billing_start_date)}
                        onSelect={(date) => date && onUpdateBillingDate(date)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}
          {subscription.stripe_subscription_id && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Stripe ID</span>
              <span className="text-sm font-mono text-xs">{subscription.stripe_subscription_id}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sem subscrição associada</p>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {!subscription || (subscription.status as string) === "cancelled" ? (
          <Button size="sm" onClick={onCreate} disabled={creating}>
            <CreditCard className="mr-2 h-3 w-3" />
            {creating ? "A criar..." : "Criar Subscrição Stripe"}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
            >
              <X className="mr-2 h-3 w-3" />
              {cancelling ? "A cancelar..." : "Cancelar Subscrição"}
            </Button>
            {stripeCustomerUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={stripeCustomerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Ver no Stripe
                </a>
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 mt-4 border-t border-border/50 pt-4">
        {instance.status === "active" && (
          <Button variant="outline" size="sm" onClick={() => onUpdateStatus("suspended")}>
            Suspender
          </Button>
        )}
        {instance.status === "suspended" && (
          <Button size="sm" onClick={() => onUpdateStatus("active")}>
            Reactivar
          </Button>
        )}
        {instance.status === "setup" && (
          <Button size="sm" onClick={() => onUpdateStatus("active")}>
            Activar
          </Button>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar subscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              A subscrição Stripe de <strong>{instance.business_name}</strong> será cancelada
              imediatamente. Esta ação não pode ser revertida — terás de criar uma nova
              subscrição se o cliente voltar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmCancel(false);
                onCancel();
              }}
            >
              Cancelar subscrição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
