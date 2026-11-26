(function (root) {
  'use strict';
  const stop = new Set('a an and are as at be can company do does for from have how i in is it me of on our please records tell the this to us we what when which with'.split(' '));
  const aliases = {expires:'expiry',expire:'expiry',expiration:'expiry',expired:'expiry',completed:'completion',complete:'completion',finished:'completion',certifications:'certificate',certification:'certificate',certificates:'certificate'};
  function tokens(text) {
    const words = String(text).toLowerCase().replace(/\biso\s+(\d+)/g, 'iso$1').match(/[a-z0-9]+/g) || [];
    return new Set(words.filter(w => !stop.has(w)).map(w => aliases[w] || w));
  }
  async function hash(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  function lines(text) {
    const out = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    if (out.at(-1) === '') out.pop();
    return out;
  }
  function safeName(name) {
    return typeof name === 'string' && name.length > 0 && !name.startsWith('/') && !name.includes('\\') && !/^[a-z]:/i.test(name) && name.split('/').every(p => p && p !== '.' && p !== '..');
  }
  async function index(records) {
    const passages = [];
    for (const file of Object.keys(records).sort()) {
      if (!safeName(file)) throw new Error('Invalid source name');
      const raw = records[file];
      const all = lines(raw);
      const starts = all.flatMap((line, i) => line.startsWith('## ') ? [i] : []);
      const sha256 = await hash(raw);
      for (let i=0; i<starts.length; i++) {
        const start = starts[i];
        let end = i+1 < starts.length ? starts[i+1] : all.length;
        while (end > start && !all[end-1].trim()) end--;
        passages.push({file,line_start:start+1,line_end:end,sha256,quote:all.slice(start,end).join('\n')});
      }
    }
    return passages;
  }
  async function search(records, question) {
    const query = tokens(question);
    const ids = [...query].filter(w => /\d/.test(w));
    const ranked = [];
    for (const citation of await index(records)) {
      const words = tokens(citation.quote);
      if (!query.size || !ids.every(w => words.has(w))) continue;
      const count = [...query].filter(w => words.has(w)).length;
      const coverage = count / query.size;
      if (count && coverage >= 0.6) ranked.push({citation,count,coverage});
    }
    ranked.sort((a,b) => b.coverage-a.coverage || b.count-a.count || a.citation.file.localeCompare(b.citation.file) || a.citation.line_start-b.citation.line_start);
    const evidence = ranked.slice(0,3).map(x => x.citation);
    return {mode:'extractive_evidence_demo',simulated_data:true,question,status:evidence.length?'evidence_found':'not_found',generated_answer:false,evidence};
  }
  async function verify(records, citation) {
    try {
      if (!citation || !safeName(citation.file) || !Object.hasOwn(records,citation.file)) return false;
      const start = citation.line_start, end = citation.line_end;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start<1 || start>end) return false;
      const raw = records[citation.file], all = lines(raw);
      return end<=all.length && await hash(raw)===citation.sha256 && all.slice(start-1,end).join('\n')===citation.quote;
    } catch { return false; }
  }
  const api = {tokens,hash,index,search,verify};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CompanyEvidence = api;
})(typeof window !== 'undefined' ? window : globalThis);
