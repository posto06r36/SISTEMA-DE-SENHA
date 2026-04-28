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
  LayoutDashboard,
  VolumeX,
  Volume2,
  ExternalLink,
  Video,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, TicketType } from './types';

type View = 'kiosk' | 'display' | 'attendant';

export default function App() {
  const [view, setView] = useState<View>('kiosk');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

    const typeStr = ticket.type.includes('Prioritário') ? 'Prioritária' : 'Normal';
    const sectorName = ticket.type.startsWith('CU') ? 'de Cadastro Único' : 'de Identificação';
    
    const numStr = String(ticket.number).padStart(3, '0').split('').join(' ');
    
    let location = ticket.counter || 'atendimento';
    if (location === 'Sala 1') {
      location = `Setor de Cadastro Único, Sala 1`;
    } else if (location === 'Sala 2') {
      location = `Setor de Identificação, Sala 2`;
    }
    
    let text = `Atenção, senha ${sectorName}, ${typeStr} número ${numStr}. Por favor, dirija-se ao ${location}.`;
    
    if (ticket.citizenName && ticket.citizenName.trim() !== '') {
      text = `Atenção, ${ticket.citizenName}. Senha ${sectorName}, ${typeStr} número ${numStr}. Por favor, dirija-se ao ${location}.`;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.8;
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

  // Polling for tickets
  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 1500); // Increased frequency for better responsiveness
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

  const generateTicket = async (type: TicketType) => {
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
}: any) => (
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
                generateTicket(selectedSector === 'CU' ? 'CU - Normal' : 'ID - Normal');
                setSelectedSector(null);
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
                generateTicket(selectedSector === 'CU' ? 'CU - Prioritário' : 'ID - Prioritário');
                setSelectedSector(null);
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

const DisplayView = ({ 
  tickets, 
  audioEnabled, 
  setAudioEnabled, 
  volume, 
  setVolume, 
  lastCalled, 
  openInNewWindow 
}: any) => {
  const history = tickets
    .filter((t: Ticket) => t.status === 'calling' || t.status === 'finished')
    .slice(0, 6);

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
          <div>
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
                Para que o sistema de voz funcione, clique no botão abaixo para ativar.
              </p>
            </div>
            
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
                <Volume2 className="w-6 h-6 text-blue-400" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-8">{(volume * 100).toFixed(0)}%</span>
              </div>

              <button 
                onClick={() => {
                  setAudioEnabled(true);
                  // Play a quick test sound
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
                ATIVAR ÁUDIO E PAINEL
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Main Calling Section - Centered Full Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-900 to-blue-950 relative">
        {/* Logo background watermark */}
        <img 
          src="https://saovicenteferrer.pe.gov.br/wp-content/uploads/2024/05/logo.png" 
          alt="Logo" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vh] opacity-5 pointer-events-none brightness-0 invert"
          referrerPolicy="no-referrer"
        />

        <AnimatePresence mode="wait">
          {lastCalled ? (
            <motion.div 
              key={`${lastCalled.id}-${lastCalled.calledAt ? new Date(lastCalled.calledAt).getTime() : 0}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center space-y-12 z-10 w-full"
            >
              <div className="text-4xl uppercase tracking-[0.5em] text-white/40 font-black">Senha Atual</div>
              <div className="text-[28vw] font-black leading-none tracking-tighter text-white drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)]">
                {lastCalled.type.includes('Prioritário') ? 'P' : 
                 lastCalled.type.startsWith('CU') ? 'C' :
                 lastCalled.type.startsWith('ID') ? 'I' : 'N'}
                {String(lastCalled.number).padStart(3, '0')}
              </div>
              
              {lastCalled.citizenName && lastCalled.citizenName.trim() !== "" && (
                <div className="bg-blue-600 px-16 py-8 rounded-[3rem] border border-blue-400 shadow-[0_0_50px_rgba(37,99,235,0.4)] inline-block">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 mb-2">Cidadão</div>
                  <div className="text-7xl font-black text-white uppercase tracking-tight">
                    {lastCalled.citizenName}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-12">
                <div className="h-1.5 w-48 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl text-blue-400 font-bold tracking-[0.3em] uppercase mb-4 opacity-70 leading-tight">
                    {lastCalled.type.startsWith('CU') ? 'Setor Cadastro Único' : 'Setor de Identificação'}
                  </div>
                  <div className="text-9xl font-black text-blue-200 drop-shadow-lg leading-none">
                    {lastCalled.counter}
                  </div>
                </div>
                <div className="h-1.5 w-48 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
              </div>
              <div className="text-4xl font-bold text-slate-400 uppercase tracking-[0.3em] opacity-50">
                {lastCalled.type.includes('Prioritário') ? 'Prioritário' : 'Normal'}
              </div>
            </motion.div>
          ) : (
            <div className="text-slate-700 text-5xl font-black uppercase tracking-[0.2em] flex flex-col items-center gap-12 z-10 opacity-20">
              <Bell className="w-32 h-32 animate-bounce" />
              Aguardando...
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Discrete History Bar */}
      <div className="h-[200px] bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex items-center px-12 gap-8 overflow-hidden z-20">
        <div className="flex flex-col items-center justify-center text-blue-400 border-r border-slate-800 pr-8 h-full">
          <History className="w-8 h-8 mb-2" />
          <span className="uppercase tracking-[0.2em] text-[10px] font-black">Histórico</span>
        </div>
        
        <div className="flex-1 flex gap-6 overflow-x-auto no-scrollbar py-4">
          {history.length > 1 ? history.slice(1, 6).map((t: Ticket, idx: number) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-shrink-0 flex flex-col items-center justify-center px-10 py-6 rounded-3xl border-2 bg-slate-900/50 border-slate-800 min-w-[250px]"
            >
              <div className="text-4xl font-black text-slate-400">
                {t.type.includes('Prioritário') ? 'P' : 
                 t.type.startsWith('CU') ? 'C' :
                 t.type.startsWith('ID') ? 'I' : 'N'}
                {String(t.number).padStart(3, '0')}
              </div>
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-2">{t.counter}</div>
            </motion.div>
          )) : (
            <div className="flex-1 flex items-center justify-center text-slate-700 text-sm font-bold uppercase tracking-widest opacity-20">
              Nenhuma senha anterior
            </div>
          )}
        </div>

        <div className="border-l border-slate-800 pl-8 flex flex-col items-end justify-center h-full space-y-2">
          <div className="text-white text-5xl font-black tracking-tighter tabular-nums">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black tracking-widest uppercase">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            Sistema Online
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
          <div>
            <h2 className="font-bold text-slate-900 uppercase">
              {counterName === 'Sala 1' ? 'Setor Cadastro Único' : 
               counterName === 'Sala 2' ? 'Setor de Identificação' : 
               'Setor de Atendimento'}
            </h2>
            <p className="text-xs text-slate-500">Sistema de Atendimento</p>
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

      <main className="flex-1 p-8 grid grid-cols-12 gap-8 max-w-7xl mx-auto w-full">
        {/* Active Call */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
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
                    {myCurrentTicket.type === 'Prioritário' ? 'P' : 
                     myCurrentTicket.type === 'Cadastro Único' ? 'C' :
                     myCurrentTicket.type === 'Identificação' ? 'I' : 'N'}
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
                        // Small optimization: we can clear current ticket locally too if we want immediate feedback
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
      </main>
    </div>
  );
};
