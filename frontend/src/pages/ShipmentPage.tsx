import { useState, useEffect } from 'react';
import { downloadCsv } from '../utils/csv';
import { formatJST } from '../utils/date';

// 型安全性を高めるために使用する
type Master = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    shipper_id: number; // 荷主との紐づけ必須
    name: string;
};


// ポスグレのSUM()の戻り値はbigint(整数の集計)
// Node.jsのpgライブラリはbigintを標準で文字列として返す。
type Stock = {
    shipper_id: number;
    warehouse_id: number;
    product_id: number;
    lot_number: string | null;
    // stock_quantity: string;
    available_quantity: string;
};

function ShipmentPage() {
    const [shippers, setShippers] = useState<Master[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Master[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);

    const [shipmentDate, setShipmentDate] = useState('');
    const [shipperId, setShipperId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [quantity, setQuantity] = useState('');

    // 初回表示時にマスター取得
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const urls = [
                    'http://localhost:3000/api/shippers',
                    'http://localhost:3000/api/warehouses',
                    'http://localhost:3000/api/products'
                ];

                const responses = await Promise.all(
                    urls.map(url => fetch(url, { credentials: 'include' }))
                );

                if (responses.some(res => !res.ok)) {
                    throw new Error('マスター取得に失敗');
                }

                const [s, w, p] = await Promise.all(
                    responses.map(res => res.json())
                );

                setShippers(s);
                setWarehouses(w);
                setProducts(p);

            } catch (error) {
                console.error(error);
            }
        };

        fetchMasters();
    }, []);

    // 在庫データ取得(出庫日変更毎)
    useEffect(() => {
        fetchStocks();
    }, [shipmentDate]);

    const fetchStocks = async () => {
        if (!shipmentDate) {
            setStocks([]);
            return;
        }
        try {
            const res = await fetch(
                `http://localhost:3000/api/available-stocks?target_date=${shipmentDate}`,
                // `http://localhost:3000/api/stocks?target_date=${shipmentDate}`,
                {
                    credentials: 'include'
                });
            if (!res.ok) {
                throw new Error('在庫照会に失敗しました。')
            }
            const data: Stock[] = await res.json();
            // console.log('出庫可能在庫一覧:', data);
            setStocks(data);

        } catch (error) {
            console.error(error);
            setStocks([]);
        }
    };

    // 荷主に紐づく入庫有倉庫
    // 条件：荷主・倉庫・在庫有
    const filterWarehouses = warehouses.filter(w =>
        stocks.some(s =>
            s.shipper_id === Number(shipperId) &&
            s.warehouse_id === w.id &&
            Number(s.available_quantity) > 0
        )
    );

    // 選択した倉庫に在庫がある商品
    // 条件：荷主・倉庫・商品・在庫有
    const filterProducts = products.filter(p =>
        p.shipper_id === Number(shipperId) &&
        stocks.some(s =>
            s.shipper_id === Number(shipperId) &&
            s.warehouse_id === Number(warehouseId) &&
            s.product_id === p.id &&
            Number(s.available_quantity) > 0
        )
    );

    // 選択した商品に在庫があるロットを抽出
    const filterLots = stocks.filter(s =>
        s.shipper_id === Number(shipperId) &&
        s.warehouse_id === Number(warehouseId) &&
        s.product_id === Number(productId) &&
        Number(s.available_quantity) > 0
    );

    // 出庫登録
    const addShipment = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (
            !shipmentDate || !shipperId || !warehouseId || !productId ||
            !Number.isInteger(Number(quantity)) || Number(quantity) <= 0
        ) return;

        try {
            const res = await fetch('http://localhost:3000/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipment_date: shipmentDate,
                    shipper_id: Number(shipperId),
                    warehouse_id: Number(warehouseId),
                    product_id: Number(productId),
                    lot_number: lotNumber === '__NO__LOT__' ? null : lotNumber,
                    // lot_number: lotNumber.trim() || null,
                    quantity: Number(quantity)
                }),
                credentials: 'include'
            });

            // 400や500はここまで処理が進む
            // fetch()が通信エラーの場合、catchへ移動される
            if (!res.ok) {
                console.log(res);
                const data = await res.json();
                throw new Error(data.error);
            }

            alert('出庫登録完了');

            // 入力クリア
            setShipperId('')
            setWarehouseId('');
            setProductId('');
            setLotNumber('');
            setQuantity('');

            // 在庫取得
            await fetchStocks();


        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '出庫登録に失敗しました。');
        }
    };

    // 出庫CSV出力
    const exportShipments = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/shipments', { credentials: 'include' });

            if (!res.ok) throw new Error('出庫データ取得に失敗');

            type Shipment = {
                id: number;
                shipment_date: string;
                shipper_id: number;
                warehouse_id: number;
                product_id: number;
                lot_number: string | null;
                quantity: number;
                created_at: string;
                updated_at: string;
            };

            const data: Shipment[] = await res.json();

            const header = [
                '出庫ID', '出庫日', '荷主ID', '倉庫ID',
                '商品ID', 'ロット番号', '数量', '登録日時', '更新日時'
            ];

            const rows = data.map(s => [
                String(s.id),
                s.shipment_date.slice(0, 10),
                String(s.shipper_id),
                String(s.warehouse_id),
                String(s.product_id),
                s.lot_number ?? '',
                String(s.quantity),
                formatJST(s.created_at),
                formatJST(s.updated_at)
            ]);

            downloadCsv('shipments.csv', header, rows);

        } catch (error) {
            console.error(error);
            alert('出庫CSV出力に失敗しました。');
        }
    };

    return (
        <>
            <h1>出庫処理</h1>

            <form onSubmit={addShipment}>
                <div>
                    <label>出庫日</label>
                    <input
                        type="date"
                        value={shipmentDate}
                        onChange={e => setShipmentDate(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>荷主</label>
                    <select
                        value={shipperId}
                        onChange={e => {
                            setShipperId(e.target.value);
                            setWarehouseId('');
                            setProductId('');
                            setLotNumber('');
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {shippers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>倉庫</label>
                    <select
                        value={warehouseId}
                        onChange={e => {
                            setWarehouseId(e.target.value);
                            setProductId('');
                            setLotNumber('');
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {filterWarehouses.map(w => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                        {/* {warehouses.map(w => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))} */}
                    </select>
                </div>

                <div>
                    <label>商品</label>
                    <select
                        value={productId}
                        onChange={e => {
                            setProductId(e.target.value);
                            setLotNumber('');
                        }}
                        required
                    >
                        <option value="">選択してください</option>
                        {filterProducts.map(p =>
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        )}
                        {/* {products
                            .filter(p => p.shipper_id === Number(shipperId))
                            .map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))} */}
                    </select>
                </div>

                {/* 専用値使用 __NO_LOT__ */}
                <div>
                    <label>ロット番号</label>
                    <select
                        value={lotNumber}
                        onChange={e => setLotNumber(e.target.value)}
                        disabled={!productId}
                        required
                    >
                        <option value="">選択してください</option>
                        {filterLots.map(s => (
                            <option
                                key={s.lot_number ?? 'no-lot'}
                                value={s.lot_number ?? '__NO__LOT__'}
                            >
                                {s.lot_number ?? 'ロットなし'}
                                (出庫可能数量：{s.available_quantity})
                            </option>
                        ))}
                    </select>
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
                <button type="button" onClick={exportShipments}>
                    出庫CSV出力
                </button>
            </form>
        </>
    );
}

export default ShipmentPage;