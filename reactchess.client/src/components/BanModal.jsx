import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
const BanModal = ({ isOpen, reason, unban }) => {
    const [seconds, setSeconds] = useState(0)
    const ConvertSeconds = (seconds) => {
        const minutes = Math.floor(seconds / 60) % 60
        const hours = Math.floor(seconds / 60 / 60) 
        const free_seconds = seconds % 60
        return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" +
            (free_seconds < 10 ? "0" : "") + free_seconds
    }
    useEffect(() => {
        let interval = null;
        const endingMs = unban * 1000;
            interval = setInterval(() => {
                const now = Date.now();
                const diff = endingMs - now;
                const newValue = Math.ceil(diff / 1000)
                setSeconds(newValue)
            }, 100); // Чаще = плавнее

        return () => clearInterval(interval);
    }, [unban]); // seconds здесь нет — и это победа
    if (!isOpen) return null;
    // Используем Portal, чтобы модалка была на самом верхнем уровне DOM
    return ReactDOM.createPortal(
        <div className="overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div>Вы были забанены по причине {reason}</div>
                <div>До разбана: {ConvertSeconds(seconds)}</div>
            </div>
        </div>,
        document.body // Рендерим прямо в body
    );
};
export default BanModal