# Mars Builder — 画像素材

生成方法: 内蔵 image_gen。既存原本を保持し、表示用WebPへ縮小・形式変換。

- public/assets/mars-surface.webp: 今回生成した架空の火星地形。科学地図ではありません。
- public/assets/mars-texture.webp: 今回生成した惑星表面テクスチャ。科学地図ではありません。
- public/assets/colony.webp: チーム提供の「火星建造物イメージ1.png」を表示用に変換。共有元はリポジトリの assets/images/1.png。
- public/assets/construction-story.webp: チーム提供の「火星建造物イメージ3.png」を表示用に変換（映像差し替え用）。共有元はリポジトリの assets/images/3.png。
- public/models/*.glb: src/models.mjs から作成したデモ3Dモデル。
- public/models/*.png: 実際のGLBをブラウザでレンダリングしたプレビュー。

## 地形の生成プロンプト

Create a photorealistic orbital aerial view of an empty Martian landscape, for a dark cinematic land-selection map in a premium mobile app. Wide landscape 16:9. Looking obliquely down at red ochre desert at golden dusk: rugged low crater rim in the upper left, dry river ridges at top, broad flat gently sloping clear dusty plain across the middle and foreground where three land parcels will later be overlaid in code. The empty buildable plain occupies 65% of image. Fine rocks, long subtle shadows, detailed geological terrain, restrained warm rusty oranges and brown. NO buildings, NO people, NO roads, NO symbols, NO text, NO lettering, NO UI, NO outlined parcels. Full-bleed environment asset only. High-end cinematic realism, ground texture not generic abstract noise.

## 惑星表面の生成プロンプト

Use case: stylized-concept. Create a realistic Mars planetary surface TEXTURE MAP for wrapping a 3D sphere in a premium space app. Rectangular 2:1 equirectangular full-surface projection, no perspective, no horizon, no globe shape. Seamless left and right edges. Realistic dusty terracotta, rusty iron-red, copper and pale ochre terrain, broad darker volcanic plains and a natural network of craters and dramatic long canyon systems. Small off-white polar frost at the far top and bottom edges. Rich natural geographic detail at multiple scales, subtle fine rock texture. Uniform diffuse lighting with NO cast shadows, NO gloss, NO stars, NO black background, NO text, NO labels, NO borders, NO watermarks. It is a visually believable artistic Mars texture for a fictional 2036 prototype, not a scientific map.
