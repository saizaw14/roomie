import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { palette } from '@/theme/palette';
import { DashboardIcon, styles } from './components';

const tabs = [
 { key:'home',label:'Home',href:'/home',icon:'home' },
 { key:'expenses',label:'Expenses',href:'/expenses',icon:'receipt' },
 { key:'bills',label:'Bills',href:'/bills',icon:'calendar' },
 { key:'profile',label:'Me',href:'/profile',icon:'user' },
] as const;

/** Main destinations replace each other; forms and details keep their own Back history. */
export function MainNavigation({active}:{active:typeof tabs[number]['key']}) {
 return <View accessibilityRole="tablist" style={styles.nav}>{tabs.map(tab=>{
  const selected=tab.key===active;
  const content=<>{selected?<View style={styles.indicator}/>:null}<DashboardIcon name={tab.icon} color={selected?palette.primary:palette.subtleText}/><Text style={[styles.navLabel,selected&&styles.activeNav]}>{tab.label}</Text></>;
  return selected?<View key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:true}} style={styles.navItem}>{content}</View>:<Link key={tab.key} href={tab.href} replace asChild><Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:false}} style={styles.navItem}>{content}</Pressable></Link>;
 })}</View>;
}
