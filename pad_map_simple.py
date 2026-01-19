import json

# 원본 맵 로드
with open('assets/default_map.json', 'r') as f:
    original_map = json.load(f)

original_width = original_map['width']  # 13
original_height = original_map['height']  # 19
original_tile_size = original_map['tileSize']  # 64
original_data = original_map['mapData']

print(f"📋 원본 맵: {original_width}x{original_height} (타일 크기: {original_tile_size}px)")

# 새 맵 설정 - 원본 타일 크기 유지
new_width = 120
new_height = 168
new_tile_size = original_tile_size  # 64px 유지!

print(f"🎯 목표: {new_width}x{new_height} (타일 크기: {new_tile_size}px)")

# 원본 맵을 중앙에 배치
center_x = (new_width - original_width) // 2
center_y = (new_height - original_height) // 2

print(f"📍 원본 맵 배치 위치: ({center_x}, {center_y})")

# 새 맵 데이터 생성
new_map_data = []

# 기본 타일 (풀 타일 0)
default_tile = 0

for y in range(new_height):
    row = []
    for x in range(new_width):
        # 원본 맵 영역 확인
        orig_x = x - center_x
        orig_y = y - center_y
        
        if 0 <= orig_x < original_width and 0 <= orig_y < original_height:
            # 원본 맵의 타일 사용
            row.append(original_data[orig_y][orig_x])
        else:
            # 외곽은 기본 타일
            row.append(default_tile)
    
    new_map_data.append(row)

# 새 맵 JSON 생성
new_map = {
    "width": new_width,
    "height": new_height,
    "tileSize": new_tile_size,
    "mapData": new_map_data,
    "collisionTiles": original_map.get('collisionTiles', [80, 81, 82, 83, 192, 193, 194, 195]),
    "source": "Padded from 13x19 original map (64px tiles)"
}

# 저장
with open('default_map.json', 'w') as f:
    json.dump(new_map, f, indent=2)

print(f"\n✅ 맵 확장 완료!")
print(f"📦 파일: default_map.json")
print(f"📏 크기: {new_width}x{new_height} (타일 크기: {new_tile_size}px)")
print(f"🎯 원본 위치: 중앙 ({center_x}, {center_y})")
print(f"🌍 총 픽셀 크기: {new_width * new_tile_size}x{new_height * new_tile_size}px")
