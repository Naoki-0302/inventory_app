import { useState, useEffect } from 'react';
import { downloadCsv } from '../utils/csv';
import { formatJST } from '../utils/date';

type Master = {
    id: number;
    name: string;
};
type Product = {
    id: number;
    shipper_id: number;
    name: string;
};

function ReceiptPage() {
    const [shippers, setShippers] = useState<Master[]>([]);     // 荷主マスター
    const [warehouses, setWarehouses] = useState<Master[]>([]); // 倉庫マスター
    const [products, setProducts] = useState<Product[]>([]);     // 商品マスター

    // e.target.valueはstring型なので、Formでは文字列管理し、API送信時に数値変換する。
    const [receiptDate, setReceiptDate] = useState('');         // 入庫日
    const [shipperId, setShipperId] = useState('');             // 荷主ID
    const [warehouseId, setWarehouseId] = useState('');         // 倉庫ID
    const [productId, setProductId] = useState('');             // 商品ID 
    const [lotNumber, setLotNumber] = useState('');             // ロットナンバー
    const [quantity, setQuantity] = useState('');                // 数量

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const urls = [
                    'http://localhost:3000/api/shippers',
                    'http://localhost:3000/api/warehouses',
                    'http://localhost:3000/api/products'
                ];

                // 各URLに並列Request送信。順番上から下のURLへ
                const res = await Promise.all(
                    urls.map(url => fetch(url,{credentials: 'include'}))
                );
                // fetch()では404や500がrejectされないらしい
                // some(): 1つでもTrueならTrue  every(): すべてTrueならTrue  
                if (res.some(res => !res.ok)) {
                    throw new Error('マスターの取得に失敗しました。');
                }
                //各Responseを解析
                const [s, w, p] = await Promise.all(
                    res.map(res => res.json())
                );
                // マスター情報取得
                setShippers(s);
                setWarehouses(w);
                setProducts(p);

            } catch (error) {
                console.error(error);
                alert(error);
            }
        }
        fetchMasters();
    }, []);

    // 入庫登録
    const addReceipt = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (
            !receiptDate || !shipperId || !warehouseId || !productId ||
            !Number.isInteger(Number(quantity)) ||
            Number(quantity) <= 0
        ) return;

        try {

            console.log(JSON.stringify({
                receipt_date: receiptDate,
                shipper_id: shipperId,
                warehouse_id: warehouseId,
                product_id: productId,
                lot_number: lotNumber.trim() || null,
                quantity: Number(quantity)
            }));


            const res = await fetch('http://localhost:3000/api/receipts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receipt_date: receiptDate,
                    shipper_id: Number(shipperId),
                    warehouse_id: Number(warehouseId),
                    product_id: Number(productId),
                    lot_number: lotNumber.trim() || null,
                    quantity: Number(quantity)
                }),
                credentials: 'include'
            });

            console.log(res);


            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            alert('入庫登録完了');

            // とりあえず現時点では以下の３つだけリセット
            setProductId('');
            setLotNumber('');
            setQuantity('');


        } catch (error) {
            console.error(error);
            alert(error instanceof Error
                ? error.message
                : '入庫登録に失敗しました。'
            );
        }
    };

    // 入庫CSV出力
    const exportReceipts = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/receipts',{
                credentials: 'include'
            });

            if (!res.ok) throw new Error('入庫データ取得に失敗しました。');

            type Receipt = {
                id: number;
                receipt_date: string;
                shipper_id: number;
                warehouse_id: number;
                product_id: number;
                lot_number: string | null;
                quantity: number;
                created_at: string;
                updated_at: string;
            };

            const data: Receipt[] = await res.json();

            const header = [
                '入庫ID', '入庫日', '荷主ID', '倉庫ID',
                '商品ID', 'ロット番号', '数量', '登録日時', '更新日時'
            ];

            const rows = data.map(r => [
                String(r.id),
                r.receipt_date.slice(0, 10),
                String(r.shipper_id),
                String(r.warehouse_id),
                String(r.product_id),
                r.lot_number ?? '',
                String(r.quantity),
                formatJST(r.created_at),
                formatJST(r.updated_at)
            ]);

            downloadCsv('receipts.csv', header, rows);

        } catch (error) {
            console.error(error);
            alert('入庫CSV出力に失敗しました。');
        }
    };


    return (
        <>
            <h1>入庫処理</h1>
            <form onSubmit={addReceipt}>
                <div>
                    <label>入庫日</label>
                    <input
                        type="date"
                        value={receiptDate}
                        onChange={e => setReceiptDate(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>荷主</label>
                    <select
                        value={shipperId}
                        onChange={e => {
                            setShipperId(e.target.value);  // 荷主ID
                            setWarehouseId('');            // 倉庫ID
                            setProductId('');              // 商品CD
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {shippers.map((shipper) => (
                            <option key={shipper.id} value={shipper.id}>{shipper.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>倉庫</label>
                    <select
                        value={warehouseId}
                        onChange={e => {
                            setWarehouseId(e.target.value);　// 倉庫ID
                            setProductId('');                // 商品CD
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>商品</label>
                    <select
                        value={productId}
                        onChange={e => {
                            setProductId(e.target.value);　// 商品                            
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {products
                            .filter(p => p.shipper_id === Number(shipperId))
                            .map(p => (
                                <option
                                    key={p.id}
                                    value={p.id}
                                >
                                    {p.name}
                                </option>
                            ))
                        }
                    </select>
                </div>

                <div>
                    <label>ロット番号</label>
                    <input
                        type="text"
                        value={lotNumber}
                        onChange={e => setLotNumber(e.target.value)}
                    />
                </div>

                <div>
                    <label>数量</label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">登録</button>
                        <br />
                <button type="button" onClick={exportReceipts}>
                    入庫CSV出力
                </button>
            </form>

        </>
    );

};
export default ReceiptPage;