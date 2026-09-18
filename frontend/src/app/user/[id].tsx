import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchUserProfile, fetchUserReviews, createReport, Review, User } from '@/lib/api';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <ThemedText key={i} style={{ fontSize: size, color: i <= rating ? '#F59E0B' : '#D1D5DB' }}>
          ★
        </ThemedText>
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const theme = useTheme();
  return (
    <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderLeft}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            {review.reviewer.name}
          </ThemedText>
          <StarRating rating={review.rating} size={14} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {new Date(review.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
      {review.comment && (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
          {review.comment}
        </ThemedText>
      )}
      {review.jamaah && (
        <ThemedText type="small" style={{ marginTop: 6, color: theme.primary }}>
          Re: {review.jamaah.prayer.charAt(0).toUpperCase() + review.jamaah.prayer.slice(1)} Jama'ah
        </ThemedText>
      )}
    </View>
  );
}

export default function UserProfileScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchUserProfile(Number(id)),
      fetchUserReviews(Number(id)),
    ])
      .then(([u, r]) => { setUser(u); setReviews(r); })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.center}>
        <ThemedText themeColor="textSecondary">{error || 'User not found'}</ThemedText>
      </View>
    );
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const reportUser = () => {
    const reasons = ['unsafe', 'harassment', 'fake_listing', 'inaccurate', 'other'] as const;
    Alert.alert(
      'Report User',
      'Select a reason:',
      reasons.map((r) => ({
        text: r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' '),
        onPress: async () => {
          try {
            await createReport({ reported_user: Number(id), reason: r });
            Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
          } catch {
            Alert.alert('Error', 'Could not submit report.');
          }
        },
      })),
      { cancelable: true },
    );
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <ThemedView style={styles.container}>
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {user.profile_picture_url ? (
            <Image source={{ uri: user.profile_picture_url }} style={[styles.avatar, { borderColor: theme.primary }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
              <ThemedText type="title" style={{ color: theme.primary }}>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText type="title" style={{ color: theme.text, textAlign: 'center' }}>
              {user.name}
            </ThemedText>
            {user.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                <ThemedText style={{ fontSize: 16, color: '#F59E0B' }}>★</ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {user.city || 'No city set'}
          </ThemedText>

          {/* Rating Summary */}
          <View style={styles.ratingSummary}>
            <StarRating rating={Math.round(avgRating)} size={22} />
            <ThemedText type="default" style={{ color: theme.text, fontWeight: '700' }}>
              {avgRating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </ThemedText>
          </View>
        </View>

        {/* Reviews */}
        <ThemedText type="smallBold" style={{ color: theme.text, marginTop: Spacing.two }}>
          Reviews
        </ThemedText>
        {reviews.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">No reviews yet.</ThemedText>
          </View>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}

        {currentUser && currentUser.id !== Number(id) && (
          <Pressable
            onPress={reportUser}
            style={[styles.reportButton, { borderColor: theme.danger || '#DC2626' }]}>
            <ThemedText type="small" style={{ color: theme.danger || '#DC2626', fontWeight: '600' }}>
              Report User
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewHeaderLeft: { gap: 4 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
  },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
