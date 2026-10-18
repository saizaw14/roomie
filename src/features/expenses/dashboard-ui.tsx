import { Link } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangeCalendar } from './date-range-calendar';
import { HouseholdSheet } from '@/features/households/household-sheet';
import { DashboardIcon, styles as d } from '@/features/dashboard/components';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';
import { Choice, Icon, s } from './ui';
import { validDate } from './domain';
export type ExpenseFilters={period:string;status:string;start:string;end:string};
export function ExpenseFilterSheet({value,onClose,onApply}:{value:ExpenseFilters;onClose:()=>void;onApply:(value:ExpenseFilters)=>void}) {
 const [draft,setDraft]=useState(value);
 const valid=draft.period!=='Custom dates'||(validDate(draft.start)&&validDate(draft.end)&&draft.start<=draft.end);
 return <Modal transparent animationType="fade" onRequestClose={onClose}><HouseholdSheet title="Filter expenses" subtitle="Choose a period and status" onClose={onClose}>
  <Text style={s.bold}>Period</Text><View style={x.options}>{['This month','Last month','Last 3 months','All time','Custom dates'].map(period=><Pressable key={period} accessibilityRole="radio" accessibilityState={{checked:draft.period===period}} style={[x.option,draft.period===period&&x.selected]} onPress={()=>setDraft({...draft,period})}><Text style={s.body}>{period}</Text>{draft.period===period?<Icon name="check"/>:null}</Pressable>)}</View>
  {draft.period==='Custom dates'?<><DateRangeCalendar start={draft.start} end={draft.end} onChange={range=>setDraft({...draft,...range})}/>{!valid?<Text accessibilityRole="alert" style={s.error}>Choose a start and end date.</Text>:null}</>:null}
  <Text style={s.bold}>Status</Text><View style={s.wrap}>{['All','Posted','Void'].map(status=><Choice key={status} label={status} selected={draft.status===status} onPress={()=>setDraft({...draft,status})}/>)}</View><Button appearance="auth" label="Apply filters" disabled={!valid} onPress={()=>onApply(draft)}/>
 </HouseholdSheet></Modal>;
}
export function ExpenseNavigation({onBills}:{onBills:()=>void}) {return <View style={d.nav}><Link href="/home" asChild><Pressable accessibilityRole="button" style={d.navItem}><DashboardIcon name="home" color="#8a929d"/><Text style={d.navLabel}>Home</Text></Pressable></Link><View accessibilityRole="tab" accessibilityState={{selected:true}} style={d.navItem}><View style={d.indicator}/><DashboardIcon name="receipt"/><Text style={[d.navLabel,d.activeNav]}>Expenses</Text></View><Pressable accessibilityRole="button" style={d.navItem} onPress={onBills}><DashboardIcon name="calendar" color="#8a929d"/><Text style={d.navLabel}>Bills</Text></Pressable><Link href="/profile" asChild><Pressable accessibilityRole="button" style={d.navItem}><DashboardIcon name="user" color="#8a929d"/><Text style={d.navLabel}>Me</Text></Pressable></Link></View>;}
export const x=StyleSheet.create({
 content:{paddingHorizontal:20,paddingTop:22,paddingBottom:100,gap:16},summary:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:3,marginBottom:6},amount:{fontFamily:f.bold,fontSize:25,lineHeight:30,letterSpacing:-0.6,color:c.ink,marginTop:4},filter:{minHeight:42,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12},filterText:{fontFamily:f.semibold,fontSize:12,color:c.ink},chips:{gap:8,paddingHorizontal:20,paddingBottom:5},date:{fontFamily:f.bold,fontSize:17,color:c.ink,letterSpacing:-0.3,marginTop:4},group:{backgroundColor:'white',borderWidth:1,borderColor:c.line,borderRadius:17,overflow:'hidden'},row:{minHeight:92,padding:13,flexDirection:'row',alignItems:'center',gap:12},divider:{borderTopWidth:1,borderColor:c.line},icon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},title:{fontFamily:f.bold,fontSize:14,color:c.ink},meta:{fontFamily:f.regular,fontSize:11,lineHeight:16,color:c.muted,marginTop:4},share:{fontFamily:f.regular,fontSize:10,lineHeight:15,color:'#929aa6',marginTop:5},value:{fontFamily:f.bold,fontSize:12,color:c.ink,textAlign:'right'},options:{borderWidth:1,borderColor:c.line,borderRadius:14,overflow:'hidden'},option:{minHeight:48,padding:13,flexDirection:'row',justifyContent:'space-between',backgroundColor:'white',borderBottomWidth:1,borderColor:c.line},selected:{backgroundColor:c.soft},
});
