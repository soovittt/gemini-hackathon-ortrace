import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Monitor, Mic, MicOff, Video, VideoOff, Square, Play, Pause, RotateCcw, Send, Scissors, CheckCircle2, Bell } from "lucide-react";

type RecordingPhase = 'initial' | 'recording' | 'review' | 'submitted';

const User = () => {
  const { sessionId } = useParams();
  const [phase, setPhase] = useState<RecordingPhase>('initial');
  
  // Source options
  const [screenEnabled, setScreenEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  
  // Recording state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Media refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Review state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0); // Now in seconds
  const [trimEnd, setTrimEnd] = useState(0); // Now in seconds, initialized when duration is known
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Generated ticket ID for demo
  const [ticketId] = useState(() => `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const atLeastOneSourceEnabled = screenEnabled || audioEnabled || videoEnabled;

  const startRecording = async () => {
    try {
      const streams: MediaStream[] = [];
      
      // Get screen share
      if (screenEnabled) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        mediaStreamRef.current = screenStream;
        streams.push(screenStream);
        
        // Handle user stopping screen share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          stopRecording();
        };
      }
      
      // Get audio
      if (audioEnabled) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = audioStream;
        streams.push(audioStream);
      }
      
      // Get video
      if (videoEnabled) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = videoStream;
        streams.push(videoStream);
      }
      
      // Combine all tracks into one stream
      const combinedStream = new MediaStream();
      streams.forEach(stream => {
        stream.getTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      });
      
      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        chunksRef.current = [];
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setPhase('recording');
    } catch {
      // Recording failed
    }
  };

  const stopRecording = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all tracks
    [mediaStreamRef.current, audioStreamRef.current, videoStreamRef.current].forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    
    setPhase('review');
  }, []);

  const toggleAudio = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  const handleReRecord = () => {
    setRecordedBlob(null);
    setElapsedTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setIsPlaying(false);
    setDuration(0);
    setPhase('initial');
  };

  const handleSubmit = () => {
    setPhase('submitted');
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      [mediaStreamRef.current, audioStreamRef.current, videoStreamRef.current].forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, []);

  // Initial screen - Instructions and options
  if (phase === 'initial') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/ortrace_logo.png" alt="Ortrace" className="h-8 dark:invert" />
            </div>
            <CardDescription className="text-base mt-2">
              Record your screen to help us understand your issue better
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-sm">How it works:</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Choose what to share (screen, audio, video)</li>
                <li>Select the window or screen to record</li>
                <li>Show us the issue you're experiencing</li>
                <li>Review and submit your recording</li>
              </ol>
            </div>

            {/* Source Options */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Recording Options</h3>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="screen-toggle" className="font-medium">Screen Share</Label>
                    <p className="text-xs text-muted-foreground">Share your screen or window</p>
                  </div>
                </div>
                <Switch
                  id="screen-toggle"
                  checked={screenEnabled}
                  onCheckedChange={setScreenEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="audio-toggle" className="font-medium">Microphone</Label>
                    <p className="text-xs text-muted-foreground">Include your voice</p>
                  </div>
                </div>
                <Switch
                  id="audio-toggle"
                  checked={audioEnabled}
                  onCheckedChange={setAudioEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="video-toggle" className="font-medium">Camera</Label>
                    <p className="text-xs text-muted-foreground">Show your face</p>
                  </div>
                </div>
                <Switch
                  id="video-toggle"
                  checked={videoEnabled}
                  onCheckedChange={setVideoEnabled}
                />
              </div>

              {!atLeastOneSourceEnabled && (
                <p className="text-sm text-destructive">
                  Please enable at least one recording option
                </p>
              )}
            </div>

            <Button 
              onClick={startRecording} 
              className="w-full" 
              size="lg"
              disabled={!atLeastOneSourceEnabled}
            >
              Start Recording
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Recording screen - Floating control bar
  if (phase === 'recording') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full bg-destructive animate-pulse" />
            <span className="text-xl font-medium">Recording in progress...</span>
          </div>
          <p className="text-muted-foreground">
            Navigate to the window you're recording and demonstrate the issue
          </p>
        </div>

        {/* Floating Control Bar */}
        <div className="fixed bottom-6 right-6 flex items-center gap-4 bg-background/95 backdrop-blur-lg border border-border rounded-full px-5 py-3 shadow-2xl">
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-mono font-medium min-w-[52px]">
              {formatTime(elapsedTime)}
            </span>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Audio toggle */}
          {audioEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className={isAudioMuted ? "text-muted-foreground" : "text-foreground"}
            >
              {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}

          {/* Video toggle */}
          {videoEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVideo}
              className={isVideoOff ? "text-muted-foreground" : "text-foreground"}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          {(audioEnabled || videoEnabled) && <div className="w-px h-6 bg-border" />}

          {/* End recording */}
          <Button variant="destructive" size="sm" onClick={stopRecording} className="gap-2">
            <Square className="h-4 w-4 fill-current" />
            End Recording
          </Button>
        </div>
      </div>
    );
  }

  // Review screen
  if (phase === 'review') {
    const handleSeek = (value: number[]) => {
      if (videoRef.current) {
        videoRef.current.currentTime = (value[0] / 100) * duration;
      }
    };

    const skipForward = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
      }
    };

    const skipBackward = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
      }
    };

    const toggleFullscreen = () => {
      if (videoRef.current) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          videoRef.current.requestFullscreen();
        }
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Review Your Recording</CardTitle>
            <CardDescription>
              Preview your recording before submitting. You can trim it if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Player */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative group">
              {recordedBlob ? (
                <>
                  <video
                    ref={videoRef}
                    src={URL.createObjectURL(recordedBlob)}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlayback}
                    onEnded={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      const videoDuration = e.currentTarget.duration;
                      setDuration(videoDuration);
                      if (trimEnd === 0) {
                        setTrimEnd(videoDuration);
                      }
                    }}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Progress Bar */}
                    <div className="px-4 pb-2">
                      <Slider
                        value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                        onValueChange={handleSeek}
                        max={100}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-between px-4 pb-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={skipBackward}
                          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={togglePlayback}
                          className="h-10 w-10 text-primary-foreground hover:bg-primary-foreground/20"
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={skipForward}
                          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                        >
                          <RotateCcw className="h-4 w-4 scale-x-[-1]" />
                        </Button>
                        <span className="text-sm text-primary-foreground ml-2">
                          {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No recording available
                </div>
              )}
            </div>

            {/* Trim Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Trim Recording</Label>
              </div>
              <Slider
                value={[trimStart, trimEnd || duration]}
                onValueChange={([start, end]) => {
                  setTrimStart(start);
                  setTrimEnd(end);
                }}
                max={duration || 100}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start: {formatTime(Math.floor(trimStart))}</span>
                <span>End: {formatTime(Math.floor(trimEnd || duration))}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReRecord} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
              <Button onClick={handleSubmit} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                Submit Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted screen
  if (phase === 'submitted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your recording has been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your issue will be reviewed by our team and you can track its status using the link below:
              </p>
              <Link 
                to={`/tickets/${ticketId}`}
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                Track your ticket: {ticketId}
              </Link>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg text-left">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">
                  You will be emailed when there is an update to your ticket
                </p>
              </div>
            </div>

            <Button variant="outline" asChild className="w-full">
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default User;
