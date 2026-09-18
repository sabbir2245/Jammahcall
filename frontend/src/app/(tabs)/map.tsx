import * as Location from 'expo-location';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const DEFAULT = { latitude: 23.723152, longitude: 90.39323 };

export default function MapScreen() {
  const theme = useTheme();
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setStatus(status);
        if (status === 'granted') {
          const p = await Location.getCurrentPositionAsync({});
          setLoc({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        } else {
          setLoc(DEFAULT);
        }
      } catch {
        setLoc(DEFAULT);
        setStatus('error');
      }
    })();
  }, []);

  const region = loc
    ? { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { ...DEFAULT, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Map</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            permission: {status || 'requesting...'}
            {loc ? ` • (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})` : ''}
          </ThemedText>
        </View>
        {!loc ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region} onMapReady={() => console.log('[map] ready')}>
            <Circle
              center={loc}
              radius={400}
              fillColor={theme.primary + '33'}
              strokeColor={theme.primary}
              strokeWidth={2}
            />
            <Marker coordinate={loc} pinColor={theme.primary} title="You" />
          </MapView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 4 },
  map: { flex: 1 },
});