import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShipperPage from './pages/ShipperPage';
import WarehousePage from './pages/WarehousePage';
import ProductPage from './pages/ProductPage';
import ReceiptPage from './pages/ReceiptPage';
import ShipmentPage from './pages/ShipmentPage';
import StockPage from './pages/StockPage';

function App() {
    // 文字列リテラル型のユニオン　ジェネリック関数の引数に渡す
    const [page, setPage] = useState<'shipper' | 'warehouse' | 'product' | 'ReceiptPage' | 'ShipmentPage' | 'stock'>('shipper');
    const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状況
    const [isLoading, setIsLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);

    useEffect(() => {
        const checkLogin = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/me', {
                    credentials: 'include'
                });

                console.log(res.ok);
                if (!res.ok) {
                    setIsLoggedIn(false);
                    return;
                }

                console.log('ログインOK');
                setIsLoggedIn(res.ok);

            } catch (error) {
                console.error(error);
                setIsLoggedIn(false);

            } finally {
                setIsLoading(false);
            }
        };
        checkLogin();
    }, []);

    if (isLoading) {
        return <p>ログイン状態を確認中・・・</p>;
    }

    // 未ログインならログイン画面を表示
    // if (!isLoggedIn) {
    //     return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
    // }
    // showRegister :  t → USER登録画面 f → ログイン画面
    if (!isLoggedIn) {
        return showRegister ? (
            // ユーザー登録画面
            <RegisterPage onBack={() => setShowRegister(false)} />
        ) : (
            // ログイン画面
            <LoginPage
                onLogin={() => setIsLoggedIn(true)}
                onRegister={() => setShowRegister(true)}
            />
        );
    }

    // ログアウト
    const logout = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('ログアウトに失敗しました。');
            }

            setIsLoggedIn(false);

        } catch (error) {
            console.error(error);
            alert('ログアウトに失敗しました。');
        }
    };

    return (
        <>

            <nav>
                <button onClick={() => setPage('shipper')}>
                    荷主マスター
                </button>

                <button onClick={() => setPage('warehouse')}>
                    倉庫マスター
                </button>
                <button onClick={() => setPage('product')}>
                    商品マスター
                </button>

                <button onClick={() => setPage('ReceiptPage')}>
                    入庫処理
                </button>

                <button onClick={() => setPage('ShipmentPage')}>
                    出庫処理
                </button>

                <button onClick={() => setPage('stock')}>
                    在庫照会
                </button>

                <button onClick={logout}>
                    ログアウト
                </button>

            </nav>

            {/* ページ判定　&&: 左がTrueなら右を返す */}
            {page === 'shipper' && <ShipperPage />}
            {page === 'warehouse' && <WarehousePage />}
            {page === 'product' && <ProductPage />}
            {page === 'ReceiptPage' && <ReceiptPage />}
            {page === 'ShipmentPage' && <ShipmentPage />}
            {page === 'stock' && <StockPage />}
        </>
    );
}

export default App;