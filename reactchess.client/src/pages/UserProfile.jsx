import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import useBeforeUnload from '../components/BeforeUnload.jsx'
import WarningForm from '../components/WarningForm.jsx';
import useSignalStore from '../components/useSignalStore';
import FormatChoiceButton from '../components/FormatChoiceButton.jsx';
import BanOptionsButton from '../components/BanOptionsButton';
import { toast, Toaster } from 'sonner';
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
    const [isReporting, setIsReporting] = useState(false)
    const [report, setReport] = useState("")
    const [isAskingForTitle, setIsAskingForTitle] = useState(false)
    const [askingTitle, setAskingTitle] = useState("CM")
    const [askingInfo, setAskingInfo] = useState("")
    const [isAdmin, setIsAdmin] = useState(false)
    const [isBanned, setIsBanned] = useState(false)
    const [isTitleChanging, setIsTitleChanging] = useState(false)
    const [newTitle, setNewTitle] = useState("")
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
    const SendReport = () => {
        const decoded = jwtDecode(token)
        fetch('/user-profile/post-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ReporterId: decoded.nameid, AccusedId: accountId_n, Text: report })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Жалоба отправлена!", {
                        duration: 2000,
                    });
                    setIsReporting(false)
                }
            })
    }
    const SendRequest = () => {
        const decoded = jwtDecode(token)
        fetch('/user-profile/post-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ PetitionerId: decoded.nameid, Title: askingTitle, Info: askingInfo})
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Запрос отправлен!", {
                        duration: 2000,
                    });
                    setIsAskingForTitle(false)
                }
            })
    }
    const SendUnban = () => {
        fetch('/user-profile/unban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccusedId: accountId })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Пользователь разбанен!", {
                        duration: 2000,
                    });
                    setIsBanned(false)
                }
            })
    }
    const ChangeTitle = () => {
        fetch('/user-profile/post-title', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: accountId_n, Title: newTitle })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Титул присвоен!", {
                        duration: 2000,
                    });
                    if (newTitle != "")
                        setTitle(newTitle)
                    else setTitle(null)
                    setIsTitleChanging(false)
                }
            })
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
                setNewTitle(data.title)
                setEmail(data.email)
                setElos(data.elos)
                data.games.reverse()
                setGames(data.games)
                setLoginChanging(data.login)
                setEmailChanging(data.email)
                setIsOwner(decoded.nameid == accountId)
                setIsSubscribed(data.isSubscribed)
                setIsSubscriber(data.isSubscriber)
                setIsBanned(data.isBanned)
                setFormats(data.formats)
                setIsAdmin(decoded.role == 'Admin')
            })
    }, [accountId])
    return (
        <div className="page-container">
            <div className="profile-header">
            <div>
                <div className="profile-name">{login}
                {title != null && < span className="player-title-badge">{title}</span >}
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                    {email}
                </div>
          </div>
            {feedback.map(message => {
                return (
                    <div className="message">{message}</div>
                )
            })}
                {isOwner && < div className="profile-actions">
                            {!isChanging && !isPasswordChanging && !isAskingForTitle && < button className="btn btn-secondary" onClick={() => setIsChanging(true)}>
                    Изменить данные
                </button>}
                            {!isChanging && !isPasswordChanging && !isAskingForTitle && < button className="btn btn-secondary" onClick={() => setIsPasswordChanging(true)}>
                    Изменить пароль
                </button>}
                            {!isChanging && !isPasswordChanging && !isAskingForTitle && < button className="btn btn-secondary"
                    onClick={() => setIsAskingForTitle(true) }
                >Запросить обновление титула</button>}
                            {isChanging && < button className="btn btn-primary" onClick={() => SendChanges()}>Сохранить данные</button>}
                            {isChanging && < button className="btn btn-danger" onClick={() => CancelChanges()}>Отмена</button>}
                            {isPasswordChanging && < button className="btn btn-primary" onClick={() => SendPassword()}>Сохранить данные</button>}
                            {isPasswordChanging && < button className="btn btn-danger" onClick={() => CancelPasswordChanges()}>Отмена</button>}
                {!isChanging && !isPasswordChanging && !isAskingForTitle && < button className="btn btn-secondary" onClick={() => OpenFriendsList()}>
                    Список друзей
                </button>}
                            {isAskingForTitle && < button className="btn btn-primary" onClick={() => SendRequest()}>Отправить</button>}
                            {isAskingForTitle && < button className="btn btn-danger" onClick={() => setIsAskingForTitle(false)}>Отмена</button>}
                {isAskingForTitle && < div className="user-input-group">
                    <span className="user-input-label">
                        Запрашиваемый титул:
                        <select value={askingTitle} onChange={(e) => setAskingTitle(e.target.value)}>
                            <option value="CM">Кандидат в мастера (CM)</option>
                            <option value="FM">Мастер ФИДЕ (FM)</option>
                            <option value="IM">Международный мастер (IM)</option>
                            <option value="GM">Гроссмейстер (GM)</option>
                        </select>
                    </span>
                    <div className="user-input-label">
                        Дополнительные сведения:
                        <input
                            type="text"
                            value={askingInfo}
                            className="user-input"
                            onChange={(e) => { setAskingInfo(e.target.value) }}
                        />
                    </div>
                </div>}
            </div>}
                        {!isOwner && <div className="profile-actions">
                {!isReporting && <>
                                {!isSubscribed && !isSubscriber && < button className="btn btn-secondary" onClick={() => SendFriendshipInvite()}>
                    Добавить в друзья
                </button>}
                                {isSubscribed && isSubscriber && < button className="btn btn-secondary" onClick={() => SendRefuseFriendship()}>
                    Удалить из друзей
                </button>}
                                {isSubscribed && !isSubscriber && < button className="btn btn-secondary" onClick={() => SendRefuseFriendship()}>
                    Отозвать заявку
                </button>}
                                {!isSubscribed && isSubscriber && < button className="btn btn-secondary" onClick={() => AcceptFriendshipInvite()}>
                    Принять заявку
                </button>}
                {isSubscribed && isSubscriber && <FormatChoiceButton title="Предложить игру"
                    formats={formats}
                    opponentId={accountId_n}
                ></FormatChoiceButton>}
                                < button className="btn btn-secondary" onClick={() =>setIsReporting(true)}>
                    Пожаловаться
                </button>
                                < button className="btn btn-secondary" onClick={() => OpenFriendsList()}>
                    Список друзей
                    </button>
                </>}

                            {isReporting && < button className="btn btn-primary" onClick={() => SendReport()}>Отправить</button>}
                            {isReporting && < button className="btn btn-danger" onClick={() => setIsReporting(false)}>Отмена</button>}
                            {isReporting && < div>
                    <span className="user-input-label">
                        Текст жалобы:
                        <input
                            type="text"
                            value={report}
                            className="user-input"
                            onChange={(e) => { setReport(e.target.value) }}
                        />
                    </span>
                </div>}
            </div>}
                        {!isOwner && isAdmin && <div className="profile-actions">
                {!isBanned && !isTitleChanging && < BanOptionsButton title="Забанить" reportId={0} accusedId={accountId}
                    onBan={() => setIsBanned(true)}>
                </BanOptionsButton>}
                {isBanned && !isTitleChanging && <button className="btn btn-secondary" onClick={() => SendUnban()}>
                    Разбанить
                </button>}
                            {!isTitleChanging && <button className="btn btn-secondary" onClick={() => setIsTitleChanging(true)}>
                    Изменить титул
                </button>}
                {isTitleChanging && <>
                                <button className="btn btn-primary" onClick={() => ChangeTitle()}>
                    Применить
                    </button>
                                <button className="btn btn-danger" onClick={() => setIsTitleChanging(false)}>
                    Отмена
                    </button>
                    < div className="user-input-group">
                        <span className="user-input-label">
                            Новый титул:
                            <select value={newTitle} onChange={(e) => setNewTitle(e.target.value)}>
                                <option value="">Лишить титулов</option>
                                <option value="CM">Кандидат в мастера (CM)</option>
                                <option value="FM">Мастер ФИДЕ (FM)</option>
                                <option value="IM">Международный мастер (IM)</option>
                                <option value="GM">Гроссмейстер (GM)</option>
                            </select>
                        </span>
                    </div>
                </>}
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
            </div>
            {/*<div className="elo-list">*/}
            {/*    {elos.map(elo => { */}
            {/*        return (*/}
            {/*            <span key={elo.formatName} className="elo-item">*/}
            {/*                <span ><img className="format-icon" src={"/formats/" + elo.formatName + ".svg"} /></span>*/}
            {/*                <span className="elo-value">{elo.eloNumber} </span>*/}
            {/*            </span>*/}
            {/*        )}*/}
            {/*    )}*/}
                    {/*</div>*/}
                    <div className="card mb-16">
                        <table className="elo-table">
                            <thead>
                                <tr>
                                    <th>Формат</th>
                                    <th>Рейтинг</th>
                                </tr>
                            </thead>
                            <tbody>
                                {elos.map(e => (
                                    <tr key={e.formatId}>
                                        <td>{e.formatName} <img className="format-icon" src={"/formats/" + e.formatName + ".svg"} /> </td>
                                        <td className="text-gold">{e.eloNumber}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

            <div className="games-list">
                {games.map(game => {
                    return (
                        <div key={game.id} className="game-item" onClick={() => OpenGameReplay(game.id)}>
                            <span> <img className="format-icon" src={"/formats/" + game.formatName + ".svg"} /></span>
                            <span className= "game-opponent">{game.opponentLogin}</span>
                            <span>{"(" + game.opponentElo + ")"}</span>
                            <span className={`game-result-badge ${DefineStyle(game.result)}`}>{" - " + game.result + "(" + game.description + ")"}</span>
                            <span className="game-date">{game.date}</span>
                        </div>
                    )
                })}
            </div>
            <Toaster position="top-right" richColors closeButton />
            <WarningForm isDirty={isChanging || isPasswordChanging} message="Все несохраненные данные будут утеряны! Вы действительно хотите выйти?">
            </WarningForm>
        </div>
    )
}
export default UserProfile