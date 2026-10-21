import { Image } from 'expo-image';
import { Text,View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { styles } from '@/features/dashboard/components';
import { receiptUrl } from './qr-pay-api';
export function ReceiptPreview({path}:{path:string}){const {session}=useAuth();const query=useQuery({queryKey:['receipt',session?.user.id,path],queryFn:()=>receiptUrl(path),staleTime:0,refetchInterval:240000});return <View style={{gap:10}}><Text style={styles.bold}>Payment receipt</Text>{query.isPending?<Text style={styles.small}>Loading receipt…</Text>:query.isError?<><Text style={styles.small}>The receipt is unavailable or you do not have access.</Text><Button appearance="auth" variant="secondary" label="Retry receipt" onPress={()=>void query.refetch()}/></>:<Image source={{uri:query.data}} contentFit="contain" cachePolicy="none" style={{width:'100%',height:320,backgroundColor:'white',borderRadius:15}} accessibilityLabel="Payment receipt submitted by the sender"/>}</View>;}
