# 企业资料引用验证演示 / Company Record Evidence Demo

使用虚构的证书、项目与投标记录，演示怎样找回原文段落，并核验引用的文件、行号和版本。AI辅助开发。

这是一个离线 Python 检索与引用验证原型。当前返回原文证据，不生成自然语言答案；尚未接入大模型、PDF/OCR、登录权限或托管服务。它不是已交付的客户案例，也不判断投标或补助资格。

## 运行

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

An original, offline Python prototype for retrieving and verifying source passages from **fictional** certification, project and bid records. AI-assisted development; no paid-client experience is implied.

Run the two commands above with Python 3.10+. No third-party packages are needed. Output includes the exact passage, file, line range and SHA-256. A missing ISO27001 identifier produces `not_found`, rather than borrowing an ISO9001 record.

This is a keyword-based evidence and citation-validation demo. It does not generate answers, connect to an LLM, ingest PDF/OCR files, authenticate users, isolate tenants or provide hosting. A matching passage may still fail to answer the question. Document changes invalidate old citations; deletion is reflected on the next uncached search.

The sample is reusable groundwork for a scoped company-records assistant. A paid trial requires an agreed brief, representative sanitized documents, evaluation questions, access boundaries, acceptance checks, costs and payment milestones.
