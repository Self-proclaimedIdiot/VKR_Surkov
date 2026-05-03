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
        <div>
            <p>Добро пожаловать на поле регистрации!</p>
            <p>{feedback}</p>
            <p>Адрес электронной почты: <input
                type="text"
                value={email}
                onChange={(e) => { EmailChange(e.target.value); }}
                placeholder="например vasya.pupkin@mail.ru"
                className={'input-' + (isEmailIncorrect ? 'error' : 'default')}
            />
            </p> 
            <p>Логин: <input
                type="text"
                value={login}
                onChange={(e) => { LoginChange(e.target.value); }}
                placeholder="например AnatolyKarpoff"
                className={'input-' + (isLoginIncorrect ? 'error' : 'default')}
            />
            </p>
            <p>Придумайте пароль: <input
                type="password"
                value={password}
                onChange={(e) => { PasswordChange(e.target.value); }}
                placeholder=""
                className={'input-' + (isPasswordIncorrect ? 'error' : 'default')}
            />
            </p>
            <p>Пароль еще раз: <input
                type="password"
                value={confirmpassword}
                onChange={(e) => { ConfirmPasswordChange(e.target.value); }}
                placeholder=""
                className={'input-' + (isPasswordNotSimilar ? 'error' : 'default')}
            />
            </p>
            <p>
                Выберите уровень игры:
                <button onClick={() => { setLevel(0) }}>Новичок</button>
                <button onClick={() => { setLevel(1) }}>Любитель</button>
                <button onClick={() => { setLevel(2) }}>Продвинутый</button>
                <button onClick={() => { setLevel(3) }}>Эксперт</button>
            </p>
            <button onClick={SendData}>Отправить</button> 
        </div>
    );
}
export default Register;