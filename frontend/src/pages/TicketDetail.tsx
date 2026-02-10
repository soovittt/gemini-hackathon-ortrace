import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketsApi, chatApi, Report, Issue, QuestionAnalysis, ChatMessage, TicketDetail as TicketDetailType, TicketStatus, TicketPriority, getAccessToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ChevronDown,
  Lightbulb,
  MessageCircle,
  Send,
  Video,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  Loader2,
  Bot,
  Bug,
  User,
  Calendar,
  Tag,
  Flag,
  Globe,
  Monitor,
  Zap,
} from "lucide-react";

const TicketDetail = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [reportData, setReportData] = useState<Report | null>(null);
  const [questionsOpen, setQuestionsOpen] = useState<Record<number, boolean>>({});
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load ticket, report, and messages
  useEffect(() => {
    const loadData = async () => {
      if (!ticketId) return;
      try {
        const [ticketData, messagesData] = await Promise.all([
          ticketsApi.get(ticketId),
          chatApi.getMessages(ticketId).catch(() => []),
        ]);

        setTicket(ticketData);
        setMessages(messagesData);

        // Try loading report (may not exist yet)
        try {
          const report = await ticketsApi.getReport(ticketId);
          setReportData(report);
        } catch {
          // Report not ready yet (e.g. 404)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load ticket";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [ticketId, toast]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticketId) return;
    setIsSending(true);
    try {
      const sentMessage = await chatApi.sendMessage(ticketId, newMessage.trim());
      setMessages([...messages, sentMessage]);
      setNewMessage("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingText(message.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !ticketId) return;
    try {
      await chatApi.editMessage(ticketId, editingMessageId, editingText);
      setMessages(
        messages.map((m) =>
          m.id === editingMessageId
            ? { ...m, message: editingText, edited_at: new Date().toISOString() }
            : m
        )
      );
      setEditingMessageId(null);
      setEditingText("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to edit message";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!ticketId) return;
    try {
      await chatApi.deleteMessage(ticketId, messageId);
      setMessages(messages.filter((m) => m.id !== messageId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete message";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  useEffect(() => {
    const loadVideo = async () => {
      if (!ticketId || !ticket?.video_url) {
        if (videoBlobUrl) {
          URL.revokeObjectURL(videoBlobUrl);
          setVideoBlobUrl(null);
        }
        return;
      }
      setIsLoadingVideo(true);
      try {
        const videoUrl = ticketsApi.getVideoUrl(ticketId);
        const token = getAccessToken();
        const response = await fetch(videoUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load video");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        setVideoBlobUrl(blobUrl);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load video";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
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
  }, [ticketId, ticket?.video_url]);

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticketId) return;
    try {
      await ticketsApi.update(ticketId, { ticket_status: status });
      setTicket((prev) => (prev ? { ...prev, ticket_status: status } : prev));
      toast({ title: "Status Updated", description: `Ticket status changed to ${status.replace("_", " ")}` });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update status";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    if (!ticketId) return;
    try {
      await ticketsApi.update(ticketId, { priority });
      setTicket((prev) => (prev ? { ...prev, priority } : prev));
      toast({ title: "Priority Updated" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update priority";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "success":
        return "bg-success/10 text-success border-success/30";
      case "partial":
        return "bg-warning/10 text-warning border-warning/30";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">Ticket Not Found</h1>
          <Button onClick={() => navigate("/tickets")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate("/tickets")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>

          {/* Ticket Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {ticket.feedback_type === "bug" ? "Bug" : ticket.feedback_type === "idea" ? "Idea" : "Feedback"} #{ticketId?.slice(0, 8)}
                </h1>
                <Badge
                  className={
                    ticket.feedback_type === "bug"
                      ? "border-destructive/50 text-destructive"
                      : ticket.feedback_type === "idea"
                      ? "border-yellow-500/50 text-yellow-500"
                      : "border-primary/50 text-primary"
                  }
                  variant="outline"
                >
                  {ticket.feedback_type === "bug" && <Bug className="mr-1 h-3 w-3" />}
                  {ticket.feedback_type === "idea" && <Lightbulb className="mr-1 h-3 w-3" />}
                  {ticket.feedback_type === "feedback" && <MessageCircle className="mr-1 h-3 w-3" />}
                  {ticket.feedback_type}
                </Badge>
              </div>
              <p className="mt-2 text-foreground">
                {ticket.task_description || "No description provided"}
              </p>
            </div>

          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content (2/3) */}
            <div className="space-y-6 lg:col-span-2">
              {/* Video player */}
              {ticket.video_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Screen Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Comments / Chat Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Comments ({messages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-6">
                          No comments yet. Start a conversation!
                        </p>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar
                              className={`h-8 w-8 ${
                                message.sender_type === "system"
                                  ? "bg-primary"
                                  : message.sender_type === "team"
                                  ? "bg-blue-500"
                                  : "bg-muted"
                              }`}
                            >
                              <AvatarFallback className="text-xs text-white">
                                {message.sender_type === "system" ? (
                                  <Bot className="h-4 w-4" />
                                ) : (
                                  message.sender_name.charAt(0)
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {message.sender_type === "system"
                                    ? "Ortrace"
                                    : message.sender_type === "user"
                                    ? `${message.sender_name} (Customer)`
                                    : message.sender_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.sent_at)}
                                  {message.edited_at && " (edited)"}
                                </span>
                              </div>
                              {editingMessageId === message.id ? (
                                <div className="mt-1 space-y-2">
                                  <Textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveEdit}>
                                      <Check className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  className={`mt-1 text-sm ${
                                    message.sender_type === "system"
                                      ? "text-muted-foreground italic bg-secondary/50 rounded-lg p-3"
                                      : "text-foreground"
                                  }`}
                                >
                                  {message.message}
                                </p>
                              )}
                              {message.is_own && !editingMessageId && message.sender_type !== "system" && (
                                <div className="mt-1 flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditMessage(message.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <Separator />

                  {/* New message input */}
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Add a comment..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[40px] resize-none"
                      disabled={isSending}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis Report */}
              {reportData && (
                <>
                  {/* Executive Summary: overview + small labels for confidence & outcome */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {reportData.executive_summary.confidence != null && (
                          <span>{reportData.executive_summary.confidence}%</span>
                        )}
                        {reportData.executive_summary.outcome && (
                          <Badge className={getOutcomeColor(reportData.executive_summary.outcome)} variant="secondary">
                            {reportData.executive_summary.outcome}
                          </Badge>
                        )}
                      </div>
                      <p className="text-foreground leading-relaxed">{reportData.executive_summary.overview}</p>
                      {reportData.issues.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-sm font-semibold text-foreground">Top Issues</h4>
                          <div className="space-y-2">
                            {reportData.issues.map((issue: Issue, index: number) => (
                              <Collapsible
                                key={issue.id || index}
                                open={expandedIssueId === (issue.id || String(index))}
                                onOpenChange={(open) => setExpandedIssueId(open ? (issue.id || String(index)) : null)}
                              >
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-full flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border border-border bg-secondary/50 hover:bg-secondary text-left focus:outline-none focus:ring-2 focus:ring-ring"
                                  >
                                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${getSeverityColor(issue.severity)}`}>{issue.severity}</span>
                                    <span className="min-w-0 truncate text-foreground">{issue.title}</span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ml-auto ${expandedIssueId === (issue.id || String(index)) ? "rotate-180" : ""}`} />
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-3">
                                    {issue.observed_behavior && <p><strong className="text-foreground">Observed:</strong> <span className="text-muted-foreground">{issue.observed_behavior}</span></p>}
                                    {issue.expected_behavior && <p><strong className="text-foreground">Expected:</strong> <span className="text-muted-foreground">{issue.expected_behavior}</span></p>}
                                    {issue.evidence?.length > 0 && <p><strong className="text-foreground">Evidence:</strong> <span className="text-muted-foreground">{issue.evidence.map((e) => e.description || e.value).filter(Boolean).join("; ")}</span></p>}
                                    {issue.impact?.length > 0 && <p><strong className="text-foreground">Impact:</strong> <span className="text-muted-foreground">{issue.impact.join("; ")}</span></p>}
                                    {issue.reproduction_steps?.length > 0 && (
                                      <div><strong className="text-foreground">Reproduction steps:</strong>
                                        <ol className="ml-4 mt-1 list-decimal text-muted-foreground">{issue.reproduction_steps.map((step: string, i: number) => <li key={i}>{step}</li>)}</ol>
                                      </div>
                                    )}
                                    {issue.tags?.length > 0 && <p><strong className="text-foreground">Tags:</strong> <span className="text-muted-foreground">{issue.tags.join(", ")}</span></p>}
                                    {issue.external_ticket_url && (
                                      <Button variant="ghost" size="sm" asChild>
                                        <a href={issue.external_ticket_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                          <ExternalLink className="h-4 w-4" /> Open linked ticket
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Suggested Actions — right after summary so it's visible */}
                  {Array.isArray(reportData.suggested_actions) && reportData.suggested_actions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5" />
                          Suggested Actions
                        </CardTitle>
                        <CardDescription>Recommended next steps from the AI</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {reportData.suggested_actions.map((action: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Possible Solutions */}
                  {Array.isArray(reportData.possible_solutions) && reportData.possible_solutions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Possible Solutions
                        </CardTitle>
                        <CardDescription>Concrete solutions to address the issues</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {reportData.possible_solutions.map((solution: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-lg bg-secondary/50 p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{reportData.metrics.task_completion_rate}%</div>
                          <div className="text-sm text-muted-foreground">Task Completion</div>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{reportData.metrics.total_hesitation_time}s</div>
                          <div className="text-sm text-muted-foreground">Hesitation Time</div>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{reportData.metrics.retries_count}</div>
                          <div className="text-sm text-muted-foreground">Retries</div>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{reportData.issues.length}</div>
                          <div className="text-sm text-muted-foreground">Issues Found</div>
                        </div>
                      </div>
                      {reportData.metrics.abandonment_point != null && reportData.metrics.abandonment_point !== "" && (
                        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Abandonment point</div>
                          <p className="mt-1 text-sm text-foreground">{reportData.metrics.abandonment_point}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Question analysis (from project settings) */}
                  {reportData.question_analysis?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5" />
                          Question Analysis
                        </CardTitle>
                        <CardDescription>Answers to the questions configured for this project</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {reportData.question_analysis.map((qa: QuestionAnalysis, idx: number) => (
                          <div key={idx} className="rounded-lg border border-border p-4">
                            <p className="font-medium text-foreground">{qa.question}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{qa.answer}</p>
                            {qa.observations?.length > 0 && (
                              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                                {qa.observations.map((obs: string, i: number) => (
                                  <li key={i}>{obs}</li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {qa.confidence != null && <span>{qa.confidence}% confidence</span>}
                              {qa.timestamp && <span>@ {qa.timestamp}</span>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                </>
              )}
            </div>

            {/* Sidebar (1/3) - Details */}
            <div className="space-y-6">
              {/* Ticket Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      Status
                    </span>
                    <Select value={ticket.ticket_status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_qa">In QA</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Flag className="h-4 w-4" />
                      Priority
                    </span>
                    <Select value={ticket.priority} onValueChange={(v) => handlePriorityChange(v as TicketPriority)}>
                      <SelectTrigger className="w-[140px] h-8">
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

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      Confidence
                    </span>
                    <span className="text-sm text-foreground">
                      {ticket.ai_confidence !== null && ticket.ai_confidence !== undefined
                        ? `${ticket.ai_confidence}%`
                        : "—"}
                    </span>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Assignee
                    </span>
                    <span className="text-sm text-foreground">
                      {ticket.assignee_name || "Unassigned"}
                    </span>
                  </div>

                  {/* Category */}
                  {ticket.category && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        Category
                      </span>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </div>
                  )}

                  {/* Due Date */}
                  {ticket.due_date && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Due Date
                      </span>
                      <span className="text-sm text-foreground">{formatDate(ticket.due_date)}</span>
                    </div>
                  )}

                  <Separator />

                  {/* Submitted by */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Submitted by
                    </span>
                    <span className="text-sm text-foreground">
                      {ticket.submitter_name || "Anonymous"}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created
                    </span>
                    <span className="text-sm text-foreground">{formatDate(ticket.created_at)}</span>
                  </div>

                  {/* Project */}
                  {ticket.project_name && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        Project
                      </span>
                      <span className="text-sm text-foreground">{ticket.project_name}</span>
                    </div>
                  )}

                  {/* Page URL */}
                  {ticket.page_url && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        Page
                      </span>
                      <a
                        href={ticket.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline truncate max-w-[180px]"
                      >
                        {ticket.page_url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata / Browser Info */}
              {ticket.browser_info && Object.keys(ticket.browser_info).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(ticket.browser_info).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                          <span className="text-foreground">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketDetail;
