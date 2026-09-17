"""Convert every Phosphor icon imported by the website to native vector commands.

Run with fonttools installed. The committed JSON is bundled without Python/React.
No glyph is redrawn or substituted with SF Symbols.
"""
from pathlib import Path
import json, re, subprocess, xml.etree.ElementTree as ET
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen

root = Path(__file__).resolve().parents[2]
names = set()
for file in (root / 'src').rglob('*'):
    if file.suffix not in ['.js', '.jsx']: continue
    for block in re.findall(r'import\s*\{([^}]+)\}\s*from\s*[\'\"]@phosphor-icons/react[\'\"]', file.read_text()):
        names.update(x.strip().split(' as ')[0] for x in block.split(',') if x.strip())
js = """
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const result = {};
for (const name of JSON.parse(process.argv[1])) {
  const {default: defs} = await import('./node_modules/@phosphor-icons/react/dist/defs/'+name+'.es.js');
  for (const weight of ['regular','bold','fill']) result[name+'-'+weight] = renderToStaticMarkup(React.createElement('svg',{},defs.get(weight)));
}
console.log(JSON.stringify(result));
"""
svgs = json.loads(subprocess.check_output(['node','--input-type=module','-e',js,json.dumps(sorted(names))],cwd=root,text=True))
icons = {}
for key, svg in svgs.items():
    commands = []
    for element in ET.fromstring(svg).iter():
        if element.tag in ['svg','g']: continue
        if element.tag != 'path': raise ValueError((key,element.tag))
        pen = RecordingPen(); parse_path(element.attrib['d'],pen)
        for op, args in pen.value:
            code = {'moveTo':0,'lineTo':1,'curveTo':2,'closePath':3,'qCurveTo':4}.get(op)
            if code is None: raise ValueError(op)
            commands.append([code, *[round(v,6) for p in args for v in p]])
    icons[key] = commands
output = root/'ios/Glfans/SourceIcons.json'
output.write_text(json.dumps(icons,separators=(',',':')))
print(f'{len(names)} original icons / {len(icons)} variants -> {output}')
