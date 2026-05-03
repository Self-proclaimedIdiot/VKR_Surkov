import React, { useState,/* useEffect*/ } from 'react';
import '../App.css';
const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [feedback, setFeedback] = useState('')
    const SendData = async () => {
        const response = await fetch('login/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ LoginOrEmail: email, Password: password }) 
        }).catch(error => console.error('Палундра!:', error));
        const data = await response.json();
        setFeedback(data.feedback);
        if (data.token != "") {
            sessionStorage.setItem('token', data.token);
            window.location.href = '/';
        }
    };
    const ToHome = () => { window.location.href = '/'; }
    return (
        <div>
            <p>Вход</p>
            <p>{feedback}</p>
            <p>Email или логин: <input
                type="text"
                value={email}
                onChange={(e) => {setEmail(e.target.value); }}
                //className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
            </p>
            <p>Пароль: <input
                 type="password"
                 value={password}
                 onChange={(e) => {setPassword(e.target.value); }}
                //className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
            </p>
            <button onClick={SendData}>Войти</button>
            <button onClick={ToHome}>На главную</button>
        </div>
    );
}
export default Login;