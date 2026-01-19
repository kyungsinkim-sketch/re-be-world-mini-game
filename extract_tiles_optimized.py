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
print(f"📐 원본 크기: {map_img.size}")

# 목표 픽셀 크기로 리사이즈
target_pixel_width = target_width * tile_size  # 7680
target_pixel_height = target_height * tile_size  # 10752

print(f"🔄 {target_pixel_width}x{target_pixel_height}px로 리사이즈 중...")
map_img = map_img.resize((target_pixel_width, target_pixel_height), Image.Resampling.LANCZOS)

# 타일셋 크기 계산 (16열 기준)
tiles_per_row = 16
total_tiles = target_width * target_height  # 20160 타일
tileset_rows = (total_tiles + tiles_per_row - 1) // tiles_per_row  # 1260 행

tileset_width = tiles_per_row * tile_size  # 1024
tileset_height = tileset_rows * tile_size

print(f"🎨 타일셋 생성: {tileset_width}x{tileset_height}px")
print(f"   ({tiles_per_row}x{tileset_rows} = {total_tiles}개 타일)")

# 새 타일셋 이미지 생성
tileset_img = Image.new('RGB', (tileset_width, tileset_height), color=(0, 0, 0))

# 맵 데이터 초기화
map_data = []
tile_index = 0

print("✂️ 타일 추출 및 배치 중...")

for map_y in range(target_height):
    row = []
    for map_x in range(target_width):
        # 맵에서 타일 추출
        px = map_x * tile_size
        py = map_y * tile_size
        tile = map_img.crop((px, py, px + tile_size, py + tile_size))
        
        # 타일셋에 배치
        tileset_x = (tile_index % tiles_per_row) * tile_size
        tileset_y = (tile_index // tiles_per_row) * tile_size
        tileset_img.paste(tile, (tileset_x, tileset_y))
        
        # 맵 데이터에 타일 인덱스 저장
        row.append(tile_index)
        tile_index += 1
    
    map_data.append(row)
    
    if (map_y + 1) % 20 == 0:
        print(f"  진행: {map_y + 1}/{target_height} 행 ({(map_y+1)/target_height*100:.1f}%)")

# 타일셋 저장 (최적화 옵션 사용)
tileset_output = "assets/Generated_Tileset.png"
print(f"💾 타일셋 저장 중 (압축 최적화)...")
tileset_img.save(tileset_output, optimize=True, quality=85)
print(f"✅ 타일셋 저장: {tileset_output}")

# 파일 크기 확인
file_size = os.path.getsize(tileset_output) / (1024 * 1024)
print(f"📦 타일셋 파일 크기: {file_size:.2f} MB")

# 맵 JSON 저장
map_json = {
    "width": target_width,
    "height": target_height,
    "tileSize": tile_size,
    "mapData": map_data,
    "collisionTiles": [],
    "tilesetImage": "Generated_Tileset.png",
    "source": "Direct tile extraction from world map image"
}

with open("default_map.json", "w") as f:
    json.dump(map_json, f, indent=2)

print(f"\n✅ 변환 완료!")
print(f"📦 맵 파일: default_map.json")
print(f"🎨 타일셋: {tileset_output} ({file_size:.2f} MB)")
print(f"📏 맵: {target_width}x{target_height} (타일 크기: {tile_size}px)")
print(f"🌍 총 픽셀: {target_pixel_width}x{target_pixel_height}px")
print(f"🔢 총 타일: {total_tiles}개")
