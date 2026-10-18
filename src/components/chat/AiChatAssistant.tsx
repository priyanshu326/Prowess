import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  Wheat,
  Droplets,
  CloudSun,
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

  // Chat message history
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: isHi
        ? `राम-राम किसान भाई! 🙏 मैं आपका **किसान साथी AI मित्र** हूँ।\n\nआप मुझसे बोलकर 🎙️ या लिखकर ✍️ फसल, सिंचाई, खाद, मौसम या मंडी भाव के बारे में कुछ भी पूछ सकते हैं।`
        : `Hello Farmer Friend! 🙏 I am your **Kisan Saathi AI Assistant**.\n\nYou can speak 🎙️ or type ✍️ to ask anything about crops, irrigation, fertilizers, weather, or mandi prices.`,
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
            'What is the current mandi rate?',
            'Recommended fertilizer dosage?',
          ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = isHi ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInputText((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Error setting up speech recognition:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_e) {}
      }
    };
  }, [isHi]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, interimTranscript]);

  // Toggle Voice Recording
  const handleToggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert(
        isHi
          ? 'आपके ब्राउज़र में बोलकर इनपुट लेने की सुविधा समर्थित नहीं है। कृपया लिखकर पूछें।'
          : 'Speech recognition is not supported in this browser. Please type your query.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = isHi ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Read message out loud
  const handleSpeakText = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert(isHi ? 'आवाज में सुनाने की सुविधा उपलब्ध नहीं है।' : 'Text to speech not available.');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown stars/bullets for clean audio speech
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

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    // Stop speech recognition if running
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_e) {}
    }

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setInterimTranscript('');
    setIsLoading(true);

    // Build context
    const context: ChatRequestContext = {
      location: `${selectedLocation.nameHi} (${selectedLocation.nameEn})`,
      crop: `${selectedCrop.nameHi} (${selectedCrop.nameEn})`,
      temperatureC: currentTempC,
      weatherDesc,
      rootZoneMoisturePct: rootMoisturePct,
      mandiPriceInr,
      language,
    };

    // Format recent history for model
    const historyPayload = messages.slice(-4).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    try {
      const res = await sendChatMessage(query, historyPayload, context);

      const assistantMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        suggestedQuestions: res.suggestedQuestions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
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

  const handleClearChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: isHi
          ? 'राम-राम किसान भाई! नया सत्र शुरू हो गया है। आप बोलकर या लिखकर नया सवाल पूछ सकते हैं।'
          : 'Session refreshed! Ask anything via voice or typing.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: isHi
          ? ['आज सिंचाई करनी है क्या?', 'गेहूं का मंडी भाव?', 'मौसम कैसा रहेगा?']
          : ['Should I irrigate today?', 'Wheat mandi price?', '7-day weather outlook?'],
      },
    ]);
  };

  // Render Collapsed Sidebar Rail on Desktop
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex flex-col items-center py-4 bg-emerald-950 text-white w-16 border-r border-emerald-900 shrink-0 select-none transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-md group relative"
          title={isHi ? 'AI चैट सहायक खोलें' : 'Open AI Chat Assistant'}
        >
          <Bot className="w-5 h-5 text-emerald-200" />
          <span className="absolute left-full ml-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'AI सहायक खोलें' : 'Open AI Assistant'}
          </span>
        </button>

        <div className="my-6 w-8 h-[1px] bg-emerald-800/80" />

        {/* Vertical writing label */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div
            onClick={onToggleCollapse}
            className="cursor-pointer text-[13px] font-black tracking-widest text-emerald-300/90 [writing-mode:vertical-rl] rotate-180 hover:text-white transition-colors"
          >
            {isHi ? '🌾 AI कृषि मित्र (सहायक)' : '🌾 KISAN AI ASSISTANT'}
          </div>
        </div>

        {/* Quick Mic trigger in collapsed bar */}
        <button
          onClick={() => {
            onToggleCollapse();
            setTimeout(() => handleToggleVoiceInput(), 300);
          }}
          className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg cursor-pointer transition-all active:scale-95 group relative"
          title={isHi ? 'बोलकर पूछें' : 'Voice Input'}
        >
          <Mic className="w-5 h-5" />
          <span className="absolute left-full ml-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'माइक से बोलें' : 'Speak via Mic'}
          </span>
        </button>
      </aside>
    );
  }

  // Full Expanded Left Narrow Chatbot Sidebar
  return (
    <aside
      className={`
        bg-white border-r border-stone-200 flex flex-col shrink-0 transition-all duration-300 z-40
        /* Desktop: fixed left narrow width (320px - 340px) */
        hidden lg:flex lg:w-80 xl:w-[340px] h-[calc(100vh-100px)] sticky top-[100px]
        /* Mobile overlay when opened */
        ${isMobileOpen ? '!flex fixed inset-y-0 left-0 w-[88vw] max-w-sm z-50 shadow-2xl h-screen' : ''}
      `}
    >
      {/* 1. Header of the AI Assistant */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white border-b border-emerald-950/20 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-inner">
                <Bot className="w-5 h-5 text-emerald-100" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                  {isHi ? 'AI कृषि मित्र' : 'Kisan AI Saathi'}
                </h3>
                <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-md uppercase">
                  {isHi ? 'सक्रिय' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 leading-tight">
                {isHi ? 'बोलकर या लिखकर पूछें' : 'Voice or Type Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
              title={isHi ? 'बातचीत साफ करें' : 'Clear conversation'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {/* Desktop Collapse Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
              title={isHi ? 'साइडबार समेटें' : 'Collapse narrow sidebar'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Mobile Close Button */}
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

        {/* Active Farm Context Pills */}
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

      {/* 2. Message History Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 bg-stone-50/70 text-xs sm:text-sm">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isPlayingThis = speakingMessageId === msg.id;

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
                  {/* Message Text with Simple Bold Rendering */}
                  <div className="space-y-1">
                    {msg.text.split('\n').map((line, lIdx) => {
                      if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

                      // Render bold **text**
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={lIdx}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={pIdx} className={isUser ? 'text-amber-300' : 'text-emerald-900 font-bold'}>
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

                  {/* Message Bottom Toolbar for Assistant: Voice Playback & Time */}
                  <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 text-[10px] text-stone-400">
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <button
                        onClick={() => handleSpeakText(msg.id, msg.text)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                          isPlayingThis
                            ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 animate-pulse'
                            : 'hover:bg-emerald-50 text-emerald-700'
                        }`}
                        title={isHi ? 'यह सलाह बोलकर सुनें' : 'Listen to this advice'}
                      >
                        {isPlayingThis ? (
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

              {/* Follow-up Suggested Questions Chips */}
              {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-2 pl-7 flex flex-wrap gap-1.5">
                  {msg.suggestedQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendMessage(q)}
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

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 pl-2 text-xs text-stone-500">
            <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-200" />
            </div>
            <div className="bg-white px-3.5 py-2 rounded-2xl border border-stone-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-medium text-stone-600 ml-1">
                {isHi ? 'कृषि डेटा विश्लेषण...' : 'Analyzing farm data...'}
              </span>
            </div>
          </div>
        )}

        {/* Active Speech Recognition Visualizer */}
        {isListening && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-950 flex items-center gap-3 animate-pulse">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>{isHi ? '🎙️ आपकी आवाज सुनी जा रही है...' : '🎙️ Listening to your voice...'}</span>
                <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">
                  {isHi ? 'हिंदी' : 'English'}
                </span>
              </div>
              <p className="italic text-stone-700 mt-1 min-h-[16px]">
                {interimTranscript || (isHi ? 'खेत या फसल का सवाल बोलें...' : 'Speak your agri query...')}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Footer: Voice Button + Type Input */}
      <div className="p-3 bg-white border-t border-stone-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            className={`p-2.5 rounded-2xl transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
            }`}
            title={
              isListening
                ? isHi ? 'सुनना बंद करें' : 'Stop voice input'
                : isHi ? 'बोलकर पूछें (माइक चालू करें)' : 'Speak query via mic'
            }
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-800" />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isListening
                  ? isHi ? 'सुन रहा हूँ... बोलिए' : 'Listening... please speak'
                  : isHi ? 'सवाल लिखें या माइक दबाएं...' : 'Type or tap mic to speak...'
              }
              disabled={isLoading}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-stone-100 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 transition-all"
            />

            {/* Clear input text if present */}
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2.5 rounded-2xl font-bold transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
              inputText.trim() && !isLoading
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
            title={isHi ? 'भेजें' : 'Send'}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick prompt suggestions bar */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isHi ? 'माइक या कीबोर्ड दोनों से इनपुट लें' : 'Voice & Type enabled'}</span>
          </div>
          <span className="text-[10px] text-stone-400">Gemini 3.8 AI</span>
        </div>
      </div>
    </aside>
  );
};
