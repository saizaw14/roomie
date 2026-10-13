import test from 'node:test';
import assert from 'node:assert/strict';
import { expenseSummary } from '../src/features/dashboard/summary.ts';
const fixture={expenses:[{id:'one',status:'posted',amount_minor:40000},{id:'void',status:'void',amount_minor:10000}],payers:[{expense_id:'one',member_id:'alex',paid_minor:40000},{expense_id:'void',member_id:'ben',paid_minor:10000}],splits:['alex','ben','chris','dan'].map(member_id=>({expense_id:'one',member_id,owed_minor:10000})).concat([{expense_id:'void',member_id:'alex',owed_minor:10000}])};
test('dashboard credit, debt, and household spending exclude voided records',()=>{
 assert.deepEqual(expenseSummary(fixture,'alex'),{net:30000,paid:40000,owed:10000,spending:40000,count:1});
 assert.equal(expenseSummary(fixture,'ben').net,-10000);
 assert.equal(['alex','ben','chris','dan'].reduce((sum,id)=>sum+expenseSummary(fixture,id).net,0),0);
});
test('empty households have a verified expense-only zero balance',()=>{
 assert.deepEqual(expenseSummary({expenses:[],payers:[],splits:[]},'alex'),{net:0,paid:0,owed:0,spending:0,count:0});
});
test('edits and member switching recalculate without changing stored rows',()=>{
 const data=structuredClone(fixture);data.expenses[0].amount_minor=80000;data.payers[0].paid_minor=80000;
 for(const row of data.splits)if(row.expense_id==='one')row.owed_minor=20000;
 assert.equal(expenseSummary(data,'alex').net,60000);assert.equal(expenseSummary(data,'ben').net,-20000);
 assert.equal(fixture.expenses[0].amount_minor,40000);
});
test('invalid financial amounts fail instead of becoming a zero balance',()=>{
 for(const value of [NaN,Infinity,-1,1.01,1000000001]) assert.throws(()=>expenseSummary({...fixture,payers:[{expense_id:'one',member_id:'alex',paid_minor:value}]},'alex'));
});
