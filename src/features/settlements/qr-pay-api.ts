import * as ImagePicker from 'expo-image-picker';
import { toByteArray } from 'base64-js';
import { requireSupabase } from '@/lib/supabase';
import { qrImageType,QR_MAX_BYTES } from '@/features/profile/qr-image';
export type PaymentImage={uri:string;bytes:Uint8Array;type:string};
export async function pickReceipt():Promise<PaymentImage|null>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1,base64:true,exif:false});if(result.canceled)return null;const asset=result.assets[0];if(asset.fileSize&&asset.fileSize>QR_MAX_BYTES)throw new Error('Choose a receipt no larger than 5 MB.');const bytes=asset.file?new Uint8Array(await asset.file.arrayBuffer()):asset.base64?toByteArray(asset.base64):null;if(!bytes)throw new Error('Could not read this receipt. Choose a PNG or JPEG.');return {uri:asset.uri,bytes,type:qrImageType(bytes)};}
export async function recipientQr(user:string){const {data,error}=await requireSupabase().storage.from('payment-qr').createSignedUrl(`${user}/payment-qr`,300);if(error)throw error;return data.signedUrl;}
export async function receiptUrl(path:string){const {data,error}=await requireSupabase().storage.from('payment-receipts').createSignedUrl(path,300);if(error)throw error;return data.signedUrl;}
export async function sendQrReceipt(args:{house:string;recipient:string;amount:number;date:string;request:string;path:string;image:PaymentImage}){
 const storage=requireSupabase().storage.from('payment-receipts');
 const folder=args.path.split('/')[0],name=args.path.split('/')[1];
 const existing=await storage.list(folder,{search:name,limit:10});if(existing.error)throw existing.error;
 // A retry reuses the same immutable image path and repayment request.
 if(!existing.data.some(file=>file.name===name)){const upload=await storage.upload(args.path,new Uint8Array(args.image.bytes).buffer,{contentType:args.image.type,upsert:false,cacheControl:'0'});if(upload.error)throw upload.error;}
 const {data,error}=await requireSupabase().rpc('roomie_record_qr_settlement',{p_household:args.house,p_recipient:args.recipient,p_amount:args.amount,p_date:args.date,p_request:args.request,p_receipt:args.path});if(error)throw error;return data;
}
