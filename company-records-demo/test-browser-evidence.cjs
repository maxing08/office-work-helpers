'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('./browser-evidence.js');
const corpus = path.join(__dirname,'sample-records');
const records = Object.fromEntries(fs.readdirSync(corpus).filter(n=>n.endsWith('.md')).map(n=>[n,fs.readFileSync(path.join(corpus,n),'utf8')]));
test('Browser port matches actual Python evidence for certificate expiry', async()=>{
  const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'example-output.json'),'utf8'));
  const actual=await api.search(records,expected.question);
  assert.deepEqual(actual.evidence,expected.evidence);
  assert.equal(actual.generated_answer,false);
  assert.equal(await api.verify(records,actual.evidence[0]),true);
});
test('Unknown ISO identifier cannot borrow another certificate',async()=>{
  const actual=await api.search(records,'When does ISO 27001 expire?');
  assert.equal(actual.status,'not_found'); assert.deepEqual(actual.evidence,[]);
});
test('Project completion retrieves actual quoted completion date',async()=>{
  const actual=await api.search(records,'When did the Harbor project complete?');
  assert.equal(actual.evidence.length,1); assert.match(actual.evidence[0].quote,/2025-10-15/);
});
test('Changed source invalidates old quote even if same lines remain',async()=>{
  const actual=await api.search(records,'When does ISO 9001 expire?');
  const modified={...records,'certifications.md':records['certifications.md'].replace('2027-06-30','2028-06-30')};
  assert.equal(await api.verify(modified,actual.evidence[0]),false);
  assert.match((await api.search(modified,'When does ISO 9001 expire?')).evidence[0].quote,/2028-06-30/);
});
test('Deleted source cannot validate old citation',async()=>{
  const actual=await api.search(records,'When does ISO 9001 expire?');
  const modified={...records}; delete modified['certifications.md'];
  assert.equal(await api.verify(modified,actual.evidence[0]),false);
});
test('Forged quotation and invalid line numbers fail',async()=>{
  const citation=(await api.search(records,'When does ISO 9001 expire?')).evidence[0];
  assert.equal(await api.verify(records,{...citation,quote:citation.quote+' invented'}),false);
  for(const start of [0,-1,true,1.5]) assert.equal(await api.verify(records,{...citation,line_start:start}),false);
});
test('Absolute and traversal source names fail',async()=>{
  const citation=(await api.search(records,'When does ISO 9001 expire?')).evidence[0];
  for(const file of ['../secret.md','/secret.md','C:/secret.md','a/../../secret.md']) assert.equal(await api.verify({...records,[file]:records['certifications.md']},{...citation,file}),false);
});
test('Blank and unrelated questions return no evidence',async()=>{
  for(const question of ['', 'Where are the lunar banana farms?']) assert.equal((await api.search(records,question)).status,'not_found');
});
