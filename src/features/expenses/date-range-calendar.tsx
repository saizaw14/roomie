import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DashboardIcon } from '@/features/dashboard/components';
import { authColors as c, authFonts as f } from '@/theme/auth-tokens';
import { localToday, validDate } from './domain';

type Endpoint = 'start' | 'end';
const earliest = '2000-01';
const latest = '2100-12';
function dateLabel(value: string) {
 return validDate(value) ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric'}) : 'Choose date';
}
export function DateRangeCalendar({start,end,onChange}:{start:string;end:string;onChange:(range:{start:string;end:string})=>void}) {
 const [active,setActive]=useState<Endpoint>(start?'end':'start');
 const [month,setMonth]=useState(()=>(validDate(start)?start:localToday()).slice(0,7));
 const first=new Date(`${month}-01T12:00:00`);
 const year=first.getFullYear();const monthIndex=first.getMonth();
 const offset=first.getDay();const days=new Date(year,monthIndex+1,0,12).getDate();
 const count=Math.ceil((offset+days)/7)*7;
 function open(endpoint:Endpoint){setActive(endpoint);const value=endpoint==='start'?start:end||start;if(validDate(value))setMonth(value.slice(0,7));}
 function move(delta:number){const next=new Date(year,monthIndex+delta,1,12);const value=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;if(value>=earliest&&value<=latest)setMonth(value);}
 function pick(value:string){
  if(active==='start'){onChange({start:value,end:end&&end<value?'':end});setActive('end');}
  else {onChange({start,end:value});}
 }
 return <View style={styles.container}>
  <View style={styles.fields}>{(['start','end'] as const).map(endpoint=><Pressable key={endpoint} accessibilityRole="button" accessibilityLabel={`${endpoint==='start'?'From':'To'} date, ${dateLabel(endpoint==='start'?start:end)}`} accessibilityState={{selected:active===endpoint}} onPress={()=>open(endpoint)} style={[styles.field,active===endpoint&&styles.activeField]}><Text style={styles.label}>{endpoint==='start'?'From':'To'}</Text><View style={styles.fieldValue}><Text style={styles.value}>{dateLabel(endpoint==='start'?start:end)}</Text><DashboardIcon name="calendar"/></View></Pressable>)}</View>
  <View style={styles.calendar}>
   <View style={styles.monthRow}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{disabled:month===earliest}} disabled={month===earliest} style={[styles.arrow,month===earliest&&styles.disabled]} onPress={()=>move(-1)}><View style={{transform:[{rotate:'180deg'}]}}><DashboardIcon name="chevron"/></View></Pressable><Text accessibilityLiveRegion="polite" style={styles.month}>{first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{disabled:month===latest}} disabled={month===latest} style={[styles.arrow,month===latest&&styles.disabled]} onPress={()=>move(1)}><DashboardIcon name="chevron"/></Pressable></View>
   <Text style={styles.hint}>Choose your {active==='start'?'start':'end'} date</Text>
   <View style={styles.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
   <View style={styles.grid}>{Array.from({length:count},(_,index)=>{
    const day=index-offset+1;if(day<1||day>days)return <View key={index} style={styles.cell}/>;
    const value=`${month}-${String(day).padStart(2,'0')}`;const selected=value===start||value===end;const inRange=!!start&&!!end&&value>start&&value<end;const disabled=active==='end'&&!!start&&value<start;
    return <Pressable key={index} accessibilityRole="button" accessibilityLabel={dateLabel(value)} accessibilityState={{selected,disabled}} disabled={disabled} onPress={()=>pick(value)} style={[styles.cell,inRange&&styles.inRange]}><View style={[styles.day,selected&&styles.selected]}><Text style={[styles.dayText,selected&&styles.selectedText,disabled&&styles.disabled]}>{day}</Text></View></Pressable>;
   })}</View>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 container:{gap:12},fields:{flexDirection:'row',flexWrap:'wrap',gap:10},field:{flex:1,minWidth:130,padding:12,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:'white',gap:8},activeField:{borderColor:c.primary},label:{fontFamily:f.semibold,fontSize:11,color:c.muted},fieldValue:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},value:{fontFamily:f.medium,fontSize:12,color:c.ink,flexShrink:1},calendar:{padding:10,borderWidth:1,borderColor:c.line,borderRadius:15,backgroundColor:'white'},monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:44,height:44,alignItems:'center',justifyContent:'center'},month:{fontFamily:f.bold,fontSize:14,color:c.ink},hint:{fontFamily:f.regular,fontSize:11,color:c.muted,textAlign:'center',marginBottom:8},grid:{flexDirection:'row',flexWrap:'wrap'},cell:{width:'14.285714%',minHeight:42,alignItems:'center',justifyContent:'center'},weekday:{fontFamily:f.medium,fontSize:10,color:c.muted},day:{minWidth:32,minHeight:34,padding:4,borderRadius:10,alignItems:'center',justifyContent:'center'},dayText:{fontFamily:f.medium,fontSize:12,color:c.ink},selected:{backgroundColor:c.primary},selectedText:{color:'white'},inRange:{backgroundColor:c.soft},disabled:{opacity:0.3},
});
