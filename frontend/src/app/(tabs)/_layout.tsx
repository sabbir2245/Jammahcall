import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/contexts/auth';

export default function TabsLayout() {
  const { user } = useAuth();
  if (!user) {
    return <Redirect href="/login" />;
  }
  return <AppTabs />;
}