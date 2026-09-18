import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { AnimatedCard } from '@/components/AnimatedCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchJamaahs, Jamaah } from '@/lib/api';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', "Jumu'ah"];
const SORT_OPTIONS = ['Nearest', 'Popular', 'Newest'] as const;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(iso: string | null) {
  if (!iso) return 'Now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Now';
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff <= 0) return 'Started';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `in ${hours}h ${rem}m` : `in ${hours}h`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function statusColor(status: string, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'open': return theme.success;
    case 'full': return theme.warning;
    case 'closed': return theme.danger;
    default: return theme.textSecondary;
  }
}

function CapacityBar({ filled, theme }: { filled: number; theme: ReturnType<typeof useTheme> }) {
  const percentage = Math.min(Math.max(filled, 0), 1);
  let fillColor = '#059669';
  if (percentage >= 1) fillColor = '#DC2626';
  else if (percentage >= 0.8) fillColor = '#D97706';

  return (
    <View style={styles.capacityContainer}>
      <View style={[styles.capacityTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.capacityFill,
            {
              backgroundColor: fillColor,
              width: `${Math.round(percentage * 100)}%`,
            },
          ]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.capacityLabel}>
        {Math.round(percentage * 100)}% full
      </ThemedText>
    </View>
  );
}

function JamaahCard({ j, distance }: { j: Jamaah; distance: string }) {
  const theme = useTheme();
  const status = j.status || 'open';
  const org: any = j.organizer as any;
  const fillPercent = j.max_participants
    ? j.member_count / j.max_participants
    : 0;

  return (
    <AnimatedCard
      onPress={() => router.push(`/jamaah/${j.id}`)}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Pressable
            style={styles.organizerInfo}
            onPress={() => router.push(`/user/${org.id}`)}>
            {org.profile_picture_url ? (
              <Image source={{ uri: org.profile_picture_url }} style={[styles.profilePic, { borderColor: theme.primary }]} />
            ) : (
              <View style={[styles.profilePic, styles.profilePicPlaceholder, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {org.name?.charAt(0)?.toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
            <View style={styles.cardTitleBlock}>
              <ThemedText type="default" style={[styles.cardTitle, { color: theme.text }]}>
                {capitalize(j.prayer)} Jama&apos;ah
              </ThemedText>
              <View style={styles.organizerRow}>
                <Pressable onPress={() => router.push(`/user/${org.id}`)}>
                  <ThemedText type="small" themeColor="primary">
                    {org.name}
                  </ThemedText>
                </Pressable>
                {org.is_verified && (
                  <ThemedText style={{ fontSize: 12, color: '#F59E0B' }}>★</ThemedText>
                )}
              </View>
            </View>
          </Pressable>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: statusColor(status, theme) + '15' }]}>
              <ThemedText type="small" style={{ color: statusColor(status, theme), fontWeight: 700, fontSize: 11 }}>
                {capitalize(status)}
              </ThemedText>
            </View>
            {j.schedule_type === 'recurring' && (
              <View style={[styles.badge, { backgroundColor: theme.accent + '18' }]}>
                <ThemedText type="small" style={{ color: theme.accent, fontWeight: 700, fontSize: 11 }}>
                  Recurring
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <ThemedText style={styles.detailIcon}>📍</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.detailText} numberOfLines={1}>
              {j.address_label || j.location_type || 'Current location'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailIcon}>👥</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.detailText}>
                {j.member_count} joined{j.max_participants ? ` / ${j.max_participants}` : ''}
              </ThemedText>
            </View>
            {distance !== '' && (
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailIcon}>📏</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.detailText}>
                  {distance}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={styles.detailIcon}>🕐</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.detailText}>
              {formatTime(j.scheduled_at)}
            </ThemedText>
          </View>
        </View>

        {j.max_participants ? (
          <CapacityBar filled={fillPercent} theme={theme} />
        ) : null}

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: 600 }}>
            View &amp; join →
          </ThemedText>
        </View>
      </View>
    </AnimatedCard>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [selectedPrayers, setSelectedPrayers] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<typeof SORT_OPTIONS[number]>('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [rangeKm, setRangeKm] = useState('');

  const togglePrayer = (p: string) => {
    setSelectedPrayers((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let loc = userLoc;
      if (!loc) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
        }
      }
      const params: any = {};
      if (loc) { params.lat = loc.lat; params.lng = loc.lng; params.radius = 50; }
      setJamaahs(await fetchJamaahs(params));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not load Jama\u2019ahs');
    } finally {
      setLoading(false);
    }
  }, [userLoc]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    let list = jamaahs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((j) =>
        j.address_label?.toLowerCase().includes(q) ||
        j.prayer.toLowerCase().includes(q) ||
        j.location_type?.toLowerCase().includes(q)
      );
    }
    if (selectedPrayers.size > 0) {
      list = list.filter((j) => selectedPrayers.has(capitalize(j.prayer === 'jumuah' ? "Jumu'ah" : j.prayer)));
    }
    if (userLoc) {
      list = list.map((j) => ({
        ...j,
        _dist: haversine(userLoc.lat, userLoc.lng, j.latitude, j.longitude),
      })) as any;
    }
    const range = parseFloat(rangeKm);
    if (!isNaN(range) && range > 0 && userLoc) {
      list = list.filter((j: any) => j._dist != null && j._dist <= range);
    }
    if (sortOption === 'Nearest' && userLoc) {
      list = [...list].sort((a: any, b: any) => (a._dist ?? 999) - (b._dist ?? 999));
    } else if (sortOption === 'Popular') {
      list = [...list].sort((a, b) => b.member_count - a.member_count);
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [jamaahs, selectedPrayers, sortOption, userLoc, searchQuery, rangeKm]);

  const getDistance = (j: Jamaah): string => {
    if (!userLoc) return '';
    const d = haversine(userLoc.lat, userLoc.lng, j.latitude, j.longitude);
    if (d < 1) return `${Math.round(d * 5280)} ft`;
    return `${d.toFixed(1)} mi`;
  };

  return (
    <View style={styles.outer}>
      <View style={styles.bgContainer}>
        <View style={[styles.bgTop, { backgroundColor: theme.bgTop }]} />
        <View style={[styles.bgBottom, { backgroundColor: theme.bgBottom }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Assalamu Alaikum</ThemedText>
              <ThemedText type="title" style={{ color: '#FFFFFF', fontSize: 26, fontWeight: 800 }}>
                Find Jama&apos;ahs
              </ThemedText>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBar, {
            backgroundColor: theme.card,
            borderColor: searchFocused ? theme.primary : theme.border,
            shadowColor: theme.text,
            shadowOpacity: searchFocused ? 0.08 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: searchFocused ? 3 : 0,
          }]}>
            <ThemedText style={{ fontSize: 16, color: theme.textSecondary }}>🔍</ThemedText>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by location, prayer..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>✕</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Prayer Filter */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={[styles.sectionLabel, { color: '#FFFFFF' }]}>Prayer</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prayerScroll}>
              {PRAYERS.map((p) => {
                const active = selectedPrayers.has(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => togglePrayer(p)}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                        borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? theme.primary : '#FFFFFF', fontWeight: active ? 700 : 500 }}>
                      {p}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Range + Sort Row */}
          <View style={styles.filterRow}>
            <View style={[styles.rangeInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>📏</ThemedText>
              <TextInput
                style={[styles.rangeInput, { color: theme.text }]}
                placeholder="km"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={rangeKm}
                onChangeText={setRangeKm}
              />
              {rangeKm.length > 0 && (
                <Pressable onPress={() => setRangeKm('')}>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>✕</ThemedText>
                </Pressable>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContainer}>
              {SORT_OPTIONS.map((s) => {
                const active = sortOption === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSortOption(s)}
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                        borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? theme.primary : '#FFFFFF', fontWeight: active ? 700 : 500 }}>
                      {s}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {selectedPrayers.size > 0 && (
            <Pressable onPress={() => setSelectedPrayers(new Set())} style={styles.clearFilters}>
              <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.8)' }}>Clear filters ✕</ThemedText>
            </Pressable>
          )}

          {/* Results */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Finding nearby Jama&apos;ahs...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <ThemedText style={{ color: 'rgba(255,255,255,0.8)' }}>{error}</ThemedText>
              <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <ThemedText style={{ fontSize: 32 }}>🕌</ThemedText>
              <ThemedText style={{ color: 'rgba(255,255,255,0.8)' }}>
                {jamaahs.length === 0 ? 'No Jama\u2019ahs nearby yet.' : 'No matches for selected filters.'}
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {filtered.length} Jama'ah{filtered.length !== 1 ? 's' : ''} found
                </ThemedText>
              </View>
              {filtered.map((j) => (
                <JamaahCard key={j.id} j={j} distance={getDistance(j)} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  bgContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  bgBottom: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    padding: Spacing.four,
    gap: Spacing.three,
    position: 'relative',
  },
  header: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  section: { gap: Spacing.two },
  sectionLabel: { marginBottom: 0 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  prayerScroll: {
    gap: Spacing.two,
  },
  prayerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rangeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  rangeInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    minWidth: 40,
  },
  sortContainer: {
    gap: Spacing.two,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearFilters: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  retryBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  resultsHeader: {
    paddingBottom: Spacing.one,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    gap: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  profilePic: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
  },
  profilePicPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: { flex: 1, gap: 2 },
  cardTitle: { fontWeight: 700, fontSize: 16 },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
  },
  detailsGrid: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 13,
  },
  detailText: {
    flex: 1,
  },
  capacityContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: 4,
  },
  capacityTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 2,
  },
  capacityLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.one,
  },
});
