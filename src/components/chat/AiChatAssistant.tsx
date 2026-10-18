import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  RotateCcw,
  ChevronLeft,
  X,
  Square,
  Play,
  Pause,
  Trash2,
  Sparkles,
  MessageSquare,
  Headphones,
  Keyboard,
  Radio,
} from 'lucide-react';
import { sendChatMessage, ChatRequestContext } from '../../services/apiClient';
import { CropConfig, LocationConfig } from '../../types';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  suggestedQuestions?: string[];
  isVoiceMessage?: boolean;
  audioBlobUrl?: string;
  audioDurationSec?: number;
}

interface AiChatAssistantProps {
  selectedLocation: LocationConfig;
  selectedCrop: CropConfig;
  currentTempC: number;
  weatherDesc: string;
  rootMoisturePct: number;
  mandiPriceInr: number;
  language: 'hi' | 'en';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({
  selectedLocation,
  selectedCrop,
  currentTempC,
  weatherDesc,
  rootMoisturePct,
  mandiPriceInr,
  language,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const isHi = language === 'hi';

  // Active input mode: 'type' | 'voice'
  const [inputMode, setInputMode] = useState<'type' | 'voice'>('type');

  // Messages list
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: isHi
        ? `राम-राम किसान भाई! 🙏 मैं आपका **किसान साथी AI मित्र** हूँ।\n\nआप यहाँ **लिखकर (Typing)** ✍️ या **वॉयस संदेश (Voice Message)** 🎙️ रिकॉर्ड करके अपनी फसल, सिंचाई, खाद, मौसम या मंडी भाव के बारे में पूछ सकते हैं।`
        : `Hello Farmer Friend! 🙏 I am your **Kisan Saathi AI Assistant**.\n\nYou can **type** ✍️ or send a **voice message** 🎙️ to ask anything about crops, irrigation, fertilizers, weather, or mandi prices.`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: isHi
        ? [
            'क्या आज सिंचाई की जरूरत है?',
            'अगले 3 दिन मौसम कैसा रहेगा?',
            'मंडी में गेहूं का क्या भाव है?',
            'खाद की सही मात्रा क्या है?',
          ]
        : [
            'Is irrigation needed today?',
            'Weather outlook for next 3 days?',
            'What is current mandi rate?',
            'Recommended fertilizer dosage?',
          ],
    },
  ]);

  // Typing state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Quick Speech-to-Text dictation into input box
  const [isDictating, setIsDictating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Full Voice Note Recording State (MediaRecorder)
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNoteRecordedBlob, setVoiceNoteRecordedBlob] = useState<Blob | null>(null);
  const [voiceNoteAudioUrl, setVoiceNoteAudioUrl] = useState<string | null>(null);
  const [voiceNoteLiveTranscript, setVoiceNoteLiveTranscript] = useState('');

  // Audio Playback in Chat Bubbles
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const dictationRecognitionRef = useRef<any>(null);
  const voiceNoteRecognitionRef = useRef<any>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition for dictation & voice notes
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      // 1. Dictation recognizer (for typing box)
      const dictation = new SpeechRecognition();
      dictation.continuous = false;
      dictation.interimResults = true;
      dictation.lang = isHi ? 'hi-IN' : 'en-IN';

      dictation.onstart = () => setIsDictating(true);
      dictation.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      dictation.onerror = () => setIsDictating(false);
      dictation.onend = () => setIsDictating(false);
      dictationRecognitionRef.current = dictation;

      // 2. Voice note live transcription recognizer
      const voiceNoteRec = new SpeechRecognition();
      voiceNoteRec.continuous = true;
      voiceNoteRec.interimResults = true;
      voiceNoteRec.lang = isHi ? 'hi-IN' : 'en-IN';

      voiceNoteRec.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; ++i) {
          current += event.results[i][0].transcript;
        }
        setVoiceNoteLiveTranscript(current);
      };
      voiceNoteRec.onerror = () => {};
      voiceNoteRec.onend = () => {};
      voiceNoteRecognitionRef.current = voiceNoteRec;
    } catch (err) {
      console.warn('Speech recognition setup error:', err);
      setSpeechSupported(false);
    }

    return () => {
      try {
        dictationRecognitionRef.current?.abort();
        voiceNoteRecognitionRef.current?.abort();
      } catch (_e) {}
    };
  }, [isHi]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isRecordingVoiceNote, voiceNoteRecordedBlob]);

  // Toggle quick speech dictation into text box
  const handleToggleDictation = () => {
    if (!speechSupported || !dictationRecognitionRef.current) {
      alert(
        isHi
          ? 'आपके ब्राउज़र में बोलकर लिखने की सुविधा उपलब्ध नहीं है। कृपया टाइप करके संदेश भेजें।'
          : 'Speech recognition is not supported in this browser. Please type your message.'
      );
      return;
    }

    if (isDictating) {
      dictationRecognitionRef.current.stop();
      setIsDictating(false);
    } else {
      try {
        dictationRecognitionRef.current.lang = isHi ? 'hi-IN' : 'en-IN';
        dictationRecognitionRef.current.start();
      } catch (err) {
        console.warn('Dictation start error:', err);
      }
    }
  };

  // Start MediaRecorder for Voice Message
  const handleStartVoiceRecording = async () => {
    // Reset previous recording
    setVoiceNoteRecordedBlob(null);
    setVoiceNoteAudioUrl(null);
    setVoiceNoteLiveTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setVoiceNoteRecordedBlob(audioBlob);
        setVoiceNoteAudioUrl(url);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecordingVoiceNote(true);

      // Start live transcript if supported
      try {
        if (voiceNoteRecognitionRef.current) {
          voiceNoteRecognitionRef.current.lang = isHi ? 'hi-IN' : 'en-IN';
          voiceNoteRecognitionRef.current.start();
        }
      } catch (_e) {}

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      alert(
        isHi
          ? 'कृपया माइक्रोफ़ोन की अनुमति (Permission) दें ताकि आप वॉयस संदेश रिकॉर्ड कर सकें।'
          : 'Please allow microphone access to record voice messages.'
      );
    }
  };

  // Stop MediaRecorder (review / ready to send)
  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoiceNote) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoiceNote(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      try {
        voiceNoteRecognitionRef.current?.stop();
      } catch (_e) {}
    }
  };

  // Cancel Voice Recording
  const handleCancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoiceNote) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    try {
      voiceNoteRecognitionRef.current?.stop();
    } catch (_e) {}

    setIsRecordingVoiceNote(false);
    setVoiceNoteRecordedBlob(null);
    setVoiceNoteAudioUrl(null);
    setVoiceNoteLiveTranscript('');
    setRecordingSeconds(0);
  };

  // Helper: Convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send Typed Text Message
  const handleSendTextMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    if (isDictating && dictationRecognitionRef.current) {
      try {
        dictationRecognitionRef.current.stop();
      } catch (_e) {}
    }

    const userMsg: ChatMessageItem = {
      id: `user-text-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isVoiceMessage: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    await dispatchQueryToAi(textToSend);
  };

  // Send Recorded Voice Message
  const handleSendVoiceMessage = async () => {
    let audioBlob = voiceNoteRecordedBlob;

    // If currently still recording, stop and grab chunks
    if (isRecordingVoiceNote && mediaRecorderRef.current) {
      handleStopVoiceRecording();
      // wait 200ms for blob creation
      await new Promise((r) => setTimeout(r, 200));
      audioBlob = voiceNoteRecordedBlob;
    }

    if (!audioBlob && !voiceNoteLiveTranscript) return;

    const transcript =
      voiceNoteLiveTranscript.trim() ||
      (isHi ? 'वॉयस संदेश (फसल व मौसम जानकारी)' : 'Voice Note: Crop and weather query');

    const audioUrl = voiceNoteAudioUrl || (audioBlob ? URL.createObjectURL(audioBlob) : undefined);
    const duration = recordingSeconds || 4;

    const userVoiceMsg: ChatMessageItem = {
      id: `user-voice-${Date.now()}`,
      sender: 'user',
      text: transcript,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isVoiceMessage: true,
      audioBlobUrl: audioUrl,
      audioDurationSec: duration,
    };

    setMessages((prev) => [...prev, userVoiceMsg]);
    setIsLoading(true);

    // Reset voice recording controls
    setVoiceNoteRecordedBlob(null);
    setVoiceNoteAudioUrl(null);
    setVoiceNoteLiveTranscript('');
    setRecordingSeconds(0);

    // Prepare audio base64 payload
    let audioBase64 = '';
    if (audioBlob) {
      try {
        audioBase64 = await blobToBase64(audioBlob);
      } catch (_e) {}
    }

    await dispatchQueryToAi(transcript, audioBase64 ? { audioBase64, mimeType: audioBlob?.type || 'audio/webm' } : undefined, true);
  };

  // Dispatch Query to Backend AI
  const dispatchQueryToAi = async (
    queryText: string,
    voiceData?: { audioBase64: string; mimeType: string },
    shouldAutoSpeak = false
  ) => {
    const context: ChatRequestContext = {
      location: `${selectedLocation.nameHi} (${selectedLocation.nameEn})`,
      crop: `${selectedCrop.nameHi} (${selectedCrop.nameEn})`,
      temperatureC: currentTempC,
      weatherDesc,
      rootZoneMoisturePct: rootMoisturePct,
      mandiPriceInr,
      language,
    };

    const historyPayload = messages.slice(-4).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    try {
      const res = await sendChatMessage(queryText, historyPayload, context, voiceData);

      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        suggestedQuestions: res.suggestedQuestions,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If user sent a voice message, read the AI's reply out loud automatically!
      if (shouldAutoSpeak) {
        handleSpeakText(aiMsg.id, res.reply);
      }
    } catch (err) {
      console.error('Failed to get chat response:', err);
      const fallbackMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: isHi
          ? 'राम-राम किसान भाई! वर्तमान में मौसम साफ है और जड़ क्षेत्र में 62% नमी सुरक्षित है। कोई भी रासायनिक छिड़काव करने से पहले स्थानीय KVK से संपर्क अवश्य करें।'
          : 'Farmer friend! Root moisture is optimal at 62% and skies are clear today. Consult your local KVK for crop sprays.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Play / Pause User's Voice Note in Chat Bubble
  const handleTogglePlayVoiceNote = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      currentAudioElementRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    currentAudioElementRef.current = audio;

    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);

    audio.play();
    setPlayingAudioId(msgId);
  };

  // Text-to-Speech playback for AI messages
  const handleSpeakText = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#_~`]/g, '')
      .replace(/•/g, '')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isHi ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      isHi
        ? v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
        : v.lang.startsWith('en')
    );
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeakingMessageId(msgId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleClearChat = () => {
    window.speechSynthesis?.cancel();
    currentAudioElementRef.current?.pause();
    setSpeakingMessageId(null);
    setPlayingAudioId(null);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: isHi
          ? 'राम-राम किसान भाई! नया सत्र शुरू हो गया है। आप बोलकर या लिखकर नया सवाल पूछ सकते हैं।'
          : 'Session refreshed! Ask anything via voice note or typing.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: isHi
          ? ['आज सिंचाई करनी है क्या?', 'गेहूं का मंडी भाव?', 'मौसम कैसा रहेगा?']
          : ['Should I irrigate today?', 'Wheat mandi price?', '7-day weather outlook?'],
      },
    ]);
  };

  // Format seconds into MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Collapsed Sidebar Rail View on Desktop
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex flex-col items-center py-4 bg-emerald-950 text-white w-16 border-r border-emerald-900 shrink-0 select-none transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-md group relative"
          title={isHi ? 'AI सहायक खोलें' : 'Open AI Assistant'}
        >
          <Bot className="w-5 h-5 text-emerald-200" />
          <span className="absolute left-full ml-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'AI चैट सहायक खोलें' : 'Open AI Assistant'}
          </span>
        </button>

        <div className="my-6 w-8 h-[1px] bg-emerald-800/80" />

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div
            onClick={onToggleCollapse}
            className="cursor-pointer text-[13px] font-black tracking-widest text-emerald-300/90 [writing-mode:vertical-rl] rotate-180 hover:text-white transition-colors"
          >
            {isHi ? '🌾 AI कृषि मित्र (Typing व Voice)' : '🌾 KISAN AI ASSISTANT'}
          </div>
        </div>

        {/* Quick Voice Note trigger */}
        <button
          onClick={() => {
            onToggleCollapse();
            setInputMode('voice');
          }}
          className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg cursor-pointer transition-all active:scale-95 group relative"
          title={isHi ? 'वॉयस संदेश भेजें' : 'Send Voice Message'}
        >
          <Mic className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'वॉयस नोट भेजें' : 'Voice Note'}
          </span>
        </button>
      </aside>
    );
  }

  // Full Expanded Left Narrow AI Chatbot
  return (
    <aside
      className={`
        bg-white border-r border-stone-200 flex flex-col shrink-0 transition-all duration-300 z-40
        hidden lg:flex lg:w-80 xl:w-[340px] h-[calc(100vh-100px)] sticky top-[100px]
        ${isMobileOpen ? '!flex fixed inset-y-0 left-0 w-[90vw] max-w-sm z-50 shadow-2xl h-screen' : ''}
      `}
    >
      {/* 1. Header with Status & Close */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white border-b border-emerald-950/20 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-inner">
                <Bot className="w-5 h-5 text-emerald-100" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-900 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                  {isHi ? 'AI कृषि मित्र' : 'Kisan AI Saathi'}
                </h3>
                <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-md uppercase">
                  {isHi ? 'लाइव' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 leading-tight">
                {isHi ? 'टाइपिंग ✍️ व वॉयस मैसेज 🎙️' : 'Typing & Voice Messages'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
              title={isHi ? 'चैट साफ करें' : 'Clear chat'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
              title={isHi ? 'साइडबार समेटें' : 'Collapse'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {isMobileOpen && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Farm Context Pills */}
        <div className="mt-2.5 pt-2 border-t border-emerald-700/60 flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-emerald-100">
          <span className="bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>📍</span>
            <span>{isHi ? selectedLocation.nameHi.split(',')[0] : selectedLocation.nameEn.split(',')[0]}</span>
          </span>
          <span className="bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>{selectedCrop.emoji}</span>
            <span>{isHi ? selectedCrop.nameHi.split(' ')[0] : selectedCrop.nameEn}</span>
          </span>
          <span className="bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>💧</span>
            <span>{rootMoisturePct}% {isHi ? 'नमी' : 'moist'}</span>
          </span>
        </div>
      </div>

      {/* 2. Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 bg-stone-50/70 text-xs sm:text-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isPlayingThisAudio = playingAudioId === msg.id;
          const isSpeakingThisMsg = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-end gap-1.5 max-w-[92%]">
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0 mb-1">
                    <Bot className="w-3.5 h-3.5 text-emerald-200" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap break-words leading-relaxed ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-br-xs'
                      : 'bg-white text-stone-900 border border-stone-200 rounded-bl-xs'
                  }`}
                >
                  {/* User Voice Message Audio Bubble */}
                  {isUser && msg.isVoiceMessage && (
                    <div className="mb-2 p-2 bg-emerald-900/80 rounded-xl border border-emerald-700/60 flex items-center gap-2.5">
                      {msg.audioBlobUrl ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayVoiceNote(msg.id, msg.audioBlobUrl!)}
                          className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-amber-300 active:scale-95"
                          title="Play Voice Message"
                        >
                          {isPlayingThisAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-emerald-200 flex items-center justify-center shrink-0">
                          <Mic className="w-4 h-4" />
                        </div>
                      )}

                      {/* Waveform graphic & duration */}
                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-4">
                          {[30, 70, 45, 90, 60, 40, 85, 50, 75, 35, 95, 60].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${h}%` }}
                              className={`w-1 rounded-full ${
                                isPlayingThisAudio ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300/80'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-emerald-200 mt-1 flex items-center justify-between">
                          <span>🎙️ {isHi ? 'वॉयस संदेश' : 'Voice Message'}</span>
                          <span>{msg.audioDurationSec ? `${msg.audioDurationSec}s` : '0:05'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="space-y-1">
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={lIdx}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong
                                  key={pIdx}
                                  className={isUser ? 'text-amber-300 font-bold' : 'text-emerald-900 font-bold'}
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Bottom info for message: timestamp + text-to-speech */}
                  <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 text-[10px] text-stone-400">
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <button
                        onClick={() => handleSpeakText(msg.id, msg.text)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                          isSpeakingThisMsg
                            ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 animate-pulse'
                            : 'hover:bg-emerald-50 text-emerald-700'
                        }`}
                        title={isHi ? 'बोलकर सुनें' : 'Listen'}
                      >
                        {isSpeakingThisMsg ? (
                          <>
                            <VolumeX className="w-3 h-3 text-amber-900" />
                            <span>{isHi ? 'बंद करें' : 'Stop'}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-emerald-700" />
                            <span>{isHi ? 'सुनें' : 'Listen'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mb-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Follow-up question pills */}
              {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-2 pl-7 flex flex-wrap gap-1.5">
                  {msg.suggestedQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendTextMessage(q)}
                      disabled={isLoading}
                      className="text-[11px] font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-xl shadow-2xs transition-all active:scale-95 text-left cursor-pointer flex items-center gap-1"
                    >
                      <span>💡</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing / Thinking Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 pl-2 text-xs text-stone-500">
            <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-200" />
            </div>
            <div className="bg-white px-3.5 py-2 rounded-2xl border border-stone-200 flex items-center gap-2 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-medium text-stone-600 ml-1">
                {isHi ? 'कृषि मित्र जवाब टाइप कर रहे हैं...' : 'Kisan AI is typing advice...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Controls: Mode Selector + Typing or Voice Message Panel */}
      <div className="p-3 bg-white border-t border-stone-200 shrink-0 space-y-2.5">
        
        {/* Toggle Mode: ✍️ टाइपिंग (Type) vs 🎙️ वॉयस संदेश (Voice Note) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setInputMode('type');
              if (isRecordingVoiceNote) handleCancelVoiceRecording();
            }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'type'
                ? 'bg-white text-emerald-900 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isHi ? 'लिखकर भेजें' : 'Type Message'}</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'voice'
                ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isHi ? 'वॉयस संदेश भेजें' : 'Voice Message'}</span>
          </button>
        </div>

        {/* MODE A: TYPING INPUT */}
        {inputMode === 'type' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTextMessage();
            }}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-2">
              {/* Voice dictation helper for text box */}
              <button
                type="button"
                onClick={handleToggleDictation}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                  isDictating
                    ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                }`}
                title={isHi ? 'बोलकर लिखें (माइक चालू करें)' : 'Dictate into box'}
              >
                {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-800" />}
              </button>

              {/* Text input */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isDictating
                      ? isHi ? 'सुन रहा हूँ... बोलिए' : 'Listening... please speak'
                      : isHi ? 'यहाँ सवाल टाइप करें...' : 'Type your question here...'
                  }
                  disabled={isLoading}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl bg-stone-100 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 transition-all"
                />

                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`px-3.5 py-2.5 rounded-2xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                  inputText.trim() && !isLoading
                    ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
                title={isHi ? 'टाइप किया संदेश भेजें' : 'Send message'}
              >
                <span className="text-xs hidden sm:inline">{isHi ? 'भेजें' : 'Send'}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>

            {isDictating && (
              <p className="text-[11px] text-amber-800 animate-pulse font-medium">
                🎙️ {isHi ? 'आपकी आवाज को टेक्स्ट में बदला जा रहा है...' : 'Transcribing voice into text...'}
              </p>
            )}
          </form>
        )}

        {/* MODE B: VOICE NOTE RECORDING & SENDING */}
        {inputMode === 'voice' && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 space-y-2.5">
            {!isRecordingVoiceNote && !voiceNoteRecordedBlob && (
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <button
                  type="button"
                  onClick={handleStartVoiceRecording}
                  className="w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ring-4 ring-amber-200"
                  title={isHi ? 'वॉयस संदेश रिकॉर्ड करें' : 'Record voice note'}
                >
                  <Mic className="w-7 h-7" />
                </button>
                <p className="text-xs font-extrabold text-emerald-950 mt-2">
                  {isHi ? 'माइक दबाकर वॉयस संदेश रिकॉर्ड करें' : 'Tap mic to record voice message'}
                </p>
                <p className="text-[11px] text-stone-500">
                  {isHi ? 'जैसे WhatsApp पर वॉयस नोट भेजते हैं' : 'Just like sending a WhatsApp voice note'}
                </p>
              </div>
            )}

            {/* LIVE RECORDING IN PROGRESS */}
            {isRecordingVoiceNote && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-red-700">
                      {isHi ? 'रिकॉर्डिंग चालू है...' : 'Recording...'}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono bg-red-100 text-red-900 px-2 py-0.5 rounded-md">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>

                {/* Animated wave bars */}
                <div className="flex items-center justify-center gap-1.5 h-6 py-1 bg-white/70 rounded-xl border border-emerald-100">
                  {[20, 60, 90, 40, 80, 100, 70, 30, 85, 55, 95, 45, 75, 35].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1 rounded-full bg-red-500 animate-pulse"
                    />
                  ))}
                </div>

                {/* Live spoken preview */}
                <p className="text-[11px] text-stone-600 italic bg-white p-2 rounded-xl border border-stone-200 min-h-[32px]">
                  {voiceNoteLiveTranscript
                    ? `"${voiceNoteLiveTranscript}"`
                    : isHi ? 'बोलिए... आपकी आवाज रिकॉर्ड हो रही है' : 'Speak now... recording your message'}
                </p>

                {/* Control buttons: Cancel or Finish & Send */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelVoiceRecording}
                    className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>{isHi ? 'रद्द करें' : 'Cancel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendVoiceMessage}
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isHi ? 'वॉयस संदेश भेजें' : 'Send Voice Note'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW READY TO SEND */}
            {!isRecordingVoiceNote && voiceNoteRecordedBlob && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>{isHi ? 'वॉयस संदेश तैयार है' : 'Voice note ready'}</span>
                  <span className="font-mono">{formatTimer(recordingSeconds)}</span>
                </div>

                {voiceNoteLiveTranscript && (
                  <p className="text-[11px] text-stone-700 bg-white p-2 rounded-xl border border-stone-200">
                    "{voiceNoteLiveTranscript}"
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelVoiceRecording}
                    className="p-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer"
                    title={isHi ? 'हटाएं' : 'Discard'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSendVoiceMessage}
                    className="flex-1 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isHi ? 'वॉयस संदेश भेजें' : 'Send Voice Message'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info badge */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium px-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isHi ? 'टाइपिंग व वॉयस दोनों सक्रिय हैं' : 'Typing & Voice Notes enabled'}</span>
          </div>
          <span className="text-[10px] text-stone-400">Gemini 3.8 AI</span>
        </div>
      </div>
    </aside>
  );
};
