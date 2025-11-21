import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, LogMessage } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface UseGeminiLiveProps {
  onLog: (message: LogMessage) => void;
}

export const useGeminiLive = ({ onLog }: UseGeminiLiveProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Close input
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Close output
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    analyserRef.current = null;
    
    // Close session if possible (SDK specific)
    if (currentSessionRef.current) {
        // There isn't a direct close method on the session object in this version of the SDK
        // but dropping the reference helps.
        currentSessionRef.current = null;
    }
    sessionRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Disconnected.' });
  }, [cleanup, onLog]);

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Initializing J.A.R.V.I.S. protocol...' });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Setup Output Analyser for Visualizer
      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          systemInstruction: "You are J.A.R.V.I.S., a highly advanced AI assistant. You address the user as 'Sir' or 'Boss'. Your tone is sophisticated, British, slightly witty, and ultra-efficient. Keep your responses concise and helpful. Act like the interface from Iron Man.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Connection established. Online.' });

            // Start Input Stream Processing
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              if (sessionRef.current) {
                  sessionRef.current.then((session) => {
                      session.sendRealtimeInput({ media: pcmBlob });
                  });
              }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const { serverContent } = message;

            // Handle Transcription
            if (serverContent?.modelTurn?.parts?.[0]?.text) {
                // Sometimes text comes directly in parts
                // onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'JARVIS', text: serverContent.modelTurn.parts[0].text });
            }
            
            if (serverContent?.outputTranscription?.text) {
                 onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'JARVIS', text: serverContent.outputTranscription.text });
            }

            if (serverContent?.inputTranscription?.text) {
                // Debounce user transcription in a real app, here we just log it
                // Note: input transcription often comes in partial chunks
                // onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'USER', text: serverContent.inputTranscription.text });
            }

            // Handle Audio Output
            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              // Connect to analyser then destination
              if (analyserRef.current) {
                source.connect(analyserRef.current);
                analyserRef.current.connect(ctx.destination);
              } else {
                source.connect(ctx.destination);
              }

              // Gapless playback logic
              // Ensure we don't schedule in the past
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;

              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Interruption
            if (serverContent?.interrupted) {
              onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Interruption detected.' });
              sourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (serverContent?.turnComplete) {
                // Turn complete logic if needed
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Session closed.' });
          },
          onerror: (err) => {
            console.error(err);
            setConnectionState(ConnectionState.ERROR);
            onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'System Error.' });
          }
        }
      });

      sessionRef.current = sessionPromise;
      currentSessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Connection failed', error);
      setConnectionState(ConnectionState.ERROR);
      onLog({ id: Date.now().toString(), timestamp: new Date(), sender: 'SYSTEM', text: 'Failed to initialize protocol.' });
    }
  }, [onLog]);

  // Volume Visualizer Loop
  useEffect(() => {
    let animationFrameId: number;

    const updateVolume = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize to 0-1
        setVolume(average / 128.0); 
      } else {
          setVolume(0);
      }
      animationFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return {
    connect,
    disconnect,
    connectionState,
    volume
  };
};
