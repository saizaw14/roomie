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

export function DesignAuthScreen({ title, eyebrow, description, success = false, children }: PropsWithChildren<{ title: string; eyebrow: string; description?: string; success?: boolean }>) {
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
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.scroll}>
        <View style={s.top}>
          {success ? <View style={{ width: 44 }} /> : <Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Back to Roomie" style={s.back}>
            <Image source={require('../../../../assets/images/auth/back.svg')} style={{ width: 20, height: 20 }} />
          </Pressable></Link>}
          <View style={s.brand}><View style={s.mark}><Image source={require('../../../../assets/images/auth/home.svg')} style={{ width: 25, height: 25 }} /></View><Text style={s.brandText}>Roomie</Text></View>
          <View style={{ width: 44 }} />
        </View>
        {!success ? <View style={s.heading}><Text style={s.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text>
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
  error: { color: c.error, fontFamily: f.regular, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  options: { minHeight: 42, marginTop: -3, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  remember: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  check: { width: 18, height: 18, borderWidth: 1, borderColor: appPalette.handle, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: c.primary, borderColor: c.primary },
  checkText: { color: c.white, fontSize: 12 },
  small: { color: c.muted, fontSize: 10, fontFamily: f.medium },
  link: { color: c.primary, fontSize: 10, fontFamily: f.extra, paddingVertical: 14 },
  switch: { marginTop: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  legal: { maxWidth: 280, alignSelf: 'center', marginTop: 0, textAlign: 'center', color: appPalette.subtleText, fontFamily: f.regular, fontSize: 8, lineHeight: 12 },
  successArea: { paddingTop: 70, paddingHorizontal: 4, alignItems: 'stretch' },
  successIcon: { width: 72, height: 72, borderRadius: 23, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 23 },
  successTitle: { fontFamily: f.bold, fontSize: 25, letterSpacing: -0.6, color: c.ink, textAlign: 'center', marginBottom: 9 },
  email: { alignSelf: 'center', borderRadius: 10, backgroundColor: appPalette.neutralSoft, paddingVertical: 9, paddingHorizontal: 12, color: c.ink, fontFamily: f.bold, fontSize: 10, marginBottom: 25 },
  success: { color: c.muted, fontFamily: f.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
});
export function GoogleSignInPlaceholder() {
  return <View><View style={s.divider}><View style={s.line} /><Text style={s.dividerText}>or continue with</Text><View style={s.line} /></View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Continue with Google, not available yet" disabled style={s.social}>
      <Text style={s.google}>G</Text><Text style={s.socialText}>Continue with Google</Text>
    </Pressable><Text style={s.unavailable}>Google sign-in is not available yet.</Text></View>;
}
const s = StyleSheet.create({
  flex: { flex: 1 }, canvas: { flex: 1, backgroundColor: c.canvas }, safe: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: c.white },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28, paddingTop: Platform.OS === 'web' ? 20 : 0 },
  top: { minHeight: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { width: 42, height: 42, borderWidth: 1, borderColor: c.line, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, mark: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(40,95,82,0.18)' },
  brandText: { fontFamily: f.bold, fontSize: 17, letterSpacing: -0.6, color: c.ink },
  heading: { paddingTop: 19, paddingBottom: 21, paddingHorizontal: 1 }, eyebrow: { color: c.primary, fontFamily: f.extra, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: c.ink, fontFamily: f.bold, fontSize: 26, lineHeight: 31, letterSpacing: -0.7, marginVertical: 8 },
  description: { color: c.muted, fontFamily: f.regular, fontSize: 11, lineHeight: 17 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: c.soft, gap: 8, marginBottom: 14 },
  divider: { height: 45, flexDirection: 'row', alignItems: 'center' }, line: { flex: 1, height: 1, backgroundColor: c.line }, dividerText: { paddingHorizontal: 11, color: appPalette.subtleText, fontSize: 9, fontFamily: f.regular },
  social: { minHeight: 50, borderWidth: 1, borderColor: c.line, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  google: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: c.line, textAlign: 'center', lineHeight: 21, fontSize: 12, fontFamily: f.bold, color: '#4285f4' },
  socialText: { color: c.ink, fontFamily: f.bold, fontSize: 12 }, unavailable: { color: c.muted, fontSize: 9, textAlign: 'center', marginTop: 6, fontFamily: f.regular },
});
