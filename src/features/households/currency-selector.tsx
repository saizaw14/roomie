import { useRef,useState } from 'react';
import { Image } from 'expo-image';
import {ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { Pressable } from '@/components/ui/pressable';
import { currencies,currencyInfo } from '@/utils/currencies';
import { authColors as c,authFonts as f } from '@/theme/auth-tokens';

export function CurrencySelector({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}) {
 const [open,setOpen]=useState(false);
 const [search,setSearch]=useState('');
 const list=useRef<ScrollView>(null);
 const input=useRef<TextInput>(null);
 const selected=value?currencyInfo(value):null;
 const query=search.trim().toLowerCase();
 const rank=(currency:typeof currencies[number])=>currency.code.toLowerCase()===query?0:currency.code.toLowerCase().startsWith(query)?1:currency.name.toLowerCase().startsWith(query)?2:3;
 const matches=currencies.filter(currency=>`${currency.code} ${currency.name}`.toLowerCase().includes(query)).sort((a,b)=>query?rank(a)-rank(b):0);
 function choose(code:string){onChange(code);setOpen(false);setSearch('');input.current?.blur();}
 function changeSearch(text:string){setSearch(text);setOpen(true);if(value)onChange('');list.current?.scrollTo({y:0,animated:false});}
 return <View style={styles.container}>
  <Text style={styles.label}>Household currency</Text>
  <View style={[styles.field,disabled&&styles.disabled]}>
   <TextInput ref={input} accessibilityLabel="Household currency" accessibilityHint="Type a currency code or name, then choose a result" accessibilityState={{expanded:open,disabled}}
    placeholder="Choose currency" placeholderTextColor={c.placeholder} value={open?search:selected?`${selected.code} · ${selected.name}`:''}
    onFocus={()=>setOpen(true)} onChangeText={changeSearch} autoCapitalize="none" autoCorrect={false} editable={!disabled} returnKeyType="search" style={styles.input}
    onSubmitEditing={()=>{const exact=currencies.find(currency=>currency.code.toLowerCase()===query);const match=exact??(matches.length===1?matches[0]:undefined);if(match)choose(match.code);}}/>
   <Pressable accessibilityRole="button" accessibilityLabel={open?'Close currency choices':'Open currency choices'} accessibilityState={{expanded:open,disabled}} disabled={disabled}
    onPress={()=>{if(open){setOpen(false);setSearch('');input.current?.blur();}else{setOpen(true);input.current?.focus();}}} style={styles.toggle}>
    <Image source={require('../../../assets/images/dashboard/chevron.svg')} style={{width:20,height:20,transform:[{rotate:open?'270deg':'90deg'}]}}/>
   </Pressable>
  </View>
  {open?<View style={styles.menu}>
   <ScrollView ref={list} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.list}
   onContentSizeChange={()=>list.current?.scrollTo({y:query?0:Math.max(0,matches.findIndex(currency=>currency.code===value)-1)*56,animated:false})}>
   {matches.map(currency=><Pressable key={currency.code} accessibilityRole="button"
    accessibilityLabel={`${currency.code}, ${currency.name}`} accessibilityState={{selected:currency.code===value,disabled}}
    disabled={disabled} onPress={()=>choose(currency.code)} style={[styles.option,currency.code===value&&styles.selected]}>
    <Text numberOfLines={2} style={[styles.value,currency.code===value&&styles.selectedText]}>{currency.code} · {currency.name}</Text>
    {currency.code===value?<Image source={require('../../../assets/images/expenses/check.svg')} style={{width:20,height:20}}/>:null}
   </Pressable>)}
   {!matches.length?<Text accessibilityLiveRegion="polite" style={styles.empty}>No matching currencies. Try a different name or code.</Text>:null}
  </ScrollView></View>:null}
  <Text style={styles.hint}>Applies to everyone in this household and all its expenses. Currency is fixed after creation.</Text>
 </View>;
}
const styles=StyleSheet.create({
 input:{outlineWidth:0,borderWidth:0,backgroundColor:'transparent',flex:1,minWidth:0,minHeight:50,paddingVertical:10,fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.ink},toggle:{outlineWidth:0,minWidth:32,minHeight:50,alignItems:'center',justifyContent:'center'},empty:{fontFamily:f.regular,color:c.muted,fontSize:12,lineHeight:18,padding:14},
 container:{gap:7},label:{fontFamily:f.semibold,fontSize:11,color:c.muted,marginLeft:2},
 field:{minHeight:52,borderWidth:1,borderColor:c.inputBorder,borderRadius:12,backgroundColor:'white',paddingHorizontal:13,paddingVertical:0,flexDirection:'row',alignItems:'center',gap:10},
 disabled:{opacity:0.5},value:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.ink,flex:1},
 menu:{borderWidth:1,borderColor:c.line,borderRadius:12,overflow:'hidden',backgroundColor:'white',boxShadow:'0 4px 12px rgba(18,35,52,0.06)'},
 list:{maxHeight:224},option:{height:56,paddingHorizontal:13,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderColor:c.line},
 selected:{backgroundColor:c.soft},selectedText:{color:c.primary,fontFamily:f.semibold},hint:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted},
});
