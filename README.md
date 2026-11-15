# 在庫管理システム(簡易)

React・Node.js・PostgreSQLを使用した、入出庫管理担当者向けのWebアプリケーションです。
荷主・倉庫・商品・ロット単位で入出庫を管理し、指定日時点の在庫数を照会できます。

## 主な機能

| 機能 | 概要 |
| --- | --- |
| ユーザー登録・ログイン | JWTを用いた認証、Cookieによるログイン状態の管理 |
| マスター管理 | 荷主・倉庫・商品の管理 |
| 入庫登録 | 入庫日、荷主、倉庫、商品、ロット番号、数量を登録 |
| 出庫登録 | 出庫日などを指定して登録。在庫不足となる出庫を防止 |
| 在庫照会 | 指定日時点の在庫を荷主・倉庫・商品・ロット単位で集計 |
| 検索・絞り込み | 荷主名・倉庫名・商品名による検索、在庫0・マイナスの表示切替 |
| CSV出力 | 在庫データなどをCSV形式で出力 |

※ロット番号は任意項目で、未設定（NULL）のデータも在庫集計の対象です。

## 使用技術

| 区分 | 技術 |
| --- | --- |
| フロントエンド | React、TypeScript、Vite |
| バックエンド | Node.js、Express、TypeScript |
| データベース | PostgreSQL |
| DB接続 | node-postgres（pg） |
| 認証・セキュリティ | JWT、Cookie（HttpOnly）、bcrypt、CORS |

## システム構成

```text
ブラウザ
  └─ React + TypeScript
       └─ REST API（HTTP / JSON）
            └─ Node.js + Express + TypeScript
                 └─ PostgreSQL
```

## データベース設計

主なテーブルは以下の6つです。

| テーブル | 内容 |
| --- | --- |
| `users` | ユーザー情報 |
| `shippers` | 荷主マスター |
| `warehouses` | 倉庫マスター（荷主に紐づく） |
| `products` | 商品マスター（荷主内で商品コードを一意に管理） |
| `receipts` | 入庫履歴 |
| `shipments` | 出庫履歴 |

在庫数は独立した在庫テーブルに保持せず、入庫履歴と出庫履歴から計算します。

```text
在庫数 = 指定日までの入庫数量合計 − 指定日までの出庫数量合計
```

## 実装上の工夫

### 1. 指定日時点の在庫照会

- `UNION ALL` で入庫・出庫履歴を統合
- `GROUP BY` / `SUM` で荷主・倉庫・商品・ロット単位に集計
- 入出庫日を条件にして、過去の指定日時点の在庫を算出
- ロット番号が `NULL` のデータも集計

### 2. 在庫不足を防ぐ出庫チェック

出庫対象日の在庫だけでなく、その後の入出庫予定も踏まえて在庫がマイナスにならないかを確認します。
日別入出庫数量を集計し、ウィンドウ関数による累積在庫を用いて判定しています。
また、同時出庫時の競合を抑えるため、PostgreSQLのAdvisory Lockを使用しています。

### 3. 認証・セキュリティ

- パスワードをbcryptでハッシュ化
- JWTをCookieで管理
- 認証APIでログイン状態を確認
- CORSで許可するオリジンを制限

## 主なAPI

| メソッド | エンドポイント | 内容 |
| --- | --- | --- |
| `POST` | `/api/register` | ユーザー登録 |
| `POST` | `/api/login` | ログイン |
| `POST` | `/api/logout` | ログアウト |
| `GET` | `/api/me` | ログイン状態・ユーザー情報取得 |
| `POST` | `/api/receipts` | 入庫登録 |
| `POST` | `/api/shipments` | 出庫登録 |
| `GET` | `/api/stocks?target_date=YYYY-MM-DD` | 指定日時点の在庫照会 |

## 開発目的

Windows向けデスクトップアプリケーション開発で培った業務知識を活かしながら、ReactとNode.jsを用いたWebアプリケーションの構成、REST API、認証、データベース設計・在庫集計の実装を学ぶために作成しました。

## 📖 ポートフォリオ発表資料

2026年、東京都若手エンジニアコースにおける任意参加型ピッチイベントに参加し、自作の在庫管理システムについて発表しました。
以下に、当日使用した発表資料のリンクを掲載します。

[在庫管理システム 説明資料](https://drive.google.com/file/d/13-DjDjwXiU2B4CdLM1zvAk0EGr9wQ-If/view?usp=drive_link)

## ローカル環境での起動

>※開発の記録として残します

### 前提条件

- Node.js / npm
- PostgreSQL
- アプリケーション用のデータベースおよびテーブルが作成されていること

### 1. リポジトリを取得

```bash
git clone <リポジトリURL>
cd inventory-system
```

### 2. バックエンドを設定・起動

```bash
cd backend
npm install
```

`backend/.env` にDB接続情報を設定します（値は環境に合わせて変更）。

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=inventory_db
```

```bash
npm run dev
```

### 3. フロントエンドを起動

別のターミナルで実行します。

```bash
cd frontend
npm install
npm run dev
```

起動後、ターミナルに表示されたローカルURLへアクセスしてください。

> **補足:** DB初期化SQLの実行方法、追加の環境変数、API接続先設定、起動ポートはリポジトリの実装に合わせて記載してください。`.env` はGitにコミットしないでください。