(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OfficeHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_ROWS = 5000;
  function fail(message) { throw new Error(message); }
  function parseCSV(source) {
    source = String(source).replace(/^\uFEFF/, '');
    if (source.length > 2 * 1024 * 1024) fail('文件超过2MB，请先拆分。');
    const records = []; let row = [], field = '', quoted = false, closed = false;
    function cell() { row.push(field); field = ''; closed = false; }
    function line() { cell(); if (row.some(x => x.trim() !== '')) records.push(row); row = []; }
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (quoted) {
        if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { quoted = false; closed = true; }
        else field += c;
      } else if (c === ',') cell();
      else if (c === '\n' || c === '\r') { if (c === '\r' && source[i + 1] === '\n') i++; line(); }
      else if (c === '"') {
        if (field || closed) fail('CSV引号位置不正确，请使用Excel的CSV UTF-8格式重新导出。');
        quoted = true;
      } else {
        if (closed) { if (c === ' ' || c === '\t') continue; fail('引号结束后发现多余内容。'); }
        field += c;
      }
    }
    if (quoted) fail('CSV有未闭合的引号。');
    if (field || row.length || closed) line();
    if (records.length < 2) fail('请提供表头和至少一行明细。');
    const headers = records.shift().map(x => x.trim());
    if (headers.some(x => !x)) fail('表头不能为空。');
    if (new Set(headers).size !== headers.length) fail('表头有重复名称。');
    if (records.length > MAX_ROWS) fail('本演示每次最多处理5000行。');
    const rows = records.map((values, i) => {
      if (values.length !== headers.length) fail('第' + (i + 2) + '行列数与表头不一致。');
      const item = Object.create(null);
      headers.forEach((h, j) => { item[h] = values[j].trim(); });
      return item;
    });
    return { headers, rows };
  }
  function required(table, fields) {
    const missing = fields.filter(x => !table.headers.includes(x));
    if (missing.length) fail('缺少列：' + missing.join('、'));
  }
  function nonempty(value, label, line) { if (String(value ?? '').trim() === '') fail('第' + line + '行的“' + label + '”不能为空。'); }
  function integer(value, label, line) {
    if (!/^\d+$/.test(String(value))) fail('第' + line + '行的“' + label + '”须为非负整数。');
    const n = Number(value);
    if (!Number.isSafeInteger(n)) fail('第' + line + '行数字过大。');
    return n;
  }
  function cents(value, line = '?') {
    value = String(value).trim();
    if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) fail('第' + line + '行金额格式不正确；请填数字，最多两位小数。');
    const sign = value.startsWith('-') ? -1 : 1;
    const parts = value.replace(/^-/, '').replace(/,/g, '').split('.');
    const result = sign * (Number(parts[0]) * 100 + Number((parts[1] || '').padEnd(2, '0')));
    if (!Number.isSafeInteger(result)) fail('第' + line + '行金额超出安全计算范围。');
    return result;
  }
  function add(a, b) { const total = a + b; if (!Number.isSafeInteger(total)) fail('合计超出安全计算范围。'); return total; }
  function money(n) { return (n < 0 ? '-' : '') + Math.floor(Math.abs(n) / 100) + '.' + String(Math.abs(n) % 100).padStart(2, '0'); }
  function validDate(value, line) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('第' + line + '行日期请填YYYY-MM-DD。');
    const [y, m, d] = value.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (y < 1900 || m < 1 || m > 12 || d < 1 || d > days) fail('第' + line + '行日期不存在。');
  }
  function uniqueId(seen, id, line) { nonempty(id, '编号', line); if (seen.has(id)) fail('第' + line + '行编号重复：' + id + '。请先确认，避免重复处理。'); seen.add(id); }
  function vouchers(table) {
    required(table, ['单据编号', '日期', '收款对象', '事由', '金额']);
    if (table.rows.length > 200) fail('付款单演示每次最多200张，请分批核对。');
    const seen = new Set(); let total = 0;
    const items = table.rows.map((r, i) => {
      const line = i + 2;
      uniqueId(seen, r['单据编号'], line); validDate(r['日期'], line);
      nonempty(r['收款对象'], '收款对象', line); nonempty(r['事由'], '事由', line);
      const amount = cents(r['金额'], line); if (amount <= 0) fail('第' + line + '行付款金额须大于0。');
      total = add(total, amount);
      return { id: r['单据编号'], date: r['日期'], payee: r['收款对象'], purpose: r['事由'], amount, operator: r['经办人'] || '' };
    });
    return { items, total, count: items.length };
  }
  function summary(table, groupFields, amountField) {
    if (!groupFields.length) fail('请至少选择一个汇总条件。');
    if (groupFields.includes(amountField)) fail('金额列不能同时用作分组条件。');
    required(table, [...groupFields, amountField]);
    const groups = new Map(); let total = 0;
    table.rows.forEach((r, i) => {
      const values = groupFields.map(h => { nonempty(r[h], h, i + 2); return r[h]; });
      const key = JSON.stringify(values), amount = cents(r[amountField], i + 2);
      if (!groups.has(key)) groups.set(key, { values, count: 0, total: 0 });
      const group = groups.get(key); group.count++; group.total = add(group.total, amount); total = add(total, amount);
    });
    return { items: Array.from(groups.values()), total, count: table.rows.length, groupFields, amountField };
  }
  function stock(table) {
    required(table, ['流水号', '日期', '名称', '规格', '单位', '类型', '数量']);
    const seen = new Set(), groups = new Map();
    table.rows.forEach((r, i) => {
      const line = i + 2; uniqueId(seen, r['流水号'], line); validDate(r['日期'], line);
      const values = ['名称', '规格', '单位'].map(h => { nonempty(r[h], h, line); return r[h]; });
      const key = JSON.stringify(values), q = integer(r['数量'], '数量', line);
      if (!['期初', '入库', '出库'].includes(r['类型'])) fail('第' + line + '行类型须为期初、入库或出库。');
      if (!groups.has(key)) groups.set(key, { values, opening: 0, incoming: 0, outgoing: 0, openingSeen: false });
      const group = groups.get(key);
      if (r['类型'] === '期初') { if (group.openingSeen) fail('同一名称、规格和单位存在多条期初库存，请确认口径。'); group.openingSeen = true; group.opening = q; }
      else if (r['类型'] === '入库') group.incoming = add(group.incoming, q);
      else group.outgoing = add(group.outgoing, q);
    });
    const items = Array.from(groups.values()).map(g => ({ ...g, balance: add(add(g.opening, g.incoming), -g.outgoing) }));
    return { items, count: table.rows.length, negative: items.filter(g => g.balance < 0).length };
  }
  function csvValue(value) {
    let s = String(value ?? '');
    if (/^[\s]*[=+@\t\r]/.test(s) || (/^\s*-/.test(s) && !/^-\d+(\.\d+)?$/.test(s))) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(headers, rows) { return '\uFEFF' + [headers, ...rows].map(row => row.map(csvValue).join(',')).join('\r\n') + '\r\n'; }
  return { parseCSV, cents, money, vouchers, summary, stock, csv, MAX_ROWS };
});
