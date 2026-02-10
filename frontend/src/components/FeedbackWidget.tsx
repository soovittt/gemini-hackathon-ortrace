import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { widgetApi, FeedbackType, WidgetConfig } from "@/lib/api";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  X,
  Video,
  Square,
  Pause,
  Play,
  Loader2,
  Check,
  Send,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

type WidgetStep = "type" | "details" | "submitting" | "success";

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WidgetStep>("type");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("feedback");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [includeRecording, setIncludeRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Widget config fetched from backend (includes project_id resolved by domain)
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const recorder = useScreenRecorder();
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Object URL for video preview; revoke on change or unmount to avoid leaks
  useEffect(() => {
    if (!videoBlob) {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(videoBlob);
    setVideoPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  // Fetch widget config by domain when opened for the first time
  useEffect(() => {
    if (!isOpen || config || configLoading || configError) return;
    setConfigLoading(true);
    const domain = window.location.host || window.location.hostname;
    widgetApi.getConfigByDomain(domain)
      .then((c) => {
        setConfig(c);
        setConfigError(null);
        setConfigLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "No project configured for this domain";
        setConfigError(msg);
        setConfigLoading(false);
      });
  }, [isOpen, config, configLoading, configError]);

  // Reset state on close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStep("type");
    setFeedbackType("feedback");
    setDescription("");
    setEmail("");
    setName("");
    setIncludeRecording(false);
    setVideoBlob(null);
    setError(null);
  }, []);

  // Start recording — stay on details step; controls move to bottom bar overlay
  const handleStartRecording = async () => {
    setIncludeRecording(true);
    setError(null);
    await recorder.startRecording();
  };

  // Stop recording — return to details form with video attached and Submit Feedback
  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording();
    if (blob) {
      setVideoBlob(blob);
    }
    setStep("details");
  };

  // Submit feedback — uses project_id resolved from domain config
  const handleSubmit = async () => {
    if (!description.trim() || !config?.project_id) return;
    setStep("submitting");
    setError(null);
    try {
      const result = await widgetApi.submit(config.project_id, {
        feedback_type: feedbackType,
        description: description.trim(),
        submitter_email: email.trim() || undefined,
        submitter_name: name.trim() || undefined,
        page_url: window.location.href,
        browser_info: {
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          language: navigator.language,
        },
      });

      // Upload video if we have one
      if (videoBlob && result.ticket_id) {
        await widgetApi.uploadVideo(config.project_id, result.ticket_id, videoBlob, recorder.duration);
      }

      setStep("success");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit feedback";
      setError(errorMessage);
      setStep("details");
    }
  };

  const feedbackTypes: { type: FeedbackType; label: string; icon: typeof Bug; color: string }[] = [
    { type: "bug", label: "Bug Report", icon: Bug, color: "text-destructive border-destructive/50 hover:bg-destructive/10" },
    { type: "feedback", label: "General Feedback", icon: MessageSquare, color: "text-primary border-primary/50 hover:bg-primary/10" },
    { type: "idea", label: "Feature Idea", icon: Lightbulb, color: "text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/10" },
  ];

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Floating trigger button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label="Open feedback"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Dialog overlay — hidden while recording so user can record the page; state is preserved */}
      {isOpen && !(includeRecording && (recorder.state === "recording" || recorder.state === "paused")) && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6 sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          {/* Widget Panel */}
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                {step !== "type" && step !== "success" && step !== "submitting" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (step === "details" && (recorder.state === "recording" || recorder.state === "paused")) {
                        recorder.stopRecording();
                        setIncludeRecording(false);
                      }
                      setStep("type");
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold text-foreground">
                  {step === "type" && "Send Feedback"}
                  {step === "details" && (
                    feedbackType === "bug"
                      ? "Report a Bug"
                      : feedbackType === "idea"
                      ? "Share an Idea"
                      : "Send Feedback"
                  )}
                  {step === "submitting" && "Submitting..."}
                  {step === "success" && "Thank You!"}
                </h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Loading / Error state for config */}
              {configLoading && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}

              {configError && !configLoading && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Widget Unavailable</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{configError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setConfigError(null); }}>
                    Retry
                  </Button>
                </div>
              )}

              {/* Step 1: Choose feedback type */}
              {step === "type" && !configLoading && !configError && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">What kind of feedback do you have?</p>
                  {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFeedbackType(type);
                        setStep("details");
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${color}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Details */}
              {step === "details" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder={
                        feedbackType === "bug"
                          ? "Describe the bug you encountered..."
                          : feedbackType === "idea"
                          ? "Describe your feature idea..."
                          : "Share your feedback..."
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Only show name/email when auth is NOT required */}
                  {!config?.require_auth && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Name (optional)</label>
                        <Input
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email (optional)</label>
                        <Input
                          placeholder="you@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-9 text-sm"
                          type="email"
                        />
                      </div>
                    </div>
                  )}

                  {/* Video Recording Attachment */}
                  {videoBlob ? (
                    <div className="space-y-2 rounded-lg border border-border bg-secondary/30 overflow-hidden">
                      <video
                        src={videoPreviewUrl ?? undefined}
                        controls
                        className="w-full rounded-t-lg bg-black aspect-video max-h-40 object-contain"
                        playsInline
                      />
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Video className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 text-sm text-foreground">
                          Screen recording attached ({formatDuration(recorder.duration)})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setVideoBlob(null);
                            setIncludeRecording(false);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleStartRecording}
                        disabled={recorder.state === "requesting"}
                      >
                        {recorder.state === "requesting" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Video className="h-4 w-4" />
                        )}
                        Add Screen Recording
                      </Button>
                      {recorder.error && (
                        <p className="text-sm text-destructive">{recorder.error}</p>
                      )}
                    </>
                  )}

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={!description.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </Button>
                </div>
              )}

              {step === "submitting" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {videoBlob ? "Uploading recording and submitting feedback..." : "Submitting your feedback..."}
                  </p>
                </div>
              )}

              {/* Success */}
              {step === "success" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Feedback Submitted!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Thank you for your feedback. We'll look into it shortly.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom recording bar — overlay when recording so user can control without the modal */}
      {includeRecording && (recorder.state === "recording" || recorder.state === "paused") && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full border border-border bg-background/95 backdrop-blur shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" aria-hidden />
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatDuration(recorder.duration)}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          {recorder.state === "recording" && (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={recorder.pauseRecording}>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
              <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={handleStopRecording}>
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          )}
          {recorder.state === "paused" && (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={recorder.resumeRecording}>
                <Play className="h-3.5 w-3.5" />
                Resume
              </Button>
              <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={handleStopRecording}>
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
