import express from 'express'; // default
import { query, closePool } from './db'; // 名前付き
import type { Request, Response } from 'express'; // 型インポート
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json()); // Request受け取り時、JSON形式をObjectに変換

// Routing

// 荷主マスター
app.get('/api/shippers', async(req:Request,res:Response) => {
    try {
        const rows = await query('select id, name from shippers order by id');
        res.json(rows);

    } catch (error) {
        res.status(500).json({ error: '荷主一覧の取得に失敗'});
    }
});

// アプリ終了時、DB接続プールを安全に破棄
['SIGINT','SIGHUP','SIGTERM'].forEach((signal) => {
    process.on(signal, async () => {
        console.log(`${signal}受信：アプリケーション終了処理中・・・`);
        await closePool();
        process.exit();
    });
});

// サーバー起動
app.listen(process.env.PORT,() => {
    console.log(`ポート番号：${process.env.PORT}：APIサーバー起動`);
});