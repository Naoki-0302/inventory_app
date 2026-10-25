import { useState, useEffect } from 'react';

type Master = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    shipper_id: number;
    name: string;
};

function ShipmentPage() {
    const [shippers, setShippers] = useState<Master[]>([]);
    const [warehouses, setWarehouses] = useState<Master[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

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
                    urls.map(url => fetch(url))
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
                    lot_number: lotNumber.trim() || null,
                    quantity: Number(quantity)
                })
            });

            // 400や500はここまで処理が進む
            // fetch()が通信エラーの場合、catchへ移動される
            if (!res.ok) {
                console.log(res);
                const data = await res.json();
                throw new Error(data.error);
            }

            alert('出庫登録完了');

            setProductId('');
            setLotNumber('');
            setQuantity('');

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '出庫登録に失敗しました。');
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
                            setProductId('');
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
                        onChange={e => setWarehouseId(e.target.value)}
                        required
                    >
                        <option value="">選択してください</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>商品</label>
                    <select
                        value={productId}
                        onChange={e => setProductId(e.target.value)}
                        required
                    >
                        <option value="">選択してください</option>
                        {products
                            .filter(p => p.shipper_id === Number(shipperId))
                            .map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
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
            </form>
        </>
    );
}

export default ShipmentPage;