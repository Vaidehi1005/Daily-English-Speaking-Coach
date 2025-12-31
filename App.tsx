
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AppState, Topic } from './types';
import { TOPICS, COACH_SYSTEM_INSTRUCTION } from './constants';
import { Button } from './components/Button';
import { TopicCard } from './components/TopicCard';
import { encode, decode, decodeAudioData, createBlob } from './utils/audioHelpers';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [timer, setTimer] = useState(0);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts & Sessions
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const startSession = async () => {
    if (!selectedTopic) return;

    try {
      setAppState(AppState.PREPARING);
      setError(null);
      setTranscription([]);
      setTimer(0);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `${COACH_SYSTEM_INSTRUCTION}\n\nThe topic for today is: ${selectedTopic.title}. ${selectedTopic.description}`,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setAppState(AppState.SPEAKING);
            
            // Microphone stream to model
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
            
            // Start local timer
            timerIntervalRef.current = window.setInterval(() => {
              setTimer(prev => prev + 1);
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio output from model
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              setIsCoachSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsCoachSpeaking(false);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscription(prev => [...prev, `User: ${text}`]);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscription(prev => [...prev, `Coach: ${text}`]);
            }

            // Handling interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsCoachSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('API Error:', e);
            setError('There was an issue with the connection. Please try again.');
            stopSession();
          },
          onclose: () => {
            console.log('Session closed');
            setAppState(AppState.REVIEWING);
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start the coach.');
      setAppState(AppState.IDLE);
    }
  };

  const stopSession = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
    }
    setAppState(AppState.REVIEWING);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setSelectedTopic(null);
    setTranscription([]);
    setTimer(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            L
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">LinguistAI</h1>
        </div>
        <div className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
          Personal English Coach
        </div>
      </header>

      <main className="w-full max-w-4xl flex-grow">
        {appState === AppState.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Master English Speaking</h2>
              <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">
                Choose a topic, give a short speech, and receive professional coaching on your pronunciation and grammar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {TOPICS.map(topic => (
                <TopicCard 
                  key={topic.id} 
                  topic={topic} 
                  onSelect={setSelectedTopic} 
                  isSelected={selectedTopic?.id === topic.id}
                />
              ))}
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={startSession} 
                disabled={!selectedTopic}
                className="w-full md:w-64 py-4 text-lg"
              >
                Start Practice
              </Button>
            </div>
            {error && <p className="text-red-500 text-center mt-4 text-sm font-medium">{error}</p>}
          </div>
        )}

        {appState === AppState.SPEAKING && (
          <div className="flex flex-col items-center gap-8">
            <div className="w-full glass-panel rounded-3xl p-8 shadow-xl text-center">
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">Practice Session</span>
                <span className="text-2xl font-mono font-bold text-gray-800">{formatTime(timer)}</span>
              </div>

              <div className="relative mb-10 inline-block">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isCoachSpeaking ? 'bg-indigo-100' : 'bg-red-50'}`}>
                   {isCoachSpeaking ? (
                      <div className="flex gap-1 items-end h-8">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 100}%` }}></div>
                        ))}
                      </div>
                   ) : (
                      <div className="w-16 h-16 bg-red-500 rounded-full speaking-pulse flex items-center justify-center text-white">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                      </div>
                   )}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isCoachSpeaking ? "Coach is giving feedback..." : "Your Turn: Start Speaking"}
              </h3>
              <p className="text-gray-500 mb-8">Topic: {selectedTopic?.title}</p>

              <div className="flex gap-4 justify-center">
                <Button variant="danger" onClick={stopSession} className="px-10">Finish & Review</Button>
              </div>
            </div>

            <div className="w-full glass-panel rounded-2xl p-6 h-48 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Live Transcription</h4>
              <div className="space-y-3">
                {transcription.length === 0 && <p className="text-gray-400 text-sm italic">Listening...</p>}
                {transcription.map((t, i) => (
                  <p key={i} className={`text-sm ${t.startsWith('Coach:') ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}>{t}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {appState === AppState.REVIEWING && (
          <div className="animate-in zoom-in-95 duration-500">
            <div className="glass-panel rounded-3xl p-8 shadow-2xl mb-8">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-gray-900">Session Review</h2>
                  <p className="text-gray-500">Practice completed on {selectedTopic?.title}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-indigo-600">{formatTime(timer)}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase">Duration</div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                    The Conversation Flow
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                    {transcription.map((t, i) => (
                      <div key={i} className={`flex gap-3 ${t.startsWith('Coach:') ? 'bg-white p-4 rounded-xl shadow-sm border border-indigo-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${t.startsWith('Coach:') ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {t.startsWith('Coach:') ? 'AI' : 'YOU'}
                        </div>
                        <p className={`text-sm leading-relaxed ${t.startsWith('Coach:') ? 'text-indigo-800' : 'text-gray-600'}`}>
                          {t.split(': ').slice(1).join(': ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                    <h4 className="font-bold text-green-900 mb-2">Practice Again?</h4>
                    <p className="text-green-800 text-sm mb-4">Repetition is the key to mastery. Would you like to try the same topic or explore something new?</p>
                    <Button onClick={resetApp} variant="primary" className="w-full">New Session</Button>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 mb-2">Coach's Advice</h4>
                    <p className="text-indigo-800 text-sm">Review the highlighted speech bubble above to see LinguistAI's detailed breakdown of your pronunciation and grammar.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-4xl py-8 mt-12 border-t border-gray-200 text-center text-gray-400 text-sm">
        <p>&copy; 2024 LinguistAI Speaking Coach. Powered by Gemini 2.5.</p>
      </footer>
    </div>
  );
};

export default App;
