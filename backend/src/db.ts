import { Pool ,} from 'pg';
// import 'dotenv/config'; // .envを読込み、環境変数を使用できる
import dotenv from 'dotenv';
import type { PoolClient, QueryResultRow } from 'pg';

dotenv.config(); // .env読込み

// DB接続文字列
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432, // CAST必須
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || ''
};

// 接続プール作成
const pool = new Pool(dbConfig);

// 接続プール破棄
export async function closePool() {
    try {
        await pool.end();
        console.log('接続プールの破棄が完了');
    } catch (error) {
        console.error('接続プール破棄中にエラー発生',error);
    }
}

// Query実行
export async function query<T extends QueryResultRow>(
    sql: string,
    params: unknown[] = []
): Promise<T[]>
{
    try {
        const result = await pool.query<T>(sql, params);
        return result.rows;

    } catch (error) {
        console.error('SQL実行中にエラー発生',error);
        throw error;
    }
}

// トランザクション内で関数実行
// PoolClient: DB接続オブジェクト
// pool.query(): プールから自動取得  
export async function tran<T>(
    callback: (client: PoolClient) => Promise<T>)
    : Promise<T>
    {
    const client = await pool.connect();　// プールからDB接続を取得　TRAN内では同じDB接続情報が必要
    try {
        await client.query('begin');
        const result= await callback(client);
        await client.query('commit');

        return result;

    } catch (err) {
        await client.query('rollback');
        console.error('トランザクション中にエラー発生:',err);
        throw err;
    }   finally{
        client.release(); // プールへ返却
    }
}


