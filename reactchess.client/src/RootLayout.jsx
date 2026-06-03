import React from 'react';
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
    Link,
    Outlet
} from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import RegularPlay from './pages/RegularPlay.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Replay from './pages/Replay.jsx';
import * as signalR from '@microsoft/signalr';
import { toast, Toaster } from 'sonner';
import useSignalStore from './components/useSignalStore.js';
import Friends from './pages/Friends.jsx';
import DuelPlay from './pages/DuelPlay.jsx';
import Select from 'react-select'
import BanModal from './components/BanModal.jsx';
// Заглушки страниц прямо здесь
const Home = () => <h1>Main</h1>
const Logout = () => {
    useEffect(() => {
        sessionStorage.removeItem("token")
        window.location.href = '/';
    }, [])
}
const RootLayout = () =>  {
    const [message, SetMessage] = useState('')
    const [isHidden, setIsHidden] = useState(true)
    const [accountId, setAccountId] = useState(0)
    const [request, setRequest] = useState("")
    const [foundUsers, setFoundUsers] = useState([])
    const [isShowingUsers, setIsShowingUsers] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isBanned, setIsBanned] = useState(false)
    const [unban, setUnban] = useState(0)
    const [banReason, setBanReason] = useState("")
    const setConnection = useSignalStore((state) => state.setConnection);
    const connection = useSignalStore((state) => state.connection);
    const setChessConnection = useSignalStore((state) => state.setChessConnection);
    const navigate = useNavigate()
    foundUsers
    isShowingUsers
    const OpenFoundUserProfile = (accountId) => {
        navigate(`/user-profile/${accountId}`)
    }
    const ToHome = () => {
        navigate('/')
    }
    const SearchPlayer = (request) => {
        setRequest(request)
        if (request.length >= 2) {
            setTimeout(() => {
                fetch('/user-search/load-users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ Login: request })
                })
                    .then(response => response.json())
                    .then(data => {
                        let newFoundUsers = []
                        data.users.map(user => newFoundUsers.push({ value: user.id, label: user.login }))
                        setFoundUsers(newFoundUsers)
                    })
            }, 250)
        }
    }
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (token != null) {
            const decoded = jwtDecode(token);
            setAccountId(decoded.nameid)
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl("https://localhost:7039/common-hub", {
                    accessTokenFactory: () => {
                        return sessionStorage.getItem('token');
                    }
                })
                .withAutomaticReconnect()
                .build();
            const InsideFunc = async () => {
                if (newConnection.state == signalR.HubConnectionState.Disconnected) {
                    newConnection.start()
                        .then(() => {
                            console.log('Connected!');
                            // 2. Входим в "комнату" игры
                            //connection.invoke("JoinGame", gameId);

                            // 3. Подписываемся на получение ходов
                            //connection.on("ReceiveMove", (fen, move) => {
                            //console.log("Получен ход:", move, "Новый FEN:", fen);
                            // Обновите состояние вашей шахматной доски здесь
                            //});
                        })
                        .catch(e => console.log('Connection failed: ', e));
                    setConnection(newConnection)
                    sessionStorage.setItem('common-connection', JSON.stringify(newConnection))
                }
            }
            InsideFunc()

            return () => {
                if (newConnection) {
                    newConnection.stop();
                }
            };
        }
    }, [setConnection]);
    const AcceptGameInvite = (opponentId, formatId) => {
        connection.invoke("AcceptGameInvite", Number(opponentId), formatId)
    }
    const DeclineGameInvite = (opponentId) => {
        connection.invoke("DeclineGameInvite", Number(opponentId))
    }
    const AcceptFriendship = (friendId) => {
        connection.invoke("AcceptFriendshipInvite", Number(friendId))
    }
    const DeclineFriendship = (friendId) => {
        connection.invoke("DeclineFriendshipInvite", Number(friendId))
    }
    useEffect(() => {
        if (connection != null) {
            const handleFriendshipInviteReceived = (data) => {
                toast("Запрос в друзья", {
                    description: "Принять игрока " + data.friendLogin + " в друзья?",
                    duration: Infinity, // Тост не исчезнет сам, пока пользователь не нажмет
                    action: {
                        label: "Принять",
                        onClick: () => AcceptFriendship(data.friendId)
                    },
                    cancel: {
                        label: "Отклонить",
                        onClick: () => DeclineFriendship(data.friendId)
                    },
                });
            }
            const handleMessageReceived = (data) => {
                toast(data.message);
            }
            const handleGameInviteReceived = (data) => {
                const toastId = toast("Брошен вызов!", {
                    description: "Начать партию с игроком " + data.opponentLogin + " в формате "
                        + data.formatName + " - рейтинг (" + data.opponentElo + ")",
                    duration: Infinity, // Тост не исчезнет сам, пока пользователь не нажмет
                    action: {
                        label: "Принять",
                        onClick: () => {
                            toast.dismiss(toastId);
                            AcceptGameInvite(data.opponentId, data.formatId);
                        }
                    },
                    cancel: {
                        label: "Отклонить",
                        onClick: () => DeclineGameInvite(data.opponentId)
                    },
                });
            }
            const handleStartDuel = (data) => {
                const newConnection = new signalR.HubConnectionBuilder()
                    .withUrl("https://localhost:7039/chess-hub", {
                        accessTokenFactory: () => {
                            return sessionStorage.getItem('token');
                        }
                    })
                    .withAutomaticReconnect()
                    .build();
                const InsideFunc = async () => {
                    if (newConnection.state == signalR.HubConnectionState.Disconnected) {
                        newConnection.start()
                            .then(() => {
                                console.log('Connected!');
                                // 2. Входим в "комнату" игры
                                //connection.invoke("JoinGame", gameId);

                                // 3. Подписываемся на получение ходов
                                //connection.on("ReceiveMove", (fen, move) => {
                                //console.log("Получен ход:", move, "Новый FEN:", fen);
                                // Обновите состояние вашей шахматной доски здесь
                                //});
                                newConnection.invoke("ClearLogs");
                                newConnection.invoke("JoinGroup", data.gameId)
                            })
                            .catch(e => console.log('Connection failed: ', e));
                        setChessConnection(newConnection)
                    }
                }
                InsideFunc()
                navigate(`/duel/${Number(data.opponentId)}/${data.formatId}/${data.gameId}`)
            }
            connection.on("FriendshipInviteReceived", handleFriendshipInviteReceived)
            connection.on("MessageReceived", handleMessageReceived)
            connection.on("GameInviteReceived", handleGameInviteReceived)
            connection.on("StartDuel", handleStartDuel)
            return () => {
                connection.off("FriendshipInviteReceived", handleFriendshipInviteReceived)
                connection.off("MessageReceived", handleMessageReceived)
                connection.off("GameInviteReceived", handleGameInviteReceived)
                connection.off("StartDuel", handleStartDuel)
            }
        }
    }, [connection])
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        var decoded = ''
        if (token != null) {
            decoded = jwtDecode(token);
        }
        fetch('reg/test', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // ВОТ ОНО: Передаем токен в стандартном формате Bearer
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(() => SetMessage("\n Текущий пользователь: " + decoded.unique_name))
            .then(() => {
                setIsHidden(false)
                setIsAdmin(decoded.role == "Admin")
            }
            )
    }, [])
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        var decoded = ''
        if (token != null) {
            decoded = jwtDecode(token);
        }
        fetch('reg/check-ban', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // ВОТ ОНО: Передаем токен в стандартном формате Bearer
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: decoded.nameid })
        })
            .then(response => response.json())
            .then(data => {
                setIsBanned(data.isBanned)
                setUnban(data.unban)
                setBanReason(data.banReason)
            })
    }, [])
    return (
        <>
            <Toaster position="top-right" richColors closeButton />
            <p className="label">{message}</p>
            <nav className="navbar">
                <span onClick={() => ToHome()} className="navbar-brand">MaxChess</span>
                <div className = "navbar links">
                    {!isHidden && !isAdmin && (
                        <>
                            <Link to={"/user-profile/" + accountId} style={{ marginRight: '40px' }}>Мой профиль</Link>
                            <Link to={"/friends/" + accountId} style={{ marginRight:'30px' }}>Мои друзья</Link>
                            <Link to="/play" style={{ marginRight: '20px' }}>Поиск игры</Link>
                            <Link to="/tournaments" style={{ marginRight: '10px' }}>Турниры</Link>
                            <Link to="/logout">Выйти</Link>
                        <span className="navbar-search"> <input
                            type="text"
                            value={request}
                            placeholder="Поиск игрока:"
                            list="user-list"
                            className="user-input"
                            onChange={(e) => {
                                SearchPlayer(e.target.value)
                                setIsShowingUsers(true)
                            }}
                            onFocus={() => setIsShowingUsers(true)}
                            onBlur={() => setTimeout(() => setIsShowingUsers(false), 400)}
                        />
                            {isShowingUsers  && (
                                <div className="user-dropdown">
                                    {foundUsers.length === 0 && request != null && (
                                        <div className="dropdown-item empty-message">
                                            Совпадений не найдено
                                        </div>
                                    )}

                                    {foundUsers.map((user) => (
                                        <div
                                            key={user.value}
                                            className="dropdown-item"
                                            onClick={() => {
                                                OpenFoundUserProfile(user.value);
                                                setIsShowingUsers(false);
                                                setRequest("")
                                            }}
                                        >
                                            {user.label}
                                        </div>
                                    ))}
                                    </div>)}
                        </span>
                        </>
                )}
                {!isHidden && isAdmin && (
                    <>
                        <Link to="/reports">Жалобы</Link>
                        <Link to="/requests" style={{ marginRight: '10px' }}>Запросы на титулы</Link>
                            <Link to="/admin/tournaments" style={{ marginRight: '20px' }}>Турниры</Link>
                            <Link to="/logout" style={{ marginRight: '30px' }}>Выйти</Link>
                        <span className="navbar-search"> <input
                            type="text"
                            value={request}
                            placeholder="Поиск игрока:"
                            list="user-list"
                            className="user-input"
                            onChange={(e) => {
                                SearchPlayer(e.target.value)
                                setIsShowingUsers(true)
                            }}
                            onFocus={() => setIsShowingUsers(true)}
                            onBlur={() => setTimeout(() => setIsShowingUsers(false), 400)}
                        />
                            {isShowingUsers && (
                                <div className="user-dropdown">
                                    {foundUsers.length === 0 && request != null && (
                                        <div className="dropdown-item empty-message">
                                            Совпадений не найдено
                                        </div>
                                    )}

                                    {foundUsers.map((user) => (
                                        <div
                                            key={user.value}
                                            className="dropdown-item"
                                            onClick={() => {
                                                OpenFoundUserProfile(user.value);
                                                setIsShowingUsers(false);
                                                setRequest("")
                                            }}
                                        >
                                            {user.label}
                                        </div>
                                    ))}
                                </div>)}
                        </span>
                    </>
                )}
                {isHidden && (
                    <>
                        <Link to="/register" style={{ marginRight: '30px' }}>Регстрация</Link>
                        <Link to="/login">Войти</Link>
                    </>
                    )}
                </div>
            </nav>
            <BanModal isOpen={isBanned} reason={banReason} unban={unban}></BanModal>
            {/* Outlet — это место, где будут рендериться ваши страницы (Home, Register и т.д.) */}
            <main className="layout-main">
                <Outlet />
            </main>
            </>
        )
}
export default RootLayout