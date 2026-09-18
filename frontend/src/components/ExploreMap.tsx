import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { router } from 'expo-router';
import { forwardRef, useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Jamaah } from '@/lib/api';

const PADDING = 0.02;

const PRAYER_COLORS: Record<string, string> = {
  fajr: '#7C3AED',
  dhuhr: '#0891B2',
  asr: '#D97706',
  maghrib: '#DC2626',
  isha: '#4F46E5',
  jumuah: '#059669',
};

function openInMaps(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  if (Platform.OS === 'ios') {
    Linking.openURL(`https://maps.apple.com/?ll=${lat},${lng}&q=${encodedLabel}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}&q=${encodedLabel}`);
  }
}

/** Compute a region that fits all Jama'ahs (plus a little padding). */
export function computeRegion(
  jamaahs: Jamaah[],
  latitude: number,
  longitude: number,
): Region {
  if (jamaahs.length === 0) {
    return { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }
  const lats = jamaahs.map((j) => j.latitude).concat(latitude);
  const lngs = jamaahs.map((j) => j.longitude).concat(longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.01) + PADDING * 2,
    longitudeDelta: Math.max(maxLng - minLng, 0.01) + PADDING * 2,
  };
}

interface ExploreMapProps {
  jamaahs: Jamaah[];
  latitude: number;
  longitude: number;
}

export const ExploreMap = forwardRef<MapView, ExploreMapProps>(function ExploreMap(
  { jamaahs, latitude, longitude },
  ref,
) {
  const theme = useTheme();
  const region = useMemo(
    () => computeRegion(jamaahs, latitude, longitude),
    [jamaahs, latitude, longitude],
  );

  return (
    <MapView
      ref={ref}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      onMapReady={() => console.log('[explore] map ready, region=', region)}>
      <Marker coordinate={{ latitude, longitude }} title="You are here" pinColor={theme.primary} />
      {jamaahs.map((j) => (
        <Marker
          key={j.id}
          coordinate={{ latitude: j.latitude, longitude: j.longitude }}
          pinColor={PRAYER_COLORS[j.prayer] ?? theme.accent}>
          <Callout tooltip>
            <View style={[styles.callout, { backgroundColor: theme.card }]}>
              <Pressable onPress={() => router.push(`/jamaah/${j.id}`)}>
                <ThemedText type="smallBold">
                  {j.prayer.charAt(0).toUpperCase() + j.prayer.slice(1)} Jama'ah
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  by {j.organizer.name} • {j.member_count} joined
                </ThemedText>
                <ThemedText type="link">View & Join</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.mapsButton, { borderColor: theme.border }]}
                onPress={() => openInMaps(j.latitude, j.longitude, j.address_label || `${j.prayer} Jama'ah`)}>
                <ThemedText type="small" themeColor="primary">
                  Open in Maps
                </ThemedText>
              </Pressable>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  callout: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.two,
    minWidth: 200,
  },
  mapsButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
});
