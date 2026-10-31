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
    const [keyword, setKeyword] = useState('');
    const [targetDate, setTargetDate] =
        useState(new Date().toLocaleDateString('ja-JP').replaceAll('/', '-'));
    const [showZeroNegative, setShowZeroNegative] = useState(false); // 在庫0・マイナスを表示するか

    // 在庫データ条件反映
    // 検索キーワード
    const filterStocks = stocks.filter(stock =>
        (showZeroNegative || Number(stock.stock_quantity) > 0) &&
        [stock.shipper_name, stock.warehouse_name, stock.product_name]
            .some(val => val.toLowerCase().includes(keyword.toLowerCase()))
    );

    // 在庫一覧取得

    const fetchStocks = async () => {
        try {
            const res = await fetch(
                `http://localhost:3000/api/stocks?target_date=${targetDate}`,
                {
                    // ★大事 在庫照会API受け取り時の認証で必要
                    credentials: 'include'
                }
            );

            console.log(res);

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

    // 在庫CSV出力
    const exportCsv = () => {
        const header = [
            '荷主ID', '荷主名',
            '倉庫ID', '倉庫名',
            '商品ID', '商品コード', '商品名',
            'ロット番号', '現在庫数'
        ];

        const rows = filterStocks.map(stock => [
            // stock.shipper_name,
            // stock.warehouse_name,
            // stock.product_code,
            // stock.product_name,
            // stock.lot_number ?? '',
            // stock.stock_quantity
            String(stock.shipper_id),
            stock.shipper_name,
            String(stock.warehouse_id),
            stock.warehouse_name,
            String(stock.product_id),
            stock.product_code,
            stock.product_name,
            stock.lot_number ?? '',
            stock.stock_quantity
        ]);

        const escapeCsv = (value: string) =>
            `"${value.replace(/"/g, '""')}"`;

        // CSV文字列を作成
        const csv = [header, ...rows]
            .map(row => row.map(value => escapeCsv(value)).join(','))
            .join('\r\n');

        // CSVファイルを生成
        const blob = new Blob(['\uFEFF', csv], {
            type: 'text/csv;charset=utf-8;'
        });

        // ダウンロード
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `stock_${targetDate}.csv`;
        link.click();

        URL.revokeObjectURL(url);

    };

    return (
        <>
            <h1>在庫照会</h1>

            <label>在庫基準日</label>
            <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
            />

            <label>
                <input
                    type="checkbox"
                    checked={showZeroNegative}
                    onChange={e => setShowZeroNegative(e.target.checked)}
                />
                在庫0・マイナスを含む
            </label>

            {/* 今のところ自動で検索される仕様 20261027 */}
            {/* <button onClick={fetchStocks}>再検索</button> */}

            <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder='荷主名・倉庫名・商品名で検索'
            />

            <button onClick={exportCsv}>
                CSV出力
            </button>

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