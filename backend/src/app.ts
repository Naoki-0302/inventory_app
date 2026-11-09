import express from 'express'; // default
import { query, closePool, tran } from './db'; // 名前付き
import type { Request, Response } from 'express'; // 型インポート
import dotenv from 'dotenv';
import { DatabaseError } from 'pg';　// PGエラークラス
import cors from 'cors'; // React→APIへのアクセス制御用に追加
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { authenticate } from './routes/auth'; // ログインユーザーのみAPIを利用できるようにする
import { error } from 'node:console';

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json()); // Request受け取り時、JSON形式をObjectに変換
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true  // Cookie許可
}));


// Routing

// ユーザー登録
app.post('/api/register', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body ?? {};

        // 入力チェック
        if (
            typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            typeof password !== 'string' ||
            password.length < 8
        ) {
            return res.status(400).json({
                error: 'メールアドレスまたはパスワードが不正です。'
            });
        }

        // パスワードのハッシュ化
        const passwordHash = await bcrypt.hash(password, 12);
        console.log(passwordHash);

        // ユーザー登録
        const sql = `
            INSERT INTO users (email, password)
            VALUES ($1, $2)
            RETURNING id, email
        `;

        const rows = await query<{ id: number; email: string }>(
            sql,
            [email.trim().toLowerCase(), passwordHash]
        );

        res.status(201).json(rows[0]); // id, email  passwordは返さない

    } catch (error) {
        console.error(error);

        // メールアドレス重複
        if (
            error instanceof Error &&
            'code' in error &&
            error.code === '23505' // unique制約違反
        ) {
            // 重複
            return res.status(409).json({
                error: '既に登録されているメールアドレスです。'
            });
        }

        res.status(500).json({
            error: 'ユーザー登録に失敗しました。'
        });
    }
});

// ログイン(認証)
app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body ?? {};

        // 入力チェック
        if (
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            !password
        ) {
            return res.status(400).json({
                error: 'メールアドレスとパスワードを入力してください。'
            });
        }

        console.log('ここまでOK');

        // ユーザー情報取得
        const sql = `
            SELECT id, email, password
            FROM users
            WHERE email = $1
        `;

        const rows = await query<{
            id: number;
            email: string;
            password: string;
        }>(sql, [email.trim().toLowerCase()]);

        const user = rows[0]; // id, email, password

        console.log(user);

        // ユーザー存在チェック
        if (!user) {
            return res.status(401).json({
                error: 'メールアドレスまたはパスワードが違います。'
            });
        }

        // パスワード照合
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                error: 'メールアドレスまたはパスワードが違います。'
            });
        }

        // JWT秘密鍵を取得
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRETが設定されていません。');
        }

        // JWTを発行（有効期限1時間）
        const token = jwt.sign(
            { userId: user.id },
            secret,
            { expiresIn: '1h' }
        );

        // CookieにJWTを保存
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'ログインに成功しました。',
            user: {
                id: user.id,
                email: user.email
            }
        });


    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'ログインに失敗しました。'
        });
    }
});

// ログイン状態確認
app.get('/api/me', authenticate, async (req: Request, res: Response) => {
    // 有効:200 無効:401
    res.status(200).json({
        message: '認証済み'
    });
});

// ログアウト
app.post('/api/logout', authenticate, (req: Request, res: Response) => {
    // Cookieを削除(ブラウザに指示)
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });

    res.status(200).json({
        message: 'ログアウトしました。'
    });
});


// 荷主データ一覧
app.get('/api/shippers', authenticate, async (req: Request, res: Response) => {
    try {
        const sql = 'select id, name from shippers order by id';
        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '荷主一覧の取得に失敗しました。' });
    }
});

// 荷主登録
app.post('/api/shippers', authenticate, async (req: Request, res: Response) => {
    try {
        const { name } = req.body ?? {}; // JSONデータを受け取る

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
app.get('/api/warehouses', authenticate, async (req: Request, res: Response) => {
    try {
        const sql = `
        select 
           id, 
           name  
           from warehouses 
           order by id
        `;
        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '倉庫一覧の取得に失敗しました。' });
    }
});

// 倉庫登録
app.post('/api/warehouses', authenticate, async (req: Request, res: Response) => {
    try {
        const { name } = req.body ?? {}; // JSONデータを受け取る

        // 入力チェック typeofで先に判定
        if (typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: '倉庫名を登録してください。' });
            return;
        }

        const sql = 'insert into warehouses (name) values ($1)';
        const rows = await query(sql, [name.trim()]);
        res.status(201).json({ message: '倉庫登録に成功しました。' });

    } catch (error) {
        res.status(500).json({ error: '倉庫登録に失敗しました。' });
    }
});

// 商品一覧
app.get('/api/products', authenticate, async (req: Request, res: Response) => {
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
app.post('/api/products', authenticate, async (req: Request, res: Response) => {
    try {
        // null合体演算子 null → undefinedの代わりに{}(空オブジェクト)
        // frontのfetchの引数のbodyプロパティ名と合わせること
        const { shipper_id, product_code, name } = req.body ?? {};

        // 入力チェック
        // フロントで制御しているから不要かもやけど
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
        const dbError = error as DatabaseError;　//ポスグレエラー
        // console.log(dbError);

        //  jsonの内容はブラウザで確認
        //	foreign_key_violation
        if (dbError.code === '23503') {
            res.status(400).json({ error: 'DBError:荷主が存在しません。' });
            return;
        }
        // 	unique_violation
        if (dbError.code === '23505') {
            res.status(409).json({ error: 'DBError:商品コードが重複しています。' });
            return;
        }
        res.status(500).json({ error: '商品登録に失敗しました。' });
    }
});

// 商品更新
app.put('/api/products/:id', authenticate, async (req: Request, res: Response) => {
    try {
        // Requestを定数格納
        const id = Number(req.params.id);
        // const {id} = req.params;
        const { product_code, name } = req.body ?? {};

        // 入力チェック
        if (
            !Number.isInteger(id) || id <= 0 ||
            typeof product_code !== 'string' || !product_code.trim() ||
            typeof name !== 'string' || !name.trim()
        ) {
            return res.status(400).json({ error: '入力内容が不正です。' });
        }

        const sql = `
            update products
            set product_code = $1,
            name = $2
            where id = $3
            returning id, shipper_id, product_code, name
        `;

        const rows = await query(sql, [product_code.trim(), name.trim(), id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '商品が存在しません。' });
        }

        res.status(200).json(rows[0]);

    } catch (error) {
        console.error(error);
        if (error instanceof DatabaseError &&
            error.code === '23505'
        ) {
            return res.status(409).json({ error: '同じ商品コードが登録されています。' });
        }
        res.status(500).json({ error: '商品更新に失敗しました。' });
    }
});

// 商品削除
app.delete('/api/products/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // 入力チェック
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: '商品IDが不正です。' });
        }

        const sql = `
            delete from products
            where id = $1
            returning id
        `;
        const rows = await query(sql, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '商品が存在しません。' });
        }
        res.status(200).json({ message: '商品を削除しました。' });

    } catch (error) {
        console.error(error);

        // FKによりエラー　理由：入出庫で使用しているから
        if (error instanceof DatabaseError && error.code === '23503') {
            return res.status(409).json({ error: '入出庫履歴があるため削除できません。' });
        }

        res.status(500).json({ error: '商品を削除できませんでした。' });
    }
});


// 入庫一覧
app.get('/api/receipts', authenticate, async (req: Request, res: Response) => {
    try {
        const sql = `
            SELECT
                id, receipt_date, shipper_id, warehouse_id,
                product_id, lot_number, quantity,
                created_at, updated_at
            FROM receipts
            ORDER BY receipt_date, id
        `;

        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '入庫データ取得に失敗しました。' });
    }
});

// 入庫登録
app.post('/api/receipts', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            receipt_date,
            shipper_id,
            warehouse_id,
            product_id,
            lot_number,
            quantity
        } = req.body ?? {};
        console.log(req.body ?? {});

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

// 出庫一覧
app.get('/api/shipments', authenticate, async (req: Request, res: Response) => {
    try {
        const sql = `
            SELECT
                id, shipment_date, shipper_id, warehouse_id,
                product_id, lot_number, quantity,
                created_at, updated_at
            FROM shipments
            ORDER BY shipment_date, id
        `;

        const rows = await query(sql);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '出庫データ取得に失敗しました。' });
    }
});

// 出庫登録 ★要復習
app.post('/api/shipments', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            shipment_date,
            shipper_id,
            warehouse_id,
            product_id,
            lot_number,
            quantity
        } = req.body ?? {};

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
            // 日付条件が重要
            const stockSql = `
WITH movement AS (
    SELECT receipt_date AS movement_date, quantity AS qty
    FROM receipts
    WHERE shipper_id = $1
      AND warehouse_id = $2
      AND product_id = $3
      AND lot_number IS NOT DISTINCT FROM $4

    UNION ALL

    SELECT shipment_date AS movement_date, -quantity AS qty
    FROM shipments
    WHERE shipper_id = $1
      AND warehouse_id = $2
      AND product_id = $3
      AND lot_number IS NOT DISTINCT FROM $4
),
daily AS (
    SELECT movement_date, SUM(qty) AS daily_qty
    FROM movement
    GROUP BY movement_date
),
stock AS (
    SELECT
        movement_date,
        SUM(daily_qty) OVER (ORDER BY movement_date) AS stock_quantity
    FROM daily
)
SELECT MIN(stock_quantity) AS min_stock_quantity
FROM (
    -- 出庫日当日の在庫（その日に履歴がなくても取得）
    SELECT COALESCE(SUM(daily_qty), 0) AS stock_quantity
    FROM daily
    WHERE movement_date <= $5

    UNION ALL

    -- 出庫日以降の累積在庫
    SELECT stock_quantity
    FROM stock
    WHERE movement_date > $5
) AS target_stock
            `;
            // const stockSql = `
            //     SELECT COALESCE(SUM(quantity), 0) AS stock_quantity
            //     FROM (
            //         SELECT quantity
            //         FROM receipts
            //         WHERE shipper_id = $1
            //           AND warehouse_id = $2
            //           AND product_id = $3
            //           AND lot_number IS NOT DISTINCT FROM $4
            //           AND receipt_date <= $5
            //         UNION ALL

            //         SELECT -quantity
            //         FROM shipments
            //         WHERE shipper_id = $1
            //           AND warehouse_id = $2
            //           AND product_id = $3
            //           AND lot_number IS NOT DISTINCT FROM $4
            //           AND shipment_date <= $5
            //     ) AS stock_data
            // `;

            const params = [
                shipper_id,
                warehouse_id,
                product_id,
                lot,
                shipment_date
            ];

            const result = await client.query(stockSql, params);
            const minStockQuantity = Number(result.rows[0].min_stock_quantity);
            // const stockQuantity = Number(result.rows[0].stock_quantity);

            console.log(minStockQuantity); // 在庫
            // console.log(stockQuantity); // 在庫
            console.log(quantity);　    // 出庫数

            // 在庫不足チェック
            if (minStockQuantity < quantity) {
            // if (stockQuantity < quantity) {
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
                // shipment_date,
                // ...params,
                // quantity

                shipment_date,
                shipper_id,
                warehouse_id,
                product_id,
                lot,
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

// 出庫可能数量一覧
app.get('/api/available-stocks', authenticate, async (req: Request, res: Response) => {
    try {
        const { target_date } = req.query;

        if (
            typeof target_date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(target_date)
        ) {
            return res.status(400).json({ error: '基準日が不正です。' });
        }

        const sql = `
            WITH movement AS (
                SELECT
                    receipt_date AS movement_date,
                    shipper_id, warehouse_id, product_id,
                    lot_number, quantity AS qty
                FROM receipts

                UNION ALL

                SELECT
                    shipment_date AS movement_date,
                    shipper_id, warehouse_id, product_id,
                    lot_number, -quantity AS qty
                FROM shipments
            ),
            daily AS (
                SELECT
                    movement_date,
                    shipper_id, warehouse_id, product_id,
                    lot_number,
                    SUM(qty) AS daily_qty
                FROM movement
                GROUP BY
                    movement_date, shipper_id,
                    warehouse_id, product_id, lot_number
            ),
            stock AS (
                SELECT
                    *,
                    SUM(daily_qty) OVER (
                        PARTITION BY
                            shipper_id, warehouse_id,
                            product_id, lot_number
                        ORDER BY movement_date
                    ) AS stock_quantity
                FROM daily
            ),
            available AS (
                SELECT
                    shipper_id, warehouse_id,
                    product_id, lot_number,
                    LEAST(
                        COALESCE(SUM(daily_qty) FILTER (
                            WHERE movement_date <= $1
                        ), 0),
                        COALESCE(MIN(stock_quantity) FILTER (
                            WHERE movement_date > $1
                        ), COALESCE(SUM(daily_qty) FILTER (
                            WHERE movement_date <= $1
                        ), 0))
                    ) AS available_quantity
                FROM stock
                GROUP BY
                    shipper_id, warehouse_id,
                    product_id, lot_number
            )
            SELECT *
            FROM available
            WHERE available_quantity > 0
            ORDER BY shipper_id, warehouse_id, product_id, lot_number
        `;

        const rows = await query(sql, [target_date]);
        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '出庫可能数量の取得に失敗しました。' });
    }
});

// 在庫チェック
app.get('/api/stocks', authenticate, async (req: Request, res: Response) => {
    try {
        // クエリパラメーターを取得
        const { target_date } = req.query ?? {};

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