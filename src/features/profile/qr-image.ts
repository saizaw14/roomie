export const QR_MAX_BYTES=5*1024*1024;
export function qrImageType(bytes:Uint8Array):'image/png'|'image/jpeg'{
 if(!bytes.length||bytes.length>QR_MAX_BYTES)throw new Error('Choose an image no larger than 5 MB.');
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 throw new Error('Choose a PNG or JPEG image.');
}
