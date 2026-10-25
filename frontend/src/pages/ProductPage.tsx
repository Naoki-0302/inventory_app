import { useState, useEffect } from 'react';


// 商品データの型
type Product = {
    id: number;
    shipper_id: number;
    shipper_name: string;
    product_code: string;
    name: string;
};

// 荷主データの型
type Shipper = {
    id: number;
    name: string;
};

function ProductPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [shippers, setShippers] = useState<Shipper[]>([]);
    const [shipperId, setShipperId] = useState('');
    const [productCode, setProductCode] = useState('');
    const [name, setName] = useState('');

    // 初回に一覧取得
    useEffect(() => {
        fetchProducts();
        fetchShippers();
    }, []);

    // 商品一覧(get)
    const fetchProducts = async () => {
        try {
            const res: Response = await fetch('http://localhost:3000/api/products');
            if (!res.ok) throw new Error('商品一覧の取得に失敗しました。');

            const data: Product[] = await res.json();
            setProducts(data);

        } catch (error) {
            alert(error);
        }
    };
    // 荷主一覧(get)
    const fetchShippers = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/shippers');
            if (!res.ok) throw new Error('荷主一覧の取得に失敗しました。');

            const data: Shipper[] = await res.json();
            setShippers(data);

        } catch (error) {
            alert(error);
        }
    };

    // 商品登録(POST)
    const addProduct = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        // 荷主ID, 商品CD, 商品名が空欄
        if (!shipperId || !productCode.trim() || !name.trim()) return;
        try {
            const res = await fetch('http://localhost:3000/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // back側で受け取り、分割代入する変数名を下記のbodyプロパティと合わせる
                // API送信時に荷主IDをNumber型にする　それまでは文字列で処理
                body: JSON.stringify({
                    shipper_id: Number(shipperId),
                    product_code: productCode.trim(),
                    name: name.trim()
                })
            });
            if (!res.ok) throw new Error('商品の登録に失敗しました。');

            // 入力クリア
            setShipperId('');
            setProductCode('');
            setName('');
            // 商品一覧更新
            fetchProducts();

        } catch (error) {
            console.error(error);
            alert(error);
        }
    };



    return (
        <>
            <h1>商品マスター</h1>
            <h2>商品登録</h2>

            <form onSubmit={addProduct}>

                <select
                    value={shipperId}
                    onChange={(e) => setShipperId(e.target.value)}
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
                <button type="submit">登録</button>
            </form>

            <h2>商品一覧</h2>

            <table>
                <thead>
                    <tr>
                        <th>商品ID</th>
                        <th>荷主名</th>
                        <th>商品CD</th>
                        <th>荷主名</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td>{product.id}</td>
                            <td>{product.shipper_id}</td>
                            <td>{product.product_code}</td>
                            <td>{product.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>


        </>
    );



}
export default ProductPage;
