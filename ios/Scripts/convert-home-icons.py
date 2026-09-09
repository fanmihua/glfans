"""Convert the website's installed Phosphor bold SVG paths to native CG paths.
Requires fonttools; output is committed/generated Swift, no Python in the app.
"""
from pathlib import Path
import re
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen
root=Path(__file__).resolve().parents[2]
result=['// Generated from @phosphor-icons/react, bold, 256x256. Do not redraw.\nimport SwiftUI\nenum HomeSourceIcon {']
for name in ['ArrowDown','ArrowRight']:
 s=(root/'node_modules/@phosphor-icons/react/dist/defs'/f'{name}.es.js').read_text()
 d=re.search(r'"bold".*?d: "([^"]+)"',s,re.S).group(1)
 pen=RecordingPen();parse_path(d,pen)
 result += [f'    static var {name[0].lower()+name[1:]}: Path {{', '        var p = Path()']
 pt=lambda p:'.init(x: %.8f, y: %.8f)' % p
 for op,args in pen.value:
  if op=='moveTo':result.append(f'        p.move(to: {pt(args[0])})')
  elif op=='lineTo':result.append(f'        p.addLine(to: {pt(args[0])})')
  elif op=='curveTo':result.append(f'        p.addCurve(to: {pt(args[2])}, control1: {pt(args[0])}, control2: {pt(args[1])})')
  elif op=='closePath':result.append('        p.closeSubpath()')
  else:raise ValueError(op)
 result+=['        return p','    }']
result+=['}', '''struct SourceArrow: View {
    var down = false
    var body: some View {
        GeometryReader { g in
            (down ? HomeSourceIcon.arrowDown : HomeSourceIcon.arrowRight)
                .applying(.init(scaleX: g.size.width / 256, y: g.size.height / 256)).fill()
        }.accessibilityHidden(true)
    }
}''']
(root/'ios/Glfans/HomeSourceIcon.swift').write_text('\n'.join(result)+'\n')
