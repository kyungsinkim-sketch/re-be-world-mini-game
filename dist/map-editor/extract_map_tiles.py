#!/usr/bin/env python3
"""
업로드된 맵 이미지를 64x64 타일로 분석하여 맵 데이터 JSON 생성
"""

from PIL import Image
import json
import os
import sys

def extract_map_from_image(image_path, tile_size=64, output_json='extracted_map.json'):
    """
    이미지를 타일 단위로 분석하여 맵 데이터 생성
    
    Args:
        image_path: 입력 이미지 경로
        tile_size: 타일 크기 (기본 64x64)
        output_json: 출력 JSON 파일명
    """
    
    # 이미지 열기
    img = Image.open(image_path)
    width, height = img.size
    
    print(f"📌 이미지 크기: {width}x{height} 픽셀")
    
    # 타일 개수 계산
    tiles_x = width // tile_size
    tiles_y = height // tile_size
    
    print(f"📌 타일 개수: {tiles_x}x{tiles_y} = {tiles_x * tiles_y} 타일")
    
    # 타일셋 로드 (기존 타일셋과 비교하기 위해)
    tileset_path = 'New_Tileset.png'
    tileset = None
    tile_cache = {}
    
    if os.path.exists(tileset_path):
        tileset = Image.open(tileset_path)
        tileset_width = tileset.width // tile_size
        print(f"📌 타일셋 로드: {tileset.width}x{tileset.height}, {tileset_width}개/행")
        
        # 타일셋의 모든 타일 캐시
        for idx in range(256):  # 16x16 타일셋
            tx = (idx % 16) * tile_size
            ty = (idx // 16) * tile_size
            tile_img = tileset.crop((tx, ty, tx + tile_size, ty + tile_size))
            tile_cache[idx] = tile_img
    
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
            
            # 타일셋과 비교하여 가장 유사한 타일 찾기
            best_match = 0
            best_similarity = -1
            
            if tileset and tile_cache:
                for tile_idx, cached_tile in tile_cache.items():
                    similarity = compare_tiles(current_tile, cached_tile)
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_match = tile_idx
            else:
                # 타일셋이 없으면 색상 기반으로 추정
                best_match = estimate_tile_from_color(current_tile)
            
            row.append(best_match)
            
        map_data.append(row)
        print(f"진행: {y+1}/{tiles_y} 행 완료")
    
    # JSON 데이터 생성
    output_data = {
        "width": tiles_x,
        "height": tiles_y,
        "tileSize": tile_size,
        "mapData": map_data,
        "collisionTiles": [80, 81, 82, 83, 192, 193, 194, 195],
        "source": "extracted from uploaded image"
    }
    
    # JSON 파일 저장
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 맵 데이터 생성 완료: {output_json}")
    print(f"   맵 크기: {tiles_x}x{tiles_y}")
    print(f"   총 타일: {tiles_x * tiles_y}")
    
    return output_data


def compare_tiles(tile1, tile2):
    """
    두 타일의 유사도 계산 (0.0 ~ 1.0) - 최적화 버전
    """
    # 크기를 1/4로 축소하여 비교 (빠른 처리)
    size = tile1.size
    small_size = (size[0] // 4, size[1] // 4)
    
    tile1_small = tile1.resize(small_size, Image.Resampling.NEAREST)
    tile2_small = tile2.resize(small_size, Image.Resampling.NEAREST)
    
    pixels1 = list(tile1_small.getdata())
    pixels2 = list(tile2_small.getdata())
    
    if len(pixels1) != len(pixels2):
        return 0.0
    
    total_diff = 0
    for p1, p2 in zip(pixels1, pixels2):
        if isinstance(p1, tuple) and isinstance(p2, tuple):
            # RGB 차이
            diff = sum(abs(c1 - c2) for c1, c2 in zip(p1[:3], p2[:3]))
            total_diff += diff
        else:
            # 단일 값
            total_diff += abs(p1 - p2)
    
    # 정규화 (0 ~ 1)
    max_diff = len(pixels1) * 255 * 3  # RGB
    similarity = 1.0 - (total_diff / max_diff)
    
    return similarity


def estimate_tile_from_color(tile):
    """
    타일의 평균 색상을 기반으로 타일 인덱스 추정
    """
    # 평균 색상 계산
    pixels = list(tile.getdata())
    
    if not pixels:
        return 0
    
    # RGB 평균
    avg_r = sum(p[0] if isinstance(p, tuple) else p for p in pixels) / len(pixels)
    avg_g = sum(p[1] if isinstance(p, tuple) else 0 for p in pixels) / len(pixels)
    avg_b = sum(p[2] if isinstance(p, tuple) else 0 for p in pixels) / len(pixels)
    
    # 색상 기반 타일 매핑 (간단한 휴리스틱)
    # 초록 -> 풀, 파랑 -> 물, 노랑/갈색 -> 땅, 흰색 -> 눈
    if avg_b > 150 and avg_b > avg_r and avg_b > avg_g:
        return 253  # 물
    elif avg_g > 120 and avg_g > avg_r * 1.2:
        return 1  # 풀
    elif avg_r > 200 and avg_g > 200 and avg_b > 200:
        return 3  # 눈/얼음
    elif avg_r > 150 and avg_g < 100:
        return 177  # 사막/돌
    elif avg_r > 100 and avg_g > 80 and avg_b < 60:
        return 25  # 땅
    else:
        return 0  # 기본


if __name__ == '__main__':
    # 업로드된 이미지 경로
    uploaded_image = '/Users/pablo/.gemini/antigravity/brain/a170b7fc-b5ba-49e1-b503-9185c6b5a2d9/uploaded_image_1767141667487.jpg'
    
    if not os.path.exists(uploaded_image):
        print(f"❌ 오류: 이미지를 찾을 수 없습니다: {uploaded_image}")
        sys.exit(1)
    
    # 타일 크기 64x64로 맵 추출
    extract_map_from_image(uploaded_image, tile_size=64, output_json='large_world_map.json')
    
    print("\n✨ 완료! 'large_world_map.json' 파일을 확인하세요.")
