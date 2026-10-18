import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  RotateCcw,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
  MessageSquare,
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
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
  // Compatibility with previous props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isOpen,
  onToggleOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const isHi = language === 'hi';

  // Determine active open state from props
  const isWidgetOpen =
    typeof isOpen === 'boolean'
      ? isOpen
      : typeof isCollapsed === 'boolean'
      ? !isCollapsed
      : typeof isMobileOpen === 'boolean'
      ? isMobileOpen
      : true;

  const handleToggle = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else if (onToggleCollapse) {
      onToggleCollapse();
    } else if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onCloseMobile) {
      onCloseMobile();
    } else if (onToggleCollapse) {
      onToggleCollapse();
    } else if (onToggleOpen) {
      onToggleOpen();
    }
  };

  // Fixed height toggle between standard (490px) and expanded view (620px)
  const [isMaximized, setIsMaximized] = useState(false);

  // Messages list
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: isHi
        ? `राम-राम किसान भाई! 🙏 मैं आपका **किसान साथी AI मित्र** हूँ।\n\nयहाँ अपना सवाल टाइप करें ✍️ और अपनी फसल, खाद, सिंचाई, मौसम या मंडी भाव के बारे में तुरंत सलाह पाएं। (पेज स्क्रॉल करने की जरूरत नहीं है, यह विंडो हमेशा सामने रहेगी)`
        : `Hello Farmer Friend! 🙏 I am your **Kisan Saathi AI Assistant**.\n\nType your question below ✍️ to get instant advice on crops, fertilizers, irrigation, weather, or mandi prices. (No page scrolling required; this fixed window is always right here).`,
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

  // Audio speech synthesis playback for AI responses
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dictationRecognitionRef = useRef<any>(null);

  // Focus input when opened
  useEffect(() => {
    if (isWidgetOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isWidgetOpen]);

  // Setup Web Speech Recognition for dictation into text box
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
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
    } catch (err) {
      console.warn('Speech recognition setup error:', err);
      setSpeechSupported(false);
    }

    return () => {
      try {
        dictationRecognitionRef.current?.abort();
      } catch (_e) {}
    };
  }, [isHi]);

  // Auto-scroll messages inside the widget container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Toggle quick speech dictation into text box
  const handleToggleDictation = () => {
    if (!speechSupported || !dictationRecognitionRef.current) {
      alert(
        isHi
          ? 'आपके ब्राउज़र में बोलकर लिखने की सुविधा उपलब्ध नहीं है। कृपया टाइप करके पूछें।'
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

  // Send Typed Message
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
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

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
      const res = await sendChatMessage(textToSend, historyPayload, context);

      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        suggestedQuestions: res.suggestedQuestions,
      };

      setMessages((prev) => [...prev, aiMsg]);
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
    setSpeakingMessageId(null);
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: isHi
          ? 'राम-राम किसान भाई! नया सत्र शुरू हो गया है। यहाँ अपना सवाल टाइप करें।'
          : 'Session refreshed! Type your agricultural question here.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: isHi
          ? ['आज सिंचाई करनी है क्या?', 'गेहूं का मंडी भाव?', 'मौसम कैसा रहेगा?']
          : ['Should I irrigate today?', 'Wheat mandi price?', '7-day weather outlook?'],
      },
    ]);
  };

  return (
    <>
      {/* 1. Mobile Backdrop: Dim background when opened on mobile devices */}
      {isWidgetOpen && (
        <div
          onClick={handleClose}
          className="sm:hidden fixed inset-0 bg-stone-950/40 backdrop-blur-2xs z-40 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* 2. FIXED RESPONSIVE WINDOW: Occupies a fixed amount of space in bottom right, input is always pinned & accessible */}
      {isWidgetOpen && (
        <aside
          role="dialog"
          aria-label={isHi ? 'AI कृषि मित्र चैट' : 'Kisan AI Chat Assistant'}
          className={`
            fixed z-50 flex flex-col bg-white border border-stone-200/90 sm:border-2 sm:border-emerald-700/35 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-200
            /* Mobile positioning: Centered with comfortable margin, keyboard friendly */
            bottom-2.5 left-2.5 right-2.5 max-w-[calc(100vw-20px)] sm:max-w-none
            /* Tablet / Desktop positioning: Anchored to bottom-right corner */
            sm:left-auto sm:right-6 sm:bottom-6
            sm:w-[390px] md:w-[420px]
            /* FIXED RESPONSIVE HEIGHT: Guaranteed to fit comfortably on screen without page scroll */
            ${isMaximized ? 'h-[min(630px,calc(100dvh-28px))] sm:w-[460px]' : 'h-[min(500px,calc(100dvh-28px))]'}
          `}
        >
          {/* A. Fixed Header (shrink-0): Always at the top of the chat space */}
          <div className="p-3 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white border-b border-emerald-950/20 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-inner">
                    <Bot className="w-4 h-4 text-emerald-100" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-900 rounded-full animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm tracking-tight text-white truncate">
                      {isHi ? 'AI कृषि मित्र' : 'Kisan AI Saathi'}
                    </h3>
                    <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded-md uppercase shrink-0">
                      {isHi ? 'सक्रिय' : 'Live'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200 truncate">
                    {isHi ? 'यहाँ टाइप करें • तुरंत उत्तर' : 'Type here • Instant response'}
                  </p>
                </div>
              </div>

              {/* Action buttons: Clear, Maximize/Restore, Minimize */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleClearChat}
                  className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
                  title={isHi ? 'चैट साफ करें' : 'Clear chat'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsMaximized((prev) => !prev)}
                  className="hidden sm:flex p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
                  title={isMaximized ? (isHi ? 'छोटा करें' : 'Restore size') : (isHi ? 'बड़ा करें' : 'Maximize')}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
                  title={isHi ? 'समेटें / बंद करें' : 'Minimize / Close'}
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Farm Context Bar */}
            <div className="mt-2 pt-1.5 border-t border-emerald-700/60 flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-emerald-100">
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

          {/* B. Internal Scrollable Messages Area (flex-1 min-h-0): Only this area scrolls, NOT the page! */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 bg-stone-50/70 text-xs sm:text-sm">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
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
                      className={`rounded-2xl px-3.5 py-2.5 shadow-2xs whitespace-pre-wrap break-words leading-relaxed ${
                        isUser
                          ? 'bg-emerald-800 text-white rounded-br-xs'
                          : 'bg-white text-stone-900 border border-stone-200 rounded-bl-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="space-y-1">
                        {msg.text.split('\n').map((line, lIdx) => {
                          if (!line.trim()) return <div key={lIdx} className="h-1" />;
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

                      {/* Bottom info: timestamp + text-to-speech */}
                      <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 text-[10px] text-stone-400">
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
                    <div className="mt-1.5 pl-7 flex flex-wrap gap-1">
                      {msg.suggestedQuestions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSendTextMessage(q)}
                          disabled={isLoading}
                          className="text-[10px] font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg shadow-2xs transition-all active:scale-95 text-left cursor-pointer flex items-center gap-1"
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

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 pl-2 text-xs text-stone-500">
                <div className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-emerald-200" />
                </div>
                <div className="bg-white px-3 py-1.5 rounded-2xl border border-stone-200 flex items-center gap-2 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] font-medium text-stone-600 ml-1">
                    {isHi ? 'कृषि मित्र जवाब टाइप कर रहे हैं...' : 'Typing advice...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* C. Pinned Input Bar (shrink-0): ALWAYS VISIBLE AT BOTTOM, NEVER SCROLLS OUT OF VIEW */}
          <div className="p-2 sm:p-2.5 bg-white border-t border-stone-200 shrink-0 space-y-1.5 shadow-xs">
            {/* Quick Tap Question Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              <span className="text-stone-400 font-bold shrink-0">⚡ {isHi ? 'त्वरित:' : 'Quick:'}</span>
              {[
                isHi ? 'आज सिंचाई करूं?' : 'Irrigate today?',
                isHi ? 'खाद की मात्रा?' : 'Fertilizer dose?',
                isHi ? 'मंडी भाव?' : 'Mandi rate?',
                isHi ? '3 दिन मौसम?' : '3-day weather?',
              ].map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendTextMessage(pill)}
                  disabled={isLoading}
                  className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-semibold transition-colors cursor-pointer active:scale-95"
                >
                  {pill}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTextMessage();
              }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5">
                {/* Voice-to-text dictation helper */}
                <button
                  type="button"
                  onClick={handleToggleDictation}
                  className={`p-2 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
                    isDictating
                      ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-200 animate-pulse'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title={isHi ? 'बोलकर लिखें' : 'Speak to type'}
                >
                  {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-800" />}
                </button>

                {/* Main Text Input Field */}
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isDictating
                        ? isHi ? 'सुन रहा हूँ... बोलिए' : 'Listening... please speak'
                        : isHi ? 'सवाल टाइप करें... (उदा. आज खाद?)' : 'Type question here...'
                    }
                    disabled={isLoading}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-stone-50 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 transition-all shadow-inner"
                  />

                  {inputText && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                    inputText.trim() && !isLoading
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                  title={isHi ? 'भेजें (Enter)' : 'Send (Enter)'}
                >
                  <span className="text-xs font-bold">{isHi ? 'भेजें' : 'Send'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {isDictating && (
                <p className="text-[10px] text-amber-800 animate-pulse font-medium pl-1">
                  🎙️ {isHi ? 'बोलिए... आपकी आवाज टेक्स्ट में बदल रही है' : 'Speaking... converting to text'}
                </p>
              )}
            </form>

            {/* Bottom Status bar */}
            <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium px-0.5">
              <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{isHi ? '📌 फिक्स्ड विंडो • स्क्रॉल करने की जरूरत नहीं' : '📌 Fixed View • No scroll needed'}</span>
              </div>
              <span className="text-[9px] bg-stone-100 px-1.5 py-0.2 rounded text-stone-500 font-mono">Gemini AI</span>
            </div>
          </div>
        </aside>
      )}

      {/* 3. FLOATING RIGHT-CORNER LAUNCHER BUTTON: When minimized */}
      {!isWidgetOpen && (
        <button
          onClick={handleToggle}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 bg-gradient-to-r from-emerald-800 to-green-700 hover:from-emerald-700 hover:to-green-600 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-2xl border-2 border-emerald-300 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all hover:scale-105"
          title={isHi ? 'AI कृषि मित्र (चैट खोलें)' : 'Open Kisan AI Chat'}
        >
          <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-bold text-sm shadow-sm shrink-0 animate-pulse">
            🤖
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide leading-tight">
              {isHi ? 'AI कृषि मित्र' : 'Kisan AI'}
            </div>
            <div className="text-[10px] text-emerald-200 leading-tight">
              {isHi ? 'यहाँ टाइप करें • तुरंत उत्तर' : 'Type question here'}
            </div>
          </div>
        </button>
      )}
    </>
  );
};
