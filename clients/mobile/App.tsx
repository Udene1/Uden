import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, StatusBar } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CheckCircle2, ChevronRight, Clock3, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, XCircle, Zap, CircleAlert } from 'lucide-react-native';
import { CLIENT_CAPABILITIES } from '@ai-work-partner/shared';
import { createEngineApi, defaultEngineUrl, EngineApi, Task, TaskStatus } from './src/api';

const ENGINE_URL_KEY = 'uden.engine.url';
const API_KEY_KEY = 'uden.engine.api_key';
const ACTIVE_STATUSES: TaskStatus[] = ['pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'approved'];

function statusLabel(status: TaskStatus): string {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatCost(cents: number): string { return `$${(cents / 100).toFixed(2)}`; }

function ConnectionScreen({ onConnected }: { onConnected: (api: EngineApi, url: string) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [url, setUrl] = useState(defaultEngineUrl());
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const base = url.trim();
      let resolvedKey = apiKey.trim();
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Workspace name is required.');
        const created = await createEngineApi(base, '').registerTenant(name.trim(), email.trim());
        resolvedKey = created.api_key;
        setApiKey(resolvedKey);
      }
      if (!resolvedKey) throw new Error('API key is required.');
      const client = createEngineApi(base, resolvedKey);
      await client.getTenant();
      await SecureStore.setItemAsync(ENGINE_URL_KEY, base);
      await SecureStore.setItemAsync(API_KEY_KEY, resolvedKey);
      onConnected(client, base);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect to Uden.'); }
    finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.connectionContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}><Sparkles size={22} color={COLORS.accent} /></View>
        <Text style={styles.eyebrow}>UDEN</Text>
        <Text style={styles.connectionTitle}>{mode === 'signin' ? 'Sign in to your work system.' : 'Create your Uden workspace.'}</Text>
        <Text style={styles.connectionText}>{mode === 'signin' ? 'Sign in with the tenant API key for your Uden account.' : 'Create the tenant that owns your projects, tasks, executions, approvals, graph, and usage.'}</Text>
        <View style={styles.authSwitch}><TouchableOpacity onPress={() => { setMode('signin'); setError(''); setApiKey(''); }} style={[styles.authTab, mode === 'signin' && styles.authTabActive]}><Text style={[styles.authTabText, mode === 'signin' && styles.authTabTextActive]}>Sign in</Text></TouchableOpacity><TouchableOpacity onPress={() => { setMode('signup'); setError(''); setApiKey(''); }} style={[styles.authTab, mode === 'signup' && styles.authTabActive]}><Text style={[styles.authTabText, mode === 'signup' && styles.authTabTextActive]}>Create account</Text></TouchableOpacity></View>
        <View style={styles.field}><Text style={styles.fieldLabel}>ENGINE URL</Text><TextInput autoCapitalize="none" autoCorrect={false} value={url} onChangeText={setUrl} placeholder="https://your-engine.example/api/v1" placeholderTextColor={COLORS.muted} style={styles.fieldInput} /></View>
        {mode === 'signup' && <><View style={styles.field}><Text style={styles.fieldLabel}>WORKSPACE NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Your workspace" placeholderTextColor={COLORS.muted} style={styles.fieldInput} /></View><View style={styles.field}><Text style={styles.fieldLabel}>EMAIL (OPTIONAL)</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={COLORS.muted} style={styles.fieldInput} /></View></>}
        {mode === 'signin' && <View style={styles.field}><Text style={styles.fieldLabel}>API KEY</Text><TextInput autoCapitalize="none" autoCorrect={false} secureTextEntry value={apiKey} onChangeText={setApiKey} placeholder="Paste your Uden API key" placeholderTextColor={COLORS.muted} style={styles.fieldInput} /></View>}
        {!!error && <ErrorBox text={error} />}
        <TouchableOpacity disabled={!url.trim() || busy || (mode === 'signin' ? !apiKey.trim() : !name.trim())} onPress={() => void submit()} style={[styles.primary, (!url.trim() || busy || (mode === 'signin' ? !apiKey.trim() : !name.trim())) && styles.disabled]}>
          {busy ? <ActivityIndicator size="small" color={COLORS.bg} /> : <ShieldCheck size={17} color={COLORS.bg} />}
          <Text style={styles.primaryText}>{busy ? (mode === 'signup' ? 'Creating…' : 'Signing in…') : (mode === 'signup' ? 'Create workspace' : 'Sign in')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
export default function App() {
  const capabilities = CLIENT_CAPABILITIES.mobile;
  const [api, setApi] = useState<EngineApi | null>(null);
  const [engineUrl, setEngineUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'active' | 'attention' | 'history'>('active');

  const loadTasks = useCallback(async (client: EngineApi, showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const next = await client.getTasks();
      setTasks(next);
      if (selectedTask) {
        const fresh = next.find((task) => task.id === selectedTask.id);
        if (fresh) setSelectedTask(fresh);
      }
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load work.'); }
    finally { if (showSpinner) setRefreshing(false); }
  }, [selectedTask]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [url, key] = await Promise.all([SecureStore.getItemAsync(ENGINE_URL_KEY), SecureStore.getItemAsync(API_KEY_KEY)]);
        if (!mounted) return;
        if (url && key) {
          const client = createEngineApi(url, key);
          await client.getTenant();
          if (!mounted) return;
          setEngineUrl(url); setApi(client); await loadTasks(client);
        }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Saved Uden connection is unavailable.'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!api || !tasks.some((task) => ACTIVE_STATUSES.includes(task.status) || task.status === 'awaiting-approval')) return;
    const timer = setInterval(() => { void loadTasks(api); }, 3000);
    return () => clearInterval(timer);
  }, [api, tasks, loadTasks]);

  const activeTasks = useMemo(() => tasks.filter((task) => ACTIVE_STATUSES.includes(task.status)), [tasks]);
  const approvalTasks = useMemo(() => tasks.filter((task) => task.status === 'awaiting-approval'), [tasks]);
  const attentionTasks = useMemo(() => tasks.filter((task) => task.status === 'awaiting-approval' || task.status === 'failed' || task.status === 'rejected'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'completed' || task.status === 'failed' || task.status === 'rejected'), [tasks]);
  const visibleTasks = tab === 'active' ? activeTasks : tab === 'attention' ? attentionTasks : completedTasks;

  const startWork = async () => {
    if (!api || !prompt.trim()) return;
    setWorking(true); setError('');
    try {
      const task = await api.createTask(prompt.trim());
      setPrompt(''); setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      setSelectedTask(task); setTab('active');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to start work.'); }
    finally { setWorking(false); }
  };

  const approve = async (task: Task) => {
    if (!api) return;
    setWorking(true); setError('');
    try {
      const updated = await api.approveTask(task.id);
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedTask(updated); setTab('active');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to approve work.'); }
    finally { setWorking(false); }
  };

  const disconnect = async () => {
    await SecureStore.deleteItemAsync(ENGINE_URL_KEY); await SecureStore.deleteItemAsync(API_KEY_KEY);
    setApi(null); setEngineUrl(''); setTasks([]); setSelectedTask(null); setError('');
  };

  if (loading) return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={COLORS.bg} /><View style={styles.center}><View style={styles.loadingMark}><Sparkles size={19} color={COLORS.accent} /></View><ActivityIndicator color={COLORS.accent} /><Text style={styles.muted}>Loading your workspace…</Text></View></SafeAreaView>;
  if (!api) return <ConnectionScreen onConnected={(client, url) => { setApi(client); setEngineUrl(url); setError(''); void loadTasks(client); }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerIdentity}><View style={styles.avatar}><Sparkles size={17} color={COLORS.accent} /></View><View><Text style={styles.eyebrow}>UDEN</Text><Text style={styles.headerTitle}>Work, in motion.</Text></View></View>
          <TouchableOpacity onPress={disconnect} accessibilityLabel="Disconnect" style={styles.iconButton}><LogOut size={18} color={COLORS.muted} /></TouchableOpacity>
        </View>

        <View style={styles.connectionPill}><View style={styles.liveDot} /><Text style={styles.connectionPillText}>Engine connected</Text><Text numberOfLines={1} style={styles.connectionUrl}>{engineUrl.replace(/^https?:\/\//, '')}</Text></View>
        {!!error && <ErrorBox text={error} />}

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}><View><Text style={styles.heroKicker}>NEW WORK</Text><Text style={styles.heroTitle}>What should Uden handle?</Text></View><View style={styles.heroIcon}><Zap size={18} color={COLORS.accent} /></View></View>
          <TextInput value={prompt} onChangeText={setPrompt} placeholder="Describe the outcome you need…" placeholderTextColor={COLORS.muted} multiline style={styles.input} />
          <View style={styles.heroFooter}>
            <Text style={styles.hint}>Uden plans · executes · verifies</Text>
            <TouchableOpacity disabled={!prompt.trim() || working} onPress={startWork} style={[styles.primaryCompact, (!prompt.trim() || working) && styles.disabled]}>
              {working ? <ActivityIndicator size="small" color={COLORS.bg} /> : <Plus size={16} color={COLORS.bg} />}
              <Text style={styles.primaryText}>{working ? 'Starting…' : 'Start'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {approvalTasks.length > 0 && (
          <TouchableOpacity onPress={() => setTab('attention')} style={styles.attentionBanner}>
            <View style={styles.attentionIcon}><CircleAlert size={18} color={COLORS.warning} /></View>
            <View style={styles.flex}><Text style={styles.attentionTitle}>{approvalTasks.length} approval{approvalTasks.length === 1 ? '' : 's'} need your decision</Text><Text style={styles.attentionText}>Uden is waiting for you before continuing.</Text></View>
            <ChevronRight size={18} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Work</Text><Text style={styles.sectionSub}>{activeTasks.length} active · {completedTasks.length} recorded</Text></View>
          <TouchableOpacity onPress={() => void loadTasks(api, true)} style={styles.refreshButton}>{refreshing ? <ActivityIndicator size="small" color={COLORS.muted} /> : <RefreshCw size={16} color={COLORS.muted} />}</TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {([['active', 'Active', activeTasks.length], ['attention', 'Attention', attentionTasks.length], ['history', 'History', completedTasks.length]] as const).map(([key, label, count]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>{count > 0 && <Text style={[styles.tabCount, tab === key && styles.tabCountActive]}>{count}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {visibleTasks.length === 0 ? <EmptyState tab={tab} /> : <View style={styles.list}>{visibleTasks.slice(0, 8).map((task) => <TaskRow key={task.id} task={task} onPress={() => setSelectedTask(task)} />)}</View>}

        {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onApprove={() => void approve(selectedTask)} busy={working} />}
        <Text style={styles.capabilities}>{capabilities.length} mobile capabilities · deeper project workflows stay on desktop</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const isAttention = task.status === 'awaiting-approval';
  return <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.row, isAttention && styles.rowAttention]}>
    <View style={[styles.taskIcon, isAttention && styles.taskIconAttention]}>{task.status === 'completed' ? <CheckCircle2 size={18} color={COLORS.success} /> : task.status === 'failed' || task.status === 'rejected' ? <XCircle size={18} color={COLORS.danger} /> : <Clock3 size={18} color={isAttention ? COLORS.warning : COLORS.accent} />}</View>
    <View style={styles.flex}><Text numberOfLines={2} style={styles.rowTitle}>{task.prompt}</Text><View style={styles.rowMeta}><Text style={styles.rowStatus}>{statusLabel(task.status)}</Text><Text style={styles.dot}>·</Text><Text style={styles.rowText}>{formatCost(task.totalCostCents)}</Text></View></View>
    <ChevronRight size={17} color={COLORS.muted} />
  </TouchableOpacity>;
}

function EmptyState({ tab }: { tab: 'active' | 'attention' | 'history' }) {
  const title = tab === 'active' ? 'Nothing running' : tab === 'attention' ? 'Nothing needs you' : 'No recorded results';
  const text = tab === 'active' ? 'When work starts, its live execution state will appear here.' : tab === 'attention' ? 'Uden will surface approvals, failures, and other intervention here.' : 'Completed and failed work will remain available here.';
  return <View style={styles.empty}><View style={styles.emptyIcon}>{tab === 'attention' ? <ShieldCheck size={20} color={COLORS.success} /> : tab === 'history' ? <CheckCircle2 size={20} color={COLORS.muted} /> : <Clock3 size={20} color={COLORS.muted} />}</View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

function TaskDetail({ task, onClose, onApprove, busy }: { task: Task; onClose: () => void; onApprove: () => void; busy: boolean }) {
  return <View style={styles.detail}>
    <View style={styles.sectionHeader}><View><Text style={styles.detailKicker}>EXECUTION</Text><Text style={styles.sectionTitle}>Work detail</Text></View><TouchableOpacity onPress={onClose} style={styles.iconButton}><XCircle size={18} color={COLORS.muted} /></TouchableOpacity></View>
    <Text style={styles.detailPrompt}>{task.prompt}</Text>
    <View style={styles.detailGrid}><Meta label="STATUS" value={statusLabel(task.status)} /><Meta label="MODEL" value={task.modelUsed || 'Not recorded'} /><Meta label="COST" value={formatCost(task.totalCostCents)} /><Meta label="QUALITY" value={task.qualityScore == null ? 'Not recorded' : String(task.qualityScore)} /></View>
    {task.output ? <View style={styles.output}><Text style={styles.metaLabel}>RECORDED OUTPUT</Text><Text style={styles.outputText}>{task.output}</Text></View> : null}
    {task.status === 'awaiting-approval' && <TouchableOpacity disabled={busy} onPress={onApprove} style={[styles.primary, busy && styles.disabled]}><ShieldCheck size={17} color={COLORS.bg} /><Text style={styles.primaryText}>{busy ? 'Approving…' : 'Approve work'}</Text></TouchableOpacity>}
    <Text style={styles.caveat}>Recorded output is evidence of execution, not independent proof of correctness.</Text>
  </View>;
}
function Meta({ label, value }: { label: string; value: string }) { return <View style={styles.meta}><Text style={styles.metaLabel}>{label}</Text><Text style={styles.metaValue}>{value}</Text></View>; }
function ErrorBox({ text }: { text: string }) { return <View style={styles.errorBox}><XCircle size={17} color={COLORS.danger} /><Text style={styles.errorText}>{text}</Text></View>; }

const COLORS = {
  bg: '#080a0e', surface: '#10141a', surface2: '#151a21', elevated: '#1b212a', border: '#242b35',
  text: '#f4f7fb', secondary: '#a6afbd', muted: '#697483', accent: '#79b5ff', accentStrong: '#4d96ff',
  success: '#55d99b', warning: '#f4c55e', danger: '#ff7c87',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, gap: 14 },
  connectionContainer: { padding: 24, gap: 16, justifyContent: 'center', flexGrow: 1 },
  brandMark: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10213a', borderWidth: 1, borderColor: '#1f3c61' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10213a', borderWidth: 1, borderColor: '#1f3c61' },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2.1 },
  headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  connectionPill: { height: 30, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  connectionPillText: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  connectionUrl: { color: COLORS.muted, fontSize: 10, flex: 1, textAlign: 'right' },
  hero: { borderRadius: 20, borderWidth: 1, borderColor: '#26364a', backgroundColor: COLORS.surface, padding: 17, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#163b67', opacity: .12, top: -95, right: -65 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { color: COLORS.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '750', marginTop: 5, letterSpacing: -.25 },
  heroIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10213a' },
  input: { color: COLORS.text, fontSize: 16, lineHeight: 23, minHeight: 105, textAlignVertical: 'top', marginTop: 14 },
  heroFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hint: { color: COLORS.muted, fontSize: 10, flex: 1 },
  primary: { minHeight: 46, backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  primaryCompact: { minHeight: 38, backgroundColor: COLORS.accent, borderRadius: 11, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  disabled: { opacity: .42 },
  primaryText: { color: COLORS.bg, fontWeight: '800', fontSize: 13 },
  attentionBanner: { borderRadius: 15, borderWidth: 1, borderColor: '#5a4923', backgroundColor: '#1b170d', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  attentionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#2a210e', alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { color: '#f7df9e', fontWeight: '700', fontSize: 13 },
  attentionText: { color: '#a99461', fontSize: 10, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '750', letterSpacing: -.15 },
  sectionSub: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  refreshButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  tabs: { height: 43, borderRadius: 12, padding: 3, backgroundColor: COLORS.surface2, flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabActive: { backgroundColor: COLORS.elevated, borderWidth: 1, borderColor: COLORS.border },
  tabText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: COLORS.text },
  tabCount: { color: COLORS.muted, fontSize: 9, fontWeight: '800' },
  tabCountActive: { color: COLORS.accent },
  list: { gap: 8 },
  row: { minHeight: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: COLORS.surface },
  rowAttention: { borderColor: '#50431f', backgroundColor: '#14130f' },
  taskIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  taskIconAttention: { backgroundColor: '#29220f' },
  flex: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 13, lineHeight: 18, fontWeight: '650' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  rowStatus: { color: COLORS.secondary, fontSize: 10, fontWeight: '600' },
  dot: { color: COLORS.muted, fontSize: 10 },
  rowText: { color: COLORS.muted, fontSize: 10 },
  empty: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 25, alignItems: 'center', backgroundColor: COLORS.surface },
  emptyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface2 },
  emptyTitle: { color: COLORS.secondary, fontWeight: '700', marginTop: 9 },
  emptyText: { color: COLORS.muted, textAlign: 'center', marginTop: 5, lineHeight: 18, fontSize: 11, maxWidth: 280 },
  detail: { borderWidth: 1, borderColor: '#344153', borderRadius: 18, padding: 16, backgroundColor: COLORS.elevated, gap: 12 },
  detailKicker: { color: COLORS.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 3 },
  detailPrompt: { color: COLORS.text, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  detailGrid: { gap: 8, paddingVertical: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  metaValue: { color: COLORS.secondary, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  output: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 6 },
  outputText: { color: COLORS.secondary, lineHeight: 20, fontSize: 12 },
  caveat: { color: COLORS.muted, fontSize: 10, lineHeight: 16 },
  field: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, backgroundColor: COLORS.surface },
  fieldLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  fieldInput: { color: COLORS.text, fontSize: 15, marginTop: 9, padding: 0 },
  connectionTitle: { color: COLORS.text, fontSize: 30, fontWeight: '750', marginTop: 4, letterSpacing: -.6 },
  connectionText: { color: COLORS.secondary, fontSize: 14, lineHeight: 22 },
  errorBox: { borderWidth: 1, borderColor: '#6c2a32', borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#1c1012' },
  errorText: { color: '#ffb0b7', flex: 1, lineHeight: 17, fontSize: 12 },
  muted: { color: COLORS.muted, fontSize: 12 },
  capabilities: { color: '#4e5866', fontSize: 9, textAlign: 'center', marginTop: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#10213a', alignItems: 'center', justifyContent: 'center' },
});
