#!/usr/bin/env python3
"""Optional advisory audit: python3 scripts/audit-gender.py path/to/genea.doc.

Same-gender partnerships and names can be legitimate. Warnings request source
review, never make corrections, and do not fail the normal consistency check.
Name hints combine common Greek transliterations, explicit family-role words,
and a >=90% majority among at least five records in the input. Linked spouse
appearances are excluded from the name statistics to avoid double counting.
"""
import argparse
from collections import Counter, defaultdict
from pathlib import Path
import re

RECORD = re.compile(r'^(.{20})\s*([MF?])\s*\d+\s+\d+\s+(\d+)\s+(?:(\d+)\s+)?([^\\;]+)')
MALE = set('george georgios giorgos ioannis giannis yiannis john nikolaos nikolas nicholas nikos nickos konstantinos constantinos kostas kostis dimitrios demetrios dimitris emmanouil emmanuel manolis vasilios vassilios vasilis panagiotis christos christoforos spyridon spyros stavros andreas alexandros alexandre elias ilias michalis michail michael'.split())
FEMALE = set('maria marigo marigoula eleni heleni irene eirini katerina aikaterini ekaterini angeliki anastasia athanasia vasiliki paraskevi panagiota georgia georgina sofia sophia kalliope kalliopi calliope theodora despina despoina stavroula fotini fotine evangelia evangalia zoe zoi'.split())
ROLES = {'son':'M','daughter':'F','father':'M','mother':'F','husband':'M','wife':'F','brother':'M','sister':'F'}

def audit(text):
    records = []
    groups = defaultdict(list)
    warnings = []
    primaries = {}
    for number, line in enumerate(text.splitlines(), 1):
        if not re.fullmatch(r'(?:[ 0-9]{2}){10}', line[:20]):
            continue
        match = RECORD.match(line)
        if not match:
            continue
        hn, gender, spouse, altid, name = match.groups()
        name = name.strip()
        first = re.sub(r'[^a-z]', '', name.split()[0].casefold())
        record = (number, gender, name, first, altid)
        records.append(record)
        if spouse == '0':
            primaries[hn] = (hn, gender, name)
        elif (primary := primaries.get(hn)) and gender != '?' and primary[1] == gender:
            warnings.append((number, f'{name} and {primary[2]} are both recorded {gender}. Same-gender partnership: confirm source; may be intentional.'))
        if not altid and gender != '?' and first not in ROLES:
            groups[first].append(record)
    for number, gender, name, first, altid in records:
        if gender == '?' or altid:
            continue
        expected = ROLES.get(first)
        reason = 'family-role placeholder'
        if expected is None:
            expected = 'M' if first in MALE else 'F' if first in FEMALE else None
            reason = 'common Greek-name hint'
        samples = groups[first]
        counts = Counter(r[1] for r in samples)
        if counts:
            majority, count = counts.most_common(1)[0]
            # Strong local evidence takes precedence over the generic list.
            if count >= 5 and count / len(samples) >= .9:
                expected = majority
                reason = f'{count} of {len(samples)} unlinked records with this first name'
        if expected and gender != expected:
            warnings.append((number, f'{name}: recorded {gender}; {reason} suggests {expected}. Review source; do not auto-correct.'))
    return sorted(warnings)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    warnings = audit(args.file.read_text())
    for number, message in warnings:
        print(f'{args.file}:{number}: advisory: {message}')
    print(f'{len(warnings)} advisory warning(s); no data changed.')
