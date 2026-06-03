import React from 'react';
import { useEffect} from "react";
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
import Replay from './pages/Replay.jsx';
import Friends from './pages/Friends.jsx';
import DuelPlay from './pages/DuelPlay.jsx';
import RootLayout from './RootLayout.jsx';
import Reports from './pages/Reports.jsx';
import Requests from './pages/Requests.jsx';
import Home from './pages/Home.jsx';
import AdminTournaments from './pages/AdminTournaments.jsx';
import Tournaments from './pages/Tournaments.jsx';
import TournamentPage from './pages/TournamentPage.jsx'
import TournamentArena from './pages/TournamentArena.jsx'
// Заглушки страниц прямо здесь
const Logout = () => {
    useEffect(() => {
        sessionStorage.removeItem("token")
        window.location.href = '/';
    },[])
}
function App() {
    const router = createBrowserRouter([
        {
            path: "/",
            element: <RootLayout/>,
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
                    path: "user-profile/:accountId",
                    element: <UserProfile />
                },
                {
                    path: "replay/:gameId/:accountId",
                    element: <Replay/>
                },
                {
                    path: "friends/:accountId",
                    element: <Friends/>
                },
                {
                    path: "duel/:opponentId/:formatId/:gameId",
                    element: <DuelPlay/>
                },
                {
                    path: "reports",
                    element: <Reports/>
                },
                {
                    path: "requests",
                    element: <Requests/>
                },
                {
                    path: "tournaments",
                    element: <Tournaments />
                },
                {
                    path: "tournament/:id",
                    element: <TournamentPage />
                },
                {
                    path: "tournament/:id/arena",
                    element: <TournamentArena />
                },
                {
                    path: "admin/tournaments",
                    element: <AdminTournaments />
                },
            ],
        },
    ]);

    // 3. Возвращаем RouterProvider с нашим объектом router
    return (
        <>
            <RouterProvider router={router} />
        </>
    )
}

export default App;