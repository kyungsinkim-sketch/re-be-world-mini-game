#!/usr/bin/env python3
"""
작은 맵을 더 큰 맵으로 확장 (패턴 복제 + 변형)
"""

import json
import random
import sys

def expand_map(input_json, output_json, target_width=40, target_height=40):
    """
    기존 맵을 더 큰 맵으로 확장
    
    Args:
        input_json: 입력 맵 JSON 파일
        output_json: 출력 맵 JSON 파일
        target_width: 목표 맵 너비
        target_height: 목표 맵 높이
    """
    
    # 원본 맵 로드
    with open(input_json, 'r', encoding='utf-8') as f:
        original_map = json.load(f)
    
    orig_width = original_map['width']
    orig_height = original_map['height']
    orig_data = original_map['mapData']
    
    print(f"📌 원본 맵 크기: {orig_width}x{orig_height}")
    print(f"📌 목표 맵 크기: {target_width}x{target_height}")
    
    # 새 맵 데이터 생성
    new_map_data = []
    
    for y in range(target_height):
        row = []
        for x in range(target_width):
            # 원본 맵에서 타일 선택 (반복 패턴)
            orig_x = x % orig_width
            orig_y = y % orig_height
            
            tile = orig_data[orig_y][orig_x]
            
            # 약간의 변형 추가 (5% 확률로 주변 타일로 변경)
            if random.random() < 0.05:
                tile = add_variation(tile)
            
            row.append(tile)
        
        new_map_data.append(row)
        if (y + 1) % 5 == 0:
            print(f"✓ 진행: {y+1}/{target_height} 행 완료 ({int((y+1)/target_height*100)}%)")
    
    # 새 맵 JSON 생성
    new_map = {
        "width": target_width,
        "height": target_height,
        "tileSize": original_map.get('tileSize', 64),
        "mapData": new_map_data,
        "collisionTiles": original_map.get('collisionTiles', [80, 81, 82, 83, 192, 193, 194, 195]),
        "source": f"expanded from {input_json}"
    }
    
    # JSON 파일 저장
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(new_map, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 확장된 맵 생성 완료: {output_json}")
    print(f"   맵 크기: {target_width}x{target_height}")
    print(f"   총 타일: {target_width * target_height}")
    
    # 타일 통계
    tile_counts = {}
    for row in new_map_data:
        for tile in row:
            tile_counts[tile] = tile_counts.get(tile, 0) + 1
    
    print(f"\n📊 타일 사용 통계:")
    for tile_idx in sorted(tile_counts.keys()):
        count = tile_counts[tile_idx]
        percentage = (count / (target_width * target_height)) * 100
        print(f"   타일 {tile_idx:3d}: {count:5d}개 ({percentage:5.1f}%)")
    
    return new_map


def add_variation(tile):
    """
    타일에 약간의 변형 추가 (같은 테마 내에서)
    """
    
    # 풀 계열 (1, 61, 154)
    if tile in [1, 61, 154]:
        return random.choice([1, 1, 1, 61, 154])  # 풀이 더 많이 나오도록
    
    # 땅 계열 (25, 48, 46)
    elif tile in [25, 48, 46]:
        return random.choice([25, 48, 46])
    
    # 사막/돌 계열 (176, 177, 193)
    elif tile in [176, 177, 193]:
        return random.choice([176, 177, 193])
    
    # 물 계열 (250, 253)
    elif tile in [250, 253]:
        return random.choice([250, 253])
    
    # 눈 계열 (3)
    elif tile == 3:
        return random.choice([3, 3, 1])  # 가끔 풀로
    
    # 기타
    else:
        return tile


if __name__ == '__main__':
    random.seed(42)  # 재현 가능한 랜덤
    
    # 11x16 맵을 40x40으로 확장
    expand_map('large_world_map.json', 'expanded_world_map_40x40.json', 40, 40)
    
    # 50x50 버전도 생성
    expand_map('large_world_map.json', 'expanded_world_map_50x50.json', 50, 50)
    
    # 60x60 버전 (정말 큰 맵)
    expand_map('large_world_map.json', 'expanded_world_map_60x60.json', 60, 60)
    
    print("\n✨ 모든 맵 생성 완료!")
    print("\n💡 사용 방법:")
    print("   1. 원하는 맵 파일을 'default_map.json'으로 복사")
    print("   2. map-editor/index.html을 브라우저에서 열기")
    print("   3. 생성된 맵이 자동으로 로드됩니다!")
