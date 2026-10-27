"""Development-only extraction of allocation facts; no network and no runtime PDF dependency.

Inputs are official ITU RR 2024 Volume 1 and ISED's 2026 JSON. The ITU publication
is not redistributed. Only numeric limits, standardized service designations,
priority and footnote identifiers are emitted; original prose/artwork are excluded.
"""
import json
import re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/pack-data'
SERVICES = [
    'STANDARD FREQUENCY AND TIME SIGNAL-SATELLITE', 'STANDARD FREQUENCY AND TIME SIGNAL',
    'AERONAUTICAL RADIONAVIGATION', 'AERONAUTICAL MOBILE-SATELLITE', 'AERONAUTICAL MOBILE',
    'MARITIME RADIONAVIGATION', 'MARITIME MOBILE-SATELLITE', 'MARITIME MOBILE',
    'EARTH EXPLORATION-SATELLITE', 'METEOROLOGICAL-SATELLITE', 'METEOROLOGICAL AIDS',
    'RADIONAVIGATION-SATELLITE', 'RADIOLOCATION-SATELLITE', 'RADIODETERMINATION-SATELLITE', 'BROADCASTING-SATELLITE',
    'AMATEUR-SATELLITE', 'FIXED-SATELLITE', 'MOBILE-SATELLITE', 'LAND MOBILE-SATELLITE',
    'INTER-SATELLITE', 'RADIO ASTRONOMY', 'SPACE OPERATION', 'SPACE RESEARCH',
    'RADIONAVIGATION', 'RADIOLOCATION', 'RADIODETERMINATION', 'BROADCASTING', 'LAND MOBILE', 'AMATEUR', 'FIXED', 'MOBILE',
]
SERVICES.sort(key=len, reverse=True)
def pattern(name):
    return r'\s*'.join(re.escape(word) for word in name.split())
SERVICE_RE = re.compile('|'.join('(?:' + '|'.join(pattern(form) for form in [name, name.capitalize(), name.title()]) + ')' for name in SERVICES))
FOOTNOTE_RE = re.compile(r'(?:5\.\d{1,3}[A-Z]*|C\d+[A-Z]*)')

def records(body, low, high, page=None):
    body = body.replace('\u00ad', '').replace('-\n', '-')
    body = re.sub(r'RADIO-\s*NAVIGATION', 'RADIONAVIGATION', body)
    body = re.sub(r'RADIO-\s*LOCATION', 'RADIOLOCATION', body)
    body = re.sub(r'\s+', ' ', body).strip()
    refs = sorted(set(FOOTNOTE_RE.findall(body)))
    matches = list(SERVICE_RE.finditer(body))
    common = {'fromHz': round(low), 'toHz': round(high), 'footnotes': refs}
    if page: common['page'] = page
    if not matches:
        if 'not allocated' in body.lower():
            return [{**common, 'service': 'Not allocated', 'status': 'unallocated'}]
        raise ValueError(f'Unrecognized allocation on page {page}: {low}–{high}: {body}')
    result = []
    for i, match in enumerate(matches):
        raw = match.group()
        canonical = next(name for name in SERVICES if re.fullmatch(pattern(name), raw, re.I))
        tail = body[match.end(): matches[i+1].start() if i+1 < len(matches) else len(body)]
        tail = FOOTNOTE_RE.sub('', tail)
        tail = re.sub(r'[\[\];,]+', ' ', tail)
        tail = re.sub(r'\s+', ' ', tail).strip()
        row = {**common, 'service': canonical.capitalize(), 'status': 'primary' if raw.isupper() else 'secondary'}
        if tail: row['conditions'] = tail
        result.append(row)
    return result

def itu():
    regions = {str(i): [] for i in (1, 2, 3)}
    with pdfplumber.open(SOURCE / 'itu-rr-2024-vol1-source.pdf') as pdf:
        for n, page in enumerate(pdf.pages, 1):
            if not 49 <= n <= 211: continue
            text = page.extract_text() or ''
            if 'Allocation to services' not in text: continue
            unit = re.findall(r'\b(kHz|MHz|GHz)\b', text.split('Allocation to services')[0])[-1]
            scale = {'kHz': 1000, 'MHz': 1000000, 'GHz': 1000000000}[unit]
            tables = page.find_tables()
            if len(tables) != 1: raise ValueError(f'Unexpected table geometry on page {n}')
            table = tables[0]
            x0, y0, x1, _ = table.bbox
            centers = [x0 + (x1-x0) * (i+.5)/3 for i in range(3)]
            for cell in table.cells:
                raw = page.crop(cell).extract_text(x_tolerance=1) or ''
                first, _, rest = raw.partition('\n')
                first = re.sub(r'(?<=\d)\s+(?=\d)', '', first)
                m = re.match(r'^(Below\s+)?(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?', first)
                if not m or (not m[1] and not m[3]): continue
                low, high = (0, float(m[2])) if m[1] else (float(m[2]), float(m[3]))
                rows = records(first[m.end():] + '\n' + rest, low*scale, high*scale, n)
                for i, center in enumerate(centers):
                    if cell[0] < center < cell[2]: regions[str(i+1)].extend(rows)
    for key, rows in regions.items():
        unique = {json.dumps(row, sort_keys=True): row for row in rows}
        regions[key] = sorted(unique.values(), key=lambda r: (r['fromHz'], r['toHz'], r['service']))
        end = 0
        for row in regions[key]:
            if row['fromHz'] > end: raise ValueError(f'Region {key} coverage gap: {end}–{row["fromHz"]}')
            end = max(end, row['toHz'])
        if end != 3000000000000: raise ValueError(f'Region {key} incomplete upper limit {end}')
    return regions

def canada():
    source = json.loads((SOURCE / 'ca-full-spectrum-source.json').read_text(encoding='utf-8-sig'))['data']
    result = []
    for row in source:
        result.extend(records(row['services(EN)'], float(row['low(kHz)'])*1000, float(row['high(kHz)'])*1000))
    return result

if __name__ == '__main__':
    data = {'regions': itu(), 'canada': canada()}
    output = ROOT / 'src/data/allocations.json'
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
    print('Allocation records:', {key: len(value) for key,value in data['regions'].items()}, 'Canada:',len(data['canada']))
