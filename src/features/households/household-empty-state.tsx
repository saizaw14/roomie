import { Link } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { DashboardIcon, DashboardCard, styles as d } from '@/features/dashboard/components';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';

export function HouseholdEmptyState({expenses=false}:{expenses?:boolean}) {
 return <>
  <View style={s.hero}><View style={s.icon}><DashboardIcon name={expenses?'receipt':'building'}/></View><Text accessibilityRole="header" style={s.title}>{expenses?'Your expenses start with a household':'Welcome to your shared home'}</Text><Text style={s.body}>{expenses?'Create a household or join your roommates to see shared spending and your personal shares.':'Bring your roommates together to split expenses and keep track of who paid for what.'}</Text></View>
  <DashboardCard><Text style={d.heading}>Set up your household</Text><Text style={d.small}>Starting a new home? Create a household and choose its currency. Already invited? Join with the code or link from your owner.</Text><Link href="/households/create" asChild><Button appearance="auth" label="Create household" leadingIcon={<DashboardIcon name="plus" color="white"/>}/></Link><Link href="/join" asChild><Button appearance="auth" variant="secondary" label="Join household" leadingIcon={<DashboardIcon name="plus"/>}/></Link></DashboardCard>
  <DashboardCard><Text style={d.bold}>What happens next?</Text><Text style={d.small}>1. Create or join a household.</Text><Text style={d.small}>2. Invite your roommates from Me → Household settings.</Text><Text style={d.small}>3. Add your first shared expense from Home.</Text></DashboardCard>
 </>;
}
const s=StyleSheet.create({hero:{alignItems:'center',paddingHorizontal:12,paddingVertical:24,gap:14},icon:{width:64,height:64,borderRadius:20,backgroundColor:c.soft,alignItems:'center',justifyContent:'center'},title:{fontFamily:f.bold,fontSize:25,lineHeight:31,letterSpacing:-0.6,color:c.ink,textAlign:'center'},body:{fontFamily:f.regular,fontSize:13,lineHeight:21,color:c.muted,textAlign:'center'}});
