import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(name, size):
    fonts = {
        'bold': 'C:/Windows/Fonts/segoeuib.ttf',
        'regular': 'C:/Windows/Fonts/segoeui.ttf',
        'semibold': 'C:/Windows/Fonts/seguisb.ttf',
        'italic': 'C:/Windows/Fonts/segoeuii.ttf',
    }
    path = fonts.get(name, fonts['regular'])
    if not os.path.exists(path):
        path = 'C:/Windows/Fonts/arial.ttf'
    return ImageFont.truetype(path, size)

def draw_arrowhead(draw, tip, angle_rad, length=12, width=8, fill='black'):
    # tip is (x, y), angle_rad is direction of arrow
    # Calculate back corners
    back_x = tip[0] - length * math.cos(angle_rad)
    back_y = tip[1] - length * math.sin(angle_rad)
    
    # Perpendicular vector
    perp_x = width / 2.0 * -math.sin(angle_rad)
    perp_y = width / 2.0 * math.cos(angle_rad)
    
    p1 = (back_x + perp_x, back_y + perp_y)
    p2 = (back_x - perp_x, back_y - perp_y)
    
    draw.polygon([tip, p1, p2], fill=fill)

def draw_arrow_line(draw, points, width=2, fill='black', arrow_start=False, arrow_end=True, arrow_size=12):
    # points is list of (x, y) tuples
    if len(points) < 2:
        return
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=fill, width=width)
        
    if arrow_end:
        p_prev = points[-2]
        p_last = points[-1]
        dx = p_last[0] - p_prev[0]
        dy = p_last[1] - p_prev[1]
        angle = math.atan2(dy, dx)
        draw_arrowhead(draw, p_last, angle, length=arrow_size, width=arrow_size * 0.7, fill=fill)
        
    if arrow_start:
        p_first = points[0]
        p_next = points[1]
        dx = p_first[0] - p_next[0]
        dy = p_first[1] - p_next[1]
        angle = math.atan2(dy, dx)
        draw_arrowhead(draw, p_first, angle, length=arrow_size, width=arrow_size * 0.7, fill=fill)

print("Helper defined successfully")
