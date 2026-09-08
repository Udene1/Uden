import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ChevronRight, Clock3, Plus, ShieldCheck, Sparkles } from 'lucide-react-native';
import { CLIENT_CAPABILITIES } from '@ai-work-partner/shared';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const capabilities = CLIENT_CAPABILITIES.mobile;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>UDEN</Text><Text style={styles.title}>Your work, wherever you are.</Text></View><Sparkles size={20} color="#94a3b8" /></View>
        <View style={styles.composer}>
          <Text style={styles.sectionLabel}>NEW WORK</Text>
          <TextInput value={prompt} onChangeText={setPrompt} placeholder="What do you need Uden to work on?" placeholderTextColor="#64748b" multiline style={styles.input} />
          <TouchableOpacity disabled={!prompt.trim()} style={[styles.primary, !prompt.trim() && styles.disabled]}><Plus size={17} color="#020617" /><Text style={styles.primaryText}>Start work</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Active work</Text>
        <View style={styles.empty}><Clock3 size={20} color="#64748b" /><Text style={styles.emptyTitle}>Nothing running</Text><Text style={styles.emptyText}>Live graph and execution updates will appear here.</Text></View>
        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.row}><View style={styles.icon}><ShieldCheck size={18} color="#94a3b8" /></View><View style={styles.flex}><Text style={styles.rowTitle}>Approvals</Text><Text style={styles.rowText}>Review work that needs your decision.</Text></View><ChevronRight size={18} color="#64748b" /></View>
        <View style={styles.row}><View style={styles.icon}><CheckCircle2 size={18} color="#94a3b8" /></View><View style={styles.flex}><Text style={styles.rowTitle}>Results</Text><Text style={styles.rowText}>Review completed work and verification.</Text></View><ChevronRight size={18} color="#64748b" /></View>
        <Text style={styles.capabilities}>{capabilities.length} mobile capabilities · deep local workflows stay on desktop</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  container: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eyebrow: { color: '#38bdf8', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#f8fafc', fontSize: 27, fontWeight: '700', marginTop: 5, maxWidth: 310 },
  composer: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, backgroundColor: '#0f172a' },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  input: { color: '#f8fafc', fontSize: 16, minHeight: 110, textAlignVertical: 'top', marginTop: 12 },
  primary: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  disabled: { opacity: 0.45 },
  primaryText: { color: '#020617', fontWeight: '700' },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', marginTop: 10 },
  empty: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyTitle: { color: '#cbd5e1', fontWeight: '600', marginTop: 8 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 5, lineHeight: 20 },
  row: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  rowTitle: { color: '#f8fafc', fontWeight: '600' },
  rowText: { color: '#64748b', fontSize: 13, marginTop: 3 },
  capabilities: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 4 },
});
