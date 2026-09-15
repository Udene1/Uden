import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CheckCircle2, ChevronRight, Clock3, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, XCircle } from 'lucide-react-native';
import { CLIENT_CAPABILITIES } from '@ai-work-partner/shared';
import { createEngineApi, defaultEngineUrl, EngineApi, Task, TaskStatus } from './src/api';

const ENGINE_URL_KEY = 'uden.engine.url';
const API_KEY_KEY = 'uden.engine.api_key';
const ACTIVE_STATUSES: TaskStatus[] = ['pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'approved'];

function statusLabel(status: TaskStatus): string {
  return status.replace(/-/g, ' ').replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ConnectionScreen({ onConnected }: { onConnected: (api: EngineApi, url: string) => void }) {
  const [url, setUrl] = useState(defaultEngineUrl());
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setError('');
    try {
      const api = createEngineApi(url, apiKey);
      await api.getTenant();
      await SecureStore.setItemAsync(ENGINE_URL_KEY, url.trim());
      await SecureStore.setItemAsync(API_KEY_KEY, apiKey.trim());
      onConnected(api, url.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to Uden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.connectionContainer} keyboardShouldPersistTaps="handled">
        <Sparkles size={24} color="#38bdf8" />
        <Text style={styles.eyebrow}>UDEN</Text>
        <Text style={styles.connectionTitle}>Connect your work engine.</Text>
        <Text style={styles.connectionText}>The mobile app talks to the real Uden engine. Your API key is stored in the device secure store and is never bundled into the APK.</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ENGINE URL</Text>
          <TextInput autoCapitalize="none" autoCorrect={false} value={url} onChangeText={setUrl} placeholder="https://your-engine.example/api/v1" placeholderTextColor="#475569" style={styles.fieldInput} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>API KEY</Text>
          <TextInput autoCapitalize="none" autoCorrect={false} secureTextEntry value={apiKey} onChangeText={setApiKey} placeholder="Paste your Uden API key" placeholderTextColor="#475569" style={styles.fieldInput} />
        </View>
        {!!error && <View style={styles.errorBox}><XCircle size={18} color="#f87171" /><Text style={styles.errorText}>{error}</Text></View>}
        <TouchableOpacity disabled={!url.trim() || !apiKey.trim() || busy} onPress={connect} style={[styles.primary, (!url.trim() || !apiKey.trim() || busy) && styles.disabled]}>
          {busy ? <ActivityIndicator size="small" color="#020617" /> : <ShieldCheck size={17} color="#020617" />}
          <Text style={styles.primaryText}>{busy ? 'Connecting…' : 'Connect to Uden'}</Text>
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load work.');
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, [selectedTask]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [url, key] = await Promise.all([
          SecureStore.getItemAsync(ENGINE_URL_KEY),
          SecureStore.getItemAsync(API_KEY_KEY),
        ]);
        if (!mounted) return;
        if (url && key) {
          const client = createEngineApi(url, key);
          await client.getTenant();
          if (!mounted) return;
          setEngineUrl(url);
          setApi(client);
          await loadTasks(client);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Saved Uden connection is unavailable.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!api || !tasks.some((task) => ACTIVE_STATUSES.includes(task.status) || task.status === 'awaiting-approval')) return;
    const timer = setInterval(() => { void loadTasks(api); }, 3000);
    return () => clearInterval(timer);
  }, [api, tasks, loadTasks]);

  const activeTasks = useMemo(() => tasks.filter((task) => ACTIVE_STATUSES.includes(task.status) || task.status === 'awaiting-approval'), [tasks]);
  const approvalTasks = useMemo(() => tasks.filter((task) => task.status === 'awaiting-approval'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'completed' || task.status === 'failed' || task.status === 'rejected'), [tasks]);

  const startWork = async () => {
    if (!api || !prompt.trim()) return;
    setWorking(true);
    setError('');
    try {
      const task = await api.createTask(prompt.trim());
      setPrompt('');
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      setSelectedTask(task);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start work.');
    } finally {
      setWorking(false);
    }
  };

  const approve = async (task: Task) => {
    if (!api) return;
    setWorking(true);
    try {
      const updated = await api.approveTask(task.id);
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve work.');
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    await SecureStore.deleteItemAsync(ENGINE_URL_KEY);
    await SecureStore.deleteItemAsync(API_KEY_KEY);
    setApi(null);
    setEngineUrl('');
    setTasks([]);
    setSelectedTask(null);
    setError('');
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#38bdf8" /><Text style={styles.muted}>Loading Uden…</Text></View></SafeAreaView>;
  }

  if (!api) return <ConnectionScreen onConnected={(client, url) => { setApi(client); setEngineUrl(url); setError(''); void loadTasks(client); }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>UDEN</Text><Text style={styles.title}>Your work, wherever you are.</Text><Text style={styles.connection}>{engineUrl}</Text></View>
          <TouchableOpacity onPress={disconnect} accessibilityLabel="Disconnect"><LogOut size={19} color="#64748b" /></TouchableOpacity>
        </View>

        {!!error && <View style={styles.errorBox}><XCircle size={18} color="#f87171" /><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.composer}>
          <Text style={styles.sectionLabel}>NEW WORK</Text>
          <TextInput value={prompt} onChangeText={setPrompt} placeholder="What do you need Uden to work on?" placeholderTextColor="#64748b" multiline style={styles.input} />
          <TouchableOpacity disabled={!prompt.trim() || working} onPress={startWork} style={[styles.primary, (!prompt.trim() || working) && styles.disabled]}>
            {working ? <ActivityIndicator size="small" color="#020617" /> : <Plus size={17} color="#020617" />}
            <Text style={styles.primaryText}>{working ? 'Working…' : 'Start work'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Active work</Text><TouchableOpacity onPress={() => void loadTasks(api, true)}><RefreshCw size={17} color="#64748b" /></TouchableOpacity></View>
        {activeTasks.length === 0 ? (
          <View style={styles.empty}><Clock3 size={20} color="#64748b" /><Text style={styles.emptyTitle}>Nothing running</Text><Text style={styles.emptyText}>When work is actually recorded by the engine, it will appear here.</Text></View>
        ) : activeTasks.map((task) => <TaskRow key={task.id} task={task} onPress={() => setSelectedTask(task)} />)}

        <Text style={styles.sectionTitle}>Approvals</Text>
        {approvalTasks.length === 0 ? <Text style={styles.muted}>No work is currently waiting for your decision.</Text> : approvalTasks.map((task) => <TaskRow key={task.id} task={task} onPress={() => setSelectedTask(task)} />)}

        <Text style={styles.sectionTitle}>Results</Text>
        {completedTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} onPress={() => setSelectedTask(task)} />)}
        {completedTasks.length === 0 && <Text style={styles.muted}>Completed and failed work will be recorded here.</Text>}

        {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} onApprove={() => void approve(selectedTask)} busy={working} />}
        <Text style={styles.capabilities}>{capabilities.length} mobile capabilities · deep local workflows stay on desktop</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.row}>
    <View style={styles.icon}>{task.status === 'completed' ? <CheckCircle2 size={18} color="#94a3b8" /> : task.status === 'failed' || task.status === 'rejected' ? <XCircle size={18} color="#94a3b8" /> : <Clock3 size={18} color="#94a3b8" />}</View>
    <View style={styles.flex}><Text numberOfLines={1} style={styles.rowTitle}>{task.prompt}</Text><Text style={styles.rowText}>{statusLabel(task.status)} · {formatCost(task.totalCostCents)}</Text></View>
    <ChevronRight size={18} color="#64748b" />
  </TouchableOpacity>;
}

function TaskDetail({ task, onClose, onApprove, busy }: { task: Task; onClose: () => void; onApprove: () => void; busy: boolean }) {
  return <View style={styles.detail}>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Work detail</Text><TouchableOpacity onPress={onClose}><XCircle size={18} color="#64748b" /></TouchableOpacity></View>
    <Text style={styles.detailPrompt}>{task.prompt}</Text>
    <View style={styles.meta}><Text style={styles.metaLabel}>STATUS</Text><Text style={styles.metaValue}>{statusLabel(task.status)}</Text></View>
    <View style={styles.meta}><Text style={styles.metaLabel}>MODEL</Text><Text style={styles.metaValue}>{task.modelUsed || 'Not recorded'}</Text></View>
    <View style={styles.meta}><Text style={styles.metaLabel}>COST</Text><Text style={styles.metaValue}>{formatCost(task.totalCostCents)}</Text></View>
    <View style={styles.meta}><Text style={styles.metaLabel}>QUALITY</Text><Text style={styles.metaValue}>{task.qualityScore == null ? 'Not recorded' : String(task.qualityScore)}</Text></View>
    {task.output ? <View style={styles.output}><Text style={styles.metaLabel}>RECORDED OUTPUT</Text><Text style={styles.outputText}>{task.output}</Text></View> : null}
    {task.status === 'awaiting-approval' && <TouchableOpacity disabled={busy} onPress={onApprove} style={[styles.primary, busy && styles.disabled]}><ShieldCheck size={17} color="#020617" /><Text style={styles.primaryText}>{busy ? 'Approving…' : 'Approve work'}</Text></TouchableOpacity>}
    <Text style={styles.caveat}>Output presence does not independently prove correctness. Review recorded evidence and verification before relying on the result.</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  container: { padding: 20, gap: 14, paddingBottom: 32 },
  connectionContainer: { padding: 24, gap: 16, justifyContent: 'center', flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eyebrow: { color: '#38bdf8', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#f8fafc', fontSize: 27, fontWeight: '700', marginTop: 5, maxWidth: 310 },
  connection: { color: '#475569', fontSize: 10, marginTop: 6, maxWidth: 300 },
  connectionTitle: { color: '#f8fafc', fontSize: 30, fontWeight: '700', marginTop: 4 },
  connectionText: { color: '#94a3b8', fontSize: 15, lineHeight: 23 },
  field: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 14, backgroundColor: '#0f172a' },
  fieldLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  fieldInput: { color: '#f8fafc', fontSize: 15, marginTop: 9, padding: 0 },
  composer: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, backgroundColor: '#0f172a' },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  input: { color: '#f8fafc', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginTop: 12 },
  primary: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  disabled: { opacity: 0.45 },
  primaryText: { color: '#020617', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 9 },
  empty: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyTitle: { color: '#cbd5e1', fontWeight: '600', marginTop: 8 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 5, lineHeight: 20 },
  row: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  rowTitle: { color: '#f8fafc', fontWeight: '600' },
  rowText: { color: '#64748b', fontSize: 13, marginTop: 3 },
  detail: { borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, backgroundColor: '#0b1220', gap: 10 },
  detailPrompt: { color: '#e2e8f0', fontSize: 16, lineHeight: 23 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  metaValue: { color: '#cbd5e1', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  output: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 10, gap: 6 },
  outputText: { color: '#cbd5e1', lineHeight: 20 },
  caveat: { color: '#64748b', fontSize: 11, lineHeight: 17 },
  muted: { color: '#64748b', fontSize: 13 },
  capabilities: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 6 },
  errorBox: { borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#1c0b0b' },
  errorText: { color: '#fca5a5', flex: 1, lineHeight: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
});
