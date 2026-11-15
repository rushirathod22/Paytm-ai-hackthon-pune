import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Send, Sparkles } from 'lucide-react';
import { opsApi } from '../services/api';

interface VoiceSessionProps {
  conversationId?: string;
  onTranscriptionSubmitted: (data: any) => void;
  isLoading: boolean;
}

export const VoiceSession: React.FC<VoiceSessionProps> = ({
  conversationId,
  onTranscriptionSubmitted,
  isLoading,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'hi-IN' | 'mr-IN'>('hi-IN');

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [selectedLanguage]);

  const toggleRecording = async () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use the text input below.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        if (!sessionId) {
          const res = await opsApi.createVoiceSession(conversationId, selectedLanguage);
          if (res.ok) {
            setSessionId(res.data.session_id);
          }
        }
        setTranscript('');
        if (recognitionRef.current) {
          recognitionRef.current.lang = selectedLanguage;
          recognitionRef.current.start();
        }
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsRecording(false);
      }
    }
  };

  const submitTranscript = async () => {
    if (!transcript.trim()) return;

    try {
      const activeSession = sessionId || 'voice-session-default';
      const activeConv = conversationId || '';

      const res = await opsApi.submitVoiceTranscription(
        activeSession,
        activeConv,
        transcript,
        selectedLanguage
      );

      if (res.ok) {
        if (speechEnabled) {
          if (res.data.audio_base64) {
            try {
              if (currentAudioRef.current) {
                currentAudioRef.current.pause();
              }
              const audio = new Audio(`data:audio/wav;base64,${res.data.audio_base64}`);
              currentAudioRef.current = audio;
              audio.play().catch(() => {});
            } catch (e) {}
          } else if (res.data.speak_text && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const isDevanagari = selectedLanguage === 'hi-IN' || selectedLanguage === 'mr-IN';
            const clean = res.data.speak_text
              .replace(/[*_#`~>\[\]]/g, ' ')
              .replace(/₹/g, isDevanagari ? 'रुपये ' : 'Rupees ');
            const utterance = new SpeechSynthesisUtterance(clean);
            utterance.lang = selectedLanguage;
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }

        onTranscriptionSubmitted(res.data);
        setTranscript('');
      }
    } catch (err) {
      console.error('Failed to submit transcript:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#002970] to-[#0047BA] p-5 rounded-3xl text-white shadow-paytm mb-4 border border-[#002970]/30 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#00BAF2] flex items-center justify-center text-[#002970] font-bold">
            <Radio className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              Paytm Voice Assistant
            </span>
            <span className="ml-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono font-medium">
              Web Speech Engine
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Language Switcher */}
          <div className="inline-flex bg-white/10 p-0.5 rounded-full border border-white/20">
            {[
              { code: 'hi-IN' as const, label: 'हिंदी' },
              { code: 'mr-IN' as const, label: 'मराठी' },
              { code: 'en-IN' as const, label: 'English' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'bg-[#00BAF2] text-[#002970] shadow-xs'
                    : 'text-sky-200 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            title={speechEnabled ? 'Mute AI Voice Responses' : 'Enable AI Voice Responses'}
            className="flex items-center space-x-1.5 text-xs text-sky-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/20 transition-colors"
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-300" />}
            <span className="text-[11px] font-medium">{speechEnabled ? 'Voice ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 relative z-10">
        {/* Mic Action Button */}
        <button
          onClick={toggleRecording}
          disabled={isLoading}
          className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all shadow-md w-full sm:w-auto shrink-0 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/40'
              : 'bg-[#00BAF2] hover:bg-[#00a3d4] text-[#002970] shadow-[#00BAF2]/30'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>
            {isRecording
              ? (selectedLanguage === 'hi-IN' ? 'बोलना बंद करें' : selectedLanguage === 'mr-IN' ? 'बोलणे थांबवा' : 'Stop Speaking')
              : (selectedLanguage === 'hi-IN' ? 'आवाज़ में बात करें' : selectedLanguage === 'mr-IN' ? 'व्हॉइस सुरू करा' : 'Start Voice Conversation')}
          </span>
        </button>

        {/* Live Transcript / Prompt Preview */}
        <div className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center justify-between">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={
              isRecording
                ? (selectedLanguage === 'hi-IN'
                    ? 'सुन रहे हैं... कृपया अपनी समस्या बोलें...'
                    : selectedLanguage === 'mr-IN'
                    ? 'ऐकत आहे... आपली अडचण सांगा...'
                    : 'Listening... Speak your settlement issue...')
                : (selectedLanguage === 'hi-IN'
                    ? 'या बोलें: "मेरे ₹6,000 सेटलमेंट में नहीं आए"'
                    : selectedLanguage === 'mr-IN'
                    ? 'किंवा बोला: "माझे ₹6,000 सेटलमेंटमध्ये आले नाहीत"'
                    : 'Or speak: "My ₹6,000 payment for Order ORD-8821 is missing"')
            }
            className="bg-transparent text-xs sm:text-sm text-white placeholder-sky-200/70 w-full focus:outline-none"
          />

          {transcript.trim() && (
            <button
              onClick={submitTranscript}
              disabled={isLoading}
              className="ml-2 bg-[#00BAF2] hover:bg-sky-400 text-[#002970] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="flex items-center space-x-2 mt-3 text-xs text-sky-200 relative z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[11px] font-medium">
            {selectedLanguage === 'hi-IN'
              ? 'हिंदी (hi-IN) माइक्रोफ़ोन सक्रिय है। अपना ऑर्डर या सेटलमेंट विवरण बोलें।'
              : selectedLanguage === 'mr-IN'
              ? 'मराठी (mr-IN) मायक्रोफोन सक्रिय आहे. आपली अडचण सांगा.'
              : 'Listening in Indian English (en-IN). Say your order or settlement amount.'}
          </span>
        </div>
      )}
    </div>
  );
};
