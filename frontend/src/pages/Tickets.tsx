import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ticketsApi,
  projectsApi,
  chatApi,
  TicketListItem,
  TicketDetail,
  ChatMessage,
  Report,
  Issue,
  Project,
  FeedbackType,
  TicketStatus,
  TicketPriority,
  getAccessToken,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import AnalysisQuestionsEditor from "@/components/AnalysisQuestionsEditor";
import { AnalysisQuestions, defaultAnalysisQuestions } from "@/lib/analysisQuestions";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Bug,
  MessageSquare,
  Lightbulb,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Globe,
  Settings,
  X,
  Maximize2,
  Send,
  Video,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  User,
  Calendar,
  Tag,
  Flag,
  Monitor,
  Bot,
  MessageCircle,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  defaultDropAnimation,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

// ─── Status column config ──────────────────────────────────────────────────
const STATUS_COLUMNS: { key: TicketStatus; label: string; dot: string }[] = [
  { key: "open", label: "Open", dot: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", dot: "bg-yellow-500" },
  { key: "in_qa", label: "In QA", dot: "bg-purple-500" },
  { key: "todo", label: "To Do", dot: "bg-orange-500" },
  { key: "backlog", label: "Backlog", dot: "bg-gray-400" },
  { key: "resolved", label: "Resolved", dot: "bg-green-500" },
];

// ─── Type → left‑border color ──────────────────────────────────────────────
const typeBorderColor: Record<FeedbackType, string> = {
  bug: "border-l-red-500",
  feedback: "border-l-blue-500",
  idea: "border-l-yellow-500",
};

const typeLabel: Record<FeedbackType, { icon: typeof Bug; text: string; cls: string }> = {
  bug: { icon: Bug, text: "Bug", cls: "text-red-500" },
  feedback: { icon: MessageSquare, text: "Feedback", cls: "text-blue-500" },
  idea: { icon: Lightbulb, text: "Idea", cls: "text-yellow-500" },
};

// ─── DnD wrappers (for board drag-and-drop) ─────────────────────────────────
function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "bg-primary/5 transition-colors" : ""}`}
      data-droppable={id}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  ticket,
  children,
  isActive,
  onOpenPanel,
}: {
  ticket: TicketListItem;
  children: React.ReactNode;
  isActive: boolean;
  onOpenPanel: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpenPanel}
      style={{ opacity: isDragging ? 0.2 : 1 }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

/** Card content used in DragOverlay so the dragged card follows the cursor. */
function CardPreview({ ticket }: { ticket: TicketListItem }) {
  const tl = typeLabel[ticket.feedback_type];
  const Icon = tl.icon;
  return (
    <div
      className={`rounded-lg border border-border bg-card p-3 shadow-lg border-l-[3px] min-w-[260px] cursor-grabbing ${
        typeBorderColor[ticket.feedback_type]
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-mono">{ticket.id.slice(0, 8)}</span>
        <span>·</span>
        <span className={`flex items-center gap-0.5 font-medium ${tl.cls}`}>
          <Icon className="h-3 w-3" />
          {tl.text}
        </span>
        <span className="ml-auto">{timeAgo(ticket.created_at)}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground line-clamp-2 leading-snug">
        {ticket.task_description || "Untitled feedback"}
      </p>
      {ticket.category && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {ticket.category}
          </Badge>
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatShortDate(ticket.created_at)}</span>
        </div>
        {ticket.issues_count > 0 && (
          <div className="flex items-center gap-0.5">
            <MessageCircle className="h-3 w-3" />
            <span>{ticket.issues_count}</span>
          </div>
        )}
        {ticket.ai_confidence != null && (
          <div className="flex items-center gap-0.5">
            <Zap className="h-3 w-3" />
            <span>{ticket.ai_confidence}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

const Tickets = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  // Selected project comes from URL: /tickets → all, /tickets/project/:projectId → that project (only fetch what we need)
  const selectedProjectId = urlProjectId ?? null;

  // ── Project state ───────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [newProjectRequireAuth, setNewProjectRequireAuth] = useState(false);
  const [newProjectActive, setNewProjectActive] = useState(true);
  const [newProjectQuestions, setNewProjectQuestions] = useState<AnalysisQuestions>(defaultAnalysisQuestions());
  const [isCreating, setIsCreating] = useState(false);

  // ── Tickets state ───────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FeedbackType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TicketPriority | "all">("all");

  // ── Panel state ─────────────────────────────────────────────────────────
  const [panelTicketId, setPanelTicketId] = useState<string | null>(null);
  const [panelExpandedIssueId, setPanelExpandedIssueId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Controls animation
  const [panelTicket, setPanelTicket] = useState<TicketDetail | null>(null);
  const [panelReport, setPanelReport] = useState<Report | null>(null);
  const [panelMessages, setPanelMessages] = useState<ChatMessage[]>([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelTab, setPanelTab] = useState<"details" | "comments" | "activity">("details");
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Delete state ────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  // ── Drag overlay (card follows cursor) ─────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // Data loading
  // ═══════════════════════════════════════════════════════════════════════

  // Load projects (no auto-select; project comes from URL)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.list();
        setProjects(data);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to load projects";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, [toast]);

  // Load tickets (all statuses at once for board view — large per_page)
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ticketsApi.list({
        project_id: selectedProjectId || undefined,
        feedback_type: filterType === "all" ? undefined : filterType,
        priority: filterPriority === "all" ? undefined : filterPriority,
        search: searchQuery || undefined,
        per_page: 200,
      });
      setTickets(data.items);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load tickets";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, filterType, filterPriority, searchQuery, toast]);

  useEffect(() => {
    if (!isLoadingProjects) loadTickets();
  }, [loadTickets, isLoadingProjects]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadTickets(), 300);
    return () => clearTimeout(t);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════════
  // Panel data
  // ═══════════════════════════════════════════════════════════════════════

  const openPanel = useCallback(
    async (ticketId: string) => {
      setPanelTicketId(ticketId);
      // Wait a tick for render, then trigger animation
      setTimeout(() => setIsPanelOpen(true), 10);
      
      setIsPanelLoading(true);
      setPanelTab("details");
      setPanelReport(null);
      setPanelMessages([]);
      setEditingMessageId(null);
      setNewComment("");
      try {
        const [ticketData, messagesData] = await Promise.all([
          ticketsApi.get(ticketId),
          chatApi.getMessages(ticketId).catch(() => []),
        ]);
        setPanelTicket(ticketData);
        setPanelMessages(messagesData);
        try {
          const report = await ticketsApi.getReport(ticketId);
          setPanelReport(report);
        } catch {
          // No report yet
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to load ticket";
        toast({ title: "Error", description: msg, variant: "destructive" });
        // Don't close immediately on error, user might retry
      } finally {
        setIsPanelLoading(false);
      }
    },
    [toast]
  );

  const closePanel = () => {
    setIsPanelOpen(false);
    setPanelExpandedIssueId(null);
    // Wait for animation to finish before removing data
    setTimeout(() => {
      setPanelTicketId(null);
      setPanelTicket(null);
    }, 300);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Panel actions
  // ═══════════════════════════════════════════════════════════════════════

  const handlePanelStatusChange = async (status: TicketStatus) => {
    if (!panelTicketId || !panelTicket) return;
    try {
      await ticketsApi.update(panelTicketId, { ticket_status: status });
      setPanelTicket((t) => (t ? { ...t, ticket_status: status } : t));
      // Update board list in‑place
      setTickets((prev) =>
        prev.map((t) => (t.id === panelTicketId ? { ...t, ticket_status: status } : t))
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update status";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handlePanelPriorityChange = async (priority: TicketPriority) => {
    if (!panelTicketId || !panelTicket) return;
    try {
      await ticketsApi.update(panelTicketId, { priority });
      setPanelTicket((t) => (t ? { ...t, priority } : t));
      setTickets((prev) =>
        prev.map((t) => (t.id === panelTicketId ? { ...t, priority } : t))
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update priority";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !panelTicketId) return;
    setIsSendingComment(true);
    try {
      const sent = await chatApi.sendMessage(panelTicketId, newComment.trim());
      setPanelMessages((m) => [...m, sent]);
      setNewComment("");
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleEditMessage = (id: string) => {
    const m = panelMessages.find((m) => m.id === id);
    if (m) {
      setEditingMessageId(id);
      setEditingText(m.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !panelTicketId) return;
    try {
      await chatApi.editMessage(panelTicketId, editingMessageId, editingText);
      setPanelMessages((msgs) =>
        msgs.map((m) =>
          m.id === editingMessageId
            ? { ...m, message: editingText, edited_at: new Date().toISOString() }
            : m
        )
      );
      setEditingMessageId(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to edit";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!panelTicketId) return;
    try {
      await chatApi.deleteMessage(panelTicketId, id);
      setPanelMessages((msgs) => msgs.filter((m) => m.id !== id));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    const loadVideo = async () => {
      if (!panelTicketId || !panelTicket?.video_url) {
        if (videoBlobUrl) {
          URL.revokeObjectURL(videoBlobUrl);
          setVideoBlobUrl(null);
        }
        return;
      }
      setIsLoadingVideo(true);
      try {
        const videoUrl = ticketsApi.getVideoUrl(panelTicketId);
        const token = getAccessToken();
        const resp = await fetch(videoUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) throw new Error("Failed to load video");
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        setVideoBlobUrl(blobUrl);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to load video";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoadingVideo(false);
      }
    };
    loadVideo();
    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [panelTicketId, panelTicket?.video_url]);

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Board actions
  // ═══════════════════════════════════════════════════════════════════════

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectDomain.trim()) return;
    setIsCreating(true);
    try {
      const created = await projectsApi.create({
        name: newProjectName.trim(),
        domain: newProjectDomain.trim(),
        require_auth: newProjectRequireAuth,
        is_active: newProjectActive,
        analysis_questions: newProjectQuestions,
      });
      toast({ title: "Project Created", description: `"${newProjectName}" has been created` });
      setProjects((p) => [...p, created]);
      navigate(`/tickets/project/${created.id}`);
      setCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDomain("");
      setNewProjectRequireAuth(false);
      setNewProjectActive(true);
      setNewProjectQuestions(defaultAnalysisQuestions());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create project";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      await ticketsApi.delete(ticketToDelete);
      toast({ title: "Ticket Deleted" });
      setDeleteDialogOpen(false);
      if (panelTicketId === ticketToDelete) closePanel();
      setTicketToDelete(null);
      loadTickets();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete ticket";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleBoardDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleBoardDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.ticket_status === newStatus) return;

    // Optimistic update: move card in UI immediately so it doesn't snap back to old column
    const previousStatus = ticket.ticket_status;
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, ticket_status: newStatus } : t))
    );
    if (panelTicketId === ticketId && panelTicket) {
      setPanelTicket((t) => (t ? { ...t, ticket_status: newStatus } : t));
    }

    try {
      await ticketsApi.update(ticketId, { ticket_status: newStatus });
    } catch (error: unknown) {
      // Revert on failure
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ticket_status: previousStatus } : t))
      );
      if (panelTicketId === ticketId && panelTicket) {
        setPanelTicket((t) => (t ? { ...t, ticket_status: previousStatus } : t));
      }
      const msg = error instanceof Error ? error.message : "Failed to update status";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const boardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════════════════

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Bucket tickets by status
  const buckets: Record<TicketStatus, TicketListItem[]> = {
    open: [],
    in_progress: [],
    in_qa: [],
    todo: [],
    backlog: [],
    resolved: [],
  };
  for (const t of tickets) {
    (buckets[t.ticket_status] ??= []).push(t);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════════════════════════════

  const getSeverityColor = (severity: string) => {
    switch ((severity || "").toLowerCase()) {
      case "critical":
      case "high":
        return "bg-red-500/15 text-red-600 dark:text-red-400";
      case "medium":
        return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
      case "low":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Loading state
  // ═══════════════════════════════════════════════════════════════════════

  if (isLoadingProjects) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Main render
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-screen flex-col overflow-hidden relative">
      <Header />
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Toolbar: project switcher + search + filters */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-3 gap-4">
          
          {/* LEFT: Project dropdown */}
          <div className="flex-1 flex justify-start min-w-[200px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2 px-2 py-1 shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground text-sm max-w-[160px] truncate">
                    {selectedProject ? selectedProject.name : "All Projects"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem onClick={() => navigate("/tickets")} className="gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">All Projects</span>
                  {!selectedProjectId && <Badge variant="secondary" className="text-xs">Active</Badge>}
                </DropdownMenuItem>
                {projects.length > 0 && <DropdownMenuSeparator />}
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => navigate(`/tickets/project/${p.id}`)} className="gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.domain && <p className="truncate text-xs text-muted-foreground">{p.domain}</p>}
                    </div>
                    {selectedProjectId === p.id && <Badge variant="secondary" className="text-xs">Active</Badge>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {selectedProject && (
                  <DropdownMenuItem onClick={() => navigate(`/projects/${selectedProject.id}`)} className="gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Project Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span>New Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* CENTER: Search + Filters */}
          <div className="flex items-center justify-center gap-3 flex-[2] min-w-fit">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 text-sm w-full"
              />
            </div>

            <Select value={filterType} onValueChange={(v) => setFilterType(v as FeedbackType | "all")}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bugs</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="idea">Ideas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TicketPriority | "all")}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* RIGHT: Spacer (to balance layout) */}
          <div className="flex-1 flex justify-end min-w-[200px]">
             {/* Could add a 'Create Ticket' or 'Export' button here later */}
          </div>
        </div>
      </div>

        {/* Board + Panel */}
        <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* ─── Board ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 && !searchQuery && !filterType && !filterPriority ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No tickets yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {projects.length === 0
                  ? "Create a project first to start receiving feedback"
                  : "Install the widget on your website to start receiving feedback"}
              </p>
              {projects.length === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={boardSensors}
              onDragStart={handleBoardDragStart}
              onDragEnd={handleBoardDragEnd}
            >
            <div className="flex h-full min-w-full">
              {STATUS_COLUMNS.map(({ key, label, dot }) => {
                const items = buckets[key] || [];
                return (
                  <DroppableColumn
                    key={key}
                    id={key}
                    className="flex-1 flex flex-col min-w-[280px] border-r border-border last:border-r-0 h-full"
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                      <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="text-sm font-semibold text-foreground">{label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 h-5 min-w-[20px] justify-center">
                        {items.length}
                      </Badge>
                    </div>

                    {/* Cards */}
                    <ScrollArea className="flex-1 px-3 py-3 w-full">
                      <div className="space-y-2.5">
                        {items.length === 0 ? (
                          <p className="py-8 text-center text-xs text-muted-foreground">
                            No tickets
                          </p>
                        ) : (
                          items.map((ticket) => {
                            const tl = typeLabel[ticket.feedback_type];
                            const Icon = tl.icon;
                            const isActive = panelTicketId === ticket.id;
                            return (
                              <DraggableCard
                                key={ticket.id}
                                ticket={ticket}
                                isActive={isActive}
                                onOpenPanel={() => openPanel(ticket.id)}
                              >
                              <div
                                className={`group relative rounded-lg border border-border bg-card p-3 transition-all hover:shadow-md border-l-[3px] ${
                                  typeBorderColor[ticket.feedback_type]
                                } ${isActive ? "ring-2 ring-primary/50 shadow-md" : ""}`}
                              >
                                {/* Top row: ID · Type · time */}
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{ticket.id.slice(0, 8)}</span>
                                  <span>·</span>
                                  <span className={`flex items-center gap-0.5 font-medium ${tl.cls}`}>
                                    <Icon className="h-3 w-3" />
                                    {tl.text}
                                  </span>
                                  <span className="ml-auto">{timeAgo(ticket.created_at)}</span>
                                </div>

                                {/* Title */}
                                <p className="mt-1.5 text-sm font-medium text-foreground line-clamp-2 leading-snug">
                                  {ticket.task_description || "Untitled feedback"}
                                </p>

                                {/* Tags */}
                                {ticket.category && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                      {ticket.category}
                                    </Badge>
                                  </div>
                                )}

                                {/* Bottom row: date · comments · assignee */}
                                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatShortDate(ticket.created_at)}</span>
                                  </div>
                                  {ticket.issues_count > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      <MessageCircle className="h-3 w-3" />
                                      <span>{ticket.issues_count}</span>
                                    </div>
                                  )}
                                {ticket.ai_confidence !== null && ticket.ai_confidence !== undefined && (
                                  <div className="flex items-center gap-0.5">
                                    <Zap className="h-3 w-3" />
                                    <span>{ticket.ai_confidence}%</span>
                                  </div>
                                )}
                                  <div className="ml-auto flex items-center gap-1.5">
                                    {/* Priority dot */}
                                    {ticket.priority === "urgent" && (
                                      <div className="h-2 w-2 rounded-full bg-red-500" title="Urgent" />
                                    )}
                                    {ticket.priority === "high" && (
                                      <div className="h-2 w-2 rounded-full bg-orange-500" title="High" />
                                    )}
                                    {/* Assignee */}
                                    {ticket.assignee_name ? (
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                          {ticket.assignee_name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/30" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              </DraggableCard>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </DroppableColumn>
                );
              })}
            </div>
            <DragOverlay dropAnimation={defaultDropAnimation}>
              {activeDragId ? (() => {
                const ticket = tickets.find((t) => t.id === activeDragId);
                return ticket ? <CardPreview ticket={ticket} /> : null;
              })() : null}
            </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* ─── Slide‑over detail panel ──────────────────────────────── */}
        {panelTicketId && (
          <div 
            className={`
              absolute top-0 right-0 bottom-0 bg-background border-l border-border shadow-2xl z-20 flex flex-col
              w-1/3 min-w-[400px] max-w-[800px]
              transition-transform duration-300 ease-in-out
              ${isPanelOpen ? "translate-x-0" : "translate-x-full"}
            `}
          >
            {isPanelLoading || !panelTicket ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Panel header */}
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/20">
                  <span className="text-xs font-mono text-muted-foreground">{panelTicketId.slice(0, 8)}</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigate(`/tickets/${panelTicketId}`)}
                    title="Open full page"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setTicketToDelete(panelTicketId);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete ticket"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closePanel}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Ticket title area */}
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const tl = typeLabel[panelTicket.feedback_type];
                      const Icon = tl.icon;
                      return (
                        <Badge variant="outline" className={`gap-1 ${tl.cls} border-current/30`}>
                          <Icon className="h-3 w-3" />
                          {tl.text}
                        </Badge>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">#{panelTicketId.slice(0, 8)}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-foreground leading-snug">
                    {panelTicket.feedback_type === "bug"
                      ? "Bug"
                      : panelTicket.feedback_type === "idea"
                      ? "Idea"
                      : "Feedback"}{" "}
                    #{panelTicketId.slice(0, 8)}
                  </h2>
                  {panelTicket.task_description && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {panelTicket.task_description}
                    </p>
                  )}
                </div>

                {/* Tabs */}
                <Tabs
                  value={panelTab}
                  onValueChange={(v) => setPanelTab(v as typeof panelTab)}
                  className="flex flex-1 flex-col overflow-hidden min-h-0"
                >
                  <TabsList className="mx-5 mb-0 w-auto justify-start rounded-none border-b border-border bg-transparent p-0 h-auto gap-6">
                    <TabsTrigger
                      value="details"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-sm"
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      value="comments"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-sm"
                    >
                      Comments
                      {panelMessages.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                          {panelMessages.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2 text-sm"
                    >
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Details tab ────────────────────────────────── */}
                  <TabsContent value="details" className="data-[state=active]:flex-1 overflow-y-auto m-0 p-0">
                    <div className="p-5 space-y-6">
                      {/* Video player */}
                      {panelTicket.video_url && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Video className="h-4 w-4" />
                            Screen Recording
                          </div>
                          {isLoadingVideo ? (
                            <div className="flex items-center justify-center h-64 bg-secondary rounded-lg">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : videoBlobUrl ? (
                            <video
                              src={videoBlobUrl}
                              controls
                              className="w-full rounded-lg bg-black"
                              style={{ maxHeight: "500px" }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-64 bg-secondary rounded-lg text-muted-foreground">
                              Video not available
                            </div>
                          )}
                        </div>
                      )}

                      {/* Properties grid */}
                      <div className="space-y-4">
                        {/* Status */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Tag className="h-4 w-4" /> Status
                          </span>
                          <Select
                            value={panelTicket.ticket_status}
                            onValueChange={(v) => handlePanelStatusChange(v as TicketStatus)}
                          >
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_COLUMNS.map((col) => (
                                <SelectItem key={col.key} value={col.key}>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${col.dot}`} />
                                    {col.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Priority */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Flag className="h-4 w-4" /> Priority
                          </span>
                          <Select
                            value={panelTicket.priority}
                            onValueChange={(v) => handlePanelPriorityChange(v as TicketPriority)}
                          >
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* AI Confidence */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap className="h-4 w-4" /> Confidence
                          </span>
                          <span className="text-sm text-foreground">
                            {panelTicket.ai_confidence !== null && panelTicket.ai_confidence !== undefined
                              ? `${panelTicket.ai_confidence}%`
                              : "—"}
                          </span>
                        </div>

                        {/* Assignee */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" /> Assignee
                          </span>
                          <div className="flex items-center gap-1.5">
                            {panelTicket.assignee_name ? (
                              <>
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                    {panelTicket.assignee_name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-foreground">{panelTicket.assignee_name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Unassigned</span>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        {panelTicket.category && (
                          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Tag className="h-4 w-4" /> Category
                            </span>
                            <Badge variant="outline" className="w-fit">{panelTicket.category}</Badge>
                          </div>
                        )}

                        {/* Due Date */}
                        {panelTicket.due_date && (
                          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" /> Due date
                            </span>
                            <span className="text-sm text-foreground">{formatDate(panelTicket.due_date)}</span>
                          </div>
                        )}

                        {/* Project */}
                        {panelTicket.project_name && (
                          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Globe className="h-4 w-4" /> Project
                            </span>
                            <span className="text-sm text-foreground">{panelTicket.project_name}</span>
                          </div>
                        )}

                        {/* Submitted by */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" /> Submitter
                          </span>
                          <span className="text-sm text-foreground">
                            {panelTicket.submitter_name || "Anonymous"}
                          </span>
                        </div>

                        {/* Created */}
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" /> Created
                          </span>
                          <span className="text-sm text-foreground">{formatDate(panelTicket.created_at)}</span>
                        </div>
                      </div>

                      {/* Page URL */}
                      {panelTicket.page_url && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page URL</span>
                            <a
                              href={panelTicket.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline break-all"
                            >
                              {panelTicket.page_url}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        </>
                      )}

                      {/* Metadata */}
                      {panelTicket.browser_info && Object.keys(panelTicket.browser_info).length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                              <Monitor className="h-4 w-4" /> Metadata
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(panelTicket.browser_info).map(([k, v]) => (
                                <div key={k} className="flex flex-col p-2 rounded-md bg-muted/40">
                                  <span className="text-[10px] text-muted-foreground capitalize mb-0.5">{k.replace(/_/g, " ")}</span>
                                  <span className="text-xs font-medium text-foreground truncate" title={String(v)}>{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* AI Report summary */}
                      {panelReport && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                              <Target className="h-4 w-4" /> AI Analysis
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {panelReport.executive_summary.confidence != null && (
                                <span className="text-xs text-muted-foreground">{panelReport.executive_summary.confidence}%</span>
                              )}
                              {panelReport.executive_summary.outcome && (
                                <Badge variant="secondary" className="text-[10px] font-normal">{panelReport.executive_summary.outcome}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">
                              {panelReport.executive_summary.overview}
                            </p>
                            {panelReport.issues.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Issues</h5>
                                <div className="space-y-2">
                                  {panelReport.issues.map((issue: Issue, i: number) => (
                                    <Collapsible
                                      key={issue.id || i}
                                      open={panelExpandedIssueId === (issue.id || String(i))}
                                      onOpenChange={(open) => setPanelExpandedIssueId(open ? (issue.id || String(i)) : null)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button
                                          type="button"
                                          className="w-full inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-secondary/50 hover:bg-secondary text-left focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${getSeverityColor(issue.severity)}`}>{issue.severity}</span>
                                          <span className="min-w-0 truncate text-foreground">{issue.title}</span>
                                          <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ml-auto ${panelExpandedIssueId === (issue.id || String(i)) ? "rotate-180" : ""}`} />
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="mt-1.5 rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
                                          {issue.observed_behavior && <p><strong className="text-foreground">Observed:</strong> <span className="text-muted-foreground">{issue.observed_behavior}</span></p>}
                                          {issue.expected_behavior && <p><strong className="text-foreground">Expected:</strong> <span className="text-muted-foreground">{issue.expected_behavior}</span></p>}
                                          {issue.evidence?.length > 0 && <p><strong className="text-foreground">Evidence:</strong> <span className="text-muted-foreground">{issue.evidence.map((e: { description?: string | null; value?: string }) => e.description || e.value).filter(Boolean).join("; ")}</span></p>}
                                          {issue.impact?.length > 0 && <p><strong className="text-foreground">Impact:</strong> <span className="text-muted-foreground">{issue.impact.join("; ")}</span></p>}
                                          {issue.reproduction_steps?.length > 0 && (
                                            <div><strong className="text-foreground">Reproduction:</strong>
                                              <ol className="ml-3 list-decimal mt-0.5 text-muted-foreground">{issue.reproduction_steps.map((step: string, si: number) => <li key={si}>{step}</li>)}</ol>
                                            </div>
                                          )}
                                          {issue.tags?.length > 0 && <p><strong className="text-foreground">Tags:</strong> <span className="text-muted-foreground">{issue.tags.join(", ")}</span></p>}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(panelReport.suggested_actions) && panelReport.suggested_actions.length > 0 && (
                              <div className="mt-4 space-y-1.5">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <Lightbulb className="h-3 w-3" /> Suggested Actions
                                </h5>
                                <ul className="space-y-1 text-xs text-foreground">
                                  {panelReport.suggested_actions.map((action: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-success" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {Array.isArray(panelReport.possible_solutions) && panelReport.possible_solutions.length > 0 && (
                              <div className="mt-4 space-y-1.5">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> Possible Solutions
                                </h5>
                                <ul className="space-y-1 text-xs text-foreground">
                                  {panelReport.possible_solutions.map((solution: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-success" />
                                      <span>{solution}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Comments tab ───────────────────────────────── */}
                  <TabsContent value="comments" className="data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col overflow-hidden m-0 p-0">
                    <ScrollArea className="flex-1 px-4 py-3">
                      <div className="space-y-4">
                        {panelMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No comments yet.<br/>Start a conversation with your team.
                            </p>
                          </div>
                        ) : (
                          panelMessages.map((msg) => (
                            <div key={msg.id} className="flex gap-2.5 group">
                              <Avatar
                                className={`h-7 w-7 shrink-0 ${
                                  msg.sender_type === "system"
                                    ? "bg-primary"
                                    : msg.sender_type === "team"
                                    ? "bg-blue-500"
                                    : "bg-muted"
                                }`}
                              >
                                <AvatarFallback className="text-[10px] text-white">
                                  {msg.sender_type === "system" ? (
                                    <Bot className="h-3.5 w-3.5" />
                                  ) : (
                                    msg.sender_name.charAt(0)
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-foreground">
                                    {msg.sender_type === "system"
                                      ? "Ortrace"
                                      : msg.sender_type === "user"
                                      ? `${msg.sender_name} (Customer)`
                                      : msg.sender_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatTime(msg.sent_at)}
                                    {msg.edited_at && " (edited)"}
                                  </span>
                                </div>
                                {editingMessageId === msg.id ? (
                                  <div className="mt-1 space-y-1.5">
                                    <Textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="text-sm min-h-[60px]"
                                    />
                                    <div className="flex gap-1.5">
                                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>
                                        <Check className="h-3 w-3 mr-0.5" /> Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => setEditingMessageId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <p
                                      className={`mt-0.5 text-sm leading-relaxed ${
                                        msg.sender_type === "system"
                                          ? "italic text-muted-foreground bg-secondary/50 rounded-md p-2"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {msg.message}
                                    </p>
                                    
                                    {msg.is_own && !editingMessageId && msg.sender_type !== "system" && (
                                      <div className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-background shadow-sm rounded-md border border-border">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleEditMessage(msg.id)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive"
                                          onClick={() => handleDeleteMessage(msg.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={commentEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Comment input */}
                    <div className="border-t border-border p-3 flex gap-2 bg-background">
                      <Textarea
                        ref={commentInputRef}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleCommentKeyDown}
                        className="min-h-[36px] max-h-[100px] resize-none text-sm"
                        disabled={isSendingComment}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={handleSendComment}
                        disabled={isSendingComment || !newComment.trim()}
                      >
                        {isSendingComment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ── Activity tab (placeholder) ─────────────────── */}
                  <TabsContent value="activity" className="data-[state=active]:flex-1 overflow-y-auto m-0 p-0">
                    <div className="p-5 space-y-4">
                      {/* Simple timeline from ticket metadata */}
                      <div className="relative border-l border-border ml-2 space-y-6 pl-4 py-2">
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-4 ring-background" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Ticket created</p>
                            <p className="text-xs text-muted-foreground">{formatTime(panelTicket.created_at)}</p>
                          </div>
                        </div>
                        {panelTicket.video_url && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Screen recording attached</p>
                              <p className="text-xs text-muted-foreground">
                                {panelTicket.duration_seconds
                                  ? `${Math.floor(panelTicket.duration_seconds / 60)}m ${panelTicket.duration_seconds % 60}s`
                                  : "Duration unknown"}
                              </p>
                            </div>
                          </div>
                        )}
                        {panelReport && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-500 ring-4 ring-background" />
                            <div>
                              <p className="text-sm font-medium text-foreground">AI analysis completed</p>
                              <p className="text-xs text-muted-foreground">
                                {panelReport.issues.length} issue{panelReport.issues.length !== 1 ? "s" : ""} found
                              </p>
                            </div>
                          </div>
                        )}
                        {panelMessages.length > 0 && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500 ring-4 ring-background" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {panelMessages.length} comment{panelMessages.length !== 1 ? "s" : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Latest: {formatTime(panelMessages[panelMessages.length - 1].sent_at)}
                              </p>
                            </div>
                          </div>
                        )}
                        {panelTicket.ticket_status === "resolved" && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-4 ring-background" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Ticket resolved</p>
                              <p className="text-xs text-muted-foreground">{formatTime(panelTicket.updated_at)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ═══ Dialogs ═══ */}

      {/* Create Project */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 top-[5vh] translate-y-0">
          <DialogHeader className="px-6 pt-6 shrink-0">
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Add a new website to collect feedback on</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-5 py-4 pr-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="My Website"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Domain <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="example.com"
                value={newProjectDomain}
                onChange={(e) => setNewProjectDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The website domain where the feedback widget will be installed
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Require User Authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, users are assumed to be logged into your app. The widget won't ask for name or email — identity is inferred from their session.
                </p>
              </div>
              <Switch checked={newProjectRequireAuth} onCheckedChange={setNewProjectRequireAuth} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Disable to pause feedback collection for this project
                </p>
              </div>
              <Switch checked={newProjectActive} onCheckedChange={setNewProjectActive} />
            </div>
            <AnalysisQuestionsEditor value={newProjectQuestions} onChange={setNewProjectQuestions} />
          </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 bg-background">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || !newProjectDomain.trim() || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ticket */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTicket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tickets;
