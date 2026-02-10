import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

interface UseScreenRecorderReturn {
  state: RecordingState;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    startTimeRef.current = Date.now() - pausedDurationRef.current;
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedDurationRef.current = Date.now() - startTimeRef.current;
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      const mediaStream = mediaStreamRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setState('idle');
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        // Stop all tracks
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        // Create final blob
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        
        setState('stopped');
        stopTimer();

        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;

        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [stopTimer]);

  // Use a ref to always have the latest stopRecording for the onended callback
  const stopRecordingRef = useRef(stopRecording);
  stopRecordingRef.current = stopRecording;

  const startRecording = useCallback(async () => {
    setError(null);
    setState('requesting');

    try {
      // Request screen capture with audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      // Try to get microphone audio for commentary
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        // Microphone not available, continue without it
      }

      // Combine streams
      const tracks = [...displayStream.getTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      mediaStreamRef.current = combinedStream;

      // Detect if user stops sharing
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecordingRef.current();
      };

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        setState('idle');
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setState('recording');
      pausedDurationRef.current = 0;
      startTimer();
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Screen sharing permission denied. Please allow screen sharing to continue.');
        } else if (err.name === 'NotFoundError') {
          setError('No screen available for sharing.');
        } else {
          setError(err.message || 'Failed to start recording');
        }
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to start recording');
      } else {
        setError('Failed to start recording');
      }
      setState('idle');
    }
  }, [startTimer]);

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setState('paused');
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setState('recording');
      startTimer();
    }
  }, [startTimer]);

  return {
    state,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

export default useScreenRecorder;
