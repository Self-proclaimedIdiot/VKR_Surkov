import ReactDOM from 'react-dom';
import useSignalStore from './useSignalStore';
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { toast, Toaster } from 'sonner';
const token = sessionStorage.getItem('token');
const GameOverModal = ({ isOpen, message, old_elo, new_elo, onStartNew, opponentId, formatId, gameId, isFriend, isDuel, onClose }) => {
    const connection = useSignalStore((state) => state.connection);
    const [report, setReport] = useState("")
    const [isReporting, setIsReporting] = useState(false)
    console.log("Публичное состояние:", connection.state);
    if (!isOpen) return null;
    // Используем Portal, чтобы модалка была на самом верхнем уровне DOM
    const FriendshipInvite = () => {
        connection.invoke("SendFriendshipInvite", opponentId)
    }
    const GameInvite = () => {
        connection.invoke("SendGameInvite", opponentId, formatId)
    }
    const SendReport = () => {
        const decoded = jwtDecode(token)
        fetch('/game/post-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ReporterId: decoded.nameid, AccusedId: opponentId, GameId: gameId, Text: report })
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
    return ReactDOM.createPortal(
        <div className="overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                {!isReporting && <>
                    <h2>{message}</h2>
                    <h2 className="text-gold">{new_elo + "(" + (new_elo - old_elo > 0 ? "+" : "") + (new_elo - old_elo) + ")"}</h2>
                    <div className="modal-actions">
                        <button className="btn btn-primary" onClick={() => { onStartNew(); onClose(); }}>Новая игра</button>
                        {!isDuel && <button onClick={() => GameInvite()}>Реванш</button>}
                        {!isFriend && <button className="btn btn-secondary" onClick={() => FriendshipInvite()}>Добавить в друзья</button>}
                        <button className="btn btn-secondary"onClick={() => setIsReporting(true)}>Пожаловаться</button>
                        <button className="btn btn-danger"onClick={onClose}>Закрыть</button>
                    </div>
                </>}
                {isReporting && <div className = "modal-actions">
                 < button className="user-action-btn" onClick={() => SendReport()}>Отправить</button>
                 < button className="user-action-btn" onClick={() => setIsReporting(false)}>Отмена</button>
                 < div className="user-input-group">
                    <span className="user-input-label">
                        Текст жалобы:
                        <input
                            type="text"
                            value={report}
                            className="user-input"
                            onChange={(e) => { setReport(e.target.value) }}
                        />
                    </span>
                    </div>
                  </div>}
            </div>
        </div>,
        document.body // Рендерим прямо в body
    );
};
export default GameOverModal