import json
from PIL import Image
import numpy as np

# 설정
map_image_path = "assets/world_map_original.jpg"
tileset_path = "assets/New_Tileset.png"
target_width = 120
target_height = 168
tile_size = 32

print("🖼️ 이미지 로딩 중...")
map_img = Image.open(map_image_path).convert('RGB')
tileset_img = Image.open(tileset_path).convert('RGB')

print(f"📐 원본 맵 이미지: {map_img.size}")
print(f"📐 타일셋 이미지: {tileset_img.size}")

# 목표 픽셀 크기
target_pixel_width = target_width * tile_size  # 3840
target_pixel_height = target_height * tile_size  # 5376

# 맵 이미지를 정확한 크기로 리사이즈
print(f"🔄 맵을 {target_pixel_width}x{target_pixel_height}px로 리사이즈 중...")
map_img = map_img.resize((target_pixel_width, target_pixel_height), Image.Resampling.LANCZOS)
map_array = np.array(map_img)

# 타일셋 분석
tiles_per_row = tileset_img.width // tile_size
tiles_per_col = tileset_img.height // tile_size
print(f"🎨 타일셋 분석: {tiles_per_row}x{tiles_per_col} = {tiles_per_row * tiles_per_col}개 타일")

# 타일셋에서 타일 추출 및 색상 평균 미리 계산
print("📦 타일 추출 중...")
tileset_array = np.array(tileset_img)
tile_averages = []

for row in range(tiles_per_col):
    for col in range(tiles_per_row):
        x = col * tile_size
        y = row * tile_size
        tile = tileset_array[y:y+tile_size, x:x+tile_size]
        avg_color = tile.mean(axis=(0, 1))
        tile_averages.append(avg_color)

tile_averages = np.array(tile_averages)
print(f"✅ {len(tile_averages)}개 타일 준비 완료")

# 맵을 타일로 변환 (배치 처리로 최적화)
print("🔄 맵 변환 중...")
map_data = []

for y in range(target_height):
    row = []
    for x in range(target_width):
        # 현재 타일의 평균 색상 계산
        px = x * tile_size
        py = y * tile_size
        tile_region = map_array[py:py+tile_size, px:px+tile_size]
        avg_color = tile_region.mean(axis=(0, 1))
        
        # 가장 유사한 타일 인덱스 찾기 (벡터화)
        diffs = np.sum((tile_averages - avg_color) ** 2, axis=1)
        best_match = int(np.argmin(diffs))
        row.append(best_match)
    
    map_data.append(row)
    
    if (y + 1) % 20 == 0:
        print(f"  진행: {y + 1}/{target_height} 행 ({(y+1)/target_height*100:.1f}%)")

# JSON 저장
print("💾 JSON 저장 중...")
output = {
    "width": target_width,
    "height": target_height,
    "tileSize": tile_size,
    "mapData": map_data,
    "collisionTiles": [80, 81, 82, 83, 192, 193, 194, 195],
    "source": "Converted from world_map_original.jpg"
}

with open("default_map.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\n✅ 변환 완료!")
print(f"📦 파일: default_map.json")
print(f"📏 맵: {target_width}x{target_height} 타일 ({tile_size}px)")
print(f"🌍 총 크기: {target_pixel_width}x{target_pixel_height}px")
