import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useStripeIdentity } from '@stripe/stripe-identity-react-native';
import { router } from 'expo-router';

import { AnimatedCard } from '@/components/AnimatedCard';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { CardShadow, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';
import {
  createVerificationSession,
  fetchFavourites,
  fetchOrganisedJamaahs,
  actOnJoinRequest,
  Favourite,
  OrganisedJamaah,
} from '@/lib/api';

const logo = Image.resolveAssetSource(require('@/assets/images/icon.png'));

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const theme = useTheme();
  const [verifying, setVerifying] = useState(false);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [organised, setOrganised] = useState<OrganisedJamaah[]>([]);
  const [organisedExpanded, setOrganisedExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFavourites().then(setFavourites).catch(() => {});
      fetchOrganisedJamaahs().then(setOrganised).catch(() => {});
    }
  }, [user]);

  const fetchOptions = useCallback(async () => {
    const session = await createVerificationSession();
    return {
      sessionId: session.sessionId,
      ephemeralKeySecret: session.ephemeralKeySecret,
      brandLogo: logo,
    };
  }, []);

  const { status, present, loading: stripeLoading } = useStripeIdentity(fetchOptions);

  const handleVerify = useCallback(async () => {
    try {
      setVerifying(true);
      await present();
    } catch (e: any) {
      Alert.alert('Verification', e?.message || 'Could not start verification.');
    } finally {
      setVerifying(false);
    }
  }, [present]);

  // Refresh user when verification completes successfully
  if (status === 'FlowCompleted' && user && !user.is_verified) {
    refreshUser();
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        <View style={styles.toggleRow}>
          <ThemeToggle />
        </View>

        {/* Favourites Section */}
        {favourites.length > 0 && (
          <View>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.two }}>My Favourites</ThemedText>
            {favourites.map((fav) => (
              <Pressable
                key={fav.id}
                onPress={() => router.push(`/jamaah/${fav.jamaah.id}`)}>
                <View style={[styles.favRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="default" style={{ color: theme.text, fontWeight: '600' }}>
                      {fav.jamaah.address_label || fav.jamaah.location_type || 'Jama\'ah'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {fav.jamaah.prayer.charAt(0).toUpperCase() + fav.jamaah.prayer.slice(1)} · {fav.jamaah.member_count} joined
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="primary">›</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Organised Jamaahs Section */}
        {organised.length > 0 && (
          <View>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two }}
              onPress={() => setOrganisedExpanded(!organisedExpanded)}>
              <ThemedText type="subtitle">My Jama&apos;ahs</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
                {organisedExpanded ? '▲' : '▼'}
              </ThemedText>
            </Pressable>
            {organisedExpanded && organised.map((item) => (
              <View key={item.jamaah.id} style={[styles.favRow, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.two }]}>
                <Pressable
                  onPress={() => router.push(`/jamaah/${item.jamaah.id}`)}>
                  <ThemedText type="default" style={{ color: theme.text, fontWeight: '600' }}>
                    {item.jamaah.address_label || item.jamaah.location_type || 'Jama\'ah'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.jamaah.prayer.charAt(0).toUpperCase() + item.jamaah.prayer.slice(1)} · {item.jamaah.member_count} joined · {item.jamaah.status}
                  </ThemedText>
                </Pressable>
                {item.pending_requests.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      {item.pending_requests.length} pending request{item.pending_requests.length > 1 ? 's' : ''}
                    </ThemedText>
                    {item.pending_requests.map((req) => (
                      <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
                          {req.requester.name}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable
                            onPress={async () => {
                              try {
                                await actOnJoinRequest(req.id, 'accept');
                                setOrganised((prev) => prev.map((o) => o.jamaah.id === item.jamaah.id ? { ...o, pending_requests: o.pending_requests.filter((r) => r.id !== req.id) } : o));
                              } catch { Alert.alert('Error', 'Could not accept request.'); }
                            }}
                            style={[styles.actionBtn, { backgroundColor: '#059669' }]}>
                            <ThemedText type="small" style={{ color: '#FFF', fontWeight: '600' }}>Accept</ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={async () => {
                              try {
                                await actOnJoinRequest(req.id, 'decline');
                                setOrganised((prev) => prev.map((o) => o.jamaah.id === item.jamaah.id ? { ...o, pending_requests: o.pending_requests.filter((r) => r.id !== req.id) } : o));
                              } catch { Alert.alert('Error', 'Could not decline request.'); }
                            }}
                            style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}>
                            <ThemedText type="small" style={{ color: '#FFF', fontWeight: '600' }}>Decline</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* User Info at Bottom */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primaryContrast }]}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </ThemedText>
          </View>
          <View style={styles.nameRow}>
            <ThemedText type="title" style={[styles.userName, { color: theme.text }]}>
              {user?.name || 'User'}
            </ThemedText>
            {user?.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                <ThemedText style={{ fontSize: 14, color: '#F59E0B' }}>★</ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary">{user?.email}</ThemedText>
        </View>

        <AnimatedCard style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText style={styles.icon}>👤</ThemedText>
            </View>
            <View style={styles.cardContent}>
              <ThemedText themeColor="textSecondary" style={styles.cardLabel}>Full Name</ThemedText>
              <ThemedText style={[styles.cardValue, { color: theme.text }]}>{user?.name}</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.accent + '15' }]}>
              <ThemedText style={styles.icon}>✉️</ThemedText>
            </View>
            <View style={styles.cardContent}>
              <ThemedText themeColor="textSecondary" style={styles.cardLabel}>Email Address</ThemedText>
              <ThemedText style={[styles.cardValue, { color: theme.text }]}>{user?.email}</ThemedText>
            </View>
          </View>

          {user?.city && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.cardRow}>
                <View style={[styles.iconWrap, { backgroundColor: theme.success + '15' }]}>
                  <ThemedText style={styles.icon}>📍</ThemedText>
                </View>
                <View style={styles.cardContent}>
                  <ThemedText themeColor="textSecondary" style={styles.cardLabel}>Location</ThemedText>
                  <ThemedText style={[styles.cardValue, { color: theme.text }]}>{user.city}</ThemedText>
                </View>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: (user?.is_verified ? '#059669' : '#D97706') + '15' }]}>
              <ThemedText style={styles.icon}>{user?.is_verified ? '✅' : '🔒'}</ThemedText>
            </View>
            <View style={styles.cardContent}>
              <ThemedText themeColor="textSecondary" style={styles.cardLabel}>Verification Status</ThemedText>
              <ThemedText style={[styles.cardValue, { color: user?.is_verified ? '#059669' : theme.text }]}>
                {user?.is_verified ? 'Verified' : 'Not Verified'}
              </ThemedText>
            </View>
          </View>
        </AnimatedCard>

        {!user?.is_verified && (
          <Button
            title={stripeLoading || verifying ? 'Verifying...' : 'Get Verified'}
            onPress={handleVerify}
            disabled={stripeLoading || verifying}
            style={[styles.verifyButton, { backgroundColor: '#F59E0B' }]}
          />
        )}

        {(stripeLoading || verifying) && (
          <View style={styles.verifyLoading}>
            <ActivityIndicator color="#F59E0B" />
            <ThemedText type="small" themeColor="textSecondary">
              Processing verification...
            </ThemedText>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Log Out"
            variant="danger"
            onPress={logout}
            style={styles.logoutButton}
          />
        </View>

        <ThemedText themeColor="textSecondary" style={styles.version}>
          Version 1.0.0
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center', paddingVertical: Spacing.four },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    backgroundColor: 'transparent',
  },
  toggleRow: { alignItems: 'flex-end' },
  header: { alignItems: 'center', marginBottom: Spacing.two, gap: Spacing.one },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: { fontSize: 36, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  userName: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.three,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: { fontSize: 16, fontWeight: '500' },
  icon: { fontSize: 18 },
  divider: { height: 1, marginVertical: 2 },
  verifyButton: {
    borderRadius: 14,
    paddingVertical: 14,
  },
  verifyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonContainer: { marginTop: Spacing.two },
  logoutButton: { borderRadius: 14, paddingVertical: 14 },
  favSection: { marginTop: Spacing.two },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  pendingBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    marginLeft: Spacing.two,
  },
  actionBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 8,
  },
  version: { textAlign: 'center', fontSize: 12, opacity: 0.5, marginTop: Spacing.two },
});
