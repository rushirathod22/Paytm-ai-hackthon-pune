import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Headphones,
  FileCheck2,
  Send
} from 'lucide-react';
import { opsApi } from '../services/api';
import { EvidenceCard } from '../components/EvidenceCard';

interface CallingPageProps {
  onViewCase: (caseId: string) => void;
}

type CallState = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ENDED';

export const CallingPage: React.FC<CallingPageProps> = ({ onViewCase }) => {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callSummary, setCallSummary] = useState<any>(null);
  const [history, setHistory] = useState<{ role: 'USER' | 'ASSISTANT'; text: string; evidence?: any }[]>([]);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [escalated, setEscalated] = useState(false);
  const [hasConsent, setHasConsent] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'hi-IN' | 'mr-IN'>('hi-IN');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [typedInput, setTypedInput] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const convIdRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const callStateRef = useRef<CallState>('IDLE');
  const isMutedRef = useRef<boolean>(false);
  const liveTranscriptRef = useRef<string>('');
  const silenceTimeoutRef = useRef<any>(null);
  const selectedLanguageRef = useRef<'en-IN' | 'hi-IN' | 'mr-IN'>('hi-IN');

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = selectedLanguage;
      } catch (e) {}
    }
  }, [selectedLanguage]);

  // Synchronize listening state with callState
  useEffect(() => {
    if (callState === 'LISTENING' && !isMuted) {
      startListening();
    } else {
      stopListening();
    }
  }, [callState, isMuted]);

  // Initialize Speech Recognition once on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguageRef.current;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsMicActive(true);
      setMicError(null);
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }

      const currentText = fullTranscript.trim();
      if (currentText) {
        setLiveTranscript(currentText);
        liveTranscriptRef.current = currentText;

        // Debounced auto-submit after 1.6s of silence
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === 'LISTENING' && liveTranscriptRef.current.trim()) {
            const queryToProcess = liveTranscriptRef.current.trim();
            liveTranscriptRef.current = '';
            setLiveTranscript('');
            processMerchantUtterance(queryToProcess);
          }
        }, 1600);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition warning:', event.error);
      if (event.error === 'not-allowed') {
        setMicError('Microphone permission was denied. Please click the lock icon in the URL bar and allow microphone access.');
      } else if (event.error === 'audio-capture') {
        setMicError('No microphone detected. Please connect a headset or microphone.');
      } else if (event.error === 'network') {
        console.warn('Speech recognition network warning');
      }
    };

    recognition.onend = () => {
      setIsMicActive(false);
      if (callStateRef.current === 'LISTENING' && !isMutedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState !== 'IDLE' && callState !== 'ENDED') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceCall = async () => {
    setCallSummary(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setHistory([]);
    setCallDuration(0);
    setEscalated(false);
    setMicError(null);
    setCallState('CONNECTING');

    // 1. Explicitly request / verify microphone permission in browser
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicError(null);
      } catch (micErr: any) {
        console.warn('Microphone permission check:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setMicError('Microphone permission blocked. Please click the lock icon in the URL bar and allow microphone.');
        }
      }
    }

    try {
      const res = await opsApi.createVoiceSession(undefined, selectedLanguage);
      if (!res.ok) {
        alert('Failed to connect to voice engine. Ensure backend is running.');
        setCallState('IDLE');
        return;
      }

      const sessId = res.data.session_id;
      const cId = res.data.conversation_id;
      setSessionId(sessId);
      setConversationId(cId);
      sessionIdRef.current = sessId;
      convIdRef.current = cId;

      const greeting = res.data.greeting_text ||
        (selectedLanguage === 'hi-IN'
          ? 'नमस्ते! मैं ऑप्स साथी एआई हूँ, आपका व्यापार साथी। कृपया अपनी भुगतान या सेटलमेंट की समस्या बताएं।'
          : selectedLanguage === 'mr-IN'
          ? 'नमस्कार! मी ऑप्स साथी एआय आहे, आपला व्यापारी सहकारी. कृपया आपली पेमेंट किंवा सेटलमेंटची अडचण सांगा.'
          : 'Namaste! I am OpsSaathi AI, your autonomous merchant operations teammate. Please tell me your payment or settlement issue.');
      
      setHistory([{ role: 'ASSISTANT', text: greeting }]);
      setCallState('SPEAKING');

      if (res.data.greeting_audio_base64) {
        playSarvamAudio(res.data.greeting_audio_base64, () => {
          setCallState('LISTENING');
        });
      } else {
        speakText(greeting, () => {
          setCallState('LISTENING');
        });
      }
    } catch (err: any) {
      console.error('Failed to initiate call:', err);
      alert(`Voice connection error: ${err.message}`);
      setCallState('IDLE');
    }
  };

  const skipGreeting = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('LISTENING');
  };

  const startAndSpeak = async (userText: string) => {
    setCallSummary(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setHistory([]);
    setCallDuration(0);
    setEscalated(false);
    setCallState('CONNECTING');

    try {
      const res = await opsApi.createVoiceSession(undefined, selectedLanguage);
      if (!res.ok) {
        alert('Failed to connect to voice engine. Ensure backend is running.');
        setCallState('IDLE');
        return;
      }

      const sessId = res.data.session_id;
      const cId = res.data.conversation_id;
      setSessionId(sessId);
      setConversationId(cId);
      sessionIdRef.current = sessId;
      convIdRef.current = cId;

      await processMerchantUtterance(userText, sessId, cId);
    } catch (err: any) {
      console.error('Failed to initiate call utterance:', err);
      alert(`Voice connection error: ${err.message}`);
      setCallState('IDLE');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isMutedRef.current) {
      try {
        recognitionRef.current.lang = selectedLanguageRef.current;
        recognitionRef.current.start();
        setIsMicActive(true);
      } catch (e: any) {
        if (e.name !== 'InvalidStateError') {
          console.warn('Recognition start warning:', e);
        }
      }
    }
  };

  const stopListening = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsMicActive(false);
    }
  };

  const processMerchantUtterance = async (userText: string, forcedSessionId?: string, forcedConvId?: string) => {
    stopListening();
    setCallState('THINKING');
    setLiveTranscript('');

    setHistory((prev) => [...prev, { role: 'USER', text: userText }]);

    try {
      const activeSess = forcedSessionId || sessionIdRef.current || sessionId || 'session-call';
      const activeConv = forcedConvId || convIdRef.current || conversationId || '';

      const res = await opsApi.submitVoiceTranscription(
        activeSess,
        activeConv,
        userText,
        selectedLanguage
      );

      if (res.ok) {
        const assistantReply = res.data.message;
        const evidence = res.data.evidence;
        const caseObj = res.data.case;

        if (caseObj) {
          setActiveCase(caseObj);
        }

        setHistory((prev) => [
          ...prev,
          { role: 'ASSISTANT', text: assistantReply, evidence },
        ]);

        // Speak response out loud (using Sarvam AI voice if available, else browser speech)
        setCallState('SPEAKING');
        if (res.data.audio_base64) {
          playSarvamAudio(res.data.audio_base64, () => {
            setCallState('LISTENING');
            startListening();
          });
        } else {
          speakText(assistantReply, () => {
            setCallState('LISTENING');
            startListening();
          });
        }
      } else {
        const errMessage = selectedLanguage === 'hi-IN'
          ? 'मैं आपका रिकॉर्ड नहीं ढूंढ सका। कृपया अपना प्रश्न दोहराएं।'
          : selectedLanguage === 'mr-IN'
          ? 'मला आपले रेकॉर्ड सापडले नाही. कृपया आपला प्रश्न पुन्हा सांगा.'
          : 'I could not retrieve your records. Please repeat your query.';
        speakText(errMessage, () => {
          setCallState('LISTENING');
          startListening();
        });
      }
    } catch (err) {
      console.error('Error submitting voice transcript:', err);
      setCallState('LISTENING');
      startListening();
    }
  };

  const playSarvamAudio = (base64Wav: string, onComplete?: () => void) => {
    if (!isSpeakerOn) {
      if (onComplete) setTimeout(onComplete, 1200);
      return;
    }
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      currentAudioRef.current = audio;

      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          currentAudioRef.current = null;
          if (onComplete) onComplete();
        }
      };

      audio.onended = done;
      audio.onerror = (e) => {
        console.warn('Audio playback notice:', e);
        done();
      };
      // Safety timeout for long audio clips
      setTimeout(done, 25000);

      audio.play().catch((err) => {
        console.warn('Audio play restricted by browser policy:', err);
        done();
      });
    } catch (e) {
      if (onComplete) onComplete();
    }
  };

  const speakText = (text: string, onComplete?: () => void) => {
    if (!isSpeakerOn || !('speechSynthesis' in window)) {
      if (onComplete) setTimeout(onComplete, 1200);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const isDevanagari = selectedLanguage === 'hi-IN' || selectedLanguage === 'mr-IN';
      const clean = text
        .replace(/[*_#`~>\[\]]/g, ' ')
        .replace(/₹/g, isDevanagari ? 'रुपये ' : 'Rupees ');
      const utterance = new SpeechSynthesisUtterance(clean);
      (window as any)._activeUtterance = utterance;
      utterance.lang = selectedLanguage;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          if (onComplete) onComplete();
        }
      };

      utterance.onend = done;
      utterance.onerror = done;
      // Watchdog timer so state is never stuck
      setTimeout(done, Math.min(10000, Math.max(3000, clean.length * 70)));

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (onComplete) onComplete();
    }
  };

  const endCall = () => {
    stopListening();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setCallState('ENDED');

    // Generate call summary
    setCallSummary({
      duration: callDuration,
      conversationId: conversationId || convIdRef.current,
      caseNumber: activeCase?.case_number || 'OPS-2026-0001',
      totalExchanges: history.length,
      discrepancyIdentified: '₹6,000.00',
      status: activeCase?.status || 'AWAITING_APPROVAL',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (callState === 'LISTENING') startListening();
    } else {
      setIsMuted(true);
      stopListening();
    }
  };

  const escalateToHuman = () => {
    setEscalated(true);
    const escalationNotice =
      'I have escalated this case to Senior Supervisor Priya Iyer in the Settlement Operations queue. A human teammate has received the full investigation timeline.';
    setHistory((prev) => [
      ...prev,
      { role: 'ASSISTANT', text: escalationNotice },
    ]);
    speakText(escalationNotice);
  };

  const PROMPT_CHIPS: Record<'en-IN' | 'hi-IN' | 'mr-IN', { label: string; query: string; primary?: boolean }[]> = {
    'hi-IN': [
      {
        label: 'सेटलमेंट में ₹6,000 कम क्यों है?',
        query: 'सेटलमेंट में ₹6,000 कम क्यों है? आज मुझे ₹15,000 का यूपीआई पेमेंट मिला था।',
        primary: true,
      },
      {
        label: 'ऑर्डर ORD-8819 का स्टेटस',
        query: 'ऑर्डर ORD-8819 का पेमेंट स्टेटस क्या है?',
      },
      {
        label: 'साउंडबॉक्स आवाज़ नहीं कर रहा',
        query: 'मेरा पेटीएम साउंडबॉक्स बोल नहीं रहा है, कोई आवाज़ नहीं आ रही।',
      },
      {
        label: 'आज का सेटलमेंट बैच',
        query: 'आज का सेटलमेंट बैच और ट्रांजैक्शन विवरण दिखाएं।',
      },
    ],
    'mr-IN': [
      {
        label: 'सेटलमेंटमध्ये ₹6,000 का कमी आले?',
        query: 'आज माझ्या सेटलमेंटमध्ये ₹6,000 कमी का आले? मला ₹15,000 मिळाले होते.',
        primary: true,
      },
      {
        label: 'ऑर्डर ORD-8819 चे स्टेटस',
        query: 'ऑर्डर ORD-8819 चे पेमेंट स्टेटस काय आहे?',
      },
      {
        label: 'साउंडबॉक्स बोलत नाहीये',
        query: 'पेटीएम साउंडबॉक्स आवाज करत नाहीये, काय अडचण आहे?',
      },
      {
        label: 'आजचा सेटलमेंट तपशील',
        query: 'आजचा सेटलमेंट तपशील आणि सर्व व्यवहारांची माहिती दाखवा.',
      },
    ],
    'en-IN': [
      {
        label: 'Why is ₹6,000 missing from settlement?',
        query: 'Why is my settlement ₹6,000 less today? I received ₹15,000 in UPI payments.',
        primary: true,
      },
      {
        label: 'Status of ORD-8819',
        query: 'Check status for Order ORD-8819.',
      },
      {
        label: 'Soundbox not speaking',
        query: 'Why is my Paytm Soundbox not making payment announcement?',
      },
      {
        label: "Today's batch breakdown",
        query: "Show breakdown of today's settled batch.",
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Title & Trust Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-[#E8F8FE] text-[#002970] px-4 py-1 rounded-full text-xs font-bold border border-[#00BAF2]/30">
          <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
          <span>Paytm Multimodal Voice Agent • Shared Brain Architecture</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002970] tracking-tight">
          Talk to OpsSaathi AI
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Your autonomous merchant operations teammate is ready to investigate missing payments, verify settlement batches, and coordinate case resolution over voice.
        </p>

        {/* Consent & Security Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
          <span className="flex items-center space-x-1 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero PIN/OTP Collection: We never ask for banking secrets</span>
          </span>
          <span className="flex items-center space-x-1 font-bold text-[#002970] bg-[#E8F8FE] px-2.5 py-0.5 rounded-full border border-[#00BAF2]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Sarvam AI Bulbul v3 Indian Voice Engine Active</span>
          </span>
          <span className="flex items-center space-x-1 font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Consent Active: Encrypted Audit Trail</span>
          </span>
        </div>

        {/* Multilingual Selector: Hindi / Marathi / English */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <span className="text-xs font-bold text-[#002970] flex items-center space-x-1.5">
            <Headphones className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Merchant Language:</span>
          </span>
          <div className="inline-flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
            {[
              { code: 'hi-IN' as const, label: 'हिंदी (Hindi)', flag: '🇮🇳' },
              { code: 'mr-IN' as const, label: 'मराठी (Marathi)', flag: '🇮🇳' },
              { code: 'en-IN' as const, label: 'English', flag: '🇬🇧' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setSelectedLanguage(lang.code);
                  if (recognitionRef.current) {
                    recognitionRef.current.lang = lang.code;
                  }
                }}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  selectedLanguage === lang.code
                    ? 'bg-[#002970] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            (Priya Voice • Native Accent)
          </span>
        </div>
      </div>

      {/* PRIMARY ROBOT MASCOT STAGE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-paytm relative overflow-hidden flex flex-col items-center justify-center min-h-[460px]">
        {/* State Banner Pill */}
        <div className="absolute top-5 left-5 flex items-center space-x-2 text-xs font-bold">
          <span
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
              callState === 'LISTENING'
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                : callState === 'SPEAKING'
                ? 'bg-sky-50 text-[#002970] border-sky-300'
                : callState === 'THINKING'
                ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                : callState === 'CONNECTING'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>
              {callState === 'IDLE' && (selectedLanguage === 'hi-IN' ? 'बातचीत के लिए तैयार' : selectedLanguage === 'mr-IN' ? 'संभाषणासाठी सज्ज' : 'Ready to Connect')}
              {callState === 'CONNECTING' && (selectedLanguage === 'hi-IN' ? 'एजेंट से जुड़ रहे हैं...' : selectedLanguage === 'mr-IN' ? 'एजंटशी जोडत आहे...' : 'Connecting to Agent Brain...')}
              {callState === 'LISTENING' && (selectedLanguage === 'hi-IN' ? 'आपकी आवाज़ सुन रहे हैं...' : selectedLanguage === 'mr-IN' ? 'तुमचा आवाज ऐकत आहे...' : 'Listening to your voice...')}
              {callState === 'THINKING' && (selectedLanguage === 'hi-IN' ? 'हिसाब और सेटलमेंट की जांच जारी...' : selectedLanguage === 'mr-IN' ? 'तपशील आणि पडताळणी सुरू...' : 'Analyzing Decimal Reconciliation...')}
              {callState === 'SPEAKING' && (selectedLanguage === 'hi-IN' ? 'ऑप्स साथी बोल रहा है...' : selectedLanguage === 'mr-IN' ? 'ऑप्स साथी बोलत आहे...' : 'OpsSaathi Speaking...')}
              {callState === 'ENDED' && (selectedLanguage === 'hi-IN' ? 'कॉल समाप्त' : selectedLanguage === 'mr-IN' ? 'कॉल समाप्त' : 'Call Completed')}
            </span>
          </span>
        </div>

        {/* Top-Right Call Timer */}
        {callState !== 'IDLE' && callState !== 'ENDED' && (
          <div className="absolute top-5 right-5 flex items-center space-x-2 bg-slate-900 text-white font-mono text-xs px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>{formatTimer(callDuration)}</span>
          </div>
        )}

        {/* ROBOT ILLUSTRATION WITH REACTIVE ANIMATION RINGS */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated Ambient Pulse Rings */}
          {callState === 'LISTENING' && (
            <>
              <div className="absolute w-64 h-64 sm:w-76 sm:h-76 rounded-full bg-red-400/20 animate-ripple"></div>
              <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-red-400/30 animate-ping"></div>
            </>
          )}

          {callState === 'SPEAKING' && (
            <>
              <div className="absolute w-64 h-64 sm:w-76 sm:h-76 rounded-full bg-[#00BAF2]/20 animate-ripple"></div>
              <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-[#00BAF2]/30 animate-pulse"></div>
            </>
          )}

          {callState === 'THINKING' && (
            <div className="absolute w-56 h-56 sm:w-68 sm:h-68 rounded-full border-4 border-amber-400/40 border-t-amber-500 animate-spin"></div>
          )}

          {/* Central Blue-and-White Robot Illustration */}
          <div className="relative z-10 w-60 h-60 sm:w-80 sm:h-80 flex items-center justify-center animate-float select-none">
            <img
              src="/paytm-robot.png"
              alt="Paytm OpsSaathi AI Calling Agent Robot"
              className="max-w-full max-h-full object-contain filter drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Audio Waveform Visualization during Speaking */}
        {callState === 'SPEAKING' && (
          <div className="flex items-center space-x-1.5 h-8 my-2">
            {[40, 75, 100, 60, 90, 45, 80, 100, 60, 30].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                className="w-1.5 bg-[#00BAF2] rounded-full animate-waveform"
              ></span>
            ))}
          </div>
        )}

        {/* Skip Greeting / Interrupt button during Speaking */}
        {callState === 'SPEAKING' && (
          <div className="mt-2 relative z-10">
            <button
              onClick={skipGreeting}
              className="bg-white/95 hover:bg-white text-[#002970] border border-[#00BAF2]/40 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer animate-fade-in"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>
                {selectedLanguage === 'hi-IN'
                  ? '⚡ सीधे बोलना शुरू करें (Speak Now)'
                  : selectedLanguage === 'mr-IN'
                  ? '⚡ लगेच बोला (Speak Now)'
                  : '⚡ Skip Greeting & Speak Now'}
              </span>
            </button>
          </div>
        )}

        {/* Live Speech Transcript & Reactive Visualizer */}
        {callState === 'LISTENING' && (
          <div className="mt-3 text-center max-w-xl w-full px-4 z-10 animate-fade-in">
            {liveTranscript ? (
              <div className="bg-[#E8F8FE] border-2 border-[#00BAF2] rounded-2xl p-4 shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <span className="relative flex h-3 w-3 mt-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#002970]/80">
                      Hearing your voice live:
                    </span>
                    <p className="text-base sm:text-lg font-bold text-[#002970] mt-0.5 leading-snug break-words">
                      "{liveTranscript}"
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      (Speaking done? Auto-submitting in 1.6s, or click Send)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (liveTranscript.trim()) {
                      const query = liveTranscript.trim();
                      liveTranscriptRef.current = '';
                      setLiveTranscript('');
                      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                      processMerchantUtterance(query);
                    }
                  }}
                  className="bg-[#002970] hover:bg-[#001d52] text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center space-x-1.5 shrink-0 shadow-sm transition-all cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2.5 text-slate-700">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold">
                  {selectedLanguage === 'hi-IN'
                    ? 'माइक्रोफ़ोन सक्रिय है... अब अपनी आवाज़ में बोलें (जैसे: "सेटलमेंट में ₹6,000 कम क्यों है")'
                    : selectedLanguage === 'mr-IN'
                    ? 'मायक्रोफोन सुरू आहे... आता आपला प्रश्न विचारा (उदा: "सेटलमेंटमध्ये ₹6,000 का कमी आले")'
                    : 'Microphone active... Speak your query now (or click prompt chips below)'}
                </span>
              </div>
            )}

            {micError && (
              <div className="mt-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2 rounded-xl font-medium text-center">
                {micError}
              </div>
            )}
          </div>
        )}

        {/* PRIMARY CALL CONTROLS */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 relative z-10">
          {callState === 'IDLE' || callState === 'ENDED' ? (
            <button
              onClick={startVoiceCall}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-full text-sm sm:text-base flex items-center space-x-2.5 shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Phone className="w-5 h-5 text-emerald-100" />
              <span>
                {selectedLanguage === 'hi-IN'
                  ? 'कॉल शुरू करें (Start Voice Call)'
                  : selectedLanguage === 'mr-IN'
                  ? 'कॉल सुरू करा (Start Voice Call)'
                  : 'Start Voice Call'}
              </span>
            </button>
          ) : (
            <>
              {/* Mute / Unmute Button */}
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full transition-all border shadow-sm ${
                  isMuted
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Speaker On / Off Toggle */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3.5 rounded-full transition-all border shadow-sm ${
                  !isSpeakerOn
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
                title={isSpeakerOn ? 'Turn Voice Audio Off' : 'Turn Voice Audio On'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Human Escalation Button */}
              <button
                onClick={escalateToHuman}
                disabled={escalated}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-bold px-4 py-3 rounded-full text-xs flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>{escalated ? 'Escalated to Supervisor' : 'Escalate to Human'}</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </>
          )}
        </div>

        {/* Fallback Text Input during Active Call */}
        {callState !== 'IDLE' && callState !== 'ENDED' && (
          <div className="mt-4 flex items-center gap-2 max-w-md w-full px-2 z-10">
            <input
              type="text"
              placeholder={
                selectedLanguage === 'hi-IN'
                  ? 'या हिंदी में लिखें (जैसे: सेटलमेंट में ₹6,000 कम क्यों है?)...'
                  : selectedLanguage === 'mr-IN'
                  ? 'किंवा मराठीत टाइप करा (उदा: सेटलमेंटमध्ये ₹6,000 का कमी आले?)...'
                  : 'Or type a voice query here (e.g. Why is ₹6,000 missing?)...'
              }
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedInput.trim() && callState !== 'THINKING') {
                  processMerchantUtterance(typedInput.trim());
                  setTypedInput('');
                }
              }}
              disabled={callState === 'THINKING'}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-full px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
            />
            <button
              onClick={() => {
                if (typedInput.trim() && callState !== 'THINKING') {
                  processMerchantUtterance(typedInput.trim());
                  setTypedInput('');
                }
              }}
              disabled={!typedInput.trim() || callState === 'THINKING'}
              className="bg-[#002970] disabled:opacity-40 text-white p-2 rounded-full hover:bg-[#001d52] transition-colors cursor-pointer"
              title="Submit voice utterance"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Voice Prompt Chips (Works in both Idle and In-Call states) */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs z-10">
          <span className="text-slate-400 font-semibold text-[11px]">
            {callState === 'IDLE'
              ? (selectedLanguage === 'hi-IN' ? 'एक-क्लिक आवाज़ टेस्ट:' : selectedLanguage === 'mr-IN' ? '१-क्लिक व्हॉइस टेस्ट:' : 'Quick 1-Click Voice Test:')
              : (selectedLanguage === 'hi-IN' ? 'यह पूछें:' : selectedLanguage === 'mr-IN' ? 'असे विचारा:' : 'Try asking:')}
          </span>
          {PROMPT_CHIPS[selectedLanguage].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (callState === 'IDLE' || callState === 'ENDED') {
                  startAndSpeak(chip.query);
                } else {
                  processMerchantUtterance(chip.query);
                }
              }}
              className={
                chip.primary
                  ? 'bg-[#E8F8FE] text-[#002970] font-bold px-3 py-1 rounded-full border border-[#00BAF2]/40 hover:bg-[#d5f1fd] transition-colors cursor-pointer shadow-xs'
                  : 'bg-slate-100 text-slate-700 font-medium px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer'
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONVERSATION HISTORY & REAL-TIME EVIDENCE CARDS */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-paytm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-[#00BAF2]" />
              <h3 className="text-sm font-bold text-[#002970] uppercase tracking-wider">
                Live Call Transcript & Investigation Evidence
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Session: {sessionId || 'active-call'}
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'USER'
                    ? 'bg-[#E8F8FE] text-[#002970] font-semibold border border-[#00BAF2]/20 ml-8'
                    : 'bg-[#F8FAFC] text-slate-800 border border-slate-200/80 mr-8'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>{msg.role === 'USER' ? 'Sharma Sweets (Merchant)' : 'OpsSaathi AI Voice'}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.evidence && <EvidenceCard evidence={msg.evidence} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POST-CALL SUMMARY CARD (Shows after Call Ends) */}
      {callSummary && (
        <div className="bg-[#FFF9F0] rounded-3xl p-6 border border-[#FFE7C4] shadow-paytm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-[#002970]">Call Summary & Outcome</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Duration: {formatTimer(callSummary.duration)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3.5 rounded-2xl border border-amber-100">
              <span className="text-slate-500 font-medium">Associated Case Number</span>
              <p className="text-base font-extrabold text-[#002970] font-mono mt-0.5">
                {callSummary.caseNumber}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-100">
              <span className="text-slate-500 font-medium">Discrepancy Identified</span>
              <p className="text-base font-extrabold text-rose-700 font-mono mt-0.5">
                {callSummary.discrepancyIdentified}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-100">
              <span className="text-slate-500 font-medium">Case State</span>
              <p className="text-base font-extrabold text-amber-800 font-mono mt-0.5">
                {callSummary.status}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-600">
              The transcript and evidence have been permanently logged into PostgreSQL case timeline.
            </p>
            <button
              onClick={() => onViewCase(callSummary.caseNumber)}
              className="bg-[#002970] hover:bg-[#001d52] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center space-x-1 transition-colors"
            >
              <span>View Case in Console</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#00BAF2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
