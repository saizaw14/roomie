import { File,Paths } from 'expo-file-system';
import { Asset,requestPermissionsAsync } from 'expo-media-library';
import { qrImageType } from '@/features/profile/qr-image';
export async function savePaymentQr(url:string){
 const response=await fetch(url);if(!response.ok)throw new Error('The QR download expired. Refresh and try again.');
 const bytes=new Uint8Array(await response.arrayBuffer());const type=qrImageType(bytes);const filename=`roomie-payment-qr.${type==='image/png'?'png':'jpg'}`;

 const permission=await requestPermissionsAsync(true,['photo']);if(!permission.granted)throw new Error('Allow saving photos to save the QR to your gallery.');
 const file=new File(Paths.cache,`${Date.now()}-${filename}`);try{file.create({overwrite:true});await file.write(bytes);await Asset.create(file.uri);}finally{if(file.exists)file.delete();}
}
