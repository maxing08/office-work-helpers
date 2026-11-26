"""Original, offline source-passage demo. No model, network, or client data."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

STOP = set('a an and are as at be can company do does for from have how i in is it me of on our please records tell the this to us we what when which with'.split())
ALIASES = {'expires': 'expiry', 'expire': 'expiry', 'expiration': 'expiry', 'expired': 'expiry',
           'completed': 'completion', 'complete': 'completion', 'finished': 'completion',
           'certifications': 'certificate', 'certification': 'certificate', 'certificates': 'certificate'}


def tokens(text: str) -> set[str]:
    text = re.sub(r'\biso\s+(\d+)', r'iso\1', text.casefold())
    return {ALIASES.get(word, word) for word in re.findall(r'[a-z0-9]+', text)
            if word not in STOP}


def contained_file(root: Path, relative: str) -> Path:
    """Reject absolute paths, traversal and symlinks outside the corpus."""
    root = root.resolve()
    candidate = (root / relative).resolve()
    if Path(relative).is_absolute() or candidate == root or not candidate.is_relative_to(root):
        raise ValueError('Source path must stay inside the corpus directory')
    return candidate


def index_passages(root: Path) -> list[dict]:
    root = root.resolve()
    passages = []
    for path in sorted(root.rglob('*.md')):
        relative = path.relative_to(root).as_posix()
        path = contained_file(root, relative)
        raw = path.read_bytes()
        lines = raw.decode('utf-8-sig').splitlines()
        digest = hashlib.sha256(raw).hexdigest()
        starts = [i for i, line in enumerate(lines) if line.startswith('## ')]
        for index, start in enumerate(starts):
            end = starts[index + 1] if index + 1 < len(starts) else len(lines)
            while end > start and not lines[end - 1].strip():
                end -= 1
            quote = '\n'.join(lines[start:end])
            passages.append({'file': relative, 'line_start': start + 1, 'line_end': end,
                             'sha256': digest, 'quote': quote})
    return passages


def verify_citation(root: Path, citation: dict) -> bool:
    """Verify both the full source version and the exact quoted line range."""
    try:
        path = contained_file(root, citation['file'])
        start, end = citation['line_start'], citation['line_end']
        if type(start) is not int or type(end) is not int or not 1 <= start <= end:
            return False
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != citation['sha256']:
            return False
        lines = raw.decode('utf-8-sig').splitlines()
        return end <= len(lines) and '\n'.join(lines[start - 1:end]) == citation['quote']
    except (OSError, ValueError, KeyError, TypeError, UnicodeError):
        return False


def search(root: Path, question: str, limit: int = 3) -> dict:
    query = tokens(question)
    # A requested identifier must be present: ISO27001 must never match ISO9001.
    identifiers = {token for token in query if any(char.isdigit() for char in token)}
    ranked = []
    for citation in index_passages(root):
        words = tokens(citation['quote'])
        if not query or not identifiers.issubset(words):
            continue
        overlap = query & words
        coverage = len(overlap) / len(query)
        if coverage < 0.6 or not overlap:
            continue
        ranked.append((coverage, len(overlap), citation))
    ranked.sort(key=lambda hit: (-hit[0], -hit[1], hit[2]['file'], hit[2]['line_start']))
    evidence = [item[2] for item in ranked[:max(0, min(limit, 10))]]
    return {'mode': 'extractive_evidence_demo', 'simulated_data': True,
            'question': question, 'status': 'evidence_found' if evidence else 'not_found',
            'generated_answer': False, 'evidence': evidence,
            'note': 'Matched passages are evidence for review, not a generated answer or an eligibility decision.'}


def main() -> None:
    parser = argparse.ArgumentParser(description='Find verifiable passages in simulated company records')
    parser.add_argument('question')
    parser.add_argument('--corpus', type=Path, default=Path(__file__).parent / 'sample-records')
    args = parser.parse_args()
    if not args.corpus.is_dir():
        parser.error('Corpus directory does not exist')
    try:
        print(json.dumps(search(args.corpus, args.question), ensure_ascii=False, indent=2))
    except (OSError, UnicodeError, ValueError) as error:
        parser.exit(2, f'Cannot index corpus: {error}\n')


if __name__ == '__main__':
    main()
