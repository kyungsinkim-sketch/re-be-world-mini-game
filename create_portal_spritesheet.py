from PIL import Image
import os

images = [
    "/Users/pablo/.gemini/antigravity/brain/d1e25c0f-b36b-4c19-a5fd-79edca32568a/uploaded_image_0_1767413873086.png",
    "/Users/pablo/.gemini/antigravity/brain/d1e25c0f-b36b-4c19-a5fd-79edca32568a/uploaded_image_1_1767413873086.png",
    "/Users/pablo/.gemini/antigravity/brain/d1e25c0f-b36b-4c19-a5fd-79edca32568a/uploaded_image_2_1767413873086.png",
    "/Users/pablo/.gemini/antigravity/brain/d1e25c0f-b36b-4c19-a5fd-79edca32568a/uploaded_image_3_1767413873086.png",
    "/Users/pablo/.gemini/antigravity/brain/d1e25c0f-b36b-4c19-a5fd-79edca32568a/uploaded_image_4_1767413873086.png"
]

processed_frames = []
for img_path in images:
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Check if the pixel is black (allowing some tolerance)
        if item[0] < 10 and item[1] < 10 and item[2] < 10:
            newData.append((0, 0, 0, 0)) # Fully transparent
        else:
            newData.append(item)
    
    img.putdata(newData)
    processed_frames.append(img)

# Combine into spritesheet
width, height = processed_frames[0].size
spritesheet = Image.new("RGBA", (width * len(processed_frames), height))

for i, frame in enumerate(processed_frames):
    spritesheet.paste(frame, (i * width, 0))

output_path = "/Users/pablo/Paulus.ai/Re-Be World Mini Game/game/assets/new_portal_spritesheet.png"
spritesheet.save(output_path)
print(f"Spritesheet saved to {output_path} with size {width}x{height}")
