import React, { useState,/* useEffect*/ } from 'react';
import '../App.css';
const Register = () => {
    const [feedback, setFeedback] = useState('')
    const [email, setEmail] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [level, setLevel] = useState(0)
    const [confirmpassword, setConfirmpassword] = useState('');
    const [isEmailIncorrect, setIsEmailIncorrect] = useState(false);
    const [isLoginIncorrect, setIsLoginIncorrect] = useState(false);
    const [isPasswordIncorrect, setIsPasswordIncorrect] = useState(false);
    const [isPasswordNotSimilar, setIsPasswordNotSimilar] = useState(false);
    const EmailChange = (value) => {
        if (value == "")
            setIsEmailIncorrect(true)
        else setIsEmailIncorrect(false)
        setEmail(value)
    }
    const LoginChange = (value) => {
        if (value == "")
            setIsLoginIncorrect(true)
        else setIsLoginIncorrect(false)
        setLogin(value)
    }
    const PasswordChange = (value) => {
        if (value == "")
            setIsPasswordIncorrect(true)
        else setIsPasswordIncorrect(false)
        setPassword(value)
    }
    const ConfirmPasswordChange = (value) => {
        if (value != password)
            setIsPasswordNotSimilar(true)
        else setIsPasswordNotSimilar(false)
        setConfirmpassword(value)
    }
    const SendData = async () => {
        if (!(isEmailIncorrect || isLoginIncorrect || isPasswordIncorrect || isPasswordNotSimilar))
        {
            const response = await fetch('reg/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Говорим серверу, что прислали JSON
                },
                body: JSON.stringify({ Email: email, Login: login, Password: password, ConfirmPassword: confirmpassword, Level: level }) // Превращаем JS-объект в строку JSON
            }).catch(error => console.error('Палундра!:', error));
            const data = await response.json();
            setFeedback(data.feedback);
            window.location.href = '/';
        }
    };
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-title">Регистрация</h2>
                {feedback && <p className="feedback-message">{feedback}</p>}
                <div className="form-group">
                <label>Адрес электронной почты:</label> <input
                type="text"
                value={email}
                onChange={(e) => { EmailChange(e.target.value); }}
                placeholder="например vasya.pupkin@mail.ru"
                className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
            </div> 
                <div className="form-group">
                    <label>Логин:</label>
                    <input
                type="text"
                value={login}
                onChange={(e) => { LoginChange(e.target.value); }}
                placeholder="например AnatolyKarpoff"
                className={'input-' + (isLoginIncorrect ? 'error' : 'default')}
            />
            </div>
                <div className="form-group">
                <label>Придумайте пароль:</label> <input
                type="password"
                value={password}
                onChange={(e) => { PasswordChange(e.target.value); }}
                placeholder=""
                className={'input-' + (isPasswordIncorrect ? 'error' : 'default')}
            />
            </div>
                <div className="form-group">
                <label>Пароль еще раз: </label><input
                type="password"
                value={confirmpassword}
                onChange={(e) => { ConfirmPasswordChange(e.target.value); }}
                placeholder=""
                className={'input-' + (isPasswordNotSimilar ? 'error' : 'default')}
            />
            </div>
                <div className="form-group">
                Выберите уровень игры:
                    <button className="btn btn-secondary w-full"onClick={() => { setLevel(0) }}>Новичок</button>
                    <button className="btn btn-secondary w-full" onClick={() => { setLevel(1) }}>Любитель</button>
                    <button className="btn btn-secondary w-full" onClick={() => { setLevel(2) }}>Продвинутый</button>
                    <button className="btn btn-secondary w-full" onClick={() => { setLevel(3) }}>Эксперт</button>
            </div>
                <button className="btn btn-primary w-full" onClick={SendData}>Отправить</button> 
            </div>
        </div>
    );
}
export default Register;