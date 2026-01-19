import json
from PIL import Image
import os

# 설정
map_image_path = "assets/world_map_original.jpg"
target_width = 120
target_height = 168
tile_size = 64

print("🖼️ 맵 이미지 로딩...")
map_img = Image.open(map_image_path).convert('RGB')

# 리사이즈
target_pixel_width = target_width * tile_size
target_pixel_height = target_height * tile_size
print(f"🔄 {target_pixel_width}x{target_pixel_height}px로 리사이즈 중...")
map_img = map_img.resize((target_pixel_width, target_pixel_height), Image.Resampling.LANCZOS)

# 타일셋 설정
tiles_per_row = 16
total_tiles = target_width * target_height
tileset_rows = (total_tiles + tiles_per_row - 1) // tiles_per_row

tileset_width = tiles_per_row * tile_size
tileset_height = tileset_rows * tile_size

print(f"🎨 타일셋: {tileset_width}x{tileset_height}px ({total_tiles}개 타일)")

# 타일셋 생성
tileset_img = Image.new('RGB', (tileset_width, tileset_height))
map_data = []
tile_index = 0

print("✂️ 타일 추출 중...")
for map_y in range(target_height):
    row = []
    for map_x in range(target_width):
        px = map_x * tile_size
        py = map_y * tile_size
        tile = map_img.crop((px, py, px + tile_size, py + tile_size))
        
        tileset_x = (tile_index % tiles_per_row) * tile_size
        tileset_y = (tile_index // tiles_per_row) * tile_size
        tileset_img.paste(tile, (tileset_x, tileset_y))
        
        row.append(tile_index)
        tile_index += 1
    map_data.append(row)
    
    if (map_y + 1) % 30 == 0:
        print(f"  {map_y + 1}/{target_height}")

# WebP로 저장 (훨씬 작음)
webp_output = "assets/Generated_Tileset.webp"
print(f"💾 WebP로 저장 중...")
tileset_img.save(webp_output, 'WEBP', quality=90)
webp_size = os.path.getsize(webp_output) / (1024 * 1024)
print(f"✅ WebP: {webp_output} ({webp_size:.2f} MB)")

# PNG도 저장 (백업)
png_output = "assets/Generated_Tileset.png"
tileset_img.save(png_output, 'PNG', optimize=True)
png_size = os.path.getsize(png_output) / (1024 * 1024)
print(f"✅ PNG: {png_output} ({png_size:.2f} MB)")

# 맵 JSON 저장
map_json = {
    "width": target_width,
    "height": target_height,
    "tileSize": tile_size,
    "mapData": map_data,
    "collisionTiles": [],
    "tilesetImage": "Generated_Tileset.png"
}

with open("default_map.json", "w") as f:
    json.dump(map_json, f, indent=2)

print(f"\n✅ 완료!")
print(f"📦 맵: default_map.json")
print(f"🎨 타일셋: {png_output} ({png_size:.2f} MB)")
print(f"💡 WebP 사용 시: {webp_size:.2f} MB (약 {png_size/webp_size:.1f}x 작음)")
