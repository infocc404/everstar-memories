import React, { startTransition, useEffect, useMemo, useState } from 'react';
const OwnerDashboard = React.lazy(() => import('./components/OwnerDashboard'));
import { Aperture, Bell, CalendarDays, ChevronRight, Grid2X2, LockKeyhole, LogOut, Menu, Moon, Plus, Search, Settings2, Sparkles, Star, Sun, Trash2, X, Paperclip, Image, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase';
import { createMemory, getMemory, deleteMemory, listMemories, listAttachments, uploadAttachment } from './lib/memories';
import { isUnlockDateValid } from './lib/capsules.js';


const AR_TRANSLATIONS = {"YOUR UNIVERSE":"عالمك","Overview":"نظرة عامة","My memories":"ذكرياتي","Time capsules":"كبسولات الزمن","Timeline":"الخط الزمني","Settings":"الإعدادات","How it works":"كيف يعمل EVERSTAR","YOUR PRIVATE UNIVERSE":"عالمك الخاص","Your universe is growing":"عالمك يكبر","moments safely stored in your personal sky.":"لحظات محفوظة بأمان في سمائك الخاصة.","Private account":"حساب خاص","Sign out":"تسجيل الخروج","My universe":"عالمي","Notifications":"الإشعارات","No notifications yet. New capsule openings will appear here.":"لا توجد إشعارات بعد. ستظهر هنا إشعارات فتح الكبسولات.","A LITTLE SPACE, JUST FOR YOU":"مساحة صغيرة لك وحدك","Your life, written":"حياتك، مكتوبة","in the stars.":"بين النجوم.","Some moments pass. The ones that matter deserve a place in the universe — and a chance to find you again.":"تمر بعض اللحظات، لكن ما يستحق البقاء يجد مكانه في هذا الكون ليعود إليك من جديد.","Preserve a moment":"احفظ لحظة","Every memory is a world.":"كل ذكرى هي عالم.","MEMORIES KEPT":"ذكريات محفوظة","TIME CAPSULES":"كبسولات زمنية","READY TO REVISIT":"جاهزة لاستعادتها","The smallest moments often leave":"أصغر اللحظات تترك أحياناً","the deepest light.":"أعمق أثر من الضوء.","YOUR CONSTELLATION":"مجموعتك النجمية","Recent memories":"أحدث الذكريات","Explore all":"استكشف الكل","Make a new memory":"أنشئ ذكرى جديدة","Give a moment a place to live.":"امنح لحظة مكاناً تعيش فيه.","Your universe is waiting":"عالمك ينتظرك","Create your first memory and give it a place among the stars.":"أنشئ ذكراك الأولى واترك لها مكاناً بين النجوم.","A MESSAGE FROM THE PAST":"رسالة من الماضي","Your next chapter is waiting.":"فصلك القادم ينتظرك.","Your sealed memories stay protected until their chosen opening date.":"تبقى ذكرياتك مغلقة ومحمية حتى موعد فتحها الذي اخترته.","Create a time capsule for the person you will be tomorrow.":"أنشئ كبسولة زمنية للشخص الذي ستكونه غداً.","Visit time capsules":"اذهب إلى كبسولات الزمن","THE MOMENTS THAT MADE YOU":"اللحظات التي صنعتك","Your memories":"ذكرياتي","Every little thing you chose not to let disappear.":"كل تفصيل صغير اخترت ألا تدعه يختفي.","New memory":"ذكرى جديدة","No stars found":"لم نعثر على نجوم","Try another search or preserve a new moment.":"جرّب بحثاً آخر أو احفظ ذكرى جديدة.","SEALED WITH A PROMISE":"مختومة بوعد","Messages from who you were, waiting for who you will become.":"رسائل ممن كنت، تنتظر من ستصبح.","Capsule contents are encrypted. The server will not release them before the opening date.":"محتويات الكبسولة مشفّرة، ولن يتيحها الخادم قبل موعد فتحها.","Sealed memory":"ذكرى مختومة","Your sky is open":"سماءك مفتوحة","No sealed capsules yet. Create one for a future you.":"لا توجد كبسولات مختومة بعد. أنشئ واحدة لنسختك المستقبلية.","THE MOMENT HAS ARRIVED":"حان وقت الذكرى","Ready to revisit":"ذكريات جاهزة للعودة","A LIFE IN LITTLE CHAPTERS":"حياة من فصول صغيرة","Your timeline":"الخط الزمني","Look back at the moments that shaped your universe.":"استرجع اللحظات التي شكّلت عالمك.","Your story begins here":"تبدأ حكايتك هنا","Your timeline will grow as you preserve moments.":"سينمو خطك الزمني كلما حفظت لحظات جديدة.","Made for the moments that make you, you.":"صُنع للحظات التي تصنع منك ما أنت عليه.","PRESERVE A MOMENT":"احفظ لحظة","Give it a place in the stars.":"امنحها مكاناً بين النجوم.","Memory title":"عنوان الذكرى","Your memory":"ذكراك","When did it happen?":"متى حدثت؟","Open this memory":"موعد فتح الذكرى","How did it feel?":"كيف كان شعورك؟","Star colour":"لون النجمة","Add photos or files (up to 25 MB each)":"أضف صوراً أو ملفات (حتى 25 ميغابايت لكل ملف)","Your memory is encrypted before it is stored. A sealed capsule stays unreadable through the app until its opening date.":"تُشفّر ذكراك قبل حفظها. وتبقى الكبسولة المختومة غير قابلة للقراءة عبر التطبيق حتى موعد فتحها.","Saving securely…":"جارٍ الحفظ بأمان…","Save to my universe":"احفظها في عالمي","A SEALED TIME CAPSULE":"كبسولة زمنية مختومة","A MEMORY REVISITED":"ذكرى نستعيدها","This memory is still becoming.":"هذه الذكرى لم يحن وقتها بعد.","This memory is still sealed.":"هذه الذكرى لا تزال مختومة.","Attachments":"المرفقات","Copy memory":"انسخ الذكرى","Delete":"حذف","Account settings will be added in a later update.":"ستتوفر إعدادات الحساب هنا.","Create a memory":"أنشئ ذكرى","Find a memory…":"ابحث عن ذكرى…","All":"الكل","Unlocked":"مفتوحة","Locked":"مختومة","TIME CAPSULE":"كبسولة زمنية","MEMORY":"ذكرى","A little universe waiting for the right time.":"عالم صغير ينتظر وقته المناسب.","Open memory":"افتح الذكرى","Email address":"البريد الإلكتروني","Password":"كلمة المرور","Confirm password":"تأكيد كلمة المرور","Forgot password?":"هل نسيت كلمة المرور؟","Create account":"إنشاء حساب","Already have an account?":"لديك حساب بالفعل؟","Sign in":"تسجيل الدخول","Back to sign in":"العودة لتسجيل الدخول","Please wait…":"يرجى الانتظار…","Send reset link":"إرسال رابط الاستعادة","Save new password":"حفظ كلمة المرور الجديدة","Repeat your password":"أعد كتابة كلمة المرور","At least 8 characters":"8 أحرف على الأقل","Welcome back to your universe.":"مرحباً بعودتك إلى عالمك.","Create your universe.":"أنشئ عالمك الخاص.","Find your way back.":"استعد طريق العودة.","A new key to your universe.":"مفتاح جديد لعالمك.","Create an account to keep your memories safe and in sync across devices.":"أنشئ حساباً لحفظ ذكرياتك بأمان ومزامنتها بين أجهزتك.","We will send you a secure link to reset your password.":"سنرسل إليك رابطاً آمناً لإعادة تعيين كلمة المرور.","Choose a strong new password for your account.":"اختر كلمة مرور جديدة وقوية لحسابك.","Sign in to revisit the moments you chose to keep.":"سجّل الدخول لاستعادة اللحظات التي اخترت الاحتفاظ بها.","A moment worth keeping...":"لحظة تستحق الاحتفاظ بها...","Write it just as you remember it.":"اكتبها كما تتذكرها تماماً.","Hopeful":"متفائل","Grateful":"ممتن","Peaceful":"مطمئن","Joyful":"سعيد","Nostalgic":"حنين","Brave":"شجاع","Settings & preferences":"الإعدادات والتفضيلات","Manage how EVERSTAR looks and how you access your account.":"تحكم في مظهر EVERSTAR وطريقة الوصول إلى حسابك.","Appearance":"المظهر","Dark theme":"الوضع الداكن","Light theme":"الوضع الفاتح","Language":"اللغة","Arabic":"العربية","English":"الإنجليزية","Account":"الحساب","Signed in as":"تم تسجيل الدخول باسم","Privacy & security":"الخصوصية والأمان","Your memories are encrypted before storage. Sealed capsules remain unavailable until their opening date.":"تُشفّر ذكرياتك قبل تخزينها. وتبقى الكبسولات المختومة غير متاحة حتى موعد فتحها.","A simple guide to your private universe.":"دليل مبسط لعالمك الخاص.","Create memories":"إنشاء الذكريات","Write a title and story, choose its date, and optionally attach photos or files.":"اكتب عنواناً وقصة، واختر تاريخها، ويمكنك إرفاق صور أو ملفات.","Seal a time capsule":"إغلاق كبسولة زمنية","Choose a future opening date. Until then, the memory stays encrypted and hidden.":"اختر موعداً مستقبلياً للفتح. وحتى ذلك الوقت تبقى الذكرى مشفرة ومخفية.","Revisit your timeline":"استرجع خطك الزمني","See your memories in chronological order and open those whose time has arrived.":"شاهد ذكرياتك بترتيب زمني وافتح ما حان موعده.","Your privacy":"خصوصيتك","Your private memories belong to your account. Never share your password or recovery links.":"ذكرياتك الخاصة مرتبطة بحسابك. لا تشارك كلمة مرورك أو روابط الاستعادة."};
Object.assign(AR_TRANSLATIONS, { 'Owner panel':'لوحة المالك', 'OWNER CONTROL CENTER':'مركز تحكم المالك', 'Users & moderators':'المستخدمون والمشرفون', 'Announcements':'الإعلانات', 'App settings':'إعدادات التطبيق', 'System & security':'النظام والأمان', 'Activity log':'سجل النشاط' });
Object.assign(AR_TRANSLATIONS, { 'EVERSTAR GUIDE':'دليل EVERSTAR', 'PERSONALIZE YOUR SPACE':'خصص مساحتك', 'How it works':'كيف يعمل EVERSTAR', 'Settings & preferences':'الإعدادات والتفضيلات', 'Toggle theme':'تبديل المظهر', 'A moment worth keeping...':'لحظة تستحق الاحتفاظ بها...', 'Choose a password with at least 8 characters.':'اختر كلمة مرور من 8 أحرف على الأقل.', 'The passwords do not match.':'كلمتا المرور غير متطابقتين.', 'Check your email and confirm your address to finish creating your account.':'تحقق من بريدك الإلكتروني وأكد عنوانك لإكمال إنشاء الحساب.', 'Your account is ready. Welcome to EVERSTAR.':'حسابك جاهز. أهلاً بك في EVERSTAR.', 'If an account exists for that email, a password reset link has been sent.':'إذا كان هناك حساب بهذا البريد، فقد أرسلنا رابط إعادة تعيين كلمة المرور.' });

Object.assign(AR_TRANSLATIONS, {"Your private universe, made for memories that matter.":"عالمك الخاص، صُمّم للذكريات التي تستحق البقاء.","EVERSTAR is a private space to preserve the moments of your life.":"EVERSTAR مساحة خاصة لحفظ لحظات حياتك.","Write a memory, add photos or files, and let it become a star in your personal galaxy.":"اكتب ذكرى وأرفق الصور أو الملفات، ودعها تصبح نجمة في مجرتك الخاصة.","Create a time capsule and choose when it can be opened. Its contents stay encrypted until that date.":"أنشئ كبسولة زمنية وحدد موعد فتحها. تبقى محتوياتها مشفّرة حتى ذلك التاريخ.","Your memories follow you across devices when you sign in to your account.":"ذكرياتك ترافقك عبر أجهزتك عند تسجيل الدخول إلى حسابك.","Your private universe":"عالمك الخاص","Preserve moments":"احفظ اللحظات","Seal for the future":"اختمها للمستقبل","Revisit your story":"استرجع قصتك","Private by design":"الخصوصية أولاً","EVERSTAR keeps your memories in one personal place.":"يجمع EVERSTAR ذكرياتك في مساحة شخصية واحدة.","Save moments as glowing stars, search them, and explore them in your timeline.":"احفظ لحظاتك كنجوم مضيئة، وابحث عنها واستكشفها في خطك الزمني.","Choose a future date for a capsule. The app keeps it sealed until the date arrives.":"اختر تاريخاً مستقبلياً للكبسولة، وسيبقيها التطبيق مختومة حتى يحين موعدها.","Receive an alert when a capsule is ready, and revisit the memory whenever you wish.":"تلقَّ تنبيهاً عندما تصبح الكبسولة جاهزة، واسترجع الذكرى متى شئت.","Enable device notifications":"تفعيل إشعارات الجهاز","Device notifications":"إشعارات الجهاز","Allow EVERSTAR to notify this device when a capsule opens.":"اسمح لـ EVERSTAR بإشعار هذا الجهاز عند فتح كبسولة زمنية.","Notifications are enabled on this device.":"إشعارات هذا الجهاز مفعّلة.","Notifications are blocked by your browser. Change site permissions in your browser settings.":"الإشعارات محظورة من المتصفح. غيّر أذونات الموقع من إعدادات المتصفح.","Enable notifications":"تفعيل الإشعارات","Your browser does not support push notifications.":"متصفحك لا يدعم الإشعارات الفورية.","Allow notifications in the browser prompt to continue.":"اسمح بالإشعارات في نافذة المتصفح للمتابعة.","Device notification setup is not available yet.":"إعداد إشعارات الجهاز غير متاح بعد.","Notifications enabled for this device.":"تم تفعيل الإشعارات لهذا الجهاز.","Could not enable notifications. Please try again.":"تعذر تفعيل الإشعارات. حاول مرة أخرى.","Signed in successfully.":"تم تسجيل الدخول بنجاح.","Sign in failed.":"فشل تسجيل الدخول.","Memory deleted.":"تم حذف الذكرى.","Memory copied.":"تم نسخ الذكرى.","Could not load your universe.":"تعذر تحميل عالمك.","Could not save this memory.":"تعذر حفظ هذه الذكرى.","The opening date cannot be before the memory date.":"لا يمكن أن يسبق موعد الفتح تاريخ الذكرى.","Search memories":"ابحث في الذكريات","Search":"بحث","Saved":"تاريخ الحفظ","Annual reminder":"التذكير السنوي","days remaining":"يوم متبقٍ","Unlocked":"مفتوحة","Locked":"مختومة","Light theme":"الوضع الفاتح","Dark theme":"الوضع الداكن","Toggle theme":"تبديل المظهر","Sign out":"تسجيل الخروج","Main navigation":"التنقل الرئيسي"});
function I18n({ lang, children }) {
 if (lang !== 'ar') return children;
 const translateText = (value) => {
  const exact = AR_TRANSLATIONS[value.trim()];
  if (exact) return value.replace(value.trim(), exact);
  const keys = Object.keys(AR_TRANSLATIONS).sort((a,b) => b.length-a.length);
  return keys.reduce((text,key) => text.split(key).join(AR_TRANSLATIONS[key]), value);
 };
 const translate = (node) => {
  if (typeof node === 'string') return translateText(node);
  if (Array.isArray(node)) return node.map(translate);
  if (React.isValidElement(node)) {
   const props = { ...node.props };
   ['placeholder','title','aria-label'].forEach((key) => {
    if (typeof props[key] === 'string') props[key] = translateText(props[key]);
   });
   if (props.children !== undefined) props.children = translate(props.children);
   return React.cloneElement(node, props);
  }
  return node;
 };
 return <>{translate(children)}</>;
}

const tx = (value) => localStorage.getItem('everstar.language') === 'ar' ? (AR_TRANSLATIONS[value] || value) : value;
function LanguageSwitch({lang,setLang}) { return <button className="language-switch" type="button" onClick={()=>setLang(lang==='en'?'ar':'en')}>{lang==='en'?'عربي':'English'}</button>; }
const GalaxyBackground = React.memo(function GalaxyBackground() {
 const stars=Array.from({length:38},(_,i)=>({left:((i*37+11)%96)+'%',top:((i*61+7)%94)+'%',delay:-((i%9)*.7)+'s',duration:(5+i%6)+'s',size:(2+i%3)+'px'}));
 return <div className="galaxy-field" aria-hidden="true"><div className="galaxy-haze"/><div className="galaxy-ring ring-one"><i/></div><div className="galaxy-ring ring-two"><i/></div><div className="galaxy-ring ring-three"><i/></div>{stars.map((star,i)=><span key={i} className="drifting-star" style={{left:star.left,top:star.top,animationDelay:star.delay,animationDuration:star.duration,width:star.size,height:star.size}}/>)}</div>;
});

const fmt = (value) => {
  if (!value) return '—';
  return new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString(localStorage.getItem('everstar.language') === 'ar' ? 'ar-DZ' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const remaining = (value) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
function nextAnniversary(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  const now = new Date();
  let next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate());
  return next;
}
function StarConstellation({ memories, onOpen }) {
  if (!memories.length) return <div className="star-empty"><span>✦</span><b>Your universe is waiting</b><p>Save a memory and watch a new star appear in your sky.</p></div>;
  return <div className="constellation-sky" aria-label="Your memories constellation">
    <div className="constellation-glow"/>
    {memories.map((memory, index) => {
      const seed = String(memory.id || index).split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
      const x = 7 + (seed % 870) / 10;
      const y = 9 + ((seed >>> 5) % 740) / 10;
      const size = 12 + (seed % 9);
      const saved = memory.created_at || memory.date;
      const anniversary = nextAnniversary(memory.date);
      return <button key={memory.id} type="button" className={'constellation-star ' + (memory.isLocked ? 'star-sealed' : '')} style={{left:x+'%',top:y+'%', '--star-size':size+'px', '--star-delay':(seed%40)/10+'s'}} onClick={() => onOpen(memory)} aria-label={memory.isLocked ? 'Sealed time capsule' : memory.title}>
        <span className="star-core">✦</span>
        <span className="star-tooltip"><b>{memory.isLocked ? 'Sealed time capsule' : memory.title}</b><small>Saved · {fmt(saved)}</small><small>Annual reminder · {anniversary ? fmt(anniversary) : '—'}</small></span>
      </button>;
    })}
    <div className="sky-caption"><span>✦</span> Every star holds a moment <i>{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</i></div>
  </div>;
}


export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [page, setPage] = useState('overview');
  function navigateTo(nextPage) { startTransition(() => setPage(nextPage)); }
  const [lang, setLang] = useState(() => localStorage.getItem('everstar.language') || 'en');
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
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
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

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.rpc('get_app_access_status').then(({ data, error }) => {
      if (active && !error) setMaintenanceMode(data?.maintenance_mode === true);
    }).catch(() => {});
    return () => { active = false; };
  }, [session?.user?.id]);

  useEffect(() => { localStorage.setItem('everstar.theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { localStorage.setItem('everstar.language', lang); document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(async (registration) => {
      if (registration) setPushEnabled(Boolean(await registration.pushManager.getSubscription()));
    }).catch(() => {});
  }, []);

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
  const nav = [['overview', 'Overview', Grid2X2], ['memories', 'My memories', Star], ['capsules', 'Time capsules', LockKeyhole], ['timeline', 'Timeline', CalendarDays], ['guide', 'How it works', Sparkles], ['settings', 'Settings', Settings2]];
  const isOwner = session?.user?.app_metadata?.role === 'owner';
  if (isOwner) nav.push(['owner', 'Owner panel', ShieldCheck]);
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
  async function enableDeviceNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setToast('Your browser does not support push notifications.');
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setToast(permission === 'denied' ? 'Notifications are blocked by your browser. Change site permissions in your browser settings.' : 'Allow notifications in the browser prompt to continue.');
        return;
      }
      const registration = await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL });
      const { data: keyData, error: keyError } = await supabase.functions.invoke('push-api/public-key', { method: 'GET' });
      if (keyError || !keyData?.publicKey) throw new Error(keyData?.error || keyError?.message || 'Device notification setup is not available yet.');
      const padding = '='.repeat((4 - keyData.publicKey.length % 4) % 4);
      const rawKey = Uint8Array.from(atob((keyData.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: rawKey });
      const { error: saveError } = await supabase.functions.invoke('push-api/subscribe', { method: 'POST', body: subscription.toJSON() });
      if (saveError) throw saveError;
      setPushEnabled(true);
      setToast('Notifications enabled for this device.');
    } catch (e) {
      setToast(e.message || 'Could not enable notifications. Please try again.');
    } finally {
      setPushBusy(false);
    }
  }

  async function signOut() { await supabase.auth.signOut(); navigateTo('overview'); }

  if (!supabaseConfigured) return <div className="setup-screen"><div className="setup-card"><Aperture size={36}/><div className="eyebrow">MEMORIES BEYOND TIME</div><h1>Connect your private universe.</h1><p>EVERSTAR is ready for its secure backend. Add your Supabase project URL and publishable key to a local <code>.env</code> file to continue.</p><pre>VITE_SUPABASE_URL=https://your-project.supabase.co<br/>VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</pre><p className="setup-foot">Do not put a service-role key or encryption key in this file. Those belong only in Supabase server secrets.</p></div></div>;
  if (!authReady) return <div className="setup-screen"><div className="setup-card"><Aperture size={34}/><p>Opening your universe…</p></div></div>;
  if (!session || authMode === 'update') return <I18n lang={lang}><AuthPanel mode={authMode} setMode={setAuthMode} onDone={() => setAuthMode('login')} lang={lang} setLang={setLang} /></I18n>;
  if (maintenanceMode && !isOwner) return <I18n lang={lang}><div className="setup-screen"><div className="setup-card"><Aperture size={36}/><div className="eyebrow">EVERSTAR MEMORIES</div><h1>{lang === 'ar' ? 'التطبيق في وضع الصيانة' : 'EVERSTAR is under maintenance'}</h1><p>{lang === 'ar' ? 'نعمل على تحسين تجربتك. يرجى العودة بعد قليل.' : 'We are improving your experience. Please check back soon.'}</p><button className="outline-btn" onClick={signOut}>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</button></div></div></I18n>;

  return <I18n lang={lang}><div className={'app ' + (dark ? 'dark' : 'light')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <GalaxyBackground/><div className="nebula n1"/><div className="nebula n2"/>
    <main className="main">
      <header className="topbar topbar-universe">
        <a className="brand brand-top" href="#/" onClick={(e)=>{e.preventDefault();navigateTo('overview')}}><span className="brand-icon"><Aperture/></span><span><b>everstar</b><small>MEMORIES BEYOND TIME</small></span></a>
        <nav className="top-navigation" aria-label="Main navigation">{nav.map(([id,label,Icon])=><button key={id} className={'top-nav-button '+(page===id?'active':'')} onClick={()=>navigateTo(id)}><Icon size={15}/><span>{label}</span>{id==='capsules'&&locked.length>0?<i>{locked.length}</i>:null}</button>)}</nav>
        <div className="top-right"><LanguageSwitch lang={lang} setLang={setLang}/><button className="icon-btn" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button><div className="notice-wrap"><button className="icon-btn" onClick={()=>setNoticeOpen(!noticeOpen)}><Bell size={17}/>{unread>0&&<i className="notice-dot"/>}</button>{noticeOpen&&<div className="notice-panel"><b>Notifications</b>{notifications.length?notifications.map(n=><button key={n.id} className={'notice-item '+(!n.read_at?'unread':'')} onClick={()=>markRead(n.id)}><span>{n.title}</span><small>{n.body}</small><time>{fmt(n.created_at)}</time></button>):<p>No notifications yet. New capsule openings will appear here.</p>}</div>}</div><button className="icon-btn account-btn" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div>
      </header>
      <div className="content">
        {error && <div className="inline-error"><AlertCircle size={16}/>{error}<button onClick={() => setError('')}><X size={14}/></button></div>}
        {page === 'owner' && isOwner && <React.Suspense fallback={<div className="owner-loading">Loading owner controls…</div>}><OwnerDashboard supabase={supabase} session={session} lang={lang}/></React.Suspense>}
        {page === 'overview' && <>
          <section className="hero"><div className="eyebrow"><Sparkles size={13}/> A LITTLE SPACE, JUST FOR YOU</div><h1>Your life, written<br/><em>in the stars.</em></h1><p>Some moments pass. The ones that matter deserve a place in the universe — and a chance to find you again.</p><button className="gold-btn" onClick={() => setModal(true)}><Plus size={17}/> Preserve a moment <span>↗</span></button><div className="orbit-art"><div className="orbit o1"/><div className="orbit o2"/><div className="globe"><Star fill="currentColor" size={28}/></div><i>✦</i><b>✧</b><small>·</small></div><div className="hero-bottom"><span>✦ &nbsp; Every memory is a world.</span><span>YOUR PRIVATE UNIVERSE</span></div></section>
          <section className="about-everstar">
            <div className="about-intro"><div className="eyebrow">YOUR PRIVATE UNIVERSE</div><h2>Your private universe, made for memories that matter.</h2><p>EVERSTAR is a private space to preserve the moments of your life. Write a memory, add photos or files, and let it become a star in your personal galaxy. Create a time capsule and choose when it can be opened. Its contents stay encrypted until that date. Your memories follow you across devices when you sign in to your account.</p></div>
            <div className="about-grid">
              <article className="about-card"><span><Star/></span><h3>Preserve moments</h3><p>Save moments as glowing stars, search them, and explore them in your timeline.</p></article>
              <article className="about-card"><span><LockKeyhole/></span><h3>Seal for the future</h3><p>Choose a future date for a capsule. The app keeps it sealed until the date arrives.</p></article>
              <article className="about-card"><span><Bell/></span><h3>Revisit your story</h3><p>Receive an alert when a capsule is ready, and revisit the memory whenever you wish.</p></article>
              <article className="about-card"><span><Aperture/></span><h3>Private by design</h3><p>EVERSTAR keeps your memories in one personal place, protected by your account.</p></article>
            </div>
          </section>
          <section className="stats"><Stat icon={<Star/>} value={memories.length} label="MEMORIES KEPT"/><Stat icon={<LockKeyhole/>} value={locked.length} label="TIME CAPSULES" variant="lilac"/><Stat icon={<Sparkles/>} value={ready.length} label="READY TO REVISIT" variant="mint"/><div className="quote"><b>“</b><span>The smallest moments often leave<br/>the deepest light.</span></div></section>
          <section className="section"><div className="section-head"><div><div className="eyebrow">YOUR CONSTELLATION</div><h2>Recent memories</h2></div><button className="link-btn" onClick={() => navigateTo('memories')}>Explore all <ChevronRight size={15}/></button></div><StarConstellation memories={memories.slice(0, 24)} onOpen={openMemory}/><div className="constellation-actions"><button className="gold-btn" onClick={() => navigateTo("memories")}>Explore all stars <ChevronRight size={15}/></button><button className="outline-btn" onClick={() => setModal(true)}><Plus size={15}/> Make a new memory</button></div></section>
          <section className="capsule-promo"><span className="lock-symbol"><LockKeyhole/></span><div><div className="eyebrow">A MESSAGE FROM THE PAST</div><h3>{locked.length ? locked.length + ' memories are still becoming.' : 'Your next chapter is waiting.'}</h3><p>{locked.length ? 'Your sealed memories stay protected until their chosen opening date.' : 'Create a time capsule for the person you will be tomorrow.'}</p></div><button className="outline-btn" onClick={() => navigateTo('capsules')}>Visit time capsules <ChevronRight size={15}/></button></section>
        </>}
        {page === 'memories' && <><PageHead eyebrow="THE MOMENTS THAT MADE YOU" title="Your memories" desc="Every little thing you chose not to let disappear." action={() => setModal(true)}/><Toolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}/><StarConstellation memories={visible} onOpen={openMemory}/></>}
        {page === 'capsules' && <><PageHead eyebrow="SEALED WITH A PROMISE" title="Time capsules" desc="Messages from who you were, waiting for who you will become." action={() => setModal(true)}/><div className="capsule-note"><LockKeyhole/> Capsule contents are encrypted. The server will not release them before the opening date.</div>{locked.sort((a,b) => new Date(a.unlockAt) - new Date(b.unlockAt)).map((m) => <button className="capsule-row" key={m.id} onClick={() => openMemory(m)}><span className="lock-symbol"><LockKeyhole/></span><span className="capsule-title"><b>Sealed memory</b><small>Private capsule · saved {fmt(m.date)}</small></span><span className="unlock-date"><b>{fmt(m.unlockAt)}</b><small>{remaining(m.unlockAt)} days remaining</small></span><LockKeyhole/></button>)}{!locked.length && <Empty title="Your sky is open" text="No sealed capsules yet. Create one for a future you." onClick={() => setModal(true)}/>}<div className="section-head ready-head"><div className="eyebrow">THE MOMENT HAS ARRIVED</div><h2>Ready to revisit</h2></div><div className="cards">{ready.map((m, i) => <MemoryCard key={m.id} memory={m} index={i} onClick={() => openMemory(m)}/>)}</div></>}
        {page === 'timeline' && <><PageHead eyebrow="A LIFE IN LITTLE CHAPTERS" title="Your timeline" desc="Look back at the moments that shaped your universe."/><div className="timeline">{[...memories].sort((a,b) => new Date(b.date) - new Date(a.date)).map((m) => <button className="timeline-row" key={m.id} onClick={() => openMemory(m)}><time>{fmt(m.date)}</time><i style={{ background: m.color || '#e6bd79' }}/><span><b>{m.isLocked ? 'Sealed memory' : m.title}</b><small>{m.isLocked ? '⌑ Sealed until ' + fmt(m.unlockAt) : '✦ Unlocked'}</small></span></button>)}</div>{!memories.length && <Empty title="Your story begins here" text="Your timeline will grow as you preserve moments." onClick={() => setModal(true)}/>}</>}
        {page === 'guide' && <section className="info-page"><PageHead eyebrow="EVERSTAR GUIDE" title="How it works" desc="A simple guide to your private universe."/><div className="info-grid"><article className="info-card"><span><Star/></span><h3>Create memories</h3><p>Write a title and story, choose its date, and optionally attach photos or files.</p></article><article className="info-card"><span><LockKeyhole/></span><h3>Seal a time capsule</h3><p>Choose a future opening date. Until then, the memory stays encrypted and hidden.</p></article><article className="info-card"><span><CalendarDays/></span><h3>Revisit your timeline</h3><p>See your memories in chronological order and open those whose time has arrived.</p></article><article className="info-card"><span><Aperture/></span><h3>Your privacy</h3><p>Your private memories belong to your account. Never share your password or recovery links.</p></article></div></section>}
        {page === 'settings' && <section className="info-page"><PageHead eyebrow="PERSONALIZE YOUR SPACE" title="Settings & preferences" desc="Manage how EVERSTAR looks and how you access your account."/><div className="settings-list"><div className="settings-row"><div><b>Appearance</b><p>Dark theme / Light theme</p></div><button className="outline-btn" onClick={() => setDark(!dark)}>{dark ? 'Light theme' : 'Dark theme'} {dark ? <Sun size={15}/> : <Moon size={15}/>}</button></div><div className="settings-row"><div><b>Language</b><p>English / Arabic</p></div><LanguageSwitch lang={lang} setLang={setLang}/></div><div className="settings-row"><div><b>Device notifications</b><p>Allow EVERSTAR to notify this device when a capsule opens.</p></div><button className="outline-btn" onClick={enableDeviceNotifications} disabled={pushBusy || pushEnabled}>{pushBusy ? 'Please wait…' : pushEnabled ? 'Notifications are enabled on this device.' : 'Enable device notifications'} <Bell size={15}/></button></div><div className="settings-row"><div><b>Account</b><p>Signed in as {session.user.email}</p></div><button className="outline-btn" onClick={signOut}><LogOut size={15}/> Sign out</button></div><div className="settings-row security-row"><div><b>Privacy & security</b><p>Your memories are encrypted before storage. Sealed capsules remain unavailable until their opening date.</p></div><LockKeyhole/></div></div></section>}
        <footer className="footer"><b><Aperture size={15}/> EVERSTAR</b><span>Made for the moments that make you, you.</span><small>© {new Date().getFullYear()} EVERSTAR</small></footer>
      </div>
    </main>
    {modal && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}><form className="modal" onSubmit={submitMemory}><div className="modal-head"><div><div className="eyebrow">PRESERVE A MOMENT</div><h2>Give it a place in the stars.</h2></div><button type="button" className="icon-btn" onClick={() => setModal(false)}><X/></button></div><label>Memory title<input required maxLength="90" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A moment worth keeping..."/></label><label>Your memory<textarea required rows="5" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write it just as you remember it."/></label><div className="form-grid"><label>When did it happen?<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, unlock: form.unlock < e.target.value ? e.target.value : form.unlock })}/></label><label>Open this memory<input required type="date" min={form.date} value={form.unlock} onChange={(e) => setForm({ ...form, unlock: e.target.value })}/></label></div><div className="form-grid"><label>How did it feel?<select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}><option>Hopeful</option><option>Grateful</option><option>Peaceful</option><option>Joyful</option><option>Nostalgic</option><option>Brave</option></select></label><label>Star colour<div className="colours">{['#e6bd79','#a89bff','#83c9c5','#ed9d9d','#d5d9e8'].map((c) => <button type="button" key={c} className={'colour ' + (form.color === c ? 'chosen' : '')} style={{ background: c }} onClick={() => setForm({ ...form, color: c })}/>)}</div></label></div><label className="file-label"><span><Paperclip size={15}/> Add photos or files (up to 25 MB each)</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4" onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []) })}/>{form.files.length > 0 && <small>{form.files.map((f) => f.name).join(', ')}</small>}</label><div className="local-note"><LockKeyhole size={15}/> Your memory is encrypted before it is stored. A sealed capsule stays unreadable through the app until its opening date.</div><button className="gold-btn full" type="submit" disabled={busy}>{busy ? 'Saving securely…' : <><Sparkles size={16}/> Save to my universe</>}</button></form></div>}
    {selected && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><div className="detail"><button className="detail-close icon-btn" onClick={() => setSelected(null)}><X/></button><Star className="detail-star" size={34} fill="currentColor" style={{ color: selected.color || '#e6bd79' }}/><div className="eyebrow">{selected.isLocked ? 'A SEALED TIME CAPSULE' : 'A MEMORY REVISITED'}</div><h2>{selected.isLocked ? 'This memory is still becoming.' : selected.title}</h2><div className="detail-meta">{fmt(selected.date)} · {selected.mood || 'A moment kept'}</div>{selected.isLocked ? <div className="locked-box"><LockKeyhole/><b>This memory is still sealed.</b><span>It will open on {fmt(selected.unlockAt)} — in {remaining(selected.unlockAt)} days.</span></div> : <><p>{selected.body}</p>{attachments.length > 0 && <div className="attachment-list"><b>Attachments</b>{attachments.map((a) => <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><Paperclip size={14}/>{a.fileName}</a>)}</div>}</>}<div className="detail-actions"><button className="outline-btn" onClick={() => { navigator.clipboard?.writeText(selected.title + '\n\n' + (selected.body || '')); setToast('Memory copied.'); }}>Copy memory</button><button className="delete-btn" onClick={() => removeMemory(selected.id)}><Trash2 size={15}/> Delete</button></div></div></div>}
    {toast && <div className="toast"><Sparkles size={15}/>{toast}</div>}
  </div></I18n>;
}

async function assertPasswordNotBreached(password) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  const response = await fetch('https://api.pwnedpasswords.com/range/' + hash.slice(0, 5), {
    headers: { 'Add-Padding': 'true' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Password safety verification is temporarily unavailable. Please try again.');
  const suffix = hash.slice(5);
  const compromised = (await response.text()).split(/\\r?\\n/).some(line => {
    const [candidate, count] = line.trim().split(':');
    return candidate === suffix && Number(count) > 0;
  });
  if (compromised) throw new Error('This password appears in known data breaches. Please choose a different password.');
}

function AuthPanel({ mode, setMode, onDone, lang, setLang }) {
  const [signupAllowed, setSignupAllowed] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase.rpc('get_app_access_status').then(({ data, error: accessError }) => {
      if (active) setSignupAllowed(!accessError && data?.allow_signups === true);
    }).catch(() => { if (active) setSignupAllowed(false); });
    return () => { active = false; };
  }, []);
  const title = mode === 'signup' ? 'Create your universe.' : mode === 'forgot' ? 'Find your way back.' : mode === 'update' ? 'A new key to your universe.' : 'Welcome back to your universe.';
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data: access, error: accessError } = await supabase.rpc('get_app_access_status');
        if (accessError) throw accessError;
        if (access?.allow_signups !== true) throw new Error('New registrations are currently disabled.');
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        if (password !== confirm) throw new Error('The passwords do not match.');
        await assertPasswordNotBreached(password);
        const redirectUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
        const { data, error: e } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } });
        if (e) throw e;
        if (data.session) setMessage('Your account is ready. Welcome to EVERSTAR.');
        else setMessage('Check your email and confirm your address to finish creating your account.');
      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString() });
        if (e) throw e;
        setMessage('If an account exists for that email, a password reset link has been sent.');
      } else if (mode === 'update') {
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
        if (password !== confirm) throw new Error('The passwords do not match.');
        await assertPasswordNotBreached(password);
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
  return <I18n lang={lang}><div className="auth-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}><div className="auth-orbit"><div/><div/><span>✦</span></div><form className="auth-card" onSubmit={submit}><div className="auth-tools"><LanguageSwitch lang={lang} setLang={setLang}/></div><div className="auth-brand"><Aperture size={34}/><span>EVERSTAR<small>MEMORIES BEYOND TIME</small></span></div><div className="eyebrow">YOUR PRIVATE UNIVERSE</div><h1>{title}</h1><p>{mode === 'signup' ? 'Create an account to keep your memories safe and in sync across devices.' : mode === 'forgot' ? 'We will send you a secure link to reset your password.' : mode === 'update' ? 'Choose a strong new password for your account.' : 'Sign in to revisit the moments you chose to keep.'}</p><label>Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={mode === 'update'}/></label>{mode !== 'forgot' && <label>{mode === 'update' ? 'New password' : 'Password'}<input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"/></label>}{(mode === 'signup' || mode === 'update') && <label>Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password"/></label>}{error && <div className="auth-error"><AlertCircle size={15}/>{error}</div>}{message && <div className="auth-success"><CheckCircle2 size={15}/>{message}</div>}<button className="gold-btn full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : mode === 'update' ? 'Save new password' : 'Sign in'} <ChevronRight size={16}/></button><div className="auth-links">{mode === 'login' && <><button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>{signupAllowed && <span>New here? <button type="button" onClick={() => { setMode('signup'); setMessage(''); setError(''); }}>Create account</button></span>}</>}{mode === 'signup' && <span>Already have an account? <button type="button" onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Sign in</button></span>}{mode === 'forgot' && <button type="button" onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Back to sign in</button>}{mode === 'update' && <button type="button" onClick={onDone}>Back to sign in</button>}</div></form></div></I18n>;
}
function Stat({ icon, value, label, variant = '' }) { return <div className="stat"><span className={'stat-icon ' + variant}>{icon}</span><div><strong>{value}</strong><small>{tx(label)}</small></div></div>; }
function PageHead({ eyebrow, title, desc, action }) { return <div className="page-head"><div><div className="eyebrow">{tx(eyebrow)}</div><h1>{tx(title)}</h1><p>{tx(desc)}</p></div>{action && <button className="gold-btn" onClick={action}><Plus size={16}/> {tx('New memory')}</button>}</div>; }
function Toolbar({ search, setSearch, filter, setFilter }) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tx('Find a memory…')} />
      </div>
      <div className="filters">
        {['all', 'open', 'locked'].map((f) => (
          <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
            {tx(f === 'all' ? 'All' : f === 'open' ? 'Unlocked' : 'Locked')}
          </button>
        ))}
      </div>
    </div>
  );
}
function MemoryCard({ memory, index, onClick }) {
  const locked = memory.isLocked;
  return <button className="memory-card" onClick={onClick}><div className={'card-art art-' + (index % 3)}><div className="tiny-stars">✦　·　✧　　·　✦</div><span className="memory-star" style={{ color: memory.color || '#e6bd79' }}><Star size={21} fill="currentColor"/></span><small>{fmt(memory.date)}</small>{locked && <i><LockKeyhole size={11}/> SEALED</i>}</div><div className="card-body"><small>{tx(locked ? 'TIME CAPSULE' : (memory.mood || 'MEMORY').toUpperCase())}</small><h3>{locked ? tx('Sealed memory') : memory.title}</h3><p>{locked ? tx('A little universe waiting for the right time.') : memory.body}</p><div>{locked ? tx('Opens') + ' ' + fmt(memory.unlockAt) : tx('Open memory')} <span>{locked ? <LockKeyhole size={13}/> : <ChevronRight size={15}/>}</span></div></div></button>;
}
function Empty({ title, text, onClick }) { return <div className="empty"><Star size={25}/><h3>{tx(title)}</h3><p>{tx(text)}</p><button className="outline-btn" onClick={onClick}><Plus size={15}/> {tx('Create a memory')}</button></div>; }

Object.assign(AR_TRANSLATIONS, {"Your private universe, made for memories that matter.":"عالمك الخاص، صُمّم للذكريات التي تستحق البقاء.","EVERSTAR is a private space to preserve the moments of your life.":"EVERSTAR مساحة خاصة لحفظ لحظات حياتك.","Write a memory, add photos or files, and let it become a star in your personal galaxy.":"اكتب ذكرى وأرفق الصور أو الملفات، ودعها تصبح نجمة في مجرتك الخاصة.","Create a time capsule and choose when it can be opened. Its contents stay encrypted until that date.":"أنشئ كبسولة زمنية وحدد موعد فتحها. تبقى محتوياتها مشفّرة حتى ذلك التاريخ.","Your memories follow you across devices when you sign in to your account.":"ذكرياتك ترافقك عبر أجهزتك عند تسجيل الدخول إلى حسابك.","Preserve moments":"احفظ اللحظات","Seal for the future":"اختمها للمستقبل","Revisit your story":"استرجع قصتك","Private by design":"الخصوصية أولاً","Save moments as glowing stars, search them, and explore them in your timeline.":"احفظ لحظاتك كنجوم مضيئة، وابحث عنها واستكشفها في خطك الزمني.","Choose a future date for a capsule. The app keeps it sealed until the date arrives.":"اختر تاريخاً مستقبلياً للكبسولة، وسيبقيها التطبيق مختومة حتى يحين موعدها.","Receive an alert when a capsule is ready, and revisit the memory whenever you wish.":"تلقَّ تنبيهاً عندما تصبح الكبسولة جاهزة، واسترجع الذكرى متى شئت.","Device notifications":"إشعارات الجهاز","Allow EVERSTAR to notify this device when a capsule opens.":"اسمح لـ EVERSTAR بإشعار هذا الجهاز عند فتح كبسولة زمنية.","Enable device notifications":"تفعيل إشعارات الجهاز","Notifications are enabled on this device.":"إشعارات هذا الجهاز مفعّلة.","Notifications are blocked by your browser. Change site permissions in your browser settings.":"الإشعارات محظورة من المتصفح. غيّر أذونات الموقع من إعدادات المتصفح.","Enable notifications":"تفعيل الإشعارات","Your browser does not support push notifications.":"متصفحك لا يدعم الإشعارات الفورية.","Allow notifications in the browser prompt to continue.":"اسمح بالإشعارات في نافذة المتصفح للمتابعة.","Device notification setup is not available yet.":"إعداد إشعارات الجهاز غير متاح بعد.","Notifications enabled for this device.":"تم تفعيل إشعارات هذا الجهاز.","Could not enable notifications. Please try again.":"تعذر تفعيل الإشعارات. حاول مرة أخرى."});
