import { useState } from 'react';

type Props = {
    onLogin: () => void;
    onRegister: () => void;
};

function LoginPage({ onLogin , onRegister }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // ログイン処理
    const login = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                throw new Error('ログインに失敗しました。');
            }

            alert('ログインに成功しました。');
            onLogin();

        } catch (error) {
            console.error(error);
            alert((error as Error).message);
        }
    };

    return (
        <>
            <h1>ログイン</h1>

            <form onSubmit={login}>
                <div>
                    <label>メールアドレス</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>パスワード</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">ログイン</button>
            </form>

<br />
                <button type="button" onClick={onRegister}>
                    新規ユーザー登録
                </button>
        </>
    );
}

export default LoginPage;