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
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Вход</h2>
                {feedback && <p className="feedback-message">{feedback}</p>}

                <div className="form-group">
                    <label>Email или логин:</label>
                    <input
                type="text"
                value={email}
                onChange={(e) => {setEmail(e.target.value); }}
                //className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
            </div>
                <div className="form-group">
                    <label>Пароль: </label>
                    <input
                 type="password"
                 value={password}
                 onChange={(e) => {setPassword(e.target.value); }}
                //className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
                </div>
                <button className= "btn btn-primary w-full" onClick={SendData}>Войти</button>
                <button className="btn btn-primary w-full" onClick={ToHome}>На главную</button>
            </div>
        </div>
    );
}
export default Login;