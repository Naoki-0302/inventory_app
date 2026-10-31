import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT認証ミドルウェア
export function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        // CookieからJWTを取得
        const token = req.cookies?.token;

        if (typeof token !== 'string') {
            console.log('11 error');
            return res.status(401).json({
                error: 'ログインが必要です。'
            });
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.log('20 error');
            throw new Error('JWT_SECRETが設定されていません。');
        }

        // JWTを検証
        jwt.verify(token, secret, {
            algorithms: ['HS256']
        });

        // 認証成功：次の処理へ
        next();

    } catch (error) {
        console.log('33 error');

        // JWTの有効期限切れ　Expired
        // JsonWebTokenErrorを継承
        // 先に判定させる必要がある
        if(error instanceof jwt.TokenExpiredError){
            return res.status(401).json({
                error: 'ログインの有効期限が切れました。'
         
            });
        }

        // 認証エラー
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                error: '認証に失敗しました。'
            });
        }

        console.error(error);
        res.status(500).json({
            error: '認証処理でエラーが発生しました。'
        });
    }
}