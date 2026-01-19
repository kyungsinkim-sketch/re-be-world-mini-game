from PIL import Image

# 맵 이미지 로드
map_img = Image.open("assets/world_map_original.jpg")

# 120x168 타일 * 64px = 7680x10752px
target_width = 7680
target_height = 10752

print(f"원본 크기: {map_img.size}")
print(f"목표 크기: {target_width}x{target_height}px")

# 리사이즈
resized = map_img.resize((target_width, target_height), Image.Resampling.LANCZOS)

# PNG로 저장 (최적화)
output_path = "assets/World_Map_Background.png"
resized.save(output_path, 'PNG', optimize=True)

import os
file_size = os.path.getsize(output_path) / (1024 * 1024)
print(f"\n✅ 저장 완료: {output_path}")
print(f"📦 파일 크기: {file_size:.2f} MB")
