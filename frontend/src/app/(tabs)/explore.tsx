import * as Location from 'expo-location';
import MapView, { Region } from 'react-native-maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { computeRegion, ExploreMap } from '@/components/ExploreMap';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { fetchJamaahs, Jamaah } from '@/lib/api';

const DEFAULT_CENTER = { latitude: 23.723152, longitude: 90.39323 };
const ZOOM_IN: Pick<Region, 'latitudeDelta' | 'longitudeDelta'> = {
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const PRAYERS = ['All', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', "Jumu'ah"];
const SORT_OPTIONS = ['Newest', 'Oldest', 'Popular'];

export default function ExploreScreen() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const [jamaahs, setJamaahs] = useState<Jamaah[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState('');
  const [locating, setLocating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Newest');
  const [filtersVisible, setFiltersVisible] = useState(true);

  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const load = useCallback(
    async (lat: number, lng: number) => {
      try {
        log(`fetch jamaahs near (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        const params: any = { lat, lng, radius: 5 };
        if (selectedPrayer !== 'All') {
          params.prayer = selectedPrayer.toLowerCase().replace("'", "");
        }
        if (search.trim()) {
          params.search = search.trim();
        }
        if (selectedSort === 'Newest') params.sort = 'newest';
        else if (selectedSort === 'Oldest') params.sort = 'oldest';
        else if (selectedSort === 'Popular') params.sort = 'popular';

        const data = await fetchJamaahs(params);
        setJamaahs(data);
        setError('');
        log(`loaded ${data.length} jamaah(s)`);
      } catch (e: any) {
        const msg = e?.response?.data?.detail ?? e?.message ?? 'Could not load nearby Jama\u2019ahs';
        setError(msg);
        log(`ERROR: ${msg}`);
      }
    },
    [log, selectedPrayer, search, selectedSort],
  );

  const getPosition = useCallback(
    async (requestPermission: boolean) => {
      setLocating(true);
      try {
        if (requestPermission || permission !== 'granted') {
          log('requesting foreground location permission');
          const { status } = await Location.requestForegroundPermissionsAsync();
          setPermission(status);
          log(`permission status: ${status}`);
          if (status !== 'granted') {
            log('permission denied -> loading default center');
            await load(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude);
            return;
          }
        }
        log('getting current position...');
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCenter(coords);
        log(`position: (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`);
        await load(coords.latitude, coords.longitude);
      } catch (e: any) {
        const msg = e?.message ?? 'Location error';
        setError(msg);
        log(`LOCATE ERROR: ${msg}`);
      } finally {
        setLocating(false);
        setLoading(false);
      }
    },
    [load, log, permission],
  );

  useEffect(() => {
    getPosition(false);
  }, [getPosition]);

  const reload = useCallback(() => {
    log('reload map');
    load(center.latitude, center.longitude);
    const region = computeRegion(jamaahs, center.latitude, center.longitude);
    mapRef.current?.animateToRegion(region, 500);
  }, [load, center, jamaahs, log]);

  const locate = useCallback(() => {
    log('locate button pressed');
    getPosition(true).then(() => {
      mapRef.current?.animateToRegion(
        { ...center, ...ZOOM_IN },
        800,
      );
    });
  }, [getPosition, center, log]);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          {error ? (
            <Pressable onPress={reload}>
              <ThemedText type="small" themeColor="danger">
                {error} (tap to retry)
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            placeholder="Search Jama'ahs..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={reload}
            returnKeyType="search"
          />
          <Pressable style={[styles.searchBtn, { backgroundColor: theme.primary }]} onPress={reload}>
            <ThemedText type="smallBold" style={{ color: theme.primaryContrast }}>Go</ThemedText>
          </Pressable>
        </View>

        {/* Filter Toggle */}
        <Pressable
          style={styles.filterToggle}
          onPress={() => setFiltersVisible(!filtersVisible)}>
          <ThemedText type="small" themeColor="textSecondary">
            {filtersVisible ? 'Hide filters ▲' : 'Show filters ▼'}
          </ThemedText>
        </Pressable>

        {filtersVisible && (
          <>
            {/* Prayer Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipContainer}>
              {PRAYERS.map((p) => {
                const selected = selectedPrayer === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => { setSelectedPrayer(p); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : theme.inputBackground,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.primaryContrast : theme.text, fontWeight: selected ? 700 : 500 }}>
                      {p}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Sort Options */}
            <View style={styles.sortRow}>
              <ThemedText type="small" themeColor="textSecondary">Sort:</ThemedText>
              {SORT_OPTIONS.map((s) => {
                const selected = selectedSort === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSelectedSort(s)}
                    style={[
                      styles.sortChip,
                      {
                        backgroundColor: selected ? theme.accent + '20' : 'transparent',
                        borderColor: selected ? theme.accent : 'transparent',
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.accent : theme.textSecondary, fontWeight: selected ? 700 : 500 }}>
                      {s}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Give location"
            variant="secondary"
            loading={locating}
            style={styles.flexBtn}
            onPress={() => getPosition(true)}
          />
          <Button title="Reload" variant="secondary" style={styles.flexBtn} onPress={reload} />
          <Button title="Locate" variant="primary" style={styles.flexBtn} onPress={locate} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <ExploreMap
            ref={mapRef}
            jamaahs={jamaahs}
            latitude={center.latitude}
            longitude={center.longitude}
          />
        )}

        {jamaahs.length > 0 && (
          <View style={[styles.countBar, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {jamaahs.length} Jama'ah{jamaahs.length !== 1 ? 's' : ''} found
            </ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  searchBtn: {
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterToggle: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  flexBtn: { flex: 1 },
  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
});
