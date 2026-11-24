import React, { useEffect, useMemo, useState } from 'react';
import { Aperture, Bell, CalendarDays, ChevronRight, Grid2X2, LockKeyhole, LogOut, Menu, Moon, Plus, Search, Settings2, Sparkles, Star, Sun, Trash2, X, Paperclip, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';
import { createMemory, getMemory, deleteMemory, listMemories, listAttachments, uploadAttachment } from './lib/memories';
import { isUnlockDateValid } from './lib/capsules.js';

const fmt = (value) => {
  if (!value) return '—';
  return new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const remaining = (value) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [page, setPage] = useState('overview');
  const [memories, setMemories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [mobile, setMobile] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('everstar.theme') !== 'light');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', body: '', date: new Date().toLocaleDateString('en-CA'), unlock: new Date().toLocaleDateString('en-CA'), mood: 'Hopeful', color: '#e6bd79', files: [] });

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    }).catch(() => setAuthReady(true));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setAuthMode('update');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { localStorage.setItem('everstar.theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function refresh() {
    if (!session) return;
    setError('');
    try {
      const result = await listMemories();
      setMemories(result.memories || []);
      const { data, error: noticeError } = await supabase.from('notifications').select('id,title,body,created_at,read_at').order('created_at', { ascending: false }).limit(20);
      if (noticeError) throw noticeError;
      setNotifications(data || []);
    } catch (e) {
      setError(e.message || 'Could not load your universe.');
    }
  }
  useEffect(() => { if (session) refresh(); else { setMemories([]); setNotifications([]); } }, [session?.user?.id]);
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    const channel = supabase.channel('everstar-sync-' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: 'user_id=eq.' + session.user.id }, () => refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + session.user.id }, () => {
        refresh();
        setToast('A time capsule notification has arrived.');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const locked = memories.filter((m) => m.isLocked);
  const ready = memories.filter((m) => !m.isLocked);
  const unread = notifications.filter((n) => !n.read_at).length;
  const nav = [['overview', 'Overview', Grid2X2], ['memories', 'My memories', Star], ['capsules', 'Time capsules', LockKeyhole], ['timeline', 'Timeline', CalendarDays]];
  const visible = useMemo(() => memories
    .filter((m) => (m.title + ' ' + (m.body || '') + ' ' + (m.mood || '')).toLowerCase().includes(search.toLowerCase()))
    .filter((m) => filter === 'all' || (filter === 'locked' ? m.isLocked : !m.isLocked)), [memories, search, filter]);

  async function submitMemory(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    if (!isUnlockDateValid(form.date, form.unlock)) { setError('The opening date cannot be before the memory date.'); return; }
    setBusy(true); setError('');
    try {
      const timezoneOffsetMinutes = new Date(form.unlock + 'T00:00:00').getTimezoneOffset();
      const result = await createMemory({ title: form.title, body: form.body, date: form.date, unlockDate: form.unlock, timezoneOffsetMinutes, mood: form.mood, color: form.color });
      const id = result.memory.id;
      let uploadFailures = 0;
      for (const file of form.files) {
        try { await uploadAttachment(id, file); } catch (_) { uploadFailures += 1; }
      }
      setModal(false);
      setForm({ title: '', body: '', date: new Date().toLocaleDateString('en-CA'), unlock: new Date().toLocaleDateString('en-CA'), mood: 'Hopeful', color: '#e6bd79', files: [] });
      await refresh();
      setToast(uploadFailures ? 'Memory saved, but one or more attachments failed to upload.' : 'Your memory has been encrypted and saved.');
    } catch (e) {
      setError(e.message || 'Could not save this memory.');
    } finally { setBusy(false); }
  }

  async function openMemory(memory) {
    setSelected(memory);
    setAttachments([]);
    if (!memory.isLocked) {
      try {
        const result = await getMemory(memory.id);
        setSelected({ ...memory, ...result.memory });
        setAttachments(await listAttachments(memory.id));
      } catch (e) { setToast(e.message); }
    }
  }
  async function removeMemory(id) {
    if (!window.confirm('Permanently delete this memory and its attachments?')) return;
    try {
      await deleteMemory(id);
      setSelected(null);
      await refresh();
      setToast('Memory deleted.');
    } catch (e) { setToast(e.message); }
  }
  async function markRead(id) {
    const { error: updateError } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (!updateError) setNotifications((items) => items.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }
  async function signOut() { await supabase.auth.signOut(); setPage('overview'); }

  if (!supabaseConfigured) return <div className="setup-screen"><div className="setup-card"><Aperture size={36}/><div className="eyebrow">MEMORIES BEYOND TIME</div><h1>Connect your private universe.</h1><p>EVERSTAR is ready for its secure backend. Add your Supabase project URL and publishable key to a local <code>.env</code> file to continue.</p><pre>VITE_SUPABASE_URL=https://your-project.supabase.co<br/>VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</pre><p className="setup-foot">Do not put a service-role key or encryption key in this file. Those belong only in Supabase server secrets.</p></div></div>;
  if (!authReady) return <div className="setup-screen"><div className="setup-card"><Aperture size={34}/><p>Opening your universe…</p></div></div>;
  if (!session || authMode === 'update') return <AuthPanel mode={authMode} setMode={setAuthMode} onDone={() => setAuthMode('login')} />;

  return <div className={'app ' + (dark ? 'dark' : 'light')}>
    <div className="nebula n1"/><div className="nebula n2"/>
    <aside className={'sidebar ' + (mobile ? 'show' : '')}>
      <div className="brand"><span className="brand-icon"><Aperture/></span><span><b>everstar</b><small>MEMORIES BEYOND TIME</small></span><button className="mobile-x" onClick={() => setMobile(false)}><X/></button></div>
      <div className="nav-label">YOUR UNIVERSE</div>
      <nav>{nav.map(([id, label, Icon]) => <button key={id} className={'nav-item ' + (page === id ? 'active' : '')} onClick={() => { setPage(id); setMobile(false); }}><Icon size={17}/>{label}{id === 'capsules' && locked.length > 0 ? <i>{locked.length}</i> : null}</button>)}</nav>
      <div className="side-bottom"><div className="growth"><Sparkles size={17}/><b>Your universe is growing</b><p>{memories.length} moments safely stored in your personal sky.</p><div className="progress"><i style={{ width: Math.min(100, memories.length * 12) + '%' }}/></div></div><button className="nav-item" onClick={() => setToast('Account settings will be added in a later update.')}><Settings2 size={17}/>Settings</button><div className="profile"><span className="avatar">{(session.user.email || 'E').slice(0,1).toUpperCase()}</span><span><b>{session.user.email}</b><small>Private account</small></span></div><button className="nav-item signout" onClick={signOut}><LogOut size={16}/>Sign out</button></div>
    </aside>
    {mobile && <button className="scrim" onClick={() => setMobile(false)}/>}
    <main className="main">
      <header className="topbar"><div className="crumb"><button className="hamb" onClick={() => setMobile(true)}><Menu/></button><span>My universe</span><ChevronRight size={14}/><b>{nav.find((n) => n[0] === page)?.[1]}</b></div><div className="top-right"><span className="date-now">✦ &nbsp;{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button><div className="notice-wrap"><button className="icon-btn" onClick={() => setNoticeOpen(!noticeOpen)}><Bell size={17}/>{unread > 0 && <i className="notice-dot"/>}</button>{noticeOpen && <div className="notice-panel"><b>Notifications</b>{notifications.length ? notifications.map((n) => <button key={n.id} className={'notice-item ' + (!n.read_at ? 'unread' : '')} onClick={() => markRead(n.id)}><span>{n.title}</span><small>{n.body}</small><time>{fmt(n.created_at)}</time></button>) : <p>No notifications yet. New capsule openings will appear here.</p>}</div>}</div><span className="avatar tiny">{(session.user.email || 'E').slice(0,1).toUpperCase()}</span></div></header>
      <div className="content">
        {error && <div className="inline-error"><AlertCircle size={16}/>{error}<button onClick={() => setError('')}><X size={14}/></button></div>}
        {page === 'overview' && <>
          <section className="hero"><div className="eyebrow"><Sparkles size={13}/> A LITTLE SPACE, JUST FOR YOU</div><h1>Your life, written<br/><em>in the stars.</em></h1><p>Some moments pass. The ones that matter deserve a place in the universe — and a chance to find you again.</p><button className="gold-btn" onClick={() => setModal(true)}><Plus size={17}/> Preserve a moment <span>↗</span></button><div className="orbit-art"><div className="orbit o1"/><div className="orbit o2"/><div className="globe"><Star fill="currentColor" size={28}/></div><i>✦</i><b>✧</b><small>·</small></div><div className="hero-bottom"><span>✦ &nbsp; Every memory is a world.</span><span>YOUR PRIVATE UNIVERSE</span></div></section>
          <section className="stats"><Stat icon={<Star/>} value={memories.length} label="MEMORIES KEPT"/><Stat icon={<LockKeyhole/>} value={locked.length} label="TIME CAPSULES" variant="lilac"/><Stat icon={<Sparkles/>} value={ready.length} label="READY TO REVISIT" variant="mint"/><div className="quote"><b>“</b><span>The smallest moments often leave<br/>the deepest light.</span></div></section>
          <section className="section"><div className="section-head"><div><div className="eyebrow">YOUR CONSTELLATION</div><h2>Recent memories</h2></div><button className="link-btn" onClick={() => setPage('memories')}>Explore all <ChevronRight size={15}/></button></div><div className="cards">{memories.slice(0, 3).map((m, i) => <MemoryCard key={m.id} memory={m} index={i} onClick={() => openMemory(m)}/>)}<button className="add-card" onClick={() => setModal(true)}><span><Plus size={22}/></span><b>Make a new memory</b><small>Give a moment a place to live.</small></button></div>{memories.length === 0 && <Empty title="Your universe is waiting" text="Create your first memory and give it a place among the stars." onClick={() => setModal(true)}/>}</section>
          <section className="capsule-promo"><span className="lock-symbol"><LockKeyhole/></span><div><div className="eyebrow">A MESSAGE FROM THE PAST</div><h3>{locked.length ? locked.length + ' memories are still becoming.' : 'Your next chapter is waiting.'}</h3><p>{locked.length ? 'Your sealed memories stay protected until their chosen opening date.' : 'Create a time capsule for the person you will be tomorrow.'}</p></div><button className="outline-btn" onClick={() => setPage('capsules')}>Visit time capsules <ChevronRight size={15}/></button></section>
        </>}
        {page === 'memories' && <><PageHead eyebrow="THE MOMENTS THAT MADE YOU" title="Your memories" desc="Every little thing you chose not to let disappear." action={() => setModal(true)}/><Toolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}/><div className="cards">{visible.map((m, i) => <MemoryCard key={m.id} memory={m} index={i} onClick={() => openMemory(m)}/>)}</div>{!visible.length && <Empty title="No stars found" text="Try another search or preserve a new moment." onClick={() => setModal(true)}/>}</>}
        {page === 'capsules' && <><PageHead eyebrow="SEALED WITH A PROMISE" title="Time capsules" desc="Messages from who you were, waiting for who you will become." action={() => setModal(true)}/><div className="capsule-note"><LockKeyhole/> Capsule contents are encrypted. The server will not release them before the opening date.</div>{locked.sort((a,b) => new Date(a.unlockAt) - new Date(b.unlockAt)).map((m) => <button className="capsule-row" key={m.id} onClick={() => openMemory(m)}><span className="lock-symbol"><LockKeyhole/></span><span className="capsule-title"><b>Sealed memory</b><small>Private capsule · saved {fmt(m.date)}</small></span><span className="unlock-date"><b>{fmt(m.unlockAt)}</b><small>{remaining(m.unlockAt)} days remaining</small></span><LockKeyhole/></button>)}{!locked.length && <Empty title="Your sky is open" text="No sealed capsules yet. Create one for a future you." onClick={() => setModal(true)}/>}<div className="section-head ready-head"><div className="eyebrow">THE MOMENT HAS ARRIVED</div><h2>Ready to revisit</h2></div><div className="cards">{ready.map((m, i) => <MemoryCard key={m.id} memory={m} index={i} onClick={() => openMemory(m)}/>)}</div></>}
        {page === 'timeline' && <><PageHead eyebrow="A LIFE IN LITTLE CHAPTERS" title="Your timeline" desc="Look back at the moments that shaped your universe."/><div className="timeline">{[...memories].sort((a,b) => new Date(b.date) - new Date(a.date)).map((m) => <button className="timeline-row" key={m.id} onClick={() => openMemory(m)}><time>{fmt(m.date)}</time><i style={{ background: m.color || '#e6bd79' }}/><span><b>{m.isLocked ? 'Sealed memory' : m.title}</b><small>{m.isLocked ? '⌑ Sealed until ' + fmt(m.unlockAt) : '✦ Unlocked'}</small></span></button>)}</div>{!memories.length && <Empty title="Your story begins here" text="Your timeline will grow as you preserve moments." onClick={() => setModal(true)}/>}</>}
        <footer className="footer"><b><Aperture size={15}/> EVERSTAR</b><span>Made for the moments that make you, you.</span><small>© {new Date().getFullYear()} EVERSTAR</small></footer>
      </div>
    </main>
    {modal && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}><form className="modal" onSubmit={submitMemory}><div className="modal-head"><div><div className="eyebrow">PRESERVE A MOMENT</div><h2>Give it a place in the stars.</h2></div><button type="button" className="icon-btn" onClick={() => setModal(false)}><X/></button></div><label>Memory title<input required maxLength="90" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A moment worth keeping..."/></label><label>Your memory<textarea required rows="5" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write it just as you remember it."/></label><div className="form-grid"><label>When did it happen?<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, unlock: form.unlock < e.target.value ? e.target.value : form.unlock })}/></label><label>Open this memory<input required type="date" min={form.date} value={form.unlock} onChange={(e) => setForm({ ...form, unlock: e.target.value })}/></label></div><div className="form-grid"><label>How did it feel?<select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}><option>Hopeful</option><option>Grateful</option><option>Peaceful</option><option>Joyful</option><option>Nostalgic</option><option>Brave</option></select></label><label>Star colour<div className="colours">{['#e6bd79','#a89bff','#83c9c5','#ed9d9d','#d5d9e8'].map((c) => <button type="button" key={c} className={'colour ' + (form.color === c ? 'chosen' : '')} style={{ background: c }} onClick={() => setForm({ ...form, color: c })}/>)}</div></label></div><label className="file-label"><span><Paperclip size={15}/> Add photos or files (up to 25 MB each)</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4" onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []) })}/>{form.files.length > 0 && <small>{form.files.map((f) => f.name).join(', ')}</small>}</label><div className="local-note"><LockKeyhole size={15}/> Your memory is encrypted before it is stored. A sealed capsule stays unreadable through the app until its opening date.</div><button className="gold-btn full" type="submit" disabled={busy}>{busy ? 'Saving securely…' : <><Sparkles size={16}/> Save to my universe</>}</button></form></div>}
    {selected && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><div className="detail"><button className="detail-close icon-btn" onClick={() => setSelected(null)}><X/></button><Star className="detail-star" size={34} fill="currentColor" style={{ color: selected.color || '#e6bd79' }}/><div className="eyebrow">{selected.isLocked ? 'A SEALED TIME CAPSULE' : 'A MEMORY REVISITED'}</div><h2>{selected.isLocked ? 'This memory is still becoming.' : selected.title}</h2><div className="detail-meta">{fmt(selected.date)} · {selected.mood || 'A moment kept'}</div>{selected.isLocked ? <div className="locked-box"><LockKeyhole/><b>This memory is still sealed.</b><span>It will open on {fmt(selected.unlockAt)} — in {remaining(selected.unlockAt)} days.</span></div> : <><p>{selected.body}</p>{attachments.length > 0 && <div className="attachment-list"><b>Attachments</b>{attachments.map((a) => <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><Paperclip size={14}/>{a.fileName}</a>)}</div>}</>}<div className="detail-actions"><button className="outline-btn" onClick={() => { navigator.clipboard?.writeText(selected.title + '\n\n' + (selected.body || '')); setToast('Memory copied.'); }}>Copy memory</button><button className="delete-btn" onClick={() => removeMemory(selected.id)}><Trash2 size={15}/> Delete</button></div></div></div>}
    {toast && <div className="toast"><Sparkles size={15}/>{toast}</div>}
  </div>;
}

function AuthPanel({ mode, setMode, onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const title = mode === 'signup' ? 'Create your universe.' : mode === 'forgot' ? 'Find your way back.' : mode === 'update' ? 'A new key to your universe.' : 'Welcome back to your universe.';
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        if (password !== confirm) throw new Error('The passwords do not match.');
        const { data, error: e } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (e) throw e;
        if (data.session) setMessage('Your account is ready. Welcome to EVERSTAR.');
        else setMessage('Check your email and confirm your address to finish creating your account.');
      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (e) throw e;
        setMessage('If an account exists for that email, a password reset link has been sent.');
      } else if (mode === 'update') {
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        if (password !== confirm) throw new Error('The passwords do not match.');
        const { error: e } = await supabase.auth.updateUser({ password });
        if (e) throw e;
        setMessage('Your password has been updated. You can continue.');
        onDone();
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
      }
    } catch (e) { setError(e.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-screen"><div className="auth-orbit"><div/><div/><span>✦</span></div><form className="auth-card" onSubmit={submit}><div className="auth-brand"><Aperture size={34}/><span>EVERSTAR<small>MEMORIES BEYOND TIME</small></span></div><div className="eyebrow">YOUR PRIVATE UNIVERSE</div><h1>{title}</h1><p>{mode === 'signup' ? 'Create an account to keep your memories safe and in sync across devices.' : mode === 'forgot' ? 'We will send you a secure link to reset your password.' : mode === 'update' ? 'Choose a strong new password for your account.' : 'Sign in to revisit the moments you chose to keep.'}</p><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={mode === 'update'}/></label>{mode !== 'forgot' && <label>{mode === 'update' ? 'New password' : 'Password'}<input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>}{(mode === 'signup' || mode === 'update') && <label>Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password"/></label>}{error && <div className="auth-error"><AlertCircle size={15}/>{error}</div>}{message && <div className="auth-success"><CheckCircle2 size={15}/>{message}</div>}<button className="gold-btn full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'update' ? 'Save new password' : 'Sign in'} <ChevronRight size={16}/></button><div className="auth-links">{mode === 'login' && <><button type="button" onClick={() => setMode('forgot')}>Forgot password?</button><span>New here? <button type="button" onClick={() => { setMode('signup'); setMessage(''); setError(''); }}>Create account</button></span></>}{mode === 'signup' && <span>Already have an account? <button type="button" onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Sign in</button></span>}{mode === 'forgot' && <button type="button" onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Back to sign in</button>}{mode === 'update' && <button type="button" onClick={onDone}>Back to sign in</button>}</div></form></div>;
}
function Stat({ icon, value, label, variant = '' }) { return <div className="stat"><span className={'stat-icon ' + variant}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
function PageHead({ eyebrow, title, desc, action }) { return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action && <button className="gold-btn" onClick={action}><Plus size={16}/> New memory</button>}</div>; }
function Toolbar({ search, setSearch, filter, setFilter }) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a memory…" />
      </div>
      <div className="filters">
        {['all', 'open', 'locked'].map((f) => (
          <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'open' ? 'Unlocked' : 'Locked'}
          </button>
        ))}
      </div>
    </div>
  );
}
function MemoryCard({ memory, index, onClick }) {
  const locked = memory.isLocked;
  return <button className="memory-card" onClick={onClick}><div className={'card-art art-' + (index % 3)}><div className="tiny-stars">✦　·　✧　　·　✦</div><span className="memory-star" style={{ color: memory.color || '#e6bd79' }}><Star size={21} fill="currentColor"/></span><small>{fmt(memory.date)}</small>{locked && <i><LockKeyhole size={11}/> SEALED</i>}</div><div className="card-body"><small>{locked ? 'TIME CAPSULE' : (memory.mood || 'MEMORY').toUpperCase()}</small><h3>{locked ? 'Sealed memory' : memory.title}</h3><p>{locked ? 'A little universe waiting for the right time.' : memory.body}</p><div>{locked ? 'Opens ' + fmt(memory.unlockAt) : 'Open memory'} <span>{locked ? <LockKeyhole size={13}/> : <ChevronRight size={15}/>}</span></div></div></button>;
}
function Empty({ title, text, onClick }) { return <div className="empty"><Star size={25}/><h3>{title}</h3><p>{text}</p><button className="outline-btn" onClick={onClick}><Plus size={15}/> Create a memory</button></div>; }
