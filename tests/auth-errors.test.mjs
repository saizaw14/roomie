import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../src/features/auth/error-message.ts';
test('account errors distinguish actionable failures without exposing raw messages',()=>{
 assert.match(authErrorMessage({code:'captcha_failed'}),/CAPTCHA/);
 assert.match(authErrorMessage({status:429}),/Too many/);
 assert.match(authErrorMessage({name:'SecurityError'}),/site storage/);
 assert.match(authErrorMessage({message:'Invalid API key',status:401}),/configuration/);
 assert.match(authErrorMessage({code:'request_timeout'}),/timed out/);
 const message=authErrorMessage({code:'unexpected_error',status:500,message:'Sensitive request content must never be displayed'});
 assert.match(message,/unexpected_error \/ HTTP 500/);
 assert.doesNotMatch(message,/Sensitive request/);
 assert.doesNotMatch(authErrorMessage({code:'email@example.com secret',message:'secret'}),/email@example.com|secret/);
});
