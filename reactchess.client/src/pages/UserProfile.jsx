import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import useBeforeUnload from '../components/BeforeUnload.jsx'
import WarningForm from '../components/WarningForm.jsx';
import useSignalStore from '../components/useSignalStore';
import FormatChoiceButton from '../components/FormatChoiceButton.jsx';
const UserProfile = () => {
    const connection = useSignalStore((state) => state.connection);
    const { accountId } = useParams();
    const accountId_n = Number(accountId)
    const token = sessionStorage.getItem('token');
    const navigate = useNavigate();
    const [isOwner, setIsOwner] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isSubscriber, setIsSubscriber] = useState(false)
    const [login, setLogin] = useState("")
    const [loginChanging, setLoginChanging] = useState("")
    const [title, setTitle] = useState("")
    const [email, setEmail] = useState("")
    const [emailChanging, setEmailChanging] = useState("")
    const [elos, setElos] = useState([])
    const [games, setGames] = useState([])
    const [isChanging, setIsChanging] = useState(false)
    const [feedback, setFeedback] = useState([])
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [passwordRepeat, setPasswordRepeat] = useState("")
    const [isPasswordChanging, setIsPasswordChanging] = useState(false)
    const [isPasswordNotSame, setIsPasswordNotSame] = useState(false)
    const [formats, setFormats] = useState([])
    useBeforeUnload(isChanging || isPasswordChanging)
    const SendFriendshipInvite = () => {
        connection.invoke("SendFriendshipInvite", accountId_n)
        setIsSubscribed(true)
    }
    const SendRefuseFriendship = () => {
        connection.invoke("SendRefuseFriendship", accountId_n)
        setIsSubscribed(false)
    }
    const AcceptFriendshipInvite = () => {
        connection.invoke("AcceptFriendshipInvite", accountId_n)
        setIsSubscribed(true)
    }
    const DefineStyle = (result) => {
        switch (result) {
            case "Победа":
                return "status-win"
            case "Поражение":
                return "status-loss"
            case "Ничья":
                return "status-draw"
            case "В процессе":
                return "status-active"
        }
    }
    const OpenGameReplay = (gameId) => {
        navigate(`/replay/${gameId}/${accountId}`)
    }
    const OpenFriendsList = () => {
        navigate(`/friends/${accountId}`)
    }
    const ChangeLoginField = (value) => {
        setLoginChanging(value)
    }
    const ChangeEmailField = (value) => {
        setEmailChanging(value)
    }
    const CancelChanges = () => {
        setLoginChanging(login)
        setEmailChanging(email)
        setIsChanging(false)
    }
    const CancelPasswordChanges = () => {
        setOldPassword("")
        setNewPassword("")
        setPasswordRepeat("")
        setIsPasswordNotSame(false)
        setIsPasswordChanging(false)
    }
    const ChangeOldPasswordField = (value) => {
        setOldPassword(value)
    }
    const ChangeNewPasswordField = (value) => {
        setNewPassword(value)
        setIsPasswordNotSame(value != passwordRepeat)
    }
    const ChangePasswordRepeatField = (value) => {
        setPasswordRepeat(value)
        setIsPasswordNotSame(value != newPassword)
    }
    const SendChanges = () => {
        const decoded = jwtDecode(token)
        fetch('/user-profile/post-user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: decoded.nameid, Login: loginChanging, Email: emailChanging })
        })
            .then(response => response.json())
            .then(data => {
                setFeedback(data.problems)
                if (data.isCorrect) {
                    setIsChanging(false)
                    setLogin(loginChanging)
                    setEmail(emailChanging)
                }
            })
    }
    const SendPassword = () => {
        if (!isPasswordNotSame) {
            const decoded = jwtDecode(token)
            fetch('/user-profile/post-user-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ AccountId: decoded.nameid, OldPassword: oldPassword, NewPassword: newPassword })
            })
                .then(response => response.json())
                .then(data => {
                    setFeedback(data.problems)
                    if (data.isCorrect) {
                        setIsPasswordChanging(false)
                    }
                })
        }
        else {
            const message = ['Пароли не совпадают!']
            setFeedback(message)
        }
    }
    useEffect(() => {
        const decoded = jwtDecode(token)
        fetch('/user-profile/load-user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ClientId: decoded.nameid, AccountId: accountId_n })
        })
            .then(response => response.json())
            .then(data => {
                setLogin(data.login)
                setTitle(data.title)
                setEmail(data.email)
                setElos(data.elos)
                data.games.reverse()
                setGames(data.games)
                setLoginChanging(data.login)
                setEmailChanging(data.email)
                setIsOwner(decoded.nameid == accountId)
                setIsSubscribed(data.isSubscribed)
                setIsSubscriber(data.isSubscriber)
                setFormats(data.formats)
            })
    }, [accountId])
    return (
        <div className="profile-card">
            <div className="user-nickname">{login}
                {title != null && < span className="user-title">{title}</span >}
                <span className="email">{email}</span>
            </div>
            {feedback.map(message => {
                return (
                    <div className="message">{message}</div>
                )
            })}
            {isOwner && < div className="actions-wrapper">
                {!isChanging && !isPasswordChanging && < button className="user-action-btn" onClick={() => setIsChanging(true)}>
                    Изменить данные
                </button>}
                {!isChanging && !isPasswordChanging && < button className="user-action-btn" onClick={() => setIsPasswordChanging(true)}>
                    Изменить пароль
                </button>}
                {!isChanging && !isPasswordChanging && < button className="user-action-btn">Запросить обновление титула</button>}
                {isChanging && < button className="user-action-btn" onClick={() => SendChanges()}>Сохранить данные</button>}
                {isChanging && < button className="user-action-btn" onClick={() => CancelChanges()}>Отмена</button>}
                {isPasswordChanging && < button className="user-action-btn" onClick={() => SendPassword()}>Сохранить данные</button>}
                {isPasswordChanging && < button className="user-action-btn" onClick={() => CancelPasswordChanges()}>Отмена</button>}
                {!isChanging && !isPasswordChanging && < button className="user-action-btn" onClick={() => OpenFriendsList()}>
                    Список друзей
                </button>}
            </div>}
            {!isOwner && <div className="actions-wrapper">
                {!isSubscribed && !isSubscriber && < button className="user-action-btn" onClick={() => SendFriendshipInvite()}>
                    Добавить в друзья
                </button>}
                {isSubscribed && isSubscriber && < button className="user-action-btn" onClick={() => SendRefuseFriendship()}>
                    Удалить из друзей
                </button>}
                {isSubscribed && !isSubscriber && < button className="user-action-btn" onClick={() => SendRefuseFriendship()}>
                    Отозвать заявку
                </button>}
                {!isSubscribed && isSubscriber && < button className="user-action-btn" onClick={() => AcceptFriendshipInvite()}>
                    Принять заявку
                </button>}
                {isSubscribed && isSubscriber && <FormatChoiceButton title="Предложить игру"
                    formats={formats}
                    opponentId={accountId_n}
                ></FormatChoiceButton>}
                < button className="user-action-btn">
                    Пожаловаться
                </button>
                < button className="user-action-btn" onClick={() => OpenFriendsList()}>
                    Список друзей
                </button>
            </div>}
            {isChanging &&
                <div className="user-input-group">
                    <span className="user-input-label">
                    Никнейм: 
                    <input
                        type="text"
                        value={loginChanging}
                            className="user-input"
                            onChange={(e) => { ChangeLoginField(e.target.value) }}
                        />
                    </span>
                    <span className="user-input-label">
                        Email:
                        <input
                            type="text"
                            value={emailChanging}
                            className="user-input"
                            onChange={(e) => { ChangeEmailField(e.target.value) }}
                        />
                    </span>
                </div>}
            {isPasswordChanging && 
                <div className="user-input-group">
                    <span className="user-input-label">
                        Старый пароль:
                        <input
                            type="password"
                            value={oldPassword}
                            className="user-input"
                            onChange={(e) => { ChangeOldPasswordField(e.target.value) }}
                        />
                    </span>
                    <span className="user-input-label">
                        Новый пароль:
                        <input
                            type="password"
                            value={newPassword}
                            className="user-input"
                            onChange={(e) => { ChangeNewPasswordField(e.target.value) }}
                        />
                    </span>
                    <span className="user-input-label">
                        Новый пароль еще раз:
                        <input
                            type="password"
                            value={passwordRepeat}
                            className={isPasswordNotSame? "user-input-error":"user-input"}
                            onChange={(e) => { ChangePasswordRepeatField(e.target.value) }}
                        />
                    </span>
                </div>}
            <div className="elo-list">
                {elos.map(elo => { 
                    return (
                        <span key={elo.formatName} className="elo-item">
                            <span ><img className="format-icon" src={"/formats/" + elo.formatName + ".svg"} /></span>
                            <span className="elo-value">{elo.eloNumber} </span>
                        </span>
                    )}
                )}
            </div>
            <div className="games-history">
                {games.map(game => {
                    return (
                        <div key={game.id} className="games-row" onClick={() => OpenGameReplay(game.id)}>
                            <span ><img className="format-icon" src={"/formats/" + game.formatName + ".svg"} /></span>
                            <span className = "opponent">{game.opponentLogin}</span>
                            <span>{"(" + game.opponentElo + ")"}</span>
                            <span className={DefineStyle(game.result)}>{" - " + game.result + "(" + game.description + ")"}</span>
                        </div>
                    )
                })}
            </div>
            <WarningForm isDirty={isChanging || isPasswordChanging} message="Все несохраненные данные будут утеряны! Вы действительно хотите выйти?">
            </WarningForm>
        </div>
    )
}
export default UserProfile