import express from 'express'; // default
import { query, closePool, tran } from './db'; // 名前付き
import type { Request, Response } from 'express'; // 型インポート
import dotenv from 'dotenv';
import { DatabaseError } from 'pg';　// PGエラークラス
import cors from 'cors'; // React→APIへのアクセス制御用に追加

dotenv.config();

const app = express();
app.use(express.json()); // Request受け取り時、JSON形式をObjectに変換
app.use(cors({
    origin: 'http://localhost:5173'
}));


// Routing

// 荷主データ一覧
app.get('/api/shippers', async (req: Request, res: Response) => {
    try {
        const sql = 'select id, name from shippers order by id';
        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '荷主一覧の取得に失敗しました。' });
    }
});

// 荷主登録
app.post('/api/shippers', async (req: Request, res: Response) => {
    try {
        const { name } = req.body?? {}; // JSONデータを受け取る

        // 入力チェック typeofで先に判定
        if (typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: '荷主名を登録してください。' });
            return;
        }
        console.log(name.trim());
        const sql = 'insert into shippers (name) values ($1)';
        const rows = await query(sql, [name.trim()]);
        res.status(201).json({ message: '荷主登録に成功しました。' });

    } catch (error) {
        res.status(500).json({ error: '荷主登録に失敗しました。' });
    }
});

// 倉庫データ一覧
app.get('/api/warehouses', async (req: Request, res: Response) => {
    try {
        const sql = 'select id, name from warehouses order by id';
        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '倉庫一覧の取得に失敗しました。' });
    }
});

// 倉庫登録
app.post('/api/warehouses', async (req: Request, res: Response) => {
    try {
        const { name } = req.body?? {}; // JSONデータを受け取る

        // 入力チェック typeofで先に判定
        if (typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: '倉庫名を登録してください。' });
            return;
        }
        console.log(name.trim());
        const sql = 'insert into warehouses (name) values ($1)';
        const rows = await query(sql, [name.trim()]);
        res.status(201).json({ message: '倉庫登録に成功しました。' });

    } catch (error) {
        res.status(500).json({ error: '倉庫登録に失敗しました。' });
    }
});

// 商品一覧
app.get('/api/products', async (req: Request, res: Response) => {
    try {
        const sql = `
                select
                p.id,
                p.shipper_id,
                s.name as shipper_name,
                p.product_code,
                p.name
                from products p
                join shippers s on s.id = p.shipper_id
                order by p.id
                `;
        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '商品一覧の取得に失敗しました。' });
    }
});

// 商品データ
app.post('/api/products', async (req: Request, res: Response) => {
    try {
        // null合体演算子 null → undefinedの代わりに{}(空オブジェクト)
        // frontのfetchの引数のbodyプロパティ名と合わせること
        const { shipper_id, product_code, name } = req.body ?? {};

        // 入力チェック
        if (
            !Number.isInteger(shipper_id) ||
            shipper_id <= 0 ||
            typeof product_code !== 'string' ||
            !product_code.trim() ||
            typeof name !== 'string' ||
            !name.trim()
        ) {
            res.status(400).json({ error: '入力内容が不正です。' });
            return;
        }

        const sql = `
            insert into products (shipper_id, product_code, name) values ($1, $2, $3)
        `;
        // {id: number} POINT
        // rows[0]?.id;   // OK：number型
        // rows[0]?.name; // エラー：型定義にnameがない
        const rows = await query<{ id: number }>(
            sql, [shipper_id, product_code.trim(), name.trim()]
        );
        res.status(201).json({ message: '商品登録に成功しました。', id: rows[0]?.id });

    } catch (error) {
        const dbError = error as DatabaseError;　//PSエラー

        console.log(dbError);

        //	foreign_key_violation
        if (dbError.code === '23503') {
            res.status(400).json({ error: '荷主が存在しません。' });
            return;
        }
        // 	unique_violation
        if (dbError.code === '23505') {
            res.status(409).json({ error: '商品コードが重複しています。' });
            return;
        }
        res.status(500).json({ error: '商品登録に失敗しました。' });
    }
});

// 入庫登録
app.post('/api/receipts', async (req: Request, res: Response) => {
    try {
        const {
            receipt_date,
            shipper_id,
            warehouse_id,
            product_id,
            lot_number,
            quantity
        } = req.body ?? {};
        console.log(req.body??{});

        // 入力チェック
        if (
            typeof receipt_date !== 'string' ||            
            !/^\d{4}-\d{2}-\d{2}$/.test(receipt_date) ||　//★ YYYY-MM-DD 形式チェック ✕：日付存在チェック(フロント側で制御すればいいかな？)
            (!Number.isInteger(shipper_id) || shipper_id <= 0) ||
            (!Number.isInteger(warehouse_id) || warehouse_id <= 0) ||
            (!Number.isInteger(product_id) || product_id <= 0) ||
            (!Number.isInteger(quantity) || quantity <= 0) ||
            (lot_number != null && typeof lot_number !== 'string') // ReqされたロットNo.が文字列以外
        ) {
            return res.status(400).json({ error: '入力内容が不正です' });
        }

        const sql = `
            INSERT INTO receipts
                (receipt_date, shipper_id, warehouse_id,
                 product_id, lot_number, quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id 
        `;

        const rows = await query<{ id: number }>(sql, [
            receipt_date,
            shipper_id,
            warehouse_id,
            product_id,
            lot_number?.trim() || null,　// JS・TSでは条件判定だけではない、値選択用途にも使用
            quantity
        ]);

        res.status(201).json({
            message: '入庫登録に成功しました。',
            id: rows[0]?.id
        });

    } catch (error) {
        res.status(500).json({ error: '入庫登録に失敗しました。' });
    }
});

// 出庫登録 ★要復習
app.post('/api/shipments', async (req: Request, res: Response) => {
    try {
        const {
            shipment_date,
            shipper_id,
            warehouse_id,
            product_id,
            lot_number,
            quantity
        } = req.body?? {};

        // 入力チェック
        if (
            typeof shipment_date !== 'string' ||
            (!/^\d{4}-\d{2}-\d{2}$/.test(shipment_date)) ||
            (!Number.isInteger(shipper_id) || shipper_id <= 0) ||
            (!Number.isInteger(warehouse_id) || warehouse_id <= 0) ||
            (!Number.isInteger(product_id) || product_id <= 0) ||
            (!Number.isInteger(quantity) || quantity <= 0) ||
            (lot_number != null && typeof lot_number !== 'string')
        ) {
            return res.status(400).json({ error: '入力内容が不正です' });
        }

        // ロット番号を統一
        const lot = lot_number?.trim() || null;

        // トランザクション開始
        const id = await tran(async (client) => {
            // 出庫の排他制御(LOCK)
            // JSON(配列形式)  [1,2,3,"LOT101"]
            await client.query(
                `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
                [JSON.stringify([shipper_id, warehouse_id, product_id, lot])]
            );

            // 現在庫を取得
            const stockSql = `
                SELECT COALESCE(SUM(quantity), 0) AS stock_quantity
                FROM (
                    SELECT quantity
                    FROM receipts
                    WHERE shipper_id = $1
                      AND warehouse_id = $2
                      AND product_id = $3
                      AND lot_number IS NOT DISTINCT FROM $4

                    UNION ALL

                    SELECT -quantity
                    FROM shipments
                    WHERE shipper_id = $1
                      AND warehouse_id = $2
                      AND product_id = $3
                      AND lot_number IS NOT DISTINCT FROM $4
                ) AS stock_data
            `;

            const params = [
                shipper_id,
                warehouse_id,
                product_id,
                lot
            ];

            const result = await client.query(stockSql, params);
            const stockQuantity = Number(result.rows[0].stock_quantity);

            // 在庫不足チェック
            if (stockQuantity < quantity) {
                throw new Error('在庫不足');　// catchへ
            }

            // 出庫登録
            // 追加idチェック
            const sql = `
                INSERT INTO shipments
                    (shipment_date, shipper_id, warehouse_id,
                     product_id, lot_number, quantity)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id 
            `;

            // QueryResult
            const rows = await client.query<{ id: number }>(sql, [
                shipment_date,
                ...params,
                quantity
            ]);

            return rows.rows[0]?.id;
        });

        res.status(201).json({
            message: '出庫登録に成功しました。',
            id
        });

    } catch (error) {
        console.error(error);
        if (error instanceof Error && error.message === '在庫不足') {
            return res.status(400).json({ error: '在庫が不足しています。' });
        }
        res.status(500).json({ error: '出庫登録に失敗しました。' });
    }
});


// 在庫チェック
app.get('/api/stocks', async (req: Request, res: Response) => {
    try {
        console.log(req.query);
        const {target_date} = req.query ?? {};
        // 基準日の入力チェック
        if (
            typeof target_date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(target_date)
        ) {
            return res.status(400).json({ error: '基準日が不正です。' });
        }


        // 荷主・倉庫・商品・ロットでグループ化(要は1行にまとめるイメージ)
        const sql = `
SELECT
 st.shipper_id,
 s.name AS shipper_name,
 st.warehouse_id,
 w.name AS warehouse_name,
 st.product_id,
 p.product_code,
 p.name AS product_name,
 st.lot_number,
 st.stock_quantity
from 
(SELECT
  shipper_id,
  warehouse_id,
  product_id,
  lot_number,
  SUM(quantity) AS stock_quantity
FROM (
    SELECT
      shipper_id, warehouse_id, product_id,
      lot_number, quantity
    FROM receipts
    where receipt_date <= $1
    UNION ALL
    SELECT
      shipper_id, warehouse_id, product_id,
      lot_number, -quantity
    FROM shipments
    where shipment_date <= $1
) AS stock_data 
GROUP BY
    shipper_id, warehouse_id, product_id, lot_number
) as st
join shippers   s on st.shipper_id = s.id
join warehouses w on st.warehouse_id = w.id
join products   p on st.product_id = p.id
ORDER BY
shipper_id, warehouse_id, product_id, lot_number`;

        const rows = await query(sql, [target_date]);
        console.log(rows);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '在庫照会に失敗しました。' });
    }
});



// アプリ終了時、DB接続プールを安全に破棄
['SIGINT', 'SIGHUP', 'SIGTERM'].forEach((signal) => {
    process.on(signal, async () => {
        console.log(`${signal}受信：アプリケーション終了処理中・・・`);
        await closePool();
        process.exit();
    });
});

// サーバー起動
app.listen(process.env.PORT, () => {
    console.log(`ポート番号：${process.env.PORT}：APIサーバー起動`);
});