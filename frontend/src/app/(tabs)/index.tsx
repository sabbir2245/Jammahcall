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

function CapacityTube({ filled, theme }: { filled: number; theme: ReturnType<typeof useTheme> }) {
  const percentage = Math.min(Math.max(filled, 0), 1);
  let fillColor = '#059669'; // green
  if (percentage >= 1) fillColor = '#DC2626'; // red at full
  else if (percentage >= 0.8) fillColor = '#D97706'; // amber near full

  return (
    <View style={styles.tubeContainer}>
      <View style={[styles.tubeOuter, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.tubeFill,
            {
              backgroundColor: fillColor,
              height: `${Math.round(percentage * 100)}%`,
            },
          ]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.tubeLabel}>
        {Math.round(percentage * 100)}%
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
      <View style={styles.cardBody}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Pressable onPress={() => router.push(`/user/${org.id}`)}>
              {org.profile_picture_url ? (
                <Image source={{ uri: org.profile_picture_url }} style={[styles.profilePic, { borderColor: theme.primary }]} />
              ) : (
                <View style={[styles.profilePic, styles.profilePicPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {org.name?.charAt(0)?.toUpperCase() || '?'}
                  </ThemedText>
                </View>
              )}
            </Pressable>
            <View style={styles.cardTitleBlock}>
              <ThemedText type="default" style={[styles.cardTitle, { color: theme.text }]}>
                {capitalize(j.prayer)} Jama&apos;ah
              </ThemedText>
              <View style={styles.organizerRow}>
                <Pressable onPress={() => router.push(`/user/${org.id}`)}>
                  <ThemedText type="small" themeColor="primary">
                    by {org.name}
                  </ThemedText>
                </Pressable>
                {org.is_verified && (
                  <ThemedText style={{ fontSize: 12, color: '#F59E0B' }}>★</ThemedText>
                )}
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(status, theme) + '15' }]}>
              <ThemedText type="small" style={{ color: statusColor(status, theme), fontWeight: 700 }}>
                {capitalize(status)}
              </ThemedText>
            </View>
            {j.schedule_type === 'recurring' && (
              <View style={[styles.badge, { backgroundColor: theme.accent + '20' }]}>
                <ThemedText type="small" style={{ color: theme.accent, fontWeight: 700 }}>
                  Recurring
                </ThemedText>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ThemedText type="small" themeColor="textSecondary">
                📍 {j.address_label || j.location_type || 'Current location'}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {j.member_count} joined{j.max_participants ? ` / ${j.max_participants}` : ''}
              </ThemedText>
              {distance !== '' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {' '}&middot;{' '}{distance}
                </ThemedText>
              )}
            </View>
            <View style={styles.metaItem}>
              <ThemedText type="small" themeColor="textSecondary">
                {formatTime(j.scheduled_at)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText type="linkPrimary">View &amp; join</ThemedText>
          </View>
        </View>

        {j.max_participants && (
          <CapacityTube filled={fillPercent} theme={theme} />
        )}
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
      {/* Background - fixed, covers full screen */}
      <View style={styles.bgContainer}>
        <View style={[styles.bgTop, { backgroundColor: theme.bgTop }]} />
        <View style={[styles.bgBottom, { backgroundColor: theme.bgBottom }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.container}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: searchFocused ? theme.primary : theme.border }]}>
          <ThemedText style={{ fontSize: 16, color: theme.textSecondary }}>🔍</ThemedText>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search Jama'ahs..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Prayer Filter Checkboxes */}
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: '#FFFFFF' }]}>Filter by Prayer</ThemedText>
        <View style={styles.filterGrid}>
          {PRAYERS.map((p) => {
            const active = selectedPrayers.has(p);
            return (
              <Pressable
                key={p}
                onPress={() => togglePrayer(p)}
                style={[
                  styles.checkChip,
                  {
                    backgroundColor: active ? theme.primary : theme.inputBackground,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <View style={[
                  styles.checkbox,
                  { borderColor: active ? theme.primaryContrast : theme.textSecondary },
                  active && { backgroundColor: theme.primaryContrast },
                ]}>
                  {active && <ThemedText style={{ color: theme.primary, fontSize: 11, fontWeight: 700 }}>✓</ThemedText>}
                </View>
                <ThemedText
                  type="small"
                  style={{ color: active ? theme.primaryContrast : theme.text }}>
                  {p}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Range Filter */}
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: '#FFFFFF' }]}>Max Distance (km)</ThemedText>
        <View style={[styles.rangeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.rangeInput, { color: theme.text }]}
            placeholder="e.g. 2.7"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={rangeKm}
            onChangeText={setRangeKm}
          />
          {rangeKm.length > 0 && (
            <Pressable onPress={() => setRangeKm('')}>
              <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Sort Options */}
        <ThemedText type="smallBold" style={[styles.sectionLabel, { color: '#FFFFFF' }]}>Sort by</ThemedText>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((s) => {
            const active = sortOption === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSortOption(s)}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: active ? theme.accent + '20' : 'transparent',
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: active ? theme.accent : theme.textSecondary, fontWeight: active ? 700 : 500 }}>
                  {s}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {selectedPrayers.size > 0 && (
          <Pressable onPress={() => setSelectedPrayers(new Set())}>
            <ThemedText type="small" themeColor="primary">Clear filters</ThemedText>
          </Pressable>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
            <Pressable onPress={load}>
              <ThemedText type="link">Retry</ThemedText>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <ThemedText themeColor="textSecondary">
              {jamaahs.length === 0 ? 'No Jama\u2019ahs nearby yet.' : 'No matches for selected filters.'}
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              {filtered.length} Jama'ah{filtered.length !== 1 ? 's' : ''} found
            </ThemedText>
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
    height: '50%',
  },
  bgBottom: {
    position: 'absolute',
    top: '50%',
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
  sectionLabel: { marginBottom: Spacing.one, marginTop: Spacing.one },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
  },
  rangeInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: { flexDirection: 'row', gap: Spacing.two },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardBody: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cardContent: { flex: 1, gap: Spacing.two },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  profilePicPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: { flex: 1, gap: 1 },
  cardTitle: { fontWeight: 700 },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
  },
  divider: { height: StyleSheet.hairlineWidth },
  metaRow: { gap: Spacing.one },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  tubeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tubeOuter: {
    width: 14,
    height: 80,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tubeFill: {
    width: '100%',
    borderRadius: 7,
  },
  tubeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
