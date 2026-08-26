#!/usr/bin/env python3
"""Analyze screenshots: region brightness / hue stats to validate rendering."""
from PIL import Image
import sys, os

def region_stats(im, box):
    px = im.crop(box).convert('RGB')
    small = px.resize((48, 27))
    data = list(small.getdata())
    n = len(data)
    r = sum(p[0] for p in data) / n
    g = sum(p[1] for p in data) / n
    b = sum(p[2] for p in data) / n
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return r, g, b, lum

def variance(im, box):
    px = im.crop(box).convert('L')
    data = list(px.resize((48, 27)).getdata())
    m = sum(data) / len(data)
    return sum((d - m) ** 2 for d in data) / len(data)

for f in sorted(os.listdir('shots')):
    if not f.endswith('.png'):
        continue
    im = Image.open('shots/' + f)
    w, h = im.size
    sky = region_stats(im, (0, 0, w, int(h * 0.28)))
    mid = region_stats(im, (int(w*0.2), int(h*0.45), int(w*0.8), int(h*0.75)))
    var = variance(im, (int(w*0.15), int(h*0.35), int(w*0.85), int(h*0.9)))
    print(f"{f:16s} sky RGB=({sky[0]:5.1f},{sky[1]:5.1f},{sky[2]:5.1f}) lum={sky[3]:5.1f} | "
          f"mid RGB=({mid[0]:5.1f},{mid[1]:5.1f},{mid[2]:5.1f}) lum={mid[3]:5.1f} | var={var:7.1f}")
