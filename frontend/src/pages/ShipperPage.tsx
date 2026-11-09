import { useState, useEffect } from 'react';
import '../styles/master.css';

// 荷主データの型
type Shipper = {
    id: number;
    name: string;
};

function ShipperPage() {
    const [shippers, setShippers] = useState<Shipper[]>([]);
    const [name, setName] = useState<string>('');

    // 初回表示時に取得
    useEffect(() => {
        fetchShippers();
    }, []);


    // 荷主一覧取得（GET）
    const fetchShippers = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/shippers', { credentials: 'include' });

            if (!res.ok) {
                throw new Error('荷主一覧の取得に失敗しました。');
            }

            const data: Shipper[] = await res.json();
            setShippers(data);

        } catch (error) {
            console.error(error);
            alert(error);
        }
    };

    // 荷主登録（POST）
    const addShipper = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!name.trim()) return;

        try {
            const res = await fetch('http://localhost:3000/api/shippers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: name.trim() }),
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('荷主登録に失敗しました。');
            }

            // 入力欄クリア+再レンダリング
            setName('');
            // 荷主一覧を再取得
            await fetchShippers();

        } catch (error) {
            console.error(error);
            alert('荷主登録に失敗しました。');
        }
    };

    return (
        <>
            <div className='master-page'>

                <h1>荷主マスター</h1>

                <h2>荷主登録</h2>

                <form onSubmit={addShipper}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="荷主名"
                        required
                    />
                    <button type="submit">登録</button>
                </form>

                <h2>荷主一覧</h2>
                {/* <ul>
                {shippers.map((shipper) => (
                    <li key={shipper.id}>
                    {shipper.name}
                    </li>
                    ))}
                    </ul> */}

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>荷主名</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shippers.map((s) => (
                            <tr key={s.id}>
                                <td>{s.id}</td>
                                <td>{s.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>


            </div>
        </>
    );
}

export default ShipperPage;