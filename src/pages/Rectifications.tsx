import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, Plus, Search, Trash2, Pencil, Paperclip, Upload, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import {
  Rectification,
  RectificationInsert,
  useCreateRectification,
  useDeleteRectification,
  useRectifications,
  useUpdateRectification,
} from "@/hooks/queries/useRectifications";
import { useInstances } from "@/hooks/queries/useInstances";
import { useUserRole } from "@/hooks/useUserRole";

const PAGE_SIZE = 15;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  on_hold: "Em espera",
  completed: "Concluído",
  rejected: "Rejeitado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "default",
  on_hold: "outline",
  completed: "default",
  rejected: "destructive",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_CLASS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-destructive/15 text-destructive",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Nova funcionalidade",
  data_fix: "Correção de dados",
  config: "Configuração",
  other: "Outro",
};

type Attachment = {
  path: string;
  name: string;
  size: number;
  type: string;
};

type FormState = {
  id?: string;
  client_name: string;
  client_email: string;
  instance_id: string;
  title: string;
  detail: string;
  type: Rectification["type"];
  priority: Rectification["priority"];
  status: Rectification["status"];
  due_date: string;
  resolution_notes: string;
  attachments: Attachment[];
  newFiles: File[];
};

const emptyForm: FormState = {
  client_name: "",
  client_email: "",
  instance_id: "",
  title: "",
  detail: "",
  type: "other",
  priority: "medium",
  status: "pending",
  due_date: "",
  resolution_notes: "",
  attachments: [],
  newFiles: [],
};

const BUCKET = "rectification-attachments";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function Rectifications() {
  const { data: rows = [], isLoading } = useRectifications();
  const { data: instances = [] } = useInstances();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const canEdit = isSuperAdmin || isAdmin;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMut = useCreateRectification();
  const updateMut = useUpdateRectification();
  const deleteMut = useDeleteRectification();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.client_name.toLowerCase().includes(s) ||
          r.title.toLowerCase().includes(s) ||
          (r.client_email ?? "").toLowerCase().includes(s) ||
          (r.instances?.business_name ?? "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, search, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(r: Rectification) {
    setForm({
      id: r.id,
      client_name: r.client_name,
      client_email: r.client_email ?? "",
      instance_id: r.instance_id ?? "",
      title: r.title,
      detail: r.detail,
      type: r.type,
      priority: r.priority,
      status: r.status,
      due_date: r.due_date ? r.due_date.slice(0, 10) : "",
      resolution_notes: r.resolution_notes ?? "",
      attachments: Array.isArray(r.attachments) ? (r.attachments as unknown as Attachment[]) : [],
      newFiles: [],
    });
    setDialogOpen(true);
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const maxBytes = 15 * 1024 * 1024;
    const valid = arr.filter((f) => {
      if (f.size > maxBytes) {
        toast({
          title: "Ficheiro demasiado grande",
          description: `${f.name} excede 15 MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    setForm((f) => ({ ...f, newFiles: [...f.newFiles, ...valid] }));
  }

  async function downloadAttachment(att: Attachment) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(att.path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar link", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleSubmit() {
    if (!form.client_name.trim() || !form.title.trim() || !form.detail.trim()) {
      return;
    }
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of form.newFiles) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        uploaded.push({
          path,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        });
      }
      const attachments = [...form.attachments, ...uploaded];

      const payload: RectificationInsert = {
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim() || null,
        instance_id: form.instance_id || null,
        title: form.title.trim(),
        detail: form.detail.trim(),
        type: form.type,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        resolution_notes: form.resolution_notes.trim() || null,
        attachments: attachments as unknown as RectificationInsert["attachments"],
      };
      if (form.id) {
        await updateMut.mutateAsync({ id: form.id, patch: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (e) {
      toast({
        title: "Erro ao guardar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Pedidos e Retificações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos e retificações ao sistema Lyrata® feitos pelos clientes.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo pedido
          </Button>
        )}
      </div>

      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por cliente, instância ou título..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => {
              setPriorityFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Sem pedidos"
            description={
              rows.length === 0
                ? "Ainda não existem pedidos de retificação registados."
                : "Nenhum pedido corresponde aos filtros aplicados."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Instância</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data do pedido</TableHead>
                  <TableHead>Prazo</TableHead>
                  {canEdit && <TableHead className="text-right">Acções</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/30">
                    <TableCell>
                      <div className="font-medium">{r.client_name}</div>
                      {r.client_email && (
                        <div className="text-xs text-muted-foreground">{r.client_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.instances?.business_name || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.detail}</div>
                    </TableCell>
                    <TableCell className="text-xs">{TYPE_LABELS[r.type]}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASS[r.priority]}`}
                      >
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.requested_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.due_date ? format(new Date(r.due_date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar pedido" : "Novo pedido"}</DialogTitle>
            <DialogDescription>
              Detalhes do pedido ou retificação ao sistema Lyrata®.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do cliente *</Label>
              <Input
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email do cliente</Label>
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instância</Label>
              <Select
                value={form.instance_id || "none"}
                onValueChange={(v) => setForm({ ...form, instance_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar instância" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {instances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Resumo do pedido"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Detalhe *</Label>
              <Textarea
                rows={4}
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                placeholder="Descrição completa do pedido/retificação"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as Rectification["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as Rectification["priority"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Rectification["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notas de resolução</Label>
              <Textarea
                rows={3}
                value={form.resolution_notes}
                onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })}
                placeholder="Notas internas sobre a resolução (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMut.isPending ||
                updateMut.isPending ||
                !form.client_name.trim() ||
                !form.title.trim() ||
                !form.detail.trim()
              }
            >
              {form.id ? "Guardar alterações" : "Criar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser revertida. O pedido será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) {
                  await deleteMut.mutateAsync(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
