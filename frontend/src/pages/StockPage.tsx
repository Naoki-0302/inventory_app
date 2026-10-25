import { useState, useEffect } from 'react';

// 在庫データの型
type Stock = {
    shipper_id: number;
    shipper_name: string;
    warehouse_id: number;
    warehouse_name: string;
    product_id: number;
    product_code: string;
    product_name: string;
    lot_number: string | null; // nullでGroup化する必要もあるので
    stock_quantity: string;
};


function StockPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [keyword,setKeyword] = useState('');
    const [targetDate,setTargetDate] = 
    useState(new Date().toLocaleDateString('ja-JP').replaceAll('/', '-'));
    
    // 在庫データ条件反映
    // 検索キーワード
    const filterStocks = stocks.filter(stock => 
        [stock.shipper_name,stock.warehouse_name,stock.product_name]
        .some(val => val.toLowerCase().includes(keyword.toLowerCase()))
    );

    // 在庫一覧取得
    const fetchStocks = async () => {
        try {
            const res = await fetch(
                `http://localhost:3000/api/stocks?target_date=${targetDate}`
            );

            if (!res.ok) {
                throw new Error('在庫一覧の取得に失敗');
            }

            const data: Stock[] = await res.json();
            setStocks(data);

        } catch (error) {
            console.error(error);
            alert('在庫一覧の取得に失敗しました。');
        }
    };

    // 初回表示時に取得
    useEffect(() => {
        fetchStocks();
    }, [targetDate]);

    return (
        <>
            <h1>在庫照会</h1>

            <label>在庫基準日</label>
            <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            />

            <button onClick={fetchStocks}>再検索</button>

            <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder='荷主名・倉庫名・商品名で検索'
            />


            <table>
                <thead>
                    <tr>
                        <th>荷主ID</th>
                        <th>荷主</th>
                        <th>倉庫ID</th>
                        <th>倉庫</th>
                        <th>商品ID</th>
                        <th>商品CD</th>
                        <th>商品</th>
                        <th>ロット番号</th>
                        <th>現在庫数</th>
                    </tr>
                </thead>

                <tbody>                    
                    {filterStocks.map((stock, index) => (
                        <tr key={index}>
                            <td>{stock.shipper_id}</td>
                            <td>{stock.shipper_name}</td>
                            <td>{stock.warehouse_id}</td>
                            <td>{stock.warehouse_name}</td>
                            <td>{stock.product_id}</td>
                            <td>{stock.product_code}</td>
                            <td>{stock.product_name}</td>
                            <td>{stock.lot_number ?? 'ロットなし'}</td>
                            <td>{Number(stock.stock_quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

export default StockPage;