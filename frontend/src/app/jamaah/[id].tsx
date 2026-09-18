import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  createJoinRequest,
  fetchJamaah,
  fetchJamaahReviews,
  fetchMembers,
  Jamaah,
  JamaahImage,
  Member,
  Review,
} from '@/lib/api';
import { addFavourite, removeFavourite, fetchFavourites, Favourite, createReport } from '@/lib/api';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'Now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Now';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusColor(status: string, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'open':
      return theme.success;
    case 'full':
      return theme.warning;
    case 'closed':
      return theme.danger;
    default:
      return theme.textSecondary;
  }
}

export default function JamaahDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jamaahId = Number(id);
  const theme = useTheme();
  const { user } = useAuth();

  const [jamaah, setJamaah] = useState<Jamaah | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'ok' | 'err'>('ok');
  const [favourite, setFavourite] = useState<Favourite | null>(null);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [j, m, r] = await Promise.all([
        fetchJamaah(jamaahId),
        fetchMembers(jamaahId),
        fetchJamaahReviews(jamaahId),
      ]);
      setJamaah(j);
      setMembers(m);
      setReviews(r);

      try {
        const favs = await fetchFavourites();
        const match = favs.find((f) => f.jamaah.id === jamaahId);
        setFavourite(match || null);
      } catch {}

      // Check if user has a pending request
      try {
        const { data: requests } = await (await import('@/lib/api')).api.get(`/jamaah/requests/`, { params: { jamaah: jamaahId } });
        // If the endpoint returns user's own request status
      } catch {}
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not load this Jama\u2019ah');
    } finally {
      setLoading(false);
    }
  }, [jamaahId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  const onJoin = useCallback(async () => {
    setJoining(true);
    setNotice('');
    try {
      await createJoinRequest(jamaahId);
      setHasPendingRequest(true);
      setNotice('Request sent! The organizer will be notified.');
      setNoticeType('ok');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.response?.data?.jamaah ?? 'Could not send request';
      setNotice(Array.isArray(msg) ? msg[0] : msg);
      setNoticeType('err');
    } finally {
      setJoining(false);
    }
  }, [jamaahId]);

  const toggleFavourite = useCallback(async () => {
    try {
      if (favourite) {
        await removeFavourite(favourite.id);
        setFavourite(null);
      } else {
        const fav = await addFavourite(jamaahId);
        setFavourite(fav);
      }
    } catch (e: any) {
      setNotice(e?.response?.data?.detail ?? 'Could not update favourite');
      setNoticeType('err');
    }
  }, [jamaahId, favourite]);

  const reportJamaah = useCallback(() => {
    const reasons = ['unsafe', 'inaccurate', 'fake_listing', 'other'] as const;
    Alert.alert(
      'Report Listing',
      'Select a reason:',
      reasons.map((r) => ({
        text: r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' '),
        onPress: async () => {
          try {
            await createReport({ reported_jamaah: jamaahId, reason: r });
            Alert.alert('Reported', 'Thank you for your report. We will review it.');
          } catch {
            Alert.alert('Error', 'Could not submit report.');
          }
        },
      })),
      { cancelable: true },
    );
  }, [jamaahId]);

  const isOrganizer = jamaah && user && jamaah.organizer.id === user.id;
  const amMember = jamaah && members.some((m) => m.user.id === user?.id);

  let action: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean } | null =
    null;
  if (jamaah) {
    if (isOrganizer) {
      action = { title: 'You are the organizer', onPress: () => {}, disabled: true };
    } else if (amMember) {
      action = { title: 'You have joined', onPress: () => {}, disabled: true };
    } else if (hasPendingRequest) {
      action = { title: 'Request sent ✓', onPress: () => {}, disabled: true };
    } else if (jamaah.status === 'full') {
      action = { title: 'This Jama\u2019ah is full', onPress: () => {}, disabled: true };
    } else {
      action = { title: 'Request to join', onPress: onJoin, loading: joining };
    }
  }

  const images: JamaahImage[] = jamaah?.images ?? [];
  const organizer: any = jamaah?.organizer as any;

  const region = jamaah
    ? {
        latitude: jamaah.latitude,
        longitude: jamaah.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedView style={styles.container}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : error || !jamaah ? (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary">{error || 'Not found'}</ThemedText>
              <Pressable onPress={load}>
                <ThemedText type="link">Retry</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Back button */}
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <ThemedText style={{ color: theme.primary, fontSize: 16 }}>← Back</ThemedText>
              </Pressable>

              {/* Image Gallery */}
              {images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageGallery}
                  contentContainerStyle={styles.imageGalleryContent}>
                  {images.map((img) => (
                    <View key={img.id} style={[styles.imageCard, { borderColor: theme.border }]}>
                      {img.image_url ? (
                        <Image source={{ uri: img.image_url }} style={styles.imageThumb} />
                      ) : (
                        <View style={[styles.imageThumb, { backgroundColor: theme.inputBackground, alignItems: 'center', justifyContent: 'center' }]}>
                          <ThemedText type="small" themeColor="textSecondary">{img.caption || 'Image'}</ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Organizer Header */}
              <Pressable
                style={[styles.organizerHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => router.push(`/user/${organizer.id}`)}>
                {organizer.profile_picture_url ? (
                  <Image source={{ uri: organizer.profile_picture_url }} style={[styles.orgProfilePic, { borderColor: theme.primary }]} />
                ) : (
                  <View style={[styles.orgProfilePic, styles.orgProfilePicPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {organizer.name?.charAt(0)?.toUpperCase() || '?'}
                    </ThemedText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" themeColor="textSecondary">Organized by</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>{organizer.name}</ThemedText>
                </View>
              </Pressable>

              <View style={styles.heading}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemedText type="title">
                    {capitalize(jamaah.prayer)} Jama&apos;ah
                  </ThemedText>
                  {user && (
                    <Pressable onPress={toggleFavourite} style={styles.favButton}>
                      <ThemedText style={{ fontSize: 24 }}>
                        {favourite ? '❤️' : '🤍'}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: statusColor(jamaah.status, theme) + '1a' },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: statusColor(jamaah.status, theme), fontWeight: 700 }}>
                      {capitalize(jamaah.status)}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.accent + '1a' },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: theme.accent, fontWeight: 700 }}>
                      {capitalize(jamaah.location_type)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
                <Row label="Location" value={jamaah.address_label || jamaah.location_type || '—'} />
                <Row label="Time" value={formatDateTime(jamaah.scheduled_at)} />
                <Row
                  label="Participants"
                  value={`${jamaah.member_count}${jamaah.max_participants ? ` / ${jamaah.max_participants}` : ''} joined`}
                />
                <Row label="Created" value={formatDateTime(jamaah.created_at)} />
              </ThemedView>

              {/* Small Map */}
              {region && (
                <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                  <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    region={region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}>
                    <Marker
                      coordinate={{ latitude: jamaah.latitude, longitude: jamaah.longitude }}
                      title={jamaah.address_label || 'Jama\'ah'}
                      pinColor={theme.primary}
                    />
                    {userLoc && (
                      <Marker
                        coordinate={{ latitude: userLoc.lat, longitude: userLoc.lng }}
                        title="Your location"
                      >
                        <View style={[styles.userMarker, { backgroundColor: theme.primary }]}>
                          <View style={styles.userMarkerInner} />
                        </View>
                      </Marker>
                    )}
                  </MapView>
                </View>
              )}

              {/* Members Section with Dropdown */}
              <Pressable
                style={[styles.membersHeader, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two }]}
                onPress={() => setMembersExpanded(!membersExpanded)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <ThemedText type="subtitle">Members</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {members.length} joined
                  </ThemedText>
                </View>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 16 }}>
                  {membersExpanded ? '▲' : '▼'}
                </ThemedText>
              </Pressable>

              {membersExpanded && (
                <View style={styles.membersList}>
                  {members.length === 0 ? (
                    <ThemedText themeColor="textSecondary">No one has joined yet.</ThemedText>
                  ) : (
                    members.map((m) => (
                      <Pressable key={m.id} onPress={() => router.push(`/user/${m.user.id}`)}>
                        <ThemedView type="backgroundElement" style={styles.memberRow}>
                          {(m.user as any).profile_picture_url ? (
                            <Image source={{ uri: (m.user as any).profile_picture_url }} style={styles.memberAvatar} />
                          ) : (
                            <View style={[styles.avatar, { backgroundColor: theme.primary + '1a' }]}>
                              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                                {m.user.name.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                          )}
                          <View style={styles.memberInfo}>
                            <ThemedText type="default">{m.user.name}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              Joined {formatDateTime(m.joined_at)}
                            </ThemedText>
                          </View>
                        </ThemedView>
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              {/* Reviews Section */}
              <View style={styles.reviewsHeader}>
                <ThemedText type="subtitle">Reviews</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>

              {reviews.length === 0 ? (
                <View style={[styles.emptyReviews, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">No reviews yet.</ThemedText>
                </View>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderLeft}>
                        <Pressable onPress={() => router.push(`/user/${r.reviewer.id}`)}>
                          <ThemedText type="smallBold" style={{ color: theme.primary }}>
                            {r.reviewer.name}
                          </ThemedText>
                        </Pressable>
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <ThemedText key={i} style={{ fontSize: 14, color: i <= r.rating ? '#F59E0B' : '#D1D5DB' }}>★</ThemedText>
                          ))}
                        </View>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {new Date(r.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    {r.comment && (
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
                        {r.comment}
                      </ThemedText>
                    )}
                  </View>
                ))
              )}

              {notice ? (
                <ThemedText themeColor={noticeType === 'ok' ? 'success' : 'danger'}>
                  {notice}
                </ThemedText>
              ) : null}

              {action ? (
                <Button
                  title={action.title}
                  loading={action.loading}
                  disabled={action.disabled}
                  onPress={action.onPress}
                />
              ) : null}

              {user && !isOrganizer && (
                <Pressable onPress={reportJamaah} style={styles.reportBtn}>
                  <ThemedText type="small" style={{ color: theme.danger || '#DC2626' }}>
                    Report this listing
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  backBtn: { paddingVertical: Spacing.one },
  heading: { gap: Spacing.two },
  favButton: { padding: Spacing.one },
  reportBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  badges: { flexDirection: 'row', gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Spacing.three },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  rowValue: { fontWeight: 600, flexShrink: 1, textAlign: 'right' },
  mapContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 160,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  membersList: { gap: Spacing.two },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: { gap: 1 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'transparent' },
  imageGallery: {
    marginHorizontal: -Spacing.four,
  },
  imageGalleryContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  imageCard: {
    width: 200,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageThumb: { width: '100%', height: '100%' },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  orgProfilePic: { width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  orgProfilePicPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  emptyReviews: { borderRadius: 16, borderWidth: 1, padding: Spacing.four, alignItems: 'center' },
  reviewCard: { borderRadius: 16, borderWidth: 1, padding: Spacing.three },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewHeaderLeft: { gap: 4 },
});
