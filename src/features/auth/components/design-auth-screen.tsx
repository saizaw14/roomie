import { palette as appPalette } from '@/theme/palette';
import type { PropsWithChildren } from 'react';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';

export function DesignAuthScreen({ title, eyebrow, description, success = false, fixed = false, children }: PropsWithChildren<{ title: string; eyebrow: string; description?: string; success?: boolean; fixed?: boolean }>) {
  const { issue, configured, retryRestore } = useAuth();
  const [loaded, fontError] = useFonts({
    RoomieInter: require('../../../../assets/fonts/Inter-Regular.ttf'),
    RoomieInterMedium: require('../../../../assets/fonts/Inter-Medium.ttf'),
    RoomieInterSemiBold: require('../../../../assets/fonts/Inter-SemiBold.ttf'),
    RoomieInterBold: require('../../../../assets/fonts/Inter-Bold.ttf'),
    RoomieInterExtraBold: require('../../../../assets/fonts/Inter-ExtraBold.ttf'),
  });
  if (!loaded && !fontError) return <LoadingScreen label="Opening Roomie…" />;
  return <View style={s.canvas}><SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView scrollEnabled={!fixed} bounces={!fixed} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.scroll, fixed && s.fixedContent]}>
        <View style={[s.top, fixed && s.fixedTop]}>
          {success ? <View style={{ width: 44 }} /> : <Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Back to Roomie" style={s.back}>
            <Image source={require('../../../../assets/images/auth/back.svg')} style={{ width: 20, height: 20 }} />
          </Pressable></Link>}
          <View style={s.brand}><View style={s.mark}><Image source={require('../../../../assets/images/auth/home.svg')} style={{ width: 25, height: 25 }} /></View><Text style={s.brandText}>Roomie</Text></View>
          <View style={{ width: 44 }} />
        </View>
        {!success ? <View style={[s.heading, fixed && s.fixedHeading]}><Text style={s.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text>
          {description ? <Text style={s.description}>{description}</Text> : null}
        </View> : null}
        {issue ? <View style={s.notice}><Text accessibilityRole="alert" style={s.description}>{issue}</Text>
          {configured ? <Button label="Retry saved session" variant="secondary" onPress={retryRestore} /> : null}</View> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView></View>;
}
export const designAuthStyles = StyleSheet.create({
  error: { color: c.error, fontFamily: f.regular, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  options: { minHeight: 44, marginTop: -4, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  remember: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  check: { width: 18, height: 18, borderWidth: 1, borderColor: appPalette.handle, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: c.primary, borderColor: c.primary },
  checkText: { color: c.white, fontSize: 12 },
  small: { color: c.muted, fontSize: 14, lineHeight: 20, fontFamily: f.medium },
  link: { color: c.primary, fontSize: 14, lineHeight: 20, fontFamily: f.semibold, paddingVertical: 12 },
  switch: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  legal: { maxWidth: 340, alignSelf: 'center', marginTop: 0, textAlign: 'center', color: appPalette.subtleText, fontFamily: f.regular, fontSize: 12, lineHeight: 18 },
  successArea: { paddingTop: 70, paddingHorizontal: 4, alignItems: 'stretch' },
  successIcon: { width: 72, height: 72, borderRadius: 23, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 23 },
  successTitle: { fontFamily: f.bold, fontSize: 25, letterSpacing: -0.6, color: c.ink, textAlign: 'center', marginBottom: 9 },
  email: { alignSelf: 'center', borderRadius: 10, backgroundColor: appPalette.neutralSoft, paddingVertical: 9, paddingHorizontal: 12, color: c.ink, fontFamily: f.bold, fontSize: 10, marginBottom: 25 },
  success: { color: c.muted, fontFamily: f.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
});
const s = StyleSheet.create({
  fixedContent: { paddingTop: 8, paddingBottom: 12 },
  fixedTop: { minHeight: 52 },
  fixedHeading: { paddingTop: 12, paddingBottom: 16 },
  flex: { flex: 1 }, canvas: { flex: 1, backgroundColor: c.canvas }, safe: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: c.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, paddingTop: Platform.OS === 'web' ? 20 : 0 },
  top: { minHeight: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { width: 42, height: 42, borderWidth: 1, borderColor: c.line, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, mark: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(40,95,82,0.18)' },
  brandText: { fontFamily: f.bold, fontSize: 17, letterSpacing: -0.6, color: c.ink },
  heading: { paddingTop: 24, paddingBottom: 28 }, eyebrow: { color: c.primary, fontFamily: f.extra, fontSize: 12, lineHeight: 18, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: c.ink, fontFamily: f.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.7, marginVertical: 8 },
  description: { color: c.muted, fontFamily: f.regular, fontSize: 14, lineHeight: 22 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: c.soft, gap: 8, marginBottom: 14 },
});
