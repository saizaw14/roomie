import test from 'node:test';
import assert from 'node:assert/strict';
import {palette as p} from '../src/theme/palette.ts';
function luminance(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+0.05)/(values[1]+0.05);}
test('shared theme text, statuses and action colors meet normal-text contrast targets',()=>{
 for(const bg of [p.surface,p.background,p.primarySoft,p.selected])for(const fg of [p.ink,p.muted,p.primary])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}: ${contrast(fg,bg)}`);
 for(const [fg,bg] of [[p.surface,p.primary],[p.placeholder,p.surface],[p.subtleText,p.background],[p.success,p.successSoft],[p.warning,p.warningSoft],[p.error,p.errorSoft],[p.info,p.infoSoft],[p.lavender,p.lavenderSoft]])assert.ok(contrast(fg,bg)>=4.5,`${fg} on ${bg}`);
 assert.ok(contrast(p.inputBorder,p.surface)>=3,'Input boundaries remain visible against white fields');
});
