#!/usr/bin/env python3
"""Create a searchable sidecar without modifying a scanned PDF.

Requires pdftoppm and Tesseract with the requested language data installed.
Usage: python3 scripts/ocr-source.py input.pdf output.ocr.json --language ell
TESSDATA_PREFIX may point to a directory containing downloaded language models.
"""
import argparse
import concurrent.futures
import csv
import io
import json
from pathlib import Path
import subprocess
import tempfile


def recognize(image):
    result = subprocess.run(
        ['tesseract', str(image), 'stdout', '-l', args.language, '--psm', '6', '-c', 'tessedit_create_tsv=1'],
        check=True, capture_output=True, text=True,
    )
    rows = list(csv.DictReader(io.StringIO(result.stdout), delimiter='\t', quoting=csv.QUOTE_NONE))
    page = next(row for row in rows if row['level'] == '1')
    width, height = int(page['width']), int(page['height'])
    words = []
    for row in rows:
        if row['level'] != '5' or not row['text'].strip():
            continue
        words.append(dict(text=row['text'], x=int(row['left']) / width,
                          y=int(row['top']) / height, width=int(row['width']) / width,
                          height=int(row['height']) / height))
    return {'words': words}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf')
    parser.add_argument('output')
    parser.add_argument('--language', default='eng')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='source-ocr-') as directory:
        prefix = str(Path(directory) / 'page')
        subprocess.run(['pdftoppm', '-r', '200', '-png', args.pdf, prefix], check=True)
        images = sorted(Path(directory).glob('page-*.png'), key=lambda p: int(p.stem.split('-')[-1]))
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            pages = list(pool.map(recognize, images))
        Path(args.output).write_text(json.dumps({'pages': pages}, ensure_ascii=False) + '\n')
        print(f'Recognized {len(pages)} pages; wrote {args.output}')
