from PIL import Image
import os

paths = [
    '/Users/pablo/.gemini/antigravity/brain/3c62e2db-ea38-4855-baeb-6c1eb09fa0bb/uploaded_image_0_1767409638105.png',
    '/Users/pablo/.gemini/antigravity/brain/3c62e2db-ea38-4855-baeb-6c1eb09fa0bb/uploaded_image_1_1767409638105.png',
    '/Users/pablo/.gemini/antigravity/brain/3c62e2db-ea38-4855-baeb-6c1eb09fa0bb/uploaded_image_2_1767409638105.png'
]

images = []
for p in paths:
    img = Image.open(p).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # Check if roughly black
        if item[0] < 10 and item[1] < 10 and item[2] < 10:
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    images.append(img)

w, h = images[0].size
spritesheet = Image.new('RGBA', (w, h * 3))
for i, img in enumerate(images):
    spritesheet.paste(img, (0, i * h))

spritesheet.save('/Users/pablo/Paulus.ai/Re-Be World Mini Game/game/assets/portal_spritesheet.png')
print(f"Created spritesheet: {w}x{h*3}, frames: 3")
