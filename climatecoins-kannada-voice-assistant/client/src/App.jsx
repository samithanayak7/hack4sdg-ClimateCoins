import { useEffect, useRef, useState } from 'react';
import { WebSession } from '@omnidim-ai/client';
import {
  Sprout, Mic, PhoneOff, Volume2, ShieldCheck, Leaf, FileText,
  CircleHelp, ArrowRight, LoaderCircle, MessageCircle, PhoneCall,
  Languages, ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react';

const examples = [
  { icon: Leaf, text: 'ನನ್ನ ಗಿಡಗಳ ಎಲೆಗಳು ಹಳದಿಯಾಗುತ್ತಿವೆ', label: 'ಗಿಡಗಳ ಆರೋಗ್ಯ' },
  { icon: FileText, text: 'ClimateCoins ನೋಂದಣಿಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?', label: 'ನೋಂದಣಿ ಮತ್ತು ದಾಖಲೆಗಳು' },
  { icon: CircleHelp, text: 'ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್ ಅಂದರೆ ಏನು?', label: 'ಕಾರ್ಬನ್ ಕ್ರೆಡಿಟ್' }
];

export default function App() {
  const [farmerName, setFarmerName] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [muted, setMuted] = useState(false);
  const sessionRef = useRef(null);
  const transcriptRef = useRef(null);

  const active = status === 'connecting' || status === 'active';

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    try { sessionRef.current?.stop(); } catch {}
  }, []);

  async function startConversation() {
    setError('');
    setStatus('connecting');
    setMessages([]);
    try {
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerName, farmerId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not start the voice assistant.');

      const session = new WebSession();
      sessionRef.current = session;

      session.on('status', (nextStatus) => {
        if (nextStatus === 'connecting') setStatus('connecting');
        else if (nextStatus === 'active') {
          setStatus('active');
          setError('');
        } else if (nextStatus && typeof nextStatus === 'object' && nextStatus.state === 'ended') {
          setStatus('ended');
          sessionRef.current = null;
        }
      });

      session.on('transcript', (entry) => {
        if (!entry?.text) return;
        const role = entry.role === 'agent' ? 'agent' : 'farmer';
        setMessages((old) => {
          const copy = [...old];
          const last = copy[copy.length - 1];
          if (last && last.role === role && !last.final) {
            copy[copy.length - 1] = { ...last, text: entry.text, final: Boolean(entry.final) };
            return copy;
          }
          return [...copy, { role, text: entry.text, final: Boolean(entry.final) }];
        });
      });

      session.on('error', (err) => {
        console.error('OmniDimension session error:', err);
        setError('ಧ್ವನಿ ಸಂಪರ್ಕದಲ್ಲಿ ಸಮಸ್ಯೆ ಉಂಟಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. / Voice connection issue. Please try again.');
      });

      await session.start({ wsUrl: data.wsUrl });
      setStatus('active');
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setError(err?.message || 'Voice assistant could not start. Check the server configuration.');
      try { sessionRef.current?.stop(); } catch {}
      sessionRef.current = null;
    }
  }

  async function stopConversation() {
    try { await sessionRef.current?.stop(); } catch {}
    sessionRef.current = null;
    setStatus('ended');
  }

  async function toggleMute() {
    try {
      const next = !muted;
      sessionRef.current?.mute(next);
      setMuted(next);
    } catch {
      setError('Mute control is unavailable right now.');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ClimateCoins home">
          <span className="brand-mark"><Sprout size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">Climate<span>Coins</span><small>FARMER SUPPORT</small></span>
        </a>
        <div className="topbar-right">
          <span className="language-pill"><Languages size={15} /> ಕನ್ನಡ</span>
          <span className="secure-note"><ShieldCheck size={15} /> Farmer-first support</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> CLIMATECOINS FARMER HELPLINE</div>
            <h1>ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಗಳಿಗೆ<br /><em>ಧ್ವನಿಯಲ್ಲೇ ಉತ್ತರ.</em></h1>
            <p className="hero-subtitle">ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ. ಸರಳವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ. ಅಗತ್ಯವಿದ್ದರೆ FPO ತಂಡದ ಸಹಾಯ ಪಡೆಯಿರಿ.</p>
            <div className="hero-trust">
              <span><CheckCircle2 size={16} /> ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ</span>
              <span><CheckCircle2 size={16} /> ಕೃಷಿ ಮತ್ತು ನೋಂದಣಿ ಸಹಾಯ</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun"></div>
            <div className="hill hill-back"></div>
            <div className="hill hill-front"></div>
            <div className="plant plant-one"><span></span><i></i><b></b></div>
            <div className="plant plant-two"><span></span><i></i><b></b></div>
            <div className="art-caption"><Sprout size={16} /> Better support. Stronger farms.</div>
          </div>
        </section>

        <section className="workspace">
          <div className="main-column">
            <div className="section-heading">
              <div><span className="section-kicker">VOICE ASSISTANT</span><h2>ರೈತ ಸಹಾಯವಾಣಿ</h2></div>
              <span className={`status-chip ${status === 'active' ? 'live' : ''}`}><span className="status-dot" />{status === 'active' ? 'ಸಂಪರ್ಕದಲ್ಲಿದೆ' : status === 'connecting' ? 'ಸಂಪರ್ಕಿಸುತ್ತಿದೆ' : 'ಸಿದ್ಧವಾಗಿದೆ'}</span>
            </div>

            <div className="call-card">
              <div className={`voice-orb ${status === 'active' ? 'orb-active' : status === 'connecting' ? 'orb-loading' : ''}`}>
                {status === 'connecting' ? <LoaderCircle className="spin" size={37} /> : status === 'active' ? <Volume2 size={38} /> : <Mic size={38} />}
                <span className="orb-ring ring-one"></span><span className="orb-ring ring-two"></span>
              </div>
              <h3>{status === 'active' ? 'ನಿಮ್ಮ ಮಾತು ಕೇಳುತ್ತಿದ್ದೇನೆ' : status === 'connecting' ? 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…' : status === 'ended' ? 'ಸಂಭಾಷಣೆ ಮುಗಿದಿದೆ' : 'ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು?'}</h3>
              <p className="call-instructions">
                {status === 'active' ? 'ಕನ್ನಡದಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ. ಮುಗಿಸಲು End call ಒತ್ತಿ.' :
                  status === 'connecting' ? 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ಕೇಳಬಹುದು. ದಯವಿಟ್ಟು ಕಾಯಿರಿ.' :
                    'ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ, ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನೀಡಿ ಮತ್ತು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ.'}
              </p>

              {!active ? (
                <button className="primary-call-button" onClick={startConversation}>
                  <PhoneCall size={19} /> {status === 'ended' ? 'ಮತ್ತೆ ಮಾತನಾಡಿ' : 'ClimateCoins AI ಜೊತೆ ಮಾತನಾಡಿ'} <ArrowRight size={17} />
                </button>
              ) : (
                <div className="call-controls">
                  <button className="mute-button" onClick={toggleMute}><Mic size={17} /> {muted ? 'ಮೈಕ್ ಆನ್ ಮಾಡಿ' : 'ಮ್ಯೂಟ್'}</button>
                  <button className="end-button" onClick={stopConversation}><PhoneOff size={18} /> ಕರೆ ಮುಗಿಸಿ</button>
                </div>
              )}
              {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span></div>}
              <div className="call-footnote"><ShieldCheck size={15} /> ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ಮಾತ್ರ ಈ ಸಂಪರ್ಕವನ್ನು ಬಳಸಿ.</div>
            </div>

            <div className="transcript-card">
              <div className="transcript-header"><div><MessageCircle size={18} /><h3>ಸಂಭಾಷಣೆ</h3></div><span>LIVE TRANSCRIPT</span></div>
              <div className="transcript-body" ref={transcriptRef}>
                {messages.length === 0 ? (
                  <div className="empty-transcript"><div className="empty-icon"><MessageCircle size={22} /></div><p>ನೀವು ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿದಾಗ ಸಂಭಾಷಣೆ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.</p><span>Your conversation will appear here.</span></div>
                ) : messages.map((message, index) => (
                  <div key={`${index}-${message.role}`} className={`message-row ${message.role === 'farmer' ? 'from-farmer' : 'from-agent'}`}>
                    <span className="message-label">{message.role === 'farmer' ? 'ನೀವು' : 'ClimateCoins ಸಹಾಯಕ'}</span>
                    <div className="message-bubble">{message.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="side-column">
            <div className="profile-card">
              <div className="side-card-title"><span className="mini-icon"><Sprout size={17} /></span><h3>ರೈತರ ವಿವರಗಳು</h3></div>
              <p className="side-description">ಐಚ್ಛಿಕ: ನಿಮ್ಮ ವಿವರಗಳನ್ನು ನೀಡಿದರೆ ಡೆಮೊ ಸಂಭಾಷಣೆಯನ್ನು ವೈಯಕ್ತಿಕಗೊಳಿಸಬಹುದು.</p>
              <label htmlFor="farmerName">ರೈತರ ಹೆಸರು <span>Farmer name</span></label>
              <input id="farmerName" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} placeholder="ನಿಮ್ಮ ಹೆಸರು" maxLength={80} />
              <label htmlFor="farmerId">ರೈತ ID <span>Farmer ID (if available)</span></label>
              <input id="farmerId" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} placeholder="ಉದಾ. CC-F-001" maxLength={80} />
              <div className="privacy-note"><ShieldCheck size={15} /><span>ಈ ವಿವರಗಳು voice session ಆರಂಭಿಸಲು ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತವೆ. ನಿಜವಾದ ರೈತರ ಮಾಹಿತಿಯನ್ನು ಅನುಮತಿಯಿಲ್ಲದೆ ನಮೂದಿಸಬೇಡಿ.</span></div>
            </div>

            <div className="topics-card">
              <div className="side-card-title"><span className="mini-icon amber"><CircleHelp size={17} /></span><h3>ನೀವು ಕೇಳಬಹುದಾದ ವಿಷಯಗಳು</h3></div>
              <div className="topic-list">
                {examples.map(({ icon: Icon, text, label }) => (
                  <div className="topic-item" key={label}><span className="topic-icon"><Icon size={17} /></span><div><strong>{label}</strong><p>{text}</p></div><ChevronDown size={15} className="topic-chevron" /></div>
                ))}
              </div>
            </div>

            <div className="human-help-card">
              <div className="human-help-icon"><PhoneCall size={20} /></div>
              <div><strong>ಇನ್ನಷ್ಟು ಸಹಾಯ ಬೇಕೇ?</strong><p>ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಖಚಿತ ಉತ್ತರ ಸಿಗದಿದ್ದರೆ FPO ತಂಡದ ಸಹಾಯ ಕೇಳಿ.</p></div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="/"><span className="brand-mark"><Sprout size={19} /></span><span className="brand-name">Climate<span>Coins</span></span></a>
        <p>ರೈತರಿಗೆ ಸಹಾಯ · ಉತ್ತಮ ಕೃಷಿ · ಹೆಚ್ಚು ಪಾರದರ್ಶಕತೆ</p>
        <span className="footer-disclaimer">AI assistant · Verify project-specific decisions with your FPO.</span>
      </footer>
    </div>
  );
}
