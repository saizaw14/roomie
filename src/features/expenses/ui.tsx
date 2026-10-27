import { categoryColor } from '@/theme/category-colors';
import { pressFeedback } from '@/lib/press-feedback';
import { palette as appPalette } from '@/theme/palette';
import type { PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { KeyboardAvoidingView,Platform,ScrollView,StyleSheet,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Card } from '@/components/ui/card';
import { authColors as c,authFonts as f } from '@/theme/auth-tokens';
export const icons={groceries:require('../../../assets/images/expenses/groceries.svg'),receipt:require('../../../assets/images/expenses/receipt.svg'),bolt:require('../../../assets/images/expenses/bolt.svg'),building:require('../../../assets/images/expenses/building.svg'),close:require('../../../assets/images/expenses/close.svg'),chevron:require('../../../assets/images/expenses/chevron.svg'),check:require('../../../assets/images/expenses/check.svg'),history:require('../../../assets/images/expenses/history.svg')};
export function Icon({name,color}:{name:keyof typeof icons;color?:string}) {return <Image source={icons[name]} style={{width:20,height:20}} tintColor={color} contentFit="contain" />;}
export function ExpenseScreen({title,subtitle,children,sheet=false}:PropsWithChildren<{title:string;subtitle?:string;sheet?:boolean}>) {
 const [loaded,error]=useFonts({RoomieInter:require('../../../assets/fonts/Inter-Regular.ttf'),RoomieInterMedium:require('../../../assets/fonts/Inter-Medium.ttf'),RoomieInterSemiBold:require('../../../assets/fonts/Inter-SemiBold.ttf'),RoomieInterBold:require('../../../assets/fonts/Inter-Bold.ttf'),RoomieInterExtraBold:require('../../../assets/fonts/Inter-ExtraBold.ttf')});
 if(!loaded&&!error) return <LoadingScreen />;
 return <View style={s.canvas}><SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
  {sheet?<View style={s.handle}/>:null}<View style={s.header}><View style={{flex:1}}><Text accessibilityRole="header" style={s.heading}>{title}</Text>{subtitle?<Text style={s.small}>{subtitle}</Text>:null}</View>
   <Link href="/expenses" asChild><Pressable accessibilityRole="button" accessibilityLabel={sheet?'Close expense':'Expense list'} style={s.iconButton}><Icon name={sheet?'close':'receipt'}/></Pressable></Link></View>
  <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>{children}</ScrollView>
  {!sheet?<View style={s.nav}><Link href="/home" style={s.navLink} onPress={pressFeedback}>Home</Link><Link href="/expenses" style={s.navLink} onPress={pressFeedback}>Expenses</Link><Link href="/profile" style={s.navLink} onPress={pressFeedback}>Me</Link></View>:null}
 </KeyboardAvoidingView></SafeAreaView></View>;
}
export function ExpenseCard({children}:PropsWithChildren) {return <Card style={s.card}>{children}</Card>;}
export function Choice({label,selected,onPress,disabled=false}:{label:string;selected:boolean;onPress:()=>void;disabled?:boolean}) {return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.chip,selected&&s.selected]}><Text style={[s.chipText,selected&&{color:c.primary}]}>{label}</Text></Pressable>;}
export function CategoryChoice({label,selected,onPress,disabled=false}:{label:string;selected:boolean;onPress:()=>void;disabled?:boolean}) {
 const tone=categoryColor(label);
 return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.chip,{backgroundColor:tone.background,borderColor:selected?tone.foreground:c.line}]}><Text style={[s.chipText,{color:tone.foreground}]}>{selected?'✓ ':''}{label}</Text></Pressable>;
}
export function CategoryIcon({category,inactive=false}:{category:string;inactive?:boolean}) {
 const tone=categoryColor(category);
 return <View style={{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:inactive?appPalette.neutralSoft:tone.background}}><Icon name={inactive?'receipt':category==='Groceries'?'groceries':category==='Utilities'?'bolt':category==='Rent'?'building':'receipt'} color={inactive?c.muted:tone.foreground}/></View>;
}
export function Avatar({name}:{name:string}) {return <View style={s.avatar}><Text style={s.avatarText}>{name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</Text></View>;}
export function Status({status}:{status:string}) {return <Text style={[s.badge,status.toLowerCase()==='void'?s.voidBadge:status.toLowerCase()==='posted'?s.postedBadge:null]}>{status}</Text>;}
export function Row({label,value}:{label:string;value:string}) {return <View style={s.row}><Text style={s.small}>{label}</Text><Text style={[s.bold,{flexShrink:1,textAlign:'right'}]}>{value}</Text></View>;}
export const s=StyleSheet.create({
 canvas:{flex:1,backgroundColor:c.canvas},safe:{flex:1,width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:appPalette.background},content:{padding:20,paddingBottom:32,gap:14},header:{backgroundColor:c.white,minHeight:69,paddingHorizontal:20,paddingVertical:13,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:c.line},handle:{width:38,height:4,borderRadius:4,backgroundColor:appPalette.handle,alignSelf:'center',marginVertical:9},
 heading:{fontFamily:f.bold,fontSize:19,letterSpacing:-0.3,color:c.ink},title:{fontFamily:f.bold,fontSize:25,letterSpacing:-0.6,color:c.ink},total:{fontFamily:f.extra,fontSize:30,color:c.ink,textAlign:'center'},body:{fontFamily:f.regular,fontSize:12,lineHeight:19,color:c.ink},small:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted},bold:{fontFamily:f.semibold,fontSize:12,color:c.ink},error:{fontSize:12,lineHeight:19,color:c.error,fontFamily:f.regular},
 card:{borderRadius:17,borderColor:c.line,padding:14,gap:0},row:{minHeight:42,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,borderBottomWidth:1,borderColor:c.line},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:38,paddingHorizontal:15,paddingVertical:10,borderWidth:1,borderColor:c.line,borderRadius:20,backgroundColor:c.white},selected:{backgroundColor:c.soft,borderColor:appPalette.selectedBorder},chipText:{fontFamily:f.semibold,fontSize:12,color:c.ink},
 iconButton:{width:44,height:44,borderWidth:1,borderColor:c.line,borderRadius:13,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},avatar:{width:34,height:34,borderRadius:17,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'},avatarText:{fontFamily:f.bold,fontSize:10,color:c.primary},memberRow:{minHeight:70,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderColor:c.line},badge:{fontFamily:f.bold,fontSize:9,lineHeight:22,paddingHorizontal:8,borderRadius:10,backgroundColor:appPalette.neutralSoft,color:appPalette.subtleText,alignSelf:'flex-start'},postedBadge:{color:appPalette.success,backgroundColor:appPalette.successSoft},voidBadge:{color:c.error,backgroundColor:appPalette.errorSoft},allocation:{padding:14,borderRadius:14,backgroundColor:c.soft,gap:4},dual:{flexDirection:'row',gap:10,flexWrap:'wrap'},nav:{flexDirection:'row',justifyContent:'space-around',borderTopWidth:1,borderColor:c.line,backgroundColor:c.white},navLink:{color:c.primary,paddingVertical:20,fontSize:12,fontFamily:f.semibold},note:{padding:10,borderRadius:11,backgroundColor:appPalette.neutralSoft,color:c.muted,fontSize:10,lineHeight:15,fontFamily:f.regular},
});
