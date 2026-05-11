import ReactDOM from 'react-dom';
import useSignalStore from './useSignalStore';
const GameOverModal = ({ isOpen, message, old_elo, new_elo, onStartNew, opponentId, formatId, isFriend, onClose }) => {
    const connection = useSignalStore((state) => state.connection);
    console.log("Публичное состояние:", connection.state);
    if (!isOpen) return null;
    // Используем Portal, чтобы модалка была на самом верхнем уровне DOM
    const FriendshipInvite = () => {
        connection.invoke("SendFriendshipInvite", opponentId)
    }
    const GameInvite = () => {
        connection.invoke("SendGameInvite", opponentId, formatId)
    }
    return ReactDOM.createPortal(
        <div className="overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{message}</h2>
                <h2>{new_elo + "(" + (new_elo - old_elo > 0 ? "+" : "") + (new_elo - old_elo) + ")"}</h2>
                <button onClick={() => { onStartNew(); onClose(); }}>Новая игра</button>
                <button onClick={() => GameInvite()}>Реванш</button>
                {!isFriend && <button onClick={() => FriendshipInvite()}>Добавить в друзья</button>}
                <button>Пожаловаться</button>
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>,
        document.body // Рендерим прямо в body
    );
};
export default GameOverModal