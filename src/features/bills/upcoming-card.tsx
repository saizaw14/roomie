import { CategoryIcon } from '@/features/expenses/ui';
import { Link } from 'expo-router';
import {StyleSheet,Text,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { Button } from '@/components/ui/button';
import { DashboardCard,DashboardIcon,styles as s } from '@/features/dashboard/components';
import { localToday,money } from '@/features/expenses/domain';
import { useBills,billError,dueLabel } from './api';
export function UpcomingBills({house,currency}:{house:string;currency:string}){
 const query=useBills(house);const rows=query.data?.filter(b=>b.active).slice(0,3)??[];
 return <><View style={s.section}><Text accessibilityRole="header" style={s.heading}>Coming up</Text><Link href="/bills" asChild><Pressable accessibilityRole="button"><Text style={s.link}>See all</Text></Pressable></Link></View><DashboardCard>
  {query.isPending?<Text style={s.small}>Loading bills…</Text>:query.isError?<><Text style={s.error}>{billError(query.error)}</Text><Button appearance="auth" label="Retry bills" variant="secondary" onPress={()=>void query.refetch()}/></>:!rows.length?<View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={s.emptyIcon}><DashboardIcon name="calendar"/></View><View style={{flex:1}}><Text style={s.bold}>No upcoming bills</Text><Text style={s.small}>Recurring household bills will appear here when the owner adds them.</Text></View></View>:rows.map((bill,index)=><Link key={bill.id} href="/bills" asChild><Pressable accessibilityRole="button" style={StyleSheet.flatten([s.activityRow,index===rows.length-1&&{borderBottomWidth:0}])}><CategoryIcon category={bill.category}/><View style={{flex:1}}><Text style={s.bold}>{bill.title}</Text><Text style={s.small}>{dueLabel(bill.next_due_date,localToday())} · {bill.amount_minor===null?'Variable amount':bill.frequency==='monthly'?'Monthly':'Weekly'}</Text></View><Text style={s.bold}>{bill.amount_minor===null?'Amount to enter':money(bill.amount_minor,currency)}</Text></Pressable></Link>)}
 </DashboardCard></>;
}
