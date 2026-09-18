import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Jamaah } from '@/lib/api';

interface ExploreMapProps {
  jamaahs: Jamaah[];
  latitude: number;
  longitude: number;
}

export function ExploreMap({ jamaahs }: ExploreMapProps) {
  if (jamaahs.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText themeColor="textSecondary">No nearby Jama'ahs.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.list}>
      {jamaahs.map((j) => (
        <ThemedView key={j.id} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">
            {j.prayer.charAt(0).toUpperCase() + j.prayer.slice(1)} Jama'ah
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            by {j.organizer.name} • {j.member_count} joined • {j.status}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});