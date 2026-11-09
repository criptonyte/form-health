"""Generate the Form monogram from the same embedded Fraunces face as the wordmark."""
from pathlib import Path
from tempfile import TemporaryDirectory
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]/'browser-public'
font=instantiateVariableFont(TTFont(ROOT/'fonts/fraunces-latin-display-v1.woff'),{'wght':600},inplace=False)
font.flavor=None
# Match the header's cream surface, dark green letter and sage punctuation.
BG='#fafaf5'; GREEN='#2e4433'; SAGE='#829951'
with TemporaryDirectory() as tmp:
    ttf=Path(tmp)/'fraunces.ttf'; font.save(ttf)
    f=ImageFont.truetype(str(ttf),310*4)
    image=Image.new('RGB',(2048,2048),BG); d=ImageDraw.Draw(image)
    box=d.textbbox((0,0),'f.',font=f); x=(2048-(box[2]-box[0]))/2-box[0]; y=(2048-(box[3]-box[1]))/2-box[1]
    d.text((x,y),'f',font=f,fill=GREEN)
    d.text((x+d.textlength('f',font=f),y),'.',font=f,fill=SAGE)
    for size in (192,512): image.resize((size,size),Image.Resampling.LANCZOS).save(ROOT/f'icon-{size}.png')
# Outline glyphs in the favicon so it requires no installed font.
glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); upm=font['head'].unitsPerEm
paths=[]; advance=0
for char,color in [('f',GREEN),('.',SAGE)]:
    name=cmap[ord(char)]; pen=SVGPathPen(glyphs); glyphs[name].draw(pen)
    paths.append(f'<path transform="translate({advance} 0)" fill="{color}" d="{pen.getCommands()}"/>')
    advance+=font['hmtx'][name][0]
scale=310/upm; x=(512-advance*scale)/2
# Fraunces ascender/descender bounds for these exact glyphs, centered visually.
from fontTools.pens.boundsPen import BoundsPen
bounds=[]
for c in 'f.':
    pen=BoundsPen(glyphs);glyphs[cmap[ord(c)]].draw(pen);bounds.append(pen.bounds)
lo=min(b[1] for b in bounds);hi=max(b[3] for b in bounds);baseline=256+(hi+lo)*scale/2
(ROOT/'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="{BG}" d="M0 0h512v512H0z"/><g transform="translate({x} {baseline}) scale({scale} {-scale})">'+''.join(paths)+'</g></svg>')
