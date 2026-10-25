import { palette as appPalette } from '@/theme/palette';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { requireSupabase } from '@/lib/supabase';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { DashboardIcon, styles as dashboard } from '@/features/dashboard/components';
import { Button } from '@/components/ui/button';
import { money, safeMinor } from '@/features/expenses/domain';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';

const schema = z.array(z.object({
  id: z.string(), household_id: z.string(), settlement_id: z.string(),
  created_at: z.string(), read_at: z.string().nullable(), household_name: z.string(),
  sender_name: z.string(), amount_minor: z.string(), currency: z.string(), status: z.string(),
}));
type ReceiptNotification = z.infer<typeof schema>[number];

function useNotifications() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['receipt-notifications', session?.user.id], enabled: !!session,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc('roomie_receipt_notifications');
      if (error) throw error;
      return schema.parse(data);
    },
    refetchInterval: 10000, refetchIntervalInBackground: false,
  });
}
async function markRead(id: string) {
  const { error } = await requireSupabase().rpc('roomie_read_receipt_notification', { p_id: id });
  if (error) throw error;
}
function notificationDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}
export function NotificationBell() {
  const query = useNotifications();
  const count = query.data?.filter(n => !n.read_at).length ?? 0;
  return <Link href="/notifications" asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${count ? `, ${count} unread` : ''}`} style={dashboard.iconButton}>
      <DashboardIcon name="bell" color={c.muted}/>
      {count ? <View style={styles.bellDot}/> : null}
    </Pressable>
  </Link>;
}
export default function NotificationsScreen() {
  const query = useNotifications();
  const client = useQueryClient();
  const unread = query.data?.filter(n => !n.read_at) ?? [];
  const refresh = () => client.invalidateQueries({ queryKey: ['receipt-notifications'] });
  const open = useMutation({
    mutationFn: async (notification: ReceiptNotification) => {
      await markRead(notification.id);
      return notification;
    },
    onSuccess: notification => {
      void refresh();
      router.replace({ pathname: '/settlements', params: {
        household: notification.household_id, view: 'history', payment: notification.settlement_id,
      } });
    },
  });
  const markAll = useMutation({
    mutationFn: async () => {
      // Mark only the displayed unread snapshot; newly arriving receipts stay unread.
      // Small batches avoid flooding the API when an account has a large inbox.
      for (let i = 0; i < unread.length; i += 10) {
        const results = await Promise.allSettled(unread.slice(i, i + 10).map(n => markRead(n.id)));
        if (results.some(result => result.status === 'rejected')) throw new Error('Some notifications could not be marked read.');
      }
    },
    onSettled: refresh,
  });
  const busy = open.isPending || markAll.isPending;
  const subtitle = query.isPending ? 'Checking your notifications…'
    : query.isError ? 'Payment updates' : unread.length
      ? `${unread.length} ${unread.length === 1 ? 'item needs' : 'items need'} attention` : 'You’re all caught up';
  return <HouseholdSheet title="Notifications" subtitle={subtitle} busy={busy}>
    {query.isPending ? <Text style={styles.message}>Loading notifications…</Text> : null}
    {query.isError ? <View style={styles.state}>
      <Text accessibilityRole="alert" style={styles.error}>We couldn’t load your notifications. Please try again.</Text>
      <Button appearance="auth" variant="secondary" style={styles.secondary} labelStyle={styles.secondaryLabel} label="Retry" loading={query.isFetching} onPress={() => void query.refetch()}/>
    </View> : null}
    {query.isSuccess && !query.data.length ? <View style={styles.empty}>
      <View style={styles.emptyIcon}><DashboardIcon name="bell"/></View>
      <Text style={styles.emptyTitle}>You’re all caught up</Text>
      <Text style={styles.emptyText}>When someone sends you a payment receipt, you’ll find it here.</Text>
    </View> : null}
    {open.isError || markAll.isError ? <Text accessibilityRole="alert" style={styles.error}>{open.isError ? 'Could not open this payment. Please try again.' : 'Some notifications could not be marked read. Please try again.'}</Text> : null}
    {query.data?.length ? <View>
      {query.data.map((notification, index) => <NotificationRow key={notification.id} notification={notification} divider={index > 0} disabled={busy} onPress={() => open.mutate(notification)}/>)}
      <Button appearance="auth" variant="secondary" label="Mark all as read" style={styles.secondary} labelStyle={styles.secondaryLabel} disabled={!unread.length || open.isPending} loading={markAll.isPending} onPress={() => markAll.mutate()}/>
    </View> : null}
  </HouseholdSheet>;
}
function NotificationRow({ notification: n, divider, disabled, onPress }: {
  notification: ReceiptNotification; divider: boolean; disabled: boolean; onPress: () => void;
}) {
  const pending = n.status === 'pending';
  const title = pending ? `Confirm ${n.sender_name}’s payment` : `${n.sender_name}’s payment ${n.status}`;
  const detail = `${money(safeMinor(n.amount_minor), n.currency)} · ${pending ? 'Waiting for you' : n.status === 'confirmed' ? 'Payment confirmed' : 'Payment rejected'}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}. ${n.household_name}.${!n.read_at ? ' Unread.' : ''}`} disabled={disabled}
    style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]} onPress={onPress}>
    <View style={[styles.paymentIcon, !pending && styles.resolvedIcon]}>
      <DashboardIcon name="wallet" color={pending ? appPalette.warning : c.primary}/>
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <Text style={styles.date}>{notificationDate(n.created_at)} · {n.household_name}</Text>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: appPalette.notification, boxShadow: '0 0 0 2px #ffffff' },
  row: { minHeight: 76, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: c.line },
  pressed: { opacity: 0.65 },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: appPalette.warningIcon, alignItems: 'center', justifyContent: 'center' },
  resolvedIcon: { backgroundColor: c.soft },
  rowContent: { flex: 1, minWidth: 0 },
  title: { fontFamily: f.bold, fontSize: 12, lineHeight: 17, color: c.ink },
  detail: { fontFamily: f.regular, fontSize: 10, lineHeight: 15, color: c.muted, marginVertical: 4 },
  date: { fontFamily: f.regular, fontSize: 9, lineHeight: 14, color: appPalette.subtleText },
  secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: appPalette.selectedBorder, width: '100%' },
  secondaryLabel: { color: c.primary },
  state: { gap: 14 },
  message: { fontFamily: f.regular, fontSize: 12, lineHeight: 19, color: c.muted },
  error: { fontFamily: f.regular, fontSize: 12, lineHeight: 19, color: c.error },
  empty: { alignItems: 'center', paddingVertical: 22, gap: 10 },
  emptyIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: f.bold, fontSize: 14, color: c.ink },
  emptyText: { fontFamily: f.regular, fontSize: 12, lineHeight: 19, color: c.muted, textAlign: 'center', maxWidth: 280 },
});
