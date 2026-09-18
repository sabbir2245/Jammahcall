import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View, Image } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { createJamaah, uploadJamaahImage } from '@/lib/api';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jumuah'];
const LOCATION_TYPES = [
  { value: 'public', label: 'Public Place' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'university', label: 'University' },
  { value: 'park', label: 'Park' },
  { value: 'other', label: 'Other' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCHEDULE_TYPES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
];

export default function CreateScreen() {
  const theme = useTheme();
  const [prayer, setPrayer] = useState<string>('Asr');
  const [locationType, setLocationType] = useState('public');
  const [addressLabel, setAddressLabel] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState('one_time');
  const [recurringDays, setRecurringDays] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Limit reached', 'You can add at most 3 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 3) {
      Alert.alert('Limit reached', 'You can add at most 3 images.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (dayIndex: number) => {
    setRecurringDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  };

  const onSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const created = await createJamaah({
        prayer: prayer.toLowerCase().replace("'", ""),
        location_type: locationType,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        address_label: addressLabel.trim() || undefined,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
        schedule_type: scheduleType,
        recurring_days: scheduleType === 'recurring' ? Array.from(recurringDays).sort() : null,
      });

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const formData = new FormData();
        formData.append('image', {
          uri: images[i],
          type: 'image/jpeg',
          name: `photo_${i}.jpg`,
        } as any);
        formData.append('order', String(i));
        formData.append('caption', '');
        await uploadJamaahImage(created.id, formData);
      }

      setCreatedId(created.id);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not create Jama\u2019ah');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Background */}
      <View style={styles.bgContainer}>
        <View style={[styles.bgTop, { backgroundColor: theme.bgTop }]} />
        <View style={[styles.bgBottom, { backgroundColor: theme.bgBottom }]} />
      </View>

      <View style={styles.container}>
        {createdId ? (
          <>
            <ThemedText type="title" style={{ color: theme.text, textAlign: 'center' }}>
              Jama&apos;ah Created! 🎉
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Your Jama&apos;ah has been created successfully.
            </ThemedText>
            <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
              <Button
                title="View Jama'ah"
                onPress={() => router.push(`/jamaah/${createdId}`)}
                style={[styles.button, { backgroundColor: theme.primary }]}
                textStyle={{ color: '#FFFFFF', fontWeight: '600' }}
              />
              <Button
                title="Create Another"
                variant="secondary"
                onPress={() => {
                  setCreatedId(null);
                  setPrayer('Asr');
                  setLocationType('public');
                  setAddressLabel('');
                  setMaxParticipants('');
                  setImages([]);
                  setScheduleType('one_time');
                  setRecurringDays(new Set());
                }}
                style={styles.button}
              />
              <Button
                title="Back to Home"
                variant="secondary"
                onPress={() => router.replace('/')}
                style={styles.button}
              />
            </View>
          </>
        ) : (
          <>

        {/* Prayer Selection */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Select Prayer
        </ThemedText>
        <View style={styles.grid}>
          {PRAYERS.map((p) => {
            const selected = prayer === p;
            const isJumuah = p === 'Jumuah';
            return (
              <Pressable
                key={p}
                onPress={() => setPrayer(p)}
                style={styles.tilePressable}
              >
                <ThemedView
                  style={[
                    styles.tile,
                    selected
                      ? { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 2 }
                      : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
                  ]}>
                  <ThemedText
                    type="title"
                    style={{
                      color: selected ? '#FFFFFF' : theme.text,
                      fontSize: 17,
                      fontWeight: '600',
                    }}
                  >
                    {p}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </View>

        {/* Location Type */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Location Type
        </ThemedText>
        <View style={styles.locationRow}>
          {LOCATION_TYPES.map((lt) => {
            const selected = locationType === lt.value;
            return (
              <Pressable
                key={lt.value}
                onPress={() => setLocationType(lt.value)}
                style={[
                  styles.locationChip,
                  {
                    backgroundColor: selected ? theme.primary : theme.inputBackground,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: selected ? theme.primaryContrast : theme.text }}>
                  {lt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Address Label */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Address / Place Name
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="e.g. Downtown Musalla"
          placeholderTextColor={theme.textSecondary}
          value={addressLabel}
          onChangeText={setAddressLabel}
        />

        {/* Max Participants */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Max Participants (optional)
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Leave empty for unlimited"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
        />

        {/* Schedule Type */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Schedule
        </ThemedText>
        <View style={styles.locationRow}>
          {SCHEDULE_TYPES.map((st) => {
            const selected = scheduleType === st.value;
            return (
              <Pressable
                key={st.value}
                onPress={() => setScheduleType(st.value)}
                style={[
                  styles.locationChip,
                  {
                    backgroundColor: selected ? theme.primary : theme.inputBackground,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: selected ? theme.primaryContrast : theme.text }}>
                  {st.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Recurring Days */}
        {scheduleType === 'recurring' && (
          <>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Repeat on
            </ThemedText>
            <View style={styles.locationRow}>
              {DAYS.map((day, i) => {
                const selected = recurringDays.has(i);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(i)}
                    style={[
                      styles.locationChip,
                      {
                        backgroundColor: selected ? theme.primary : theme.inputBackground,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.primaryContrast : theme.text }}>
                      {day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Images */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Photos (up to 3)
        </ThemedText>
        <View style={styles.imageRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <Pressable
                style={[styles.removeBtn, { backgroundColor: theme.danger }]}
                onPress={() => removeImage(i)}>
                <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>X</ThemedText>
              </Pressable>
            </View>
          ))}
          {images.length < 3 && (
            <View style={styles.imageActions}>
              <Pressable style={[styles.addImageBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={pickImage}>
                <ThemedText type="small" themeColor="textSecondary">Gallery</ThemedText>
              </Pressable>
              <Pressable style={[styles.addImageBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={takePhoto}>
                <ThemedText type="small" themeColor="textSecondary">Camera</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {error ? (
          <ThemedView style={[styles.errorContainer, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}>
            <ThemedText style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </ThemedText>
          </ThemedView>
        ) : null}

        <View style={styles.buttonContainer}>
          <Button
            title={busy ? 'Creating...' : "Create Jama'ah"}
            onPress={onSubmit}
            loading={busy}
            style={[styles.button, { backgroundColor: theme.primary }]}
            textStyle={{ color: '#FFFFFF', fontWeight: '600' }}
          />
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
    height: '15%',
  },
  bgBottom: {
    position: 'absolute',
    top: '15%',
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
  sectionLabel: { marginBottom: Spacing.one, marginTop: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tilePressable: { width: '31%', aspectRatio: 1 },
  tile: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  locationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  locationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  imageContainer: { position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActions: { flexDirection: 'row', gap: Spacing.two },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: { padding: Spacing.three, borderRadius: 12, borderWidth: 1 },
  errorText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  buttonContainer: { marginTop: Spacing.two },
  button: { borderRadius: 14, paddingVertical: 14 },
});
