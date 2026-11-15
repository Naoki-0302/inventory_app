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
    // const [targetDate, setTargetDate] =
    //     useState(new Date().toLocaleDateString('ja-JP').replaceAll('/', '-'));
    const [targetDate, setTargetDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    });


    const [showZeroNegative, setShowZeroNegative] = useState(false); // 在庫0・マイナスを表示するか

    // 在庫データ条件反映
    // 検索キーワード
    const filterStocks = stocks.filter(stock =>
        // 0以外を全て表示。マイナス在庫が発生する異常が起きても分かるようにしておく。
        (showZeroNegative || Number(stock.stock_quantity) !== 0) &&
        // (showZeroNegative || Number(stock.stock_quantity) > 0) &&
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
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-800">
        <div className="mx-auto max-w-7xl">

            {/* タイトル */}
            <h1 className="mb-6 text-2xl font-bold text-slate-800">
                在庫照会
            </h1>

            {/* 検索条件 */}
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <label className="text-sm font-medium whitespace-nowrap">
                    在庫基準日
                </label>

                <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />

                <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                    <input
                        type="checkbox"
                        checked={showZeroNegative}
                        onChange={e => setShowZeroNegative(e.target.checked)}
                        className="h-4 w-4 accent-blue-600"
                    />
                    在庫0を含む
                </label>

                <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="荷主名・倉庫名・商品名で検索"
                    className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />

                <button
                    onClick={exportCsv}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-blue-700"
                >
                    CSV出力
                </button>
            </div>

            {/* 在庫一覧 */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                        <tr>
                            {[
                                '荷主ID', '荷主', '倉庫ID', '倉庫',
                                '商品ID', '商品CD', '商品',
                                'ロット番号', '現在庫数'
                            ].map(header => (
                                <th
                                    key={header}
                                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {filterStocks.map((stock, index) => (
                            <tr
                                key={index}
                                className="transition-colors hover:bg-blue-50"
                            >
                                <td className="px-4 py-3">{stock.shipper_id}</td>
                                <td className="px-4 py-3">{stock.shipper_name}</td>
                                <td className="px-4 py-3">{stock.warehouse_id}</td>
                                <td className="px-4 py-3">{stock.warehouse_name}</td>
                                <td className="px-4 py-3">{stock.product_id}</td>
                                <td className="px-4 py-3">{stock.product_code}</td>
                                <td className="px-4 py-3">{stock.product_name}</td>
                                <td className="px-4 py-3">
                                    {stock.lot_number ?? 'ロットなし'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    {Number(stock.stock_quantity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filterStocks.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-500">
                        該当する在庫データはありません。
                    </div>
                )}
            </div>

        </div>
    </div>
);

}

export default StockPage;