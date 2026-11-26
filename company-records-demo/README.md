# 企业资料引用验证演示 / Company Record Evidence Demo

使用虚构的证书、项目与投标记录，演示怎样找回原文段落，并核验引用的文件、行号和版本。AI辅助开发。

这是一个可离线运行的浏览器和 Python 检索与引用验证原型。它返回原文证据。功能范围为英文检索与引用核对，不涉及大模型回答、PDF/OCR、登录权限或投标和补助资格判断。演示使用模拟资料。

## 浏览器演示

在本目录运行 `python -m http.server 8765 --bind 127.0.0.1`，然后用支持 Web Crypto 的浏览器打开 `http://127.0.0.1:8765/`。选择证书到期、项目完成或缺失证书示例，查看返回的原文和行号。先校验 ISO9001 的引用，然后修改模拟日期并再次校验，旧引用会失效。重新查询即可查看最新引用。重置会恢复模拟资料和默认问题。

网页问题和内置模拟资料在浏览器内处理。JavaScript 检索和引用测试可在本目录用 `node --test test-browser-evidence.cjs` 运行，需要 Node.js 20+ 和 Python 3.10+（用于比较 Python 实际输出）。

## Python 演示

需要 Python 3.10+，无需安装第三方包。进入本目录后运行：

```sh
python evidence_demo.py "When does ISO 9001 expire?"
python -m unittest -v
```

样例会返回 ISO9001 的原文、来源文件、行号与 SHA-256。`ISO27001` 没有记录时返回 `not_found`，不会把另一个证书当作答案。`example-output.json` 是实际运行生成的样例。

## 已实现的边界

- 读取 Markdown 的二级标题段落，做英文关键词与简单同义词匹配。
- 问题中的数字标识必须存在于匹配段落；仍需人工判断段落是否真正回答了问题。
- 引用必须逐字对应原文件行号；原文件变化或被删除后，旧引用验证失败。
- 引用校验拒绝语料目录以外的路径；这不等于已实现用户认证或租户隔离。
- 只读本地文件，没有网络请求或外部模型费用。请仅用附带的模拟资料试用。

实际试作需另行确认资料格式、文档数量、问题集、权限模型、数据保存与删除、模型和托管费用、验收及付款安排。

## English

An original browser and Python prototype for retrieving and verifying source passages from **fictional** certification, project and bid records. Developed with AI assistance.

Serve this directory with `python -m http.server 8765 --bind 127.0.0.1` and open `http://127.0.0.1:8765/` in a browser with Web Crypto. Try the certificate expiry, project completion, and missing certificate examples. Verify an ISO9001 citation, change the sample date, and verify it again to see the old citation fail. Run the search again for the updated citation. Reset restores the sample records and the default question. Queries and sample records are processed in the browser.

Run `node --test test-browser-evidence.cjs` to verify the browser logic. This suite requires Node.js 20+ and uses Python 3.10+ to compare the live Python output.

Run the Python commands above with Python 3.10+. No third-party packages are needed. Output includes the exact passage, file, line range and SHA-256. The missing ISO27001 example produces `not_found`.

This is a keyword-based evidence and citation-validation demo. It does not generate answers, connect to an LLM, ingest PDF/OCR files, authenticate users, isolate tenants or provide hosting. A matching passage may still fail to answer the question. Document changes invalidate old citations; deletion is reflected on the next uncached search.

The sample is reusable groundwork for a scoped company-records assistant. A paid trial requires an agreed brief, representative sanitized documents, evaluation questions, access boundaries, acceptance checks, costs and payment milestones.
