import express from 'express'; // default
import { query, closePool } from './db'; // 名前付き
import type { Request, Response } from 'express'; // 型インポート
import dotenv from 'dotenv';
import { DatabaseError } from 'pg';　// PGエラークラス

dotenv.config();

const app = express();
app.use(express.json()); // Request受け取り時、JSON形式をObjectに変換

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
app.post('/api/shipper', async (req: Request, res: Response) => {
    try {
        const { name } = req.body; // JSONデータを受け取る

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
        const { name } = req.body; // JSONデータを受け取る

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

app.post('/api/products', async (req: Request, res: Response) => {
    try {
        // null合体演算子 null → undefinedの代わりに{}(空オブジェクト)
        const { shipper_id, product_code, name } = req.body ?? {};
        // console.log(req.body);
        // console.log(Number.isInteger(shipper_id));
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