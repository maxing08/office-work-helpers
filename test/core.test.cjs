const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../core.js');
test('CSV保留前导零、中文、引号、逗号和跨行字段', () => {
  const t = H.parseCSV('\uFEFF编号,备注\r\n001,"甲,乙"\r\n002,"说""好""\n下一行"\r\n');
  assert.equal(t.rows[0]['编号'], '001'); assert.equal(t.rows[0]['备注'], '甲,乙'); assert.equal(t.rows[1]['备注'], '说"好"\n下一行');
});
test('拒绝结构错误而不静默丢列', () => {
  for (const x of ['a,b\n1', 'a,a\n1,2', 'a,\n1,2', 'a,b\n"x,y', 'a,b\n"x"z,y']) assert.throws(() => H.parseCSV(x));
});
test('不继承用户提供的列名属性', () => { const t = H.parseCSV('__proto__,x\na,b'); assert.equal(Object.getPrototypeOf(t.rows[0]), null); assert.equal(t.rows[0].__proto__, 'a'); });
test('以分计算金额，支持规范千位分隔符', () => { assert.equal(H.cents('0.10') + H.cents('0.20'), 30); assert.equal(H.cents('1,200.50'), 120050); assert.equal(H.money(-1), '-0.01'); });
test('拒绝指数、三位小数、错误千位符和超大金额', () => { for (const s of ['1e4', '1.001', '1,20.00', 'NaN', 'Infinity', '900719925474099.91']) assert.throws(() => H.cents(s)); });
const voucherCSV = '单据编号,日期,收款对象,事由,金额\n001,2026-11-20,示例甲,资料费,100.10\n002,2026-11-21,示例乙,服务费,200.20\n003,2026-11-22,示例丙,运费,99.70';
test('三张付款单张数、金额、编号保持准确', () => { const r = H.vouchers(H.parseCSV(voucherCSV)); assert.equal(r.count, 3); assert.equal(r.total, 40000); assert.equal(r.items[0].id, '001'); });
test('重复单号必须先确认', () => { assert.throws(() => H.vouchers(H.parseCSV(voucherCSV.replace('002,', '001,'))), /编号重复/); });
test('付款单拦截缺失收款对象、无效日期、负金额', () => {
  assert.throws(() => H.vouchers(H.parseCSV(voucherCSV.replace('示例甲', ''))), /不能为空/);
  assert.throws(() => H.vouchers(H.parseCSV(voucherCSV.replace('2026-11-20', '2026-02-30'))), /日期不存在/);
  assert.throws(() => H.vouchers(H.parseCSV(voucherCSV.replace('100.10', '-1.00'))), /须大于0/);
});
test('多条件汇总不混淆名称、规格和门店', () => {
  const t = H.parseCSV('门店,品名,规格,金额\n甲店,T恤,M,158\n甲店,T恤,M,237\n甲店,T恤,L,79\n乙店,T恤,M,79');
  const r = H.summary(t, ['门店', '品名', '规格'], '金额'); assert.equal(r.items.length, 3); assert.equal(r.total, 55300); assert.equal(r.items[0].total, 39500);
});
test('新增明细刷新汇总结果', () => { const a = '店,金额\n甲,1.10'; assert.equal(H.summary(H.parseCSV(a + '\n甲,2.20'), ['店'], '金额').total, 330); });
test('不以空字段或金额本身分组', () => { assert.throws(() => H.summary(H.parseCSV('店,金额\n,1'), ['店'], '金额')); assert.throws(() => H.summary(H.parseCSV('店,金额\n甲,1'), ['金额'], '金额')); });
const stockCSV = '流水号,日期,名称,规格,单位,类型,数量\n01,2026-11-01,T恤,M,件,期初,10\n02,2026-11-02,T恤,M,件,入库,5\n03,2026-11-03,T恤,M,件,出库,3\n04,2026-11-01,T恤,L,件,期初,8\n05,2026-11-03,T恤,L,件,出库,2';
test('同名不同规格库存分别为12、6', () => { const r = H.stock(H.parseCSV(stockCSV)); assert.equal(r.items.length, 2); assert.deepEqual(r.items.map(x => x.balance), [12, 6]); });
test('不同单位分开核对', () => { const r = H.stock(H.parseCSV(stockCSV + '\n06,2026-11-03,T恤,M,箱,入库,1')); assert.equal(r.items.length, 3); });
test('负库存标出，重复流水和多次期初不掩盖', () => {
  assert.equal(H.stock(H.parseCSV(stockCSV.replace('出库,3', '出库,30'))).negative, 1);
  assert.throws(() => H.stock(H.parseCSV(stockCSV + '\n01,2026-11-03,T恤,M,件,入库,1')), /编号重复/);
  assert.throws(() => H.stock(H.parseCSV(stockCSV + '\n06,2026-11-03,T恤,M,件,期初,1')), /多条期初/);
});
test('库存数量只接受非负整数，类型不能猜测', () => { assert.throws(() => H.stock(H.parseCSV(stockCSV.replace('入库,5', '入库,1.5')))); assert.throws(() => H.stock(H.parseCSV(stockCSV.replace('入库,5', '调拨,5')))); });
test('CSV导出拦截公式内容并正确转义逗号与引号', () => { const s = H.csv(['姓名', '备注'], [['=1+1', '甲,"乙"'], ['-cmd', '@x']]); assert.ok(s.includes("'=1+1")); assert.ok(s.includes('"甲,""乙"""')); assert.ok(s.includes("'-cmd")); assert.ok(s.includes("'@x")); });
