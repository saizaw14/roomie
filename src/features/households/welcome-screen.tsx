import { palette as appPalette } from '@/theme/palette';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRoomieFonts } from '@/hooks/use-roomie-fonts';
import { authColors as c,authFonts as f } from '@/theme/auth-tokens';

export function WelcomeScreen() {
 const {width:windowWidth,height,fontScale}=useWindowDimensions();
 const insets=useSafeAreaInsets();
 const [measuredHeight,setMeasuredHeight]=useState<number|null>(null);
 const width=Math.min(windowWidth,430);
 const availableHeight=measuredHeight??height-insets.top-insets.bottom;
 const compact=availableHeight<700||fontScale>1.2;
 const tight=availableHeight<360;
 const copyBudget=compact?350*Math.max(1,fontScale):420;
 const artHeight=Math.max(0,Math.min(width*0.895,availableHeight-copyBudget));
 const showArt=artHeight>=150;
 const scale=Math.min(width/430,artHeight/384);
 const actionStyle=StyleSheet.flatten([s.action,compact&&{minHeight:48,paddingVertical:10}]);
 const [loaded,error]=useRoomieFonts();
 if(!loaded&&!error)return <LoadingScreen label="Opening Roomie…"/>;
 return <View style={s.canvas}><SafeAreaView style={s.safe}>
  <View style={s.screen} onLayout={event=>setMeasuredHeight(event.nativeEvent.layout.height)}>
   {showArt?<View style={[s.art,{height:artHeight}]} accessibilityLabel="Illustration with sample figures: Alex paid RM400, RM300 owed, electricity due in three days.">
    <Image source={require('../../../assets/images/welcome/background.svg')} style={StyleSheet.absoluteFill} contentFit="fill" accessibilityElementsHidden/>
    <View style={[s.balance,{width:220*scale,minHeight:211*scale,left:(width-220*scale)/2,top:88*scale,padding:20*scale}]}>
     <Image source={require('../../../assets/images/welcome/balance.svg')} style={StyleSheet.absoluteFill} contentFit="fill"/>
     <View style={[s.arrowBox,{width:38*scale,height:38*scale}]}><Image source={require('../../../assets/images/welcome/arrow.svg')} style={{width:24,height:24}}/></View>
     <Text style={[s.owed,{marginTop:20*scale}]}>You are owed</Text><Text style={[s.amount,{fontSize:29*scale}]}>RM300.00</Text>
     <View style={[s.avatars,{marginTop:24*scale}]}>{[['BT',appPalette.infoSoft,appPalette.info],['CK',appPalette.warningSoft,appPalette.warning],['DL',appPalette.lavenderSoft,appPalette.lavender]].map(([initials,bg,color])=><View key={initials} style={[s.avatar,{backgroundColor:bg,width:29*scale,height:29*scale,marginRight:-3*scale}]}><Text style={[s.initials,{color,fontSize:8*scale}]}>{initials}</Text></View>)}</View>
    </View>
    <View style={[s.floating,s.paid,{left:20*scale,top:32*scale,padding:11*scale,gap:10*scale}]}>
     <View style={[s.avatar,{width:37*scale,height:37*scale,backgroundColor:c.soft}]}><Text style={s.alex}>AZ</Text></View>
     <View><Text style={s.caption}>Alex paid</Text><Text style={s.cardAmount}>RM400.00</Text></View>
     <Image source={require('../../../assets/images/expenses/check.svg')} style={{width:20,height:20,marginLeft:4}}/>
    </View>
    <View style={[s.floating,s.bill,{right:17*scale,bottom:32*scale,padding:11*scale,gap:9*scale}]}>
     <View style={[s.boltBox,{width:37*scale,height:37*scale}]}><Image source={require('../../../assets/images/expenses/bolt.svg')} style={{width:20,height:20}} tintColor={appPalette.warning}/></View>
     <View><Text style={s.cardAmount}>Electricity</Text><Text style={s.caption}>Due in 3 days</Text></View>
    </View>
   </View>:null}
   <View style={[s.copy,compact&&s.compactCopy,tight&&{paddingVertical:8}]}>
    <View style={s.brandRow}><View style={[s.mark,tight&&{width:32,height:32}]}><Image source={require('../../../assets/images/auth/home.svg')} style={{width:25,height:25}}/></View><Text style={s.brand}>Roomie</Text></View>
    <Text accessibilityRole="header" style={[s.headline,{fontSize:compact?28:width<360?30:34},compact&&s.compactHeadline,tight&&{fontSize:24,lineHeight:26,marginTop:10,marginBottom:0}]}>Shared living.{'\n'}<Text style={s.teal}>Simpler money.</Text></Text>
    {!tight?<Text style={s.description}>Split expenses, stay ahead of bills, and settle up without the awkward conversations.</Text>:null}
    <View style={[s.actions,compact&&s.compactActions]}>
     <Link href="/signup" asChild><Button appearance="auth" label="Get started" style={actionStyle} labelStyle={s.actionLabel}/></Link>
     <Link href="/login" asChild><Button appearance="auth" variant="secondary" label="I already have an account" style={StyleSheet.flatten([actionStyle,s.secondary])} labelStyle={[s.actionLabel,{color:c.primary}]}/></Link>
    </View>
   </View>
  </View>
 </SafeAreaView></View>;
}
const s=StyleSheet.create({
 canvas:{flex:1,backgroundColor:appPalette.canvas},safe:{flex:1,width:'100%',maxWidth:430,alignSelf:'center',backgroundColor:'white'},screen:{flex:1,minHeight:0},art:{overflow:'hidden',backgroundColor:appPalette.heroEnd},
 balance:{position:'absolute',borderRadius:26,overflow:'hidden',boxShadow:'0 18px 40px rgba(40,95,82,0.25)'},arrowBox:{borderRadius:12,backgroundColor:'rgba(255,255,255,0.17)',alignItems:'center',justifyContent:'center'},owed:{fontFamily:f.regular,color:'rgba(255,255,255,0.72)',fontSize:10},amount:{fontFamily:f.bold,color:'white',letterSpacing:-0.8,marginTop:10},avatars:{flexDirection:'row'},avatar:{borderRadius:999,alignItems:'center',justifyContent:'center'},initials:{fontFamily:f.bold},
 floating:{position:'absolute',flexDirection:'row',alignItems:'center',borderRadius:17,backgroundColor:'rgba(255,255,255,0.96)',minHeight:65,boxShadow:'0 12px 28px rgba(32,65,65,0.12)'},paid:{},bill:{},alex:{fontFamily:f.extra,fontSize:12,color:c.primary},caption:{fontFamily:f.regular,fontSize:8,lineHeight:14,color:c.muted},cardAmount:{fontFamily:f.bold,fontSize:10,lineHeight:17,color:c.ink},boltBox:{backgroundColor:appPalette.warningSoft,borderRadius:13,justifyContent:'center',alignItems:'center'},
 compactCopy:{paddingTop:16,paddingBottom:16},compactHeadline:{lineHeight:31,marginTop:14,marginBottom:10},compactActions:{marginTop:18},
 copy:{flex:1,paddingHorizontal:25,paddingTop:28,paddingBottom:40,backgroundColor:'white'},brandRow:{flexDirection:'row',alignItems:'center',gap:10},mark:{width:42,height:42,borderRadius:14,backgroundColor:c.primary,justifyContent:'center',alignItems:'center',boxShadow:'0 6px 14px rgba(40,95,82,0.18)'},brand:{fontFamily:f.bold,fontSize:23,letterSpacing:-0.6,color:c.ink},headline:{fontFamily:f.regular,color:c.ink,lineHeight:37,letterSpacing:-1.2,marginTop:24,marginBottom:14},teal:{color:c.primary},description:{fontFamily:f.regular,fontSize:13,lineHeight:21,color:c.muted},actions:{gap:9,marginTop:32},action:{minHeight:54,borderRadius:14},actionLabel:{fontFamily:f.bold,fontSize:14},secondary:{backgroundColor:'white',borderWidth:1,borderColor:appPalette.selectedBorder},
});
