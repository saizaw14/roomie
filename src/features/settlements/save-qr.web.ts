import { qrImageType } from '@/features/profile/qr-image';
export async function savePaymentQr(url:string){
 const response=await fetch(url);if(!response.ok)throw new Error('The QR download expired. Refresh and try again.');
 const bytes=new Uint8Array(await response.arrayBuffer());const type=qrImageType(bytes);const filename=`roomie-payment-qr.${type==='image/png'?'png':'jpg'}`;
 const object=URL.createObjectURL(new Blob([bytes.buffer],{type}));const link=document.createElement('a');link.href=object;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(object),10000);return;
}
