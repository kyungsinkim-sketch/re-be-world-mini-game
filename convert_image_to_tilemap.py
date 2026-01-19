import json
from PIL import Image
import numpy as np

# 원본 맵 이미지 로드
map_image_path = "../map-editor/Generated Image December 30, 2025 - 3_48PM.jpeg"
tileset_path = "../map-editor/New_Tileset.png"

print("🖼️ 이미지 로딩 중...")
map_img = Image.open(map_image_path)
tileset_img = Image.open(tileset_path)

print(f"📐 원본 맵 이미지 크기: {map_img.size}")
print(f"📐 타일셋 이미지 크기: {tileset_img.size}")

# 목표 설정
target_width = 120
target_height = 168
tile_size = 32

# 맵 이미지를 목표 크기로 리사이즈
target_pixel_width = target_width * tile_size  # 3840
target_pixel_height = target_height * tile_size  # 5376

print(f"🎯 목표 맵 크기: {target_pixel_width}x{target_pixel_height}px ({target_width}x{target_height} 타일)")

# 맵 이미지 리사이즈 (비율 유지하면서 확대/축소)
map_img_resized = map_img.resize((target_pixel_width, target_pixel_height), Image.Resampling.LANCZOS)
map_img_resized.save("resized_map.png")
print(f"✅ 리사이즈된 맵 저장: resized_map.png")

# 타일셋 분석 (16x16 타일셋 가정)
tiles_per_row = tileset_img.width // tile_size
tiles_per_col = tileset_img.height // tile_size
print(f"🎨 타일셋: {tiles_per_row}x{tiles_per_col} ({tiles_per_row * tiles_per_col}개 타일)")

# 타일셋에서 각 타일 추출
tileset_array = np.array(tileset_img)
tiles = {}
tile_index = 0

for row in range(tiles_per_col):
    for col in range(tiles_per_row):
        x = col * tile_size
        y = row * tile_size
        tile = tileset_array[y:y+tile_size, x:x+tile_size]
        tiles[tile_index] = tile
        tile_index += 1

print(f"✅ {len(tiles)}개 타일 추출 완료")

# 맵 이미지를 타일로 변환
map_array = np.array(map_img_resized)
map_data = []

print("🔄 맵을 타일로 변환 중...")
for y in range(target_height):
    row = []
    for x in range(target_width):
        # 현재 위치의 타일 추출
        px = x * tile_size
        py = y * tile_size
        current_tile = map_array[py:py+tile_size, px:px+tile_size]
        
        # 가장 유사한 타일 찾기 (간단한 색상 평균 비교)
        current_avg = current_tile.mean(axis=(0, 1))
        
        best_match = 0
        best_diff = float('inf')
        
        for tile_idx, tile in tiles.items():
            tile_avg = tile.mean(axis=(0, 1))
            diff = np.sum((current_avg - tile_avg) ** 2)
            
            if diff < best_diff:
                best_diff = diff
                best_match = tile_idx
        
        row.append(int(best_match))
    
    map_data.append(row)
    if (y + 1) % 10 == 0:
        print(f"  진행: {y + 1}/{target_height} 행")

# JSON 저장
output = {
    "width": target_width,
    "height": target_height,
    "tileSize": tile_size,
    "mapData": map_data,
    "collisionTiles": [80, 81, 82, 83, 192, 193, 194, 195],
    "source": "Converted from map image"
}

with open("default_map.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\n✅ 변환 완료!")
print(f"📦 파일: default_map.json")
print(f"📏 맵 크기: {target_width}x{target_height} (타일 크기: {tile_size}px)")
print(f"🌍 총 픽셀 크기: {target_pixel_width}x{target_pixel_height}px")
