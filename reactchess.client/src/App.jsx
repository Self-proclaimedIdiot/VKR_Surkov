import React from 'react';
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import RegularPlay from './pages/RegularPlay.jsx';

// Заглушки страниц прямо здесь
const Home = () => <h1>Main</h1>;
const Logout = () => {
    useEffect(() => {
        sessionStorage.removeItem("token")
        window.location.href = '/';
    },[])
}
function App() {
    const [message, SetMessage] = useState('')
    const [isHidden, setIsHidden] = useState(true)
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        var decoded = ''
        if (token != null) {
            decoded = jwtDecode(token);
        }
        fetch('reg/suka', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // ВОТ ОНО: Передаем токен в стандартном формате Bearer
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(data => SetMessage(data.message + "\n Ты в системе, " + decoded.unique_name))
            .then(() => setIsHidden(false))
    }, [])
    return (
        <Router>
            <p>{message}</p>
            <nav style={{ padding: '20px', background: '#eee' }}>
                <Link to="/" style={{ marginRight: '30px' }}>Home</Link>
                <Link to="/register" style={{ marginRight: '20px' }}>Register</Link>
                {!isHidden && (<Link to="/play" style={{ marginRight: '10px' }} >Поиск игры</Link>)}
                {!isHidden && (<Link to="/logout">Logout</Link>)}
                {isHidden && (<Link to="/login">Login</Link>)}
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout/> }/>
                <Route path="/play" element={<RegularPlay/> }/>
            </Routes>
        </Router>
    );
}

export default App;