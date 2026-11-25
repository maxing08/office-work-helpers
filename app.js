(function () {
  'use strict';
  const H = OfficeHelpers;
  const mode = document.body.dataset.tool;
  const config = {
    vouchers: { title: '月底付款单，还在一张张手填？', subtitle: '把一份明细变成整批付款单。先看预览、核对张数和金额，再打印。当前使用通用演示版式，可按现有单据样式定制。', action: '生成付款单预览', headers: '单据编号、日期、收款对象、事由、金额；经办人可选。', sample: '单据编号,日期,收款对象,事由,金额,经办人\n001,2026-11-20,示例供应商甲,资料制作费,100.10,示例经办人\n002,2026-11-21,示例供应商乙,服务费,200.20,示例经办人\n003,2026-11-22,示例物流公司,运输费,99.70,示例经办人' },
    summary: { title: '加了新明细，汇总表还得重做？', subtitle: '选好门店、产品、规格等汇总条件。新增明细后，结果自动重新计算，按同一口径导出。', action: '计算并刷新汇总', headers: '首行为列名；任意分组列＋一个金额列。金额需统一币种，最多两位小数。', sample: '日期,门店,品名,规格,销量,金额\n2026-11-20,星港店,T恤,黑色M,2,158.00\n2026-11-21,星港店,T恤,黑色M,3,237.00\n2026-11-21,星港店,T恤,黑色L,1,79.00\n2026-11-21,江南店,T恤,黑色M,1,79.00' },
    stock: { title: '同名不同规格，库存总混在一起？', subtitle: '按名称、规格、单位分别汇总期初、入库和出库。结余为负的项目单独标出，方便逐项复核。', action: '核对进出库存', headers: '流水号、日期、名称、规格、单位、类型、数量。类型填期初/入库/出库；数量为非负整数。', sample: '流水号,日期,名称,规格,单位,类型,数量\n01,2026-11-01,T恤,黑色M,件,期初,10\n02,2026-11-02,T恤,黑色M,件,入库,5\n03,2026-11-03,T恤,黑色M,件,出库,3\n04,2026-11-01,T恤,黑色L,件,期初,8\n05,2026-11-03,T恤,黑色L,件,出库,2\n06,2026-11-02,笔记本,A5,本,入库,20\n07,2026-11-03,笔记本,A5,本,出库,4' }
  }[mode];
  if (!config) return;
  const $ = id => document.getElementById(id);
  let result = null, exportData = null, simulated = false, signature = '', live = false, timer;
  $('tool-title').textContent = config.title; $('tool-subtitle').textContent = config.subtitle;
  $('run').textContent = config.action; $('columns-help').textContent = config.headers;
  document.querySelector('[data-nav="' + mode + '"]').classList.add('current');
  $('summary-options').hidden = mode !== 'summary'; $('voucher-options').hidden = mode !== 'vouchers';
  function element(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
  function status(text, type) { $('status').textContent = text; $('status').className = 'status ' + (type || ''); }
  function resetReview() { $('review').checked = false; $('print').disabled = true; }
  function invalidate(message) { result = null; exportData = null; $('results').replaceChildren(); $('export').disabled = true; resetReview(); status(message, 'error'); }
  function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const a = element('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function stats(values) {
    const div = element('div', undefined, 'stats no-print');
    values.forEach(([label, value]) => { const item = element('div', undefined, 'stat'); item.append(element('span', label), element('strong', String(value))); div.append(item); });
    return div;
  }
  function table(headers, rows, flags) {
    const wrapper = element('div', undefined, 'table-scroll'); const t = element('table'); const head = element('thead'); const hr = element('tr');
    headers.forEach(h => hr.append(element('th', h))); head.append(hr); const body = element('tbody');
    rows.forEach((row, i) => { const tr = element('tr', undefined, flags && flags[i] ? 'flag' : ''); row.forEach(value => tr.append(element('td', String(value)))); body.append(tr); });
    t.append(head, body); wrapper.append(t); return wrapper;
  }
  function options(t) {
    const next = JSON.stringify(t.headers); if (next === signature) return; signature = next;
    $('groups').replaceChildren(); $('amount-column').replaceChildren();
    const defaults = t.headers.filter(h => ['门店', '品名', '名称', '规格'].includes(h));
    const amount = t.headers.find(h => h.includes('金额')) || t.headers[t.headers.length - 1];
    t.headers.forEach((h, i) => {
      const lab = element('label'); const c = element('input'); c.type = 'checkbox'; c.value = h;
      c.checked = h !== amount && (defaults.length ? defaults.includes(h) : i === 0); lab.append(c, document.createTextNode(h)); $('groups').append(lab);
      const option = element('option', h); option.value = h; option.selected = h === amount; $('amount-column').append(option);
    });
  }
  function drawVouchers(r) {
    const company = $('company').value.trim();
    $('results').append(stats([['付款单张数', r.count], ['金额合计', H.money(r.total)], ['数据类型', simulated ? '模拟样例' : '你的输入']]));
    const note = element('p', '打印前请核对收款对象、事由、金额及单据样式。', 'print-note'); $('results').append(note);
    r.items.forEach(item => {
      const card = element('article', undefined, 'voucher'); card.append(element('h3', '付款单'));
      const meta = element('div', undefined, 'v-meta'); meta.append(element('span', '编号：' + item.id), element('span', item.date)); card.append(meta);
      if (company) { const row = element('div', undefined, 'v-row'); row.append(element('span', '单位'), element('span', company)); card.append(row); }
      [['收款对象', item.payee], ['付款事由', item.purpose], ['金额', H.money(item.amount)]].forEach(([label, value]) => { const row = element('div', undefined, 'v-row'); row.append(element('span', label), element('span', value)); card.append(row); });
      const foot = element('div', undefined, 'v-foot'); foot.append(element('span', '经办人：' + (item.operator || '____________')), element('span', '审核：____________')); card.append(foot);
      if (simulated) card.append(element('span', '模拟数据演示', 'sample-mark')); $('results').append(card);
    });
    exportData = { headers: ['单据编号', '日期', '收款对象', '事由', '金额'], rows: r.items.map(x => [x.id, x.date, x.payee, x.purpose, H.money(x.amount)]) };
  }
  function run() {
    try {
      resetReview(); const t = H.parseCSV($('csv-input').value); $('results').replaceChildren();
      if (mode === 'vouchers') { result = H.vouchers(t); drawVouchers(result); }
      if (mode === 'summary') {
        options(t); const groups = Array.from($('groups').querySelectorAll('input:checked')).map(e => e.value);
        result = H.summary(t, groups, $('amount-column').value);
        exportData = { headers: [...groups, '明细条数', '金额合计'], rows: result.items.map(g => [...g.values, g.count, H.money(g.total)]) };
        $('results').append(stats([['输入明细', result.count], ['汇总组数', result.items.length], ['金额合计', H.money(result.total)]]), table(exportData.headers, exportData.rows));
      }
      if (mode === 'stock') {
        result = H.stock(t); exportData = { headers: ['名称', '规格', '单位', '期初', '入库', '出库', '结存', '核对状态'], rows: result.items.map(g => [...g.values, g.opening, g.incoming, g.outgoing, g.balance, g.balance < 0 ? '负库存，需复核' : '待人工核对']) };
        $('results').append(stats([['输入流水', result.count], ['独立规格', result.items.length], ['负库存项目', result.negative]]), table(exportData.headers, exportData.rows, result.items.map(g => g.balance < 0)));
      }
      live = true; $('export').disabled = false;
      status((simulated ? '当前为模拟样例。' : '已按当前输入刷新结果。') + (mode === 'stock' && result.negative ? '有' + result.negative + '项负库存，请复核原始流水。' : '请核对结果后使用。'), mode === 'stock' && result.negative ? '' : 'success');
    } catch (e) { invalidate(e.message); }
  }
  $('load-sample').addEventListener('click', () => { simulated = true; $('csv-input').value = config.sample; if (mode === 'vouchers') $('company').value = '模拟演示公司'; run(); });
  $('download-sample').addEventListener('click', () => download(mode + '-sample.csv', '\uFEFF' + config.sample.replace(/\n/g, '\r\n') + '\r\n'));
  $('csv-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { invalidate('文件超过2MB，请先拆分。'); return; }
    try { const text = await file.text(); if (text.includes('\uFFFD')) throw new Error('文件编码无法识别，请用Excel或WPS另存为CSV UTF-8格式。'); $('csv-input').value = text; simulated = false; run(); }
    catch (e) { invalidate(e.message); }
  });
  $('csv-input').addEventListener('input', () => { simulated = false; result = null; exportData = null; $('export').disabled = true; resetReview(); clearTimeout(timer); if (live) timer = setTimeout(run, 200); });
  $('run').addEventListener('click', run); $('groups').addEventListener('change', run); $('amount-column').addEventListener('change', run);
  $('company').addEventListener('input', () => { if (live) run(); });
  $('review').addEventListener('change', () => { $('print').disabled = !result || !$('review').checked; });
  $('print').addEventListener('click', () => { if (result && $('review').checked) window.print(); });
  $('export').addEventListener('click', () => { if (exportData) download(mode + '-result.csv', H.csv(exportData.headers, exportData.rows)); });
  status('先点击“试用模拟样例”，或选择你的CSV明细文件。');
})();
