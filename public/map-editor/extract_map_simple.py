#!/usr/bin/env python3
"""
업로드된 맵 이미지를 분석하여 큰 맵 데이터 생성 (색상 기반 매핑)
"""

from PIL import Image
import json
import os
import sys

def get_dominant_color(tile):
    """타일의 지배적인 색상 반환"""
    pixels = list(tile.getdata())
    
    if not pixels:
        return (0, 0, 0)
    
    # RGB 평균
    avg_r = sum(p[0] if isinstance(p, tuple) else p for p in pixels) / len(pixels)
    avg_g = sum(p[1] if isinstance(p, tuple) else 0 for p in pixels) / len(pixels)
    avg_b = sum(p[2] if isinstance(p, tuple) else 0 for p in pixels) / len(pixels)
    
    return (int(avg_r), int(avg_g), int(avg_b))


def color_to_tile_index(r, g, b):
    """
    색상을 기반으로 타일 인덱스 반환
    Re-Be World 타일셋 매핑
    """
    
    # 밝기 계산
    brightness = (r + g + b) / 3
    
    # 파란색 계열 -> 물
    if b > 120 and b > r + 30 and b > g + 20:
        if brightness > 180:
            return 253  # 밝은 물
        elif brightness > 120:
            return 253  # 일반 물
        else:
            return 250  # 어두운 물
    
    # 흰색/회색 계열 -> 눈/얼음
    elif r > 200 and g > 200 and b > 200:
        return 3  # 눈
    elif brightness > 180 and abs(r - g) < 20 and abs(g - b) < 20:
        return 3  # 밝은 눈
    
    # 초록색 계열 -> 풀/나무
    elif g > 80 and g > r * 1.1 and g > b * 1.1:
        if g > 120:
            return 1  # 밝은 풀
        elif r < 60:
            return 61  # 진한 풀/나무
        else:
            return 1  # 일반 풀
    
    # 빨강/갈색 계열 -> 사막/돌
    elif r > 130 and r > g * 1.2:
        if r > 180 and g < 120:
            return 177  # 붉은 사막/절벽
        elif brightness < 100:
            return 193  # 어두운 돌
        else:
            return 176  # 밝은 사막
    
    # 갈색 계열 -> 흙/땅
    elif r > 80 and g > 60 and b < 80:
        if brightness > 120:
            return 25  # 밝은 땅
        else:
            return 48  # 어두운 흙
    
    # 노란색 계열 -> 사막/모래
    elif r > 140 and g > 120 and b < 100:
        return 46  # 사막/모래
    
    # 어두운 초록/갈색 -> 숲
    elif g > 60 and r > 40 and brightness < 100:
        return 154  # 숲/나무
    
    # 매우 어두움 -> 돌/바위
    elif brightness < 60:
        return 193  # 돌
    
    # 기본 타일 (풀)
    else:
        return 1


def extract_map_simple(image_path, tile_size=64, output_json='large_world_map.json'):
    """
    이미지를 색상 기반으로 빠르게 분석하여 맵 데이터 생성
    """
    
    # 이미지 열기
    img = Image.open(image_path).convert('RGB')
    width, height = img.size
    
    print(f"📌 이미지 크기: {width}x{height} 픽셀")
    
    # 타일 개수 계산
    tiles_x = width // tile_size
    tiles_y = height // tile_size
    
    print(f"📌 타일 개수: {tiles_x}x{tiles_y} = {tiles_x * tiles_y} 타일")
    
    # 맵 데이터 생성
    map_data = []
    
    for y in range(tiles_y):
        row = []
        for x in range(tiles_x):
            # 현재 타일 영역 추출
            left = x * tile_size
            top = y * tile_size
            right = left + tile_size
            bottom = top + tile_size
            
            current_tile = img.crop((left, top, right, bottom))
            
            # 지배적 색상 추출
            r, g, b = get_dominant_color(current_tile)
            
            # 색상을 타일 인덱스로 변환
            tile_index = color_to_tile_index(r, g, b)
            
            row.append(tile_index)
            
        map_data.append(row)
        print(f"✓ 진행: {y+1}/{tiles_y} 행 완료 ({int((y+1)/tiles_y*100)}%)")
    
    # JSON 데이터 생성
    output_data = {
        "width": tiles_x,
        "height": tiles_y,
        "tileSize": tile_size,
        "mapData": map_data,
        "collisionTiles": [80, 81, 82, 83, 192, 193, 194, 195],
        "source": "extracted from uploaded image (color-based mapping)"
    }
    
    # JSON 파일 저장
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 맵 데이터 생성 완료: {output_json}")
    print(f"   맵 크기: {tiles_x}x{tiles_y}")
    print(f"   총 타일: {tiles_x * tiles_y}")
    
    # 맵 데이터 미리보기
    print(f"\n📊 타일 사용 통계:")
    tile_counts = {}
    for row in map_data:
        for tile in row:
            tile_counts[tile] = tile_counts.get(tile, 0) + 1
    
    for tile_idx in sorted(tile_counts.keys()):
        count = tile_counts[tile_idx]
        percentage = (count / (tiles_x * tiles_y)) * 100
        print(f"   타일 {tile_idx:3d}: {count:4d}개 ({percentage:5.1f}%)")
    
    return output_data


if __name__ == '__main__':
    # 업로드된 이미지 경로
    uploaded_image = '/Users/pablo/.gemini/antigravity/brain/a170b7fc-b5ba-49e1-b503-9185c6b5a2d9/uploaded_image_1767141667487.jpg'
    
    if not os.path.exists(uploaded_image):
        print(f"❌ 오류: 이미지를 찾을 수 없습니다: {uploaded_image}")
        sys.exit(1)
    
    # 타일 크기 64x64로 맵 추출
    extract_map_simple(uploaded_image, tile_size=64, output_json='large_world_map.json')
    
    print("\n✨ 완료! 'large_world_map.json' 파일을 map-editor 폴더의 default_map.json으로 복사하면 기본 맵으로 사용할 수 있습니다.")
