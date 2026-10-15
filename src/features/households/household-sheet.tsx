import type { PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { useAuth } from '@/lib/auth-context';
import { authColors as c,authFonts as f } from '@/theme/auth-tokens';
export function closeHouseholdSheet(signedIn:boolean) {
 if(router.canGoBack())router.back();else router.replace(signedIn?'/home':'/');
}
export function HouseholdSheet({title,subtitle,busy=false,onBack,children}:PropsWithChildren<{title:string;subtitle:string;busy?:boolean;onBack?:()=>void}>) {
 const [loaded,error]=useRoomieFonts();const {session}=useAuth();const insets=useSafeAreaInsets();const {height}=useWindowDimensions();
 const close=()=>{if(!busy)closeHouseholdSheet(!!session);};
 return <View style={s.overlay}>
  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss household sheet" disabled={busy} onPress={close} style={StyleSheet.absoluteFill}/>
  <KeyboardAvoidingView pointerEvents="box-none" style={s.position} behavior={Platform.OS==='ios'?'padding':'height'}>
   <View accessibilityViewIsModal style={[s.sheet,{maxHeight:Math.max(180,height-insets.top-20)}]}>
    <View style={s.handle}/><View style={s.header}><View style={{flex:1}}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel="Close household sheet" disabled={busy} onPress={close} style={s.close}><Image source={require('../../../assets/images/expenses/close.svg')} style={{width:20,height:20}} tintColor={c.ink}/></Pressable>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.body,{paddingBottom:Math.max(28,insets.bottom+18)}]}>
     {onBack?<Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={s.back}><Text style={s.link}>‹ Back to households</Text></Pressable>:null}
     {!loaded&&!error?<Text style={s.text}>Loading…</Text>:children}
    </ScrollView>
   </View>
  </KeyboardAvoidingView>
 </View>;
}
export const s=StyleSheet.create({
 overlay:{flex:1,backgroundColor:'rgba(10,22,30,0.46)'},position:{flex:1,justifyContent:'flex-end'},sheet:{width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:'#f4f6f8',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden',boxShadow:'0 -20px 40px rgba(10,22,30,0.16)'},handle:{width:38,height:4,borderRadius:4,backgroundColor:'#ccd2d7',alignSelf:'center',marginTop:9,marginBottom:3},header:{minHeight:69,paddingHorizontal:20,paddingTop:11,paddingBottom:13,backgroundColor:'white',borderBottomWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',gap:10},title:{fontFamily:f.bold,color:c.ink,fontSize:19,letterSpacing:-0.3},subtitle:{fontFamily:f.regular,color:c.muted,fontSize:10,lineHeight:16,marginTop:4},close:{width:44,height:44,borderWidth:1,borderColor:c.line,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'white'},body:{paddingTop:17,paddingHorizontal:20,gap:14},text:{fontFamily:f.regular,color:c.muted,fontSize:12,lineHeight:19},bold:{fontFamily:f.semibold,color:c.ink,fontSize:13},error:{fontFamily:f.regular,color:c.error,fontSize:12,lineHeight:19},back:{minHeight:36,justifyContent:'center'},link:{fontFamily:f.bold,color:c.primary,fontSize:12},option:{minHeight:78,padding:14,borderWidth:1,borderColor:c.line,borderRadius:15,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:10},selected:{borderColor:'#91c9c1',backgroundColor:'#f3fbfa'},icon:{width:36,height:36,borderRadius:11,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'},actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},action:{flex:1,minWidth:135},secondary:{backgroundColor:'white',borderWidth:1,borderColor:'#b8d7d3'},secondaryLabel:{color:c.primary},info:{padding:12,borderRadius:13,backgroundColor:'#eaf3fb',flexDirection:'row',alignItems:'flex-start',gap:9},infoText:{fontFamily:f.regular,color:'#2964a3',fontSize:11,lineHeight:17,flex:1},
});
