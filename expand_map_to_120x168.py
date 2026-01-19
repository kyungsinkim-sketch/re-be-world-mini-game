import json

# 원본 맵 로드
with open('assets/default_map.json', 'r') as f:
    original_map = json.load(f)

original_width = original_map['width']  # 13
original_height = original_map['height']  # 19
original_data = original_map['mapData']

# 새로운 맵 설정
new_width = 120
new_height = 168
new_tile_size = 32

print(f"원본 맵: {original_width}x{original_height} (64px 타일)")
print(f"새 맵: {new_width}x{new_height} (32px 타일)")

# 원본 맵을 중앙에 배치하고 나머지는 풀 타일(0)로 채우기
center_x = (new_width - original_width) // 2
center_y = (new_height - original_height) // 2

new_map_data = []

for y in range(new_height):
    row = []
    for x in range(new_width):
        # 원본 맵이 배치되는 영역인지 확인
        orig_x = x - center_x
        orig_y = y - center_y
        
        if 0 <= orig_x < original_width and 0 <= orig_y < original_height:
            # 원본 맵의 타일 사용
            row.append(original_data[orig_y][orig_x])
        else:
            # 외곽은 풀 타일(0)로 채우기
            row.append(0)
    
    new_map_data.append(row)

# 새로운 맵 JSON 생성
new_map = {
    "width": new_width,
    "height": new_height,
    "tileSize": new_tile_size,
    "mapData": new_map_data,
    "collisionTiles": original_map.get('collisionTiles', [80, 81, 82, 83, 192, 193, 194, 195]),
    "source": "Expanded from 13x19 original map"
}

# 저장
with open('default_map.json', 'w') as f:
    json.dump(new_map, f, indent=2)

print(f"✅ 맵 확장 완료!")
print(f"📦 파일: default_map.json")
print(f"📏 새 크기: {new_width}x{new_height} (타일 크기: {new_tile_size}px)")
print(f"🎯 원본 맵 위치: 중앙 ({center_x}, {center_y})")
print(f"🌍 총 맵 크기: {new_width * new_tile_size}x{new_height * new_tile_size}px")
