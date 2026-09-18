import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchPrayerTimes,
  getPrayersWithRanges,
  getCurrentPrayer,
  getNextPrayer,
  formatTime,
  parseTimeToDate,
  PrayerTimings,
  PrayerWithRange,
} from '@/lib/prayer-times';

const PRAYER_DISPLAY = [
  { key: 'Fajr' as const, icon: '🌙' },
  { key: 'Dhuhr' as const, icon: '☀️' },
  { key: 'Asr' as const, icon: '🌤' },
  { key: 'Maghrib' as const, icon: '🌅' },
  { key: 'Isha' as const, icon: '🌙' },
];

function SemiCircleProgress({ progress, colors, size = 180 }: { progress: number; colors: ReturnType<typeof useTheme>; size?: number }) {
  const strokeWidth = 12;
  const halfSize = size / 2;
  const radius = halfSize - strokeWidth;

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const totalArc = Math.PI;

  return (
    <View style={{ width: size, height: halfSize + strokeWidth, overflow: 'hidden' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.border,
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.primary,
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          opacity: clampedProgress > 0 ? 1 : 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: halfSize - 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accent,
          opacity: 0.25,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 6,
          left: halfSize - 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.accent,
          opacity: 0.6,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 10,
          left: halfSize - 6,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.primaryContrast,
          opacity: 0.9,
        }}
      />
    </View>
  );
}

function CountdownText({ target, color }: { target: Date; color: string }) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (diff <= 0) return null;

  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <ThemedText style={[styles.countdown, { color }]}>{formatted}</ThemedText>
  );
}

export default function PrayerTimesScreen() {
  const theme = useTheme();
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijriDate, setHijriDate] = useState('');
  const [gregorianDate, setGregorianDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setError('');
    try {
      let loc = userLoc;
      if (!loc) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
        } else {
          setError('Location permission needed for prayer times.');
          setLoading(false);
          return;
        }
      }

      const data = await fetchPrayerTimes(loc.lat, loc.lng);
      if (data) {
        setTimings(data.data.timings);
        setHijriDate(
          `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year}`
        );
        setGregorianDate(data.data.date.readable);
      } else {
        setError('Could not load prayer times.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userLoc]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const currentPrayer = timings ? getCurrentPrayer(timings) : null;
  const nextPrayer = timings ? getNextPrayer(timings) : null;
  const prayers = timings ? getPrayersWithRanges(timings) : [];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bgBottom }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }>
      {/* Gradient Background */}
      <View style={styles.bgContainer}>
        <View style={[styles.bgTop, { backgroundColor: theme.bgTop }]} />
        <View style={[styles.bgBottom, { backgroundColor: theme.bgBottom }]} />
      </View>

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.calendarIcon}>📅</ThemedText>
            <View>
              <ThemedText style={[styles.headerDate, { color: theme.text }]}>
                {hijriDate || 'Loading...'}
              </ThemedText>
              <ThemedText style={[styles.headerDateSub, { color: theme.textSecondary }]}>
                {gregorianDate || ''}
              </ThemedText>
            </View>
          </View>
          <Pressable style={styles.bellContainer}>
            <ThemedText style={styles.bellIcon}>🔔</ThemedText>
            <View style={styles.bellBadge}>
              <ThemedText style={styles.bellBadgeText}>3</ThemedText>
            </View>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} size="large" />
            <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>Loading prayer times...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
            <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: theme.card }]}>
              <ThemedText style={[styles.retryText, { color: theme.accent }]}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Active Prayer Hero Widget */}
            <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
              <SemiCircleProgress
                progress={currentPrayer?.progress ?? 0}
                colors={theme}
                size={180}
              />

              <ThemedText style={[styles.heroPrayerName, { color: theme.text }]}>
                {currentPrayer ? currentPrayer.name : nextPrayer?.name || '—'}
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                {currentPrayer ? 'Waqt ends in' : nextPrayer ? 'Next prayer in' : '—'}
              </ThemedText>
              <CountdownText
                key={currentPrayer?.name || nextPrayer?.name || 'none'}
                target={
                  currentPrayer
                    ? parseTimeToDate(currentPrayer.endTime)
                    : nextPrayer?.date || new Date()
                }
                color={theme.text}
              />

              {/* Info Pills */}
              <View style={styles.infoPillsRow}>
                <View style={[styles.infoPill, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.pillIcon}>📍</ThemedText>
                  <ThemedText style={[styles.pillText, { color: theme.textSecondary }]}>
                    {userLoc ? `${userLoc.lat.toFixed(2)}, ${userLoc.lng.toFixed(2)}` : 'Location'}
                  </ThemedText>
                </View>
                {timings?.Sunrise && (
                  <View style={[styles.infoPill, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.pillIcon}>🌅</ThemedText>
                    <ThemedText style={[styles.pillText, { color: theme.textSecondary }]}>
                      Rise: {formatTime(timings.Sunrise)}
                    </ThemedText>
                  </View>
                )}
                {timings?.Sunset && (
                  <View style={[styles.infoPill, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.pillIcon}>🌇</ThemedText>
                    <ThemedText style={[styles.pillText, { color: theme.textSecondary }]}>
                      Set: {formatTime(timings.Sunset)}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* Daily Prayer Timings List */}
            <View style={[styles.prayerCard, { backgroundColor: theme.card }]}>
              <ThemedText style={[styles.prayerCardTitle, { color: theme.text }]}>Prayer Times</ThemedText>

              {prayers.map((p, i) => (
                <View key={p.name}>
                  <View style={styles.prayerRow}>
                    <ThemedText style={styles.prayerIcon}>
                      {PRAYER_DISPLAY.find((d) => d.key === p.name)?.icon || '🕌'}
                    </ThemedText>

                    <ThemedText
                      style={[
                        styles.prayerName,
                        { color: p.isCurrent ? theme.text : theme.textSecondary },
                        p.isCurrent && { fontWeight: '700' },
                        p.isPast && { opacity: 0.5 },
                      ]}>
                      {p.name}
                    </ThemedText>

                    {p.isCurrent && <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />}

                    <ThemedText
                      style={[
                        styles.prayerRange,
                        { color: theme.textSecondary },
                        p.isPast && { opacity: 0.5 },
                      ]}>
                      {formatTime(p.startTime)} - {formatTime(p.endTime)}
                    </ThemedText>

                    <View
                      style={[
                        styles.statusCircle,
                        { borderColor: theme.border },
                        p.isCurrent && { borderColor: theme.accent, backgroundColor: theme.accent + '20' },
                        p.isPast && { borderColor: theme.primary, backgroundColor: theme.primary },
                      ]}>
                      {p.isPast && <ThemedText style={[styles.checkMark, { color: theme.primaryContrast }]}>✓</ThemedText>}
                      {p.isCurrent && <View style={[styles.statusDotInner, { backgroundColor: theme.accent }]} />}
                    </View>
                  </View>

                  {i < prayers.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    padding: Spacing.three,
    gap: Spacing.three,
    position: 'relative',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  calendarIcon: { fontSize: 20 },
  headerDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerDateSub: {
    fontSize: 11,
    marginTop: 1,
  },
  bellContainer: { position: 'relative', padding: Spacing.one },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Center states
  center: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  loadingText: { fontSize: 14 },
  retryBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  retryText: { fontWeight: '600' },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  heroPrayerName: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  countdown: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginTop: Spacing.one,
  },

  // Info Pills
  infoPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pillIcon: { fontSize: 12 },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Prayer Card
  prayerCard: {
    borderRadius: 24,
    padding: Spacing.three,
  },
  prayerCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  prayerIcon: { fontSize: 20, width: 28 },
  prayerName: {
    fontSize: 16,
    fontWeight: '500',
    width: 70,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prayerRange: {
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  statusCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
});
