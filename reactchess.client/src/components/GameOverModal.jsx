import ReactDOM from 'react-dom';
const GameOverModal = ({ isOpen, message, old_elo, new_elo, onClose }) => {
    // Если модалка закрыта — ничего не выводим
    if (!isOpen) return null;
    // Используем Portal, чтобы модалка была на самом верхнем уровне DOM
    return ReactDOM.createPortal(
        <div className="overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{message}</h2>
                <h2>{new_elo + "(" + (new_elo - old_elo > 0 ? "+" : "") + (new_elo - old_elo) + ")"}</h2>
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>,
        document.body // Рендерим прямо в body
    );
};
export default GameOverModal