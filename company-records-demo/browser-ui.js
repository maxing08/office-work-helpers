/* All source text is rendered with textContent, never evaluated as markup. */
(function () {
  'use strict';
  const original = window.CompanyEvidenceSamples;
  let records = {...original};
  let current = null;
  let searchRequest = 0;
  const $ = id => document.getElementById(id);
  const el = (tag, text, cls) => {const n=document.createElement(tag); n.textContent=text; if(cls)n.className=cls; return n;};
  function renderSources() {
    $('sources').replaceChildren();
    for (const [name,text] of Object.entries(records)) {
      const block=el('div','','file'), details=document.createElement('details');
      block.append(el('code',name)); details.append(el('summary','Read sample / 查看原文'),el('pre',text,'source')); block.append(details); $('sources').append(block);
    }
  }
  function clearVerification() {$('verification').textContent=''; $('verification').className='proof';}
  async function run(question) {
    const request = ++searchRequest;
    current = null;
    $('results').replaceChildren();
    $('question').value=question; $('search').disabled=true; $('verify').disabled=true; clearVerification();
    $('result-status').className='status'; $('result-status').textContent='Checking sample documents… / 正在检索模拟资料…';
    try {
      const result = await window.CompanyEvidence.search(records, question);
      if (request !== searchRequest) return;
      current = result;
      const found=current.evidence.length>0;
      $('result-status').className='status '+(found?'ok':'warn');
      $('result-status').textContent=found ? `Evidence found: ${current.evidence.length} passage(s). Review the quote. / 找到原文，请核对是否回答了问题。` : 'Not found — no matching evidence. No answer generated. / 未找到匹配证据，不生成答案。';
      for (const item of current.evidence) {
        const card=el('article','','evidence');
        card.append(el('h3',`${item.file} · lines ${item.line_start}–${item.line_end}`),el('pre',item.quote),el('div','SHA-256: '+item.sha256,'hash'));
        $('results').append(card);
      }
      $('verify').disabled=!found;
    } catch (error) {
      if (request !== searchRequest) return;
      current=null; $('results').replaceChildren(); $('result-status').className='status warn'; $('result-status').textContent='Could not check sources. Open this demo in a modern browser over HTTPS or localhost. / 检索失败，请使用支持 Web Crypto 的现代浏览器。';
    } finally {
      if (request === searchRequest) $('search').disabled = false;
    }
  }
  $('query-form').addEventListener('submit',e=>{e.preventDefault(); run($('question').value);});
  for (const button of document.querySelectorAll('[data-question]')) button.addEventListener('click',()=>run(button.dataset.question));
  $('verify').addEventListener('click',async()=>{
    const result = current;
    const sourceRecords = records;
    if (!result?.evidence.length) return;
    const verified = await Promise.all(result.evidence.map(citation => window.CompanyEvidence.verify(sourceRecords, citation)));
    if (result !== current || sourceRecords !== records) return;
    const valid = verified.every(Boolean);
    $('verification').className='proof '+(valid?'pass':'fail');
    $('verification').textContent=valid ? 'Verified: source version and exact lines match. / 校验通过：来源版本与引用原文一致。' : 'Verification failed: a source or quoted line changed. Run a new search. / 校验失败：来源或引文已变化，请重新查询。';
  });
  $('change-source').addEventListener('click',()=>{
    searchRequest++;
    records = {...records, 'certifications.md': original['certifications.md'].replace('2027-06-30', '2028-06-30')};
    renderSources();
    clearVerification();
    $('search').disabled = false;
    $('change-source').disabled=true;
    $('result-status').className='status warn'; $('result-status').textContent='Sample source changed; displayed citations may be stale. Verify or run a new search. / 模拟来源已修改，请校验旧引用或重新查询。';
  });
  $('reset').addEventListener('click',()=>{
    searchRequest++;
    $('question').value = $('question').defaultValue;
    $('search').disabled = false;
    records={...original}; current=null; renderSources(); $('change-source').disabled=false; $('verify').disabled=true; clearVerification();
    $('results').replaceChildren(el('p','Results appear here. / 结果将在此显示。','empty')); $('result-status').className='status'; $('result-status').textContent='Reset complete. / 已恢复初始模拟资料。';
  });
  renderSources();
})();
