import { useState, useEffect } from 'react';

// 倉庫データの型
type Warehouse = {
    id: number;
    name: string;
};

function WarehousePage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [name, setName] = useState<string>('');

    // 初回表示時に取得
    useEffect(() => {
        fetchWarehouses();
    }, []);

    // 倉庫一覧取得（GET）
    const fetchWarehouses = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/warehouses',
                {
                    credentials: 'include'
                });
            if (!res.ok) {
                throw new Error('倉庫一覧の取得に失敗しました。');
            }

            const data: Warehouse[] = await res.json();
            setWarehouses(data);

        } catch (error) {
            console.error(error);
        }
    };

    // 倉庫登録（POST）
    const addWarehouse = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        // if (!name.trim()) return;
        if (!name.trim()) return alert('倉庫名を入力してください。');

        try {
            const res = await fetch('http://localhost:3000/api/warehouses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim()
                }),
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('倉庫登録に失敗しました。');
            }

            // 入力欄クリア
            setName('');

            // 倉庫一覧を再取得
            await fetchWarehouses();

        } catch (error) {
            console.error(error);
            alert('倉庫登録に失敗しました。');
        }
    };

    return (
        <>
            <h1>倉庫マスター</h1>

            <h2>倉庫登録</h2>

            <form onSubmit={addWarehouse}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="倉庫名"
                    required
                />
                <button type="submit">登録</button>
            </form>

            <h2>倉庫一覧</h2>

            {/* <ul>
                {warehouses.map((warehouse) => (
                    <li key={warehouse.id}>
                        {warehouse.name}
                    </li>
                ))}
            </ul> */}

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>倉庫名</th>
                    </tr>
                </thead>
                <tbody>
                    {warehouses.map((warehouse) => (
                        <tr key={warehouse.id}>
                            <td>{warehouse.id}</td>
                            <td>{warehouse.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </>
    );
}

export default WarehousePage;