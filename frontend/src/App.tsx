import { useState } from 'react';
import ShipperPage from './pages/ShipperPage';
import WarehousePage from './pages/WarehousePage';
import ProductPage from './pages/ProductPage';
import ReceiptPage from './pages/ReceiptPage';
import ShipmentPage from './pages/ShipmentPage';
import StockPage from './pages/StockPage';

function App() {
    // 文字列リテラル型のユニオン　ジェネリック関数の引数に渡す
    const [page, setPage] = useState<'shipper' | 'warehouse' | 'product' | 'ReceiptPage' | 'ShipmentPage' | 'stock'>('shipper');

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