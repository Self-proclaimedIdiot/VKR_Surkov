import React from 'react';
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
    createBrowserRouter,
    RouterProvider,
    Link,
    Outlet
} from 'react-router-dom';
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import RegularPlay from './pages/RegularPlay.jsx';
import UserProfile from './pages/UserProfile.jsx';

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
    const RootLayout = ({ message, isHidden }) => {
        return (
            <>
                <p>{message}</p>
                <nav style={{ padding: '20px', background: '#eee' }}>
                    <Link to="/" style={{ marginRight: '40px' }}>Home</Link>
                    <Link to="/register" style={{ marginRight: '30px' }}>Register</Link>

                    {!isHidden && (
                        <>
                            <Link to="/user-profile" style={{ marginRight:'20px' }}>Мой профиль</Link>
                            <Link to="/play" style={{ marginRight: '10px' }}>Поиск игры</Link>
                            <Link to="/logout">Logout</Link>
                        </>
                    )}

                    {isHidden && (
                        <Link to="/login">Login</Link>
                    )}
                </nav>

                {/* Outlet — это место, где будут рендериться ваши страницы (Home, Register и т.д.) */}
                <Outlet />
            </>
        );
    };
    const router = createBrowserRouter([
        {
            path: "/",
            element: <RootLayout message={message} isHidden={isHidden} />,
            children: [
                {
                    index: true, // Это путь "/"
                    element: <Home />,
                },
                {
                    path: "register",
                    element: <Register />,
                },
                {
                    path: "login",
                    element: <Login />,
                },
                {
                    path: "logout",
                    element: <Logout />,
                },
                {
                    path: "play",
                    element: <RegularPlay />,
                },
                {
                    path: "user-profile",
                    element: <UserProfile />
                }
            ],
        },
    ]);

    // 3. Возвращаем RouterProvider с нашим объектом router
    return <RouterProvider router={router} />;
}

export default App;