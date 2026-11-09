import { useState, useEffect } from 'react';
import '../styles/master.css';

// 商品データの型
type Product = {
    // 取得するカラムに合わせること
    id: number;
    shipper_id: number;
    shipper_name: string;
    product_code: string;
    name: string;
};
// 荷主データの型
type Shipper = {
    // 取得するカラムに合わせること
    id: number;
    name: string;
};

function ProductPage() {
    // マスター格納用
    const [products, setProducts] = useState<Product[]>([]);
    const [shippers, setShippers] = useState<Shipper[]>([]);

    const [shipperId, setShipperId] = useState('');
    const [productCode, setProductCode] = useState('');
    const [name, setName] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null); // 編集 or 新規(null)

    // 初回に一覧取得
    useEffect(() => {
        fetchProducts();
        fetchShippers();
    }, []);

    // 商品一覧(get)
    const fetchProducts = async () => {
        try {
            const res: Response = await fetch('http://localhost:3000/api/products', {
                // 別Originへの送信＋Cookie認証
                credentials: 'include',
            });
            if (!res.ok) throw new Error('商品一覧の取得に失敗しました。');

            // JSONをJSオブジェクトに変換する
            const data: Product[] = await res.json();

            // マスター取得データを変数保持
            setProducts(data);

        } catch (error) {
            console.error(error);
            alert(error);
        }
    };

    // 荷主一覧(get)
    // コンボボックス
    const fetchShippers = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/shippers', {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('荷主一覧の取得に失敗しました。');

            const data: Shipper[] = await res.json();

            // マスター取得データを変数保持
            setShippers(data);

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '荷主一覧の取得に失敗しました。');
        }
    };

    // // 商品登録(POST)
    // const addProduct = async (e: React.SubmitEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     // 荷主ID, 商品CD, 商品名が空欄
    //     if (!shipperId || !productCode.trim() || !name.trim()) return;
    //     try {
    //         const res = await fetch('http://localhost:3000/api/products', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             // back側で受け取り、分割代入する変数名を下記のbodyプロパティと合わせる
    //             // API送信時に荷主IDをNumber型にする　それまでは文字列で処理
    //             body: JSON.stringify({
    //                 shipper_id: Number(shipperId),
    //                 product_code: productCode.trim(),
    //                 name: name.trim()
    //             }),
    //             credentials: 'include'
    //         });
    //         if (!res.ok) throw new Error('商品の登録に失敗しました。');

    //         // 入力クリア
    //         setShipperId('');
    //         setProductCode('');
    //         setName('');
    //         // 商品一覧更新
    //         fetchProducts();

    //     } catch (error) {
    //         console.error(error);
    //         alert((error as Error).message);
    //     }
    // };

    // 編集用関数
    // 商品マスター1行が引数
    const editProduct = (p: Product) => {
        setEditingId(p.id); // 編集用Flg
        setShipperId(String(p.shipper_id)); // selectタグのvalueは文字列扱い
        setProductCode(p.product_code);
        setName(p.name);
    };

    // 登録・更新兼用
    const saveProduct = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!shipperId || !productCode.trim() || !name.trim()) return;

        try {
            const isEdit = editingId !== null;

            // 新規 or 編集
            const url = isEdit
                ? `http://localhost:3000/api/products/${editingId}`
                : 'http://localhost:3000/api/products';

            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    shipper_id: Number(shipperId),
                    product_code: productCode.trim(),
                    name: name.trim()
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(
                    data.error || (isEdit ? '商品更新に失敗しました。' : '商品登録に失敗しました。'));
            }

            alert(isEdit ? '商品を更新しました。' : '商品を登録しました。');

            // 初期化
            setEditingId(null);
            setShipperId('');
            setProductCode('');
            setName('');

            // 商品一覧
            await fetchProducts();

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '保存に失敗しました。');
        }
    };

    // 削除(DELETE)　条件：入出庫履歴がない商品のみ
    const deleteProduct = async (product: Product) => {
        // キャンセルの場合、削除処理を終了する
        if (!window.confirm(`${product.name}を削除しますか？`)) return;

        try {
            const res = await fetch(
                `http://localhost:3000/api/products/${product.id}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '商品削除に失敗しました。');
            }

            alert('商品を削除しました。');

            if (editingId === product.id) {
                setEditingId(null);
                setShipperId('');
                setProductCode('');
                setName('');
            }

            await fetchProducts();

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '削除に失敗しました。');
        }
    };



    return (
        <>
            <div className='master-page'>

                <h1>商品マスター</h1>
                <h2>{editingId === null ? '商品登録' : '商品編集'}</h2>

                <form onSubmit={saveProduct}>

                    <select
                        value={shipperId}
                        onChange={(e) => setShipperId(e.target.value)}
                        disabled={editingId !== null}
                        required
                    >
                        <option value="">荷主を選択</option>
                        {shippers.map((shipper) => (
                            <option key={shipper.id} value={shipper.id}>
                                {shipper.name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder="商品コード"
                        required
                    />

                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="商品名"
                        required
                    />

                    <button type="submit">{editingId === null ? '登録' : '編集'}</button>

                    {editingId !== null && (
                        <button
                            type='button'
                            onClick={() => {
                                setEditingId(null);
                                setShipperId('');
                                setProductCode('');
                                setName('');
                            }}
                        >
                            キャンセル
                        </button>
                    )}

                </form>



                <h2>商品一覧</h2>
                <table>
                    <thead>
                        <tr>
                            <th>商品ID</th>
                            <th>荷主ID</th>
                            <th>荷主名</th>
                            <th>商品CD</th>
                            <th>商品名</th>
                            <th>処理</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td>{product.id}</td>
                                <td>{product.shipper_id}</td>
                                <td>{product.shipper_name}</td>
                                <td>{product.product_code}</td>
                                <td>{product.name}</td>
                                <td>
                                    <button type='button' onClick={() => editProduct(product)}>
                                        編集
                                    </button>
                                    <button type='button' onClick={() => deleteProduct(product)}>
                                        削除
                                    </button>

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>


            </div>
        </>
    );



}
export default ProductPage;
