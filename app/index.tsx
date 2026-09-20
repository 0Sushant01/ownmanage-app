import { StyleSheet, Text, View } from 'react-native'

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.indicator} />
          <Text style={styles.badgeText}>FOUNDATION READY</Text>
        </View>

        <Text style={styles.title}>OwnManage Mobile App</Text>
        <Text style={styles.subtitle}>
          React Native, Expo, TypeScript, Expo Router, and Axios initial foundation setup.
        </Text>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Navigation</Text>
          <Text style={styles.infoValue}>Expo Router v57</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Network</Text>
          <Text style={styles.infoValue}>Axios Configured</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Secure Storage</Text>
          <Text style={styles.infoValue}>Expo SecureStore</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Environment</Text>
          <Text style={styles.infoValue}>EXPO_PUBLIC_API_BASE_URL</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e2e8f0',
  },
})
