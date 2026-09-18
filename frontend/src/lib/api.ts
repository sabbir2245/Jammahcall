import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_URL, AUTH_TOKEN_KEY } from './config';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  profile_picture: string;
  profile_picture_url: string | null;
  device_token: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  auth_provider: string;
  average_rating: number | null;
  review_count: number;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function loadStoredTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (!raw) return null;
    const tokens: AuthTokens = JSON.parse(raw);
    accessToken = tokens.access;
    refreshToken = tokens.refresh;
    return tokens;
  } catch {
    return null;
  }
}

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  accessToken = tokens.access;
  refreshToken = tokens.refresh;
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      refreshToken
    ) {
      original._retry = true;
      try {
        const { data } = await axios.post<{ access: string }>(
          `${API_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken },
        );
        accessToken = data.access;
        const stored = JSON.parse(
          (await SecureStore.getItemAsync(AUTH_TOKEN_KEY)) || '{}',
        );
        await persistTokens({ ...stored, access: data.access });
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  },
);

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  gender: 'male' | 'female';
  phone?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export async function register(input: RegisterInput): Promise<void> {
  const { data } = await api.post<{ access: string; refresh: string }>(
    '/auth/register/',
    input,
  );
  await persistTokens({ access: data.access, refresh: data.refresh });
}

export async function login(email: string, password: string): Promise<void> {
  const { data } = await api.post<AuthTokens>('/auth/login/', { email, password });
  await persistTokens(data);
}

export async function googleLogin(idToken: string): Promise<void> {
  const { data } = await api.post<{ user: User; access: string; refresh: string }>(
    '/auth/google/',
    { idToken },
  );
  await persistTokens({ access: data.access, refresh: data.refresh });
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me/');
  return data;
}

export interface Jamaah {
  id: number;
  organizer: { id: number; email: string; name: string; is_verified: boolean };
  prayer: string;
  location_type: string;
  latitude: number;
  longitude: number;
  address_label: string;
  scheduled_at: string | null;
  max_participants: number | null;
  status: string;
  schedule_type: string;
  recurring_days: number[] | null;
  member_count: number;
  images: JamaahImage[];
  created_at: string;
}

export interface CreateJamaahInput {
  prayer: string;
  location_type: string;
  latitude: number;
  longitude: number;
  address_label?: string;
  scheduled_at?: string | null;
  max_participants?: number | null;
  schedule_type?: string;
  recurring_days?: number[] | null;
}

export async function fetchJamaahs(params?: {
  prayer?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  search?: string;
  location_type?: string;
  status?: string;
  sort?: string;
}): Promise<Jamaah[]> {
  const { data } = await api.get<Jamaah[]>('/jamaah/', { params });
  return data;
}

export async function fetchJamaah(id: number): Promise<Jamaah> {
  const { data } = await api.get<Jamaah>(`/jamaah/${id}/`);
  return data;
}

export interface Member {
  id: number;
  user: User;
  joined_at: string;
}

export async function fetchMembers(jamaahId: number): Promise<Member[]> {
  const { data } = await api.get<Member[]>(`/jamaah/${jamaahId}/members/`);
  return data;
}

export async function createJamaah(input: CreateJamaahInput): Promise<Jamaah> {
  const { data } = await api.post<Jamaah>('/jamaah/', input);
  return data;
}

export async function createJoinRequest(jamaahId: number): Promise<void> {
  await api.post('/jamaah/requests/', { jamaah: jamaahId });
}

export interface OrganisedJamaah {
  jamaah: Jamaah;
  pending_requests: JoinRequest[];
}

export async function fetchOrganisedJamaahs(): Promise<OrganisedJamaah[]> {
  const { data } = await api.get<OrganisedJamaah[]>('/jamaah/organised/');
  return data;
}

export interface JoinRequest {
  id: number;
  requester: User;
  jamaah: Jamaah;
  status: string;
  created_at: string;
}

export async function actOnJoinRequest(requestId: number, action: 'accept' | 'decline'): Promise<void> {
  await api.post(`/jamaah/requests/${requestId}/${action}/`);
}

export interface Review {
  id: number;
  reviewer: User;
  reviewee: User;
  jamaah: { id: number; prayer: string } | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CreateReviewInput {
  reviewee_id: number;
  jamaah_id?: number;
  rating: number;
  comment?: string;
}

export async function fetchUserReviews(userId: number): Promise<Review[]> {
  const { data } = await api.get<Review[]>('/jamaah/reviews/', { params: { user: userId } });
  return data;
}

export async function fetchJamaahReviews(jamaahId: number): Promise<Review[]> {
  const { data } = await api.get<Review[]>(`/jamaah/${jamaahId}/reviews/`);
  return data;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data } = await api.post<Review>('/jamaah/reviews/', input);
  return data;
}

export async function fetchUserProfile(userId: number): Promise<User> {
  const { data } = await api.get<User>(`/auth/users/${userId}/`);
  return data;
}

export interface JamaahImage {
  id: number;
  jamaah: number;
  image_url: string;
  caption: string;
  order: number;
  created_at: string;
}

export async function fetchJamaahImages(jamaahId: number): Promise<JamaahImage[]> {
  const { data } = await api.get<JamaahImage[]>(`/jamaah/${jamaahId}/images/`);
  return data;
}

export async function uploadJamaahImage(
  jamaahId: number,
  formData: FormData,
): Promise<JamaahImage> {
  const { data } = await api.post<JamaahImage>(`/jamaah/${jamaahId}/images/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadProfilePicture(formData: FormData): Promise<User> {
  const { data } = await api.patch<User>('/auth/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createVerificationSession(): Promise<{
  sessionId: string;
  ephemeralKeySecret: string;
}> {
  const { data } = await api.post('/auth/create-verification-session/');
  return data;
}

export interface Favourite {
  id: number;
  jamaah: Jamaah;
  created_at: string;
}

export async function fetchFavourites(): Promise<Favourite[]> {
  const { data } = await api.get<Favourite[]>('/jamaah/favourites/');
  return data;
}

export async function addFavourite(jamaahId: number): Promise<Favourite> {
  const { data } = await api.post<Favourite>('/jamaah/favourites/', { jamaah_id: jamaahId });
  return data;
}

export async function removeFavourite(favouriteId: number): Promise<void> {
  await api.delete(`/jamaah/favourites/${favouriteId}/`);
}

export interface Report {
  id: number;
  reporter: User;
  reported_user: number | null;
  reported_jamaah: number | null;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

export async function createReport(input: {
  reported_user?: number;
  reported_jamaah?: number;
  reason: string;
  details?: string;
}): Promise<Report> {
  const { data } = await api.post<Report>('/jamaah/reports/', input);
  return data;
}