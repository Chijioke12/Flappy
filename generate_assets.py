import os
import zlib
import struct
import random

# Ensure output directory exists
os.makedirs("public/assets", exist_ok=True)

def write_png(width, height, rgba_pixels, filename):
    """
    Writes a list of (r, g, b, a) tuples as a standard, transparent PNG file.
    No external dependencies (uses standard zlib and struct modules).
    """
    # Create PNG scanlines with a filter byte (0 for None) prepended to each row
    scanlines = bytearray()
    for y in range(height):
        scanlines.append(0) # Filter type 0
        for x in range(width):
            r, g, b, a = rgba_pixels[y * width + x]
            scanlines.append(max(0, min(255, int(r))))
            scanlines.append(max(0, min(255, int(g))))
            scanlines.append(max(0, min(255, int(b))))
            scanlines.append(max(0, min(255, int(a))))
    
    compressed = zlib.compress(scanlines)
    
    def make_chunk(tag, data):
        length = len(data)
        chunk = struct.pack(f'>I{len(tag)}s', length, tag) + data
        crc = zlib.crc32(chunk[4:]) # Covers tag and data
        return chunk + struct.pack('>I', crc)
    
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk
    idat = make_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = make_chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(signature)
        f.write(ihdr)
        f.write(idat)
        f.write(iend)

# ==============================================================================
# 1. BIRD ASSET (72x16 Spritesheet with 3 frames of 24x16 pixels)
# ==============================================================================
bird_frame_0 = [
    "                        ",
    "        kkkkkk          ",
    "      kkHHHHHHkk        ",
    "     kHHHHHHHHHWWkk     ",
    "    kHHHHHHHHHWWWeWk    ",
    "   kBBBBBBBBBBPWWeWk    ",
    "  kBBBBBBBBBBBWWWWk     ",
    "  kBBBBwwBBBBBkkkk      ",
    "  kBBwwwwwBBBBkkOOOOOk  ",
    "  kDDwwwwwDDDkOOOOOOOOk ",
    "  kDDDDwwDDDDkOOOOOOOOk ",
    "   kDDDDDDDDDDkkOOOOOk  ",
    "    kkDDDDDDDDkkkkkkkk  ",
    "      kkkkkkkkkk        ",
    "                        ",
    "                        "
]

bird_frame_1 = [
    "                        ",
    "        kkkkkk          ",
    "      kkHHHHHHkk        ",
    "     kHHHHHHHHHWWkk     ",
    "    kHHHHHHHHHWWWeWk    ",
    "   kBBwwwwBBBBPWWeWk    ",
    "  kBBwwwwwwBBBWWWWk     ",
    "  kBBBwwwBBBBBkkkk      ",
    "  kBBBBBBBBBBBkkOOOOOk  ",
    "  kDDDDDDDDDDkOOOOOOOOk ",
    "  kDDDDDDDDDDkOOOOOOOOk ",
    "   kDDDDDDDDDDkkOOOOOk  ",
    "    kkDDDDDDDDkkkkkkkk  ",
    "      kkkkkkkkkk        ",
    "                        ",
    "                        "
]

bird_frame_2 = [
    "                        ",
    "        kkkkkk          ",
    "      kkHHHHHHkk        ",
    "     kHHHHHHHHHWWkk     ",
    "    kHHHHHHHHHWWWeWk    ",
    "   kBBBBBBBBBBPWWeWk    ",
    "  kBBBBBBBBBBBWWWWk     ",
    "  kBBBBBBBBBBBkkkk      ",
    "  kBBBBBBBBBBBkkOOOOOk  ",
    "  kDDDDwwDDDDkOOOOOOOOk ",
    "  kDDDDwwwwwDkOOOOOOOOk ",
    "   kDDDDwwwwwDkkOOOOOk  ",
    "    kkDDDwwDDDkkkkkkkk  ",
    "      kkkkkkkkkk        ",
    "                        ",
    "                        "
]

bird_colors = {
    ' ': (0, 0, 0, 0),          # Transparent
    'k': (15, 30, 60, 255),      # Deep navy outline
    'B': (0, 150, 255, 255),     # Main vibrant fluffy blue body
    'H': (70, 200, 255, 255),    # Light fluff tips/highlights
    'D': (0, 95, 190, 255),      # Deep blue shadow
    'w': (255, 215, 0, 255),     # Golden yellow wing color
    'W': (255, 255, 255, 255),   # Big expressive eye white
    'e': (10, 10, 15, 255),      # Black eye pupil
    'P': (35, 45, 60, 255),      # Charcoal mask around eyes
    'O': (255, 140, 0, 255),     # Bright orange beak
    'g': (180, 70, 0, 255)       # Dark orange/red beak shadow
}

bird_pixels = []
for y in range(16):
    row_stitched = bird_frame_0[y] + bird_frame_1[y] + bird_frame_2[y]
    for char in row_stitched:
        bird_pixels.append(bird_colors.get(char, (0, 0, 0, 0)))

write_png(72, 16, bird_pixels, "public/assets/bird.png")

# ==============================================================================
# 2. PIPE BODY (32x32 Procedural Retro Texture)
# ==============================================================================
pipe_body_pixels = []
for y in range(32):
    for x in range(32):
        # Left-to-right green shading with highlight and shadow
        if x == 0 or x == 31:
            color = (30, 45, 30, 255) # Border
        elif x == 1 or x == 30:
            color = (40, 75, 40, 255) # Shadow edge
        elif x in (2, 3):
            color = (130, 220, 130, 255) # High light reflection
        elif x in (4, 5, 6):
            color = (90, 195, 90, 255) # Light green
        elif x in range(7, 18):
            color = (65, 170, 65, 255) # Base green
        elif x in range(18, 25):
            color = (45, 130, 45, 255) # Mid shadow
        else:
            color = (35, 90, 35, 255) # Deep shadow
        pipe_body_pixels.append(color)

write_png(32, 32, pipe_body_pixels, "public/assets/pipe_body.png")

# ==============================================================================
# 3. PIPE HEAD (36x16 Procedural Retro Texture)
# ==============================================================================
pipe_head_pixels = []
for y in range(16):
    for x in range(36):
        # Outer border
        if y == 0 or y == 15 or x == 0 or x == 35:
            color = (30, 45, 30, 255)
        # Highlight and shading matching the body but expanded for the 36w lip
        elif x == 1 or x == 34:
            color = (45, 80, 45, 255)
        elif x in (2, 3, 4):
            color = (140, 230, 140, 255) # Lip highlight
        elif x in (5, 6, 7):
            color = (100, 205, 100, 255)
        elif x in range(8, 20):
            color = (70, 175, 70, 255)
        elif x in range(20, 28):
            color = (50, 135, 50, 255)
        else:
            color = (38, 95, 38, 255)
        pipe_head_pixels.append(color)

write_png(36, 16, pipe_head_pixels, "public/assets/pipe_head.png")

# ==============================================================================
# 4. GROUND (320x32 Retro Texture)
# ==============================================================================
ground_pixels = []
for y in range(32):
    for x in range(320):
        # Top 4 rows are grass
        if y < 2:
            # Bright grass top with alternating lighter stripes
            if (x // 4) % 2 == 0:
                color = (110, 215, 70, 255)
            else:
                color = (90, 195, 50, 255)
        elif y < 4:
            # Shadow under grass
            if (x // 2) % 2 == 0:
                color = (50, 120, 30, 255)
            else:
                color = (35, 90, 20, 255)
        else:
            # Dirt gradient down with random gravel/stone pixels
            base_y = y - 4
            # Darken as we go down
            r = max(90, 135 - base_y * 1)
            g = max(60, 95 - base_y * 1)
            b = max(35, 60 - base_y * 1)
            
            # Seed pseudo-randomly based on coordinates for stable retro patterns
            stone_seed = (x * 17 + y * 43) % 100
            if stone_seed < 3: # Dark pebble
                color = (r - 30, g - 25, b - 15, 255)
            elif stone_seed < 6: # Light pebble
                color = (r + 25, g + 20, b + 15, 255)
            else:
                # Add horizontal brick-like joints occasionally
                if y % 8 == 0 and (x + y) % 32 == 0:
                    color = (r - 20, g - 15, b - 10, 255)
                else:
                    color = (r, g, b, 255)
        ground_pixels.append(color)

write_png(320, 32, ground_pixels, "public/assets/ground.png")

# ==============================================================================
# 5. BACKGROUND (320x240 Cute Retro City/Skyline Skyline)
# ==============================================================================
bg_pixels = []
for y in range(240):
    for x in range(320):
        # A. Sky Gradient
        if y < 140:
            # Smooth transition from deep teal-blue to bright sky blue
            t = y / 140.0
            r = int(70 * (1 - t) + 155 * t)
            g = int(140 * (1 - t) + 215 * t)
            b = int(225 * (1 - t) + 250 * t)
            color = (r, g, b, 255)
        elif y < 180:
            # Horizon glow (slightly warmer peach/cyan transition)
            t = (y - 140) / 40.0
            r = int(155 * (1 - t) + 210 * t)
            g = int(215 * (1 - t) + 240 * t)
            b = int(250 * (1 - t) + 245 * t)
            color = (r, g, b, 255)
        else:
            # Lower horizon is a warm soft cyan
            color = (210, 240, 245, 255)
            
        # B. Distant Clouds (hardcoded pretty pixel shapes)
        # We'll define a few bounding boxes for clouds
        # Cloud 1 (Left): center y=50, x=40
        dx1, dy1 = x - 40, y - 50
        if (dx1*dx1)/(25*25) + (dy1*dy1)/(8*8) <= 1.0:
            color = (255, 255, 255, 255)
        # Cloud 2 (Right): center y=70, x=220
        dx2, dy2 = x - 220, y - 70
        if (dx2*dx2)/(35*35) + (dy2*dy2)/(11*11) <= 1.0:
            color = (255, 255, 255, 255)
            
        # C. Distant Mountains (Layer 1, Light Teal-Green, furthest)
        # y = 145 + 10 * sin(x/25) + 5 * cos(x/12)
        import math
        m1_h = 160 + int(8 * math.sin(x / 30.0) + 4 * math.cos(x / 15.0))
        if y >= m1_h and y < 208:
            # Soft distant blue-green
            color = (155, 190, 185, 255)
            
        # D. Closer Hills / City Skyline (Layer 2, Darker Teal-Green, closer)
        # Let's draw some cute city buildings or repeating pine tree shapes
        # We can combine a city silhouette and hills!
        # Repeating blocky skyline:
        block_idx = x // 16
        # Let's define random-looking but fixed heights for city blocks
        block_heights = [0, 0, 175, 165, 180, 0, 0, 170, 170, 160, 185, 175, 0, 0, 172, 168, 0, 175, 182, 0]
        h2_h = block_heights[block_idx % len(block_heights)]
        if h2_h > 0 and y >= h2_h and y < 208:
            color = (115, 155, 145, 255)
            # Add window lights inside the city blocks!
            if y > h2_h + 4 and (y - h2_h) % 10 in (2, 3, 4) and x % 16 in (4, 5, 10, 11):
                color = (255, 245, 180, 255) # Warm window light!
                
        # E. Closest Bush layer (Layer 3, Darkest green bushes, y = 195 to 208)
        bush_h = 198 + int(3 * math.sin(x / 5.0) + 2 * math.cos(x / 3.0))
        if y >= bush_h and y < 208:
            color = (80, 125, 115, 255)

        bg_pixels.append(color)

write_png(320, 240, bg_pixels, "public/assets/background.png")

# ==============================================================================
# 6. LAUNCHER ICONS (56x56 and 112x112 pixels for KaiOS/FFOS)
# ==============================================================================
def make_icon(size):
    scale = 2 if size == 56 else 4
    pad_x = (size - 24 * scale) // 2
    pad_y = (size - 16 * scale) // 2
    pixels = []
    for y in range(size):
        for x in range(size):
            bx = (x - pad_x) // scale
            by = (y - pad_y) // scale
            if 0 <= bx < 24 and 0 <= by < 16:
                char = bird_frame_0[by][bx]
                color = bird_colors.get(char, (135, 206, 250, 255))
                if color == (0, 0, 0, 0):
                    color = (135, 206, 250, 255)
            else:
                color = (135, 206, 250, 255)
            pixels.append(color)
    return pixels

write_png(56, 56, make_icon(56), "public/assets/icon_56.png")
write_png(112, 112, make_icon(112), "public/assets/icon_112.png")

print("Assets successfully generated via Python!")
