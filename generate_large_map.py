import json

# 120x168 크기의 맵 생성
width = 120
height = 168
tile_size = 32

# 기본 타일 타입 정의
GRASS_LIGHT = [0, 1, 2, 3]
GRASS_DARK = [16, 17, 18, 19]
FOREST = [32, 33, 34, 35]
SAND = [96, 97, 98, 99]
WATER = [80, 81, 82, 83]
MOUNTAIN = [192, 193, 194, 195]
DIRT = [128, 129, 130]

# 맵 데이터 초기화
map_data = []

for y in range(height):
    row = []
    for x in range(width):
        # 중심으로부터의 거리 계산
        center_x = width / 2
        center_y = height / 2
        dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
        
        # 거리에 따라 다른 타일 배치
        if dist > 80:
            # 외곽: 물
            row.append(WATER[0])
        elif dist > 75:
            # 해변: 모래
            row.append(SAND[0])
        elif dist > 55:
            # 외곽 지대: 어두운 풀/숲
            if (x + y) % 3 == 0:
                row.append(FOREST[0])
            else:
                row.append(GRASS_DARK[0])
        elif dist > 35:
            # 중간 지대: 밝은 풀
            if (x * y) % 7 == 0:
                row.append(GRASS_DARK[0])
            else:
                row.append(GRASS_LIGHT[0])
        else:
            # 중앙: 안전 지대 (밝은 풀)
            row.append(GRASS_LIGHT[0])
    
    map_data.append(row)

# JSON 형식으로 저장
map_json = {
    "width": width,
    "height": height,
    "tileSize": tile_size,
    "mapData": map_data,
    "collisionTiles": WATER + MOUNTAIN
}

# 파일 저장
with open('default_map.json', 'w') as f:
    json.dump(map_json, f, indent=2)

print(f"✅ {width}x{height} 맵 생성 완료!")
print(f"📦 파일: default_map.json")
print(f"📏 타일 크기: {tile_size}px")
print(f"🌍 총 크기: {width * tile_size}x{height * tile_size}px")
