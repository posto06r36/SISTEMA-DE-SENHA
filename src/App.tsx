/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
// Removed Firebase imports
import { 
  Ticket as TicketIcon, 
  Monitor, 
  UserCheck, 
  PlusCircle, 
  Bell, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  History,
  Calendar,
  LayoutDashboard,
  VolumeX,
  Volume2,
  ExternalLink,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, TicketType } from './types';

type View = 'kiosk' | 'display' | 'attendant';

export default function App() {
  const [view, setView] = useState<View>('kiosk');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [settings, setSettings] = useState<any>({ lastNumber: 0 });
  const [loading, setLoading] = useState(true);
  const [lastCalled, setLastCalled] = useState<Ticket | null>(null);
  const [announcedTicketId, setAnnouncedTicketId] = useState<string | null>(null);
  const [counterName, setCounterName] = useState('Sala 1');
  const [isMesaSelected, setIsMesaSelected] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState<Ticket | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [lastAnnouncedAt, setLastAnnouncedAt] = useState<number>(0);
  const [draftName, setDraftName] = useState('');

  // Auth listener removed as we use simple password
  useEffect(() => {
    // Check for view in URL
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as View;
    if (urlView && ['kiosk', 'display', 'attendant'].includes(urlView)) {
      setView(urlView);
    }

    // Just to simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedSector, setSelectedSector] = useState<'CU' | 'ID' | null>(null);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === '1234') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Senha incorreta');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsMesaSelected(false);
    setAccessCode('');
    setLoginPassword('');
  };

  const speakTicket = (ticket: Ticket) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Split numbers for clearer articulation (e.g. "0 0 1" instead of "um")
    const numStr = String(ticket.number).padStart(3, '0').split('').join(' ');
    
    let location = ticket.counter || 'atendimento';
    if (location === 'Sala 1') {
      location = `Sala 1, Cadastro Único`;
    } else if (location === 'Sala 2') {
      location = `Sala 2, Identificação`;
    }
    
    // Construct speech text
    let text = "";
    if (ticket.citizenName && ticket.citizenName.trim() !== '') {
      text = `Chamando ${ticket.citizenName}. Senha número ${numStr}. Compareça à ${location}.`;
    } else {
      text = `Atenção. Senha número ${numStr}. Compareça à ${location}.`;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.85; // Slightly slower for better clarity
    utterance.pitch = 1;
    utterance.volume = volume;

    // Ensure we find a Portuguese voice if possible
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt-PT'));
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  };

  const playChime = (type: 'call' | 'silence') => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;
      
      if (type === 'call') {
        // Professional "Ding-Dong"
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.3 * volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.8);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(698.46, now + 0.4);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.3 * volume, now + 0.4);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.4);
        osc2.stop(now + 1.2);
      } else {
        [0, 0.15, 0.3].forEach(delay => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now + delay);
          gain.gain.setValueAtTime(0.15 * volume, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        });
      }
    } catch (err) {
      console.error("Audio synthesis error:", err);
    }
  };

  const playAnnouncement = (ticket: Ticket) => {
    if (!audioEnabled) return;
    
    playChime('call');
    // Wait for the chime to finish before speaking
    setTimeout(() => speakTicket(ticket), 1500);
  };

  const requestSilence = () => {
    if (!('speechSynthesis' in window)) return;
    
    playChime('silence');

    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Por favor, silêncio no ambiente de atendimento.");
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.volume = volume;
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt-PT'));
      if (ptVoice) utterance.voice = ptVoice;
      window.speechSynthesis.speak(utterance);
    }, 800);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
    }
  };

  // Polling for tickets and settings
  useEffect(() => {
    fetchTickets();
    fetchSettings();
    const interval = setInterval(() => {
      fetchTickets();
      fetchSettings();
    }, 1500); 
    return () => clearInterval(interval);
  }, []);

  // Track the most recently called ticket for the display
  useEffect(() => {
    // Find all tickets currently being called
    const callingTickets = tickets.filter(t => t.status === 'calling');
    
    // Sort by calledAt descending to find the absolute latest call (including "Call Again" updates)
    const latestCall = [...callingTickets].sort((a, b) => {
      const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
      const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
      return timeB - timeA;
    })[0];
    
    if (latestCall) {
      const ticketCalledAt = latestCall.calledAt ? new Date(latestCall.calledAt).getTime() : 0;

      // Update lastCalled for UI display if it's a different ticket OR a re-call of the same ticket
      const lastCalledTime = lastCalled?.calledAt ? new Date(lastCalled.calledAt).getTime() : 0;
      if (!lastCalled || lastCalled.id !== latestCall.id || lastCalledTime !== ticketCalledAt) {
        setLastCalled(latestCall);
      }

      // Trigger announcement if audio is enabled and this specific call instance hasn't been announced
      if (audioEnabled && (announcedTicketId !== latestCall.id || lastAnnouncedAt !== ticketCalledAt)) {
        setAnnouncedTicketId(latestCall.id || null);
        setLastAnnouncedAt(ticketCalledAt);
        playAnnouncement(latestCall);
      }
    } else {
      // Reset if no one is being called
      if (lastCalled !== null) setLastCalled(null);
      if (announcedTicketId !== null) setAnnouncedTicketId(null);
      if (lastAnnouncedAt !== 0) setLastAnnouncedAt(0);
    }
  }, [tickets, audioEnabled, lastCalled, announcedTicketId, lastAnnouncedAt]);

  const generateTicket = async (type: TicketType, citizenName?: string) => {
    try {
      // 1. Get settings
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      
      const today = new Date().toISOString().split('T')[0];
      let nextNumber = 1;
      
      if (settings.lastDate === today) {
        nextNumber = (parseInt(settings.lastNumber) || 0) + 1;
      }

      // 2. Update settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastNumber: nextNumber, lastDate: today })
      });

      // 3. Create ticket
      const ticketData = {
        type,
        number: nextNumber,
        status: 'waiting',
        citizenName: citizenName || '',
        createdAt: new Date().toISOString()
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar senha no servidor');
      }

      const createdTicket = await res.json();
      
      if (!createdTicket.number) {
        throw new Error('Servidor não retornou o número da senha');
      }

      // Map back to Ticket interface for UI
      const uiTicket = {
        ...createdTicket,
        number: Number(createdTicket.number)
      };

      setShowNewTicketModal(uiTicket);
      setTimeout(() => setShowNewTicketModal(null), 5000);
    } catch (error: any) {
      console.error("Error generating ticket:", error);
      alert("Erro ao gerar senha: Verifique se as chaves do Google estão configuradas corretamente.\n\nDetalhe: " + error.message);
    }
  };

  const callNext = async (citizenName?: string) => {
    const nextTicket = [...tickets]
      .filter(t => t.status === 'waiting')
      .sort((a, b) => {
        if (a.type === 'Prioritário' && b.type === 'Normal') return -1;
        if (a.type === 'Normal' && b.type === 'Prioritário') return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];

    if (nextTicket && nextTicket.id) {
      setAnnouncedTicketId(null);
      await fetch(`/api/tickets/${nextTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'calling',
          counter: counterName,
          citizenName: citizenName || "",
          calledAt: new Date().toISOString()
        })
      });
      fetchTickets();
    }
  };

  const callAgain = async (citizenName?: string) => {
    const current = tickets.find(t => t.status === 'calling' && t.counter === counterName);
    if (current && current.id) {
      const updates: any = {
        calledAt: new Date().toISOString()
      };
      if (citizenName && citizenName.trim() !== "") {
        updates.citizenName = citizenName;
      }
      
      await fetch(`/api/tickets/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchTickets();
    }
  };

  const finishTicket = async (id: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'finished',
        finishedAt: new Date().toISOString()
      })
    });
  };

  const cancelTicket = async (id: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'canceled'
      })
    });
  };

  const openInNewWindow = (v: View) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', v);
    window.open(url.toString(), '_blank', 'width=1280,height=720');
  };

  // --- NAVIGATION ---

  return (
    <div className="font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* View Switcher (Floating for Demo) - Hidden in DisplayView */}
      {view !== 'display' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-zinc-200 rounded-full px-2 py-2 shadow-2xl z-[100] flex gap-1">
          <button 
            onClick={() => setView('kiosk')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === 'kiosk' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            Totem
          </button>
          <button 
            onClick={() => setView('display')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === 'display' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            Painel TV
          </button>
          <button 
            onClick={() => openInNewWindow('display')}
            className="px-3 py-2 rounded-full text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1"
            title="Abrir em nova janela para segunda tela"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-[10px]">Janela</span>
          </button>
          <button 
            onClick={() => setView('attendant')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === 'attendant' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
          >
            Atendimento
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-screen flex items-center justify-center bg-zinc-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-900 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {view === 'kiosk' && (
            <KioskView 
              selectedSector={selectedSector}
              setSelectedSector={setSelectedSector}
              generateTicket={generateTicket}
              showNewTicketModal={showNewTicketModal}
              setShowNewTicketModal={setShowNewTicketModal}
            />
          )}
          {view === 'display' && (
            <DisplayView 
              tickets={tickets}
              settings={settings}
              audioEnabled={audioEnabled}
              setAudioEnabled={setAudioEnabled}
              volume={volume}
              setVolume={setVolume}
              lastCalled={lastCalled}
              openInNewWindow={openInNewWindow}
            />
          )}
          {view === 'attendant' && (
            <AttendantView 
              isAuthenticated={isAuthenticated}
              login={login}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              loginError={loginError}
              logout={logout}
              isMesaSelected={isMesaSelected}
              setIsMesaSelected={setIsMesaSelected}
              counterName={counterName}
              setCounterName={setCounterName}
              accessCode={accessCode}
              setAccessCode={setAccessCode}
              accessError={accessError}
              setAccessError={setAccessError}
              tickets={tickets}
              settings={settings}
              fetchSettings={fetchSettings}
              draftName={draftName}
              setDraftName={setDraftName}
              callNext={callNext}
              callAgain={callAgain}
              finishTicket={finishTicket}
              cancelTicket={cancelTicket}
              requestSilence={requestSilence}
            />
          )}
        </>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS (Extracted for Stability) ---

const KioskView = ({ 
  selectedSector, 
  setSelectedSector, 
  generateTicket, 
  showNewTicketModal, 
  setShowNewTicketModal 
}: any) => {
  const [userName, setUserName] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full text-center space-y-8 border border-slate-200">
        <div className="flex justify-center">
          <img 
            src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
            alt="Prefeitura de São Vicente Férrer" 
            className="h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="space-y-2 text-left">
          <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Seu Nome (Opcional)</label>
          <input 
            type="text" 
            placeholder="Digite seu nome aqui..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl font-bold outline-none transition-all text-lg placeholder:font-normal placeholder:opacity-50"
          />
        </div>

        {!selectedSector ? (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Atendimento ao Cidadão</h1>
              <p className="text-slate-500 font-medium">Selecione o setor de atendimento</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 pt-4">
              <button 
                onClick={() => setSelectedSector('CU')}
                className="group relative flex flex-col items-center justify-center p-12 bg-green-600 border-2 border-green-600 rounded-[2.5rem] hover:bg-green-700 transition-all duration-300 text-white shadow-xl hover:shadow-green-200 active:scale-95"
              >
                <LayoutDashboard className="w-16 h-16 mb-4" />
                <span className="block text-2xl font-black uppercase tracking-widest">Cadastro Único</span>
              </button>

              <button 
                onClick={() => setSelectedSector('ID')}
                className="group relative flex flex-col items-center justify-center p-12 bg-amber-500 border-2 border-amber-500 rounded-[2.5rem] hover:bg-amber-600 transition-all duration-300 text-white shadow-xl hover:shadow-amber-200 active:scale-95"
              >
                <UserCheck className="w-16 h-16 mb-4" />
                <span className="block text-2xl font-black uppercase tracking-widest">Identificação</span>
              </button>
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedSector(null)}
                className="flex items-center gap-2 text-blue-600 font-bold hover:underline mb-4"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Voltar
              </button>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {selectedSector === 'CU' ? 'Cadastro Único' : 'Identificação'}
              </h1>
              <p className="text-slate-500 font-medium">Selecione o tipo de atendimento abaixo</p>
            </div>

            <div className="grid gap-4 pt-4">
              <button 
                onClick={() => {
                  generateTicket(selectedSector === 'CU' ? 'CU - Normal' : 'ID - Normal', userName);
                  setSelectedSector(null);
                  setUserName('');
                }}
                className="group relative flex items-center justify-between p-8 bg-white border-4 border-slate-200 rounded-3xl hover:border-blue-600 hover:bg-blue-50 transition-all duration-300 text-left active:scale-95"
              >
                <div>
                  <span className="block text-2xl font-black text-slate-900 uppercase">Atendimento Normal</span>
                  <span className="text-slate-500 font-medium">Fila convencional d{selectedSector === 'CU' ? 'o Cadastro Único' : 'a Identificação'}</span>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </button>

              <button 
                onClick={() => {
                  generateTicket(selectedSector === 'CU' ? 'CU - Prioritário' : 'ID - Prioritário', userName);
                  setSelectedSector(null);
                  setUserName('');
                }}
                className="group relative flex items-center justify-between p-8 bg-blue-900 border-4 border-blue-900 rounded-3xl hover:bg-blue-800 transition-all duration-300 text-left text-white shadow-xl active:scale-95"
              >
                <div>
                  <span className="block text-2xl font-black uppercase">Atendimento Prioritário</span>
                  <span className="text-blue-200 font-medium opacity-80">Idosos, gestantes e pessoas com deficiência</span>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-white group-hover:text-blue-900 transition-all">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </div>
      <AnimatePresence>
        {showNewTicketModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-50"
          >
            <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-2xl text-center space-y-6 border-4 border-zinc-900">
              <div className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Sua Senha</div>
              <div className="text-8xl font-black text-slate-900">
                {showNewTicketModal.type.includes('Prioritário') ? 'P' : 
                 showNewTicketModal.type.startsWith('CU') ? 'C' :
                 showNewTicketModal.type.startsWith('ID') ? 'I' : 'N'}
                {String(showNewTicketModal.number).padStart(3, '0')}
              </div>
              <div className="text-zinc-900 font-bold text-lg">
                {showNewTicketModal.type.startsWith('CU') ? 'Cadastro Único' : 'Identificação'} - {showNewTicketModal.type.includes('Prioritário') ? 'Prioritário' : 'Normal'}
              </div>
              {showNewTicketModal.citizenName && (
                <div className="bg-slate-100 py-3 px-4 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cidadão</div>
                  <div className="text-xl font-black text-slate-700 uppercase tracking-tight">{showNewTicketModal.citizenName}</div>
                </div>
              )}
              <p className="text-zinc-400 text-sm italic">Aguarde ser chamado no painel</p>
              <button 
                onClick={() => setShowNewTicketModal(null)}
                className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DisplayView = ({ 
  tickets, 
  settings,
  audioEnabled, 
  setAudioEnabled, 
  volume, 
  setVolume, 
  openInNewWindow 
}: any) => {
  const history = tickets
    .filter((t: Ticket) => t.status === 'calling' || t.status === 'finished')
    .slice(0, 6);

  // Consideramos como chamada ativa APENAS as que estão com status 'calling'
  const activeTicket = history.find((t: Ticket) => t.status === 'calling');
  const lastCalledForStandby = history[0];

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden text-white">
      {/* Header Discrete */}
      <div className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-10 z-20">
        <div className="flex items-center gap-4">
          <img 
            src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
            alt="Logo" 
            className="h-10 brightness-0 invert opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="flex flex-col">
            <h1 className="text-white font-black tracking-widest text-lg uppercase leading-none">Prefeitura Municipal</h1>
            <p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.3em]">São Vicente Férrer</p>
          </div>
        </div>
        <button 
          onClick={() => openInNewWindow('display')}
          className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all group"
          title="Abrir em nova janela"
        >
          <ExternalLink className="w-5 h-5 text-white/50 group-hover:text-white" />
        </button>
      </div>

      {!audioEnabled && (
        <div className="absolute inset-0 z-[110] bg-blue-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center space-y-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/5 p-10 rounded-[3rem] border border-white/10 space-y-8 max-w-lg"
          >
            <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
              <Volume2 className="w-12 h-12 text-blue-500" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight">Iniciar Painel</h2>
              <p className="text-blue-200 text-lg leading-relaxed">
                Clique no botão abaixo para ativar os recursos visuais e sonoros do painel.
              </p>
            </div>
            
            <button 
              onClick={() => {
                setAudioEnabled(true);
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  const osc = ctx.createOscillator();
                  const g = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(440, ctx.currentTime);
                  g.gain.setValueAtTime(0.1, ctx.currentTime);
                  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                  osc.connect(g);
                  g.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.2);
                }
              }}
              className="w-full py-8 bg-blue-600 text-white rounded-[2rem] font-black text-2xl hover:bg-blue-500 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95"
            >
              <Play className="w-8 h-8 fill-current" />
              ABRIR PAINEL
            </button>
          </motion.div>
        </div>
      )}
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-gradient-to-br from-slate-900 to-blue-950 relative overflow-hidden">
        
        <img 
          src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
          alt="Logo" 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50vh] pointer-events-none brightness-0 invert transition-opacity duration-1000 ${activeTicket ? 'opacity-5' : 'opacity-20'}`}
          referrerPolicy="no-referrer"
        />

        <AnimatePresence mode="wait">
          {activeTicket ? (
            <motion.div 
              key={`${activeTicket.id}-${activeTicket.calledAt}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center flex flex-col items-center justify-center z-10 w-full max-h-full py-4"
            >
              <div className="text-[3vmin] md:text-3xl uppercase tracking-[0.5em] text-white/50 font-black drop-shadow-lg mb-[1vh]">Chamada Atual</div>
              
              <div className="text-[25vmin] leading-[0.8] font-black tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-[2vh]">
                {activeTicket.type.includes('Prioritário') ? 'P' : 
                 activeTicket.type.startsWith('CU') ? 'C' :
                 activeTicket.type.startsWith('ID') ? 'I' : 'N'}
                {String(activeTicket.number).padStart(3, '0')}
              </div>
              
              {activeTicket.citizenName && activeTicket.citizenName.trim() !== "" && (
                <div className="bg-white/10 backdrop-blur-md px-[6vw] py-[2vh] rounded-[2rem] md:rounded-[3rem] border-2 md:border-4 border-blue-500 shadow-[0_0_80px_rgba(37,99,235,0.4)] inline-block mb-[2vh] max-w-[90%]">
                  <div className="text-[2vmin] md:text-lg font-black uppercase tracking-[0.5em] text-blue-400 mb-1">Cidadão</div>
                  <div className="text-[7vmin] leading-tight font-black text-white uppercase tracking-tight break-words">
                    {activeTicket.citizenName}
                  </div>
                </div>
              )}

              <div className="text-[4vmin] md:text-5xl font-black text-white tracking-widest bg-blue-600 px-[5vw] py-[1.5vh] rounded-full inline-flex items-center gap-4 md:gap-6 shadow-2xl border-b-8 border-blue-800">
                <ArrowRight className="w-[4vmin] h-[4vmin]" />
                {activeTicket.counter || 'Atendimento'}
              </div>
            </motion.div>
          ) : lastCalledForStandby ? (
            <motion.div 
              key="standby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center z-10 p-8 md:p-16 bg-black/60 backdrop-blur-3xl rounded-[3rem] md:rounded-[5rem] border-4 border-white/10 shadow-2xl"
            >
              <div className="text-xl md:text-2xl uppercase tracking-[0.3em] text-white/50 font-bold mb-4 md:mb-8">Última Chamada</div>
              <div className="text-[20vmin] font-black text-white mb-4 md:mb-8 leading-none tracking-tighter">
                {lastCalledForStandby.type.includes('Prioritário') ? 'P' : 
                 lastCalledForStandby.type.startsWith('CU') ? 'C' :
                 lastCalledForStandby.type.startsWith('ID') ? 'I' : 'N'}
                {String(lastCalledForStandby.number).padStart(3, '0')}
              </div>
              <div className="text-[5vmin] md:text-5xl font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 py-4 px-12 rounded-2xl border border-blue-500/20">
                {lastCalledForStandby.counter}
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center z-10"
            >
              <div className="text-slate-100/30 text-[6vmin] font-black uppercase tracking-[0.2em] flex flex-col items-center gap-8 md:gap-12">
                <Bell className="w-[15vmin] h-[15vmin] animate-bounce" />
                Aguardando...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Discrete History Bar */}
      <div className="h-[12vh] md:h-[18vh] bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-center px-4 md:px-12 gap-4 md:gap-8 overflow-hidden z-20">
        <div className="hidden sm:flex flex-col items-center justify-center text-blue-400 border-r border-slate-800 pr-4 md:pr-8 h-full">
          <History className="w-6 md:w-8 h-6 md:h-8 mb-1 md:mb-2" />
          <span className="uppercase tracking-[0.2em] text-[8px] md:text-[10px] font-black">Histórico</span>
        </div>
        
        <div className="flex-1 flex gap-3 md:gap-6 overflow-x-auto no-scrollbar py-2 h-full items-center">
          {history.length > 0 ? history.map((t: Ticket, idx: number) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: activeTicket?.id === t.id ? 0.3 : 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-6 md:px-10 py-3 md:py-6 rounded-2xl md:rounded-3xl border-2 transition-all ${
                activeTicket?.id === t.id ? 'bg-blue-600/10 border-blue-600/30' : 'bg-slate-800/50 border-slate-700'
              } min-w-[140px] md:min-w-[220px]`}
            >
              <div className="text-2xl md:text-4xl font-black text-white/90">
                {t.type.includes('Prioritário') ? 'P' : 
                 t.type.startsWith('CU') ? 'C' :
                 t.type.startsWith('ID') ? 'I' : 'N'}
                {String(t.number).padStart(3, '0')}
              </div>
              <div className="text-[8px] md:text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-1 md:mt-2">{t.counter}</div>
              {t.citizenName && (
                <div className="text-[7px] md:text-[9px] text-white/40 font-bold uppercase tracking-tight mt-0.5 md:mt-1 truncate max-w-[120px] md:max-w-[180px]">
                  {t.citizenName}
                </div>
              )}
            </motion.div>
          )) : (
            <div className="flex-1 flex items-center justify-center text-slate-700 text-sm font-bold uppercase tracking-widest opacity-20">
              Nenhuma senha anterior
            </div>
          )}
        </div>

        <div className="border-l border-slate-800 pl-4 md:pl-8 flex flex-col items-end justify-center h-full space-y-1 md:space-y-2 min-w-[120px] md:min-w-[200px]">
          <div className="text-white text-3xl md:text-6xl font-black tracking-tighter tabular-nums leading-none">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 text-[7px] md:text-[10px] text-slate-500 font-black tracking-widest uppercase">
            <Calendar className="w-2 md:w-3 h-2 md:h-3" />
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendantView = ({
  isAuthenticated,
  login,
  loginPassword,
  setLoginPassword,
  loginError,
  logout,
  isMesaSelected,
  setIsMesaSelected,
  counterName,
  setCounterName,
  accessCode,
  setAccessCode,
  accessError,
  setAccessError,
  tickets,
  settings,
  fetchSettings,
  draftName,
  setDraftName,
  callNext,
  callAgain,
  finishTicket,
  cancelTicket,
  requestSilence
}: any) => {
  // Filter tickets based on the room (Sala) chosen
  const waitingTickets = tickets.filter((t: Ticket) => {
    if (t.status !== 'waiting') return false;
    if (counterName === 'Sala 1') return t.type.startsWith('CU');
    if (counterName === 'Sala 2') return t.type.startsWith('ID');
    return true; 
  }).sort((a: Ticket, b: Ticket) => {
    const isAPrio = a.type.includes('Prioritário');
    const isBPrio = b.type.includes('Prioritário');
    if (isAPrio && !isBPrio) return -1;
    if (!isAPrio && isBPrio) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  
  const waitingTicketsForList = [...waitingTickets].reverse();
  const myCurrentTicket = tickets.find((t: Ticket) => t.status === 'calling' && t.counter === counterName);

  const handleAccessCode = (e: React.FormEvent) => {
    e.preventDefault();
    const codes: Record<string, string> = {
      '1010': 'Sala 1',
      '2020': 'Sala 2',
      '3030': 'Sala 3',
      '4040': 'Sala 4',
      '5050': 'Sala 5',
      '6060': 'Sala 6',
    };

    if (codes[accessCode]) {
      setCounterName(codes[accessCode]);
      setIsMesaSelected(true);
      setAccessError('');
    } else {
      setAccessError('Código de acesso inválido');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <form onSubmit={login} className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full space-y-8">
          <div className="flex justify-center">
            <img 
              src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
              alt="Logo" 
              className="h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-slate-500">Digite a senha de acesso para gerenciar o atendimento.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password"
              placeholder="Senha de Acesso"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-blue-600 rounded-2xl font-bold text-center text-2xl outline-none transition-all"
              autoFocus
            />
            {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!isMesaSelected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <form onSubmit={handleAccessCode} className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full space-y-8">
          <div className="flex justify-center">
            <img 
              src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
              alt="Logo" 
              className="h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Acesso à Sala</h2>
            <p className="text-slate-500">Digite o código da sua sala para iniciar o atendimento.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password"
              placeholder="Código de Acesso"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-blue-600 rounded-2xl font-bold text-center text-2xl outline-none transition-all"
              autoFocus
            />
            {accessError && <p className="text-red-500 text-sm font-bold">{accessError}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              Acessar Sala
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <button onClick={logout} className="text-xs text-blue-500 font-bold mt-2 hover:underline">Sair do sistema</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
            alt="Logo" 
            className="h-10 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-6">
            <div>
              <h2 className="font-bold text-slate-900 uppercase">
                {counterName === 'Sala 1' ? 'Setor Cadastro Único' : 
                 counterName === 'Sala 2' ? 'Setor de Identificação' : 
                 'Setor de Atendimento'}
              </h2>
              <p className="text-xs text-slate-500">Sistema de Atendimento</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={requestSilence}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full border border-slate-200 hover:bg-slate-200 transition-all font-bold text-sm"
          >
            <VolumeX className="w-4 h-4" />
            Por Favor, Silêncio
          </button>
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-sm text-slate-900">{counterName}</span>
            </div>
            <button 
              onClick={() => {
                setIsMesaSelected(false);
                setAccessCode('');
              }}
              className="text-[10px] font-bold text-blue-600 hover:underline border-l border-slate-300 pl-2 ml-2"
            >
              Trocar Sala
            </button>
          </div>
          <button 
            onClick={logout}
            className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full">
          <div className="grid grid-cols-12 gap-8 h-full">
            {/* Active Call */}
            <div className="col-span-12 lg:col-span-7 space-y-6 overflow-y-auto pr-2">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    Chamada Ativa
                  </h3>
                  {myCurrentTicket && (
                    <span className="px-4 py-1 bg-green-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Em Atendimento
                    </span>
                  )}
                </div>
                
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  {myCurrentTicket ? (
                    <>
                      <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Senha Sendo Atendida</div>
                      <div className="text-9xl font-black text-blue-900 mb-2">
                        {myCurrentTicket.type.includes('Prioritário') ? 'P' : 
                         myCurrentTicket.type.startsWith('CU') ? 'C' :
                         myCurrentTicket.type.startsWith('ID') ? 'I' : 'N'}
                        {String(myCurrentTicket.number).padStart(3, '0')}
                      </div>
                      {myCurrentTicket.citizenName && (
                        <div className="text-3xl font-black text-blue-600 uppercase tracking-tight mb-4 px-6 py-2 bg-blue-50 rounded-2xl border border-blue-100 italic">
                          {myCurrentTicket.citizenName}
                        </div>
                      )}

                      <div className="w-full max-w-md mb-8 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left pl-2">
                          {myCurrentTicket.citizenName ? 'Corrigir Nome' : 'Identificar Cidadão'}
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Nome do cidadão..."
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 rounded-2xl font-bold outline-none transition-all text-center"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 w-full max-w-md">
                        <button 
                          onClick={() => { callAgain(draftName); setDraftName(''); }}
                          className="flex-1 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all font-black uppercase text-xs"
                        >
                          <Bell className="w-5 h-5" />
                          Chamar Novamente
                        </button>
                        <button 
                          onClick={() => {
                            finishTicket(myCurrentTicket.id!);
                          }}
                          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Finalizar
                        </button>
                      </div>
                      <button 
                        onClick={() => cancelTicket(myCurrentTicket.id!)}
                        className="w-full max-w-md mt-4 py-3 text-slate-400 hover:text-red-600 font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar Atendimento
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-6 py-12 w-full max-w-md mx-auto">
                      <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <PlusCircle className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="space-y-4">
                        <p className="text-slate-400 font-medium">Nenhum atendimento ativo no momento</p>
                        <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Identificar Cidadão (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="Digite o nome..."
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 focus:border-blue-600 rounded-2xl font-bold outline-none transition-all text-center placeholder:font-normal placeholder:opacity-50"
                          />
                        </div>
                        <button 
                          onClick={() => { callNext(draftName); setDraftName(''); }}
                          disabled={waitingTickets.length === 0}
                          className="w-full px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
                        >
                          <ArrowRight className="w-5 h-5" />
                          Chamar Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Aguardando</div>
                  <div className="text-3xl font-black text-slate-900">{waitingTickets.length}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Prioritários</div>
                  <div className="text-3xl font-black text-blue-600">
                    {waitingTickets.filter((t: Ticket) => t.type.includes('Prioritário')).length}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Atendidos</div>
                  <div className="text-3xl font-black text-green-600">
                    {tickets.filter((t: Ticket) => t.status === 'finished' && (
                      (counterName === 'Sala 1' && t.type.startsWith('CU')) ||
                      (counterName === 'Sala 2' && t.type.startsWith('ID'))
                    )).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Queue List */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[calc(100vh-160px)]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex flex-col">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-slate-400" />
                    Fila de Espera
                  </span>
                  <span className="text-[9px] text-blue-500 uppercase tracking-tighter">
                    {counterName === 'Sala 1' ? 'Filtrado: Cadastro Único' : 
                     counterName === 'Sala 2' ? 'Filtrado: Identificação' : 'Fila Geral'}
                  </span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{waitingTickets.length} pessoas</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {waitingTicketsForList.length > 0 ? (
                  waitingTicketsForList.map((t: Ticket) => (
                    <div 
                      key={t.id}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        t.type.includes('Prioritário') ? 'bg-blue-900 border-blue-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${
                          t.type.includes('Prioritário') ? 'bg-white/10' : 'bg-slate-100'
                        }`}>
                          {t.type.includes('Prioritário') ? 'P' : 
                           t.type.startsWith('CU') ? 'C' :
                           t.type.startsWith('ID') ? 'I' : 'N'}
                        </div>
                        <div>
                          <div className="font-black text-lg leading-none">
                            {String(t.number).padStart(3, '0')}
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest ${
                            t.type.includes('Prioritário') ? 'text-white/70' : 'text-slate-400'
                          }`}>
                            {t.type.includes('Prioritário') ? 'Prioritário' : 'Normal'}
                          </div>
                          {t.citizenName && (
                            <div className={`text-[11px] font-black uppercase mt-1 truncate max-w-[150px] ${
                              t.type.includes('Prioritário') ? 'text-blue-200' : 'text-blue-600'
                            }`}>
                              {t.citizenName}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-medium opacity-50">
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                    <TicketIcon className="w-12 h-12" />
                    <p className="font-medium">Fila vazia</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
