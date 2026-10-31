import { useState } from 'react';

type Props = {
    onBack: () => void;
};

function RegisterPage({ onBack }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // ユーザー登録
    const register = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'ユーザー登録に失敗しました。');
            }

            alert('ユーザー登録に成功しました。');
            onBack(); // setShowRegister(false) falseならLogin画面へ行く仕様

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '登録に失敗しました。');
        }
    };

    return (
        <>
            <h1>ユーザー登録</h1>

            <form onSubmit={register}>
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
                        minLength={8}
                        required
                    />
                </div>

                <button type="submit">登録</button>
            </form>

<br />
            <button type="button" onClick={onBack}>
                ログイン画面に戻る
            </button>
        </>
    );
}

export default RegisterPage;