import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bell, Check, Megaphone, RefreshCw, Search, Settings, Shield, ShieldCheck, Users, UserX, UserCheck } from 'lucide-react';

const initialSettings = [
  { key: 'site_name', label: 'Application name', value: 'EVERSTAR' },
  { key: 'maintenance_mode', label: 'Maintenance mode', value: false },
  { key: 'allow_signups', label: 'Allow new registrations', value: true },
  { key: 'default_language', label: 'Default language', value: 'en' }
];

export default function OwnerDashboard({ supabase, session, lang = 'en' }) {
  const ar = lang === 'ar';
  const t = (en, a) => ar ? a : en;
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pushHealth, setPushHealth] = useState(null);
  const [pushAttempts, setPushAttempts] = useState([]);
  const [authEvents, setAuthEvents] = useState([]);
  const [settings, setSettings] = useState({});
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [aal, setAal] = useState('checking');
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [s, a, l, al, st, ph, pa, ae] = await Promise.all([
        supabase.rpc('owner_dashboard_stats'),
        supabase.from('app_announcements').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('admin_audit_logs').select('id,action,target_user_id,metadata,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('admin_alerts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('app_settings').select('key,value'),
        supabase.rpc('owner_push_delivery_health'),
        supabase.rpc('owner_recent_push_delivery_attempts'),
        supabase.rpc('owner_recent_auth_activity')
      ]);
      if (s.error) throw s.error;
      if (a.error) throw a.error;
      if (l.error) throw l.error;
      if (al.error) throw al.error;
      if (st.error) throw st.error;
      if (ph.error) throw ph.error;
      if (pa.error) throw pa.error;
      if (ae.error) throw ae.error;
      setStats(s.data || {});
      setAnnouncements(a.data || []);
      setLogs(l.data || []);
      setAlerts(al.data || []);
      setSettings(Object.fromEntries((st.data || []).map(x => [x.key, x.value])));
      setPushHealth(ph.data || {});
      setPushAttempts(pa.data || []);
      setAuthEvents(ae.data || []);
    } catch (e) { setError(e.message || 'Unable to load owner dashboard.'); }
    finally { setBusy(false); }
  }, [supabase]);

  const loadUsers = useCallback(async (term = '') => {
    const { data, error: e } = await supabase.rpc('owner_list_users', { p_search: term });
    if (e) setError(e.message); else setUsers(data || []);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [assurance, factorResult] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors()
      ]);
      if (!active) return;
      if (assurance.error) setMfaError(assurance.error.message);
      const factors = factorResult.data ? [...(factorResult.data.totp || []), ...(factorResult.data.phone || [])] : [];
      setMfaFactors(factors);
      setAal(assurance.data?.currentLevel || 'aal1');
    })().catch(e => { if (active) { setMfaError(e.message || 'MFA check failed'); setAal('aal1'); } });
    return () => { active = false; };
  }, [supabase]);
  useEffect(() => { if (aal === 'aal2') load(); }, [aal, load]);
  useEffect(() => { if (aal === 'aal2' && tab === 'users') loadUsers(''); }, [aal, tab, loadUsers]);

  async function startMfaChallenge() {
    setMfaError(''); setMfaBusy(true);
    try {
      let factor = mfaFactors.find(x => x.status === 'verified');
      if (!factor) {
        factor = mfaFactors.find(x => x.status === 'unverified');
        if (!factor) {
          const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'EVERSTAR owner' });
          if (enrolled.error) throw enrolled.error;
          factor = enrolled.data;
          setMfaQr(factor.totp?.qr_code || '');
          setMfaSecret(factor.totp?.secret || '');
          setMfaFactors(prev => [...prev, { id: factor.id, status: 'unverified', factor_type: 'totp' }]);
        }
      }
      setMfaFactorId(factor.id);
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;
      setMfaChallengeId(challenge.data.id);
    } catch (e) { setMfaError(e.message || 'Could not start authenticator verification.'); }
    finally { setMfaBusy(false); }
  }

  async function verifyMfaCode() {
    setMfaError(''); setMfaBusy(true);
    try {
      if (!mfaFactorId || !mfaChallengeId || !/^\d{6}$/.test(mfaCode.trim())) throw new Error('Enter the six-digit authenticator code.');
      const verified = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code: mfaCode.trim() });
      if (verified.error) throw verified.error;
      await supabase.auth.refreshSession();
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw assurance.error;
      setAal(assurance.data?.currentLevel || 'aal1');
      setMfaCode(''); setMfaChallengeId(''); setMfaQr(''); setMfaSecret('');
      if (assurance.data?.currentLevel !== 'aal2') throw new Error('Authenticator verification did not reach the required security level.');
    } catch (e) { setMfaError(e.message || 'Authenticator verification failed.'); }
    finally { setMfaBusy(false); }
  }

  async function saveSetting(key, value) {
    setError(''); setMessage('');
    const { error: e } = await supabase.from('app_settings').upsert({ key, value, updated_by: session.user.id, updated_at: new Date().toISOString() });
    if (e) setError(e.message); else { setSettings(prev => ({ ...prev, [key]: value })); setMessage(t('Setting saved.','تم حفظ الإعداد.')); }
  }
  async function publishAnnouncement(e) {
    e.preventDefault(); if (!title.trim()) return;
    const { error: e2 } = await supabase.from('app_announcements').insert({ title: title.trim(), body: body.trim(), audience: 'all', created_by: session.user.id });
    if (e2) setError(e2.message); else { setTitle(''); setBody(''); setMessage(t('Announcement published.','تم نشر الإعلان.')); load(); }
  }
  async function toggleAnnouncement(item) {
    const { error: e } = await supabase.from('app_announcements').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (e) setError(e.message); else load();
  }
  async function setRole(user, role) {
    if (!window.confirm(t('Change this account role?','هل تريد تغيير صلاحية هذا الحساب؟'))) return;
    const { error: e } = await supabase.rpc('owner_set_user_role', { p_user_id: user.user_id, p_role: role });
    if (e) setError(e.message); else { setMessage(t('User role updated.','تم تحديث صلاحية المستخدم.')); loadUsers(query); load(); }
  }
  async function setBan(user, banned) {
    if (!window.confirm(banned ? t('Suspend this account?','هل تريد إيقاف هذا الحساب؟') : t('Reactivate this account?','هل تريد إعادة تفعيل هذا الحساب؟'))) return;
    const { error: e } = await supabase.rpc('owner_set_user_ban', { p_user_id: user.user_id, p_banned: banned });
    if (e) setError(e.message); else { setMessage(t('Account status updated.','تم تحديث حالة الحساب.')); loadUsers(query); load(); }
  }
  async function resolveAlert(item) {
    const { error: e } = await supabase.from('admin_alerts').update({ resolved_at: new Date().toISOString() }).eq('id', item.id);
    if (e) setError(e.message); else load();
  }

  if (aal !== 'aal2') return <section className="owner-dashboard" dir={ar ? 'rtl' : 'ltr'}>
    <div className="owner-head"><div><div className="eyebrow">{t('OWNER SECURITY CHECK','فحص أمان المالك')}</div><h1>{t('Protect your control center.','احمِ مركز التحكم.')}</h1><p>{t('Owner access requires a six-digit authenticator code. Set up an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.','يتطلب دخول المالك رمزاً من ستة أرقام من تطبيق مصادقة مثل Google Authenticator أو Microsoft Authenticator أو 1Password.')}</p></div></div>
    {aal === 'checking' && <p>{t('Checking your security session…','جارٍ فحص جلسة الأمان…')}</p>}
    {mfaQr && <div className="owner-panel"><h3>{t('Scan this QR code','امسح رمز QR')}</h3><img src={mfaQr} alt="Authenticator enrollment QR code" style={{width:220,maxWidth:'100%',background:'#fff',padding:12,borderRadius:12}}/><p>{t('Or enter this setup key manually:','أو أدخل مفتاح الإعداد يدوياً:')}</p><code>{mfaSecret}</code></div>}
    {mfaError && <div className="owner-error"><AlertTriangle size={16}/>{mfaError}</div>}
    <div className="owner-panel owner-form">
      {!mfaChallengeId ? <button className="gold-btn" disabled={mfaBusy || aal === 'checking'} onClick={startMfaChallenge}>{mfaBusy ? t('Please wait…','يرجى الانتظار…') : mfaFactors.some(x=>x.status==='verified') ? t('Send authenticator challenge','ابدأ التحقق') : t('Set up owner authenticator','إعداد مصادقة المالك')}</button> : <>
        <label>{t('Six-digit code','رمز التحقق المكوّن من ستة أرقام')}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
        <button className="gold-btn" disabled={mfaBusy || mfaCode.length!==6} onClick={verifyMfaCode}>{mfaBusy ? t('Verifying…','جارٍ التحقق…') : t('Verify and open owner panel','تحقق وافتح لوحة المالك')}</button>
      </>}
    </div>
  </section>;

  const nav = [
    ['overview', t('Overview','نظرة عامة'), Activity],
    ['users', t('Users & moderators','المستخدمون والمشرفون'), Users],
    ['announcements', t('Announcements','الإعلانات'), Megaphone],
    ['settings', t('App settings','إعدادات التطبيق'), Settings],
    ['monitor', t('System & security','النظام والأمان'), ShieldCheck],
    ['delivery', t('Delivery monitoring','مراقبة الإرسال'), Bell],
    ['backups', t('Backups & recovery','النسخ الاحتياطي والاستعادة'), ShieldCheck],
    ['logs', t('Activity log','سجل النشاط'), Shield]
  ];
  const cards = [
    [t('Total users','إجمالي المستخدمين'), stats?.users ?? '—', Users],
    [t('Confirmed emails','البريد المؤكد'), stats?.confirmed_users ?? '—', Check],
    [t('Memories','الذكريات'), stats?.memories ?? '—', Activity],
    [t('Notifications','الإشعارات'), stats?.notifications ?? '—', Bell],
    [t('Attachments','المرفقات'), stats?.attachments ?? '—', Shield],
    [t('Push devices','أجهزة الإشعار'), stats?.push_devices ?? '—', Bell]
  ];
  return <section className="owner-dashboard" dir={ar ? 'rtl' : 'ltr'}>
    <div className="owner-head"><div><div className="eyebrow">{t('OWNER CONTROL CENTER','مركز تحكم المالك')}</div><h1>{t('Your universe, under control.','عالمك تحت إدارتك.')}</h1><p>{t('Manage accounts, announcements, settings and system health. Private memory contents remain private.','أدر الحسابات والإعلانات والإعدادات وحالة النظام. تبقى محتويات الذكريات الخاصة سرية.')}</p></div><button className="outline-btn" onClick={load} disabled={busy}><RefreshCw size={15}/>{t('Refresh','تحديث')}</button></div>
    <div className="owner-tabs">{nav.map(([id,label,Icon]) => <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
    {error && <div className="owner-error"><AlertTriangle size={16}/>{error}</div>}
    {message && <div className="owner-message"><Check size={16}/>{message}<button onClick={()=>setMessage('')}>×</button></div>}
    {tab === 'overview' && <><div className="owner-metrics">{cards.map(([label,value,Icon])=><article key={label}><span><Icon size={17}/></span><b>{value}</b><small>{label}</small></article>)}</div><div className="owner-columns"><article className="owner-panel"><h3>{t('System snapshot','ملخص النظام')}</h3><p>{t('Active announcements','الإعلانات النشطة')}: <b>{stats?.announcements ?? 0}</b></p><p>{t('Open system alerts','تنبيهات النظام المفتوحة')}: <b>{alerts.filter(x=>!x.resolved_at).length}</b></p><p>{t('Registered push devices','أجهزة الإشعار المسجلة')}: <b>{stats?.push_devices ?? 0}</b></p></article><article className="owner-panel"><h3>{t('Owner account','حساب المالك')}</h3><p>{session.user.email}</p><small>{t('Verified owner access','صلاحية مالك مؤكدة')}</small></article></div></>}
    {tab === 'users' && <div className="owner-panel"><div className="owner-panel-head"><h3>{t('Account management','إدارة الحسابات')}</h3><span>{t('Showing up to 100 accounts','عرض حتى 100 حساب')}</span></div><form className="owner-search" onSubmit={e=>{e.preventDefault();loadUsers(query);}}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search by email','ابحث بالبريد الإلكتروني')}/><button className="outline-btn">{t('Search','بحث')}</button></form><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>{t('Email','البريد')}</th><th>{t('Role','الصلاحية')}</th><th>{t('Email status','حالة البريد')}</th><th>{t('Last sign-in','آخر دخول')}</th><th>{t('Account status','حالة الحساب')}</th><th>{t('Actions','الإجراءات')}</th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td>{u.email}<small>{new Date(u.created_at).toLocaleDateString()}</small></td><td><span className="owner-role">{u.role}</span></td><td>{u.email_confirmed_at?t('Confirmed','مؤكد'):t('Unconfirmed','غير مؤكد')}</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():t('Never','لم يسجل الدخول بعد')}</td><td>{u.banned_until && new Date(u.banned_until)>new Date()?t('Suspended','موقوف'):t('Active','نشط')}</td><td>{u.role!=='owner'&&<div className="owner-actions"><button title={u.role==='admin'?'Remove moderator':'Make moderator'} onClick={()=>setRole(u,u.role==='admin'?'user':'admin')}><Shield size={15}/>{u.role==='admin'?t('Remove admin','إلغاء المشرف'):t('Make admin','تعيين مشرف')}</button><button title="Suspend/reactivate" onClick={()=>setBan(u,!(u.banned_until && new Date(u.banned_until)>new Date()))}>{u.banned_until && new Date(u.banned_until)>new Date()?<><UserCheck size={15}/>{t('Reactivate','إعادة تفعيل')}</>:<><UserX size={15}/>{t('Suspend','إيقاف')}</>}</button></div>}</td></tr>)}</tbody></table>{!users.length&&<p className="owner-empty">{t('No accounts found.','لا توجد حسابات.')}</p>}</div></div>}
    {tab === 'announcements' && <div className="owner-columns"><form className="owner-panel owner-form" onSubmit={publishAnnouncement}><h3>{t('Publish an announcement','نشر إعلان')}</h3><label>{t('Title','العنوان')}<input required maxLength="160" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>{t('Message','الرسالة')}<textarea rows="4" maxLength="5000" value={body} onChange={e=>setBody(e.target.value)}/></label><button className="gold-btn">{t('Publish to all users','نشر لجميع المستخدمين')}</button></form><div className="owner-panel"><h3>{t('Published announcements','الإعلانات المنشورة')}</h3>{announcements.map(a=><article className="owner-announcement" key={a.id}><div><b>{a.title}</b><p>{a.body}</p><small>{new Date(a.created_at).toLocaleString()}</small></div><button className="outline-btn" onClick={()=>toggleAnnouncement(a)}>{a.is_active?t('Disable','إيقاف'):t('Enable','تفعيل')}</button></article>)}{!announcements.length&&<p>{t('No announcements yet.','لا توجد إعلانات بعد.')}</p>}</div></div>}
    {tab === 'settings' && <div className="owner-panel"><h3>{t('Application settings','إعدادات التطبيق')}</h3><p>{t('These values are stored centrally. Features must read the relevant key before they affect user access.','تُحفظ هذه القيم مركزياً. يجب أن تقرأ الميزات القيمة المناسبة قبل أن تؤثر في وصول المستخدمين.')}</p><div className="owner-setting"><span>{t('Application name','اسم التطبيق')}</span><input value={typeof settings.site_name==='string'?settings.site_name.replace(/^"|"$/g,''):'EVERSTAR'} onChange={e=>setSettings(p=>({...p,site_name:e.target.value}))}/><button className="outline-btn" onClick={()=>saveSetting('site_name',settings.site_name||'EVERSTAR')}>{t('Save','حفظ')}</button></div>{[['maintenance_mode',t('Maintenance mode','وضع الصيانة')],['allow_signups',t('Allow new registrations','السماح بالتسجيل')]].map(([key,label])=><div className="owner-setting" key={key}><span>{label}</span><label className="owner-toggle"><input type="checkbox" checked={settings[key]===true || (settings[key]===undefined && key==='allow_signups')} onChange={e=>saveSetting(key,e.target.checked)}/><i/></label></div>)}<div className="owner-setting"><span>{t('Default language','اللغة الافتراضية')}</span><select value={settings.default_language||'en'} onChange={e=>saveSetting('default_language',e.target.value)}><option value="en">English</option><option value="ar">العربية</option></select></div><p className="owner-footnote">{t('Maintenance mode is enforced by the application APIs and signup control is enforced by the database before a new account is created.','يتم حفظ وضع الصيانة والتحكم بالتسجيل هنا؛ ويلزم ربط بوابات المصادقة والتنقل حتى تفرض هذه المفاتيح الوصول فعلياً.')}</p></div>}
    {tab === 'monitor' && <div className="owner-columns"><div className="owner-panel"><h3>{t('System alerts','تنبيهات النظام')}</h3>{alerts.map(a=><article className="owner-alert" key={a.id}><span className={'owner-severity '+a.severity}>{a.severity}</span><div><b>{a.category}</b><p>{a.message}</p><small>{new Date(a.created_at).toLocaleString()}</small></div>{!a.resolved_at&&<button className="outline-btn" onClick={()=>resolveAlert(a)}>{t('Resolve','حل')}</button>}</article>)}{!alerts.length&&<p>{t('No alerts have been recorded.','لم تُسجل تنبيهات.')}</p>}</div><div className="owner-panel"><h3>{t('Authentication activity','نشاط تسجيل الدخول')}</h3><p>{t('Recent Supabase Auth audit events. Event records are shown without exposing IP addresses or private message contents.','أحدث أحداث سجل مصادقة Supabase. نعرض نوع الحدث دون كشف عناوين IP أو محتوى الرسائل الخاصة.')}</p><div className="owner-log-list">{authEvents.map((a,i)=><article key={a.event_type+'-'+i}><span>{a.event_type}</span><small>{new Date(a.occurred_at).toLocaleString()}</small></article>)}{!authEvents.length&&<p>{t('No Auth audit events are available in the current log retention window.','لا تتوفر أحداث في سجل المصادقة ضمن فترة الاحتفاظ الحالية.')}</p>}</div></div><div className="owner-panel"><h3>{t('Security notes','ملاحظات أمنية')}</h3><p>{t('Owner actions and administrative data now require an AAL2 authenticator session.','تتطلب إجراءات المالك والبيانات الإدارية الآن جلسة مصادقة من المستوى AAL2.')}</p><p>{t('Leaked-password protection is currently disabled in Supabase Auth. Enable it in the Auth password policy before opening registration to the public.','حماية كلمات المرور المسرّبة معطلة حالياً في Supabase Auth. فعّلها من سياسة كلمات المرور قبل فتح التسجيل للجميع.')}</p><a className="outline-btn" href="https://supabase.com/dashboard/project/cehddtgitnrquvsaoztx/auth/policies" target="_blank" rel="noreferrer">{t('Open Supabase password policy','فتح سياسة كلمات المرور في Supabase')} ↗</a><p>{t('Email delivery is handled by Supabase Auth; provider delivery reports are not exposed through this app unless a provider webhook is configured.','يتولى Supabase Auth إرسال البريد؛ ولا تظهر تقارير التسليم من مزود البريد داخل هذا التطبيق ما لم يتم إعداد Webhook لدى المزود.')}</p></div></div>}
    {tab === 'delivery' && <div className="owner-panel">
      <h3>{t('Push delivery monitoring','مراقبة الإشعارات الفورية')}</h3>
      <div className="owner-metrics">
        <article><span><Activity size={17}/></span><b>{pushHealth?.attempts_24h ?? 0}</b><small>{t('Attempts in 24 hours','محاولات آخر 24 ساعة')}</small></article>
        <article><span><Check size={17}/></span><b>{pushHealth?.sent_24h ?? 0}</b><small>{t('Successful attempts','محاولات ناجحة')}</small></article>
        <article><span><AlertTriangle size={17}/></span><b>{pushHealth?.failed_24h ?? 0}</b><small>{t('Failed attempts','محاولات فاشلة')}</small></article>
      </div>
      <p>{t('Failed deliveries remain eligible for retry during the next scheduled dispatch. Expired device subscriptions are disabled automatically.','تبقى عمليات الإرسال الفاشلة قابلة لإعادة المحاولة عند التشغيل المجدول التالي. ويتم تعطيل اشتراكات الأجهزة المنتهية تلقائياً.')}</p>
      <div className="owner-log-list">{pushAttempts.map((a,i)=><article key={a.notification_id + '-' + a.user_id + '-' + i}>
        <span>{a.status === 'sent' ? t('Delivered','تم الإرسال') : t('Failed','فشل الإرسال')}</span>
        <small>{a.attempted_at ? new Date(a.attempted_at).toLocaleString() : ''} · {t('Attempt','المحاولة')} {a.attempt_count}</small>
        <code>{[a.provider_status && ('HTTP ' + a.provider_status), a.error_code].filter(Boolean).join(' · ') || t('No provider error','لا يوجد خطأ من المزود')}</code>
      </article>)}{!pushAttempts.length && <p>{t('No push delivery attempts have been recorded yet.','لم تُسجل محاولات إرسال بعد.')}</p>}</div>
      <p className="owner-footnote">{t('This section records push-provider responses only. Email delivery is managed by Supabase Auth and must be checked in Auth logs / SMTP provider reports.','يسجل هذا القسم نتائج مزود الإشعارات الفورية فقط. أما البريد فيديره Supabase Auth ويجب فحصه في سجلات المصادقة وتقارير مزود SMTP.')}</p>
    </div>}
    {tab === 'backups' && <div className="owner-columns">
      <article className="owner-panel">
        <h3>{t('Encrypted backup schedule','جدول النسخ الاحتياطي المشفّر')}</h3>
        <p>{t('EVERSTAR runs an automated encrypted backup every day. The workflow exports database, Auth and Storage data, verifies the encrypted archive, removes plaintext staging files, and retains the GitHub artifact for 30 days.','ينفّذ EVERSTAR نسخة احتياطية مشفّرة تلقائياً كل يوم. يصدر سير العمل بيانات قاعدة البيانات والمصادقة والتخزين، ويتحقق من الأرشيف المشفّر، ويحذف الملفات المؤقتة غير المشفّرة، ويحتفظ بالنسخة في GitHub لمدة 30 يوماً.')}</p>
        <a className="outline-btn" href="https://github.com/infocc404/everstar-memories/actions/workflows/everstar-backup.yml" target="_blank" rel="noreferrer">{t('Open backup runs','فتح سجلات النسخ الاحتياطي')} ↗</a>
      </article>
      <article className="owner-panel">
        <h3>{t('Recovery readiness','جاهزية الاستعادة')}</h3>
        <p>{t('A successful backup confirms that an encrypted archive was created and its PostgreSQL dump was structurally verified. It does not yet prove a full restore. A separate restore drill is still required before calling disaster recovery fully tested.','نجاح النسخ يؤكد إنشاء أرشيف مشفّر والتحقق من البنية الداخلية لملف PostgreSQL، لكنه لا يثبت بعد نجاح الاستعادة الكاملة. لا بد من تجربة استعادة منفصلة قبل اعتبار خطة التعافي من الكوارث مختبرة بالكامل.')}</p>
        <span className="owner-role">{t('Restore drill: pending','اختبار الاستعادة: لم يُنفّذ بعد')}</span>
      </article>
      <article className="owner-panel">
        <h3>{t('Protect the backup keys','حماية مفاتيح النسخ')}</h3>
        <p>{t('Keep SUPABASE_DB_URL, SUPABASE_SERVICE_ROLE_KEY and BACKUP_ENCRYPTION_KEY only in GitHub Actions secrets. Never paste them into this dashboard, issues, chat or source files.','احتفظ بمفاتيح SUPABASE_DB_URL وSUPABASE_SERVICE_ROLE_KEY وBACKUP_ENCRYPTION_KEY داخل أسرار GitHub Actions فقط. لا تلصقها في لوحة التحكم أو المحادثات أو ملفات المصدر.')}</p>
      </article>
    </div>}
    {tab === 'logs' && <div className="owner-panel"><h3>{t('Recent administrative activity','أحدث الأنشطة الإدارية')}</h3><div className="owner-log-list">{logs.map(l=><article key={l.id}><span>{l.action}</span><small>{l.target_user_id||t('System','النظام')} · {new Date(l.created_at).toLocaleString()}</small><code>{JSON.stringify(l.metadata||{})}</code></article>)}{!logs.length&&<p>{t('No activity recorded yet.','لم يُسجل أي نشاط بعد.')}</p>}</div></div>}
  </section>;
}
