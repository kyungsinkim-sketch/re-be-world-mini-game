#!/usr/bin/env python3
"""
이미지를 타일로 분할하여 타일셋과 맵 데이터 생성
"""

from PIL import Image
import json
import os
import sys
import math

def create_tileset_and_map(image_path, tile_size=64, output_tileset='custom_tileset.png', output_map='custom_map.json'):
    """
    이미지를 타일로 분할하여 타일셋과 맵 데이터 생성
    
    Args:
        image_path: 입력 이미지 경로
        tile_size: 타일 크기 (기본 64x64)
        output_tileset: 출력 타일셋 이미지 파일명
        output_map: 출력 맵 JSON 파일명
    """
    
    # 이미지 열기
    img = Image.open(image_path).convert('RGBA')
    width, height = img.size
    
    print(f"📌 원본 이미지 크기: {width}x{height} 픽셀")
    
    # 타일 개수 계산
    tiles_x = width // tile_size
    tiles_y = height // tile_size
    
    print(f"📌 타일 개수: {tiles_x}x{tiles_y} = {tiles_x * tiles_y} 타일")
    
    # 타일 추출 및 고유 타일 저장
    tile_dict = {}  # 타일 데이터를 키로 사용하여 인덱스 저장
    unique_tiles = []  # 고유한 타일 이미지 리스트
    map_data = []  # 맵 데이터 (타일 인덱스)
    
    for y in range(tiles_y):
        row = []
        for x in range(tiles_x):
            # 타일 추출
            left = x * tile_size
            top = y * tile_size
            right = left + tile_size
            bottom = top + tile_size
            
            tile = img.crop((left, top, right, bottom))
            
            # 타일을 바이트로 변환하여 고유성 확인
            tile_bytes = tile.tobytes()
            
            if tile_bytes not in tile_dict:
                # 새로운 고유 타일
                tile_index = len(unique_tiles)
                tile_dict[tile_bytes] = tile_index
                unique_tiles.append(tile)
                print(f"  새 타일 발견: 인덱스 {tile_index} (위치: {x}, {y})")
            else:
                tile_index = tile_dict[tile_bytes]
            
            row.append(tile_index)
        
        map_data.append(row)
        print(f"✓ 진행: {y+1}/{tiles_y} 행 완료")
    
    print(f"\n📊 고유 타일 개수: {len(unique_tiles)}")
    
    # 타일셋 이미지 생성 (16x16 그리드)
    tiles_per_row = 16
    tileset_rows = math.ceil(len(unique_tiles) / tiles_per_row)
    
    tileset_width = tiles_per_row * tile_size
    tileset_height = tileset_rows * tile_size
    
    tileset_image = Image.new('RGBA', (tileset_width, tileset_height), (0, 0, 0, 0))
    
    for idx, tile in enumerate(unique_tiles):
        tile_x = (idx % tiles_per_row) * tile_size
        tile_y = (idx // tiles_per_row) * tile_size
        tileset_image.paste(tile, (tile_x, tile_y))
    
    # 타일셋 이미지 저장
    tileset_image.save(output_tileset, 'PNG')
    print(f"\n✅ 타일셋 이미지 생성: {output_tileset}")
    print(f"   크기: {tileset_width}x{tileset_height} ({tiles_per_row}x{tileset_rows} 타일)")
    
    # 맵 데이터 JSON 생성
    map_json = {
        "width": tiles_x,
        "height": tiles_y,
        "tileSize": tile_size,
        "mapData": map_data,
        "collisionTiles": [],  # 사용자가 나중에 설정
        "tilesetImage": output_tileset,
        "source": f"generated from {os.path.basename(image_path)}"
    }
    
    with open(output_map, 'w', encoding='utf-8') as f:
        json.dump(map_json, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 맵 데이터 생성: {output_map}")
    print(f"   맵 크기: {tiles_x}x{tiles_y}")
    print(f"   총 타일: {len(unique_tiles)}개의 고유 타일 사용")
    
    return tileset_image, map_json


if __name__ == '__main__':
    # 업로드된 이미지 경로
    uploaded_image = '/Users/pablo/.gemini/antigravity/brain/a170b7fc-b5ba-49e1-b503-9185c6b5a2d9/uploaded_image_1767154546629.jpg'
    
    if not os.path.exists(uploaded_image):
        print(f"❌ 오류: 이미지를 찾을 수 없습니다: {uploaded_image}")
        sys.exit(1)
    
    # 타일셋과 맵 데이터 생성
    create_tileset_and_map(
        uploaded_image, 
        tile_size=64, 
        output_tileset='Re-Be_World_Tileset.png',
        output_map='Re-Be_World_Map.json'
    )
    
    # Assets 폴더에도 복사
    assets_dir = '../Assets'
    if os.path.exists(assets_dir):
        import shutil
        shutil.copy('Re-Be_World_Tileset.png', os.path.join(assets_dir, 'Re-Be_World_Tileset.png'))
        print(f"\n✅ 타일셋을 Assets 폴더에도 복사했습니다")
    
    print("\n✨ 완료!")
    print("💡 다음 단계:")
    print("   1. Re-Be_World_Map.json을 default_map.json으로 복사")
    print("   2. editor.js에서 타일셋 경로를 'Re-Be_World_Tileset.png'로 변경")
    print("   3. 맵 에디터를 새로고침하여 확인")
