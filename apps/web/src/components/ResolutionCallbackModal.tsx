import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, CheckCircle2, Sparkles, Volume2, X } from 'lucide-react';

export interface CallbackEvent {
  caseId: string;
  caseNumber: string;
  message: string;
  audioBase64?: string | null;
  merchantPhone?: string;
}

interface ResolutionCallbackModalProps {
  callbackEvent: CallbackEvent | null;
  onClose: () => void;
  onCallCompleted: () => void;
}

export const ResolutionCallbackModal: React.FC<ResolutionCallbackModalProps> = ({
  callbackEvent,
  onClose,
  onCallCompleted,
}) => {
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED' | 'ENDED'>('RINGING');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (callbackEvent) {
      setCallState('RINGING');
    }
  }, [callbackEvent]);

  if (!callbackEvent) return null;

  const handleAnswerCall = () => {
    setCallState('CONNECTED');
    setIsPlaying(true);

    if (callbackEvent.audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${callbackEvent.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          setCallState('ENDED');
        };
        audio.onerror = () => {
          fallbackSpeech();
        };
        audio.play().catch(() => {
          fallbackSpeech();
        });
      } catch (e) {
        fallbackSpeech();
      }
    } else {
      fallbackSpeech();
    }
  };

  const fallbackSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(callbackEvent.message);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      utterance.onend = () => {
        setIsPlaying(false);
        setCallState('ENDED');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlaying(false);
        setCallState('ENDED');
      }, 5000);
    }
  };

  const handleEndCall = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('ENDED');
    onCallCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {callState === 'RINGING' ? (
        /* RINGING INCOMING CALL PROMPT */
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-200 shadow-2xl space-y-6 text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-200/50 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-sky-200/50 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col items-center space-y-4">
            {/* Ringing Phone Avatar */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></div>
              <div className="absolute -inset-2 rounded-full bg-emerald-400/20 animate-ripple"></div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                <PhoneCall className="w-10 h-10 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-0.5 rounded-full mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Autonomous Resolution Callback</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#002970]">
                Incoming Call: OpsSaathi AI
              </h2>
              <div className="inline-flex items-center space-x-1.5 bg-[#E8F8FE] text-[#002970] border border-[#00BAF2]/40 rounded-full px-3.5 py-1 text-xs font-mono font-bold my-1">
                <Phone className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>Dialing Merchant: {callbackEvent.merchantPhone || '+91 9545696585'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calling Sharma Sweets regarding Case <span className="font-mono font-bold text-[#002970]">{callbackEvent.caseNumber}</span>
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                Missing ₹6,000 has been verified & settled!
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 w-full pt-2">
              <button
                onClick={handleAnswerCall}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-full flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Phone className="w-5 h-5 text-emerald-100" />
                <span>Answer Call</span>
              </button>
              <button
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 px-4 rounded-full text-xs transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CONNECTED VOICE CALL MODAL */
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200/90 shadow-2xl space-y-6 text-center relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-[#002970] uppercase tracking-wider font-mono">
                Call Active • Case {callbackEvent.caseNumber}
              </span>
            </div>
            <button
              onClick={handleEndCall}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Robot Mascot Speaking */}
          <div className="relative my-2 flex flex-col items-center justify-center">
            {/* Cyan Voice Waves */}
            <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-[#00BAF2]/20 animate-ripple"></div>
            <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-[#00BAF2]/30 animate-pulse"></div>

            <div className="relative z-10 w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center select-none animate-float">
              <img
                src="/paytm-robot.png"
                alt="OpsSaathi AI Calling Agent"
                className="max-w-full max-h-full object-contain filter drop-shadow-2xl"
              />
            </div>

            {/* Audio Waveform */}
            {isPlaying && (
              <div className="flex items-center space-x-1.5 h-6 my-2">
                {[40, 75, 100, 60, 90, 45, 80, 100, 60, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                    className="w-1 bg-[#00BAF2] rounded-full animate-waveform"
                  ></span>
                ))}
              </div>
            )}
          </div>

          {/* Spoken Transcript */}
          <div className="bg-[#E8F8FE] p-4 rounded-2xl border border-[#00BAF2]/30 text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#002970]">
              <span className="flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span>OpsSaathi AI (Sarvam Bulbul v3 Indian Voice)</span>
              </span>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                PASS: Verified
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
              "{callbackEvent.message}"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-red-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call & View Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
