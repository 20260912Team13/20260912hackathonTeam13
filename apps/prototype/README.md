# MARS BUILDER — Webプロトタイプ

**Design life on Mars.**

2036年、火星に自分の居場所をつくる体験アプリ。採用されたA案「火星に降り立つ」をもとに、黒と赤土色でまとめたモバイル優先のデザインです。

## この版で体験できること

1. 起動時の火星をドラッグ・左右キーで回転。短い導入演出はスキップできます。
2. 3つの土地から選び、確認画面で体験用クレジットによる購入を確定。
3. HOME POD / DINING POD / GREEN DOME の作成済み3Dモデルから建物を選択。
4. 約14秒の3Dプリント演出で建物が下から積み上がります。
5. 完成した街を回転・拡大し、共有カードをPNG画像で保存。

選択と進行は同じブラウザに保存されます。再起動後は「つづきから体験する」で再開できます。

チームの将来構想は[制作ブリーフ](../../docs/production-brief.md)を参照してください。この版は、今回指定された「土地購入 → 作成済みモデルのカタログ選択」を実装しています。願望の入力やAIチャットは未実装です。

## 起動

Node.js 22.12以降とnpmが必要です。検証環境はNode.js 24.19.0でした。リポジトリのルートから実行します。

```sh
cd apps/prototype
npm ci
npm run dev
```

起動後、[http://127.0.0.1:5178/](http://127.0.0.1:5178/)を開きます。初回の部品の取得にはインターネット接続が必要です。APIキーや環境設定ファイルは不要です。

Windowsでは、初回の `npm ci` 後に `Start-MarsBuilder.ps1` でも起動できます。すでに5178番ポートを使用している場合は、そのサーバーを終了するか `npm run dev -- --port 5179` とします。

```sh
npm test        # 購入・残高・状態遷移・保存データのテスト
npm run build  # dist/ に配布用の静的ファイルを生成
npm run preview
npm run models # デモ用GLBモデルを再生成
```

配布用の確認画面は [http://127.0.0.1:4178/](http://127.0.0.1:4178/) です。オンライン公開の設定は含みません。

## ファイル構成

| 場所 | 内容 |
| --- | --- |
| `src/app.js` | 画面・操作・購入確認・画像保存 |
| `src/style.css`, `src/transitions.css` | 見た目・画面切り替え・起動演出 |
| `src/state.mjs` | 土地・建物のデータと保存状態の検証 |
| `src/world.js` | Three.jsによる火星・建物・建設・街の3D表示 |
| `src/models.mjs` | デモ建物とロボットの生成コード |
| `public/models/` | 読み込み用GLBと静止画プレビュー |
| `public/assets/` | アプリが使う変換済み画像 |
| `scripts/export-models.mjs` | GLBの再生成 |
| `tests/` | 状態の自動テスト・ブラウザ操作の確認・プレビュー画像生成 |
| `design/asset-notes.md` | 素材の由来と生成プロンプト |

Vite + JavaScript + Three.jsで動作します。実行に必要な画像と3Dモデルはこのフォルダ内に揃っています。

## 3Dモデルの差し替え

`public/models/home.glb`、`dining.glb`、`green.glb` を置き換え、`src/state.mjs` の `BUILDINGS` にある名前・面積などを更新します。

モデルはY軸が上、メートル相当、地面Y=0、原点が建物中央、外接半径約3・高さ約2〜3を想定しています。異なる縮尺では `src/world.js` のカメラと配置も調整してください。

土の素材と窓の表現はデモモデルのメッシュ名に合わせています。別モデルは自身の素材を使います。静止画プレビューも合わせて更新してください。

## ブラウザの自動確認（任意）

`npm test` はNode.jsだけで実行できます。さらにブラウザ操作を確認する場合は、Python環境にPlaywrightとChromiumを用意します。

```sh
python -m pip install playwright
python -m playwright install chromium
# 別のターミナルで npm run dev を起動した状態で実行
python tests/browser_journey.py
# npm run build と npm run preview の後に実行
python tests/production_smoke.py
```

独自ポートで確認するときは環境変数 `MARS_BASE_URL` と `MARS_PREVIEW_URL` で各テストの接続先を指定できます。結果と画像は、管理対象外の `.visual-qa/` に出力されます。

`python tests/render_previews.py` は、開発用サーバーを使って `public/models/*.png` を実際の3Dモデルから再生成します。

開発中のみ `?preview=land` / `catalog` / `building` / `complete` で各画面を直接確認できます。配布用ビルドでは無効です。

## AI活用と素材

- UI案、火星の地表画像、惑星テクスチャを画像生成で作成しました。
- アプリとデモ用3DモデルのコードをAIと制作しました。
- アプリの実行中に生成AIを呼び出す処理はありません。
- チームの原案・素材は[制作ブリーフ](../../docs/production-brief.md)と[共有素材](../../assets/README.md)を参照してください。
- 元画像を表示用WebPへ変換しています。素材の由来は[画像素材一覧](design/asset-notes.md)に記載しています。

## 確認と限界

- 状態の自動テスト6件、ChromiumのPC・スマートフォン相当の画面幅、購入から完成・画像保存までの操作を検証しました。
- 建物は差し替え可能なデモ用モデルです。構造、放射線対策、レゴリス量、印刷時間、価格は架空の想定です。
- ログイン、実際の決済、複数ユーザーの同期、サーバー側の処理はありません。購入は体験用のMCRを使います。
- 共有機能は画像保存です。SNSへの自動投稿は行いません。
- 3Dが使えない環境では静止画で操作を続けられます。動きを減らすOS設定にも対応しています。
- ソフトウェアによる描画環境では約30〜38fpsでした。実スマートフォン、実GPU、Safari、オンライン公開の検証は未実施です。
- 配布用ビルドではThree.jsを含むJavaScriptのサイズ警告が出ますが、生成は成功します。

