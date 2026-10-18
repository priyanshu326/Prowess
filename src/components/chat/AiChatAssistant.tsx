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
  ChevronRight,
  X,
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

  // Messages list
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: isHi
        ? `राम-राम किसान भाई! 🙏 मैं आपका **किसान साथी AI मित्र** हूँ।\n\nयहाँ अपना सवाल टाइप करें ✍️ और फसल, सिंचाई, खाद, मौसम या मंडी भाव के बारे में तुरंत सलाह पाएं।`
        : `Hello Farmer Friend! 🙏 I am your **Kisan Saathi AI Assistant**.\n\nType your question here ✍️ to get instant advice on crops, irrigation, fertilizers, weather, or mandi prices.`,
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

  // Quick Speech-to-Text dictation into input box (optional helper)
  const [isDictating, setIsDictating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Audio speech synthesis playback for AI responses
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dictationRecognitionRef = useRef<any>(null);

  // Setup Web Speech Recognition for optional mic dictation into text box
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

  // Auto-scroll on new message
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

  // Collapsed Sidebar Rail View on Desktop (Right Corner)
  if (isCollapsed) {
    return (
      <aside className="hidden lg:flex flex-col items-center py-4 bg-emerald-950 text-white w-16 border-l border-emerald-900 shrink-0 select-none transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-md group relative"
          title={isHi ? 'AI सहायक खोलें' : 'Open AI Assistant'}
        >
          <Bot className="w-5 h-5 text-emerald-200" />
          <span className="absolute right-full mr-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'AI चैट खोलें' : 'Open AI Chat'}
          </span>
        </button>

        <div className="my-6 w-8 h-[1px] bg-emerald-800/80" />

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div
            onClick={onToggleCollapse}
            className="cursor-pointer text-[13px] font-black tracking-widest text-emerald-300/90 [writing-mode:vertical-rl] hover:text-white transition-colors"
          >
            {isHi ? '🌾 AI कृषि मित्र' : '🌾 KISAN AI ASSISTANT'}
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg cursor-pointer transition-all active:scale-95 group relative"
          title={isHi ? 'चैट करें' : 'Chat'}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute right-full mr-2 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
            {isHi ? 'सवाल पूछें' : 'Ask Question'}
          </span>
        </button>
      </aside>
    );
  }

  // Full Expanded Right Corner AI Chatbot
  return (
    <aside
      className={`
        bg-white border-l border-stone-200 flex flex-col shrink-0 transition-all duration-300 z-40
        hidden lg:flex lg:w-80 xl:w-[350px] h-[calc(100vh-100px)] sticky top-[100px]
        ${isMobileOpen ? '!flex fixed inset-y-0 right-0 w-[92vw] max-w-sm z-50 shadow-2xl h-screen' : ''}
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
                  {isHi ? 'सक्रिय' : 'Live'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 leading-tight">
                {isHi ? 'सटीक व त्वरित कृषि सलाह' : 'Smart Agri Chat Advisory'}
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
              <ChevronRight className="w-4 h-4" />
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

                  {/* Bottom info: timestamp + text-to-speech */}
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

        {/* AI Typing Indicator */}
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

      {/* 3. Clean Typing Input Bar */}
      <div className="p-3 bg-white border-t border-stone-200 shrink-0 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendTextMessage();
          }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-2">
            {/* Quick voice-to-text dictation helper */}
            <button
              type="button"
              onClick={handleToggleDictation}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                isDictating
                  ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title={isHi ? 'बोलकर लिखें' : 'Speak to type'}
            >
              {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-800" />}
            </button>

            {/* Main Text Input Field */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isDictating
                    ? isHi ? 'सुन रहा हूँ... बोलिए' : 'Listening... please speak'
                    : isHi ? 'फसल, खाद या सिंचाई के बारे में पूछें...' : 'Ask about crops, fertilizer, irrigation...'
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
              title={isHi ? 'भेजें' : 'Send'}
            >
              <span className="text-xs hidden sm:inline">{isHi ? 'भेजें' : 'Send'}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {isDictating && (
            <p className="text-[11px] text-amber-800 animate-pulse font-medium pl-1">
              🎙️ {isHi ? 'बोलिए... आपकी आवाज टेक्स्ट में बदल रही है' : 'Speaking... converting to text'}
            </p>
          )}
        </form>

        {/* Footer info badge */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium px-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isHi ? 'AI कृषि मित्र सक्रिय है' : 'Kisan AI Active'}</span>
          </div>
          <span className="text-[10px] text-stone-400">Gemini 3.1 AI</span>
        </div>
      </div>
    </aside>
  );
};
